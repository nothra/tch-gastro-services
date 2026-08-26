// Trägermechanik des personenbezogenen Wechsels zwischen Verzehrerfassung und Kassieren (#308):
// EIN Suchparameter je Zielseite, der die gemeinte Teilnehmerzeile benennt. Als Query-Parameter
// ist der Personenbezug Teil des Aufrufs und übersteht damit ein Neuladen (spec-308 AK11) – anders
// als flüchtiger Komponentenzustand. Beide Href-Bauer und der Leser hängen an derselben Konstante,
// damit Hin- und Rückweg nicht auseinanderdriften. Aus demselben Grund liegt hier auch das
// Erscheinungsbild der beiden Wechsel-Links: Hin- und Rückweg sollen als EIN Bedienmuster
// auftreten, eine zweite Copy-Paste-Klassenkette würde genau daran vorbeidriften.

export const PERSONENBEZUG_PARAM = "zeile";

// Gemeinsames Erscheinungsbild der Wechsel-Links auf beiden Seiten (Hinweg „Kassieren →" in der
// Verzehrkarte, Rückweg „← Verzehr erfassen" in der Kassierzeile).
export const WECHSEL_LINK_CLASS =
  "self-start text-sm font-medium text-cyan-700 hover:underline dark:text-cyan-400";

// Suchparameter einer Seite, wie sie der App Router liefert (mehrfach übergebene Parameter als Array).
export type SeitenSuchparameter = Record<string, string | string[] | undefined>;

// Kassieransicht dieser Veranstaltung mit Personenbezug auf `zeileId` (Hinweg, AK1).
export function kassierenHref(veranstaltungId: string, zeileId: string): string {
  return mitPersonenbezug(`/veranstaltung/${veranstaltungId}/kassieren`, zeileId);
}

// Verzehrerfassung dieser Veranstaltung mit Personenbezug auf `zeileId` (Rückweg, AK5).
export function verzehrHref(veranstaltungId: string, zeileId: string): string {
  return mitPersonenbezug(`/veranstaltung/${veranstaltungId}/verzehr`, zeileId);
}

// Löst den Personenbezug eines Seitenaufrufs gegen die Zeilen DIESER Veranstaltung auf.
// Kein Zod-Schema: die einzige gültige Wertemenge sind die Zeilen-Ids der geladenen Veranstaltung –
// die Mengenprüfung ist strenger als jedes Formatschema. Alles andere (fehlend, mehrfach übergeben,
// unbekannt, aus einer fremden Veranstaltung) ergibt `null` und damit den Standardzustand der Seite:
// fail-soft ohne Fehlermeldung und ohne Aussage darüber, ob der Wert woanders existiert (F1).
export function personenbezogeneZeileId(
  suchparameter: SeitenSuchparameter,
  bekannteZeilenIds: readonly string[],
): string | null {
  const wert = suchparameter[PERSONENBEZUG_PARAM];
  if (typeof wert !== "string") return null;
  return bekannteZeilenIds.includes(wert) ? wert : null;
}

// URLSearchParams kodiert den Wert als Daten – eine Zeilen-Id kann die URL-Struktur nicht verändern.
function mitPersonenbezug(pfad: string, zeileId: string): string {
  return `${pfad}?${new URLSearchParams({ [PERSONENBEZUG_PARAM]: zeileId })}`;
}
