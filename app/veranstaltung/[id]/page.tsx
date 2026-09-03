import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse } from "@/db/schema";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listActiveTeilnehmer } from "@/db/teilnehmer";
import { AddTeilnehmerForm } from "../AddTeilnehmerForm";
import { WalkInForm } from "../WalkInForm";
import { ZeileRow } from "../ZeileRow";
import { StatusToggle } from "../StatusToggle";
import { ZugangTeilen } from "./ZugangTeilen";
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "../labels";
import type { BerichtFormat, BerichtUmfang } from "../berichtDateiname";

// Detailansicht einer Veranstaltung: Teilnehmer führen (hinzufügen/entfernen/Walk-in) und
// Status setzen. Nur Veranstalter (serverseitig durchgesetzt in den Actions). Abgeschlossene
// Veranstaltungen sind schreibgeschützt – nur der Status-Umschalter (Wiederöffnen) bleibt.

const AKTION_LINK_KLASSE =
  "inline-flex w-fit items-center rounded border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-400 dark:hover:bg-cyan-950";

// Der vollständige Bericht behält seinen bestehenden Link OHNE `umfang` – die Route setzt für
// einen fehlenden Parameter den Default `voll` (ADR-046 D1), und spec-324 AC14 verlangt die
// Gruppe „Vollständig" unverändert.
function berichtHref(veranstaltungId: string, format: BerichtFormat, umfang: BerichtUmfang) {
  const query = umfang === "voll" ? `format=${format}` : `format=${format}&umfang=${umfang}`;
  return `/api/veranstaltung/${veranstaltungId}/bericht?${query}`;
}

// Eine Umfangs-Gruppe der Bericht-Sektion (spec-324 AC14): Überschrift + beide Formate desselben
// Umfangs. Die Link-Beschriftungen sind in beiden Gruppen gleich – die Zuordnung tragen die
// Überschrift und das `role="group"`/`aria-labelledby`-Paar, damit sie auch vorgelesen wird.
function BerichtGruppe({
  veranstaltungId,
  titel,
  umfang,
}: {
  veranstaltungId: string;
  titel: string;
  umfang: BerichtUmfang;
}) {
  const ueberschriftId = `bericht-${umfang}`;
  return (
    <div role="group" aria-labelledby={ueberschriftId} className="flex flex-col gap-2">
      <h3 id={ueberschriftId} className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {titel}
      </h3>
      <div className="flex flex-wrap gap-3">
        <a href={berichtHref(veranstaltungId, "xlsx", umfang)} className={AKTION_LINK_KLASSE}>
          Excel (.xlsx) herunterladen
        </a>
        <a href={berichtHref(veranstaltungId, "pdf", umfang)} className={AKTION_LINK_KLASSE}>
          PDF herunterladen
        </a>
      </div>
    </div>
  );
}
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
        <p className="text-zinc-600 dark:text-zinc-400">
          Kein Zugriff – nur Veranstalter dürfen Veranstaltungen führen.
        </p>
      </main>
    );
  }

  const veranstaltung = await getVeranstaltung(id);
  if (!veranstaltung) notFound();

  const zeilen = await listZeilen(id);
  const bereitsErfasst = new Set(zeilen.map((zeile) => zeile.teilnehmerId));
  const verfuegbar = (await listActiveTeilnehmer()).filter((t) => !bereitsErfasst.has(t.id));
  const offen = veranstaltung.status === "offen";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/veranstaltung"
          className="text-sm text-cyan-700 hover:underline dark:text-cyan-400"
        >
          ← Alle Veranstaltungen
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {veranstaltung.bezeichnung}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDatum(veranstaltung.datum)} · {KASSE_LABEL[veranstaltung.kasse as Kasse]} ·{" "}
          {STATUS_LABEL[veranstaltung.status]}
        </p>
      </div>

      <StatusToggle id={veranstaltung.id} status={veranstaltung.status} />

      {!offen && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Abschlussbericht</h2>
          <BerichtGruppe veranstaltungId={veranstaltung.id} titel="Vollständig" umfang="voll" />
          <BerichtGruppe
            veranstaltungId={veranstaltung.id}
            titel="Nur Getränke"
            umfang="getraenke"
          />
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`/veranstaltung/${veranstaltung.id}/verzehr`} className={AKTION_LINK_KLASSE}>
          Verzehr erfassen →
        </Link>
        <Link href={`/veranstaltung/${veranstaltung.id}/auslagen`} className={AKTION_LINK_KLASSE}>
          Auslagen erstatten →
        </Link>
        <Link href={`/veranstaltung/${veranstaltung.id}/kassieren`} className={AKTION_LINK_KLASSE}>
          Kassieren →
        </Link>
      </div>

      {offen && <ZugangTeilen token={veranstaltung.token} />}

      {offen && (
        <section className="flex flex-col gap-4">
          <AddTeilnehmerForm veranstaltungId={veranstaltung.id} verfuegbar={verfuegbar} />
          <WalkInForm veranstaltungId={veranstaltung.id} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Teilnehmer ({zeilen.length})</h2>
        {zeilen.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Teilnehmer erfasst.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {zeilen.map((zeile) => (
              <ZeileRow
                key={zeile.id}
                zeile={zeile}
                veranstaltungId={veranstaltung.id}
                editable={offen}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
