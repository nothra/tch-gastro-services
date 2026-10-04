"use client";

import { useActionState, useRef, useState, type RefObject } from "react";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { IconButton } from "@/app/components/ui/IconButton";
import { PapierkorbIcon } from "@/app/components/ui/icons";
import { deleteVeranstaltungAction } from "../actions";

// Endgültiges Löschen einer noch offenen, datierten Veranstaltung (#352 AK4/AK8) – ausgelöst über
// den Papierkorb im Seitenkopf (spec-391 AK11, ADR-056 D4). Der Bestätigungsdialog ist Pflicht
// (spec-352, „Gesetzte Entscheidungen"). Die serverseitige Ablehnung (Verzehr/Kassiert/Auslage
// erfasst) erscheint IM Dialog, weil der Nutzer nach dem Absenden dort steht. Bei Erfolg leitet die
// Action selbst zur Übersicht (AK9), dieser Zustand wird hier also nie gerendert.
//
// `ConfirmDialog` sperrt während der laufenden Action beide Schaltflächen und Escape: der Vorgang
// ist ein unumkehrbarer Hard-Delete – ein Abbrechen im Pending-Fenster schlösse nur den Dialog,
// während die Action serverseitig zu Ende löscht.
export function VeranstaltungLoeschen({ id, bezeichnung }: { id: string; bezeichnung: string }) {
  const [offen, setOffen] = useState(false);
  // Jedes Öffnen ist ein neuer Versuch: der wechselnde `key` erneuert den Action-Zustand, damit
  // keine Ablehnung aus einem früheren Durchlauf stehen bleibt (ConfirmDialog-JSDoc, ADR-053 D1).
  const [durchlauf, setDurchlauf] = useState(0);
  const papierkorbRef = useRef<HTMLButtonElement>(null);

  function oeffnen() {
    setDurchlauf((bisher) => bisher + 1);
    setOffen(true);
  }

  return (
    <>
      <IconButton
        ref={papierkorbRef}
        label="Veranstaltung löschen"
        tone="danger"
        icon={<PapierkorbIcon />}
        onClick={oeffnen}
      />
      <LoeschBestaetigung
        key={durchlauf}
        open={offen}
        onClose={() => setOffen(false)}
        id={id}
        bezeichnung={bezeichnung}
        returnFocusRef={papierkorbRef}
      />
    </>
  );
}

interface LoeschBestaetigungProps {
  open: boolean;
  onClose: () => void;
  id: string;
  bezeichnung: string;
  returnFocusRef: RefObject<HTMLElement | null>;
}

function LoeschBestaetigung({
  open,
  onClose,
  id,
  bezeichnung,
  returnFocusRef,
}: LoeschBestaetigungProps) {
  const [state, formAction, pending] = useActionState(deleteVeranstaltungAction, undefined);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Veranstaltung löschen?"
      description={`„${bezeichnung}“ wird endgültig entfernt – samt ihrer Teilnehmerzeilen. Das lässt sich nicht rückgängig machen.`}
      confirmLabel="Endgültig löschen"
      pendingLabel="Löschen …"
      variant="danger"
      action={formAction}
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="id" value={id} />
    </ConfirmDialog>
  );
}
