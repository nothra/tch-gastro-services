"use client";

import { useState, type ReactNode } from "react";

// Teilnehmerliste der Kassier-Seite mit eingefrorener Reihenfolge (#253). Der Server sortiert bei
// jedem `revalidatePath` neu (offen oben, bezahlt unten – spec-223); eine gerade kassierte Zeile
// spränge dadurch sofort nach unten. Deshalb hält diese Client-Komponente die Reihenfolge der
// `zeile.id`s des ersten Renderns fest und ordnet die Zeilen bei jedem weiteren Rendern wieder in
// diese Reihenfolge ein. Eingefroren wird ausschließlich die **Position** – der gerenderte
// `inhalt` (Badge, Beträge, Formularwerte) kommt unverändert vom Server und bleibt damit aktuell.
// Beim nächsten Seitenaufruf (Reload) mountet die Komponente neu → die Server-Sortierung gilt wieder.

export type EingefroreneZeile = {
  id: string;
  inhalt: ReactNode;
};

export function EingefroreneZeilenListe({ zeilen }: { zeilen: EingefroreneZeile[] }) {
  const [eingefroreneReihenfolge] = useState(() => zeilen.map((zeile) => zeile.id));

  return (
    <ul className="flex flex-col gap-3">
      {ordneNachEingefrorenerReihenfolge(zeilen, eingefroreneReihenfolge).map((zeile) => (
        <li
          key={zeile.id}
          className="flex flex-col gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800"
        >
          {zeile.inhalt}
        </li>
      ))}
    </ul>
  );
}

// Zeilen mit eingefrorener Position zuerst (in genau dieser Reihenfolge), danach alle Zeilen ohne
// eingefrorene Position in Server-Reihenfolge – so wird eine unbekannte Zeile angehängt statt
// stillschweigend ausgeblendet. Inzwischen entfallene Ids werden übersprungen.
function ordneNachEingefrorenerReihenfolge(
  zeilen: EingefroreneZeile[],
  eingefroreneReihenfolge: string[],
): EingefroreneZeile[] {
  const zeilenNachId = new Map(zeilen.map((zeile) => [zeile.id, zeile]));
  const eingefroreneIds = new Set(eingefroreneReihenfolge);

  return [
    ...eingefroreneReihenfolge
      .map((id) => zeilenNachId.get(id))
      .filter((zeile) => zeile !== undefined),
    ...zeilen.filter((zeile) => !eingefroreneIds.has(zeile.id)),
  ];
}
