import type { CatalogCategory } from "@/db/schema";

// Route-neutrale Kategorie-Labels: von der Erfassungs-UI (_verzehr/) und der Verwaltungs-UI
// (verwaltung/katalog/) genutzt, damit kein Feature-Modul in das andere importiert (ADR-025 D5).
export const CATEGORY_LABEL: Record<CatalogCategory, string> = {
  getraenk: "Getränk",
  kaffee: "Kaffee",
  essen: "Essen",
};
