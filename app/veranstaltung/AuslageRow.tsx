"use client";

import { useState, type RefObject } from "react";
import { centsToEuroInput, formatCents } from "@/lib/money";
import type { AuslageRow as AuslageRowData } from "@/db/auslage";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Notice } from "@/app/components/ui/Notice";
import { useBestaetigung } from "@/app/components/useBestaetigung";
import { useSchliessendeAction } from "@/app/components/useSchliessendeAction";
import { AUSLAGE_KATEGORIE_LABEL, AUSLAGE_STATUS_LABEL } from "./labels";
import { AuslageForm, type AuslageFormTeilnehmer } from "./AuslageForm";
import { removeAuslageAction, setAuslageStatusAction, updateAuslageAction } from "./actions";
import { AUSLAGEN_LISTE_ID } from "./auslagenListe";

// Bindet jede Auslagen-Mutation an Veranstaltung + Eintrag (IDOR, Codify #51) – von jedem
// der Mutations-Forms unten geteilt.
function HiddenIds({ veranstaltungId, auslageId }: { veranstaltungId: string; auslageId: string }) {
  return (
    <>
      <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
      <input type="hidden" name="id" value={auslageId} />
    </>
  );
}

interface AuslageRowProps {
  auslage: AuslageRowData;
  veranstaltungId: string;
  teilnehmer: readonly AuslageFormTeilnehmer[];
  editable: boolean;
}

// Eine Auslagen-Zeile (F6, #53, ADR-028): Anzeige plus – solange die Veranstaltung offen ist –
// Erstattung umschalten (offen ⇄ erstattet), Inline-Korrektur und Löschen. Alle Mutationen laufen
// über scope-gebundene Server-Actions; `veranstaltungId` steht als Hidden im WHERE (IDOR, Codify #51).
export function AuslageRow({ auslage, veranstaltungId, teilnehmer, editable }: AuslageRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    // veranstaltungId + auslageId sind serverseitig gebunden – der Client sendet sie nicht.
    const editAction = updateAuslageAction.bind(null, veranstaltungId, auslage.id);
    return (
      <li className="flex flex-col gap-3 rounded-md border border-line-subtle p-4">
        <AuslageForm
          action={editAction}
          teilnehmer={teilnehmer}
          submitLabel="Speichern"
          initial={{
            teilnehmerId: auslage.teilnehmerId,
            kategorie: auslage.kategorie,
            betrag: centsToEuroInput(auslage.betragCents),
            zweck: auslage.zweck ?? "",
          }}
          onSuccess={() => setEditing(false)}
        />
        <Button variant="secondary" size="sm" className="w-fit" onClick={() => setEditing(false)}>
          Abbrechen
        </Button>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-subtle p-4">
      <div className="flex min-w-0 flex-col">
        <span className="break-words font-medium">{auslage.anzeigename}</span>
        <span className="flex flex-wrap gap-x-1 text-sm text-muted">
          <span>{AUSLAGE_KATEGORIE_LABEL[auslage.kategorie]}</span>
          <span aria-hidden>·</span>
          <span>{formatCents(auslage.betragCents)}</span>
          <span aria-hidden>·</span>
          <span>{AUSLAGE_STATUS_LABEL[auslage.status]}</span>
          {auslage.zweck && (
            <>
              <span aria-hidden>·</span>
              <span className="break-words">{auslage.zweck}</span>
            </>
          )}
        </span>
      </div>

      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <ErstattungUmschalten auslage={auslage} veranstaltungId={veranstaltungId} />
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
          <AuslageLoeschen auslage={auslage} veranstaltungId={veranstaltungId} />
        </div>
      )}
    </li>
  );
}

interface AuslageAktionProps {
  auslage: AuslageRowData;
  veranstaltungId: string;
}

// Reversibel, deshalb ohne Bestätigung (spec-372 „Nicht inbegriffen"). Eine Ablehnung steht als
// Meldung an der Zeile statt stumm zu verpuffen (FS2).
function ErstattungUmschalten({ auslage, veranstaltungId }: AuslageAktionProps) {
  const erstattet = auslage.status === "erstattet";
  const [state, formAction, pending] = useSchliessendeAction(setAuslageStatusAction, {
    erfolgsMeldung: erstattet ? "Erstattung zurückgenommen" : "Auslage erstattet",
  });

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <HiddenIds veranstaltungId={veranstaltungId} auslageId={auslage.id} />
      <input type="hidden" name="status" value={erstattet ? "offen" : "erstattet"} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {erstattet ? "Erstattung zurücknehmen" : "Als erstattet markieren"}
      </Button>
      <Notice kind="fehler">{state?.error}</Notice>
    </form>
  );
}

// Löschen ist endgültig und fragt deshalb nach (spec-372 AK1, ADR-058 D4). Der Auslöser ist ein
// `type="button"` außerhalb jedes Formulars: auch vor der Hydration sendet er nichts ab (FS7).
function AuslageLoeschen({ auslage, veranstaltungId }: AuslageAktionProps) {
  // Nach dem Erfolg verschwindet die Zeile samt Auslöser – der Fokus geht auf die Liste.
  const { ausloeserRef, oeffnen, durchlauf, dialogProps, schliessenNachErfolg } =
    useBestaetigung(AUSLAGEN_LISTE_ID);

  return (
    <>
      <Button ref={ausloeserRef} variant="danger" size="sm" onClick={oeffnen}>
        Löschen
      </Button>
      <LoeschBestaetigung
        key={durchlauf}
        {...dialogProps}
        onErfolg={schliessenNachErfolg}
        auslage={auslage}
        veranstaltungId={veranstaltungId}
      />
    </>
  );
}

interface LoeschBestaetigungProps extends AuslageAktionProps {
  open: boolean;
  onClose: () => void;
  onErfolg: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

function LoeschBestaetigung({
  open,
  onClose,
  onErfolg,
  returnFocusRef,
  auslage,
  veranstaltungId,
}: LoeschBestaetigungProps) {
  const [state, formAction, pending] = useSchliessendeAction(removeAuslageAction, {
    onErfolg,
    erfolgsMeldung: "Auslage gelöscht",
  });
  const kategorie = AUSLAGE_KATEGORIE_LABEL[auslage.kategorie];

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Auslage löschen?"
      description={`Die Auslage von „${auslage.anzeigename}“ (${kategorie}, ${formatCents(auslage.betragCents)}) wird gelöscht. Das kann nicht rückgängig gemacht werden.`}
      confirmLabel="Löschen"
      pendingLabel="Löschen …"
      variant="danger"
      action={formAction}
      error={state?.error}
      pending={pending}
    >
      <HiddenIds veranstaltungId={veranstaltungId} auslageId={auslage.id} />
    </ConfirmDialog>
  );
}
