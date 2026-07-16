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
