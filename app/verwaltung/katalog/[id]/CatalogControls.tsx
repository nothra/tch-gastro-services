"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import type { Catalog } from "@/db/schema";
import {
  createCatalogAction,
  renameCatalogAction,
  setCatalogActiveAction,
  duplicateCatalogAction,
} from "../actions";
import {
  DialogAktionen,
  useDialogFormular,
  useFormularDialog,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Dialog } from "@/app/components/ui/Dialog";
import { Field } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import { useSchliessendeAction, type FormAction } from "@/app/components/useSchliessendeAction";
import type { CatalogFormState } from "../actions";

// Katalog-Management-Controls (#345): Anlegen, Umbenennen, Deaktivieren/Aktivieren, Duplizieren.
// Die drei Formulare stehen auf der gemeinsamen Dialog-Grundlage (spec-372 AK5, ADR-058 D4):
// Escape, inerter Hintergrund, verknüpfter Titel, Fokus-Rückgabe und Sperre während der Action
// kommen aus `Dialog`/`FormularDialog`. Ein Dialog schließt nur bei `ok` (Review-Finding #345
// Runde 1); der Erfolg meldet sich als Toast, eine Ablehnung bleibt im Dialog.

interface CatalogControlsProps {
  currentCatalog?: Catalog;
}

export function CatalogControls({ currentCatalog }: CatalogControlsProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <FormularImDialog
        ausloeser="+ Katalog anlegen"
        variant="primary"
        titel="Neuen Katalog anlegen"
      >
        {(steuerung) => (
          <KatalogFormular
            action={createCatalogAction}
            steuerung={steuerung}
            erfolgsMeldung="Katalog angelegt"
            label="Anlegen"
          >
            <Field label="Katalogname" name="name" placeholder="z. B. Dorfmeisterschaften" />
          </KatalogFormular>
        )}
      </FormularImDialog>

      {currentCatalog && <KatalogVerwalten katalog={currentCatalog} />}
    </div>
  );
}

function KatalogVerwalten({ katalog }: { katalog: Catalog }) {
  return (
    <>
      <FormularImDialog ausloeser="Umbenennen" variant="secondary" titel="Katalog umbenennen">
        {(steuerung) => (
          <KatalogFormular
            action={renameCatalogAction}
            steuerung={steuerung}
            erfolgsMeldung="Katalog umbenannt"
            label="Umbenennen"
          >
            <input type="hidden" name="id" value={katalog.id} />
            <Field label="Neuer Name" name="name" defaultValue={katalog.name} />
          </KatalogFormular>
        )}
      </FormularImDialog>

      <AktivSchalter katalog={katalog} />

      {/* AK5 (#345): nur aktive Kataloge sind Duplizier-Quellen (Review-Finding #345 Runde 2) –
          der Button verschwindet bei einem inaktiven Katalog, statt erst nach dem Absenden
          serverseitig abgelehnt zu werden (`SOURCE_CATALOG_INACTIVE`). */}
      {katalog.active && (
        <FormularImDialog
          ausloeser="Duplizieren"
          variant="secondary"
          titel="Katalog duplizieren"
          beschreibung={`„${katalog.name}“ wird mit allen aktiven Artikeln kopiert.`}
        >
          {(steuerung) => (
            <KatalogFormular
              action={duplicateCatalogAction}
              steuerung={steuerung}
              erfolgsMeldung="Katalog dupliziert"
              label="Duplizieren"
            >
              <input type="hidden" name="sourceId" value={katalog.id} />
              <Field label="Name der Kopie" name="name" placeholder={`${katalog.name} (Kopie)`} />
            </KatalogFormular>
          )}
        </FormularImDialog>
      )}
    </>
  );
}

interface FormularImDialogProps {
  ausloeser: string;
  variant: "primary" | "secondary";
  titel: string;
  beschreibung?: string;
  children: (steuerung: DialogSteuerung) => ReactNode;
}

// Auslöser + Dialog. Die Kinder mounten erst beim Öffnen – jedes Öffnen beginnt ohne die
// Ablehnung des letzten Versuchs (Dialog-JSDoc, ADR-053 D1).
function FormularImDialog({
  ausloeser,
  variant,
  titel,
  beschreibung,
  children,
}: FormularImDialogProps) {
  const { ausloeserRef, oeffnen, steuerung, dialogProps } = useFormularDialog();
  return (
    <>
      <Button ref={ausloeserRef} variant={variant} size="sm" onClick={oeffnen}>
        {ausloeser}
      </Button>
      <Dialog {...dialogProps} title={titel} description={beschreibung}>
        {children(steuerung)}
      </Dialog>
    </>
  );
}

interface KatalogFormularProps {
  action: FormAction<CatalogFormState>;
  steuerung: DialogSteuerung;
  erfolgsMeldung: string;
  /** Verb des Absenden-Buttons; der Busy-Text folgt ihm (Glossar). */
  label: string;
  children: ReactNode;
}

function KatalogFormular({
  action,
  steuerung,
  erfolgsMeldung,
  label,
  children,
}: KatalogFormularProps) {
  const { state, pending, absenden } = useDialogFormular(action, steuerung, erfolgsMeldung);
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      {children}
      <Notice kind="fehler">{state?.error}</Notice>
      <DialogAktionen
        steuerung={steuerung}
        pending={pending}
        label={label}
        laufLabel={`${label} …`}
      />
    </form>
  );
}

// Deaktivieren fragt nach (spec-372 AK3), Aktivieren wirkt sofort (AK4, reversibel). Beide
// Richtungen teilen EINEN Knopf an derselben Stelle im Baum: wechselt der Status, bleibt der
// fokussierte Knoten erhalten und nur seine Beschriftung ändert sich (Lesson #371).
function AktivSchalter({ katalog }: { katalog: Catalog }) {
  const knopfRef = useRef<HTMLButtonElement>(null);
  const [bestaetigungOffen, setBestaetigungOffen] = useState(false);
  // Jedes Öffnen ist ein neuer Versuch: der wechselnde `key` erneuert den Action-Zustand der
  // Bestätigung (ConfirmDialog-JSDoc, ADR-053 D1).
  const [durchlauf, setDurchlauf] = useState(0);
  const [state, aktivierenAction, pending] = useSchliessendeAction(setCatalogActiveAction, {
    erfolgsMeldung: "Katalog aktiviert",
  });

  function deaktivierenWaehlen() {
    setDurchlauf((bisher) => bisher + 1);
    setBestaetigungOffen(true);
  }

  return (
    <>
      <form action={aktivierenAction} className="flex flex-col gap-1">
        <input type="hidden" name="id" value={katalog.id} />
        <input type="hidden" name="active" value="true" />
        <Button
          ref={knopfRef}
          type={katalog.active ? "button" : "submit"}
          onClick={katalog.active ? deaktivierenWaehlen : undefined}
          variant="secondary"
          size="sm"
          disabled={pending}
        >
          {katalog.active ? "Deaktivieren" : "Aktivieren"}
        </Button>
        <Notice kind="fehler">{katalog.active ? undefined : state?.error}</Notice>
      </form>
      <DeaktivierenBestaetigung
        key={durchlauf}
        open={bestaetigungOffen}
        onClose={() => setBestaetigungOffen(false)}
        returnFocusRef={knopfRef}
        katalog={katalog}
      />
    </>
  );
}

interface DeaktivierenBestaetigungProps {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  katalog: Catalog;
}

function DeaktivierenBestaetigung({
  open,
  onClose,
  returnFocusRef,
  katalog,
}: DeaktivierenBestaetigungProps) {
  const [state, formAction, pending] = useSchliessendeAction(setCatalogActiveAction, {
    onErfolg: onClose,
    erfolgsMeldung: "Katalog deaktiviert",
  });

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Katalog deaktivieren?"
      description={`„${katalog.name}“ ist danach für neue Veranstaltungen nicht mehr wählbar.`}
      confirmLabel="Deaktivieren"
      pendingLabel="Deaktivieren …"
      variant="danger"
      action={formAction}
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="id" value={katalog.id} />
      <input type="hidden" name="active" value="false" />
    </ConfirmDialog>
  );
}
