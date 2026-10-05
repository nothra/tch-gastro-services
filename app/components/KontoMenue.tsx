// Konto-Menü der Kopfzeile auf dem nativen Popover (ADR-057 D1): Escape, Schließen bei Klick
// außerhalb, `aria-expanded` und der Fokus-Rücksprung kommen von der Plattform – deshalb weder
// eigener Zustand noch Fokus-Trap. Deklarativ verdrahtet, also auch ohne JavaScript bedienbar.

import { focusClass, iconButtonClass } from "./headerStyles";

const MENUE_ID = "konto-menue";

const abmeldenButtonClass = `inline-flex min-h-11 w-full items-center justify-center rounded-md border border-line bg-surface px-3 font-medium text-foreground hover:bg-background ${focusClass}`;

interface KontoMenueProps {
  /** E-Mail des Nutzers bzw. „Angemeldet" – erscheint nur im Menü, nie im Knopf (AK1.2). */
  label: string;
  signOutAction: () => Promise<void>;
}

export function KontoMenue({ label, signOutAction }: KontoMenueProps) {
  return (
    <>
      <button type="button" popoverTarget={MENUE_ID} aria-label="Konto" className={iconButtonClass}>
        <KontoSymbol />
      </button>
      {/* `inset-auto m-0` hebt die UA-Zentrierung des Popovers auf; die Position ist fest oben
          rechts unter der Kopfzeile, mit Safe-Area-Abstand (kein CSS Anchor Positioning). */}
      <div
        id={MENUE_ID}
        popover="auto"
        className="fixed inset-auto top-[calc(env(safe-area-inset-top)+3.75rem)] right-[max(1rem,env(safe-area-inset-right))] m-0 w-64 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border border-line-subtle bg-surface p-3 text-sm text-foreground shadow-lg open:flex"
      >
        <p className="break-all text-muted">{label}</p>
        <form action={signOutAction}>
          <button type="submit" className={abmeldenButtonClass}>
            Abmelden
          </button>
        </form>
      </div>
    </>
  );
}

function KontoSymbol() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
