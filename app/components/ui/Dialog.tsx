"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-053 D1): modaler Dialog auf nativem `<dialog>`. Escape und
// inerter Hintergrund (damit kein eigener Fokus-Trap wie in #134) kommen von der Plattform. Den
// Fokus-Rücksprung setzt der Baustein selbst: jsdom und ältere Browser leisten ihn nicht, und
// Safari fokussiert einen getippten Button gar nicht erst – deshalb das explizite
// `returnFocusRef`.

interface DialogProps {
  open: boolean;
  /** Meldet jedes Schließen durch den Nutzer (Escape, nativer Schließweg). */
  onClose: () => void;
  /**
   * `false` sperrt Escape: ein Schließen während einer laufenden Action schlösse nur den Dialog,
   * während der Server den Vorgang trotzdem ausführt – eine Ablehnung sähe dann niemand. Die
   * Schaltflächen im Inhalt sperrt der Konsument selbst.
   */
  schliessbar?: boolean;
  title: string;
  description?: ReactNode;
  /**
   * Rücksprungziel beim Schließen, in der Regel der Auslöser. Ohne Angabe gilt das beim Öffnen
   * fokussierte Element – in Safari ist das nach einem Tipp nur `<body>`.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Layout des Dialog-Inhalts (Abstände) – nicht für Farben (ADR-052 D1). */
  className?: string;
  children: ReactNode;
}

/**
 * Kontrollierter modaler Dialog. Die Kinder werden nur bei geöffnetem Dialog gemountet: jedes
 * Öffnen beginnt für Zustand **in den Kindern** frisch, ein Fehler aus dem letzten Durchlauf
 * kann dort nicht stehen bleiben (ADR-053 D1). Zustand beim Konsumenten (z. B. ein
 * `useActionState` außerhalb des Dialogs) überlebt das Schließen dagegen.
 */
export function Dialog({
  open,
  onClose,
  schliessbar = true,
  title,
  description,
  returnFocusRef,
  className,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Synchronisiert den React-Zustand mit dem DOM-Zustand des `<dialog>` – ein externes System,
  // deshalb ein Effekt und kein Event-Handler.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      triggerRef.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    // Den nativen Schließvorgang übernimmt der Effekt, sobald der Konsument `open` zurücknimmt –
    // so bleibt der React-Zustand die einzige Quelle für „offen".
    event.preventDefault();
    if (schliessbar) onClose();
  }

  function handleClose() {
    const ruecksprungziel = returnFocusRef?.current ?? triggerRef.current;
    if (ruecksprungziel instanceof HTMLElement) ruecksprungziel.focus();
    triggerRef.current = null;
    // Nur ein Schließen, das nicht vom Konsumenten selbst ausging, wird zurückgemeldet.
    if (open) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClose={handleClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line-subtle bg-surface p-0 text-foreground backdrop:bg-overlay"
    >
      {open && (
        <div className={joinClasses("flex flex-col gap-4 p-5", className)}>
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="break-words">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="break-words text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
