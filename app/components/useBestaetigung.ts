"use client";

import { useRef, useState } from "react";
import { useErsatzFokusBeimAushaengen } from "./FormularDialog";

// Route-neutrale Steuerung einer Bestätigung (`ConfirmDialog`) mit eigenem Auslöser (spec-372
// AK1/AK3, Lesson #369: Verhaltensvertrag in den Baustein). Sie bündelt, was jede Bestätigung
// braucht: Offen-Zustand, Fokus-Rückgabe auf den Auslöser und einen `key` je Öffnen.

/**
 * `durchlauf` gehört als `key` an die Komponente, die den Action-Zustand der Bestätigung hält:
 * jedes Öffnen ist ein neuer Versuch, eine Ablehnung des letzten bleibt nicht stehen
 * (ConfirmDialog-JSDoc, ADR-053 D1). `ersatzFokusId` greift, wenn ein Erfolg den Auslöser
 * aushängt – etwa beim Löschen der Zeile, in der er steht (Lesson #371).
 */
export function useBestaetigung(ersatzFokusId?: string) {
  const [open, setOpen] = useState(false);
  const [durchlauf, setDurchlauf] = useState(0);
  const ausloeserRef = useRef<HTMLButtonElement>(null);
  const erfolgreichRef = useErsatzFokusBeimAushaengen(ersatzFokusId);
  const schliessen = () => setOpen(false);

  return {
    ausloeserRef,
    durchlauf,
    oeffnen: () => {
      erfolgreichRef.current = false;
      setDurchlauf((bisher) => bisher + 1);
      setOpen(true);
    },
    schliessenNachErfolg: () => {
      erfolgreichRef.current = true;
      setOpen(false);
    },
    dialogProps: { open, onClose: schliessen, returnFocusRef: ausloeserRef },
  };
}
