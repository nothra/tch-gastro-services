"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";

// Route-neutrale Hülle „Formular im Dialog" der Listenseiten (spec-373 AK1, AK4.3): Auslöser,
// modaler Dialog, Schließen bei Erfolg, Escape-Sperre während der Action.
//
// Abgeschickt wird über `onSubmit` + `startTransition` statt über `<form action>`: React setzt ein
// per `action` abgeschicktes Formular nach JEDER beendeten Action zurück – auch nach einer
// Ablehnung, und dann wären die Eingaben weg (AK1.4). Daher kein Rückgriff auf
// `app/veranstaltung/useSchliessendeAction.ts`, der genau diesen Weg nutzt.

type FormAction<State> = (prevState: State | undefined, formData: FormData) => Promise<State>;

export interface DialogSteuerung {
  schliessen: () => void;
  meldeLauf: (laeuft: boolean) => void;
  /** Eine Action läuft: Escape und Abbrechen sind gesperrt, damit keine Ablehnung verborgen bleibt. */
  gesperrt: boolean;
}

/** Zustand eines Dialogs mit eigenem Auslöser – für Konsumenten mit eigener Auslöser-Optik. */
export function useFormularDialog<T extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const ausloeserRef = useRef<T>(null);
  const schliessen = () => setOpen(false);

  const steuerung: DialogSteuerung = { schliessen, meldeLauf: setLaeuft, gesperrt: laeuft };
  return {
    ausloeserRef,
    oeffnen: () => setOpen(true),
    steuerung,
    dialogProps: { open, onClose: schliessen, schliessbar: !laeuft, returnFocusRef: ausloeserRef },
  };
}

/**
 * Verbindet eine Server Action mit dem Dialog: Erfolg schließt ihn, eine Ablehnung bleibt im
 * Zustand stehen. `absenden` gehört als `onSubmit` ans Formular.
 */
export function useDialogFormular<State extends { ok?: boolean }>(
  action: FormAction<State>,
  steuerung: DialogSteuerung,
) {
  const [state, dispatch, pending] = useActionState(
    async (prevState: State | undefined, formData: FormData) => {
      try {
        const result = await action(prevState, formData);
        if (result.ok) steuerung.schliessen();
        return result;
      } finally {
        steuerung.meldeLauf(false);
      }
    },
    undefined,
  );

  function absenden(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Dringlich gemeldet, nicht in der Transition – sonst würde die Sperre erst mit dem Ende der
    // Action sichtbar (Lesson #369).
    steuerung.meldeLauf(true);
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, pending, absenden };
}

interface AnlegeDialogProps {
  /** Beschriftung des Auslösers, z. B. „+ Neu" im Seitenkopf oder „Teilnehmer anlegen". */
  ausloeser: string;
  titel: string;
  variant?: ButtonVariant;
  children: (steuerung: DialogSteuerung) => ReactNode;
}

/**
 * Button + Anlege-Dialog. Seitenkopf und Leerzustand bekommen je eine eigene Instanz: der Fokus
 * kehrt so immer auf den Button zurück, der den Dialog geöffnet hat (AK1.5).
 */
export function AnlegeDialog({ ausloeser, titel, variant, children }: AnlegeDialogProps) {
  const { ausloeserRef, oeffnen, steuerung, dialogProps } = useFormularDialog();
  return (
    <>
      <Button ref={ausloeserRef} variant={variant} size="sm" onClick={oeffnen}>
        {ausloeser}
      </Button>
      <Dialog {...dialogProps} title={titel}>
        {children(steuerung)}
      </Dialog>
    </>
  );
}

interface DialogAktionenProps {
  steuerung: DialogSteuerung;
  pending: boolean;
  label: string;
  laufLabel: string;
}

/** Fußzeile der Dialog-Formulare: „Abbrechen" und Absenden, beide während der Action gesperrt. */
export function DialogAktionen({ steuerung, pending, label, laufLabel }: DialogAktionenProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="secondary" onClick={steuerung.schliessen} disabled={steuerung.gesperrt}>
        Abbrechen
      </Button>
      <Button type="submit" disabled={pending || steuerung.gesperrt}>
        {pending ? laufLabel : label}
      </Button>
    </div>
  );
}
