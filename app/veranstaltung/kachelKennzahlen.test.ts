import { describe, it, expect } from "vitest";
import { kachelKennzahlen } from "./kachelKennzahlen";

// Die Soll-Werte sind von Hand nachgerechnet (Literal), nicht über `kassierSummen`/
// `auslagenSummen` erneut hergeleitet – sonst wäre der Test tautologisch.

const cola = { zeileId: "z-1", menge: 2, priceCents: 250, category: "getraenk" as const };
const wurst = { zeileId: "z-2", menge: 1, priceCents: 400, category: "essen" as const };

describe("kachelKennzahlen (ADR-053 D4, spec-369 AK4/AK5)", () => {
  it("should_sumVerzehrOfAllZeilen_when_positionenPresent", () => {
    const kennzahlen = kachelKennzahlen({
      zeilen: [
        { id: "z-1", erhaltenCents: null },
        { id: "z-2", erhaltenCents: null },
      ],
      positionen: [cola, wurst],
      auslagen: [],
    });

    // 2 × 2,50 € + 1 × 4,00 €
    expect(kennzahlen.verzehr).toBe("9,00 €");
  });

  it("should_sumOffeneAndErstatteteAuslagen_when_auslagenPresent", () => {
    const kennzahlen = kachelKennzahlen({
      zeilen: [],
      positionen: [],
      auslagen: [
        { kategorie: "essen", betragCents: 1250, status: "offen" },
        { kategorie: "sonstiges", betragCents: 300, status: "erstattet" },
      ],
    });

    expect(kennzahlen.auslagen).toBe("15,50 €");
  });

  it("should_countBezahlteZeilen_when_someZeilenOpen", () => {
    const kennzahlen = kachelKennzahlen({
      zeilen: [
        { id: "z-1", erhaltenCents: 500 }, // Verzehr 5,00 € voll bezahlt
        { id: "z-2", erhaltenCents: 100 }, // Verzehr 4,00 €, nur 1,00 € erhalten → offen
        { id: "z-3", erhaltenCents: null }, // kein Verzehr → bezahlt (ADR-033 D1)
      ],
      positionen: [cola, wurst],
      auslagen: [],
    });

    expect(kennzahlen.kassieren).toBe("2 von 3 bezahlt");
  });

  it("should_showZeroValues_when_nothingRecorded", () => {
    const kennzahlen = kachelKennzahlen({ zeilen: [], positionen: [], auslagen: [] });

    expect(kennzahlen).toEqual({
      verzehr: "0,00 €",
      auslagen: "0,00 €",
      kassieren: "0 von 0 bezahlt",
    });
  });
});
