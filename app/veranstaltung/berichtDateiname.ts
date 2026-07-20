// Reine, getestete Ableitung des Download-Dateinamens für den Abschlussbericht (F9, #185,
// ADR-036 D9). Nur für den `Content-Disposition`-`filename` verwendet – keine Persistenz.

export type BerichtFormat = "xlsx" | "pdf";

const SLUG_MAX_LENGTH = 60;

// Deutsche Umlaute/ß werden transliteriert (ä→ae …), alles andere außerhalb [a-z0-9] wird zu "-".
const UMLAUT_TRANSLIT: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

// Leitet aus der Bezeichnung einen URL-/Dateisystem-freundlichen Slug ab: lowercase, Umlaute
// transliteriert, alles außerhalb [a-z0-9] zu "-", Mehrfach-"-" zusammengefasst, an den Rändern
// getrimmt und auf `SLUG_MAX_LENGTH` gekürzt (danach erneut rechts getrimmt, falls der Schnitt in
// einen "-" fiel). Ohne verwertbare Zeichen → leerer String (der Aufrufer lässt den Slug dann weg).
export function berichtSlug(bezeichnung: string): string {
  return bezeichnung
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => UMLAUT_TRANSLIT[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

// `datum` ist date-only (UTC-Mitternacht, ADR-023) → die ISO-Darstellung (UTC) ergibt stabil
// YYYY-MM-DD, unabhängig von der lokalen Zeitzone.
function isoDatum(datum: Date): string {
  return datum.toISOString().slice(0, 10);
}

// Baut `abschlussbericht-<YYYY-MM-DD>-<slug>.<ext>`. Fehlt das Datum oder ergibt die Bezeichnung
// keinen Slug, entfällt das jeweilige Segment (kein doppelter/hängender Bindestrich).
export function berichtDateiname(
  datum: Date | null,
  bezeichnung: string,
  format: BerichtFormat,
): string {
  const segmente = ["abschlussbericht", datum ? isoDatum(datum) : "", berichtSlug(bezeichnung)];
  return `${segmente.filter(Boolean).join("-")}.${format}`;
}
