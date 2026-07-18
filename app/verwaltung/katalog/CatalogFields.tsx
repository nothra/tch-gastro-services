import type { CatalogItem } from "@/db/schema";
import { CATEGORY_LABEL } from "@/app/_verzehr/category-labels";

// Re-export für bestehende Konsumenten in der Verwaltungs-UI (CatalogRow u. a.).
export { CATEGORY_LABEL };

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// Gemeinsame Eingabefelder für Anlegen und Bearbeiten (kein Copy-Paste zwischen den
// beiden Formularen). Preis wird als EUR-Dezimalzahl vorbelegt; die Server-Grenze
// (Zod + lib/money) rechnet ihn wieder in Cent (ADR-021).
export function CatalogFields({ item }: { item?: CatalogItem }) {
  const priceValue = item ? (item.priceCents / 100).toFixed(2).replace(".", ",") : "";
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Bezeichnung
        <input name="name" required defaultValue={item?.name ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Größe (optional)
        <input
          name="size"
          placeholder="z. B. 0,5 l"
          defaultValue={item?.size ?? ""}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Preis (EUR)
        <input
          name="priceCents"
          required
          inputMode="decimal"
          placeholder="z. B. 2,10"
          defaultValue={priceValue}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Kategorie
        <select name="category" defaultValue={item?.category ?? "getraenk"} className={inputClass}>
          {(Object.entries(CATEGORY_LABEL) as [CatalogItem["category"], string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sortierung
        <input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={item?.sortOrder ?? 0}
          className={`${inputClass} w-24`}
        />
      </label>
    </div>
  );
}
