import type { ReactNode } from "react";
import type { Kasse, Veranstaltung } from "@/db/schema";
import { ButtonLink } from "@/app/components/ui/Button";
import { ListenZeile } from "@/app/components/ui/ListenZeile";
import { Notice } from "@/app/components/ui/Notice";
import { KASSE_LABEL, formatDatum } from "./labels";

// Schnellzugriff „Was läuft gerade?" auf der Startseite (spec-374 AK2, ADR-057 D3). Bekommt die
// Zeilen fertig sortiert aus der Data-Layer; Laden und Rollen-Gate liegen in `app/page.tsx`.

const UEBERSCHRIFT_ID = "offene-veranstaltungen";

function Abschnitt({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby={UEBERSCHRIFT_ID} className="flex flex-col gap-3">
      <h2 id={UEBERSCHRIFT_ID}>Offene Veranstaltungen</h2>
      {children}
    </section>
  );
}

export function OffeneVeranstaltungen({ veranstaltungen }: { veranstaltungen: Veranstaltung[] }) {
  if (veranstaltungen.length === 0) {
    return (
      <Abschnitt>
        <p className="text-sm text-muted">Keine offene Veranstaltung.</p>
        <ButtonLink href="/veranstaltung" prefetch={false} className="w-fit">
          Veranstaltung anlegen
        </ButtonLink>
      </Abschnitt>
    );
  }

  return (
    <Abschnitt>
      <ul className="flex flex-col gap-2">
        {veranstaltungen.map((v) => (
          <ListenZeile
            key={v.id}
            href={`/veranstaltung/${v.id}`}
            // Kein Auto-Prefetch geschützter Routen (ADR-031, Defense-in-depth zu #164).
            prefetch={false}
            titel={v.bezeichnung}
            untertitel={`${formatDatum(v.datum)} · ${KASSE_LABEL[v.kasse as Kasse]}`}
          />
        ))}
      </ul>
    </Abschnitt>
  );
}

/** Fehlerfall der Abfrage: Hinweis statt Absturz, die Bereichs-Kacheln bleiben (Fehlerszenario). */
export function OffeneVeranstaltungenLadefehler() {
  return (
    <Abschnitt>
      <Notice kind="fehler">Veranstaltungen konnten nicht geladen werden.</Notice>
    </Abschnitt>
  );
}
