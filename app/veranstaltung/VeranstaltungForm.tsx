"use client";

import { useActionState } from "react";
import { KASSEN, STANDARD_CATALOG_ID, type Catalog } from "@/db/schema";
import { createVeranstaltungAction } from "./actions";
import { KASSE_LABEL } from "./labels";

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// Anlege-Formular für eine datierte Veranstaltung. Bei Erfolg leert `key` die Felder für
// die nächste Anlage; bei Fehlern bleibt die Eingabe stehen.
// `kataloge` sind die bereits auf `active` gefilterten Preislisten (#346 AK1/AK6) – die Seite
// filtert, das Formular zeigt nur. Die Auswahl ist Bedien-Komfort; die Action prüft Existenz und
// Aktiv-Status serverseitig erneut (FS1).
export function VeranstaltungForm({ kataloge }: { kataloge: Catalog[] }) {
  const [state, formAction, pending] = useActionState(createVeranstaltungAction, undefined);
  // Vorbelegung ist der Standard-Katalog – der Regelfall kostet damit keinen Klick (AK1). Ist er
  // deaktiviert, fehlt er in `kataloge`; dann fällt die Vorbelegung auf die erste angebotene
  // Option zurück, statt eine nicht wählbare Id an die Action zu schicken.
  const vorbelegung = kataloge.some((katalog) => katalog.id === STANDARD_CATALOG_ID)
    ? STANDARD_CATALOG_ID
    : kataloge[0]?.id;
  return (
    <form
      key={state?.ok ? "reset" : "edit"}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-semibold">Veranstaltung anlegen</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Bezeichnung
          <input name="bezeichnung" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Datum
          <input type="date" name="datum" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kasse
          <select name="kasse" defaultValue={KASSEN[0]} className={inputClass}>
            {KASSEN.map((kasse) => (
              <option key={kasse} value={kasse}>
                {KASSE_LABEL[kasse]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Katalog
          <select name="catalogId" defaultValue={vorbelegung} className={inputClass}>
            {kataloge.map((katalog) => (
              <option key={katalog.id} value={katalog.id}>
                {katalog.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-cyan-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Anlegen"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">Veranstaltung angelegt.</p>}
      </div>
    </form>
  );
}
