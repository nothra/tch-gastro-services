"use client";

import { useActionState } from "react";
import type { Catalog } from "@/db/schema";
import { setVeranstaltungCatalogAction } from "./actions";

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// Beschriftung der Platzhalter-Option für eine bestehende Zuordnung auf einen inzwischen
// deaktivierten Katalog (#346 AK6): sie hält den Ist-Zustand sichtbar, ohne ihn als Wechselziel
// anzubieten. Ohne sie zeigte das Select stumm einen fremden Katalog an, und ein Absenden ohne
// bewusste Auswahl löste einen ungewollten Wechsel aus.
const NICHT_MEHR_WAEHLBAR = "Aktuell zugeordnet (nicht mehr wählbar)";

// Wechsel der Preisliste einer noch offenen Veranstaltung (F4, #346 AK3). Client-Komponente nach
// dem Muster von StatusToggle: die serverseitige Ablehnung – abgeschlossene Veranstaltung (AK5),
// deaktivierter Zielkatalog (AK6) oder bereits erfasster Verzehr (AK4) – wird über useActionState
// sichtbar (Codify #49, kein useEffect). Die Veranstaltungs-Id reist als verstecktes Feld, wie
// beim Status-Umschalter.
export function KatalogWechsel({
  id,
  catalogId,
  kataloge,
}: {
  id: string;
  catalogId: string;
  kataloge: Catalog[];
}) {
  const [state, formAction, pending] = useActionState(setVeranstaltungCatalogAction, undefined);
  const zugeordneterKatalogWaehlbar = kataloge.some((katalog) => katalog.id === catalogId);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="flex w-fit flex-col gap-1 text-sm">
        Katalog
        <select name="catalogId" defaultValue={catalogId} className={inputClass}>
          {!zugeordneterKatalogWaehlbar && <option value={catalogId}>{NICHT_MEHR_WAEHLBAR}</option>}
          {kataloge.map((katalog) => (
            <option key={katalog.id} value={katalog.id}>
              {katalog.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
      >
        {pending ? "Speichern …" : "Katalog wechseln"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Katalog gewechselt.</p>}
    </form>
  );
}
