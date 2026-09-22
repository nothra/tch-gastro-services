"use client";

import { useActionState, useCallback, useState } from "react";
import type { Catalog } from "@/db/schema";
import {
  createCatalogAction,
  renameCatalogAction,
  setCatalogActiveAction,
  duplicateCatalogAction,
  type CatalogFormState,
} from "../actions";

interface CatalogManagerProps {
  currentCatalog?: Catalog;
}

type CatalogAction = (
  prevState: CatalogFormState | undefined,
  formData: FormData,
) => Promise<CatalogFormState>;

// Katalog-Management-Controls (#345): Buttons für Anlage, Umbenennen, Deaktivieren/Reaktivieren,
// Duplizieren. Jede Action nutzt `useActionState` (wie `CatalogItemForm`/`CatalogRow`) statt
// eines blinden `await` – Fehler werden sichtbar, und ein Modal schließt nur bei
// `state.ok === true` (Review-Finding #345 Runde 1, Wichtig: das Modal schloss sich zuvor auch
// bei einem Namenskonflikt kommentarlos).
export function CatalogManager({ currentCatalog }: CatalogManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Schließt das jeweilige Modal nur bei Erfolg – per useCallback-Wrapper statt useEffect
  // (Codify #49, analog zu CatalogRow.actionWithClose).
  const createWithClose = useCallback<CatalogAction>(async (prev, formData) => {
    const result = await createCatalogAction(prev, formData);
    if (result.ok) setShowCreateModal(false);
    return result;
  }, []);
  const [createState, createAction, createPending] = useActionState(createWithClose, undefined);

  const renameWithClose = useCallback<CatalogAction>(async (prev, formData) => {
    const result = await renameCatalogAction(prev, formData);
    if (result.ok) setShowRenameModal(false);
    return result;
  }, []);
  const [renameState, renameAction, renamePending] = useActionState(renameWithClose, undefined);

  const duplicateWithClose = useCallback<CatalogAction>(async (prev, formData) => {
    const result = await duplicateCatalogAction(prev, formData);
    if (result.ok) setShowDuplicateModal(false);
    return result;
  }, []);
  const [duplicateState, duplicateAction, duplicatePending] = useActionState(
    duplicateWithClose,
    undefined,
  );

  // Kein Modal zu schließen – reiner Fehlerkanal für Deaktivieren/Reaktivieren.
  const [setActiveState, setActiveAction] = useActionState(setCatalogActiveAction, undefined);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Neuen Katalog anlegen */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Katalog anlegen
      </button>

      {/* Umbenennen, Deaktivieren, Duplizieren (nur wenn ein Katalog ausgewählt) */}
      {currentCatalog && (
        <>
          <button
            onClick={() => setShowRenameModal(true)}
            className="rounded-md bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
          >
            Umbenennen
          </button>

          {/* Deaktivieren/Reaktivieren als direkte Action (kein Modal) */}
          <form action={setActiveAction} className="inline">
            <input type="hidden" name="id" value={currentCatalog.id} />
            <input type="hidden" name="active" value={String(!currentCatalog.active)} />
            <button
              type="submit"
              className="rounded-md bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            >
              {currentCatalog.active ? "Deaktivieren" : "Reaktivieren"}
            </button>
          </form>
          {setActiveState?.error && (
            <p className="self-center text-sm text-red-600">{setActiveState.error}</p>
          )}

          {/* AK5: nur aktive Kataloge sind Duplizier-Quellen (Review-Finding #345 Runde 2,
              Wichtig) – der Button verschwindet bei einem inaktiven Katalog, statt erst nach
              dem Absenden serverseitig abgelehnt zu werden (`SOURCE_CATALOG_INACTIVE`). */}
          {currentCatalog.active && (
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="rounded-md bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            >
              Duplizieren
            </button>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <dialog open className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-lg font-bold">Neuen Katalog anlegen</h2>
            <form action={createAction} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium">Katalogname</label>
                <input
                  type="text"
                  name="name"
                  placeholder="z. B. Dorfmeisterschaften"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>
              {createState?.error && <p className="text-sm text-red-600">{createState.error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded bg-zinc-200 px-3 py-2 text-sm dark:bg-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={createPending}
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {createPending ? "Speichern …" : "Anlegen"}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Rename Modal */}
      {showRenameModal && currentCatalog && (
        <dialog open className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-lg font-bold">Katalog umbenennen</h2>
            <form action={renameAction} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={currentCatalog.id} />
              <div>
                <label className="block text-sm font-medium">Neuer Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={currentCatalog.name}
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>
              {renameState?.error && <p className="text-sm text-red-600">{renameState.error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="flex-1 rounded bg-zinc-200 px-3 py-2 text-sm dark:bg-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={renamePending}
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {renamePending ? "Speichern …" : "Umbenennen"}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && currentCatalog && (
        <dialog open className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-lg font-bold">Katalog duplizieren</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Der Katalog &quot;{currentCatalog.name}&quot; wird mit all seinen aktiven Artikeln
              kopiert.
            </p>
            <form action={duplicateAction} className="flex flex-col gap-3">
              <input type="hidden" name="sourceId" value={currentCatalog.id} />
              <div>
                <label className="block text-sm font-medium">Name der Kopie</label>
                <input
                  type="text"
                  name="name"
                  placeholder={`${currentCatalog.name} (Kopie)`}
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>
              {duplicateState?.error && (
                <p className="text-sm text-red-600">{duplicateState.error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="flex-1 rounded bg-zinc-200 px-3 py-2 text-sm dark:bg-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={duplicatePending}
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {duplicatePending ? "Speichern …" : "Duplizieren"}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
