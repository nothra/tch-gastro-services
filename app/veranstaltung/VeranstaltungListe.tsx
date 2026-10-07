import Link from "next/link";
import type { Catalog, Kasse, Veranstaltung } from "@/db/schema";
import { Leerzustand } from "@/app/components/ui/Leerzustand";
import { VeranstaltungAnlegen } from "./VeranstaltungAnlegen";
import { KASSE_LABEL, formatDatum } from "./labels";

// Veranstaltungsliste nach Status gruppiert (spec-373 AK2, AK7). Die Reihenfolge innerhalb der
// Gruppen kommt unverändert aus `listVeranstaltungen` (AK2.3) – hier wird nur aufgeteilt.

const KATALOG_UNBEKANNT = "Katalog unbekannt";

interface VeranstaltungListeProps {
  veranstaltungen: Veranstaltung[];
  /** Alle Kataloge (auch deaktivierte) – nur für den Namen je Zeile (AK7.3). */
  kataloge: Catalog[];
  /** Die anlegbaren (aktiven) Kataloge für den Anlege-Dialog im Leerzustand. */
  anlegbareKataloge: Catalog[];
}

export function VeranstaltungListe({
  veranstaltungen,
  kataloge,
  anlegbareKataloge,
}: VeranstaltungListeProps) {
  const anlegen = (
    <VeranstaltungAnlegen
      kataloge={anlegbareKataloge}
      ausloeser="Veranstaltung anlegen"
      imLeerzustand
    />
  );

  if (veranstaltungen.length === 0) {
    return <Leerzustand text="Noch keine Veranstaltung angelegt." aktion={anlegen} />;
  }

  const katalogName = new Map(kataloge.map((katalog) => [katalog.id, katalog.name]));
  const offen = veranstaltungen.filter((v) => v.status === "offen");
  const abgeschlossen = veranstaltungen.filter((v) => v.status === "abgeschlossen");
  const zeilen = (liste: Veranstaltung[]) => (
    <ul className="flex flex-col gap-2">
      {liste.map((v) => (
        <VeranstaltungZeile
          key={v.id}
          veranstaltung={v}
          katalogName={katalogName.get(v.catalogId) ?? KATALOG_UNBEKANNT}
        />
      ))}
    </ul>
  );

  return (
    <>
      <section aria-labelledby="gruppe-offen" className="flex flex-col gap-3">
        <h2 id="gruppe-offen">Offen ({offen.length})</h2>
        {offen.length === 0 ? (
          <Leerzustand text="Keine offene Veranstaltung." aktion={anlegen} />
        ) : (
          zeilen(offen)
        )}
      </section>
      {abgeschlossen.length > 0 && (
        <section aria-labelledby="gruppe-abgeschlossen">
          {/* Eingeklappt (AK2.2): natives <details> ist ohne eigenes Script per Tipp und
              Tastatur bedienbar. */}
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <h2 id="gruppe-abgeschlossen" className="inline">
                Abgeschlossen ({abgeschlossen.length})
              </h2>
            </summary>
            <div className="pt-3">{zeilen(abgeschlossen)}</div>
          </details>
        </section>
      )}
    </>
  );
}

// Die Status-Angabe entfällt in der Zeile – die Gruppe trägt sie (AK7.1).
function VeranstaltungZeile({
  veranstaltung: v,
  katalogName,
}: {
  veranstaltung: Veranstaltung;
  katalogName: string;
}) {
  return (
    <li>
      <Link
        href={`/veranstaltung/${v.id}`}
        className="flex min-h-11 flex-col gap-1 rounded-lg border border-line bg-surface p-3 text-foreground hover:border-accent hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="font-semibold break-words">{v.bezeichnung}</span>
        <span className="text-sm break-words text-muted">
          {formatDatum(v.datum)} · {katalogName} · {KASSE_LABEL[v.kasse as Kasse]}
        </span>
      </Link>
    </li>
  );
}
