import Link from "next/link";
import { auth } from "@/auth";
import { visibleNavItems } from "@/lib/navigation";

// Startseite als rollengefilterter Dashboard-Hub (ADR-031): dieselbe kanonische
// Menü-Definition wie die Kopfzeile (keine zweite RBAC-Quelle). Die eigentliche
// Durchsetzung bleibt in den verlinkten Routen (ADR-016).
export default async function Home() {
  const session = await auth();
  const items = visibleNavItems(session?.user?.roles);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          TCH Gastro Services
        </h1>
        <p className="mx-auto mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
          Erfassung der Gastronomie-Vorgänge des Tennisclub Heuchelheim.
        </p>
      </div>

      {items.length > 0 && (
        <nav aria-label="Bereiche" className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              // Kein Auto-Prefetch geschützter Routen: spart die authentifizierte Hintergrund-RSC-
              // Abfrage (Neon-Last) und ist Defense-in-depth zur #164-Absicherung (zentral: proxy.ts).
              prefetch={false}
              className="flex min-h-[44px] items-center rounded-lg border border-zinc-200 p-6 text-lg font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
