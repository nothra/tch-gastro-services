import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerzehrErfassung } from "./VerzehrErfassung";
import type { VerzehrFormAction } from "./types";
import type { VerzehrPositionRow } from "@/db/verzehr";

// MengeControl ist eine Client-Komponente mit useActionState. Hier durch ein
// statisches Stub ersetzt – die Interaktion hat eigene Tests (MengeControl.test.tsx).
vi.mock("./MengeControl", () => ({
  MengeControl: ({ menge, editable }: { menge: number; editable: boolean }) => (
    <span data-testid="menge" data-editable={String(editable)}>
      {menge}
    </span>
  ),
}));

const noopAction: VerzehrFormAction = vi.fn(async () => ({ ok: true, menge: 0 }));

const aZeile = { id: "z-1", anzeigename: "Anna" };
const cola = { id: "c-1", name: "Cola", priceCents: 250, category: "getraenk" as const };
const schnitzel = { id: "c-2", name: "Schnitzel", priceCents: 890, category: "essen" as const };
const kaffee = { id: "c-3", name: "Kaffee", priceCents: 100, category: "kaffee" as const };

function pos(overrides: Partial<VerzehrPositionRow> = {}): VerzehrPositionRow {
  return {
    zeileId: "z-1",
    catalogItemId: "c-1",
    menge: 1,
    name: "Cola",
    priceCents: 250,
    category: "getraenk",
    ...overrides,
  };
}

describe("VerzehrErfassung", () => {
  it("should_showEmptyMessage_when_noZeilen", () => {
    render(
      <VerzehrErfassung zeilen={[]} artikel={[cola]} positionen={[]} action={noopAction} editable />,
    );

    expect(screen.getByText(/Noch keine Teilnehmer erfasst/)).toBeInTheDocument();
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
  });

  it("should_renderAnzeigename_when_zeilenProvided", () => {
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[cola]}
        positionen={[]}
        action={noopAction}
        editable
      />,
    );

    expect(screen.getByText("Anna")).toBeInTheDocument();
  });

  it("should_showGetraenkeFormatted_when_getraenkPositionExists", () => {
    // AC7: Summen auf 2 Nachkommastellen, deutsches Format (Komma) via formatCents.
    // 2 × 250 Cent = 500 Cent = 5,00 €
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[cola]}
        positionen={[pos({ menge: 2, priceCents: 250, category: "getraenk" })]}
        action={noopAction}
        editable
      />,
    );

    expect(screen.getByText(/5,00\s*€/)).toBeInTheDocument();
  });

  it("should_showEssenInSonstige_when_essenPositionExists", () => {
    // AC3: n Portionen Essen × Katalogpreis → Sonstige.
    // 2 × 890 Cent = 1780 Cent = 17,80 €
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[schnitzel]}
        positionen={[pos({ menge: 2, priceCents: 890, catalogItemId: "c-2", category: "essen" })]}
        action={noopAction}
        editable
      />,
    );

    expect(screen.getByText(/17,80\s*€/)).toBeInTheDocument();
  });

  it("should_showKaffeeInSonstige_when_kaffeePositionExists", () => {
    // AC4: m × Kaffeepreis → Sonstige.
    // 3 × 100 Cent = 300 Cent = 3,00 €
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[kaffee]}
        positionen={[pos({ menge: 3, priceCents: 100, catalogItemId: "c-3", category: "kaffee" })]}
        action={noopAction}
        editable
      />,
    );

    expect(screen.getByText(/3,00\s*€/)).toBeInTheDocument();
  });

  it("should_renderZeroMengeDefault_when_noPositionForArtikel", () => {
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[cola]}
        positionen={[]}
        action={noopAction}
        editable
      />,
    );

    expect(screen.getByTestId("menge")).toHaveTextContent("0");
  });

  it("should_renderExistingMenge_when_positionExists", () => {
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[cola]}
        positionen={[pos({ menge: 5 })]}
        action={noopAction}
        editable
      />,
    );

    expect(screen.getByTestId("menge")).toHaveTextContent("5");
  });

  it("should_passEditableFalse_when_notEditable", () => {
    // FS2: abgeschlossene Veranstaltung → nur Lesesicht.
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[cola]}
        positionen={[]}
        action={noopAction}
        editable={false}
      />,
    );

    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
  });

  it("should_showCategoryHeadings_when_artikelFromMultipleCategories", () => {
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[cola, schnitzel, kaffee]}
        positionen={[]}
        action={noopAction}
        editable
      />,
    );

    expect(screen.getByText("Getränk")).toBeInTheDocument();
    expect(screen.getByText("Essen")).toBeInTheDocument();
    expect(screen.getByText("Kaffee")).toBeInTheDocument();
  });

  it("should_notRenderCategorySection_when_noArtikelInCategory", () => {
    // Keine Kaffee-Artikel → kein Kaffee-Abschnitt.
    render(
      <VerzehrErfassung
        zeilen={[aZeile]}
        artikel={[cola]}
        positionen={[]}
        action={noopAction}
        editable
      />,
    );

    expect(screen.queryByText("Kaffee")).not.toBeInTheDocument();
  });

  it("should_isolatePositionsByZeile_when_multipleZeilen", () => {
    // AC5: Änderungen an verschiedenen Zeilen gehen beide verlustfrei ein.
    const bZeile = { id: "z-2", anzeigename: "Bernd" };
    render(
      <VerzehrErfassung
        zeilen={[aZeile, bZeile]}
        artikel={[cola]}
        positionen={[
          pos({ zeileId: "z-1", menge: 2 }),
          pos({ zeileId: "z-2", menge: 4 }),
        ]}
        action={noopAction}
        editable
      />,
    );

    const menges = screen.getAllByTestId("menge");
    expect(menges[0]).toHaveTextContent("2");
    expect(menges[1]).toHaveTextContent("4");
  });
});
