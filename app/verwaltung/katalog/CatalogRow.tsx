"use client";

import { formatCents } from "@/lib/money";
import type { CatalogItem } from "@/db/schema";
import {
  DialogAktionen,
  useDialogFormular,
  useFormularDialog,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { ListenZeile } from "@/app/components/ui/ListenZeile";
import { Notice } from "@/app/components/ui/Notice";
import { setCatalogItemActiveAction, updateCatalogItemAction } from "./actions";
import { CatalogFields } from "./CatalogFields";

interface CatalogRowProps {
  item: CatalogItem;
  catalogId: string;
}

// Eine Katalog-Zeile im Artikel-Muster (spec-407 AK4, ADR-062 D4): `ListenZeile` als Ganzes
// antippbar, Bearbeiten und Deaktivieren/Aktivieren liegen im Dialog (spec-373 AK4.2–AK4.5). Die
// catalogId wird in versteckten Feldern mitgesendet (#345).
export function CatalogRow({ item, catalogId }: CatalogRowProps) {
  // Wechselt „Speichern" die Kategorie, wird die Zeile in ihrer neuen Gruppe neu gemountet; die
  // Id ist dieselbe, der Fokus landet so auf der umgezogenen Zeile (Lesson #371).
  const zeilenId = `artikel-${item.id}`;
  const { ausloeserRef, oeffnen, steuerung, dialogProps } = useFormularDialog(zeilenId);

  return (
    <ListenZeile
      onOeffnen={oeffnen}
      id={zeilenId}
      ausloeserRef={ausloeserRef}
      titel={item.size ? `${item.name} · ${item.size}` : item.name}
      // Ziffern gleicher Breite, damit Preise untereinander bündig stehen (AK4.2).
      kennzeichen={<span className="tabular-nums">{formatCents(item.priceCents)}</span>}
      zustand={item.active ? undefined : "deaktiviert"}
      anhang={
        <Dialog {...dialogProps} title="Artikel bearbeiten">
          <ArtikelBearbeiten item={item} catalogId={catalogId} steuerung={steuerung} />
          <ArtikelAktivUmschalten item={item} catalogId={catalogId} steuerung={steuerung} />
        </Dialog>
      }
    />
  );
}

interface DialogBereichProps extends CatalogRowProps {
  steuerung: DialogSteuerung;
}

function ArtikelBearbeiten({ item, catalogId, steuerung }: DialogBereichProps) {
  const { state, pending, absenden } = useDialogFormular(updateCatalogItemAction, steuerung, {
    erfolgsMeldung: "Gespeichert",
  });
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
  const { state, pending, absenden } = useDialogFormular(setCatalogItemActiveAction, steuerung, {
    erfolgsMeldung: item.active ? "Artikel deaktiviert" : "Artikel aktiviert",
  });
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
