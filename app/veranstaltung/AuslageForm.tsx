"use client";

import type { AuslageKategorie } from "@/db/schema";
import {
  DialogAktionen,
  useDialogFormular,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { Field, SelectField } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import type { FormAction } from "@/app/components/useSchliessendeAction";
import { AUSLAGE_KATEGORIE_LABEL, AUSLAGE_KATEGORIE_ORDER } from "./labels";
import type { AuslageFormState } from "./actions";

// Erfassungs-/Korrektur-Formular einer Auslage im Dialog (F6, #53, ADR-028 D4, ADR-061 D4).
// `action` ist die bereits scope-gebundene Server-Action (create: `.bind(null, veranstaltungId)`,
// edit: `.bind(null, veranstaltungId, auslageId)`); der Client liefert die IDs nie im Formular
// (IDOR-Schutz sitzt serverseitig). Absenden, Schließen und Lauf-Sperre kommen aus
// `useDialogFormular` – Eingaben bleiben nach einer Ablehnung stehen (Lesson #373).

const KEINE_TEILNEHMER =
  "Zuerst Teilnehmer zur Veranstaltung hinzufügen, dann sind Auslagen erfassbar.";
const PLATZHALTER = "Bitte wählen …";

export type AuslageFormTeilnehmer = { teilnehmerId: string; anzeigename: string };

// Vorbelegung beim Korrigieren; `betrag` ist der rohe EUR-Eingabewert (centsToEuroInput).
export type AuslageFormInitial = {
  teilnehmerId: string;
  kategorie: AuslageKategorie;
  betrag: string;
  zweck: string;
};

interface AuslageFormularProps {
  action: FormAction<AuslageFormState>;
  teilnehmer: readonly AuslageFormTeilnehmer[];
  /** Gesetzt → Bearbeiten („Speichern"), sonst Erfassen. */
  initial?: AuslageFormInitial;
  steuerung: DialogSteuerung;
}

export function AuslageFormular({ action, teilnehmer, initial, steuerung }: AuslageFormularProps) {
  const bearbeiten = initial !== undefined;
  const { state, pending, absenden } = useDialogFormular(action, steuerung, {
    erfolgsMeldung: bearbeiten ? "Gespeichert" : "Auslage erfasst",
  });
  const beschriftung = primaerBeschriftung(bearbeiten);

  // Ohne Teilnehmer bleibt die Fußzeile dieselbe wie sonst, nur der Primär-Knopf ist gesperrt
  // (spec-420 Q3) – so sieht der Dialog aus wie alle anderen. Das gilt auch beim Bearbeiten, wenn
  // alle Zeilen entfernt wurden.
  if (teilnehmer.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Notice kind="warnung">{KEINE_TEILNEHMER}</Notice>
        <DialogAktionen steuerung={steuerung} pending={false} {...beschriftung} deaktiviert />
      </div>
    );
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <AuslageFelder teilnehmer={teilnehmer} initial={initial} />
      <Notice kind="fehler">{state?.error}</Notice>
      <DialogAktionen steuerung={steuerung} pending={pending} {...beschriftung} />
    </form>
  );
}

function primaerBeschriftung(bearbeiten: boolean) {
  return bearbeiten
    ? { label: "Speichern", laufLabel: "Speichern …" }
    : { label: "Erfassen", laufLabel: "Erfassen …" };
}

interface AuslageFelderProps {
  teilnehmer: readonly AuslageFormTeilnehmer[];
  initial?: AuslageFormInitial;
}

function AuslageFelder({ teilnehmer, initial }: AuslageFelderProps) {
  return (
    <>
      <SelectField
        label="Teilnehmer"
        name="teilnehmerId"
        defaultValue={initial?.teilnehmerId ?? ""}
        required
      >
        <option value="" disabled>
          {PLATZHALTER}
        </option>
        {teilnehmer.map((t) => (
          <option key={t.teilnehmerId} value={t.teilnehmerId}>
            {t.anzeigename}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Kategorie"
        name="kategorie"
        defaultValue={initial?.kategorie ?? ""}
        required
      >
        <option value="" disabled>
          {PLATZHALTER}
        </option>
        {AUSLAGE_KATEGORIE_ORDER.map((kategorie) => (
          <option key={kategorie} value={kategorie}>
            {AUSLAGE_KATEGORIE_LABEL[kategorie]}
          </option>
        ))}
      </SelectField>

      <Field
        label="Betrag (€)"
        name="betrag"
        type="text"
        inputMode="decimal"
        defaultValue={initial?.betrag ?? ""}
        required
        placeholder="z. B. 12,50"
      />

      <Field
        label="Notiz (optional)"
        name="zweck"
        type="text"
        maxLength={200}
        defaultValue={initial?.zweck ?? ""}
        placeholder="z. B. Grillfleisch"
      />
    </>
  );
}
