"use client";

import { useActionState, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { Field, SelectField } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import { TYP_LABEL } from "@/app/verwaltung/teilnehmer/TeilnehmerFields";
import type { Teilnehmer } from "@/db/schema";
import { addZeilenAction, createWalkInAction, type VeranstaltungFormState } from "./actions";

// Der eine „+ Teilnehmer"-Dialog der Detailseite (spec-369 AK10–AK16, ADR-053 D1/D3): oben die
// Auswahl aus den noch nicht erfassten aktiven Stammteilnehmern, darunter „Neuer Gast". Er ersetzt
// die beiden früheren Formulare (Teilnehmer hinzufügen, Walk-in). Validierung und Ablehnungen
// kommen ausschließlich aus den Server Actions – hier entsteht keine zweite Regel.

type StammteilnehmerAuswahl = Pick<Teilnehmer, "id" | "name">;

interface TeilnehmerHinzufuegenDialogProps {
  veranstaltungId: string;
  /** Aktive Stammteilnehmer ohne Zeile in dieser Veranstaltung (serverseitig gefiltert). */
  verfuegbar: readonly StammteilnehmerAuswahl[];
}

export function TeilnehmerHinzufuegenDialog({
  veranstaltungId,
  verfuegbar,
}: TeilnehmerHinzufuegenDialogProps) {
  const [open, setOpen] = useState(false);
  const schliessen = () => setOpen(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Teilnehmer
      </Button>
      <Dialog open={open} onClose={schliessen} title="Teilnehmer hinzufügen">
        <StammteilnehmerBereich
          veranstaltungId={veranstaltungId}
          verfuegbar={verfuegbar}
          onErfolg={schliessen}
        />
        <GastBereich veranstaltungId={veranstaltungId} onErfolg={schliessen} />
        <div className="flex justify-end">
          <Button variant="secondary" onClick={schliessen}>
            Abbrechen
          </Button>
        </div>
      </Dialog>
    </>
  );
}

type FormAction = (
  prevState: VeranstaltungFormState | undefined,
  formData: FormData,
) => Promise<VeranstaltungFormState>;

// Umschließt die Action und schließt den Dialog bei Erfolg – ohne `useEffect` auf den
// Rückgabe-State (Lesson `react-hooks/set-state-in-effect`, ADR-053 Implementierungs-Hinweise).
function useSchliessendeAction(action: FormAction, onErfolg: () => void) {
  return useActionState(
    async (prevState: VeranstaltungFormState | undefined, formData: FormData) => {
      const result = await action(prevState, formData);
      if (result.ok) onErfolg();
      return result;
    },
    undefined,
  );
}

interface BereichProps {
  veranstaltungId: string;
  onErfolg: () => void;
}

function StammteilnehmerBereich({
  veranstaltungId,
  verfuegbar,
  onErfolg,
}: BereichProps & { verfuegbar: readonly StammteilnehmerAuswahl[] }) {
  const [state, formAction, pending] = useSchliessendeAction(addZeilenAction, onErfolg);
  const [suche, setSuche] = useState("");
  const [gewaehlt, setGewaehlt] = useState<ReadonlySet<string>>(new Set());

  if (verfuegbar.length === 0) {
    return (
      <section role="group" aria-label="Stammteilnehmer" className="flex flex-col gap-2">
        <p className="text-sm text-muted">Alle aktiven Stammteilnehmer sind bereits erfasst.</p>
      </section>
    );
  }

  const begriff = suche.trim().toLocaleLowerCase("de");
  const treffer = verfuegbar.filter((person) =>
    person.name.toLocaleLowerCase("de").includes(begriff),
  );

  function umschalten(id: string) {
    setGewaehlt((bisher) => {
      const neu = new Set(bisher);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }

  return (
    <section role="group" aria-label="Stammteilnehmer" className="flex flex-col gap-3">
      <Field
        label="Suchen"
        type="search"
        value={suche}
        onChange={(event) => setSuche(event.target.value)}
        autoComplete="off"
      />
      {treffer.length === 0 ? (
        <p className="text-sm text-muted">Kein Stammteilnehmer passt zu „{suche.trim()}“.</p>
      ) : (
        <ul className="flex max-h-64 flex-col overflow-y-auto">
          {treffer.map((person) => (
            <li key={person.id}>
              <label className="flex min-h-11 items-center gap-3 break-words">
                <input
                  type="checkbox"
                  value={person.id}
                  checked={gewaehlt.has(person.id)}
                  onChange={() => umschalten(person.id)}
                  className="h-5 w-5 shrink-0 accent-accent"
                />
                <span className="min-w-0">{person.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
        {/* Die Auswahl wird aus dem Zustand abgeschickt, nicht aus den sichtbaren Checkboxen:
            die Suche filtert nur die Anzeige, eine angehakte Person bleibt gewählt. */}
        {verfuegbar
          .filter((person) => gewaehlt.has(person.id))
          .map((person) => (
            <input key={person.id} type="hidden" name="teilnehmerId" value={person.id} />
          ))}
        <Notice kind="fehler">{state?.error}</Notice>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Hinzufügen …" : "Hinzufügen"}
        </Button>
      </form>
    </section>
  );
}

function GastBereich({ veranstaltungId, onErfolg }: BereichProps) {
  const [state, formAction, pending] = useSchliessendeAction(createWalkInAction, onErfolg);

  return (
    <section
      role="group"
      aria-label="Neuer Gast"
      className="flex flex-col gap-3 border-t border-line-subtle pt-4"
    >
      <h3 className="text-sm font-semibold">Neuer Gast</h3>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
        {/* Jede Ablehnung des Walk-in betrifft den eingegebenen Gast oder den Zustand der
            Veranstaltung; das Namensfeld ist die einzige Freitexteingabe und trägt sie deshalb
            als Feldfehler (FS3). */}
        <Field label="Name" name="name" required maxLength={200} error={state?.error} />
        <SelectField label="Typ" name="typ" defaultValue="person">
          {(Object.entries(TYP_LABEL) as [Teilnehmer["typ"], string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="mitglied" className="h-5 w-5 accent-accent" />
          Mitglied
        </label>
        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          {pending ? "Anlegen …" : "Gast hinzufügen"}
        </Button>
      </form>
    </section>
  );
}
