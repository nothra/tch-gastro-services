import { describe, it, expect } from "vitest";
import { groessenSuffix, groessenLabel, gruppiereArtikel, type VerzehrArtikel } from "./artikel-anzeige";

function artikel(overrides: Partial<VerzehrArtikel> = {}): VerzehrArtikel {
  return {
    id: "c-1",
    name: "Cola",
    size: "0,5 l",
    priceCents: 250,
    category: "getraenk",
    ...overrides,
  };
}

describe("groessenSuffix", () => {
  it("should_returnSuffixWithSize_when_sizeIsSet", () => {
    expect(groessenSuffix("0,5 l")).toBe(" · 0,5 l");
  });

  it("should_returnEmpty_when_sizeIsEmpty", () => {
    expect(groessenSuffix("")).toBe("");
  });

  it("should_returnEmpty_when_sizeIsOnlyWhitespace", () => {
    expect(groessenSuffix("   ")).toBe("");
  });

  it("should_trimSize_when_sizeHasSurroundingWhitespace", () => {
    expect(groessenSuffix("  0,3 l  ")).toBe(" · 0,3 l");
  });
});

describe("groessenLabel", () => {
  it("should_returnTrimmedSize_when_sizeIsSet", () => {
    expect(groessenLabel("0,5 l")).toBe("0,5 l");
  });

  it("should_returnFallback_when_sizeIsEmpty", () => {
    expect(groessenLabel("")).toBe("ohne Größe");
  });

  it("should_returnFallback_when_sizeIsOnlyWhitespace", () => {
    expect(groessenLabel("   ")).toBe("ohne Größe");
  });

  it("should_trimSize_when_sizeHasSurroundingWhitespace", () => {
    expect(groessenLabel("  0,3 l  ")).toBe("0,3 l");
  });
});

describe("gruppiereArtikel", () => {
  it("should_returnSingleGroupWithOneVariante_when_onlyOneArtikelWithName", () => {
    const result = gruppiereArtikel([artikel()]);

    expect(result).toEqual([{ name: "Cola", varianten: [artikel()] }]);
  });

  it("should_groupSameNameVarianten_when_multipleSizesForSameName", () => {
    const small = artikel({ id: "c-1", size: "0,3 l" });
    const large = artikel({ id: "c-2", size: "0,5 l" });

    const result = gruppiereArtikel([small, large]);

    expect(result).toEqual([{ name: "Cola", varianten: [small, large] }]);
  });

  it("should_groupNonAdjacentSameNameVarianten_when_differentSortOrderSeparatesThem", () => {
    // sortOrder-Kuratierung des Verwalters kann gleichnamige Varianten trennen –
    // die Bucket-Zuordnung erfolgt am Erstauftreten des Namens, nicht an Nachbarschaft.
    const colaSmall = artikel({ id: "c-1", name: "Cola", size: "0,3 l" });
    const bier = artikel({ id: "c-2", name: "Bier", size: "" });
    const colaLarge = artikel({ id: "c-3", name: "Cola", size: "0,5 l" });

    const result = gruppiereArtikel([colaSmall, bier, colaLarge]);

    expect(result).toEqual([
      { name: "Cola", varianten: [colaSmall, colaLarge] },
      { name: "Bier", varianten: [bier] },
    ]);
  });

  it("should_preserveInputOrder_when_multipleDistinctNames", () => {
    const kaffee = artikel({ id: "c-1", name: "Kaffee", size: "" });
    const cola = artikel({ id: "c-2", name: "Cola", size: "0,5 l" });

    const result = gruppiereArtikel([kaffee, cola]);

    expect(result.map((gruppe) => gruppe.name)).toEqual(["Kaffee", "Cola"]);
  });

  it("should_returnEmptyArray_when_noArtikel", () => {
    expect(gruppiereArtikel([])).toEqual([]);
  });
});
