"use client";

import {
  AnlegeDialog,
  DialogAktionen,
  useDialogFormular,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import type { ButtonVariant } from "@/app/components/ui/Button";
import { Notice } from "@/app/components/ui/Notice";
import { createTeilnehmerAction } from "./actions";
import { TeilnehmerFields } from "./TeilnehmerFields";

// „+ Neu" der Teilnehmerliste (spec-373 AK8.1): das bisherige Anlege-Formular im Dialog.
export function TeilnehmerAnlegen({
  ausloeser,
  variant,
}: {
  ausloeser: string;
  variant?: ButtonVariant;
}) {
  return (
    <AnlegeDialog ausloeser={ausloeser} titel="Teilnehmer anlegen" variant={variant}>
      {(steuerung) => <TeilnehmerFormular steuerung={steuerung} />}
    </AnlegeDialog>
  );
}

// Bei der überstimmbaren Duplikat-Warnung setzt das versteckte confirmDuplicate-Feld auf "true",
// sodass der Zweitversuch die Warnung überstimmt und anlegt (ADR-022). Die Eingabe bleibt dabei
// stehen, weil der Dialog ohne Formular-Reset absendet.
function TeilnehmerFormular({ steuerung }: { steuerung: DialogSteuerung }) {
  const { state, pending, absenden } = useDialogFormular(createTeilnehmerAction, steuerung);
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <TeilnehmerFields />
      <input type="hidden" name="confirmDuplicate" value={state?.needsConfirm ? "true" : "false"} />
      <Notice kind="fehler">{state?.error}</Notice>
      {state?.needsConfirm && (
        <p role="status" className="text-sm text-warning">
          {state.warning}
        </p>
      )}
      <DialogAktionen
        steuerung={steuerung}
        pending={pending}
        label={state?.needsConfirm ? "Trotzdem anlegen" : "Anlegen"}
        laufLabel="Speichern …"
      />
    </form>
  );
}
