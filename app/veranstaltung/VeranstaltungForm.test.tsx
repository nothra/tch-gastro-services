import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Catalog } from "@/db/schema";
import type { VeranstaltungFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ createVeranstaltungAction: vi.fn() }));

// useActionState steuert alle Renderzustände. Gemockt analog zu TeilnehmerForm.test.tsx,
// damit jeder Zustand ohne Formular-Submission testbar ist.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { VeranstaltungForm } from "./VeranstaltungForm";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

// Soll-Wert als Literal, nicht aus der Produktions-Konstante gelesen (Testing-Standards);
// der Drift-Guard in db/catalog.test.ts hält Konstante und Migrations-Literal gegeneinander.
const STANDARD_CATALOG_ID = "standard";

function katalog(id: string, name: string): Catalog {
  return {
    id,
    name,
    active: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Der Standard-Katalog steht bewusst NICHT an erster Stelle: sonst wäre die Vorbelegungs-
// Assertion auch dann grün, wenn das Formular gar kein defaultValue setzte und der Browser
// einfach die erste Option nähme (#346 AK1).
const kataloge = [
  katalog("kat-b", "Dorfmeisterschaften"),
  katalog(STANDARD_CATALOG_ID, "Montagsrunde"),
];

function renderForm(liste: Catalog[] = kataloge) {
  return render(<VeranstaltungForm kataloge={liste} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

describe("VeranstaltungForm", () => {
  it("should_showHeadingAndAnlegenButton_when_initialRender", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: "Veranstaltung anlegen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });

  // Die Auswahlen werden je Select abgefragt statt global: seit #346 heißen eine Kasse und der
  // Standard-Katalog beide „Montagsrunde", ein globales getByRole("option") wäre mehrdeutig.
  function optionen(label: string) {
    const select = screen.getByLabelText(label);
    return [...select.querySelectorAll("option")].map((option) => option.textContent);
  }

  it("should_showAllKassenOptions_when_rendered", () => {
    renderForm();

    expect(optionen("Kasse")).toEqual(["Montagsrunde", "Vereinskasse"]);
  });

  it("should_offerEveryPassedKatalogAsOption_when_rendered", () => {
    // #346 AK1: der Veranstalter wählt die Preisliste bei der Anlage. Die Seite reicht nur
    // aktive Kataloge herein (AK6) – das Formular zeigt genau diese.
    renderForm();

    expect(screen.getByLabelText("Katalog")).toHaveAttribute("name", "catalogId");
    expect(optionen("Katalog")).toEqual(["Dorfmeisterschaften", "Montagsrunde"]);
  });

  it("should_preselectStandardKatalog_when_rendered", () => {
    // #346 AK1: Standard ist vorbelegt – der Regelfall bleibt ein Klick weniger.
    renderForm();

    expect(screen.getByLabelText("Katalog")).toHaveValue(STANDARD_CATALOG_ID);
  });

  it("should_preselectFirstKatalog_when_standardKatalogNotOffered", () => {
    // Grenzfall zu AK6: ist der Standard-Katalog deaktiviert, fehlt er in der Liste. Das
    // Formular darf dann keinen Wert vorbelegen, den es gar nicht anbietet – sonst ginge eine
    // nicht wählbare Id an die Action.
    renderForm([katalog("kat-b", "Dorfmeisterschaften")]);

    expect(screen.getByLabelText("Katalog")).toHaveValue("kat-b");
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Bezeichnung ist erforderlich." });
    renderForm();

    expect(screen.getByText("Bezeichnung ist erforderlich.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    renderForm();

    expect(screen.getByText("Veranstaltung angelegt.")).toBeInTheDocument();
  });

  it("should_showDisabledButtonWithSpeichernText_when_pending", () => {
    withState(undefined, true);
    renderForm();

    const button = screen.getByRole("button", { name: "Speichern …" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
