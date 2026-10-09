import { ListenZeile } from "@/app/components/ui/ListenZeile";
import type { KachelKennzahlen } from "../kachelKennzahlen";

// Die drei Arbeitsschritt-Kacheln der Detailseite (spec-369 AK3–AK6): je ein Link auf die
// Unterseite, bei offener Veranstaltung mit Kurzkennzahl. Die Werte kommen fertig formatiert aus
// `kachelKennzahlen` – hier wird nichts gerechnet. Bei einer abgeschlossenen Veranstaltung fehlen
// sie (AK6): der Abschlussbericht übernimmt deren Rolle, die Links bleiben der Weg zu den
// schreibgeschützten Unterseiten und zu „Wieder öffnen" (AK7).

// `schritt` ist zugleich Routen-Segment der Unterseite und Schlüssel der Kennzahl.
const SCHRITTE = [
  { schritt: "verzehr", titel: "Verzehr erfassen" },
  { schritt: "auslagen", titel: "Auslagen erfassen" },
  { schritt: "kassieren", titel: "Kassieren" },
] as const satisfies readonly { schritt: keyof KachelKennzahlen; titel: string }[];

interface ArbeitsschrittKachelnProps {
  veranstaltungId: string;
  kennzahlen?: KachelKennzahlen;
}

export function ArbeitsschrittKacheln({ veranstaltungId, kennzahlen }: ArbeitsschrittKachelnProps) {
  return (
    <nav aria-label="Arbeitsschritte">
      {/* Ohne Pfeil (spec-403 Q2): dreispaltig wäre er auf dem Smartphone zu eng. */}
      <ul className="grid grid-cols-3 gap-2">
        {SCHRITTE.map(({ schritt, titel }) => (
          <ListenZeile
            key={schritt}
            href={`/veranstaltung/${veranstaltungId}/${schritt}`}
            titel={titel}
            untertitel={kennzahlen && <span className="tabular-nums">{kennzahlen[schritt]}</span>}
            pfeil={false}
            className="min-w-0"
          />
        ))}
      </ul>
    </nav>
  );
}
