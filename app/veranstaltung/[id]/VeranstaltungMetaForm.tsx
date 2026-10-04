"use client";

import { useActionState, useState } from "react";
import { KASSEN, type Kasse } from "@/db/schema";
import { Button } from "@/app/components/ui/Button";
import { Field, SelectField } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import { updateVeranstaltungMetaAction } from "../actions";
import { KASSE_LABEL, formatDatumInput } from "../labels";

// Bearbeiten der Metadaten einer noch offenen, datierten Veranstaltung (#352 AK1) – seit #391 im
// Dialog „Einstellungen" des Seitenkopfs, dessen Titel die `h2` ist; daher hier eine `h3`.
// Client-Komponente nach dem Muster von KatalogWechsel: die serverseitige Ablehnung – Pflichtfeld
// verletzt (AK2), Veranstaltung abgeschlossen (AK3) oder Theke (AK10) – wird über useActionState
// sichtbar (Codify #49, kein useEffect). Die Veranstaltungs-Id reist als verstecktes Feld.
//
// Alle drei Felder sind mit dem Ist-Zustand vorbelegt: das Formular schickt immer alle drei, wer
// nur eines ändert, darf die anderen nicht versehentlich überschreiben. Ein Katalog-Feld gibt es
// bewusst NICHT – der Wechsel bleibt der eigene Weg aus #346 mit eigener Verzehr-Sperre.
//
// „Änderungen gespeichert." behauptet einen Speicherstand und verschwindet deshalb, sobald der
// Nutzer weitertippt – sonst stünde die Bestätigung über einem Formularinhalt, der so nie
// gespeichert wurde. Die Fehlermeldung bleibt bewusst stehen: sie ist kein Zustandsbericht,
// sondern die Aufforderung, die gerade laufende Korrektur zu Ende zu bringen.
export function VeranstaltungMetaForm({
  id,
  bezeichnung,
  datum,
  kasse,
}: {
  id: string;
  bezeichnung: string;
  datum: Date | null;
  kasse: Kasse;
}) {
  const [state, formAction, pending] = useActionState(updateVeranstaltungMetaAction, undefined);
  const [geaendertSeitSpeichern, setGeaendertSeitSpeichern] = useState(false);
  return (
    <form
      action={formAction}
      onChange={() => setGeaendertSeitSpeichern(true)}
      onSubmit={() => setGeaendertSeitSpeichern(false)}
      className="flex flex-col gap-3"
    >
      <h3 className="font-semibold text-foreground">Veranstaltung bearbeiten</h3>
      <input type="hidden" name="id" value={id} />
      <Field label="Bezeichnung" name="bezeichnung" defaultValue={bezeichnung} required />
      <Field
        label="Datum"
        type="date"
        name="datum"
        defaultValue={formatDatumInput(datum)}
        required
      />
      <SelectField label="Kasse" name="kasse" defaultValue={kasse}>
        {KASSEN.map((option) => (
          <option key={option} value={option}>
            {KASSE_LABEL[option]}
          </option>
        ))}
      </SelectField>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {pending ? "Speichern …" : "Änderungen speichern"}
      </Button>
      <Notice kind="fehler">{state?.error}</Notice>
      <Notice kind="erfolg">
        {state?.ok && !geaendertSeitSpeichern && "Änderungen gespeichert."}
      </Notice>
    </form>
  );
}
