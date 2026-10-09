import type { ReactNode } from "react";
import { PfeilRechtsIcon } from "./icons";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1, ADR-059 D2): natives `<details>`, dessen Zustand allein
// per CSS (`group-open:`) sichtbar wird – Pfeil-Drehung und Hinweis „Anzeigen"/„Ausblenden"
// funktionieren damit vor der Hydration und ohne JS (spec-403 F1), und Konsumenten wie die
// Kassier-Seite bleiben Server Components.

/** Überschrift im `<summary>`, auf deren `id` der umgebende Abschnitt per `aria-labelledby` zeigt. */
interface AufklapperUeberschrift {
  id: string;
  ebene: "h2" | "h3";
}

interface AufklapperProps {
  titel: string;
  /** Optionale Anzahl hinter dem Titel, z. B. „Abgeschlossen (3)" (spec-403 Q4). */
  zaehler?: number;
  /** Startzustand beim Laden; ohne Angabe zugeklappt (AK1.4). */
  offen?: boolean;
  ueberschrift?: AufklapperUeberschrift;
  /** Layout des `<details>` (Rahmen, Abstand, Schriftgröße) – nicht für Farben (ADR-052 D1). */
  className?: string;
  children: ReactNode;
}

/** Auf-/zuklappbarer Bereich mit eigenem Pfeil, optionalem Zähler und Zustandshinweis. */
export function Aufklapper({
  titel,
  zaehler,
  offen = false,
  ueberschrift,
  className,
  children,
}: AufklapperProps) {
  const beschriftung = zaehler === undefined ? titel : `${titel} (${zaehler})`;

  return (
    <details open={offen} className={joinClasses("group", className)}>
      {/* `list-none` blendet das native Dreieck in Chrome/Firefox aus, der Marker-Selektor in
          Safari – ersetzt durch den eigenen Pfeil (AK1.1). */}
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 text-muted transition-transform group-open:rotate-90 [&>svg]:size-5">
          <PfeilRechtsIcon />
        </span>
        <Titel ueberschrift={ueberschrift}>{beschriftung}</Titel>
        <span className="ml-auto shrink-0 pl-2 text-sm text-accent">
          <span className="group-open:hidden">Anzeigen</span>
          <span className="hidden group-open:inline">Ausblenden</span>
        </span>
      </summary>
      {children}
    </details>
  );
}

function Titel({
  ueberschrift,
  children,
}: {
  ueberschrift?: AufklapperUeberschrift;
  children: string;
}) {
  if (!ueberschrift) {
    return <span className="min-w-0 font-semibold break-words text-foreground">{children}</span>;
  }
  const Ueberschrift = ueberschrift.ebene;
  return (
    <Ueberschrift id={ueberschrift.id} className="min-w-0 break-words">
      {children}
    </Ueberschrift>
  );
}
