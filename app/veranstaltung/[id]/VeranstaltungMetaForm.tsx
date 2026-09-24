"use client";

import { useActionState, useState } from "react";
import { KASSEN, type Kasse } from "@/db/schema";
import { updateVeranstaltungMetaAction } from "../actions";
import { KASSE_LABEL, formatDatumInput } from "../labels";

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// Bearbeiten der Metadaten einer noch offenen, datierten Veranstaltung (#352 AK1). Client-
// Komponente nach dem Muster von KatalogWechsel: die serverseitige Ablehnung – Pflichtfeld
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
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-semibold">Veranstaltung bearbeiten</h2>
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Bezeichnung
          <input name="bezeichnung" defaultValue={bezeichnung} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Datum
          <input
            type="date"
            name="datum"
            defaultValue={formatDatumInput(datum)}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kasse
          <select name="kasse" defaultValue={kasse} className={inputClass}>
            {KASSEN.map((option) => (
              <option key={option} value={option}>
                {KASSE_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          onClick={() => setGeaendertSeitSpeichern(false)}
          disabled={pending}
          className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          {pending ? "Speichern …" : "Änderungen speichern"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && !geaendertSeitSpeichern && (
          <p className="text-sm text-green-700">Änderungen gespeichert.</p>
        )}
      </div>
    </form>
  );
}
