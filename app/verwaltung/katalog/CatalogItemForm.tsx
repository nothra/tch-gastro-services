"use client";

import { useActionState } from "react";
import { createCatalogItemAction } from "./actions";
import { CatalogFields } from "./CatalogFields";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Notice } from "@/app/components/ui/Notice";

interface CatalogItemFormProps {
  catalogId: string;
}

// Anlege-Formular. Bei Erfolg leert `key` das Formular (frische Felder für den nächsten
// Artikel); bei Fehlern (Validierung, Duplikat) bleibt die Eingabe stehen. Der catalogId-
// Parameter wird als verstecktes Feld mitgesendet (#345).
export function CatalogItemForm({ catalogId }: CatalogItemFormProps) {
  const [state, formAction, pending] = useActionState(createCatalogItemAction, undefined);
  return (
    <Card>
      <form key={state?.ok ? "reset" : "edit"} action={formAction} className="flex flex-col gap-3">
        <h2>Artikel anlegen</h2>
        <input type="hidden" name="catalogId" value={catalogId} />
        <CatalogFields />
        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Speichern …" : "Anlegen"}
          </Button>
          <Notice kind="fehler">{state?.error}</Notice>
          {state?.ok && <Notice kind="erfolg">Artikel angelegt.</Notice>}
        </div>
      </form>
    </Card>
  );
}
