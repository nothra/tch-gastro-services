"use client";

import {
  AnlegeDialog,
  DialogAktionen,
  useDialogFormular,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import type { ButtonVariant } from "@/app/components/ui/Button";
import { Notice } from "@/app/components/ui/Notice";
import { createCatalogItemAction } from "./actions";
import { CatalogFields } from "./CatalogFields";

interface ArtikelAnlegenProps {
  /** Der geöffnete Katalog – angelegt wird immer in ihm (#345, spec-373 AK6.2). */
  catalogId: string;
  ausloeser: string;
  variant?: ButtonVariant;
}

// „+ Artikel" der Katalogseite (spec-373 AK1): das bisherige Anlege-Formular im Dialog.
export function ArtikelAnlegen({ catalogId, ausloeser, variant }: ArtikelAnlegenProps) {
  return (
    <AnlegeDialog ausloeser={ausloeser} titel="Artikel anlegen" variant={variant}>
      {(steuerung) => <ArtikelFormular catalogId={catalogId} steuerung={steuerung} />}
    </AnlegeDialog>
  );
}

function ArtikelFormular({
  catalogId,
  steuerung,
}: {
  catalogId: string;
  steuerung: DialogSteuerung;
}) {
  const { state, pending, absenden } = useDialogFormular(createCatalogItemAction, steuerung);
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <input type="hidden" name="catalogId" value={catalogId} />
      <CatalogFields />
      <Notice kind="fehler">{state?.error}</Notice>
      <DialogAktionen
        steuerung={steuerung}
        pending={pending}
        label="Anlegen"
        laufLabel="Speichern …"
      />
    </form>
  );
}
