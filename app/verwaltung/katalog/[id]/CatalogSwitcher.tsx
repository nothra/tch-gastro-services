"use client";

import { useRouter } from "next/navigation";
import type { Catalog } from "@/db/schema";

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
      <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Katalog wählen
      </legend>
      <div className="flex flex-col gap-2">
        {allCatalogs.map((cat) => (
          <label key={cat.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="catalog"
              value={cat.id}
              checked={currentId === cat.id}
              onChange={() => {
                router.push(`/verwaltung/katalog/${cat.id}`);
              }}
              className="cursor-pointer"
            />
            <span className={cat.active ? "" : "text-zinc-500 dark:text-zinc-400"}>
              {cat.name}
            </span>
            {!cat.active && (
              <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">(inaktiv)</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
