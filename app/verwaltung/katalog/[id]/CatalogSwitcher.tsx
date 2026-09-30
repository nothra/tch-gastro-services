"use client";

import { useRouter } from "next/navigation";
import type { Catalog } from "@/db/schema";
import { Badge } from "@/app/components/ui/Badge";

interface CatalogSwitcherProps {
  currentId: string;
  allCatalogs: Catalog[];
}

// Katalog-Umschalter für #345: Radio-Button-Gruppe zeigt alle Kataloge (aktiv + inaktiv),
// Klick auf einen führt zu `/verwaltung/katalog/[id]` und lädt dessen Artikel.
// Inaktive Kataloge sind optisch gekennzeichnet, bleiben aber auswählbar und editierbar (AK4).
export function CatalogSwitcher({ currentId, allCatalogs }: CatalogSwitcherProps) {
  const router = useRouter();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">Katalog wählen</legend>
      <div className="flex flex-col gap-2">
        {allCatalogs.map((cat) => (
          <label key={cat.id} className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="catalog"
              value={cat.id}
              checked={currentId === cat.id}
              onChange={() => {
                router.push(`/verwaltung/katalog/${cat.id}`);
              }}
              // `accent-accent`: die Utility `accent` (accent-color) auf das Token `accent`.
              className="accent-accent cursor-pointer"
            />
            <span className={cat.active ? "" : "text-muted"}>{cat.name}</span>
            {!cat.active && (
              <Badge tone="neutral" className="ml-auto">
                (inaktiv)
              </Badge>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
