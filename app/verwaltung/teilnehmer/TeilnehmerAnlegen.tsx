"use client";

import {
  AnlegeDialog,
  DialogAktionen,
  useDialogFormular,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { Notice } from "@/app/components/ui/Notice";
import { createTeilnehmerAction } from "./actions";
import { anlegenLabel, DuplikatWarnung } from "./DuplikatWarnung";
import { TeilnehmerFields } from "./TeilnehmerFields";

// „+ Neu" der Teilnehmerliste (spec-373 AK8.1): das bisherige Anlege-Formular im Dialog.
export function TeilnehmerAnlegen({
  ausloeser,
  imLeerzustand,
}: {
  ausloeser: string;
  imLeerzustand?: boolean;
}) {
  return (
    <AnlegeDialog ausloeser={ausloeser} titel="Teilnehmer anlegen" imLeerzustand={imLeerzustand}>
      {(steuerung) => <TeilnehmerFormular steuerung={steuerung} />}
    </AnlegeDialog>
  );
}

function TeilnehmerFormular({ steuerung }: { steuerung: DialogSteuerung }) {
  const { state, pending, absenden } = useDialogFormular(createTeilnehmerAction, steuerung, {
    erfolgsMeldung: "Teilnehmer angelegt",
  });
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <TeilnehmerFields />
      <Notice kind="fehler">{state?.error}</Notice>
      <DuplikatWarnung state={state} />
      <DialogAktionen
        steuerung={steuerung}
        pending={pending}
        label={anlegenLabel(state)}
        laufLabel="Speichern …"
      />
    </form>
  );
}
