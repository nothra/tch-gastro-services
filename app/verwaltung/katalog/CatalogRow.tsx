"use client";

import { useActionState, useCallback, useState } from "react";
import { formatCents } from "@/lib/money";
import type { CatalogItem } from "@/db/schema";
import { setCatalogItemActiveAction, updateCatalogItemAction } from "./actions";
import { CatalogFields } from "./CatalogFields";

const CATEGORY_LABEL: Record<CatalogItem["category"], string> = {
  getraenk: "Getränk",
  kaffee: "Kaffee",
};

// Eine Katalog-Zeile: Anzeige, Inline-Bearbeitung und Deaktivieren/Reaktivieren.
export function CatalogRow({ item }: { item: CatalogItem }) {
  const [editing, setEditing] = useState(false);

  // Schließt die Inline-Bearbeitung nach erfolgreichem Speichern. setState in der
  // Action statt in einem useEffect (react-hooks/set-state-in-effect vermeiden).
  const actionWithClose = useCallback(
    async (
      prevState: Parameters<typeof updateCatalogItemAction>[0],
      formData: FormData,
    ) => {
      const result = await updateCatalogItemAction(prevState, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    [],
  );

  const [state, formAction, pending] = useActionState(actionWithClose, undefined);

  return (
    <li
      className={`flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800 ${
        item.active ? "" : "opacity-60"
      }`}
    >
      {editing ? (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.id} />
          <CatalogFields item={item} />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-cyan-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
            >
              Abbrechen
            </button>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-medium">
              {item.name}
              {item.size ? ` · ${item.size}` : " · ohne Größe"}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatCents(item.priceCents)} · {CATEGORY_LABEL[item.category]}
              {item.active ? "" : " · deaktiviert"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
            >
              Bearbeiten
            </button>
            <form action={setCatalogItemActiveAction}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="active" value={item.active ? "false" : "true"} />
              <button
                type="submit"
                className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
              >
                {item.active ? "Deaktivieren" : "Aktivieren"}
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
