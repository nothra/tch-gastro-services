import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listTeilnehmer } from "@/db/teilnehmer";
import { TeilnehmerForm } from "./TeilnehmerForm";
import { TeilnehmerRow } from "./TeilnehmerRow";

// Teilnehmer-Stammdatenpflege (F3, #50). Nur Verwalter. Die UI-Sperre ist Anzeige-Komfort;
// die eigentliche Durchsetzung liegt serverseitig in den Actions (requireRole),
// nicht ausschließlich hier (Defense in Depth, PROJECT-CONTEXT).
export default async function TeilnehmerPage() {
  const session = await auth();
  if (!hasRole(session?.user?.roles, "verwalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-600 dark:text-zinc-400">
          Kein Zugriff – nur Verwalter dürfen die Teilnehmer-Stammdaten pflegen.
        </p>
      </main>
    );
  }

  const teilnehmer = await listTeilnehmer();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Teilnehmer
      </h1>
      <TeilnehmerForm />
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Teilnehmer ({teilnehmer.length})</h2>
        {teilnehmer.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Teilnehmer erfasst.</p>
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
