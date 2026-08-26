"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Teilnehmerliste der Kassier-Seite mit eingefrorener Reihenfolge (#253). Der Server sortiert bei
// jedem `revalidatePath` neu (offen oben, bezahlt unten – spec-223); eine gerade kassierte Zeile
// spränge dadurch sofort nach unten. Deshalb hält diese Client-Komponente die Reihenfolge der
// `zeile.id`s des ersten Renderns fest und ordnet die Zeilen bei jedem weiteren Rendern wieder in
// diese Reihenfolge ein. Eingefroren wird ausschließlich die **Position** – der gerenderte
// `inhalt` (Badge, Beträge, Formularwerte) kommt unverändert vom Server und bleibt damit aktuell.
// Der Freeze gilt für die gesamte Seiten-Session (jede Neuladung ohne Remount, nicht nur der
// Kassieren-Klick); neu hinzukommende Zeilen werden angehängt, ihre Position wird nicht eingefroren.
// Beim nächsten Seitenaufruf (Reload) mountet die Komponente neu → die Server-Sortierung gilt wieder.
//
// Weil sie die `<li>`-Elemente besitzt, übernimmt sie zusätzlich die Darstellung der Zielzeile eines
// personenbezogenen Aufrufs (#308): `hervorgehobeneZeileId` markiert genau eine Zeile und holt sie
// in den Sichtbereich. Das ist reine Anzeige – Reihenfolge, Inhalt und Status bleiben unberührt.

export type KassierZeile = {
  id: string;
  inhalt: ReactNode;
};

// Optik der Zielzeile eines personenbezogenen Aufrufs (#308 AK2) – dieselbe Akzentfarbe wie der
// aktive Chip der Verzehrerfassung, damit „gemeinte Person" überall gleich aussieht.
const HERVORHEBUNG_CLASS = "border-cyan-600 bg-cyan-50 dark:border-cyan-500 dark:bg-cyan-950";
const NORMAL_CLASS = "border-zinc-200 dark:border-zinc-800";

export function KassierZeilenListe({
  zeilen,
  hervorgehobeneZeileId = null,
}: {
  zeilen: KassierZeile[];
  hervorgehobeneZeileId?: string | null;
}) {
  const [eingefroreneReihenfolge] = useState(() => zeilen.map((zeile) => zeile.id));
  const zeilenRefs = useRef(new Map<string, HTMLLIElement>());

  // Zielzeile eines personenbezogenen Aufrufs in den Sichtbereich holen (#308 AK2). Erst im
  // nächsten Frame, damit gegen das fertige Layout gescrollt wird (analog #188); `block: "start"`
  // genügt ohne scroll-margin, weil diese Seite – anders als die Chip-Leiste der Verzehrerfassung –
  // keinen sticky Kopf hat, der die Zeile verdecken könnte.
  useEffect(() => {
    if (hervorgehobeneZeileId === null) return;
    const frame = requestAnimationFrame(() => {
      zeilenRefs.current.get(hervorgehobeneZeileId)?.scrollIntoView?.({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [hervorgehobeneZeileId]);

  return (
    <ul className="flex flex-col gap-3">
      {ordneNachEingefrorenerReihenfolge(zeilen, eingefroreneReihenfolge).map((zeile) => {
        const hervorgehoben = zeile.id === hervorgehobeneZeileId;
        return (
          <li
            key={zeile.id}
            ref={(el) => {
              if (el) zeilenRefs.current.set(zeile.id, el);
              else zeilenRefs.current.delete(zeile.id);
            }}
            aria-current={hervorgehoben ? "true" : undefined}
            className={`flex flex-col gap-2 rounded border p-4 ${
              hervorgehoben ? HERVORHEBUNG_CLASS : NORMAL_CLASS
            }`}
          >
            {zeile.inhalt}
          </li>
        );
      })}
    </ul>
  );
}

// Zeilen mit eingefrorener Position zuerst (in genau dieser Reihenfolge), danach alle Zeilen ohne
// eingefrorene Position in Server-Reihenfolge – so wird eine unbekannte Zeile angehängt statt
// stillschweigend ausgeblendet. Inzwischen entfallene Ids werden übersprungen.
function ordneNachEingefrorenerReihenfolge(
  zeilen: KassierZeile[],
  eingefroreneReihenfolge: string[],
): KassierZeile[] {
  const zeilenNachId = new Map(zeilen.map((zeile) => [zeile.id, zeile]));
  const eingefroreneIds = new Set(eingefroreneReihenfolge);

  return [
    ...eingefroreneReihenfolge
      .map((id) => zeilenNachId.get(id))
      .filter((zeile) => zeile !== undefined),
    ...zeilen.filter((zeile) => !eingefroreneIds.has(zeile.id)),
  ];
}
