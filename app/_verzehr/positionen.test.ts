import { describe, it, expect } from "vitest";
import {
  artikelBezeichnung,
  gruppierePositionenNachZeile,
  verzehrPositionen,
  type VerzehrPositionDetailInput,
} from "./positionen";

function pos(overrides: Partial<VerzehrPositionDetailInput>): VerzehrPositionDetailInput {
  return { menge: 1, priceCents: 100, category: "getraenk", name: "Cola", size: "", ...overrides };
}

describe("verzehrPositionen", () => {
  it("should_computeZeilenbetrag_when_positionsGiven", () => {
    const result = verzehrPositionen([
      pos({ menge: 3, priceCents: 150, name: "Pils", size: "0,5 l" }),
    ]);

    expect(result).toEqual([
      {
        name: "Pils",
        size: "0,5 l",
        category: "getraenk",
        menge: 3,
        einzelpreisCents: 150,
        zeilenbetragCents: 450,
      },
    ]);
  });

  it("should_omitPosition_when_mengeIsZero", () => {
    const result = verzehrPositionen([pos({ menge: 0, priceCents: 999 })]);

    expect(result).toEqual([]);
  });

  it("should_sortByCategoryThenNameThenSize_when_mixed", () => {
    const result = verzehrPositionen([
      pos({ category: "kaffee", name: "Espresso", size: "" }),
      pos({ category: "getraenk", name: "Wasser", size: "0,5 l" }),
      pos({ category: "getraenk", name: "Wasser", size: "0,25 l" }),
      pos({ category: "essen", name: "Schnitzel", size: "" }),
      pos({ category: "getraenk", name: "Cola", size: "" }),
    ]);

    expect(
      result.map((position) => `${position.category}/${position.name}/${position.size}`),
    ).toEqual([
      "getraenk/Cola/",
      "getraenk/Wasser/0,25 l",
      "getraenk/Wasser/0,5 l",
      "essen/Schnitzel/",
      "kaffee/Espresso/",
    ]);
  });
});

describe("gruppierePositionenNachZeile", () => {
  it("should_groupByZeileId_when_multipleZeilen", () => {
    const map = gruppierePositionenNachZeile([
      { zeileId: "z-1", wert: 1 },
      { zeileId: "z-2", wert: 2 },
      { zeileId: "z-1", wert: 3 },
    ]);

    expect(map.get("z-1")).toEqual([
      { zeileId: "z-1", wert: 1 },
      { zeileId: "z-1", wert: 3 },
    ]);
    expect(map.get("z-2")).toEqual([{ zeileId: "z-2", wert: 2 }]);
  });
});

describe("artikelBezeichnung", () => {
  it("should_appendSize_when_sizePresent", () => {
    expect(artikelBezeichnung({ name: "Pils", size: "0,5 l" })).toBe("Pils (0,5 l)");
  });

  it("should_returnNameOnly_when_sizeEmpty", () => {
    expect(artikelBezeichnung({ name: "Schnitzel", size: "" })).toBe("Schnitzel");
  });
});
