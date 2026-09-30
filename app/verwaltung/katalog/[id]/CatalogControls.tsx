"use client";

import { useActionState, useCallback, useState, type ReactNode } from "react";
import type { Catalog } from "@/db/schema";
import {
  createCatalogAction,
  renameCatalogAction,
  setCatalogActiveAction,
  duplicateCatalogAction,
  type CatalogFormState,
} from "../actions";
import { Button } from "@/app/components/ui/Button";
import { Field } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";

interface CatalogControlsProps {
  currentCatalog?: Catalog;
}

type CatalogAction = (
  prevState: CatalogFormState | undefined,
  formData: FormData,
) => Promise<CatalogFormState>;

// Wrappt eine Katalog-Action mit `useActionState` und schließt das übergebene Modal nur bei
// Erfolg (`result.ok === true`) – per `useCallback`-Wrapper statt `useEffect` (Codify #49, analog
// zu `CatalogRow.actionWithClose`). Extrahiert aus drei identischen Kopien in `CatalogControls`
// (create/rename/duplicate, Review-Finding #345 Runde 2/3, Nitpick). `setModalOpen` ist der
// `useState`-Setter (stabile Identität), keine Inline-Closure – die Dependency-Liste bleibt damit
// über Re-Renders hinweg unverändert, wie zuvor mit `[]`.
function useCloseOnSuccess(action: CatalogAction, setModalOpen: (open: boolean) => void) {
  const wrappedAction = useCallback<CatalogAction>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.ok) setModalOpen(false);
      return result;
    },
    [action, setModalOpen],
  );
  return useActionState(wrappedAction, undefined);
}

interface CatalogModalProps {
  title: string;
  description?: ReactNode;
  formAction: (formData: FormData) => void;
  error?: string;
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
  /** Versteckte Felder und Eingaben des jeweiligen Vorgangs. */
  children: ReactNode;
}

// Die Hülle der drei Katalog-Modals (anlegen, umbenennen, duplizieren) – zuvor dreimal
// wortgleich kopiert. Der Abdunkler nutzt das Token `overlay`, der Inhalt die Fläche-Tokens.
function CatalogModal({
  title,
  description,
  formAction,
  error,
  pending,
  submitLabel,
  onCancel,
  children,
}: CatalogModalProps) {
  return (
    <dialog open className="fixed inset-0 flex items-center justify-center bg-overlay p-4">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 rounded-lg bg-surface p-6 text-foreground">
        <h2>{title}</h2>
        {description}
        <form action={formAction} className="flex flex-col gap-3">
          {children}
          <Notice kind="fehler">{error}</Notice>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={onCancel}
            >
              Abbrechen
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={pending}>
              {pending ? "Speichern …" : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// Katalog-Management-Controls (#345): Buttons für Anlage, Umbenennen, Deaktivieren/Reaktivieren,
// Duplizieren. Jede Action nutzt `useActionState` (wie `CatalogItemForm`/`CatalogRow`) statt
// eines blinden `await` – Fehler werden sichtbar, und ein Modal schließt nur bei
// `state.ok === true` (Review-Finding #345 Runde 1, Wichtig: das Modal schloss sich zuvor auch
// bei einem Namenskonflikt kommentarlos).
export function CatalogControls({ currentCatalog }: CatalogControlsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const [createState, createAction, createPending] = useCloseOnSuccess(
    createCatalogAction,
    setShowCreateModal,
  );
  const [renameState, renameAction, renamePending] = useCloseOnSuccess(
    renameCatalogAction,
    setShowRenameModal,
  );
  const [duplicateState, duplicateAction, duplicatePending] = useCloseOnSuccess(
    duplicateCatalogAction,
    setShowDuplicateModal,
  );

  // Kein Modal zu schließen – reiner Fehlerkanal für Deaktivieren/Reaktivieren.
  const [setActiveState, setActiveAction] = useActionState(setCatalogActiveAction, undefined);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Neuen Katalog anlegen */}
      <Button size="sm" onClick={() => setShowCreateModal(true)}>
        + Katalog anlegen
      </Button>

      {/* Umbenennen, Deaktivieren, Duplizieren (nur wenn ein Katalog ausgewählt) */}
      {currentCatalog && (
        <>
          <Button variant="secondary" size="sm" onClick={() => setShowRenameModal(true)}>
            Umbenennen
          </Button>

          {/* Deaktivieren/Reaktivieren als direkte Action (kein Modal) */}
          <form action={setActiveAction} className="inline">
            <input type="hidden" name="id" value={currentCatalog.id} />
            <input type="hidden" name="active" value={String(!currentCatalog.active)} />
            <Button type="submit" variant="secondary" size="sm">
              {currentCatalog.active ? "Deaktivieren" : "Reaktivieren"}
            </Button>
          </form>
          <Notice kind="fehler" className="self-center">
            {setActiveState?.error}
          </Notice>

          {/* AK5: nur aktive Kataloge sind Duplizier-Quellen (Review-Finding #345 Runde 2,
              Wichtig) – der Button verschwindet bei einem inaktiven Katalog, statt erst nach
              dem Absenden serverseitig abgelehnt zu werden (`SOURCE_CATALOG_INACTIVE`). */}
          {currentCatalog.active && (
            <Button variant="secondary" size="sm" onClick={() => setShowDuplicateModal(true)}>
              Duplizieren
            </Button>
          )}
        </>
      )}

      {showCreateModal && (
        <CatalogModal
          title="Neuen Katalog anlegen"
          formAction={createAction}
          error={createState?.error}
          pending={createPending}
          submitLabel="Anlegen"
          onCancel={() => setShowCreateModal(false)}
        >
          <Field label="Katalogname" name="name" placeholder="z. B. Dorfmeisterschaften" />
        </CatalogModal>
      )}

      {showRenameModal && currentCatalog && (
        <CatalogModal
          title="Katalog umbenennen"
          formAction={renameAction}
          error={renameState?.error}
          pending={renamePending}
          submitLabel="Umbenennen"
          onCancel={() => setShowRenameModal(false)}
        >
          <input type="hidden" name="id" value={currentCatalog.id} />
          <Field label="Neuer Name" name="name" defaultValue={currentCatalog.name} />
        </CatalogModal>
      )}

      {showDuplicateModal && currentCatalog && (
        <CatalogModal
          title="Katalog duplizieren"
          description={
            <p className="text-sm text-muted">
              Der Katalog &quot;{currentCatalog.name}&quot; wird mit all seinen aktiven Artikeln
              kopiert.
            </p>
          }
          formAction={duplicateAction}
          error={duplicateState?.error}
          pending={duplicatePending}
          submitLabel="Duplizieren"
          onCancel={() => setShowDuplicateModal(false)}
        >
          <input type="hidden" name="sourceId" value={currentCatalog.id} />
          <Field
            label="Name der Kopie"
            name="name"
            placeholder={`${currentCatalog.name} (Kopie)`}
          />
        </CatalogModal>
      )}
    </div>
  );
}
