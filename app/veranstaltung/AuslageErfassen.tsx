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
}

// „+ Neu" der Auslagen-Seite (spec-406 AK1): das Erfassen-Formular im Anlege-Dialog statt
// dauerhaft über der Liste. Einziger Auslöser – der Leerzustand hat keinen eigenen (spec-420 Q2).
export function AuslageErfassen({ action, teilnehmer, ausloeser }: AuslageErfassenProps) {
  return (
    <AnlegeDialog ausloeser={ausloeser} titel="Auslage erfassen">
      {(steuerung) => (
        <AuslageFormular action={action} teilnehmer={teilnehmer} steuerung={steuerung} />
      )}
    </AnlegeDialog>
  );
}
