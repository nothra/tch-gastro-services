"use client";

import {
  DialogAktionen,
  FormularDialog,
  useDialogFormular,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { Field } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import { createCatalogAction } from "../actions";

// „Katalog anlegen" unter der Katalog-Auswahl (spec-407 AK2.8/AK2.9). Bewusst `FormularDialog`
// statt `AnlegeDialog`: dessen Primär-Auslöser mit fester Id gehört auf dieser Seite „+ Neu" im
// Artikelbereich; hier steht ein Neben-Knopf ohne Id (ADR-062 D3).
export function KatalogAnlegen() {
  return (
    <FormularDialog
      ausloeser="Katalog anlegen"
      ausloeserVariant="secondary"
      titel="Katalog anlegen"
    >
      {(steuerung) => <KatalogAnlegenFormular steuerung={steuerung} />}
    </FormularDialog>
  );
}

function KatalogAnlegenFormular({ steuerung }: { steuerung: DialogSteuerung }) {
  const { state, pending, absenden } = useDialogFormular(createCatalogAction, steuerung, {
    erfolgsMeldung: "Katalog angelegt",
  });
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <Field label="Katalogname" name="name" placeholder="z. B. Dorfmeisterschaften" />
      <Notice kind="fehler">{state?.error}</Notice>
      <DialogAktionen
        steuerung={steuerung}
        pending={pending}
        label="Anlegen"
        laufLabel="Anlegen …"
      />
    </form>
  );
}
