"use client";

import { useActionState } from "react";
import type { Catalog } from "@/db/schema";
import { Button } from "@/app/components/ui/Button";
import { SelectField } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import { setVeranstaltungCatalogAction } from "./actions";

// Beschriftung der Platzhalter-Option für eine bestehende Zuordnung auf einen inzwischen
// deaktivierten Katalog (#346 AK6): sie hält den Ist-Zustand sichtbar, ohne ihn als Wechselziel
// anzubieten. Ohne sie zeigte das Select stumm einen fremden Katalog an, und ein Absenden ohne
// bewusste Auswahl löste einen ungewollten Wechsel aus.
const NICHT_MEHR_WAEHLBAR = "Aktuell zugeordnet (nicht mehr wählbar)";

// Wechsel der Preisliste einer noch offenen Veranstaltung (F4, #346 AK3) – seit #391 im Dialog
// „Einstellungen" des Seitenkopfs. Client-Komponente nach dem Muster von StatusToggle: die
// serverseitige Ablehnung – abgeschlossene Veranstaltung (AK5), deaktivierter Zielkatalog (AK6)
// oder bereits erfasster Verzehr (AK4) – wird über useActionState sichtbar (Codify #49, kein
// useEffect). Die Veranstaltungs-Id reist als verstecktes Feld, wie beim Status-Umschalter.
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
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <SelectField label="Katalog" name="catalogId" defaultValue={catalogId}>
        {!zugeordneterKatalogWaehlbar && <option value={catalogId}>{NICHT_MEHR_WAEHLBAR}</option>}
        {kataloge.map((katalog) => (
          <option key={katalog.id} value={katalog.id}>
            {katalog.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {pending ? "Speichern …" : "Katalog wechseln"}
      </Button>
      <Notice kind="fehler">{state?.error}</Notice>
      <Notice kind="erfolg">{state?.ok && "Katalog gewechselt."}</Notice>
    </form>
  );
}
