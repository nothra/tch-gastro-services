import { z } from "zod";
import { KASSEN } from "@/db/schema";

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
