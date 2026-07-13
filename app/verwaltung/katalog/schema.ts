import { z } from "zod";
import { EURO_INPUT_RE, parseEuroToCents } from "@/lib/money";
import { catalogCategory } from "@/db/schema";

// Zod-Grenze für Katalog-Eingaben (Server Actions). Validiert die rohe Nutzer-Eingabe
// und transformiert den Preis über den zentralen Money-Seam zu ganzzahligen Cent
// (ADR-021). `size` ist optional → "" (leer = "ohne Größe"). Alle Meldungen sind für
// Konsumenten, nicht für Entwickler.
export const catalogItemSchema = z.object({
  name: z.string().trim().min(1, "Bezeichnung ist erforderlich."),
  size: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? ""),
  priceCents: z
    .string()
    .trim()
    .regex(EURO_INPUT_RE, "Preis muss ein Betrag ≥ 0 mit höchstens 2 Nachkommastellen sein.")
    .transform(parseEuroToCents),
  category: z.enum(catalogCategory.enumValues, {
    error: "Kategorie muss Getränk oder Kaffee sein.",
  }),
  sortOrder: z.coerce
    .number()
    .int("Sortierung muss eine ganze Zahl sein.")
    .min(0, "Sortierung darf nicht negativ sein.")
    .default(0),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
