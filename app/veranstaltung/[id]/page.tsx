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
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "../labels";

// Detailansicht einer Veranstaltung: Teilnehmer führen (hinzufügen/entfernen/Walk-in) und
// Status setzen. Nur Veranstalter (serverseitig durchgesetzt in den Actions). Abgeschlossene
// Veranstaltungen sind schreibgeschützt – nur der Status-Umschalter (Wiederöffnen) bleibt.
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

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/veranstaltung/${veranstaltung.id}/verzehr`}
          className="inline-flex w-fit items-center rounded border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-400 dark:hover:bg-cyan-950"
        >
          Verzehr erfassen →
        </Link>
        <Link
          href={`/veranstaltung/${veranstaltung.id}/auslagen`}
          className="inline-flex w-fit items-center rounded border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-400 dark:hover:bg-cyan-950"
        >
          Auslagen erstatten →
        </Link>
        <Link
          href={`/veranstaltung/${veranstaltung.id}/kassieren`}
          className="inline-flex w-fit items-center rounded border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-400 dark:hover:bg-cyan-950"
        >
          Kassieren →
        </Link>
      </div>

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
