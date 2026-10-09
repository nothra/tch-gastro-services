"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { Field } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import {
  DialogAktionen,
  useDialogFormular,
  useFormularDialog,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { anlegenLabel, DuplikatWarnung } from "@/app/verwaltung/teilnehmer/DuplikatWarnung";
import { TeilnehmerFields } from "@/app/verwaltung/teilnehmer/TeilnehmerFields";
import type { Teilnehmer } from "@/db/schema";
import { addZeilenAction, createWalkInAction } from "./actions";

// Der Dialog „Teilnehmer hinzufügen" der Detailseite (spec-369 AK10–AK16, ADR-053 D1/D3) in zwei
// Schritten (spec-404): die Auswahl vorhandener Teilnehmer und, als Absprung daraus, „Teilnehmer
// anlegen" mit denselben Feldern wie die Verwaltung. Validierung und Ablehnungen kommen
// ausschließlich aus den Server Actions – hier entsteht keine zweite Regel.

type TeilnehmerAuswahl = Pick<Teilnehmer, "id" | "name">;

type Schritt = { art: "auswahl" } | { art: "anlegen"; namensVorschlag: string };

const SCHRITT_TITEL: Record<Schritt["art"], string> = {
  auswahl: "Teilnehmer hinzufügen",
  anlegen: "Teilnehmer anlegen",
};

interface TeilnehmerHinzufuegenDialogProps {
  veranstaltungId: string;
  /** Aktive Teilnehmer ohne Zeile in dieser Veranstaltung (serverseitig gefiltert). */
  verfuegbar: readonly TeilnehmerAuswahl[];
}

export function TeilnehmerHinzufuegenDialog({
  veranstaltungId,
  verfuegbar,
}: TeilnehmerHinzufuegenDialogProps) {
  const { ausloeserRef, oeffnen, steuerung, dialogProps } = useFormularDialog();
  // Hier statt im Dialog-Inhalt, weil der Titel des Dialogs vom Schritt abhängt.
  const [schritt, setSchritt] = useState<Schritt>({ art: "auswahl" });

  function oeffnenBeiAuswahl() {
    setSchritt({ art: "auswahl" });
    oeffnen();
  }

  return (
    <>
      <Button ref={ausloeserRef} size="sm" onClick={oeffnenBeiAuswahl}>
        Teilnehmer hinzufügen
      </Button>
      <Dialog {...dialogProps} title={SCHRITT_TITEL[schritt.art]}>
        <DialogInhalt
          veranstaltungId={veranstaltungId}
          verfuegbar={verfuegbar}
          schritt={schritt}
          onSchrittWechsel={setSchritt}
          steuerung={steuerung}
        />
      </Dialog>
    </>
  );
}

interface DialogInhaltProps extends TeilnehmerHinzufuegenDialogProps {
  schritt: Schritt;
  onSchrittWechsel: (schritt: Schritt) => void;
  steuerung: DialogSteuerung;
}

// Suche und Auswahl leben hier, nicht im Auswahl-Schritt: sie überstehen den Wechsel zum Anlegen
// und zurück (spec-404 Q1), beginnen aber mit jedem Öffnen frisch, weil der Dialog seine Kinder
// nur offen mountet (ADR-053 D1).
function DialogInhalt({
  veranstaltungId,
  verfuegbar,
  schritt,
  onSchrittWechsel,
  steuerung,
}: DialogInhaltProps) {
  const [suche, setSuche] = useState("");
  const [gewaehlt, setGewaehlt] = useState<ReadonlySet<string>>(new Set());

  if (schritt.art === "anlegen") {
    return (
      <AnlegeSchritt
        veranstaltungId={veranstaltungId}
        namensVorschlag={schritt.namensVorschlag}
        steuerung={steuerung}
        onZurueck={() => onSchrittWechsel({ art: "auswahl" })}
      />
    );
  }

  function umschalten(id: string) {
    setGewaehlt((bisher) => {
      const neu = new Set(bisher);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }

  return (
    <AuswahlSchritt
      veranstaltungId={veranstaltungId}
      verfuegbar={verfuegbar}
      suche={suche}
      onSuche={setSuche}
      gewaehlt={gewaehlt}
      onUmschalten={umschalten}
      onAnlegen={(namensVorschlag) => onSchrittWechsel({ art: "anlegen", namensVorschlag })}
      steuerung={steuerung}
    />
  );
}

interface AuswahlSchrittProps {
  veranstaltungId: string;
  verfuegbar: readonly TeilnehmerAuswahl[];
  suche: string;
  onSuche: (suche: string) => void;
  gewaehlt: ReadonlySet<string>;
  onUmschalten: (id: string) => void;
  onAnlegen: (namensVorschlag: string) => void;
  steuerung: DialogSteuerung;
}

function AuswahlSchritt({
  veranstaltungId,
  verfuegbar,
  suche,
  onSuche,
  gewaehlt,
  onUmschalten,
  onAnlegen,
  steuerung,
}: AuswahlSchrittProps) {
  const { state, pending, absenden } = useDialogFormular(addZeilenAction, steuerung, {
    erfolgsMeldung: "Teilnehmer hinzugefügt",
  });

  if (verfuegbar.length === 0) {
    // Die Meldung bleibt auch hier stehen: war die abgelehnte Person die letzte verfügbare, ist
    // die Auswahl nach dem Neu-Rendern leer, ihr Name gehört trotzdem angezeigt (FS2).
    return (
      <>
        <p className="text-sm text-muted">Alle aktiven Teilnehmer sind bereits hinzugefügt.</p>
        <Notice kind="fehler">{state?.error}</Notice>
        <AnlegenAbsprung namensVorschlag="" onAnlegen={onAnlegen} gesperrt={steuerung.gesperrt} />
        <div className="flex justify-end">
          <Button variant="secondary" onClick={steuerung.schliessen} disabled={steuerung.gesperrt}>
            Abbrechen
          </Button>
        </div>
      </>
    );
  }

  const suchtext = suche.trim();
  const begriff = suchtext.toLocaleLowerCase("de");
  const treffer = verfuegbar.filter((person) =>
    person.name.toLocaleLowerCase("de").includes(begriff),
  );
  const keinTreffer = treffer.length === 0;

  return (
    <>
      <Field
        label="Suchen"
        type="search"
        value={suche}
        onChange={(event) => onSuche(event.target.value)}
        autoComplete="off"
      />
      {keinTreffer ? (
        <p className="text-sm text-muted">Kein Teilnehmer passt zu „{suchtext}“.</p>
      ) : (
        <ul className="flex max-h-64 flex-col overflow-y-auto">
          {treffer.map((person) => (
            <li key={person.id}>
              <label className="flex min-h-11 items-center gap-3 break-words">
                <input
                  type="checkbox"
                  value={person.id}
                  checked={gewaehlt.has(person.id)}
                  onChange={() => onUmschalten(person.id)}
                  className="h-5 w-5 shrink-0 accent-accent"
                />
                <span className="min-w-0">{person.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <AnlegenAbsprung
        namensVorschlag={keinTreffer ? suchtext : ""}
        onAnlegen={onAnlegen}
        gesperrt={steuerung.gesperrt}
      />
      <form onSubmit={absenden} className="flex flex-col gap-3">
        <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
        {/* Die Auswahl wird aus dem Zustand abgeschickt, nicht aus den sichtbaren Checkboxen:
            die Suche filtert nur die Anzeige, eine angehakte Person bleibt gewählt. */}
        {verfuegbar
          .filter((person) => gewaehlt.has(person.id))
          .map((person) => (
            <input key={person.id} type="hidden" name="teilnehmerId" value={person.id} />
          ))}
        <Notice kind="fehler">{state?.error}</Notice>
        <DialogAktionen
          steuerung={steuerung}
          pending={pending}
          label="Hinzufügen"
          laufLabel="Hinzufügen …"
        />
      </form>
    </>
  );
}

interface AnlegenAbsprungProps {
  /** Leer: „Teilnehmer anlegen"; sonst übernimmt der Schritt den Suchtext (spec-404 AK3.3). */
  namensVorschlag: string;
  onAnlegen: (namensVorschlag: string) => void;
  gesperrt: boolean;
}

function AnlegenAbsprung({ namensVorschlag, onAnlegen, gesperrt }: AnlegenAbsprungProps) {
  return (
    <Button
      variant="ghost"
      onClick={() => onAnlegen(namensVorschlag)}
      disabled={gesperrt}
      className="self-start break-words"
    >
      {namensVorschlag ? `„${namensVorschlag}“ als Teilnehmer anlegen` : "Teilnehmer anlegen"}
    </Button>
  );
}

interface AnlegeSchrittProps {
  veranstaltungId: string;
  namensVorschlag: string;
  steuerung: DialogSteuerung;
  onZurueck: () => void;
}

// Jede Ablehnung betrifft den eingegebenen Namen oder den Zustand der Veranstaltung; das
// Namensfeld ist die einzige Freitexteingabe und trägt sie deshalb als Feldfehler (spec-404 AK4.4).
function AnlegeSchritt({
  veranstaltungId,
  namensVorschlag,
  steuerung,
  onZurueck,
}: AnlegeSchrittProps) {
  const { state, pending, absenden } = useDialogFormular(createWalkInAction, steuerung, {
    erfolgsMeldung: "Teilnehmer angelegt und hinzugefügt",
  });

  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <Button
        variant="ghost"
        onClick={onZurueck}
        disabled={steuerung.gesperrt}
        className="self-start"
      >
        ← Zur Auswahl
      </Button>
      <p className="text-sm text-muted">
        Der Teilnehmer wird angelegt und direkt zu dieser Veranstaltung hinzugefügt.
      </p>
      <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
      <TeilnehmerFields namensVorschlag={namensVorschlag} nameFehler={state?.error} />
      <DuplikatWarnung state={state} />
      <DialogAktionen
        steuerung={steuerung}
        pending={pending}
        label={anlegenLabel(state)}
        laufLabel="Anlegen …"
      />
    </form>
  );
}
