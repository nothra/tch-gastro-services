import Link from "next/link";

type PublicHeaderProps = {
  // Kontextname für den login-freien Bereich (z. B. Veranstaltungs-/Thekenname).
  contextLabel?: string;
};

// Schlanke Orientierungsleiste für den login-freien Kontext (ADR-031): kein Personal-Menü,
// kein Link auf geschützte Bereiche, keine /login-Umleitung – nur ein dezenter
// "Anmelden"-Einstieg. Opt-in eingebunden (nicht global gemountet, sonst erschiene sie auf
// /login); #54 hängt sie auf theke/[token] ein.
export function PublicHeader({ contextLabel }: PublicHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-[max(1rem,env(safe-area-inset-left))] py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm dark:border-zinc-800">
      <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
        {contextLabel ?? "TCH Gastro Services"}
      </span>
      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Anmelden
      </Link>
    </header>
  );
}
