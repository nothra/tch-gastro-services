// Was das Löschen einer Veranstaltung sperrt (#352 AK5/AK6/AK12, spec-372 AK9, ADR-058 D3). Die
// Detailseite zeigt die Gründe schon beim Öffnen des Dialogs, die Action lehnt mit denselben
// Gründen ab – eine Quelle für beide, sonst laufen Hinweis und Gate auseinander. Die Entscheidung
// bleibt beim Server: die Seite kennt nur den Stand beim Laden.

export type LoeschSperre = "verzehr" | "kassiert" | "auslage";

/** Mindestens eine Sperre – nur dann gibt es einen Grund zu nennen. */
export type LoeschSperren = readonly [LoeschSperre, ...LoeschSperre[]];

export interface LoeschSperrenQuellen {
  zeilen: readonly { erhaltenCents: number | null }[];
  positionen: readonly { menge: number }[];
  auslagen: readonly unknown[];
}

const SPERRGRUND: Record<LoeschSperre, string> = {
  verzehr: "bereits Verzehr erfasst",
  kassiert: "bereits Geld kassiert",
  auslage: "bereits eine Auslage erstattet oder erfasst",
};

/**
 * Ist tatsächlich Verzehr erfasst? Zählt nur `menge > 0`: `verzehr_position` löscht seine Zeile bei
 * `menge = 0` nicht (Upsert mit `GREATEST(0, …)`, db/verzehr.ts), eine hoch- und wieder
 * runtergezählte Position ist also kein Verzehr (#346 AK4, #352 FS1). Dieselbe Regel sperrt den
 * Katalogwechsel und das Löschen.
 */
export function hatVerzehr(positionen: LoeschSperrenQuellen["positionen"]): boolean {
  return positionen.some((position) => position.menge > 0);
}

/**
 * Alle zutreffenden Sperren in der festen Reihenfolge Verzehr → Kassiert → Auslage (Q5).
 * Kassiert ist jede Zeile mit `erhaltenCents !== null`, auch 0 €. Eine Auslage sperrt unabhängig
 * vom Status – `removeAuslage` ist ein echtes DELETE (ADR-028 D2).
 */
export function loeschSperren({
  zeilen,
  positionen,
  auslagen,
}: LoeschSperrenQuellen): LoeschSperre[] {
  const sperren: LoeschSperre[] = [];
  if (hatVerzehr(positionen)) sperren.push("verzehr");
  if (zeilen.some((zeile) => zeile.erhaltenCents !== null)) sperren.push("kassiert");
  if (auslagen.length > 0) sperren.push("auslage");
  return sperren;
}

export function istGesperrt(sperren: readonly LoeschSperre[]): sperren is LoeschSperren {
  return sperren.length > 0;
}

/** Ablehnung der Action für eine Sperre (Glossar: „<Aktion> nicht möglich: <Grund>."). */
export function loeschSperreMeldung(sperre: LoeschSperre): string {
  return `Löschen nicht möglich: für diese Veranstaltung ist ${SPERRGRUND[sperre]}.`;
}

/** Ein Satz, der alle Sperren nennt – für den Dialog, der statt der Bestätigung erscheint. */
export function loeschSperrenBeschreibung(bezeichnung: string, sperren: LoeschSperren): string {
  const gruende = sperren.map((sperre) => SPERRGRUND[sperre]);
  const letzter = gruende[gruende.length - 1];
  const davor = gruende.slice(0, -1);
  const aufzaehlung = davor.length > 0 ? `${davor.join(", ")} und ${letzter}` : letzter;
  return `Für „${bezeichnung}“ ist ${aufzaehlung}.`;
}
