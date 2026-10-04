import Link from "next/link";
import { headerClass } from "./headerStyles";

type PublicHeaderProps = {
  // Kontextname für den login-freien Bereich (z. B. Veranstaltungs-/Thekenname).
  contextLabel?: string;
};

// Schlanke Orientierungsleiste für den login-freien Kontext (ADR-031, ADR-056 D4): Wortmarke als
// Text (kein Link – die Startseite ist geschützt), kein Personal-Menü, keine /login-Umleitung – nur
// ein dezenter "Anmelden"-Einstieg. Opt-in eingebunden (nicht global gemountet, sonst erschiene
// sie auf /login); die Thekenseite hängt sie erst nach dem Token-Check ein.
export function PublicHeader({ contextLabel }: PublicHeaderProps) {
  return (
    <header className={headerClass}>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base font-semibold">TCH Gastro Services</span>
        {contextLabel && <span className="truncate text-muted">{contextLabel}</span>}
      </div>
      <Link
        href="/login"
        prefetch={false}
        className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Anmelden
      </Link>
    </header>
  );
}
