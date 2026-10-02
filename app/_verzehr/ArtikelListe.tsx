import { formatCents } from "@/lib/money";
import { MengeControl } from "./MengeControl";
import type { VerzehrFormAction } from "./types";
import { groessenLabel, gruppiereArtikel, type VerzehrArtikel } from "./artikel-anzeige";

// Artikel der sichtbaren Kategorie (spec-370 AK3, ADR-054 D1): JEDER Artikel – ob mit einer oder
// mehreren Größen – ist eine Gruppe mit dem Namen als Überschrift und je Größe genau einer Zeile.
// So gibt es kein abweichendes Einzelzeilen-Layout mehr, und die Größen-Beschriftung folgt einer
// Regel (`groessenLabel`, AK3.3). Der Preis hat eine feste, rechtsbündige Spalte, damit Beträge
// untereinander bündig stehen (AK3.4).
export function ArtikelListe({
  artikel,
  mengeJeArtikel,
  zeileId,
  action,
  editable,
}: {
  artikel: readonly VerzehrArtikel[];
  mengeJeArtikel: ReadonlyMap<string, number>;
  zeileId: string;
  action: VerzehrFormAction;
  editable: boolean;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {gruppiereArtikel(artikel).map((gruppe) => (
        <li key={gruppe.name} className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">{gruppe.name}</h3>
          <ul className="flex flex-col divide-y divide-line-subtle">
            {gruppe.varianten.map((variante) => (
              <PositionZeile
                key={variante.id}
                variante={variante}
                menge={mengeJeArtikel.get(variante.id) ?? 0}
                zeileId={zeileId}
                action={action}
                editable={editable}
              />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function PositionZeile({
  variante,
  menge,
  zeileId,
  action,
  editable,
}: {
  variante: VerzehrArtikel;
  menge: number;
  zeileId: string;
  action: VerzehrFormAction;
  editable: boolean;
}) {
  return (
    <li className="flex min-h-11 items-center gap-3 py-1">
      <span className="min-w-0 flex-1 text-sm">{groessenLabel(variante.size)}</span>
      <span className="w-16 shrink-0 text-right text-sm text-muted tabular-nums">
        {formatCents(variante.priceCents)}
      </span>
      <MengeControl
        action={action}
        zeileId={zeileId}
        catalogItemId={variante.id}
        menge={menge}
        editable={editable}
      />
    </li>
  );
}
