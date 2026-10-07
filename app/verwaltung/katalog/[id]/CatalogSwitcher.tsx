"use client";

import { useRouter } from "next/navigation";
import type { Catalog } from "@/db/schema";
import { SelectField } from "@/app/components/ui/Field";

interface CatalogSwitcherProps {
  currentId: string;
  allCatalogs: Catalog[];
}

// Katalogwahl als Auswahlliste (spec-373 AK5, vorher Radiobutton-Gruppe aus #345): alle Kataloge
// (aktiv + inaktiv), die Wahl führt zu `/verwaltung/katalog/[id]` und lädt dessen Artikel.
// Inaktive Kataloge sind gekennzeichnet, bleiben aber auswählbar und editierbar (#345 AK4).
export function CatalogSwitcher({ currentId, allCatalogs }: CatalogSwitcherProps) {
  const router = useRouter();

  return (
    <SelectField
      label="Katalog"
      value={currentId}
      onChange={(event) => router.push(`/verwaltung/katalog/${event.target.value}`)}
    >
      {allCatalogs.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.active ? cat.name : `${cat.name} (inaktiv)`}
        </option>
      ))}
    </SelectField>
  );
}
