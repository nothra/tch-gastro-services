import { z } from "zod";
import { KASSEN, auslageKategorie, auslageStatus } from "@/db/schema";
import { EURO_INPUT_RE, parseEuroToCents } from "@/lib/money";

// Zod-Grenze für das Anlegen einer datierten Veranstaltung (Server Action, ADR-023 D6).
// `datum` ist Pflicht (Datum ist erstklassiges Pflichtfeld, spec-51) und kommt aus einem
// <input type="date"> als "YYYY-MM-DD"; es wird zu einem Date transformiert. `kasse` wird
// gegen die kanonische KASSEN-Konstante geprüft (fail-closed). Kein Essenpreis-Feld – Essen
// ist ein Katalogartikel (ADR-023 D4). Alle Meldungen sind für Konsumenten, nicht Entwickler.
export const veranstaltungSchema = z.object({
  bezeichnung: z
    .string()
    .trim()
    .min(1, "Bezeichnung ist erforderlich.")
    .max(200, "Bezeichnung ist zu lang."),
  datum: z
    .string()
    .trim()
    .min(1, "Datum ist erforderlich.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Datum ist ungültig.")
    .transform((value) => new Date(value)),
  kasse: z.enum(KASSEN, { error: "Bitte eine gültige Kasse wählen." }),
});

export type VeranstaltungInput = z.infer<typeof veranstaltungSchema>;

// Zod-Grenze für die Verzehr-Erfassung (F5, ADR-025 D6). Der Client sendet ein Delta (±1),
// nie ein absolutes `menge` – das ist die Konvention gegen Lost Update (ADR-025 D3), die die
// Action fail-closed erzwingt: Werte außer +1/−1 werden abgelehnt. Meldungen sind für
// Konsumenten. Die veranstaltungId ist KEIN Feld hier – sie ist ein serverseitig gebundenes,
// vertrauenswürdiges Argument der Action (route-neutral, ADR-025 D5).
export const verzehrAdjustSchema = z.object({
  zeileId: z.string().trim().min(1, "Keine Teilnehmerzeile angegeben."),
  catalogItemId: z.string().trim().min(1, "Kein Artikel angegeben."),
  delta: z.coerce
    .number()
    .int()
    .refine((value) => value === 1 || value === -1, "Änderung muss +1 oder −1 sein."),
});

export type VerzehrAdjustInput = z.infer<typeof verzehrAdjustSchema>;

// Zod-Grenze für die Auslagenerstattung (F6, #53, ADR-028 D5). `betrag` durchläuft denselben
// Money-Seam wie der Katalogpreis, aber mit strikt positivem Betrag (> 0, nicht ≥ 0) und
// derselben int4-Obergrenze (Codify #49). `zweck` ist eine optionale Notiz mit Obergrenze
// (Codify #50), leer wird zu `null` normalisiert (kein Unterschied zwischen "" und fehlend).
export const auslageSchema = z.object({
  teilnehmerId: z.string().trim().min(1, "Teilnehmer ist erforderlich."),
  kategorie: z.enum(auslageKategorie.enumValues, {
    error: "Kategorie muss Getränke, Essen oder Sonstiges sein.",
  }),
  betrag: z
    .string()
    .trim()
    .regex(EURO_INPUT_RE, "Bitte einen gültigen Betrag mit höchstens 2 Nachkommastellen eingeben.")
    .transform(parseEuroToCents)
    .refine((cents) => cents > 0, "Betrag muss größer als 0 sein.")
    .refine((cents) => cents <= 2_147_483_647, "Betrag ist zu hoch."),
  zweck: z
    .string()
    .trim()
    .max(200, "Notiz ist zu lang.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type AuslageInput = z.infer<typeof auslageSchema>;

// Rücknahme (`erstattet` → `offen`) läuft über dasselbe Schema wie die Bestätigung
// (`offen` → `erstattet`, ADR-028 D3) – ein Weg, beide Richtungen.
export const auslageStatusSchema = z.object({
  status: z.enum(auslageStatus.enumValues, { error: "Ungültiger Status." }),
});

export type AuslageStatusInput = z.infer<typeof auslageStatusSchema>;
