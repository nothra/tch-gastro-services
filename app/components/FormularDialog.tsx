"use client";

import { startTransition, useRef, useState, type FormEvent } from "react";
import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { useErsatzFokus } from "./useErsatzFokus";
import {
  useSchliessendeAction,
  type AktionsOptionen,
  type FormAction,
} from "./useSchliessendeAction";

// Route-neutrale Hülle „Formular im Dialog" der Listenseiten (spec-373 AK1, AK4.3): Auslöser,
// modaler Dialog, Schließen bei Erfolg, Escape-Sperre während der Action. Erfolgsregel und
// Lauf-Meldung kommen aus `useSchliessendeAction`; neu ist hier nur der Weg ans Formular.
//
// Abgeschickt wird über `onSubmit` + `startTransition` statt über `<form action>`: React setzt ein
// per `action` abgeschicktes Formular nach JEDER beendeten Action zurück – auch nach einer
// Ablehnung, und dann wären die Eingaben weg (AK1.4).

/** Es gibt je Seite genau einen Anlege-Auslöser im Seitenkopf; er trägt diese Id. */
const SEITENKOPF_AUSLOESER_ID = "anlegen-seitenkopf";

export interface DialogSteuerung {
  /** Schließen ohne Erfolg (Abbrechen): der Fokus kehrt auf den Auslöser zurück. */
  schliessen: () => void;
  /** Schließen nach Erfolg: verschwindet der Auslöser dabei, greift das Ersatz-Fokusziel. */
  schliessenNachErfolg: () => void;
  meldeLauf: (laeuft: boolean) => void;
  /** Eine Action läuft: Escape und Abbrechen sind gesperrt, damit keine Ablehnung verborgen bleibt. */
  gesperrt: boolean;
}

/**
 * Zustand eines Dialogs mit eigenem Auslöser – für Konsumenten mit eigener Auslöser-Optik.
 * `ersatzFokusId` ist das Fokusziel, falls der Auslöser nach einem Erfolg ausgehängt wird, weil
 * die Revalidierung den Seitenzweig tauscht (Lesson #371): Leerzustand → Liste, oder eine
 * Katalogzeile, die in eine andere Kategorie wandert und dort neu gemountet wird.
 */
export function useFormularDialog(ersatzFokusId?: string) {
  const [open, setOpen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const ausloeserRef = useRef<HTMLButtonElement>(null);
  const { zuruecksetzen, markiereErfolg } = useErsatzFokus(ersatzFokusId);
  const schliessen = () => setOpen(false);

  const steuerung: DialogSteuerung = {
    schliessen,
    schliessenNachErfolg: () => {
      markiereErfolg();
      setOpen(false);
    },
    meldeLauf: setLaeuft,
    gesperrt: laeuft,
  };
  return {
    ausloeserRef,
    oeffnen: () => {
      zuruecksetzen();
      setOpen(true);
    },
    steuerung,
    dialogProps: { open, onClose: schliessen, schliessbar: !laeuft, returnFocusRef: ausloeserRef },
  };
}

/**
 * Verbindet eine Server Action mit dem Dialog: Erfolg schließt ihn und meldet `erfolgsMeldung`
 * als Toast, eine Ablehnung bleibt im Zustand stehen. `absenden` gehört als `onSubmit` ans
 * Formular.
 */
export function useDialogFormular<State extends { ok?: boolean }>(
  action: FormAction<State>,
  steuerung: DialogSteuerung,
  { erfolgsMeldung }: Pick<AktionsOptionen<State>, "erfolgsMeldung">,
) {
  const [state, formAction, pending, meldeStart] = useSchliessendeAction(action, {
    onErfolg: steuerung.schliessenNachErfolg,
    onLaeuftChange: steuerung.meldeLauf,
    erfolgsMeldung,
  });

  function absenden(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Dringlich gemeldet, nicht in der Transition – sonst würde die Sperre erst mit dem Ende der
    // Action sichtbar (Lesson #369).
    meldeStart();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return { state, pending, absenden };
}

interface FormularDialogProps {
  /** Beschriftung des Auslösers, z. B. „+ Neu" im Seitenkopf oder „Umbenennen". */
  ausloeser: string;
  ausloeserVariant: "primary" | "secondary";
  ausloeserId?: string;
  titel: string;
  beschreibung?: string;
  /** Fokusziel, falls ein Erfolg den Auslöser aushängt (siehe `useFormularDialog`). */
  ersatzFokusId?: string;
  /** Mountet erst beim Öffnen: jedes Öffnen beginnt ohne die Ablehnung des letzten Versuchs. */
  children: (steuerung: DialogSteuerung) => ReactNode;
}

/** Button + Dialog mit Formular – für Auslöser in der Standard-Optik von `Button`. */
export function FormularDialog({
  ausloeser,
  ausloeserVariant,
  ausloeserId,
  titel,
  beschreibung,
  ersatzFokusId,
  children,
}: FormularDialogProps) {
  const { ausloeserRef, oeffnen, steuerung, dialogProps } = useFormularDialog(ersatzFokusId);
  return (
    <>
      <Button
        ref={ausloeserRef}
        id={ausloeserId}
        variant={ausloeserVariant}
        size="sm"
        onClick={oeffnen}
      >
        {ausloeser}
      </Button>
      <Dialog {...dialogProps} title={titel} description={beschreibung}>
        {children(steuerung)}
      </Dialog>
    </>
  );
}

interface AnlegeDialogProps {
  ausloeser: string;
  titel: string;
  /**
   * Zweite, ruhigere Instanz im Leerzustand (AK6.1). Nach einem Erfolg verschwindet sie mit dem
   * Leerzustand; der Fokus geht dann auf den Auslöser im Seitenkopf.
   */
  imLeerzustand?: boolean;
  children: (steuerung: DialogSteuerung) => ReactNode;
}

/**
 * Anlege-Dialog der Listenseiten. Seitenkopf und Leerzustand bekommen je eine eigene Instanz: beim
 * Abbrechen kehrt der Fokus so auf den Button zurück, der den Dialog geöffnet hat (AK1.5).
 */
export function AnlegeDialog({
  ausloeser,
  titel,
  imLeerzustand = false,
  children,
}: AnlegeDialogProps) {
  return (
    <FormularDialog
      ausloeser={ausloeser}
      ausloeserVariant={imLeerzustand ? "secondary" : "primary"}
      ausloeserId={imLeerzustand ? undefined : SEITENKOPF_AUSLOESER_ID}
      ersatzFokusId={imLeerzustand ? SEITENKOPF_AUSLOESER_ID : undefined}
      titel={titel}
    >
      {children}
    </FormularDialog>
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
