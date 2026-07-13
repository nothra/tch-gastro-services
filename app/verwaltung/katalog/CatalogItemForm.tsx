"use client";

import { useActionState } from "react";
import { createCatalogItemAction } from "./actions";
import { CatalogFields } from "./CatalogFields";

// Anlege-Formular. Bei Erfolg leert `key` das Formular (frische Felder für den nächsten
// Artikel); bei Fehlern (Validierung, Duplikat) bleibt die Eingabe stehen.
export function CatalogItemForm() {
  const [state, formAction, pending] = useActionState(createCatalogItemAction, undefined);
  return (
    <form
      key={state?.ok ? "reset" : "edit"}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-semibold">Artikel anlegen</h2>
      <CatalogFields />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-cyan-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Anlegen"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">Artikel angelegt.</p>}
      </div>
    </form>
  );
}
