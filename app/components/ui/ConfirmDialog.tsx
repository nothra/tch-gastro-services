"use client";

import type { ReactNode, RefObject } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Notice } from "./Notice";

// Route-neutraler Baustein (ADR-053 D1): Bestätigung auf der gemeinsamen `Dialog`-Grundlage –
// kein zweites Dialog-Verhalten (spec-369 AK30).

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Beschriftung der Bestätigung, solange die Action läuft. */
  pendingLabel?: string;
  variant?: "primary" | "danger";
  /** Formular-Action der Bestätigung – eine Server Action lässt sich direkt anschließen. */
  action: (formData: FormData) => void;
  /**
   * Meldung der Action. Sie stammt aus dem Zustand des Konsumenten, nicht aus den Kindern des
   * Dialogs – das frische Mounten beim Öffnen (ADR-053 D1) setzt sie also NICHT zurück; der
   * Konsument muss den Action-Zustand je Öffnen selbst erneuern (z. B. per `key`).
   */
  error?: string;
  /**
   * Sperrt beide Schaltflächen und Escape: ein Schließen während der laufenden Action schlösse
   * nur den Dialog, während der Server den Vorgang trotzdem ausführt – eine Ablehnung sähe
   * dann niemand.
   */
  pending?: boolean;
  /** Rücksprungziel beim Schließen, siehe `Dialog`. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Versteckte Felder, die mit der Bestätigung abgeschickt werden. */
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  pendingLabel,
  variant = "primary",
  action,
  error,
  pending = false,
  returnFocusRef,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      schliessbar={!pending}
      title={title}
      description={description}
      returnFocusRef={returnFocusRef}
    >
      <form action={action} className="flex flex-col gap-3">
        {children}
        <Notice kind="fehler">{error}</Notice>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="submit" variant={variant} disabled={pending}>
            {pending && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
