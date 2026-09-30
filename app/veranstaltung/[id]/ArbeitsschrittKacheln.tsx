import Link from "next/link";
import type { KachelKennzahlen } from "../kachelKennzahlen";

// Die drei Arbeitsschritt-Kacheln der Detailseite (spec-369 AK3–AK6): je ein Link auf die
// Unterseite, bei offener Veranstaltung mit Kurzkennzahl. Die Werte kommen fertig formatiert aus
// `kachelKennzahlen` – hier wird nichts gerechnet. Bei einer abgeschlossenen Veranstaltung fehlen
// sie (AK6): der Abschlussbericht übernimmt deren Rolle, die Links bleiben der Weg zu den
// schreibgeschützten Unterseiten und zu „Wieder öffnen" (AK7).

const SCHRITTE = [
  { segment: "verzehr", titel: "Verzehr", kennzahl: "verzehr" },
  { segment: "auslagen", titel: "Auslagen", kennzahl: "auslagen" },
  { segment: "kassieren", titel: "Kassieren", kennzahl: "kassieren" },
] as const satisfies readonly {
  segment: string;
  titel: string;
  kennzahl: keyof KachelKennzahlen;
}[];

interface ArbeitsschrittKachelnProps {
  veranstaltungId: string;
  kennzahlen?: KachelKennzahlen;
}

export function ArbeitsschrittKacheln({ veranstaltungId, kennzahlen }: ArbeitsschrittKachelnProps) {
  return (
    <nav aria-label="Arbeitsschritte">
      <ul className="grid grid-cols-3 gap-2">
        {SCHRITTE.map((schritt) => (
          <li key={schritt.segment} className="min-w-0">
            <Link
              href={`/veranstaltung/${veranstaltungId}/${schritt.segment}`}
              className="flex h-full min-h-11 flex-col gap-1 rounded-lg border border-line bg-surface p-3 text-foreground hover:border-accent hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="font-semibold break-words">{schritt.titel}</span>
              {kennzahlen && (
                <span className="text-sm break-words text-muted tabular-nums">
                  {kennzahlen[schritt.kennzahl]}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
