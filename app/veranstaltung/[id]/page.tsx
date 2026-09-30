import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse, Veranstaltung } from "@/db/schema";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listActiveTeilnehmer } from "@/db/teilnehmer";
import { listCatalogs } from "@/db/catalog";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import { Badge } from "@/app/components/ui/Badge";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ZeileRow } from "../ZeileRow";
import { KatalogWechsel } from "../KatalogWechsel";
import { TeilnehmerHinzufuegenDialog } from "../TeilnehmerHinzufuegenDialog";
import { kachelKennzahlen } from "../kachelKennzahlen";
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "../labels";
import { Abschlussbericht } from "./Abschlussbericht";
import { ArbeitsschrittKacheln } from "./ArbeitsschrittKacheln";
import { VeranstaltungMetaForm } from "./VeranstaltungMetaForm";
import { VeranstaltungLoeschen } from "./VeranstaltungLoeschen";
import { ZugangDialog } from "./ZugangDialog";
import { ZugangTeilen } from "./ZugangTeilen";

// Detailansicht einer Veranstaltung (spec-369, ADR-053 D6): reine Komposition aus Kopf →
// Arbeitsschritt-Kacheln → Teilnehmerliste → eingeklappten Einstellungen. Nur Veranstalter; alle
// Schreibwege prüfen Rolle und Status zusätzlich serverseitig in den Actions. Abgeschlossene
// Veranstaltungen sind schreibgeschützt: Bericht statt Kennzahlen, keine Einstellungen.
// Abschließen/Wieder öffnen liegt auf der Kassieren-Seite (AK24–AK26).
export default async function VeranstaltungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Kein Zugriff – nur Veranstalter dürfen Veranstaltungen führen.</p>
      </main>
    );
  }

  const veranstaltung = await getVeranstaltung(id);
  if (!veranstaltung) notFound();

  if (veranstaltung.status !== "offen") {
    return (
      <AbgeschlosseneVeranstaltung
        veranstaltung={veranstaltung}
        zeilen={await listZeilen(veranstaltung.id)}
      />
    );
  }
  return <OffeneVeranstaltung veranstaltung={veranstaltung} {...await ladeOffeneDaten(id)} />;
}

type Zeilen = Awaited<ReturnType<typeof listZeilen>>;

async function ladeOffeneDaten(id: string) {
  const [zeilen, positionen, auslagen, aktiveTeilnehmer, kataloge] = await Promise.all([
    listZeilen(id),
    listPositionen(id),
    listAuslagen(id),
    listActiveTeilnehmer(),
    listCatalogs(),
  ]);
  const bereitsErfasst = new Set(zeilen.map((zeile) => zeile.teilnehmerId));
  return {
    zeilen,
    kennzahlen: kachelKennzahlen({ zeilen, positionen, auslagen }),
    verfuegbar: aktiveTeilnehmer.filter((teilnehmer) => !bereitsErfasst.has(teilnehmer.id)),
    // Wechselziele sind nur aktive Kataloge (#346 AK6) – dieselbe Filterung wie bei der Anlage.
    // Ob der Wechsel im konkreten Fall noch erlaubt ist, entscheidet die Action (#346 FS2).
    aktiveKataloge: kataloge.filter((katalog) => katalog.active),
  };
}

function OffeneVeranstaltung({
  veranstaltung,
  zeilen,
  kennzahlen,
  verfuegbar,
  aktiveKataloge,
}: { veranstaltung: Veranstaltung } & Awaited<ReturnType<typeof ladeOffeneDaten>>) {
  const { id } = veranstaltung;
  // Bearbeiten und Löschen gelten nur für datierte Veranstaltungen (#352 AK3/AK10). Die stehende
  // Theke ist ebenfalls `offen`, aber ein dauerhafter Sondervorgang ohne Datum (spec-51, FS5).
  const bearbeitbar = veranstaltung.typ === "veranstaltung";

  return (
    <DetailRahmen veranstaltung={veranstaltung}>
      <ArbeitsschrittKacheln veranstaltungId={id} kennzahlen={kennzahlen} />
      <Teilnehmerliste
        veranstaltungId={id}
        zeilen={zeilen}
        editable
        aktion={<TeilnehmerHinzufuegenDialog veranstaltungId={id} verfuegbar={verfuegbar} />}
      />
      <details className="rounded-lg border border-line-subtle bg-surface">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-accent">
          Einstellungen
        </summary>
        <div className="flex flex-col gap-6 border-t border-line-subtle p-4">
          <KatalogWechsel id={id} catalogId={veranstaltung.catalogId} kataloge={aktiveKataloge} />
          {bearbeitbar && (
            <VeranstaltungMetaForm
              id={id}
              bezeichnung={veranstaltung.bezeichnung}
              datum={veranstaltung.datum}
              kasse={veranstaltung.kasse as Kasse}
            />
          )}
          <ZugangDialog>
            <ZugangTeilen token={veranstaltung.token} />
          </ZugangDialog>
          {/* Zerstörerische Aktion bewusst zuletzt (#352 AK4/AK8). */}
          {bearbeitbar && <VeranstaltungLoeschen id={id} bezeichnung={veranstaltung.bezeichnung} />}
        </div>
      </details>
    </DetailRahmen>
  );
}

// Schreibgeschützt (AK6/AK7): Bericht über den Kacheln, Kacheln ohne Kennzahl – deren Daten
// werden gar nicht erst geladen (ADR-053 D4) –, keine Einstellungen.
function AbgeschlosseneVeranstaltung({
  veranstaltung,
  zeilen,
}: {
  veranstaltung: Veranstaltung;
  zeilen: Zeilen;
}) {
  return (
    <DetailRahmen veranstaltung={veranstaltung}>
      <Abschlussbericht veranstaltungId={veranstaltung.id} />
      <ArbeitsschrittKacheln veranstaltungId={veranstaltung.id} />
      <Teilnehmerliste veranstaltungId={veranstaltung.id} zeilen={zeilen} editable={false} />
    </DetailRahmen>
  );
}

function DetailRahmen({
  veranstaltung,
  children,
}: {
  veranstaltung: Veranstaltung;
  children: React.ReactNode;
}) {
  const offen = veranstaltung.status === "offen";
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title={veranstaltung.bezeichnung}
        back={{ href: "/veranstaltung", label: "Alle Veranstaltungen" }}
        meta={`${formatDatum(veranstaltung.datum)} · ${KASSE_LABEL[veranstaltung.kasse as Kasse]}`}
        action={
          <Badge tone={offen ? "akzent" : "neutral"}>{STATUS_LABEL[veranstaltung.status]}</Badge>
        }
      />
      {children}
    </main>
  );
}

function Teilnehmerliste({
  veranstaltungId,
  zeilen,
  editable,
  aktion,
}: {
  veranstaltungId: string;
  zeilen: Zeilen;
  editable: boolean;
  aktion?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="teilnehmer-ueberschrift" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="teilnehmer-ueberschrift">Teilnehmer ({zeilen.length})</h2>
        {aktion}
      </div>
      {zeilen.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Teilnehmer erfasst.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {zeilen.map((zeile) => (
            <ZeileRow
              key={zeile.id}
              zeile={zeile}
              veranstaltungId={veranstaltungId}
              editable={editable}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
