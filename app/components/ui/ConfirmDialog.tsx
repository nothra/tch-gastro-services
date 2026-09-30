"use client";

import type { ReactNode } from "react";
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
  error?: string;
  /**
   * Sperrt beide Schaltflächen: ein „Abbrechen" während der laufenden Action schlösse nur den
   * Dialog, während der Server den Vorgang trotzdem ausführt.
   */
  pending?: boolean;
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
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
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
