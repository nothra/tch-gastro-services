"use client";

import type { RefObject } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Dialog } from "@/app/components/ui/Dialog";
import { IconButton } from "@/app/components/ui/IconButton";
import { PapierkorbIcon } from "@/app/components/ui/icons";
import { useBestaetigung } from "@/app/components/useBestaetigung";
import { useSchliessendeAction } from "@/app/components/useSchliessendeAction";
import { deleteVeranstaltungAction } from "../actions";
import { istGesperrt, loeschSperrenBeschreibung, type LoeschSperre } from "../loeschSperren";
import { VERANSTALTUNG_LISTE_PATH } from "../pfade";

// Endgültiges Löschen einer noch offenen, datierten Veranstaltung (#352 AK4/AK8) – ausgelöst über
// den Papierkorb im Seitenkopf (spec-391 AK11, ADR-056 D4). Der Bestätigungsdialog ist Pflicht
// (spec-352, „Gesetzte Entscheidungen"). Sperrt schon beim Laden der Seite etwas das Löschen,
// nennt der Dialog den Grund sofort und bietet keine Bestätigung an (spec-372 AK9, ADR-058 D3).
// Die Entscheidung bleibt beim Server: seine Ablehnung (die Lage hat sich seit dem Laden
// geändert, AK11) erscheint IM Dialog, weil der Nutzer nach dem Absenden dort steht.
//
// `ConfirmDialog` sperrt während der laufenden Action beide Schaltflächen und Escape: der Vorgang
// ist ein unumkehrbarer Hard-Delete – ein Abbrechen im Pending-Fenster schlösse nur den Dialog,
// während die Action serverseitig zu Ende löscht.

interface VeranstaltungLoeschenProps {
  id: string;
  bezeichnung: string;
  /** Sperren beim Laden der Seite (`loeschSperren`) – nur Hinweis, entscheiden tut die Action. */
  sperren: readonly LoeschSperre[];
}

export function VeranstaltungLoeschen({ id, bezeichnung, sperren }: VeranstaltungLoeschenProps) {
  const { ausloeserRef, oeffnen, durchlauf, dialogProps } = useBestaetigung();

  return (
    <>
      <IconButton
        ref={ausloeserRef}
        label="Veranstaltung löschen"
        tone="danger"
        icon={<PapierkorbIcon />}
        onClick={oeffnen}
      />
      {istGesperrt(sperren) ? (
        <Dialog
          {...dialogProps}
          title="Löschen nicht möglich"
          description={loeschSperrenBeschreibung(bezeichnung, sperren)}
        >
          <div className="flex justify-end">
            <Button variant="secondary" onClick={dialogProps.onClose}>
              Schließen
            </Button>
          </div>
        </Dialog>
      ) : (
        <LoeschBestaetigung
          key={durchlauf}
          {...dialogProps}
          id={id}
          bezeichnung={bezeichnung}
        />
      )}
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
  const router = useRouter();
  // Die Detailseite existiert nach dem Löschen nicht mehr: der Client navigiert zur Übersicht,
  // der Toast aus dem Root-Layout überlebt den Seitenwechsel (spec-372 AK13, Q7).
  const [state, formAction, pending] = useSchliessendeAction(deleteVeranstaltungAction, {
    onErfolg: () => router.replace(VERANSTALTUNG_LISTE_PATH),
    erfolgsMeldung: "Veranstaltung gelöscht",
  });

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
