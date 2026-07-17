import { describe, it, expect } from "vitest";
import { zeileSummen, type VerzehrPositionSum } from "./summen";

// Reine, DB-freie Summen-Logik (ADR-027): Getränke, Essen und Kaffee je eigene Kategorie.
// Alle Beträge in ganzzahligen Cent (ADR-021) – exakt, keine Rundung nötig.
function pos(overrides: Partial<VerzehrPositionSum> = {}): VerzehrPositionSum {
  return { menge: 1, priceCents: 100, category: "getraenk", ...overrides };
}

describe("zeileSummen", () => {
  it("should_returnZero_when_noPositions", () => {
    expect(zeileSummen([])).toEqual({ getraenkeCents: 0, essenCents: 0, kaffeeCents: 0 });
  });

  it("should_sumGetraenkeAsMengeTimesPreis_when_getraenkPositions", () => {
    const result = zeileSummen([pos({ menge: 3, priceCents: 150, category: "getraenk" })]);
    expect(result).toEqual({ getraenkeCents: 450, essenCents: 0, kaffeeCents: 0 });
  });

  it("should_sumEssenAsMengeTimesPreis_when_essenPositions", () => {
    const result = zeileSummen([pos({ menge: 2, priceCents: 350, category: "essen" })]);
    expect(result).toEqual({ getraenkeCents: 0, essenCents: 700, kaffeeCents: 0 });
  });

  it("should_sumKaffeeAsMengeTimesPreis_when_kaffeePositions", () => {
    const result = zeileSummen([pos({ menge: 4, priceCents: 80, category: "kaffee" })]);
    expect(result).toEqual({ getraenkeCents: 0, essenCents: 0, kaffeeCents: 320 });
  });

  it("should_splitByCategory_when_mixedPositions", () => {
    const result = zeileSummen([
      pos({ menge: 2, priceCents: 200, category: "getraenk" }),
      pos({ menge: 1, priceCents: 500, category: "essen" }),
      pos({ menge: 3, priceCents: 100, category: "kaffee" }),
    ]);
    expect(result).toEqual({ getraenkeCents: 400, essenCents: 500, kaffeeCents: 300 });
  });

  it("should_ignorePositionsWithZeroMenge_when_present", () => {
    const result = zeileSummen([pos({ menge: 0, priceCents: 999, category: "getraenk" })]);
    expect(result).toEqual({ getraenkeCents: 0, essenCents: 0, kaffeeCents: 0 });
  });

  it("should_throw_when_categoryIsUnknown", () => {
    const invalidCategory = "snack" as unknown as VerzehrPositionSum["category"];
    expect(() => zeileSummen([pos({ category: invalidCategory })])).toThrow(
      "Unbekannte Kategorie: snack",
    );
  });
});
