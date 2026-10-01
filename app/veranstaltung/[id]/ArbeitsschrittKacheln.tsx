import Link from "next/link";
import type { KachelKennzahlen } from "../kachelKennzahlen";

// Die drei Arbeitsschritt-Kacheln der Detailseite (spec-369 AK3–AK6): je ein Link auf die
// Unterseite, bei offener Veranstaltung mit Kurzkennzahl. Die Werte kommen fertig formatiert aus
// `kachelKennzahlen` – hier wird nichts gerechnet. Bei einer abgeschlossenen Veranstaltung fehlen
// sie (AK6): der Abschlussbericht übernimmt deren Rolle, die Links bleiben der Weg zu den
// schreibgeschützten Unterseiten und zu „Wieder öffnen" (AK7).

// `schritt` ist zugleich Routen-Segment der Unterseite und Schlüssel der Kennzahl.
const SCHRITTE = [
  { schritt: "verzehr", titel: "Verzehr" },
  { schritt: "auslagen", titel: "Auslagen" },
  { schritt: "kassieren", titel: "Kassieren" },
] as const satisfies readonly { schritt: keyof KachelKennzahlen; titel: string }[];

interface ArbeitsschrittKachelnProps {
  veranstaltungId: string;
  kennzahlen?: KachelKennzahlen;
}

export function ArbeitsschrittKacheln({ veranstaltungId, kennzahlen }: ArbeitsschrittKachelnProps) {
  return (
    <nav aria-label="Arbeitsschritte">
      <ul className="grid grid-cols-3 gap-2">
        {SCHRITTE.map(({ schritt, titel }) => (
          <li key={schritt} className="min-w-0">
            <Link
              href={`/veranstaltung/${veranstaltungId}/${schritt}`}
              className="flex h-full min-h-11 flex-col gap-1 rounded-lg border border-line bg-surface p-3 text-foreground hover:border-accent hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="font-semibold break-words">{titel}</span>
              {kennzahlen && (
                <span className="text-sm break-words text-muted tabular-nums">
                  {kennzahlen[schritt]}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
