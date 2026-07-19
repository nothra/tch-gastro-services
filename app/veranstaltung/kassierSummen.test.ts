import { describe, expect, it } from "vitest";
import {
  gesamtabrechnung,
  kassierTagessummen,
  kassierZeile,
  kassierZeilen,
  type KassierZeile,
} from "./kassierSummen";

// Reine, DB-freie Kassier-Summen-/Status-Logik (F8, #55, ADR-033 D5). Single source für Anzeige
// UND Abschluss-Gate; Beträge sind ganzzahlige Cent (ADR-021) → Summen exakt ganzzahlig.

describe("kassierZeile", () => {
  it("should_sumVerzehrGesamt_when_getraenkeEssenKaffee", () => {
    const zeile = kassierZeile({
      getraenkeCents: 500,
      essenCents: 300,
      kaffeeCents: 150,
      erhaltenCents: null,
    });

    expect(zeile.verzehrGesamtCents).toBe(950);
    expect(zeile.sonstigeCents).toBe(450); // essen + kaffee, ohne Getränke
  });

  it("should_sumVerzehrGesamtWithoutAuslagen_when_computed", () => {
    // Auslagen sind KEIN Input dieser Funktion (eigener Vorgang, F6) → Verzehr-Gesamt ist brutto.
    const zeile = kassierZeile({
      getraenkeCents: 1000,
      essenCents: 0,
      kaffeeCents: 0,
      erhaltenCents: 1000,
    });

    expect(zeile.verzehrGesamtCents).toBe(1000);
  });

  it("should_markPaidWithZeroSpende_when_erhaltenEqualsVerzehr", () => {
    const zeile = kassierZeile({
      getraenkeCents: 800,
      essenCents: 200,
      kaffeeCents: 0,
      erhaltenCents: 1000,
    });

    expect(zeile.bezahlt).toBe(true);
    expect(zeile.spendeCents).toBe(0);
  });

  it("should_reportSpende_when_erhaltenExceedsVerzehr", () => {
    const zeile = kassierZeile({
      getraenkeCents: 700,
      essenCents: 0,
      kaffeeCents: 0,
      erhaltenCents: 1000,
    });

    expect(zeile.bezahlt).toBe(true);
    expect(zeile.spendeCents).toBe(300); // 1000 − 700
  });

  it("should_markOpenWithoutRestbetrag_when_erhaltenBelowVerzehr", () => {
    const zeile = kassierZeile({
      getraenkeCents: 1000,
      essenCents: 0,
      kaffeeCents: 0,
      erhaltenCents: 400,
    });

    expect(zeile.bezahlt).toBe(false);
    expect(zeile.spendeCents).toBe(0); // kein negativer/gespeicherter Restbetrag (MVP)
  });

  it("should_markPaid_when_zeroVerzehrAndNoErhalten", () => {
    const zeile = kassierZeile({
      getraenkeCents: 0,
      essenCents: 0,
      kaffeeCents: 0,
      erhaltenCents: null,
    });

    // Nichts konsumiert → nichts zu kassieren → bezahlt (Spec: Null-Verzehr = bezahlt).
    expect(zeile.bezahlt).toBe(true);
    expect(zeile.spendeCents).toBe(0);
  });
});

describe("kassierTagessummen", () => {
  const paid: KassierZeile = kassierZeile({
    getraenkeCents: 500,
    essenCents: 300,
    kaffeeCents: 0,
    erhaltenCents: 1000, // 200 Spende
  });
  const open: KassierZeile = kassierZeile({
    getraenkeCents: 1000,
    essenCents: 0,
    kaffeeCents: 0,
    erhaltenCents: 400, // offen
  });
  const zeroPaid: KassierZeile = kassierZeile({
    getraenkeCents: 0,
    essenCents: 0,
    kaffeeCents: 0,
    erhaltenCents: null,
  });

  it("should_sumAllColumns_when_multipleZeilen", () => {
    const summen = kassierTagessummen([paid, open, zeroPaid]);

    expect(summen.getraenkeCents).toBe(1500);
    expect(summen.sonstigeCents).toBe(300);
    expect(summen.verzehrGesamtCents).toBe(1800);
    expect(summen.erhaltenCents).toBe(1400); // 1000 + 400 + 0 (NULL → 0)
    expect(summen.spendeCents).toBe(200);
  });

  it("should_countOnlyOpenLines_when_someUnpaid", () => {
    const summen = kassierTagessummen([paid, open, zeroPaid]);

    expect(summen.offeneZeilen).toBe(1); // nur `open`; zeroPaid zählt nicht als offen
  });

  it("should_reportZeroOpen_when_allPaid", () => {
    const summen = kassierTagessummen([paid, zeroPaid]);

    expect(summen.offeneZeilen).toBe(0);
  });
});

describe("kassierZeilen", () => {
  it("should_groupPositionenByZeile_when_computingRows", () => {
    const zeilen = [
      { id: "z1", erhaltenCents: 750 },
      { id: "z2", erhaltenCents: null },
    ];
    const positionen = [
      { zeileId: "z1", menge: 2, priceCents: 250, category: "getraenk" as const }, // 500
      { zeileId: "z1", menge: 1, priceCents: 300, category: "essen" as const }, // 300
      { zeileId: "z2", menge: 1, priceCents: 150, category: "kaffee" as const }, // 150
    ];

    const rows = kassierZeilen(zeilen, positionen);

    expect(rows).toHaveLength(2);
    expect(rows[0].verzehrGesamtCents).toBe(800); // z1: 500 + 300
    expect(rows[0].spendeCents).toBe(0); // erhalten 750 < 800 → offen, keine Spende
    expect(rows[0].bezahlt).toBe(false);
    expect(rows[1].verzehrGesamtCents).toBe(150); // z2: nur Kaffee
    expect(rows[1].bezahlt).toBe(false); // erhalten NULL (=0) < 150
  });

  it("should_preserveZeilenOrder_when_mapping", () => {
    const zeilen = [
      { id: "a", erhaltenCents: null },
      { id: "b", erhaltenCents: null },
    ];
    const positionen = [{ zeileId: "b", menge: 1, priceCents: 100, category: "getraenk" as const }];

    const rows = kassierZeilen(zeilen, positionen);

    expect(rows[0].verzehrGesamtCents).toBe(0); // "a" hat keine Positionen
    expect(rows[1].getraenkeCents).toBe(100); // "b"
  });
});

describe("gesamtabrechnung", () => {
  it("should_computeKassenveraenderung_when_einnahmenMinusAusgaben", () => {
    const abrechnung = gesamtabrechnung(1400, 500);

    expect(abrechnung.einnahmenCents).toBe(1400);
    expect(abrechnung.ausgabenErstattetCents).toBe(500);
    expect(abrechnung.kassenveraenderungCents).toBe(900); // 1400 − 500
  });

  it("should_allowNegativeKassenveraenderung_when_ausgabenExceedEinnahmen", () => {
    const abrechnung = gesamtabrechnung(300, 800);

    expect(abrechnung.kassenveraenderungCents).toBe(-500);
  });
});
