import { redirect } from "next/navigation";
import { STANDARD_CATALOG_ID } from "@/db/catalog";

// Katalog-Übersicht (#345): Umleitung auf den Standard-Katalog. Die echte Pflege-Seite
// sitzt unter /verwaltung/katalog/[id] – der Katalog-Umschalter wird dort steuern,
// welcher Katalog gerade gepflegt wird (statt searchParams, ADR-050 D5).
export default async function CatalogListPage() {
  redirect(`/verwaltung/katalog/${STANDARD_CATALOG_ID}`);
}
