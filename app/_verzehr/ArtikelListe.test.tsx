import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ArtikelListe } from "./ArtikelListe";
import type { VerzehrArtikel } from "./artikel-anzeige";

// MengeControl (Client, useActionState) durch ein Stub ersetzt, das seine Props spiegelt – so ist
// prüfbar, welche Position mit welcher Menge und welchem editable-Wert gerendert wird.
vi.mock("@/app/_verzehr/MengeControl", () => ({
  MengeControl: ({
    menge,
    editable,
    zeileId,
    catalogItemId,
  }: {
    menge: number;
    editable: boolean;
    zeileId: string;
    catalogItemId: string;
  }) => (
    <span
      data-testid="menge"
      data-editable={String(editable)}
      data-zeile={zeileId}
      data-artikel={catalogItemId}
    >
      {menge}
    </span>
  ),
}));

const pils03: VerzehrArtikel = {
  id: "c-p3",
  name: "Pils",
  size: "0,3l",
  priceCents: 250,
  category: "getraenk",
};
const pils05: VerzehrArtikel = { ...pils03, id: "c-p5", size: "0,5l", priceCents: 350 };
const cola: VerzehrArtikel = {
  id: "c-cola",
  name: "Cola",
  size: "",
  priceCents: 200,
  category: "getraenk",
};

function renderListe(overrides: Partial<Parameters<typeof ArtikelListe>[0]> = {}) {
  return render(
    <ArtikelListe
      artikel={[pils03, cola, pils05]}
      mengeJeArtikel={new Map([["c-p5", 3]])}
      zeileId="z1"
      action={vi.fn()}
      editable
      {...overrides}
    />,
  );
}

function gruppe(name: string) {
  const ueberschrift = screen.getByRole("heading", { level: 3, name });
  const li = ueberschrift.closest("li");
  if (!li) throw new Error(`Keine Gruppe ${name}`);
  return li;
}

describe("ArtikelListe (spec-370 AK3)", () => {
  it("should_groupSameNameArtikelUnderHeadingInCatalogOrder_when_rendered", () => {
    // AK3.1: gleichnamige Artikel bilden eine Gruppe; Reihenfolge = erstes Auftreten (ADR-027 D3).
    renderListe();
    const ueberschriften = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(ueberschriften).toEqual(["Pils", "Cola"]);
    const zeilen = within(gruppe("Pils")).getAllByRole("listitem");
    expect(zeilen.map((zeile) => zeile.textContent)).toEqual(["0,3l2,50 €0", "0,5l3,50 €3"]);
  });

  it("should_renderSingleArtikelWithSamePattern_when_onlyOneSize", () => {
    // AK3.2/AK3.3: Einzelartikel = Gruppenüberschrift + eine Zeile; leere Größe einheitlich.
    renderListe();
    const zeilen = within(gruppe("Cola")).getAllByRole("listitem");
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]).toHaveTextContent("ohne Größe");
    expect(zeilen[0]).toHaveTextContent("2,00 €");
  });

  it("should_useSameRowClassesForGroupAndSingleArtikel_when_rendered", () => {
    // AK3.2: keine abweichende Einrückung, kein eigenes Einzelzeilen-Layout.
    renderListe();
    const pilsZeile = within(gruppe("Pils")).getAllByRole("listitem")[0];
    const colaZeile = within(gruppe("Cola")).getAllByRole("listitem")[0];
    expect(colaZeile.className).toBe(pilsZeile.className);
    expect(colaZeile.parentElement?.className).toBe(pilsZeile.parentElement?.className);
  });

  it("should_renderPricesTabularAndRightAligned_when_rendered", () => {
    // AK3.4: Beträge bündig untereinander.
    renderListe();
    const preis = screen.getByText("3,50 €");
    expect(preis).toHaveClass("tabular-nums", "text-right");
  });

  it("should_styleGroupHeadingAboveBodyText_when_rendered", () => {
    // AK3.5: Überschrift erkennbar (nicht das winzige graue Label).
    renderListe();
    const ueberschrift = screen.getByRole("heading", { level: 3, name: "Pils" });
    expect(ueberschrift).toHaveClass("text-base", "font-semibold");
    expect(ueberschrift).not.toHaveClass("text-xs");
  });

  it("should_passMengeOrZeroAndIdsToStepper_when_rendered", () => {
    renderListe();
    const mengen = screen.getAllByTestId("menge");
    expect(mengen.map((m) => [m.dataset.artikel, m.textContent, m.dataset.zeile])).toEqual([
      ["c-p3", "0", "z1"],
      ["c-p5", "3", "z1"],
      ["c-cola", "0", "z1"],
    ]);
  });

  it("should_passEditableFalse_when_readOnly", () => {
    renderListe({ editable: false });
    screen
      .getAllByTestId("menge")
      .forEach((m) => expect(m).toHaveAttribute("data-editable", "false"));
  });
});
