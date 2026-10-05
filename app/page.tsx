import Link from "next/link";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { visibleNavItems } from "@/lib/navigation";
import type { Veranstaltung } from "@/db/schema";
import { listOffeneVeranstaltungen } from "@/db/veranstaltung";
import {
  OffeneVeranstaltungen,
  OffeneVeranstaltungenLadefehler,
} from "@/app/veranstaltung/OffeneVeranstaltungen";

// Startseite als rollengefilterter Dashboard-Hub (ADR-031): dieselbe kanonische
// Menü-Definition wie die Kopfzeile (keine zweite RBAC-Quelle). Darüber für Veranstalter die
// offenen Veranstaltungen als Schnellzugriff (ADR-057 D3). Die eigentliche Durchsetzung bleibt in
// den verlinkten Routen (ADR-016).
export default async function Home() {
  const session = await auth();
  const roles = session?.user?.roles;
  const items = visibleNavItems(roles);
  // Ohne Rolle `veranstalter` wird nichts geladen (spec-374 AK2.4).
  const offene = hasRole(roles, "veranstalter") ? await ladeOffeneVeranstaltungen() : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="text-center">
        <h1 className="text-foreground">TCH Gastro Services</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Erfassung der Gastronomie-Vorgänge des Tennisclub Heuchelheim.
        </p>
      </div>

      {offene === "fehler" && <OffeneVeranstaltungenLadefehler />}
      {Array.isArray(offene) && <OffeneVeranstaltungen veranstaltungen={offene} />}

      {items.length > 0 && (
        <nav aria-label="Bereiche" className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              // Kein Auto-Prefetch geschützter Routen: spart die authentifizierte Hintergrund-RSC-
              // Abfrage (Neon-Last) und ist Defense-in-depth zur #164-Absicherung (zentral: proxy.ts).
              prefetch={false}
              className="flex min-h-11 items-center rounded-lg border border-line bg-surface p-6 text-lg font-semibold text-foreground hover:border-accent hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}

// Fehler der Abfrage werden hier abgefangen – Catch-Scope genau dieser eine Aufruf (Lesson #353):
// die Kacheln sind die Hauptnavigation und müssen bleiben, statt in `error.tsx` zu eskalieren.
async function ladeOffeneVeranstaltungen(): Promise<Veranstaltung[] | "fehler"> {
  try {
    return await listOffeneVeranstaltungen();
  } catch (error) {
    console.error("Offene Veranstaltungen konnten nicht geladen werden:", error);
    return "fehler";
  }
}
