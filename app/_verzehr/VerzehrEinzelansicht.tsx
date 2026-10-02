"use client";

import { useState, type ReactNode } from "react";
import type { VerzehrPositionRow } from "@/db/verzehr";
import { Button } from "@/app/components/ui/Button";
import { joinClasses } from "@/app/components/ui/joinClasses";
import { ArtikelListe } from "./ArtikelListe";
import { KategorieUmschalter } from "./KategorieUmschalter";
import { PersonenChips } from "./PersonenChips";
import { PersonenKopf } from "./PersonenKopf";
import {
  artikelDerKategorie,
  sichtbareKategorie,
  sichtbareKategorien,
  type VerzehrKategorie,
} from "./kategorien";
import { gruppierePositionenNachZeile } from "./positionen";
import { zeileSummen } from "./summen";
import type { VerzehrFormAction } from "./types";
import type { VerzehrArtikel } from "./artikel-anzeige";
import type { VerzehrZeile } from "./verzehr-props";

// Route-neutrale Verzehr-Erfassung als Einzelansicht je Person (spec-370, ADR-054): oben ein
// sticky Block aus Personen-Chips, Kopf und Kategorie-Umschalter, darunter nur die Artikel der
// aktiven Person in der gewählten Kategorie, unten eine fixierte Fußleiste mit „Nächste Person →"
// und der optionalen Aktion des Konsumenten (Kassieren, #308). Beide Zugangswege nutzen sie – F5
// (Veranstalter) und F7 (Theke). Sie kennt weder Route noch Token noch Storage (ADR-025 D5,
// ADR-039 D1): ein Personenwechsel meldet sich über `onFokusWechsel`, F7 hängt daran seine
// geräte-lokale Ziel-Merkung, F5 lässt ihn weg. Den seitlichen Bleed des sticky Blocks
// (`kopfClassName`) und den Innenabstand der Fußleiste (`fussleisteClassName`) gibt der Konsument
// vor, passend zu seinem eigenen Seiten-Padding (#205, Lesson #188).
export function VerzehrEinzelansicht({
  zeilen,
  artikel,
  positionen,
  action,
  editable,
  initialeZeileId,
  onFokusWechsel,
  aktionJeZeile,
  kopfClassName,
  fussleisteClassName,
}: {
  zeilen: readonly VerzehrZeile[];
  artikel: readonly VerzehrArtikel[];
  positionen: readonly VerzehrPositionRow[];
  action: VerzehrFormAction;
  editable: boolean;
  initialeZeileId: string | null;
  onFokusWechsel?: (zeileId: string) => void;
  aktionJeZeile?: Readonly<Record<string, ReactNode>>;
  kopfClassName?: string;
  fussleisteClassName?: string;
}) {
  const [gewaehlteZeileId, setGewaehlteZeileId] = useState(initialeZeileId);
  const [gewaehlteKategorie, setGewaehlteKategorie] = useState<VerzehrKategorie | null>(null);

  // Unbekannte, fehlende oder parallel entfernte Person → erste Zeile (spec AK1a.5/FS3). Beim
  // Rendern abgeleitet statt per Effekt nachgezogen (Lesson `set-state-in-effect`).
  const aktiveZeile = zeilen.find((zeile) => zeile.id === gewaehlteZeileId) ?? zeilen.at(0);
  if (!aktiveZeile) return null;

  const positionenJeZeile = gruppierePositionenNachZeile(positionen);
  const eigenePositionen = positionenJeZeile.get(aktiveZeile.id) ?? [];
  const kategorien = sichtbareKategorien(artikel, eigenePositionen);
  const kategorie = sichtbareKategorie(gewaehlteKategorie, kategorien);

  // Wechsel per Chip oder „Nächste Person": Konsument benachrichtigen und die neue Person oben
  // beginnen lassen (spec AK5.3) – erst im nächsten Frame, nachdem das neue Layout steht (#188).
  // scrollTo ist guarded: jsdom implementiert es nicht.
  function wechsleZu(zeileId: string) {
    setGewaehlteZeileId(zeileId);
    onFokusWechsel?.(zeileId);
    requestAnimationFrame(() => window.scrollTo?.({ top: 0 }));
  }

  const naechsteZeile = zeilen[(zeilen.indexOf(aktiveZeile) + 1) % zeilen.length];

  return (
    <div className="flex flex-col gap-4">
      <div
        className={joinClasses(
          "sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-background py-3",
          kopfClassName,
        )}
      >
        <PersonenChips
          zeilen={zeilen}
          aktiveZeileId={aktiveZeile.id}
          zeilenMitVerzehr={zeilenMitVerzehr(positionenJeZeile)}
          onWaehle={wechsleZu}
        />
        <PersonenKopf name={aktiveZeile.anzeigename} summen={zeileSummen(eigenePositionen)} />
        <KategorieUmschalter
          kategorien={kategorien}
          aktiv={kategorie}
          onWaehle={setGewaehlteKategorie}
        />
      </div>

      {/* Key je Person: Fehler- und Pending-Zustand der MengeControls (useActionState) gehören der
          Person, bei der getippt wurde, und dürfen beim Wechsel nicht mitwandern (spec FS1/AK4.4). */}
      {kategorie !== null && (
        <ArtikelListe
          key={aktiveZeile.id}
          artikel={artikelDerKategorie(kategorie, artikel, eigenePositionen)}
          mengeJeArtikel={mengeJeArtikel(eigenePositionen)}
          zeileId={aktiveZeile.id}
          action={action}
          editable={editable}
        />
      )}

      <Fussleiste
        aktion={aktionJeZeile?.[aktiveZeile.id]}
        onNaechstePerson={zeilen.length >= 2 ? () => wechsleZu(naechsteZeile.id) : undefined}
        className={fussleisteClassName}
      />
    </div>
  );
}

// Fixiert am Viewport-Rand statt `sticky bottom-0`, damit sie auch bei kurzem Inhalt unten steht
// (ADR-054 D3). Der Platzhalter gleicher Höhe hält das Inhaltsende frei, damit die Leiste keine
// Zeile verdeckt; der Safe-Area-Abstand hält sie über der Home-Leiste mobiler Geräte. Die innere
// Breite spiegelt die `max-w-3xl` beider Konsumenten, deren seitliches Padding kommt per
// `className` herein.
function Fussleiste({
  aktion,
  onNaechstePerson,
  className,
}: {
  aktion: ReactNode;
  onNaechstePerson: (() => void) | undefined;
  className: string | undefined;
}) {
  if (!aktion && !onNaechstePerson) return null;

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="fussleiste-platzhalter"
        className="h-[calc(4.5rem+env(safe-area-inset-bottom))]"
      />
      <nav
        aria-label="Weiter"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className={joinClasses("mx-auto flex max-w-3xl items-center gap-3 py-3", className)}>
          {aktion}
          {onNaechstePerson && (
            <Button onClick={onNaechstePerson} className="ml-auto">
              Nächste Person →
            </Button>
          )}
        </div>
      </nav>
    </>
  );
}

function zeilenMitVerzehr(positionenJeZeile: ReadonlyMap<string, VerzehrPositionRow[]>) {
  const ids = new Set<string>();
  for (const [zeileId, eigene] of positionenJeZeile) {
    if (zeileSummen(eigene).gesamtCents > 0) ids.add(zeileId);
  }
  return ids;
}

function mengeJeArtikel(positionen: readonly VerzehrPositionRow[]) {
  return new Map(positionen.map((position) => [position.catalogItemId, position.menge]));
}
