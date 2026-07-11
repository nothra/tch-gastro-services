import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/session";

// Kopfzeile mit Abmelden-Button – nur für angemeldete Nutzer. Für Besucher (kein
// Session) rendert die Komponente nichts, damit die /login-Seite sauber bleibt.
export async function AppHeader() {
  const session = await auth();
  if (!session?.user) return null;

  const label = session.user.email ?? "Angemeldet";
  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Abmelden
        </button>
      </form>
    </header>
  );
}
