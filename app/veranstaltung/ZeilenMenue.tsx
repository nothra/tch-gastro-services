"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { removeZeileAction, type VeranstaltungFormState } from "./actions";

// Zeilenmenü einer Teilnehmerzeile (spec-369 AK18–AK20, ADR-053 D2). Bewusst feature-lokal und
// nicht unter `ui/`: es hat genau einen Konsumenten, ein projektweites Menü-Muster ist noch nicht
// belegt. „Entfernen" wirkt erst nach der Bestätigung im `ConfirmDialog`.

interface ZeilenMenueProps {
  veranstaltungId: string;
  zeileId: string;
  name: string;
}

export function ZeilenMenue({ veranstaltungId, zeileId, name }: ZeilenMenueProps) {
  const [menueOffen, setMenueOffen] = useState(false);
  const [bestaetigungOffen, setBestaetigungOffen] = useState(false);
  // Jedes Öffnen der Bestätigung ist ein neuer Versuch: der wechselnde `key` setzt den
  // Action-Zustand zurück, damit keine Ablehnung aus einem früheren Durchlauf stehen bleibt.
  const [durchlauf, setDurchlauf] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ersterEintragRef = useRef<HTMLButtonElement>(null);

  // Außenklick schließt das Menü – ein Listener am Dokument ist ein externes System.
  useEffect(() => {
    if (!menueOffen) return;
    ersterEintragRef.current?.focus();
    function schliessenBeiAussenklick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setMenueOffen(false);
    }
    document.addEventListener("pointerdown", schliessenBeiAussenklick);
    return () => document.removeEventListener("pointerdown", schliessenBeiAussenklick);
  }, [menueOffen]);

  function menueSchliessen() {
    setMenueOffen(false);
    triggerRef.current?.focus();
  }

  function entfernenWaehlen() {
    // Den Fokus VOR dem Öffnen auf den Auslöser legen: der Dialog merkt sich das fokussierte
    // Element als Rücksprungziel, und der Menüeintrag verschwindet gleich.
    menueSchliessen();
    setDurchlauf((bisher) => bisher + 1);
    setBestaetigungOffen(true);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="min-w-11 text-lg"
        aria-haspopup="menu"
        aria-expanded={menueOffen}
        aria-label={`Aktionen für ${name}`}
        onClick={() => setMenueOffen((offen) => !offen)}
      >
        <span aria-hidden="true">⋯</span>
      </Button>

      {menueOffen && (
        <div
          role="menu"
          aria-label={`Aktionen für ${name}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") menueSchliessen();
          }}
          className="absolute right-0 z-10 mt-1 min-w-40 rounded-md border border-line-subtle bg-surface p-1 shadow-md"
        >
          <button
            ref={ersterEintragRef}
            type="button"
            role="menuitem"
            onClick={entfernenWaehlen}
            className="flex min-h-11 w-full items-center rounded px-3 text-left text-danger hover:bg-danger-subtle focus-visible:outline-2 focus-visible:outline-accent"
          >
            Entfernen
          </button>
        </div>
      )}

      <EntfernenBestaetigung
        key={durchlauf}
        open={bestaetigungOffen}
        onClose={() => setBestaetigungOffen(false)}
        veranstaltungId={veranstaltungId}
        zeileId={zeileId}
        name={name}
      />
    </div>
  );
}

interface EntfernenBestaetigungProps extends ZeilenMenueProps {
  open: boolean;
  onClose: () => void;
}

function EntfernenBestaetigung({
  open,
  onClose,
  veranstaltungId,
  zeileId,
  name,
}: EntfernenBestaetigungProps) {
  // Die Hülle umschließt die Action und schließt den Dialog bei Erfolg – ohne `useEffect` auf den
  // Rückgabe-State (Lesson `react-hooks/set-state-in-effect`, ADR-053 Implementierungs-Hinweise).
  const [state, formAction, pending] = useActionState(
    async (prevState: VeranstaltungFormState | undefined, formData: FormData) => {
      const result = await removeZeileAction(prevState, formData);
      if (result.ok) onClose();
      return result;
    },
    undefined,
  );

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Teilnehmer entfernen?"
      description={`„${name}“ wird aus dieser Veranstaltung entfernt.`}
      confirmLabel="Entfernen"
      pendingLabel="Entfernen …"
      variant="danger"
      action={formAction}
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
      <input type="hidden" name="zeileId" value={zeileId} />
    </ConfirmDialog>
  );
}
