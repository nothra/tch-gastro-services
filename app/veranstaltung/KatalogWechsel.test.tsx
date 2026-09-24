import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Catalog } from "@/db/schema";
import type { VeranstaltungFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ setVeranstaltungCatalogAction: vi.fn() }));

// useActionState steuert Fehler/Pending direkt (Codify #49, analog StatusToggle) – so ist die
// serverseitige Ablehnung ("bereits Verzehr erfasst") ohne echten Submit prüfbar.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { KatalogWechsel } from "./KatalogWechsel";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

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

const kataloge = [katalog("kat-a", "Montagsrunde"), katalog("kat-b", "Dorfmeisterschaften")];

beforeEach(() => {
  vi.resetAllMocks();
  withState(undefined);
});

describe("KatalogWechsel", () => {
  it("should_offerEveryPassedKatalogAsOption_when_rendered", () => {
    // #346 AK3/AK6: gewechselt wird auf einen der aktiven Kataloge, die die Seite hereinreicht.
    render(<KatalogWechsel id="v-1" catalogId="kat-a" kataloge={kataloge} />);

    const select = screen.getByLabelText("Katalog");
    expect(select).toHaveAttribute("name", "catalogId");
    expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "Montagsrunde",
      "Dorfmeisterschaften",
    ]);
  });

  it("should_preselectCurrentKatalog_when_rendered", () => {
    // Die Vorbelegung ist der aktuell zugeordnete Katalog, nicht die erste Option – sonst
    // schlüge ein unbeabsichtigter Wechsel beim bloßen Absenden durch.
    render(<KatalogWechsel id="v-1" catalogId="kat-b" kataloge={kataloge} />);

    expect(screen.getByLabelText("Katalog")).toHaveValue("kat-b");
  });

  it("should_keepCurrentKatalogSelectable_when_itIsNoLongerActive", () => {
    // #346 AK6, zweite Hälfte: eine bestehende Zuordnung auf einen inzwischen deaktivierten
    // Katalog bleibt gültig. Er fehlt in der Auswahlliste – das Select darf trotzdem den
    // Ist-Zustand anzeigen und nicht stillschweigend auf einen fremden Katalog springen.
    render(<KatalogWechsel id="v-1" catalogId="kat-inaktiv" kataloge={kataloge} />);

    const select = screen.getByLabelText("Katalog");
    expect(select).toHaveValue("kat-inaktiv");
    expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "Aktuell zugeordnet (nicht mehr wählbar)",
      "Montagsrunde",
      "Dorfmeisterschaften",
    ]);
  });

  it("should_includeHiddenId_when_rendered", () => {
    // Die Action liest die Veranstaltung aus FormData (analog setStatusAction).
    render(<KatalogWechsel id="v-42" catalogId="kat-a" kataloge={kataloge} />);

    expect(screen.getByDisplayValue("v-42")).toHaveAttribute("name", "id");
  });

  it("should_showRejectionError_when_stateHasError", () => {
    // #346 AK4: die serverseitige Sperre wird im Formular sichtbar, nicht verschluckt.
    withState({
      error: "Katalogwechsel nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.",
    });
    render(<KatalogWechsel id="v-1" catalogId="kat-a" kataloge={kataloge} />);

    expect(
      screen.getByText(
        "Katalogwechsel nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.",
      ),
    ).toBeInTheDocument();
  });

  it("should_showSuccessMessage_when_stateOk", () => {
    withState({ ok: true });
    render(<KatalogWechsel id="v-1" catalogId="kat-a" kataloge={kataloge} />);

    expect(screen.getByText("Katalog gewechselt.")).toBeInTheDocument();
  });

  it("should_disableButtonWithPendingText_when_pending", () => {
    withState(undefined, true);
    render(<KatalogWechsel id="v-1" catalogId="kat-a" kataloge={kataloge} />);

    expect(screen.getByRole("button", { name: /Speichern …/ })).toBeDisabled();
  });
});
