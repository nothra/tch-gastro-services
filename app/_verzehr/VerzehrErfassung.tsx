import { CATEGORY_LABEL } from "./category-labels";
import { formatCents } from "@/lib/money";
import type { CatalogCategory } from "@/db/schema";
import type { VerzehrPositionRow } from "@/db/verzehr";
import { zeileSummen } from "./summen";
import { MengeControl } from "./MengeControl";
import type { VerzehrFormAction } from "./types";

// Präsentationale, route-neutrale Erfassungs-UI (ADR-025 D5): kennt keine Auth/Session/Token,
// erhält Zeilen + Positionen + Katalog und die bereits scope-gebundene Server-Action als Prop.
// F7 (#54) reicht eine token-scoped Action und einen Katalog ohne Essen herein – ohne Umbau.

export type VerzehrZeile = { id: string; anzeigename: string };
export type VerzehrArtikel = {
  id: string;
  name: string;
  priceCents: number;
  category: CatalogCategory;
};

// Getränke zuerst (Theke), dann Essen + Kaffee (Sonstige) – Anzeigereihenfolge, kein Struktur-Split.
const CATEGORY_ORDER: readonly CatalogCategory[] = ["getraenk", "essen", "kaffee"];

export function VerzehrErfassung({
  zeilen,
  artikel,
  positionen,
  action,
  editable,
}: {
  zeilen: readonly VerzehrZeile[];
  artikel: readonly VerzehrArtikel[];
  positionen: readonly VerzehrPositionRow[];
  action: VerzehrFormAction;
  editable: boolean;
}) {
  if (zeilen.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Noch keine Teilnehmer erfasst – zuerst Teilnehmer hinzufügen.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {zeilen.map((zeile) => (
        <ZeileKarte
          key={zeile.id}
          zeile={zeile}
          artikel={artikel}
          positionen={positionen.filter((position) => position.zeileId === zeile.id)}
          action={action}
          editable={editable}
        />
      ))}
    </ul>
  );
}

function ZeileKarte({
  zeile,
  artikel,
  positionen,
  action,
  editable,
}: {
  zeile: VerzehrZeile;
  artikel: readonly VerzehrArtikel[];
  positionen: readonly VerzehrPositionRow[];
  action: VerzehrFormAction;
  editable: boolean;
}) {
  const mengeJeArtikel = new Map(positionen.map((position) => [position.catalogItemId, position.menge]));
  const summen = zeileSummen(positionen);
  // ADR-026 D3: bestehende Position auf einem soft-gelöschten Artikel bleibt sichtbar +
  // korrigierbar (kein Under-Billing, summen.ts zählt sie bereits mit). menge=0 wird nicht
  // gerendert – re-erfassen ist dann bewusst nicht mehr möglich (Soft-Delete-Zweck).
  const inaktivePositionen = positionen.filter((position) => !position.active && position.menge > 0);

  return (
    <li className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{zeile.anzeigename}</span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Getränke {formatCents(summen.getraenkeCents)} · Sonstige {formatCents(summen.sonstigeCents)}
        </span>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const artikelDerKategorie = artikel.filter((item) => item.category === category);
        if (artikelDerKategorie.length === 0) return null;
        return (
          <section key={category} className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {CATEGORY_LABEL[category]}
            </h3>
            <ul className="flex flex-col gap-2">
              {artikelDerKategorie.map((item) => (
                <PositionZeile
                  key={item.id}
                  action={action}
                  zeileId={zeile.id}
                  catalogItemId={item.id}
                  name={item.name}
                  priceCents={item.priceCents}
                  menge={mengeJeArtikel.get(item.id) ?? 0}
                  editable={editable}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {inaktivePositionen.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-dashed border-zinc-300 pt-2 dark:border-zinc-700">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Nicht mehr im Katalog
          </h3>
          <ul className="flex flex-col gap-2">
            {inaktivePositionen.map((position) => (
              <PositionZeile
                key={position.catalogItemId}
                action={action}
                zeileId={zeile.id}
                catalogItemId={position.catalogItemId}
                name={position.name}
                priceCents={position.priceCents}
                menge={position.menge}
                editable={editable}
              />
            ))}
          </ul>
        </section>
      )}
    </li>
  );
}

function PositionZeile({
  action,
  zeileId,
  catalogItemId,
  name,
  priceCents,
  menge,
  editable,
}: {
  action: VerzehrFormAction;
  zeileId: string;
  catalogItemId: string;
  name: string;
  priceCents: number;
  menge: number;
  editable: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-sm">
        {name} · {formatCents(priceCents)}
      </span>
      <MengeControl
        action={action}
        zeileId={zeileId}
        catalogItemId={catalogItemId}
        menge={menge}
        editable={editable}
      />
    </li>
  );
}
