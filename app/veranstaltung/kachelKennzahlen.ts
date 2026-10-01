import { formatCents } from "@/lib/money";
import { auslagenSummen, type AuslageSumEntry } from "./auslagenSummen";
import {
  kassierTagessummen,
  kassierZeilen,
  type KassierZeileErhalten,
  type KassierZeilePosition,
} from "./kassierSummen";

// Reiner Adapter für die Kurzkennzahlen der Arbeitsschritt-Kacheln (ADR-053 D4, spec-369 AK4):
// er rechnet NICHTS selbst, sondern formt nur die Ergebnisse der bestehenden Summenmodule in
// Anzeigewerte – eine zweite Formel neben `kassierZeile` (ADR-033 D5) könnte lautlos divergieren.

export type KachelKennzahlenInput = {
  zeilen: readonly KassierZeileErhalten[];
  positionen: readonly KassierZeilePosition[];
  auslagen: readonly AuslageSumEntry[];
};

export type KachelKennzahlen = {
  verzehr: string;
  auslagen: string;
  kassieren: string;
};

export function kachelKennzahlen({
  zeilen,
  positionen,
  auslagen,
}: KachelKennzahlenInput): KachelKennzahlen {
  const tagessummen = kassierTagessummen(kassierZeilen(zeilen, positionen));
  // Die Auslagen-Seite führt offene und erstattete Beträge getrennt; die Kachel braucht eine
  // Zahl und nimmt die Summe beider (ADR-053 D4).
  const { gesamt } = auslagenSummen(auslagen);
  const bezahlt = zeilen.length - tagessummen.offeneZeilen;

  return {
    verzehr: formatCents(tagessummen.verzehrGesamtCents),
    auslagen: formatCents(gesamt.offenCents + gesamt.erstattetCents),
    kassieren: `${bezahlt} von ${zeilen.length} bezahlt`,
  };
}
