import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse } from "@/db/schema";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listAuslagen } from "@/db/auslage";
import { createAuslageAction } from "../../actions";
import { auslagenSummen } from "../../auslagenSummen";
import { AuslagenSummary } from "../../AuslagenSummary";
import { AuslageForm } from "../../AuslageForm";
import { AuslageRow } from "../../AuslageRow";
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "../../labels";

// Authentifizierte Auslagen-Seite (F6, #53, ADR-028 D4): lädt Auslagen + Teilnehmerzeilen, zeigt
// die Summen-Übersicht, das Erfassungsformular (nur solange die Veranstaltung offen ist) und die
// Auslagen-Liste. Nur Veranstalter (serverseitig auch in den Actions durchgesetzt). Liegt unter
// dem bereits von `proxy.ts` geschützten Bereich – keine Ausnahme nötig (Codify #63).
export default async function AuslagenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-600 dark:text-zinc-400">
          Kein Zugriff – nur Veranstalter dürfen Auslagen erstatten.
        </p>
      </main>
    );
  }

  const veranstaltung = await getVeranstaltung(id);
  if (!veranstaltung) notFound();

  const [auslagen, zeilen] = await Promise.all([listAuslagen(id), listZeilen(id)]);
  const offen = veranstaltung.status === "offen";
  const summen = auslagenSummen(auslagen);
  const teilnehmer = zeilen.map((zeile) => ({
    teilnehmerId: zeile.teilnehmerId,
    anzeigename: zeile.anzeigename,
  }));

  // Die veranstaltungId ist ein serverseitig gebundenes, vertrauenswürdiges Argument der Action
  // (analog adjustVerzehrAction) – der Client liefert sie nicht.
  const createAction = createAuslageAction.bind(null, id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/veranstaltung/${id}`}
          className="text-sm text-cyan-700 hover:underline dark:text-cyan-400"
        >
          ← Zur Veranstaltung
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Auslagen · {veranstaltung.bezeichnung}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDatum(veranstaltung.datum)} · {KASSE_LABEL[veranstaltung.kasse as Kasse]} ·{" "}
          {STATUS_LABEL[veranstaltung.status]}
        </p>
      </div>

      <AuslagenSummary summen={summen} />

      {offen && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Auslage erfassen</h2>
          <AuslageForm
            action={createAction}
            teilnehmer={teilnehmer}
            submitLabel="Auslage erfassen"
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Auslagen ({auslagen.length})</h2>
        {auslagen.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Auslagen erfasst.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {auslagen.map((auslage) => (
              <AuslageRow
                key={auslage.id}
                auslage={auslage}
                veranstaltungId={id}
                teilnehmer={teilnehmer}
                editable={offen}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
