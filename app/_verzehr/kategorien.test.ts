import { describe, it, expect } from "vitest";
import {
  artikelDerKategorie,
  inaktivePositionen,
  sichtbareKategorie,
  sichtbareKategorien,
} from "./kategorien";
import type { VerzehrArtikel } from "./artikel-anzeige";
import type { VerzehrPositionRow } from "@/db/verzehr";

function artikelIn(category: VerzehrArtikel["category"], id = `a-${category}`): VerzehrArtikel {
  return { id, name: `Artikel ${category}`, size: "", priceCents: 100, category };
}

function position(overrides: Partial<VerzehrPositionRow> = {}): VerzehrPositionRow {
  return {
    zeileId: "z1",
    catalogItemId: "c-alt",
    menge: 1,
    name: "Altbier",
    size: "",
    priceCents: 200,
    category: "getraenk",
    active: false,
    ...overrides,
  };
}

describe("sichtbareKategorien (spec-370 AK2.1/AK2.3/AK2.5)", () => {
  it("should_orderGetraenkeKaffeeEssen_when_catalogListsThemInOtherOrder", () => {
    const artikel = [artikelIn("essen"), artikelIn("kaffee"), artikelIn("getraenk")];

    expect(sichtbareKategorien(artikel, [])).toEqual(["getraenk", "kaffee", "essen"]);
  });

  it("should_omitCategory_when_catalogHasNoArtikelOfIt", () => {
    // Stehende Theke ohne Essen (ADR-023 §D7): kein leerer Eintrag.
    const artikel = [artikelIn("getraenk"), artikelIn("kaffee")];

    expect(sichtbareKategorien(artikel, [])).toEqual(["getraenk", "kaffee"]);
  });

  it("should_appendInaktivEntry_when_personHasPositionOnDeactivatedArtikel", () => {
    const artikel = [artikelIn("getraenk")];

    expect(sichtbareKategorien(artikel, [position({ menge: 2 })])).toEqual(["getraenk", "inaktiv"]);
  });

  it("should_notAppendInaktivEntry_when_deactivatedPositionHasMengeZero", () => {
    const artikel = [artikelIn("getraenk")];

    expect(sichtbareKategorien(artikel, [position({ menge: 0 })])).toEqual(["getraenk"]);
  });

  it("should_notAppendInaktivEntry_when_positionIsActive", () => {
    const artikel = [artikelIn("getraenk")];

    expect(sichtbareKategorien(artikel, [position({ active: true, menge: 3 })])).toEqual([
      "getraenk",
    ]);
  });

  it("should_returnEmpty_when_noArtikelAndNoInactivePositions", () => {
    expect(sichtbareKategorien([], [])).toEqual([]);
  });
});

describe("sichtbareKategorie (spec-370 AK2.4, ADR-054 D2)", () => {
  it("should_keepChosenCategory_when_itIsAvailable", () => {
    expect(sichtbareKategorie("kaffee", ["getraenk", "kaffee", "essen"])).toBe("kaffee");
  });

  it("should_fallBackToFirstAvailable_when_nothingChosenYet", () => {
    expect(sichtbareKategorie(null, ["kaffee", "essen"])).toBe("kaffee");
  });

  it("should_fallBackToFirstAvailable_when_chosenCategoryMissingForPerson", () => {
    // „Nicht mehr im Katalog" gibt es nur bei Personen mit solchen Positionen.
    expect(sichtbareKategorie("inaktiv", ["getraenk", "essen"])).toBe("getraenk");
  });

  it("should_returnNull_when_noCategoryAvailable", () => {
    expect(sichtbareKategorie("getraenk", [])).toBeNull();
  });
});

describe("inaktivePositionen (ADR-026 D3)", () => {
  it("should_keepOnlyDeactivatedPositionsWithMenge_when_mixedPositions", () => {
    const behalten = position({ catalogItemId: "c-weg", menge: 1 });
    const positionen = [
      behalten,
      position({ catalogItemId: "c-null", menge: 0 }),
      position({ catalogItemId: "c-aktiv", active: true }),
    ];

    expect(inaktivePositionen(positionen)).toEqual([behalten]);
  });
});

describe("artikelDerKategorie (spec-370 AK2.2/AK2.5)", () => {
  it("should_returnOnlyArtikelOfCategory_when_catalogCategoryChosen", () => {
    const cola = artikelIn("getraenk", "c-cola");
    const kaffee = artikelIn("kaffee", "c-kaffee");

    expect(artikelDerKategorie("getraenk", [cola, kaffee], [])).toEqual([cola]);
  });

  it("should_mapDeactivatedPositionsToArtikel_when_inaktivChosen", () => {
    // Die Position trägt Name/Größe/Preis selbst (eingefrorener Preis, ADR-033 D2) – sie wird
    // wie ein Artikel gerendert, damit das Zeilenmuster einheitlich bleibt (AK3).
    const altbier = position({ catalogItemId: "c-alt", name: "Altbier", size: "0,3l", menge: 2 });

    expect(artikelDerKategorie("inaktiv", [artikelIn("getraenk")], [altbier])).toEqual([
      { id: "c-alt", name: "Altbier", size: "0,3l", priceCents: 200, category: "getraenk" },
    ]);
  });
});
