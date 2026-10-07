"use client";

import { KASSEN, STANDARD_CATALOG_ID, type Catalog } from "@/db/schema";
import {
  AnlegeDialog,
  DialogAktionen,
  useDialogFormular,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import type { ButtonVariant } from "@/app/components/ui/Button";
import { Field, SelectField } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import { createVeranstaltungAction } from "./actions";
import { KASSE_LABEL } from "./labels";

interface VeranstaltungAnlegenProps {
  /** Die bereits auf `active` gefilterten Preislisten (#346 AK1/AK6) – die Seite filtert. */
  kataloge: Catalog[];
  ausloeser: string;
  variant?: ButtonVariant;
}

// „+ Neu" der Veranstaltungsliste (spec-373 AK1): öffnet das bisherige Anlege-Formular im Dialog.
export function VeranstaltungAnlegen({ kataloge, ausloeser, variant }: VeranstaltungAnlegenProps) {
  return (
    <AnlegeDialog ausloeser={ausloeser} titel="Veranstaltung anlegen" variant={variant}>
      {(steuerung) => <VeranstaltungFormular kataloge={kataloge} steuerung={steuerung} />}
    </AnlegeDialog>
  );
}

// Die Katalog-Auswahl ist Bedien-Komfort; die Action prüft Existenz und Aktiv-Status serverseitig
// erneut (#346 FS1) – ihre Ablehnung erscheint im Dialog.
function VeranstaltungFormular({
  kataloge,
  steuerung,
}: {
  kataloge: Catalog[];
  steuerung: DialogSteuerung;
}) {
  const { state, pending, absenden } = useDialogFormular(createVeranstaltungAction, steuerung);
  // Vorbelegung ist der Standard-Katalog – der Regelfall kostet damit keinen Klick (#346 AK1). Ist
  // er deaktiviert, fehlt er in `kataloge`; dann fällt die Vorbelegung auf die erste angebotene
  // Option zurück, statt eine nicht wählbare Id an die Action zu schicken.
  const vorbelegung = kataloge.some((katalog) => katalog.id === STANDARD_CATALOG_ID)
    ? STANDARD_CATALOG_ID
    : kataloge[0]?.id;

  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <Field label="Bezeichnung" name="bezeichnung" required />
      <Field label="Datum" type="date" name="datum" required />
      <SelectField label="Kasse" name="kasse" defaultValue={KASSEN[0]}>
        {KASSEN.map((kasse) => (
          <option key={kasse} value={kasse}>
            {KASSE_LABEL[kasse]}
          </option>
        ))}
      </SelectField>
      <SelectField label="Katalog" name="catalogId" defaultValue={vorbelegung}>
        {kataloge.map((katalog) => (
          <option key={katalog.id} value={katalog.id}>
            {katalog.name}
          </option>
        ))}
      </SelectField>
      <Notice kind="fehler">{state?.error}</Notice>
      <DialogAktionen steuerung={steuerung} pending={pending} label="Anlegen" laufLabel="Speichern …" />
    </form>
  );
}
