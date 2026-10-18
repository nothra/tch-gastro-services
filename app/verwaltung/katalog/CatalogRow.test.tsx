import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { CatalogItem } from "@/db/schema";

// Externe Grenze: Server Actions aus derselben Feature-Schicht.
vi.mock("./actions", () => ({
  updateCatalogItemAction: vi.fn(),
  setCatalogItemActiveAction: vi.fn(),
}));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { setCatalogItemActiveAction, updateCatalogItemAction } from "./actions";
import { CatalogRow } from "./CatalogRow";

const updateMock = vi.mocked(updateCatalogItemAction);
const setActiveMock = vi.mocked(setCatalogItemActiveAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

const activeItem: CatalogItem = {
  id: "item-1",
  catalogId: "cat-1",
  name: "Pils",
  size: "0,5 l",
  priceCents: 250,
  category: "getraenk",
  sortOrder: 10,
  active: true,
  createdAt: new Date("2026-09-17T00:00:00.000Z"),
  updatedAt: new Date("2026-09-17T00:00:00.000Z"),
};

function renderRow(item: CatalogItem = activeItem) {
  render(
    <ul>
      <CatalogRow item={item} catalogId="cat-1" />
    </ul>,
  );
}

function zeile() {
  return screen.getByRole("button", { name: /^Pils/ });
}

function oeffnen() {
  fireEvent.click(zeile());
  return screen.getByRole("dialog", { name: "Artikel bearbeiten" });
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

async function klicke(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  updateMock.mockResolvedValue({ ok: true });
  setActiveMock.mockResolvedValue({ ok: true });
});

describe("CatalogRow – Zeile als ListenZeile (spec-407 AK4.2/AK4.4/AK4.5)", () => {
  it("should_renderCardWithDialogButtonNotLink_when_rendered", () => {
    // AK4.2: ListenZeile im Auslöser-Betrieb – die ganze Karte ist ein Button, kein Link.
    renderRow();

    const karte = screen.getByRole("listitem");
    expect(karte).toHaveClass("bg-surface", "rounded-lg");
    expect(within(karte).queryByRole("link")).not.toBeInTheDocument();
    expect(zeile()).toHaveAttribute("type", "button");
    expect(zeile()).toHaveAttribute("aria-haspopup", "dialog");
    expect(zeile()).toHaveClass("min-h-11");
    expect(zeile().querySelector("svg")).not.toBeNull();
  });

  it("should_beOnlyControlInRow_when_rendered", () => {
    renderRow();

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("should_showNameAsTitleSizeAsSubtitleAndPriceAsKennzeichen_when_rendered", () => {
    // AK4.2 (Q6): Größe als Untertitel, Preis mit Ziffern gleicher Breite.
    renderRow();

    expect(within(zeile()).getByText("Pils")).toHaveClass("font-semibold");
    expect(within(zeile()).getByText("0,5 l")).toHaveClass("text-muted");
    expect(within(zeile()).getByText("2,50 €")).toHaveClass("tabular-nums");
  });

  it("should_sayOhneGroesse_when_itemHasNoSize", () => {
    renderRow({ ...activeItem, size: "" });

    expect(within(zeile()).getByText("ohne Größe")).toBeInTheDocument();
  });

  it("should_neitherDimNorBadge_when_itemIsActive", () => {
    renderRow();

    expect(screen.queryByText("deaktiviert")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem").querySelector(".opacity-60")).toBeNull();
  });

  it("should_dimTextAndShowBadge_when_itemIsInactive", () => {
    // AK4.4: Zustand als Text (Badge), nicht nur als Abblendung.
    renderRow({ ...activeItem, active: false });

    expect(zeile()).toHaveAccessibleName(/deaktiviert/);
    expect(screen.getByText("Pils").parentElement).toHaveClass("opacity-60");
  });

  it("should_notDimPrice_when_itemIsInactive", () => {
    // ADR-061 D2: das Kennzeichen verblasst nie, nur Textblock und Pfeil.
    renderRow({ ...activeItem, active: false });

    expect(screen.getByText("2,50 €").closest(".opacity-60")).toBeNull();
  });

  it("should_carryNoOwnRowStylesOrRawColors_when_rendered", () => {
    // AK4.5: Optik kommt aus ListenZeile – keine eigenen Zeilen-Klassen der alten Zeile.
    renderRow({ ...activeItem, active: false });

    const klassen = screen.getByRole("listitem").innerHTML;
    expect(klassen).not.toMatch(/divide-|-outline-offset-2|px-3 py-2/);
    expect(klassen).not.toMatch(
      /\b(?:bg|text|border)-(?:red|green|blue|gray|slate|zinc|neutral|stone|amber|yellow|white|black)\b/,
    );
  });
});

describe("CatalogRow – Bearbeiten-Dialog (spec-373 AK4.3/AK4.5)", () => {
  it("should_openDialogWithPrefilledFields_when_rowTapped", () => {
    renderRow();

    oeffnen();

    expect(screen.getByLabelText("Bezeichnung")).toHaveValue("Pils");
    expect(screen.getByLabelText("Preis (EUR)")).toHaveValue("2,50");
    expect(screen.getByRole("button", { name: "Speichern" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deaktivieren" })).toBeInTheDocument();
  });

  it("should_offerAktivieren_when_itemIsInactive", () => {
    renderRow({ ...activeItem, active: false });

    oeffnen();

    expect(screen.getByRole("button", { name: "Aktivieren" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deaktivieren" })).not.toBeInTheDocument();
  });

  it("should_sendIdCatalogAndFieldsAndClose_when_saveSucceeds", async () => {
    renderRow();
    oeffnen();
    fireEvent.change(screen.getByLabelText("Bezeichnung"), { target: { value: "Helles" } });

    await klicke("Speichern");

    const formData = updateMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("item-1");
    expect(formData.get("catalogId")).toBe("cat-1");
    expect(formData.get("name")).toBe("Helles");
    expect(dialogElement()).not.toHaveAttribute("open");
  });

  it("should_keepDialogWithErrorAndInput_when_saveRejected", async () => {
    updateMock.mockResolvedValue({ error: "Diesen Artikel gibt es bereits." });
    renderRow();
    oeffnen();
    fireEvent.change(screen.getByLabelText("Bezeichnung"), { target: { value: "Helles" } });

    await klicke("Speichern");

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent("Diesen Artikel gibt es bereits.");
    expect(screen.getByLabelText("Bezeichnung")).toHaveValue("Helles");
  });

  it("should_sendInvertedActiveFlagAndClose_when_deaktivierenSucceeds", async () => {
    renderRow();
    oeffnen();

    await klicke("Deaktivieren");

    const formData = setActiveMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("item-1");
    expect(formData.get("catalogId")).toBe("cat-1");
    expect(formData.get("active")).toBe("false");
    expect(updateMock).not.toHaveBeenCalled();
    expect(dialogElement()).not.toHaveAttribute("open");
  });

  it("should_sendActiveTrue_when_aktivierenTapped", async () => {
    renderRow({ ...activeItem, active: false });
    oeffnen();

    await klicke("Aktivieren");

    expect(setActiveMock.mock.calls[0][1].get("active")).toBe("true");
  });

  it("should_reportGespeichert_when_saveSucceeds", async () => {
    // spec-372 AK12, Glossar: Erfolg nach Änderung = „Gespeichert".
    renderRow();
    oeffnen();

    await klicke("Speichern");

    expect(meldeErfolgMock).toHaveBeenCalledWith("Gespeichert");
  });

  it("should_reportDeaktiviert_when_deaktivierenSucceeds", async () => {
    renderRow();
    oeffnen();

    await klicke("Deaktivieren");

    expect(meldeErfolgMock).toHaveBeenCalledWith("Artikel deaktiviert");
  });

  it("should_reportAktiviert_when_aktivierenSucceeds", async () => {
    renderRow({ ...activeItem, active: false });
    oeffnen();

    await klicke("Aktivieren");

    expect(meldeErfolgMock).toHaveBeenCalledWith("Artikel aktiviert");
  });

  it("should_keepDialogWithError_when_toggleRejected", async () => {
    // Fehlerszenario: Artikel in einem zweiten Tab gelöscht → Meldung statt stillem Erfolg.
    setActiveMock.mockResolvedValue({ error: "Artikel nicht gefunden." });
    renderRow();
    oeffnen();

    await klicke("Deaktivieren");

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent("Artikel nicht gefunden.");
  });

  it("should_closeWithoutActionAndReturnFocusToRow_when_abbrechen", () => {
    renderRow();
    oeffnen();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(updateMock).not.toHaveBeenCalled();
    expect(setActiveMock).not.toHaveBeenCalled();
    expect(dialogElement()).not.toHaveAttribute("open");
    expect(zeile()).toHaveFocus();
  });

  it("should_lockAllButtons_when_toggleIsPending", async () => {
    // Die Antwort wird am Testende aufgelöst – eine nie auflösende Action hielte den Scope offen
    // (Lesson #370).
    let antworten: (state: { error: string }) => void = () => {};
    setActiveMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          antworten = resolve;
        }),
    );
    renderRow();
    oeffnen();

    await klicke("Deaktivieren");

    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deaktivieren …" })).toBeDisabled();

    await act(async () => antworten({ error: "Artikel nicht gefunden." }));
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeEnabled();
  });
});

describe("CatalogRow – Fokus nach Kategoriewechsel (Review #373 W1)", () => {
  // Die Seite gruppiert nach Kategorie: Nach „Speichern" mit neuer Kategorie wandert die Zeile
  // in eine andere Liste und wird dort neu gemountet – ihr alter Auslöser ist weg.
  const seite = { umsortieren: () => {} };

  function GruppierteSeite() {
    const [kategorie, setKategorie] = useState<CatalogItem["category"]>("getraenk");
    useEffect(() => {
      seite.umsortieren = () => setKategorie("essen");
    });
    const zeileIn = (gruppe: CatalogItem["category"]) =>
      kategorie === gruppe && (
        <CatalogRow item={{ ...activeItem, category: kategorie }} catalogId="cat-1" />
      );
    return (
      <>
        <ul aria-label="Getränke">{zeileIn("getraenk")}</ul>
        <ul aria-label="Essen">{zeileIn("essen")}</ul>
      </>
    );
  }

  it("should_focusMovedRow_when_saveChangesCategory", async () => {
    updateMock.mockImplementation(async () => {
      seite.umsortieren();
      return { ok: true };
    });
    render(<GruppierteSeite />);
    oeffnen();

    await klicke("Speichern");

    const essen = screen.getByRole("list", { name: "Essen" });
    expect(essen).toContainElement(zeile());
    expect(zeile()).toHaveFocus();
  });
});

describe("CatalogRow – Fokus nach Zustandswechsel (spec-407 AK4.6)", () => {
  it("should_focusRow_when_deaktivierenSucceedsAndRowRerendersInactive", async () => {
    const { rerender } = render(
      <ul>
        <CatalogRow item={activeItem} catalogId="cat-1" />
      </ul>,
    );
    oeffnen();

    await klicke("Deaktivieren");
    rerender(
      <ul>
        <CatalogRow item={{ ...activeItem, active: false }} catalogId="cat-1" />
      </ul>,
    );

    expect(zeile()).toHaveAccessibleName(/deaktiviert/);
    expect(zeile()).toHaveFocus();
  });
});
