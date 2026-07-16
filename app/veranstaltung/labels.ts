import type { Kasse, VeranstaltungStatus } from "@/db/schema";

// Kanonische Anzeige-Labels für die Veranstalter-UI. Die Schlüssel sind die stabilen Text-Keys
// bzw. Enum-Werte (ADR-023); hier wird nur die Darstellung übersetzt.
export const KASSE_LABEL: Record<Kasse, string> = {
  montagsrunde: "Montagsrunde",
  vereinskasse: "Vereinskasse",
};

export const STATUS_LABEL: Record<VeranstaltungStatus, string> = {
  offen: "offen",
  abgeschlossen: "abgeschlossen",
};

// `datum` ist date-only (UTC-Mitternacht, ADR-023). In UTC formatieren, damit die lokale
// Zeitzone den Tag nicht verschiebt.
export function formatDatum(datum: Date | null): string {
  if (!datum) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(datum);
}
