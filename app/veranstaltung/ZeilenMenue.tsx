"use client";

import type { RefObject } from "react";
import { AktionsMenue, MenueEintrag } from "@/app/components/ui/AktionsMenue";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useBestaetigung } from "@/app/components/useBestaetigung";
import { useSchliessendeAction } from "@/app/components/useSchliessendeAction";
import { removeZeileAction } from "./actions";

// Zeilenmenü einer Teilnehmerzeile (spec-369 AK18–AK20). Das Menü-Verhalten liegt seit ADR-061 D1
// im Baustein `AktionsMenue`; hier stehen nur noch Eintrag und Bestätigung. „Entfernen" wirkt erst
// nach der Bestätigung im `ConfirmDialog`.

interface ZeilenMenueProps {
  veranstaltungId: string;
  zeileId: string;
  name: string;
}

export function ZeilenMenue({ veranstaltungId, zeileId, name }: ZeilenMenueProps) {
  const { ausloeserRef, oeffnen, durchlauf, dialogProps } = useBestaetigung();

  return (
    <>
      <AktionsMenue label={`Aktionen für ${name}`} ausloeserRef={ausloeserRef}>
        {({ schliessen }) => (
          <MenueEintrag
            gefahr
            onClick={() => {
              schliessen();
              oeffnen();
            }}
          >
            Entfernen
          </MenueEintrag>
        )}
      </AktionsMenue>

      <EntfernenBestaetigung
        key={durchlauf}
        {...dialogProps}
        veranstaltungId={veranstaltungId}
        zeileId={zeileId}
        name={name}
      />
    </>
  );
}

interface EntfernenBestaetigungProps extends ZeilenMenueProps {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

function EntfernenBestaetigung({
  open,
  onClose,
  veranstaltungId,
  zeileId,
  name,
  returnFocusRef,
}: EntfernenBestaetigungProps) {
  const [state, formAction, pending] = useSchliessendeAction(removeZeileAction, {
    onErfolg: onClose,
    erfolgsMeldung: "Teilnehmer entfernt",
  });

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
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
