import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse, Veranstaltung } from "@/db/schema";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listActiveTeilnehmer } from "@/db/teilnehmer";
import { listCatalogs } from "@/db/catalog";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import { loeschSperren } from "@/lib/veranstaltung-loesch-sperren";
import { Badge } from "@/app/components/ui/Badge";
import { TeilenIcon, ZahnradIcon } from "@/app/components/ui/icons";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ZeileRow } from "../ZeileRow";
import { KatalogWechsel } from "../KatalogWechsel";
import { TeilnehmerHinzufuegenDialog } from "../TeilnehmerHinzufuegenDialog";
import { kachelKennzahlen } from "../kachelKennzahlen";
import { kassierTagessummen, kassierZeilen } from "../kassierSummen";
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "../labels";
import { AbschlussAktion } from "./AbschlussAktion";
import { Abschlussbericht } from "./Abschlussbericht";
import { ArbeitsschrittKacheln } from "./ArbeitsschrittKacheln";
import { KopfDialog } from "./KopfDialog";
import { VeranstaltungMetaForm } from "./VeranstaltungMetaForm";
import { VeranstaltungLoeschen } from "./VeranstaltungLoeschen";
import { ZugangTeilen } from "./ZugangTeilen";

// Detailansicht einer Veranstaltung (spec-369, spec-391, ADR-053 D6, ADR-056): reine Komposition
// aus Kopf → Arbeitsschritt-Kacheln → Teilnehmerliste. Teilen, Einstellungen und Löschen sind
// Symbol-Schaltflächen im Seitenkopf, Abschließen/Wieder öffnen steht daneben (spec-371). Nur
// Veranstalter; alle Schreibwege prüfen Rolle und Status zusätzlich serverseitig in den Actions.
// Abgeschlossene Veranstaltungen sind schreibgeschützt: Bericht statt Kennzahlen, keine
// Kopfaktionen außer „Wieder öffnen" (spec-371).
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
  // Hinweis im Abschluss-Dialog aus derselben Quelle wie das Gate (ADR-033 D5, ADR-055 D3).
  const { offeneZeilen, offenerBetragCents } = kassierTagessummen(
    kassierZeilen(zeilen, positionen),
  );
  return {
    zeilen,
    offeneZeilen,
    offenerBetragCents,
    kennzahlen: kachelKennzahlen({ zeilen, positionen, auslagen }),
    verfuegbar: aktiveTeilnehmer.filter((teilnehmer) => !bereitsErfasst.has(teilnehmer.id)),
    // Wechselziele sind nur aktive Kataloge (#346 AK6) – dieselbe Filterung wie bei der Anlage.
    // Ob der Wechsel im konkreten Fall noch erlaubt ist, entscheidet die Action (#346 FS2).
    aktiveKataloge: kataloge.filter((katalog) => katalog.active),
    // Hinweis im Lösch-Dialog aus denselben Daten und derselben Regel wie die Action (spec-372
    // AK9, ADR-058 D3) – keine zusätzliche Abfrage.
    sperren: loeschSperren({ zeilen, positionen, auslagen }),
  };
}

function OffeneVeranstaltung({
  veranstaltung,
  zeilen,
  kennzahlen,
  verfuegbar,
  aktiveKataloge,
  offeneZeilen,
  offenerBetragCents,
  sperren,
}: { veranstaltung: Veranstaltung } & Awaited<ReturnType<typeof ladeOffeneDaten>>) {
  const { id } = veranstaltung;
  // Bearbeiten, Löschen und Abschließen gelten nur für datierte Veranstaltungen (#352 AK3/AK10,
  // spec-371 AK23). Die stehende Theke ist ebenfalls `offen`, aber ein dauerhafter Sondervorgang
  // ohne Datum (spec-51, FS5).
  const bearbeitbar = veranstaltung.typ === "veranstaltung";

  const kopfAktionen = (
    <>
      <KopfDialog label="Link & QR teilen" icon={<TeilenIcon />}>
        <ZugangTeilen token={veranstaltung.token} />
      </KopfDialog>
      <KopfDialog label="Einstellungen" icon={<ZahnradIcon />}>
        <KatalogWechsel id={id} catalogId={veranstaltung.catalogId} kataloge={aktiveKataloge} />
        {bearbeitbar && (
          <VeranstaltungMetaForm
            id={id}
            bezeichnung={veranstaltung.bezeichnung}
            datum={veranstaltung.datum}
            kasse={veranstaltung.kasse as Kasse}
          />
        )}
      </KopfDialog>
      {/* Zerstörerische Aktion bewusst zuletzt (#352 AK4/AK8, spec-391 AK2). */}
      {bearbeitbar && (
        <VeranstaltungLoeschen id={id} bezeichnung={veranstaltung.bezeichnung} sperren={sperren} />
      )}
    </>
  );

  return (
    <DetailRahmen
      veranstaltung={veranstaltung}
      kopfAktionen={kopfAktionen}
      aktion={
        bearbeitbar && (
          <AbschlussAktion
            id={id}
            status={veranstaltung.status}
            offeneZeilen={offeneZeilen}
            offenerBetragCents={offenerBetragCents}
          />
        )
      }
    >
      <ArbeitsschrittKacheln veranstaltungId={id} kennzahlen={kennzahlen} />
      <Teilnehmerliste
        veranstaltungId={id}
        zeilen={zeilen}
        editable
        aktion={<TeilnehmerHinzufuegenDialog veranstaltungId={id} verfuegbar={verfuegbar} />}
      />
    </DetailRahmen>
  );
}

// Schreibgeschützt (AK6/AK7): Bericht über den Kacheln, Kacheln ohne Kennzahl – deren Daten
// werden gar nicht erst geladen (ADR-053 D4) –, keine Kopfaktionen außer „Wieder öffnen"
// (spec-391 AK14, spec-371).
function AbgeschlosseneVeranstaltung({
  veranstaltung,
  zeilen,
}: {
  veranstaltung: Veranstaltung;
  zeilen: Zeilen;
}) {
  return (
    <DetailRahmen
      veranstaltung={veranstaltung}
      aktion={<AbschlussAktion id={veranstaltung.id} status={veranstaltung.status} />}
    >
      <Abschlussbericht veranstaltungId={veranstaltung.id} />
      <ArbeitsschrittKacheln veranstaltungId={veranstaltung.id} />
      <Teilnehmerliste veranstaltungId={veranstaltung.id} zeilen={zeilen} editable={false} />
    </DetailRahmen>
  );
}

// Welche Kopfaktionen erscheinen, entscheidet der Aufrufer je Zustand (ADR-056 D5); der Rahmen
// stellt sie nur hinter das Status-Badge.
function DetailRahmen({
  veranstaltung,
  aktion,
  kopfAktionen,
  children,
}: {
  veranstaltung: Veranstaltung;
  aktion?: React.ReactNode;
  kopfAktionen?: React.ReactNode;
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
          // Badge und Aktionen brechen gemeinsam um (spec-371 AK24, spec-391 AK16); das setzt den
          // auf die Zeilenbreite begrenzten Aktionsbereich im PageHeader voraus (ADR-056 D5).
          <div className="flex flex-wrap items-center gap-1">
            <Badge tone={offen ? "akzent" : "neutral"}>{STATUS_LABEL[veranstaltung.status]}</Badge>
            {aktion}
            {kopfAktionen}
          </div>
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
