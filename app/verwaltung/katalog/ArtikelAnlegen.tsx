"use client";

import {
  AnlegeDialog,
  DialogAktionen,
  useDialogFormular,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { Notice } from "@/app/components/ui/Notice";
import { createCatalogItemAction } from "./actions";
import { CatalogFields } from "./CatalogFields";

interface ArtikelAnlegenProps {
  /** Der geöffnete Katalog – angelegt wird immer in ihm (#345, spec-373 AK6.2). */
  catalogId: string;
  ausloeser: string;
  imLeerzustand?: boolean;
}

// „+ Artikel" der Katalogseite (spec-373 AK1): das bisherige Anlege-Formular im Dialog.
export function ArtikelAnlegen({ catalogId, ausloeser, imLeerzustand }: ArtikelAnlegenProps) {
  return (
    <AnlegeDialog ausloeser={ausloeser} titel="Artikel anlegen" imLeerzustand={imLeerzustand}>
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
  const { state, pending, absenden } = useDialogFormular(createCatalogItemAction, steuerung, {
    erfolgsMeldung: "Artikel angelegt",
  });
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
