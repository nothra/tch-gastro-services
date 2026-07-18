import { describe, it, expect } from "vitest";
import type { AuslageKategorie } from "@/db/schema";
import { auslagenSummen, type AuslageSumEntry } from "./auslagenSummen";

function eintrag(overrides: Partial<AuslageSumEntry> = {}): AuslageSumEntry {
  return { kategorie: "sonstiges", betragCents: 500, status: "offen", ...overrides };
}

describe("auslagenSummen", () => {
  it("should_returnAllZero_when_eintraegeEmpty", () => {
    const summen = auslagenSummen([]);
    expect(summen).toEqual({
      getraenke: { offenCents: 0, erstattetCents: 0 },
      essen: { offenCents: 0, erstattetCents: 0 },
      sonstiges: { offenCents: 0, erstattetCents: 0 },
      gesamt: { offenCents: 0, erstattetCents: 0 },
    });
  });

  it("should_addToOffen_when_statusOffen", () => {
    const summen = auslagenSummen([
      eintrag({ kategorie: "getraenke", betragCents: 300, status: "offen" }),
    ]);
    expect(summen.getraenke).toEqual({ offenCents: 300, erstattetCents: 0 });
  });

  it("should_addToErstattet_when_statusErstattet", () => {
    const summen = auslagenSummen([
      eintrag({ kategorie: "essen", betragCents: 400, status: "erstattet" }),
    ]);
    expect(summen.essen).toEqual({ offenCents: 0, erstattetCents: 400 });
  });

  it("should_sumSonstiges_when_kategorieSonstiges", () => {
    const summen = auslagenSummen([
      eintrag({ kategorie: "sonstiges", betragCents: 250, status: "offen" }),
    ]);
    expect(summen.sonstiges).toEqual({ offenCents: 250, erstattetCents: 0 });
  });

  it("should_sumAcrossMultipleEntries_when_sameKategorie", () => {
    const summen = auslagenSummen([
      eintrag({ kategorie: "getraenke", betragCents: 100, status: "offen" }),
      eintrag({ kategorie: "getraenke", betragCents: 200, status: "offen" }),
    ]);
    expect(summen.getraenke.offenCents).toBe(300);
  });

  it("should_keepCategoriesIndependent_when_differentKategorien", () => {
    const summen = auslagenSummen([
      eintrag({ kategorie: "getraenke", betragCents: 100, status: "offen" }),
      eintrag({ kategorie: "essen", betragCents: 200, status: "offen" }),
    ]);
    expect(summen.getraenke.offenCents).toBe(100);
    expect(summen.essen.offenCents).toBe(200);
    expect(summen.sonstiges.offenCents).toBe(0);
  });

  it("should_sumGesamtAcrossAllCategories_when_mixedEntries", () => {
    const summen = auslagenSummen([
      eintrag({ kategorie: "getraenke", betragCents: 100, status: "offen" }),
      eintrag({ kategorie: "essen", betragCents: 200, status: "erstattet" }),
      eintrag({ kategorie: "sonstiges", betragCents: 300, status: "offen" }),
    ]);
    expect(summen.gesamt).toEqual({ offenCents: 400, erstattetCents: 200 });
  });

  it("should_throw_when_kategorieIsUnknown", () => {
    const invalid = eintrag({ kategorie: "unbekannt" as unknown as AuslageKategorie });
    expect(() => auslagenSummen([invalid])).toThrow("Unbekannte Kategorie");
  });
});
