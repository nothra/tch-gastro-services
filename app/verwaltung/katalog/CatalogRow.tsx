"use client";

import { formatCents } from "@/lib/money";
import type { CatalogItem } from "@/db/schema";
import {
  DialogAktionen,
  useDialogFormular,
  useFormularDialog,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { joinClasses } from "@/app/components/ui/joinClasses";
import { Notice } from "@/app/components/ui/Notice";
import { setCatalogItemActiveAction, updateCatalogItemAction } from "./actions";
import { CatalogFields } from "./CatalogFields";

interface CatalogRowProps {
  item: CatalogItem;
  catalogId: string;
}

// Eine Katalog-Zeile (spec-373 AK4.2–AK4.5): kompakt und als Ganzes antippbar; Bearbeiten und
// Deaktivieren/Aktivieren liegen im Dialog statt als Buttons in jeder Zeile. Die catalogId wird
// in versteckten Feldern mitgesendet (#345).
export function CatalogRow({ item, catalogId }: CatalogRowProps) {
  // Wechselt „Speichern" die Kategorie, wird die Zeile in ihrer neuen Gruppe neu gemountet; die
  // Id ist dieselbe, der Fokus landet so auf der umgezogenen Zeile (Lesson #371).
  const zeilenId = `artikel-${item.id}`;
  const { ausloeserRef, oeffnen, steuerung, dialogProps } = useFormularDialog(zeilenId);

  return (
    <li>
      <button
        ref={ausloeserRef}
        id={zeilenId}
        type="button"
        onClick={oeffnen}
        className={joinClasses(
          "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-foreground hover:bg-accent-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
          item.active ? undefined : "opacity-60",
        )}
      >
        <span className="min-w-0 break-words">
          {item.name}
          {item.size ? ` · ${item.size}` : " · ohne Größe"}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {!item.active && <Badge tone="neutral">deaktiviert</Badge>}
          {/* Ziffern gleicher Breite, damit Preise untereinander bündig stehen (AK4.2). */}
          <span className="tabular-nums">{formatCents(item.priceCents)}</span>
        </span>
      </button>
      <Dialog {...dialogProps} title="Artikel bearbeiten">
        <ArtikelBearbeiten item={item} catalogId={catalogId} steuerung={steuerung} />
        <ArtikelAktivUmschalten item={item} catalogId={catalogId} steuerung={steuerung} />
      </Dialog>
    </li>
  );
}

interface DialogBereichProps extends CatalogRowProps {
  steuerung: DialogSteuerung;
}

function ArtikelBearbeiten({ item, catalogId, steuerung }: DialogBereichProps) {
  const { state, pending, absenden } = useDialogFormular(
    updateCatalogItemAction,
    steuerung,
    "Gespeichert",
  );
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="catalogId" value={catalogId} />
      <CatalogFields item={item} />
      <Notice kind="fehler">{state?.error}</Notice>
      <DialogAktionen
        steuerung={steuerung}
        pending={pending}
        label="Speichern"
        laufLabel="Speichern …"
      />
    </form>
  );
}

// Eigenes Formular, damit „Deaktivieren" nicht die bearbeiteten Felder mitschickt. Schließt den
// Dialog bei Erfolg wie „Speichern" (AK4.5).
function ArtikelAktivUmschalten({ item, catalogId, steuerung }: DialogBereichProps) {
  const { state, pending, absenden } = useDialogFormular(
    setCatalogItemActiveAction,
    steuerung,
    item.active ? "Artikel deaktiviert" : "Artikel aktiviert",
  );
  const label = item.active ? "Deaktivieren" : "Aktivieren";
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3 border-t border-line-subtle pt-4">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="catalogId" value={catalogId} />
      <input type="hidden" name="active" value={item.active ? "false" : "true"} />
      <Notice kind="fehler">{state?.error}</Notice>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending || steuerung.gesperrt}
        className="self-start"
      >
        {pending ? `${label} …` : label}
      </Button>
    </form>
  );
}
