import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listTeilnehmer } from "@/db/teilnehmer";
import { Leerzustand } from "@/app/components/ui/Leerzustand";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { TeilnehmerAnlegen } from "./TeilnehmerAnlegen";
import { TeilnehmerRow } from "./TeilnehmerRow";

// Teilnehmer-Stammdatenpflege (F3, #50). Nur Verwalter. Die UI-Sperre ist Anzeige-Komfort;
// die eigentliche Durchsetzung liegt serverseitig in den Actions (requireRole),
// nicht ausschließlich hier (Defense in Depth, PROJECT-CONTEXT). Liste zuerst, Anlegen per
// „+ Neu"-Dialog (spec-373 AK8.1).
export default async function TeilnehmerPage() {
  const session = await auth();
  if (!hasRole(session?.user?.roles, "verwalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">
          Kein Zugriff – nur Verwalter dürfen die Teilnehmer-Stammdaten pflegen.
        </p>
      </main>
    );
  }

  const teilnehmer = await listTeilnehmer();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <PageHeader title="Teilnehmer" action={<TeilnehmerAnlegen ausloeser="+ Neu" />} />
      <section className="flex flex-col gap-3">
        <h2>Teilnehmer ({teilnehmer.length})</h2>
        {teilnehmer.length === 0 ? (
          <Leerzustand
            text="Noch keine Teilnehmer erfasst."
            aktion={<TeilnehmerAnlegen ausloeser="Teilnehmer anlegen" imLeerzustand />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {teilnehmer.map((row) => (
              <TeilnehmerRow key={row.id} teilnehmer={row} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
