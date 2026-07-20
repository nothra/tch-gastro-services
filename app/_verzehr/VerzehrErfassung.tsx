import type { Ref } from "react";
import { CATEGORY_LABEL } from "./category-labels";
import { formatCents } from "@/lib/money";
import type { VerzehrPositionRow } from "@/db/verzehr";
import type { CatalogCategory } from "@/db/schema";
import { zeileSummen } from "./summen";
import { MengeControl } from "./MengeControl";
import type { VerzehrFormAction } from "./types";
import {
  groessenSuffix,
  groessenLabel,
  gruppiereArtikel,
  type VerzehrArtikel,
  type VerzehrArtikelGruppe,
} from "./artikel-anzeige";

// Präsentationale, route-neutrale Erfassungs-UI (ADR-025 D5): kennt keine Auth/Session/Token,
// erhält Zeilen + Positionen + Katalog und die bereits scope-gebundene Server-Action als Prop.
// F7 (#54) reicht eine token-scoped Action und einen Katalog ohne Essen herein – ohne Umbau.

export type VerzehrZeile = { id: string; anzeigename: string };
export type { VerzehrArtikel };

// Getränke, Essen, Kaffee – Anzeigereihenfolge der Zusammenfassung und der Erfassungs-Abschnitte.
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

// Präsentationale Karte eines Teilnehmers (Kopf = Name + Summen, Körper = Erfassung). Exportiert
// (ADR-035 D2), damit die F7-`FokusListe` sie als Akkordeon wiederverwenden kann. Ohne die
// optionalen Akkordeon-Props verhält sie sich UNVERÄNDERT (flach, voll aufgeklappt) – so bleibt
// die F5-Seite unberührt. `collapsible` macht den Kopf zu einem Aufklapp-Button; bei `open=false`
// entfällt nur der Erfassungs-Körper (Kategorien + MengeControl), Kopf + Summen bleiben sichtbar
// (volle Transparenz, spec-54 AC B). `ref` (React-19-Prop) zeigt auf das `<li>` – für scrollIntoView.
export function ZeileKarte({
  zeile,
  artikel,
  positionen,
  action,
  editable,
  collapsible = false,
  open = true,
  onToggle,
  ref,
}: {
  zeile: VerzehrZeile;
  artikel: readonly VerzehrArtikel[];
  positionen: readonly VerzehrPositionRow[];
  action: VerzehrFormAction;
  editable: boolean;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  ref?: Ref<HTMLLIElement>;
}) {
  const mengeJeArtikel = new Map(
    positionen.map((position) => [position.catalogItemId, position.menge]),
  );
  const summen = zeileSummen(positionen);
  // ADR-026 D3: bestehende Position auf einem soft-gelöschten Artikel bleibt sichtbar +
  // korrigierbar (kein Under-Billing, summen.ts zählt sie bereits mit). menge=0 wird nicht
  // gerendert – re-erfassen ist dann bewusst nicht mehr möglich (Soft-Delete-Zweck).
  const inaktivePositionen = positionen.filter(
    (position) => !position.active && position.menge > 0,
  );
  const koerperSichtbar = !collapsible || open;

  const kopf = (
    <div className="flex flex-1 items-baseline justify-between gap-3">
      <span className="font-semibold">{zeile.anzeigename}</span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        Getränke {formatCents(summen.getraenkeCents)} · Essen {formatCents(summen.essenCents)} ·
        Kaffee {formatCents(summen.kaffeeCents)}
      </span>
    </div>
  );

  return (
    <li
      ref={ref}
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-baseline gap-3 text-left"
        >
          {kopf}
        </button>
      ) : (
        kopf
      )}

      {koerperSichtbar &&
        CATEGORY_ORDER.map((category) => {
          const artikelDerKategorie = artikel.filter((item) => item.category === category);
          if (artikelDerKategorie.length === 0) return null;
          const gruppen = gruppiereArtikel(artikelDerKategorie);
          return (
            <section key={category} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {CATEGORY_LABEL[category]}
              </h3>
              <ul className="flex flex-col gap-2">
                {gruppen.map((gruppe) => {
                  if (gruppe.varianten.length > 1) {
                    return (
                      <ArtikelGruppe
                        key={gruppe.name}
                        gruppe={gruppe}
                        action={action}
                        zeileId={zeile.id}
                        mengeJeArtikel={mengeJeArtikel}
                        editable={editable}
                      />
                    );
                  }
                  const einzelArtikel = gruppe.varianten[0];
                  return (
                    <PositionZeile
                      key={gruppe.name}
                      action={action}
                      zeileId={zeile.id}
                      catalogItemId={einzelArtikel.id}
                      label={`${einzelArtikel.name}${groessenSuffix(einzelArtikel.size)}`}
                      priceCents={einzelArtikel.priceCents}
                      menge={mengeJeArtikel.get(einzelArtikel.id) ?? 0}
                      editable={editable}
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}

      {koerperSichtbar && inaktivePositionen.length > 0 && (
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
                label={`${position.name}${groessenSuffix(position.size)}`}
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

// Zeigt gleichnamige Artikel mit >1 Größe als Namens-Überschrift + eingerückte
// Größen-Zeilen (ADR-027 D2) – jede Variante behält ihre eigene Menge + Strichliste.
function ArtikelGruppe({
  gruppe,
  action,
  zeileId,
  mengeJeArtikel,
  editable,
}: {
  gruppe: VerzehrArtikelGruppe;
  action: VerzehrFormAction;
  zeileId: string;
  mengeJeArtikel: Map<string, number>;
  editable: boolean;
}) {
  return (
    <li className="flex flex-col gap-2">
      <span className="text-sm font-medium">{gruppe.name}</span>
      <ul className="flex flex-col gap-2 pl-4">
        {gruppe.varianten.map((variante) => (
          <PositionZeile
            key={variante.id}
            action={action}
            zeileId={zeileId}
            catalogItemId={variante.id}
            label={groessenLabel(variante.size)}
            priceCents={variante.priceCents}
            menge={mengeJeArtikel.get(variante.id) ?? 0}
            editable={editable}
          />
        ))}
      </ul>
    </li>
  );
}

function PositionZeile({
  action,
  zeileId,
  catalogItemId,
  label,
  priceCents,
  menge,
  editable,
}: {
  action: VerzehrFormAction;
  zeileId: string;
  catalogItemId: string;
  label: string;
  priceCents: number;
  menge: number;
  editable: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-sm">
        {label} · {formatCents(priceCents)}
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
