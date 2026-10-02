import { useId } from "react";
import { formatCents } from "@/lib/money";
import type { VerzehrPositionRow } from "@/db/verzehr";
import { gruppierePositionenNachZeile } from "./positionen";
import { zeileSummen } from "./summen";
import type { VerzehrZeile } from "./verzehr-props";

// Nur-Lese-Übersicht Name + Gesamtbetrag je Teilnehmer (spec-370 AK6.3, ADR-054 D4). Steht auf
// der Theke unter den Fragen vor der Namenswahl, damit der Gast die laufenden Summen sieht
// (spec-54 AC B); die Erfassung selbst ist die Einzelansicht. Bewusst ohne Aufschlüsselung,
// Artikel und Bedienelemente – und billig entfernbar, falls die Produktentscheidung kippt.

// Geteilt mit app/veranstaltung/[id]/verzehr/page.tsx (#187): Veranstalter ohne Teilnehmer. Liegt
// in diesem Server-tauglichen Modul statt in der Client-Einzelansicht, weil ein Server Component
// aus einem "use client"-Modul nur Client-Referenzen statt Werte importiert.
export const KEIN_TEILNEHMER_HINWEIS =
  "Noch keine Teilnehmer erfasst – zuerst Teilnehmer hinzufügen.";

export function VerzehrUebersicht({
  zeilen,
  positionen,
}: {
  zeilen: readonly VerzehrZeile[];
  positionen: readonly VerzehrPositionRow[];
}) {
  const headingId = useId();
  const positionenJeZeile = gruppierePositionenNachZeile(positionen);

  return (
    <section className="flex flex-col gap-2">
      <h2 id={headingId} className="text-sm font-semibold text-muted">
        Bisher erfasst
      </h2>
      <ul aria-labelledby={headingId} className="flex flex-col divide-y divide-line-subtle">
        {zeilen.map((zeile) => (
          <li key={zeile.id} className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0 break-words">{zeile.anzeigename}</span>
            <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
              <span className="sr-only">Gesamt </span>
              {formatCents(zeileSummen(positionenJeZeile.get(zeile.id) ?? []).gesamtCents)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
