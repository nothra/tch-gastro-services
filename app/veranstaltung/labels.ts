import type { AuslageKategorie, AuslageStatus, Kasse, VeranstaltungStatus } from "@/db/schema";

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

// Anzeige-Labels der Auslagen-Kategorien (eigene Wertmenge, ADR-028 – „Sonstiges" gibt es
// nur hier, „Kaffee" nicht).
export const AUSLAGE_KATEGORIE_LABEL: Record<AuslageKategorie, string> = {
  getraenke: "Getränke",
  essen: "Essen",
  sonstiges: "Sonstiges",
};

// Kanonische Anzeigereihenfolge der Kategorien (Übersicht + Erfassungsformular) – eine Quelle,
// damit Summen und Auswahl dieselbe Ordnung teilen.
export const AUSLAGE_KATEGORIE_ORDER: readonly AuslageKategorie[] = ["getraenke", "essen", "sonstiges"];

// Anzeige-Labels des Auslagen-Status (Ubiquitous Language, ADR-028 D3).
export const AUSLAGE_STATUS_LABEL: Record<AuslageStatus, string> = {
  offen: "offen zu erstatten",
  erstattet: "erstattet",
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
