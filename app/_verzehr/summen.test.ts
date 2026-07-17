import { describe, it, expect } from "vitest";
import { zeileSummen, type VerzehrPositionSum } from "./summen";

// Reine, DB-freie Summen-Logik (ADR-025 D5): Getränke (Theke) vs. Sonstige (Essen + Kaffee).
// Alle Beträge in ganzzahligen Cent (ADR-021) – exakt, keine Rundung nötig.
function pos(overrides: Partial<VerzehrPositionSum> = {}): VerzehrPositionSum {
  return { menge: 1, priceCents: 100, category: "getraenk", ...overrides };
}

describe("zeileSummen", () => {
  it("should_returnZero_when_noPositions", () => {
    expect(zeileSummen([])).toEqual({ getraenkeCents: 0, sonstigeCents: 0 });
  });

  it("should_sumGetraenkeAsMengeTimesPreis_when_getraenkPositions", () => {
    const result = zeileSummen([pos({ menge: 3, priceCents: 150, category: "getraenk" })]);
    expect(result.getraenkeCents).toBe(450);
  });

  it("should_countEssenIntoSonstige_when_essenPosition", () => {
    const result = zeileSummen([pos({ menge: 2, priceCents: 350, category: "essen" })]);
    expect(result.sonstigeCents).toBe(700);
    expect(result.getraenkeCents).toBe(0);
  });

  it("should_countKaffeeIntoSonstige_when_kaffeePosition", () => {
    const result = zeileSummen([pos({ menge: 4, priceCents: 80, category: "kaffee" })]);
    expect(result.sonstigeCents).toBe(320);
  });

  it("should_splitByCategory_when_mixedPositions", () => {
    const result = zeileSummen([
      pos({ menge: 2, priceCents: 200, category: "getraenk" }),
      pos({ menge: 1, priceCents: 500, category: "essen" }),
      pos({ menge: 3, priceCents: 100, category: "kaffee" }),
    ]);
    expect(result).toEqual({ getraenkeCents: 400, sonstigeCents: 800 });
  });

  it("should_ignorePositionsWithZeroMenge_when_present", () => {
    const result = zeileSummen([pos({ menge: 0, priceCents: 999, category: "getraenk" })]);
    expect(result).toEqual({ getraenkeCents: 0, sonstigeCents: 0 });
  });
});
