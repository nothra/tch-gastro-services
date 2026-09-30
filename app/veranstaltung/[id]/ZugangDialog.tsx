"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";

// Client-Hülle für „Link & QR teilen" (spec-369 AK22, ADR-053 D5): öffnet nur den Dialog. Der
// Inhalt kommt als `children` aus der Server Component `ZugangTeilen` – so bleibt `qrcode` aus dem
// Client-Bundle (ADR-034 D5/D6, #307).
export function ZugangDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const schliessen = () => setOpen(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="self-start">
        Link & QR teilen
      </Button>
      <Dialog open={open} onClose={schliessen} title="Link & QR teilen">
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
