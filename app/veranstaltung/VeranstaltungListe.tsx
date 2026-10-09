import type { Catalog, Kasse, Veranstaltung } from "@/db/schema";
import { Aufklapper } from "@/app/components/ui/Aufklapper";
import { Leerzustand } from "@/app/components/ui/Leerzustand";
import { ListenZeile } from "@/app/components/ui/ListenZeile";
import { VeranstaltungAnlegen } from "./VeranstaltungAnlegen";
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "./labels";

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

  // Beide Gruppen sind Aufklapper (spec-403 AK3.1/AK3.2): „Offen" startet aufgeklappt,
  // „Abgeschlossen" zu. Die Überschrift im <summary> benennt den jeweiligen Abschnitt.
  return (
    <>
      <section aria-labelledby="gruppe-offen">
        <Aufklapper
          titel="Offen"
          zaehler={offen.length}
          offen
          ueberschrift={{ id: "gruppe-offen", ebene: "h2" }}
        >
          <div className="pt-3">
            {offen.length === 0 ? (
              <Leerzustand text="Keine offene Veranstaltung." aktion={anlegen} />
            ) : (
              zeilen(offen)
            )}
          </div>
        </Aufklapper>
      </section>
      {abgeschlossen.length > 0 && (
        <section aria-labelledby="gruppe-abgeschlossen">
          <Aufklapper
            titel="Abgeschlossen"
            zaehler={abgeschlossen.length}
            ueberschrift={{ id: "gruppe-abgeschlossen", ebene: "h2" }}
          >
            <div className="pt-3">{zeilen(abgeschlossen)}</div>
          </Aufklapper>
        </section>
      )}
    </>
  );
}

// Die Status-Angabe „offen" entfällt in der Zeile – die Gruppe trägt sie (spec-373 AK7.1).
// Abgeschlossene Zeilen verblassen und tragen den Status als Badge (spec-403 AK3.3).
function VeranstaltungZeile({
  veranstaltung: v,
  katalogName,
}: {
  veranstaltung: Veranstaltung;
  katalogName: string;
}) {
  return (
    <ListenZeile
      href={`/veranstaltung/${v.id}`}
      titel={v.bezeichnung}
      untertitel={`${formatDatum(v.datum)} · ${katalogName} · ${KASSE_LABEL[v.kasse as Kasse]}`}
      zustand={v.status === "abgeschlossen" ? STATUS_LABEL.abgeschlossen : undefined}
    />
  );
}
