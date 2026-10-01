import { z } from "zod";
import { teilnehmerTyp } from "@/db/schema";

// Zod-Grenze für Teilnehmer-Eingaben (Server Actions). Validiert die rohe Nutzer-Eingabe.
// `name` wird getrimmt und darf nicht leer sein (spec-50, AK4). `mitglied` kommt aus einer
// Checkbox: gesetzt → "on", nicht gesetzt → Feld fehlt (undefined) → false. Alle Meldungen
// sind für Konsumenten, nicht für Entwickler.
// Exportiert, damit Eingabefelder ihr `maxLength` aus derselben Grenze beziehen (#369 „Neuer Gast").
export const TEILNEHMER_NAME_MAX = 200;

export const teilnehmerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Anzeigename ist erforderlich.")
    .max(TEILNEHMER_NAME_MAX, "Anzeigename ist zu lang."),
  typ: z.enum(teilnehmerTyp.enumValues, {
    error: "Typ muss Person oder Familie sein.",
  }),
  mitglied: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
});

export type TeilnehmerInput = z.infer<typeof teilnehmerSchema>;
