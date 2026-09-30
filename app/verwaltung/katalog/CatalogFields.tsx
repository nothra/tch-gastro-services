import type { CatalogItem } from "@/db/schema";
import { CATEGORY_LABEL } from "@/app/_verzehr/category-labels";
import { Field, SelectField } from "@/app/components/ui/Field";

// Re-export für bestehende Konsumenten in der Verwaltungs-UI (CatalogRow u. a.).
export { CATEGORY_LABEL };

// Gemeinsame Eingabefelder für Anlegen und Bearbeiten (kein Copy-Paste zwischen den
// beiden Formularen). Preis wird als EUR-Dezimalzahl vorbelegt; die Server-Grenze
// (Zod + lib/money) rechnet ihn wieder in Cent (ADR-021).
export function CatalogFields({ item }: { item?: CatalogItem }) {
  const priceValue = item ? (item.priceCents / 100).toFixed(2).replace(".", ",") : "";
  return (
    // Zwei Spalten: bei 375 px stehen je zwei kurze Felder nebeneinander, ohne dass ein
    // Feld aus dem Bild läuft (spec AK5.3).
    <div className="grid grid-cols-2 gap-3">
      <Field
        label="Bezeichnung"
        name="name"
        required
        defaultValue={item?.name ?? ""}
        className="col-span-2"
      />
      <SelectField
        label="Kategorie"
        name="category"
        defaultValue={item?.category ?? "getraenk"}
        className="col-span-2"
      >
        {(Object.entries(CATEGORY_LABEL) as [CatalogItem["category"], string][]).map(
          ([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ),
        )}
      </SelectField>
      <Field
        label="Größe (optional)"
        name="size"
        placeholder="z. B. 0,5 l"
        defaultValue={item?.size ?? ""}
      />
      <Field
        label="Preis (EUR)"
        name="priceCents"
        required
        inputMode="decimal"
        placeholder="z. B. 2,10"
        defaultValue={priceValue}
      />
      <Field
        label="Sortierung"
        name="sortOrder"
        type="number"
        min={0}
        defaultValue={item?.sortOrder ?? 0}
      />
    </div>
  );
}
