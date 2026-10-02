import { zeileSummen, type VerzehrPositionSum } from "@/app/_verzehr/summen";

// Reine, DB-freie Kassier-Summen-/Status-Logik (F8, #55, ADR-033 D5). Bewusst ohne Drizzle/DOM,
// damit sie zu 100 % unit-testbar ist und als SINGLE SOURCE sowohl die Anzeige als auch das
// Abschluss-Gate (Anzahl offener Zeilen) speist – kein doppelter Wahrheitspfad. Beträge sind
// ganzzahlige Cent (ADR-021) → Summen sind exakt ganzzahlig, keine Rundung nötig; die
// 2-Nachkommastellen-Anzeige übernimmt `formatCents` (de-DE).

// Verzehr-Kategorie-Summen einer Zeile (aus `zeileSummen`, ADR-027) plus der bar kassierte
// Betrag. `erhaltenCents = null` bedeutet „noch nicht kassiert" – für die Ableitung gleichwertig
// zu 0 (ADR-033 D1), die UI kann „—" vs. „0,00 €" unterscheiden.
export type KassierZeileInput = {
  getraenkeCents: number;
  essenCents: number;
  kaffeeCents: number;
  erhaltenCents: number | null;
};

export type KassierZeile = {
  getraenkeCents: number;
  essenCents: number; // getrennt für den Abschlussbericht-Verzehr je Kategorie (ADR-036 D7)
  kaffeeCents: number; // getrennt für den Abschlussbericht-Verzehr je Kategorie (ADR-036 D7)
  sonstigeCents: number; // Essen + Kaffee (Kassier-Anzeige)
  verzehrGesamtCents: number;
  erhaltenCents: number | null;
  bezahlt: boolean;
  spendeCents: number;
};

// Die Spenden-Formel `max(0, (erhalten ?? 0) − verzehrGesamt)` als eigene Funktion, damit die
// Live-Vorschau im Kassier-Formular (Client) dieselbe Regel nutzt wie Anzeige und Bericht – eine
// nachgebaute Client-Formel könnte lautlos divergieren (ADR-055 D1).
export function spendeCents(verzehrGesamtCents: number, erhaltenCents: number | null): number {
  return Math.max(0, (erhaltenCents ?? 0) - verzehrGesamtCents);
}

// Zeilen-Status und Spende sind vollständig abgeleitet (ADR-033 D1), nicht gespeichert:
// `bezahlt ⇔ (erhalten ?? 0) ≥ verzehrGesamt` (Null-Verzehr ⇒ 0 ≥ 0 ⇒ bezahlt auch ohne Erhalten).
// Verzehr-Gesamt ist brutto – Auslagen mindern ihn NICHT (eigener Vorgang, F6).
export function kassierZeile(input: KassierZeileInput): KassierZeile {
  const sonstigeCents = input.essenCents + input.kaffeeCents;
  const verzehrGesamtCents = input.getraenkeCents + sonstigeCents;
  return {
    getraenkeCents: input.getraenkeCents,
    essenCents: input.essenCents,
    kaffeeCents: input.kaffeeCents,
    sonstigeCents,
    verzehrGesamtCents,
    erhaltenCents: input.erhaltenCents,
    bezahlt: (input.erhaltenCents ?? 0) >= verzehrGesamtCents,
    spendeCents: spendeCents(verzehrGesamtCents, input.erhaltenCents),
  };
}

// Die zum Kassieren nötigen Zeilen-Identitätsdaten (aus `listZeilen`, F8) und die
// Verzehr-Positionen (aus `listPositionen`, F5, mit aufgelöstem Preis via COALESCE, ADR-033 D2).
export type KassierZeileErhalten = { id: string; erhaltenCents: number | null };
export type KassierZeilePosition = VerzehrPositionSum & { zeileId: string };

// Baut je Teilnehmerzeile eine `KassierZeile` – gruppiert die Positionen nach Zeile und leitet
// über `zeileSummen` (ADR-027) die Kategorie-Summen ab. SINGLE SOURCE der Zeilenberechnung für die
// Kassier-Anzeige UND das Abschluss-Gate (über `kassierTagessummen(...).offeneZeilen`), damit
// beide Wege nie auseinanderlaufen. Die Reihenfolge entspricht `zeilen` (map-stabil) – die
// Kassier-Seite kann das Ergebnis positionsweise mit ihren Zeilen zippen.
export function kassierZeilen(
  zeilen: readonly KassierZeileErhalten[],
  positionen: readonly KassierZeilePosition[],
): KassierZeile[] {
  const positionenJeZeile = new Map<string, VerzehrPositionSum[]>();
  for (const position of positionen) {
    const liste = positionenJeZeile.get(position.zeileId) ?? [];
    liste.push(position);
    positionenJeZeile.set(position.zeileId, liste);
  }
  return zeilen.map((zeile) => {
    const summen = zeileSummen(positionenJeZeile.get(zeile.id) ?? []);
    return kassierZeile({
      getraenkeCents: summen.getraenkeCents,
      essenCents: summen.essenCents,
      kaffeeCents: summen.kaffeeCents,
      erhaltenCents: zeile.erhaltenCents,
    });
  });
}

export type KassierTagessummen = {
  getraenkeCents: number;
  essenCents: number; // getrennter Tages-Verzehr-Umsatz je Kategorie (ADR-036 D7)
  kaffeeCents: number; // getrennter Tages-Verzehr-Umsatz je Kategorie (ADR-036 D7)
  sonstigeCents: number;
  verzehrGesamtCents: number;
  erhaltenCents: number;
  spendeCents: number;
  offeneZeilen: number;
  offenerBetragCents: number;
};

// Tagessummen über alle Zeilen (Spec-AC „Tagessummen") plus die Anzahl offener Zeilen, die das
// Abschluss-Gate (ADR-033 D3) nutzt: `offeneZeilen === 0` ⇔ abschließbar. Der offene Betrag
// (spec-371 AK2) zählt nur den Rest der offenen Zeilen – bezahlte Zeilen tragen 0 bei, eine
// Überzahlung (Spende) mindert ihn also nicht.
export function kassierTagessummen(zeilen: readonly KassierZeile[]): KassierTagessummen {
  const summen: KassierTagessummen = {
    getraenkeCents: 0,
    essenCents: 0,
    kaffeeCents: 0,
    sonstigeCents: 0,
    verzehrGesamtCents: 0,
    erhaltenCents: 0,
    spendeCents: 0,
    offeneZeilen: 0,
    offenerBetragCents: 0,
  };
  for (const zeile of zeilen) {
    summen.getraenkeCents += zeile.getraenkeCents;
    summen.essenCents += zeile.essenCents;
    summen.kaffeeCents += zeile.kaffeeCents;
    summen.sonstigeCents += zeile.sonstigeCents;
    summen.verzehrGesamtCents += zeile.verzehrGesamtCents;
    summen.erhaltenCents += zeile.erhaltenCents ?? 0;
    summen.spendeCents += zeile.spendeCents;
    if (!zeile.bezahlt) {
      summen.offeneZeilen += 1;
      summen.offenerBetragCents += zeile.verzehrGesamtCents - (zeile.erhaltenCents ?? 0);
    }
  }
  return summen;
}

export type Gesamtabrechnung = {
  einnahmenCents: number; // Σ Erhalten
  ausgabenErstattetCents: number; // Σ Auslagenerstattungen (erstattet), F6
  kassenveraenderungCents: number; // Einnahmen − Ausgaben
};

// Veranstaltungs-Gesamtabrechnung je zugeordneter Kasse (Spec-AC): stellt die Einnahmen (Σ Erhalten)
// den Ausgaben (Σ erstattete Auslagen, ADR-028 D6) gegenüber. Kassieren bleibt je Teilnehmer brutto –
// KEINE Netto-Verrechnung mit Auslagen (Spec). Die Kassenveränderung darf negativ werden (Auslagen
// übersteigen die Einnahmen).
export function gesamtabrechnung(
  erhaltenSummeCents: number,
  auslagenErstattetCents: number,
): Gesamtabrechnung {
  return {
    einnahmenCents: erhaltenSummeCents,
    ausgabenErstattetCents: auslagenErstattetCents,
    kassenveraenderungCents: erhaltenSummeCents - auslagenErstattetCents,
  };
}
