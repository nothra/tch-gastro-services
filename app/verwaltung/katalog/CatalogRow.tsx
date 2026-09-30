"use client";

import { useActionState, useCallback, useState } from "react";
import { formatCents } from "@/lib/money";
import type { CatalogItem } from "@/db/schema";
import { setCatalogItemActiveAction, updateCatalogItemAction } from "./actions";
import { CatalogFields, CATEGORY_LABEL } from "./CatalogFields";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Notice } from "@/app/components/ui/Notice";

interface CatalogRowProps {
  item: CatalogItem;
  catalogId: string;
}

// Eine Katalog-Zeile: Anzeige, Inline-Bearbeitung und Deaktivieren/Reaktivieren.
// Der catalogId-Parameter wird in versteckten Feldern mitgesendet (#345).
export function CatalogRow({ item, catalogId }: CatalogRowProps) {
  const [editing, setEditing] = useState(false);

  // Schließt die Inline-Bearbeitung nach erfolgreichem Speichern. setState in der
  // Action statt in einem useEffect (react-hooks/set-state-in-effect vermeiden).
  const actionWithClose = useCallback(
    async (prevState: Parameters<typeof updateCatalogItemAction>[0], formData: FormData) => {
      const result = await updateCatalogItemAction(prevState, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    [],
  );

  const [state, formAction, pending] = useActionState(actionWithClose, undefined);

  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border border-line-subtle bg-surface p-3 ${
        item.active ? "" : "opacity-60"
      }`}
    >
      {editing ? (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="catalogId" value={catalogId} />
          <CatalogFields item={item} />
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                Speichern
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
            </div>
            <Notice kind="fehler">{state?.error}</Notice>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium break-words">
              {item.name}
              {item.size ? ` · ${item.size}` : " · ohne Größe"}
            </span>
            <span className="text-sm text-muted">
              {/* Beträge in Ziffern gleicher Breite, damit Preise untereinander bündig
                  stehen (spec AK4.2). */}
              <span className="tabular-nums">{formatCents(item.priceCents)}</span> ·{" "}
              {CATEGORY_LABEL[item.category]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!item.active && <Badge tone="neutral">deaktiviert</Badge>}
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Bearbeiten
            </Button>
            <form action={setCatalogItemActiveAction}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="catalogId" value={catalogId} />
              <input type="hidden" name="active" value={item.active ? "false" : "true"} />
              <Button type="submit" variant="secondary" size="sm">
                {item.active ? "Deaktivieren" : "Aktivieren"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
