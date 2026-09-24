import { z } from "zod";
import { KASSEN, auslageKategorie, auslageStatus } from "@/db/schema";
import { EURO_INPUT_RE, INT4_MAX, parseEuroToCents } from "@/lib/money";

// Die Katalogwahl als geteiltes Feld von Anlage und Wechsel (#346): beide Wege nehmen dieselbe
// Eingabe entgegen und müssen dieselbe Meldung liefern – zwei Kopien würden lautlos divergieren.
// Die Meldung steht doppelt (Typ-Ebene + `min`), weil die beiden Wege das Feld unterschiedlich
// verfehlen können: der Wechsel normalisiert fehlend zu "" (→ `min`), die Anlage reicht
// `Object.fromEntries` durch und liefert bei fehlendem Feld `undefined` (→ Typ-Ebene). Ohne die
// Typ-Meldung träte dort Zods Entwickler-Text nach außen.
const katalogWahl = {
  catalogId: z
    .string({ error: "Bitte einen Katalog wählen." })
    .trim()
    .min(1, "Bitte einen Katalog wählen."),
};

// Die Metadaten einer datierten Veranstaltung als geteilte Feldgruppe von Anlage und Bearbeiten
// (#352): beide Wege nehmen dieselben drei Eingaben entgegen und müssen dieselben Meldungen
// liefern – zwei Kopien würden lautlos divergieren (dieselbe Begründung wie `katalogWahl` oben).
// `datum` ist Pflicht (Datum ist erstklassiges Pflichtfeld, spec-51) und kommt aus einem
// <input type="date"> als "YYYY-MM-DD"; es wird zu einem Date transformiert. `kasse` wird
// gegen die kanonische KASSEN-Konstante geprüft (fail-closed). Kein Essenpreis-Feld – Essen
// ist ein Katalogartikel (ADR-023 D4). Alle Meldungen sind für Konsumenten, nicht Entwickler.
const veranstaltungStammdaten = {
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
};

// Zod-Grenze für das Anlegen einer datierten Veranstaltung (Server Action, ADR-023 D6).
// `catalogId` (#346) ist hier bewusst nur auf Nicht-Leere geprüft: ob die Id existiert UND zu
// einem aktiven Katalog gehört, ist ein Datenbank-Fakt und gehört in die Action (FS1), nicht in
// eine synchrone Zod-Regel.
export const veranstaltungSchema = z.object({
  ...veranstaltungStammdaten,
  ...katalogWahl,
});

export type VeranstaltungInput = z.infer<typeof veranstaltungSchema>;

// Zod-Grenze für das Bearbeiten der Metadaten einer bereits angelegten Veranstaltung (#352 AK1/
// AK2). Teilt sich die Feldregeln mit der Anlage (oben) – dieselben Pflichtfeld-Regeln, dieselben
// Meldungen. Bewusst OHNE `catalogId`: der Katalogwechsel bleibt der eigene Weg aus #346 mit
// seiner eigenen Verzehr-Sperre (AK4), die ein mitgeändertes Feld hier umgehen würde. Die `id`
// der Veranstaltung ist ebenfalls kein Feld – sie wird in der Action direkt aus FormData gelesen
// (wie bei `setStatusAction`), weil sie nur auf Anwesenheit geprüft und nicht transformiert wird.
export const veranstaltungMetaSchema = z.object(veranstaltungStammdaten);

export type VeranstaltungMetaInput = z.infer<typeof veranstaltungMetaSchema>;

// Zod-Grenze für den Katalogwechsel einer bereits offenen Veranstaltung (#346 AK3). Teilt sich
// die Feldregel mit der Anlage (oben) – dieselbe Eingabe, dieselbe Meldung. Die `id` der
// Veranstaltung ist KEIN Feld hier: sie wird in der Action direkt aus FormData gelesen, wie bei
// `setStatusAction`, weil sie nur auf Anwesenheit geprüft und nicht transformiert wird.
export const katalogWechselSchema = z.object(katalogWahl);

export type KatalogWechselInput = z.infer<typeof katalogWechselSchema>;

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
    .refine((cents) => cents <= INT4_MAX, "Betrag ist zu hoch."),
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

// Zod-Grenze für das Kassieren (F8, #55, ADR-033 D6). `erhalten` durchläuft den Money-Seam
// (`parseEuroToCents`) wie Katalogpreis/Auslage, mit int4-Obergrenze (Codify #49). Anders als bei
// der Auslage ist `0` gültig (jemand zahlt nichts), und leer wird zu `null` normalisiert = „noch
// nicht kassiert" (ADR-033 D1). Der EURO_INPUT_RE lässt keine negativen Werte zu (Fehlerszenario
// „Betrag ≥ 0"); die DB-CHECK sichert es zusätzlich fail-closed ab.
export const kassiereSchema = z.object({
  erhalten: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || EURO_INPUT_RE.test(value),
      "Bitte einen gültigen Betrag mit höchstens 2 Nachkommastellen eingeben.",
    )
    .transform((value) => (value === "" ? null : parseEuroToCents(value)))
    .refine((cents) => cents === null || cents <= INT4_MAX, "Betrag ist zu hoch."),
});

export type KassiereInput = z.infer<typeof kassiereSchema>;
