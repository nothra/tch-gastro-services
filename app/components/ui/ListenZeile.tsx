import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { Badge } from "./Badge";
import { PfeilRechtsIcon } from "./icons";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1, ADR-059 D1): eine Listenzeile als Karte, deren Tipp-Ziel
// die ganze Fläche füllt. Eine Zeilenaktion (z. B. ⋯-Menü) kommt als Slot und steht NEBEN dem
// Tipp-Ziel, nie darin – so steckt kein interaktives Element in einem anderen (spec-403 AK2.4). Der
// Baustein kennt weder Menü noch Server Action. Der Kartenrand ist `line-subtle` wie bei `Card`: er
// grenzt die Fläche nur ab, die Zeile erkennt man an Titel und Pfeil bzw. – pfeillos – am Text-Link
// (ADR-059 D1, Ausnahme zu ADR-052 D2).
//
// Das Tipp-Ziel ist ein Link (führt woandershin) oder ein Button (öffnet einen Dialog, ADR-060 D1).
// Die Betriebsart legen die Props fest (`href` | `onOeffnen`), nicht ein Flag; der Inhalt ist für
// beide derselbe, nur das umschließende Element wechselt.

// Verblasster Zustand (ADR-059 D3): abgeblendet werden nur Textblock und Pfeil, nicht das Badge –
// es trägt den Zustand als Text und muss voll lesbar bleiben. Der Untertitel wechselt dabei auf
// `text-foreground`, weil `text-muted` unter `opacity-60` unter 4,5 : 1 fiele (tokens.test.ts).
// Exportiert, damit der Kontrastnachweis in tokens.test.ts mit derselben Opazität rechnet.
export const VERBLASST_CLASS = "opacity-60";

const TIPP_ZIEL_CLASS =
  "flex min-h-11 min-w-0 flex-1 items-center gap-3 self-stretch rounded-lg p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * Einheitliche Leer-Prüfung für bedingt übergebene Slots (`x && …` liefert `false`/`""`).
 * Die Zahl `0` zählt bewusst als Inhalt (`0 && …` ergibt `0`) – Konsumenten mit Zahlen-Bedingung
 * schreiben `n > 0 && …`.
 */
function hatInhalt(wert: ReactNode): boolean {
  return wert !== undefined && wert !== null && wert !== false && wert !== "";
}

interface GemeinsameProps {
  titel: ReactNode;
  untertitel?: ReactNode;
  /** Gesetzt → Zeile verblasst und trägt diesen Text als Badge, z. B. „abgeschlossen". */
  zustand?: string;
  /** Pfeil rechts im Tipp-Ziel; die Arbeitsschritt-Kacheln verzichten wegen der Breite darauf. */
  pfeil?: boolean;
  /** Zeilenaktion rechts neben dem Tipp-Ziel; ersetzt den Pfeil. */
  aktion?: ReactNode;
  /** Unsichtbarer Begleitinhalt im `<li>` nach dem Tipp-Ziel, z. B. der geöffnete Dialog. */
  anhang?: ReactNode;
  /** Layout des `<li>` (z. B. `min-w-0` im Raster) – nicht für Farben (ADR-052 D1). */
  className?: string;
}

interface LinkProps extends GemeinsameProps {
  href: string;
  /** Wird an `next/link` durchgereicht – die Startseite setzt `false` (ADR-031). */
  prefetch?: boolean;
  onOeffnen?: never;
  id?: never;
  ausloeserRef?: never;
}

interface AusloeserProps extends GemeinsameProps {
  /** Öffnet etwas auf derselben Seite (Dialog) – das Tipp-Ziel wird ein Button. */
  onOeffnen: () => void;
  /** Ersatz-Fokusziel, falls die Zeile nach einem Erfolg neu gemountet wird (Lesson #371). */
  id?: string;
  /** Fokus-Rücksprung des Dialogs auf den Auslöser. */
  ausloeserRef?: Ref<HTMLButtonElement>;
  href?: never;
  prefetch?: never;
}

type ListenZeileProps = LinkProps | AusloeserProps;

/** Listenzeile mit Karten-Optik, ganzer Zeile als Tipp-Ziel und optionaler Zeilenaktion. */
export function ListenZeile({
  href,
  prefetch,
  onOeffnen,
  id,
  ausloeserRef,
  titel,
  untertitel,
  zustand,
  pfeil = true,
  aktion,
  anhang,
  className,
}: ListenZeileProps) {
  const verblasst = hatInhalt(zustand);
  const hatAktion = hatInhalt(aktion);
  const zeigtPfeil = pfeil && !hatAktion;

  const inhalt = (
    <>
      <span
        className={joinClasses(
          "flex min-w-0 flex-1 flex-col gap-1",
          verblasst ? VERBLASST_CLASS : undefined,
        )}
      >
        <span className="font-semibold break-words">{titel}</span>
        {hatInhalt(untertitel) && (
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
    </>
  );

  return (
    <li
      className={joinClasses(
        "flex items-center gap-2 rounded-lg border border-line-subtle bg-surface text-foreground hover:border-accent hover:bg-accent-subtle focus-within:border-accent focus-within:bg-accent-subtle",
        className,
      )}
    >
      {href !== undefined ? (
        <Link href={href} prefetch={prefetch} className={TIPP_ZIEL_CLASS}>
          {inhalt}
        </Link>
      ) : (
        <button
          ref={ausloeserRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          onClick={onOeffnen}
          className={TIPP_ZIEL_CLASS}
        >
          {inhalt}
        </button>
      )}
      {hatAktion && <div className="shrink-0 pr-1">{aktion}</div>}
      {anhang}
    </li>
  );
}
