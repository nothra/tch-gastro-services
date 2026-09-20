"use client";

import { useState } from "react";
import type { Catalog } from "@/db/schema";
import { createCatalogAction, renameCatalogAction, setCatalogActiveAction, duplicateCatalogAction } from "../actions";

interface CatalogManagerProps {
  currentCatalog?: Catalog;
}

// Katalog-Management-Controls (#345): Buttons für Anlage, Umbenennen, Deaktivieren/Reaktivieren,
// Duplizieren. Jede Action hat optional ein Modal für die Eingabe (Name, Name für Duplikat).
export function CatalogManager({ currentCatalog }: CatalogManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleCreateCatalog = async (formData: FormData) => {
    await createCatalogAction(undefined, formData);
    setShowCreateModal(false);
  };

  const handleRenameCatalog = async (formData: FormData) => {
    await renameCatalogAction(undefined, formData);
    setShowRenameModal(false);
  };

  const handleDuplicateCatalog = async (formData: FormData) => {
    await duplicateCatalogAction(undefined, formData);
    setShowDuplicateModal(false);
  };

  const handleToggleCatalogActive = async (formData: FormData) => {
    await setCatalogActiveAction(undefined, formData);
  };

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
          <form action={handleToggleCatalogActive} className="inline">
            <input type="hidden" name="id" value={currentCatalog.id} />
            <input type="hidden" name="active" value={String(!currentCatalog.active)} />
            <button
              type="submit"
              className="rounded-md bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            >
              {currentCatalog.active ? "Deaktivieren" : "Reaktivieren"}
            </button>
          </form>

          <button
            onClick={() => setShowDuplicateModal(true)}
            className="rounded-md bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
          >
            Duplizieren
          </button>
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <dialog open className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-lg font-bold">Neuen Katalog anlegen</h2>
            <form
              action={handleCreateCatalog}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="block text-sm font-medium">Katalogname</label>
                <input
                  type="text"
                  name="name"
                  placeholder="z. B. Dorfmeisterschaften"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>
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
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Anlegen
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
            <form
              action={handleRenameCatalog}
              className="flex flex-col gap-3"
            >
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
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Umbenennen
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
              Der Katalog &quot;{currentCatalog.name}&quot; wird mit all seinen aktiven Artikeln kopiert.
            </p>
            <form
              action={handleDuplicateCatalog}
              className="flex flex-col gap-3"
            >
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
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Duplizieren
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
