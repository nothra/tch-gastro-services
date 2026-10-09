// Was das Löschen einer Veranstaltung sperrt (#352 AK5/AK6/AK12, spec-372 AK9, ADR-058 D3). Die
// Detailseite zeigt die Gründe schon beim Öffnen des Dialogs, die Action lehnt mit denselben
// Gründen ab – eine Quelle für beide, sonst laufen Hinweis und Gate auseinander. Die Entscheidung
// bleibt beim Server: die Seite kennt nur den Stand beim Laden.

export type LoeschSperre = "verzehr" | "kassiert" | "auslage";

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
 * Alle zutreffenden Sperren in der festen Reihenfolge Verzehr → Kassiert → Auslage (Q5).
 * Verzehr zählt nur mit `menge > 0`: eine hoch- und wieder runtergezählte Position bleibt als
 * Zeile stehen (#346 AK4). Kassiert ist jede Zeile mit `erhaltenCents !== null`, auch 0 €. Eine
 * Auslage sperrt unabhängig vom Status – `removeAuslage` ist ein echtes DELETE (ADR-028 D2).
 */
export function loeschSperren({
  zeilen,
  positionen,
  auslagen,
}: LoeschSperrenQuellen): LoeschSperre[] {
  const sperren: LoeschSperre[] = [];
  if (positionen.some((position) => position.menge > 0)) sperren.push("verzehr");
  if (zeilen.some((zeile) => zeile.erhaltenCents !== null)) sperren.push("kassiert");
  if (auslagen.length > 0) sperren.push("auslage");
  return sperren;
}

/** Ablehnung der Action für eine Sperre (Glossar: „<Aktion> nicht möglich: <Grund>."). */
export function loeschSperreMeldung(sperre: LoeschSperre): string {
  return `Löschen nicht möglich: für diese Veranstaltung ist ${SPERRGRUND[sperre]}.`;
}

/** Ein Satz, der alle Sperren nennt – für den Dialog, der statt der Bestätigung erscheint. */
export function loeschSperrenBeschreibung(
  bezeichnung: string,
  sperren: readonly LoeschSperre[],
): string {
  const gruende = sperren.map((sperre) => SPERRGRUND[sperre]);
  const letzter = gruende.pop();
  const aufzaehlung = gruende.length > 0 ? `${gruende.join(", ")} und ${letzter}` : letzter;
  return `Für „${bezeichnung}“ ist ${aufzaehlung}.`;
}
