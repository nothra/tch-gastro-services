import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listTeilnehmer } from "@/db/teilnehmer";
import type { Teilnehmer } from "@/db/schema";
import { Aufklapper } from "@/app/components/ui/Aufklapper";
import { Leerzustand } from "@/app/components/ui/Leerzustand";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { TeilnehmerAnlegen } from "./TeilnehmerAnlegen";
import { TeilnehmerRow } from "./TeilnehmerRow";

// Teilnehmer-Stammdatenpflege (F3, #50). Nur Verwalter. Die UI-Sperre ist Anzeige-Komfort;
// die eigentliche Durchsetzung liegt serverseitig in den Actions (requireRole),
// nicht ausschließlich hier (Defense in Depth, PROJECT-CONTEXT). Liste zuerst, Anlegen per
// „+ Neu"-Dialog (spec-373 AK8.1).
export default async function TeilnehmerPage() {
  const session = await auth();
  if (!hasRole(session?.user?.roles, "verwalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">
          Kein Zugriff – nur Verwalter dürfen die Teilnehmer-Stammdaten pflegen.
        </p>
      </main>
    );
  }

  const teilnehmer = await listTeilnehmer();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <PageHeader title="Teilnehmer" action={<TeilnehmerAnlegen ausloeser="+ Neu" />} />
      {teilnehmer.length === 0 ? (
        <Leerzustand
          text="Noch keine Teilnehmer angelegt."
          aktion={<TeilnehmerAnlegen ausloeser="Teilnehmer anlegen" imLeerzustand />}
        />
      ) : (
        <>
          <TeilnehmerGruppe
            titel="Aktiv"
            id="gruppe-aktiv"
            offen
            teilnehmer={teilnehmer.filter((t) => t.active)}
          />
          <TeilnehmerGruppe
            titel="Deaktiviert"
            id="gruppe-deaktiviert"
            teilnehmer={teilnehmer.filter((t) => !t.active)}
          />
        </>
      )}
    </main>
  );
}

interface TeilnehmerGruppeProps {
  titel: string;
  id: string;
  offen?: boolean;
  teilnehmer: Teilnehmer[];
}

// Eine Gruppe als benannter Abschnitt mit Aufklapper (spec-405 AK3, ADR-060 D3) – Muster der
// Veranstaltungsliste. Eine leere Gruppe entfällt ganz (AK3.4); die Reihenfolge kommt
// unverändert aus `listTeilnehmer` (AK3.6).
function TeilnehmerGruppe({ titel, id, offen = false, teilnehmer }: TeilnehmerGruppeProps) {
  if (teilnehmer.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <Aufklapper
        titel={titel}
        zaehler={teilnehmer.length}
        offen={offen}
        ueberschrift={{ id, ebene: "h2" }}
      >
        <ul className="flex flex-col gap-2 pt-3">
          {teilnehmer.map((row) => (
            <TeilnehmerRow key={row.id} teilnehmer={row} />
          ))}
        </ul>
      </Aufklapper>
    </section>
  );
}
