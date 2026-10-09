import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "./Badge";
import { PfeilRechtsIcon } from "./icons";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1, ADR-059 D1): eine Listenzeile als Karte, deren Link die
// ganze Fläche füllt. Eine Zeilenaktion (z. B. ⋯-Menü) kommt als Slot und steht NEBEN dem Link,
// nie darin – so steckt kein interaktives Element in einem anderen (spec-403 AK2.4). Der Baustein
// kennt weder Menü noch Server Action.

// Verblasster Zustand (ADR-059 D3): abgeblendet werden nur Textblock und Pfeil, nicht das Badge –
// es trägt den Zustand als Text und muss voll lesbar bleiben. Der Untertitel wechselt dabei auf
// `text-foreground`, weil `text-muted` unter `opacity-60` unter 4,5 : 1 fiele (tokens.test.ts).
const VERBLASST_CLASS = "opacity-60";

interface ListenZeileProps {
  href: string;
  /** Wird an `next/link` durchgereicht – die Startseite setzt `false` (ADR-031). */
  prefetch?: boolean;
  titel: ReactNode;
  untertitel?: ReactNode;
  /** Gesetzt → Zeile verblasst und trägt diesen Text als Badge, z. B. „abgeschlossen". */
  zustand?: string;
  /** Pfeil rechts im Link; die Arbeitsschritt-Kacheln verzichten wegen der Breite darauf. */
  pfeil?: boolean;
  /** Zeilenaktion rechts neben dem Link; ersetzt den Pfeil. */
  aktion?: ReactNode;
  /** Layout des `<li>` (z. B. `min-w-0` im Raster) – nicht für Farben (ADR-052 D1). */
  className?: string;
}

/** Listenzeile mit Karten-Optik, ganzer Zeile als Tipp-Ziel und optionaler Zeilenaktion. */
export function ListenZeile({
  href,
  prefetch,
  titel,
  untertitel,
  zustand,
  pfeil = true,
  aktion,
  className,
}: ListenZeileProps) {
  const verblasst = zustand !== undefined;
  const zeigtPfeil = pfeil && !aktion;

  return (
    <li
      className={joinClasses(
        "flex items-center gap-2 rounded-lg border border-line-subtle bg-surface text-foreground hover:border-accent hover:bg-accent-subtle focus-within:border-accent focus-within:bg-accent-subtle",
        className,
      )}
    >
      <Link
        href={href}
        prefetch={prefetch}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 self-stretch rounded-lg p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span
          className={joinClasses(
            "flex min-w-0 flex-1 flex-col gap-1",
            verblasst ? VERBLASST_CLASS : undefined,
          )}
        >
          <span className="font-semibold break-words">{titel}</span>
          {untertitel !== undefined && (
            <span
              className={joinClasses(
                "text-sm break-words",
                verblasst ? "text-foreground" : "text-muted",
              )}
            >
              {untertitel}
            </span>
          )}
        </span>
        {verblasst && (
          <Badge tone="neutral" className="shrink-0">
            {zustand}
          </Badge>
        )}
        {zeigtPfeil && (
          <span
            className={joinClasses(
              "shrink-0 text-muted [&>svg]:size-5",
              verblasst ? VERBLASST_CLASS : undefined,
            )}
          >
            <PfeilRechtsIcon />
          </span>
        )}
      </Link>
      {aktion && <div className="shrink-0 pr-1">{aktion}</div>}
    </li>
  );
}
