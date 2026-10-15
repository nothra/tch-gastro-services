"use client";

import { AnlegeDialog } from "@/app/components/FormularDialog";
import type { FormAction } from "@/app/components/useSchliessendeAction";
import { AuslageFormular, type AuslageFormTeilnehmer } from "./AuslageForm";
import type { AuslageFormState } from "./actions";

interface AuslageErfassenProps {
  /** `createAuslageAction`, serverseitig an die Veranstaltung gebunden (IDOR, Codify #51). */
  action: FormAction<AuslageFormState>;
  teilnehmer: readonly AuslageFormTeilnehmer[];
  ausloeser: string;
  imLeerzustand?: boolean;
}

// „+ Neu" der Auslagen-Seite (spec-406 AK1): das Erfassen-Formular im Anlege-Dialog statt
// dauerhaft über der Liste.
export function AuslageErfassen({
  action,
  teilnehmer,
  ausloeser,
  imLeerzustand,
}: AuslageErfassenProps) {
  return (
    <AnlegeDialog ausloeser={ausloeser} titel="Auslage erfassen" imLeerzustand={imLeerzustand}>
      {(steuerung) => (
        <AuslageFormular action={action} teilnehmer={teilnehmer} steuerung={steuerung} />
      )}
    </AnlegeDialog>
  );
}
