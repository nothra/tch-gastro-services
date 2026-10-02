"use client";

import { useRef, useState, type RefObject } from "react";
import type { VeranstaltungStatus } from "@/db/schema";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { formatCents } from "@/lib/money";
import { setStatusAction } from "../actions";
import { useSchliessendeAction } from "../useSchliessendeAction";

// Abschließen bzw. protokolliertes Wiederöffnen im Seitenkopf der Detailseite (spec-371
// AK18–AK22, ADR-055 D3). Beide Richtungen wirken erst nach der Bestätigung im `ConfirmDialog`.
// Die Entscheidung trifft weiterhin `setStatusAction` (fail-closed Gate ADR-033 D3, Protokoll,
// Theke-Ablehnung); Anzahl und Betrag offener Zeilen im Dialog sind nur Hinweis (FS1).

interface AbschlussAktionProps {
  id: string;
  status: VeranstaltungStatus;
  /** Aus `kassierTagessummen` (ADR-055 D1) – nur für den Hinweis im Abschluss-Dialog. */
  offeneZeilen?: number;
  offenerBetragCents?: number;
}

interface Richtung {
  ausloeser: string;
  title: string;
  confirmLabel: string;
  pendingLabel: string;
  zielStatus: VeranstaltungStatus;
}

const ABSCHLIESSEN: Richtung = {
  ausloeser: "Veranstaltung abschließen",
  title: "Veranstaltung abschließen?",
  confirmLabel: "Abschließen",
  pendingLabel: "Abschließen …",
  zielStatus: "abgeschlossen",
};

const WIEDER_OEFFNEN: Richtung = {
  ausloeser: "Wieder öffnen",
  title: "Veranstaltung wieder öffnen?",
  confirmLabel: "Wieder öffnen",
  pendingLabel: "Öffnen …",
  zielStatus: "offen",
};

export function AbschlussAktion({
  id,
  status,
  offeneZeilen = 0,
  offenerBetragCents = 0,
}: AbschlussAktionProps) {
  const [offen, setOffen] = useState(false);
  // Jedes Öffnen ist ein neuer Versuch: der wechselnde `key` setzt den Action-Zustand zurück,
  // damit keine Ablehnung aus einem früheren Durchlauf stehen bleibt (ConfirmDialog-JSDoc,
  // ADR-053 D1).
  const [durchlauf, setDurchlauf] = useState(0);
  const ausloeserRef = useRef<HTMLButtonElement>(null);
  const richtung = status === "offen" ? ABSCHLIESSEN : WIEDER_OEFFNEN;

  function oeffnen() {
    setDurchlauf((bisher) => bisher + 1);
    setOffen(true);
  }

  return (
    <>
      <Button ref={ausloeserRef} variant="secondary" size="sm" onClick={oeffnen}>
        {richtung.ausloeser}
      </Button>
      <StatusBestaetigung
        key={durchlauf}
        id={id}
        richtung={richtung}
        beschreibung={
          status === "offen"
            ? abschlussBeschreibung(offeneZeilen, offenerBetragCents)
            : "Die Veranstaltung wird wieder bearbeitbar. Das Wiederöffnen wird protokolliert."
        }
        open={offen}
        onClose={() => setOffen(false)}
        returnFocusRef={ausloeserRef}
      />
    </>
  );
}

function abschlussBeschreibung(offeneZeilen: number, offenerBetragCents: number): string {
  const folge = "Danach ist die Veranstaltung schreibgeschützt.";
  if (offeneZeilen === 0) return folge;
  const zeilen = offeneZeilen === 1 ? "1 Zeile" : `${offeneZeilen} Zeilen`;
  return `${zeilen} noch offen, zusammen ${formatCents(offenerBetragCents)}. ${folge}`;
}

interface StatusBestaetigungProps {
  id: string;
  richtung: Richtung;
  beschreibung: string;
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

function StatusBestaetigung({
  id,
  richtung,
  beschreibung,
  open,
  onClose,
  returnFocusRef,
}: StatusBestaetigungProps) {
  const [state, formAction, pending] = useSchliessendeAction(setStatusAction, onClose);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title={richtung.title}
      description={beschreibung}
      confirmLabel={richtung.confirmLabel}
      pendingLabel={richtung.pendingLabel}
      action={formAction}
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={richtung.zielStatus} />
    </ConfirmDialog>
  );
}
