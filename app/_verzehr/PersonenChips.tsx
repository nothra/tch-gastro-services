"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/Button";
import type { VerzehrZeile } from "./verzehr-props";

// Chip-Leiste der Einzelansicht (spec-370 AK1a, ADR-054 D1): ein Chip je Teilnehmer in
// Listen-Reihenfolge, der aktive mit `aria-pressed` und gefüllt (nicht nur Farbe). Eine Person mit
// erfasstem Verzehr trägt einen Punkt mit Textalternative (AK1a.4). Die Leiste scrollt horizontal
// in sich selbst und kennt kein Eltern-Padding – den seitlichen Bleed gibt der Konsument über den
// sticky Block vor (#205, ADR-054 D3).
export function PersonenChips({
  zeilen,
  aktiveZeileId,
  zeilenMitVerzehr,
  onWaehle,
}: {
  zeilen: readonly VerzehrZeile[];
  aktiveZeileId: string;
  zeilenMitVerzehr: ReadonlySet<string>;
  onWaehle: (zeileId: string) => void;
}) {
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  // Aktiven Chip horizontal in den Sichtbereich holen (AK1a.3) – auch beim Mounten (Start-Person,
  // AK1a.5). Erst im nächsten Frame, nachdem der Wechsel das Layout umgebaut hat (#188).
  // scrollIntoView ist guarded: jsdom implementiert es nicht.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      chipRefs.current.get(aktiveZeileId)?.scrollIntoView?.({ inline: "center", block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [aktiveZeileId]);

  return (
    <div role="group" aria-label="Teilnehmer auswählen" className="flex gap-2 overflow-x-auto">
      {zeilen.map((zeile) => {
        const istAktiv = zeile.id === aktiveZeileId;
        return (
          <Button
            key={zeile.id}
            ref={(element) => {
              if (element) chipRefs.current.set(zeile.id, element);
              else chipRefs.current.delete(zeile.id);
            }}
            size="sm"
            variant={istAktiv ? "primary" : "secondary"}
            aria-pressed={istAktiv}
            onClick={() => onWaehle(zeile.id)}
            className="min-w-11 shrink-0 whitespace-nowrap"
          >
            {zeile.anzeigename}
            {zeilenMitVerzehr.has(zeile.id) && <VerzehrMarke />}
          </Button>
        );
      })}
    </div>
  );
}

// Punkt in der Textfarbe des Chips (`bg-current`) – kontrastiert damit auf aktivem wie inaktivem
// Chip, ohne eine eigene Farbe einzuführen.
function VerzehrMarke() {
  return (
    <>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      <span className="sr-only">, Verzehr erfasst</span>
    </>
  );
}
