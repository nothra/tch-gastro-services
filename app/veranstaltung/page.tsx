import Link from "next/link";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse } from "@/db/schema";
import { listVeranstaltungen } from "@/db/veranstaltung";
import { VeranstaltungForm } from "./VeranstaltungForm";
import { ThekeSetup } from "./ThekeSetup";
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "./labels";

// Veranstaltungen anlegen & führen (F4, #51). Nur Veranstalter. Die UI-Sperre ist Anzeige-
// Komfort; die Durchsetzung liegt serverseitig in den Actions (requireRole), nicht nur hier.
export default async function VeranstaltungenPage() {
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-600 dark:text-zinc-400">
          Kein Zugriff – nur Veranstalter dürfen Veranstaltungen anlegen und führen.
        </p>
      </main>
    );
  }

  const veranstaltungen = await listVeranstaltungen();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Veranstaltungen
      </h1>
      <VeranstaltungForm />
      <ThekeSetup />
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Veranstaltungen ({veranstaltungen.length})</h2>
        {veranstaltungen.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Noch keine Veranstaltung angelegt.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {veranstaltungen.map((v) => (
              <li key={v.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
                <Link
                  href={`/veranstaltung/${v.id}`}
                  className="font-medium text-cyan-700 hover:underline dark:text-cyan-400"
                >
                  {v.bezeichnung}
                </Link>
                <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatDatum(v.datum)} · {KASSE_LABEL[v.kasse as Kasse]} ·{" "}
                  {STATUS_LABEL[v.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
