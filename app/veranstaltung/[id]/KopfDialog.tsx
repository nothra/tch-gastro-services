"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { IconButton } from "@/app/components/ui/IconButton";

// Client-Hülle für die Dialoge im Seitenkopf der Detailseite (spec-391, ADR-056 D3): Symbol-
// Schaltfläche öffnet einen Dialog, dessen Titel ihr Name ist. Genutzt für „Link & QR teilen" und
// „Einstellungen". Der Inhalt kommt als `children` – beim Teilen aus der Server Component
// `ZugangTeilen`, damit `qrcode` aus dem Client-Bundle bleibt (ADR-053 D5, #307).
//
// Nach erfolgreichem Speichern bleibt der Dialog bewusst offen: die Formulare zeigen ihre
// Erfolgsmeldung darin, `revalidatePath` aktualisiert die Seite dahinter (ADR-056 D3).
export function KopfDialog({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ausloeserRef = useRef<HTMLButtonElement>(null);
  const schliessen = () => setOpen(false);

  return (
    <>
      <IconButton ref={ausloeserRef} label={label} icon={icon} onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={schliessen} title={label} returnFocusRef={ausloeserRef}>
        {children}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={schliessen}>
            Schließen
          </Button>
        </div>
      </Dialog>
    </>
  );
}
