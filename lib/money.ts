// Zentraler Konvertierungs-Seam für Geldbeträge (ADR-021): Beträge werden überall
// als ganzzahlige Euro-Cent geführt und gerechnet. Nur hier wird zwischen der
// Nutzer-/Anzeige-Darstellung (EUR) und der internen Einheit (Cent) umgerechnet –
// so bleibt Parsing/Rundung/Formatierung an genau einer, testbaren Stelle.

// Gültige Roh-Eingabe: nicht-negativer EUR-Betrag mit höchstens zwei Nachkommastellen,
// Dezimaltrenner "," oder ".". Kein Vorzeichen, keine Tausendertrenner. Wird auch von
// der Zod-Grenze verwendet, damit Regel und Fehlermeldung an einem Ort definiert sind.
export const EURO_INPUT_RE = /^\d+([.,]\d{1,2})?$/;

// Obergrenze für jeden Cent-Betrag, der auf eine PostgreSQL-`int4`-Spalte mappt (Codify #49).
// Ohne diese Grenze wäre der DB-Overflow die einzige Fehlerrückmeldung an den Nutzer.
export const INT4_MAX = 2_147_483_647;

export function parseEuroToCents(input: string): number {
  const trimmed = input.trim();
  if (!EURO_INPUT_RE.test(trimmed)) {
    throw new RangeError(
      "Ungültiger Geldbetrag: erwartet ein Betrag ≥ 0 mit höchstens 2 Nachkommastellen.",
    );
  }
  const [euroPart, centPart = ""] = trimmed.replace(",", ".").split(".");
  return Number(euroPart) * 100 + Number(centPart.padEnd(2, "0"));
}

export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError("formatCents erwartet ganzzahlige Cent-Werte.");
  }
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const euros = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const eurosGrouped = euros.toLocaleString("de-DE");
  const centsPadded = String(remainder).padStart(2, "0");
  return `${negative ? "-" : ""}${eurosGrouped},${centsPadded} €`;
}

// Cent-Betrag als roher Eingabewert für ein <input> (Prefill beim Korrigieren): Komma als
// Dezimaltrenner, KEINE Tausendertrenner und KEIN €-Zeichen – so bleibt der Wert direkt
// re-parsebar durch `parseEuroToCents`/`EURO_INPUT_RE` (im Gegensatz zu `formatCents`).
export function centsToEuroInput(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError("centsToEuroInput erwartet ganzzahlige Cent-Werte.");
  }
  const euros = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${euros},${String(remainder).padStart(2, "0")}`;
}
