import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { VerzehrUebersicht } from "./VerzehrUebersicht";
import type { VerzehrZeile } from "./verzehr-props";
import type { VerzehrPositionRow } from "@/db/verzehr";

// Ersetzt die Karten-Tests von VerzehrErfassung/ZeileKarte (spec-370 AK7.3): vor der Namenswahl
// der Theke bleibt nur eine Nur-Lese-Liste Name + Gesamt (spec-370 AK6.3, ADR-054 D4). Die
// Aufschlüsselung und das Zeilenmuster der Artikel decken PersonenKopf/ArtikelListe ab.

const zeilen: VerzehrZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
];

function position(overrides: Partial<VerzehrPositionRow>): VerzehrPositionRow {
  return {
    zeileId: "z1",
    catalogItemId: "c1",
    menge: 1,
    name: "Cola",
    size: "",
    priceCents: 250,
    category: "getraenk",
    active: true,
    ...overrides,
  };
}

function zeileVon(name: string) {
  const li = screen.getByText(name).closest("li");
  if (!li) throw new Error(`Keine Zeile für ${name}`);
  return li;
}

describe("VerzehrUebersicht (spec-370 AK6.3)", () => {
  it("should_listEveryTeilnehmerInOrderWithGesamt_when_rendered", () => {
    render(
      <VerzehrUebersicht
        zeilen={zeilen}
        positionen={[
          position({ zeileId: "z1", menge: 2 }),
          position({ zeileId: "z2", category: "essen", priceCents: 900 }),
          position({ zeileId: "z2", catalogItemId: "c2", category: "kaffee", priceCents: 150 }),
        ]}
      />,
    );
    const liste = screen.getByRole("list", { name: "Bisher erfasst" });
    expect(
      within(liste)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["AnnaGesamt 5,00 €", "BerndGesamt 10,50 €"]);
  });

  it("should_countDeactivatedPositionsInGesamt_when_softDeletedArtikelHasMenge", () => {
    // ADR-026 D3: kein Under-Billing durch deaktivierte Artikel.
    render(
      <VerzehrUebersicht zeilen={zeilen} positionen={[position({ menge: 1, active: false })]} />,
    );
    expect(zeileVon("Anna")).toHaveTextContent("2,50 €");
  });

  it("should_showZeroGesamt_when_noPositions", () => {
    render(<VerzehrUebersicht zeilen={zeilen} positionen={[]} />);
    expect(zeileVon("Bernd")).toHaveTextContent("0,00 €");
  });

  it("should_offerNoBreakdownArtikelOrControls_when_rendered", () => {
    // Nicht bearbeitbar, keine Artikel, keine Aufschlüsselung.
    render(<VerzehrUebersicht zeilen={zeilen} positionen={[position({})]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Getränke/)).not.toBeInTheDocument();
    expect(screen.queryByText("Cola")).not.toBeInTheDocument();
  });
});
