import { describe, expect, it } from "vitest";
import { berichtModell, type BerichtPositionInput } from "./berichtModell";

// Reines, DB-freies Bericht-Modell (F9, #185, ADR-036 D6): SINGLE SOURCE für beide Format-Renderer
// (Excel/PDF). Nutzt die bestehenden reinen Summen-Funktionen – kein zweiter Wahrheitspfad.
// Beträge sind ganzzahlige Cent (ADR-021).

const veranstaltung = {
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-14"),
  kasse: "montagsrunde" as const,
  status: "abgeschlossen" as const,
};

const zeilen = [
  { id: "z1", anzeigename: "Anna", erhaltenCents: 1500 },
  { id: "z2", anzeigename: "Bert", erhaltenCents: 150 },
];

const positionen: BerichtPositionInput[] = [
  { zeileId: "z1", name: "Bier", size: "0,5l", menge: 2, priceCents: 250, category: "getraenk" },
  { zeileId: "z1", name: "Schnitzel", size: "", menge: 1, priceCents: 800, category: "essen" },
  { zeileId: "z2", name: "Kaffee", size: "", menge: 1, priceCents: 150, category: "kaffee" },
];

const auslagen = [
  {
    anzeigename: "Anna",
    kategorie: "getraenke" as const,
    betragCents: 300,
    status: "erstattet" as const,
  },
  {
    anzeigename: "Bert",
    kategorie: "sonstiges" as const,
    betragCents: 100,
    status: "offen" as const,
  },
];

describe("berichtModell – Kopf (AC11)", () => {
  it("should_containHeaderFields_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    expect(modell.kopf.bezeichnung).toBe("Montagsrunde Juli");
    expect(modell.kopf.datum).toBe("14.07.2026"); // de-DE, UTC
    expect(modell.kopf.kasse).toBe("Montagsrunde");
    expect(modell.kopf.status).toBe("abgeschlossen");
  });
});

describe("berichtModell – Teilnehmerzeilen mit Pro-Artikel-Strichen (AC4/AC5)", () => {
  it("should_listConsumedArticlesWithMengeAndZeilenbetrag_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    const anna = modell.teilnehmer[0];
    expect(anna.anzeigename).toBe("Anna");
    expect(anna.positionen).toHaveLength(2);
    const bier = anna.positionen.find((p) => p.name === "Bier");
    expect(bier).toEqual({
      name: "Bier",
      size: "0,5l",
      category: "getraenk",
      menge: 2,
      einzelpreisCents: 250,
      zeilenbetragCents: 500, // menge × eingefrorener Einzelpreis
    });
  });

  it("should_computeZeilenSummenWithoutAuslagen_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    const anna = modell.teilnehmer[0];
    // Verzehr-Gesamt = Σ Getränke + Σ Sonstige (Essen + Kaffee); Auslagen NICHT abgezogen (AC5).
    expect(anna.getraenkeCents).toBe(500);
    expect(anna.sonstigeCents).toBe(800); // nur Schnitzel (Essen), Anna hat keinen Kaffee
    expect(anna.verzehrGesamtCents).toBe(1300);
    expect(anna.erhaltenCents).toBe(1500);
    expect(anna.spendeCents).toBe(200); // 1500 − 1300, trotz erstatteter Auslage von 300
  });

  it("should_dropZeroMengeArticles_when_notConsumed", () => {
    const modell = berichtModell({
      veranstaltung,
      zeilen: [{ id: "z1", anzeigename: "Anna", erhaltenCents: null }],
      positionen: [
        {
          zeileId: "z1",
          name: "Bier",
          size: "0,5l",
          menge: 0,
          priceCents: 250,
          category: "getraenk",
        },
      ],
      auslagen: [],
    });

    expect(modell.teilnehmer[0].positionen).toHaveLength(0);
  });

  it("should_sortArticlesByCategoryThenName_when_built", () => {
    const modell = berichtModell({
      veranstaltung,
      zeilen: [{ id: "z1", anzeigename: "Anna", erhaltenCents: null }],
      positionen: [
        { zeileId: "z1", name: "Kaffee", size: "", menge: 1, priceCents: 150, category: "kaffee" },
        {
          zeileId: "z1",
          name: "Wasser",
          size: "",
          menge: 1,
          priceCents: 100,
          category: "getraenk",
        },
        { zeileId: "z1", name: "Cola", size: "", menge: 1, priceCents: 200, category: "getraenk" },
        { zeileId: "z1", name: "Suppe", size: "", menge: 1, priceCents: 300, category: "essen" },
      ],
      auslagen: [],
    });

    // Reihenfolge: getraenk (alphabetisch), essen, kaffee.
    expect(modell.teilnehmer[0].positionen.map((p) => p.name)).toEqual([
      "Cola",
      "Wasser",
      "Suppe",
      "Kaffee",
    ]);
  });
});

describe("berichtModell – Tagessummen (AC6)", () => {
  it("should_sumZeilenValues_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    expect(modell.tagessummen.getraenkeCents).toBe(500);
    expect(modell.tagessummen.sonstigeCents).toBe(950); // Schnitzel 800 + Kaffee 150
    expect(modell.tagessummen.verzehrGesamtCents).toBe(1450);
    expect(modell.tagessummen.erhaltenCents).toBe(1650);
    expect(modell.tagessummen.spendeCents).toBe(200);
  });
});

describe("berichtModell – Auslagen-Einzelnachweis (AC7)", () => {
  it("should_listEachAuslageSeparatelyWithLabels_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    expect(modell.auslagen).toHaveLength(2);
    expect(modell.auslagen[0]).toEqual({
      anzeigename: "Anna",
      kategorie: "Getränke",
      betragCents: 300,
      status: "erstattet",
    });
    expect(modell.auslagen[1]).toEqual({
      anzeigename: "Bert",
      kategorie: "Sonstiges",
      betragCents: 100,
      status: "offen zu erstatten",
    });
  });

  it("should_notIncludeAuslagenInTeilnehmerzeilen_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    // Annas erstattete Auslage (300) verändert weder Verzehr noch Spende (eigener Vorgang, F6).
    expect(modell.teilnehmer[0].verzehrGesamtCents).toBe(1300);
    expect(modell.teilnehmer[0].spendeCents).toBe(200);
  });
});

describe("berichtModell – Gesamtabrechnung (AC8/AC9)", () => {
  it("should_reportVerzehrUmsatzPerCategory_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    const g = modell.gesamtabrechnung;
    expect(g.verzehrGetraenkeCents).toBe(500);
    expect(g.verzehrEssenCents).toBe(800);
    expect(g.verzehrKaffeeCents).toBe(150);
    expect(g.spendeCents).toBe(200);
    expect(g.einnahmenCents).toBe(1650);
  });

  it("should_reportAuslagenerstattungPerCategoryAndTotal_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    // Nur erstattete Beträge; die offene Sonstiges-Auslage (100) zählt NICHT.
    expect(modell.gesamtabrechnung.auslagenErstattung).toEqual({
      getraenkeCents: 300,
      essenCents: 0,
      sonstigesCents: 0,
      gesamtCents: 300,
    });
  });

  it("should_computeKassenveraenderung_when_built", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    // Σ Erhalten − Σ Auslagenerstattungen (erstattet) = 1650 − 300.
    expect(modell.gesamtabrechnung.kassenveraenderungCents).toBe(1350);
  });

  it("should_satisfyEinnahmenConsistency_when_closed", () => {
    const modell = berichtModell({ veranstaltung, zeilen, positionen, auslagen });

    // AC9: Σ Getränke + Σ Essen + Σ Kaffee + Σ Spende = Σ Erhalten.
    const g = modell.gesamtabrechnung;
    expect(
      g.verzehrGetraenkeCents + g.verzehrEssenCents + g.verzehrKaffeeCents + g.spendeCents,
    ).toBe(g.einnahmenCents);
  });
});

describe("berichtModell – leere Veranstaltung (AC13)", () => {
  it("should_buildReportWithNullSums_when_noParticipants", () => {
    const modell = berichtModell({
      veranstaltung,
      zeilen: [],
      positionen: [],
      auslagen: [],
    });

    expect(modell.kopf.bezeichnung).toBe("Montagsrunde Juli");
    expect(modell.teilnehmer).toEqual([]);
    expect(modell.auslagen).toEqual([]);
    expect(modell.tagessummen.verzehrGesamtCents).toBe(0);
    expect(modell.tagessummen.erhaltenCents).toBe(0);
    expect(modell.gesamtabrechnung.einnahmenCents).toBe(0);
    expect(modell.gesamtabrechnung.kassenveraenderungCents).toBe(0);
  });
});
