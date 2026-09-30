"use client";

import { useRef, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Notice } from "@/app/components/ui/Notice";

type KopierStatus = "offen" | "kopiert" | "abgelehnt";

// Selbstbedienungs-Link mit Kopieren-Schaltfläche (spec-369 AK22, ADR-053 D5). Die Clipboard-API
// kann fehlen (kein sicherer Kontext) oder ablehnen (Berechtigung) – dann bleibt als Rückfall das
// markierte Nur-Lese-Feld, aus dem der Nutzer selbst kopiert.
export function LinkKopieren({ url }: { url: string }) {
  const feldRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<KopierStatus>("offen");

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("kopiert");
    } catch {
      feldRef.current?.focus();
      feldRef.current?.select();
      setStatus("abgelehnt");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          ref={feldRef}
          type="text"
          readOnly
          value={url}
          aria-label="Selbstbedienungs-Link"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-background px-3 py-2 font-mono text-sm text-foreground"
        />
        <Button variant="secondary" size="sm" onClick={kopieren}>
          Link kopieren
        </Button>
      </div>
      <Notice kind="erfolg">{status === "kopiert" && "Link kopiert."}</Notice>
      <Notice kind="fehler">
        {status === "abgelehnt" &&
          "Kopieren nicht möglich – der Link ist markiert und kann manuell kopiert werden."}
      </Notice>
    </div>
  );
}
