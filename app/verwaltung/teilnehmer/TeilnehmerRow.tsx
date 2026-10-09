"use client";

import type { Teilnehmer } from "@/db/schema";
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
import { setTeilnehmerActiveAction, updateTeilnehmerAction } from "./actions";
import { TeilnehmerFields, TYP_LABEL } from "./TeilnehmerFields";

// Wirkungssätze unter „Deaktivieren"/„Aktivieren" (spec-405 AK2.6/AK2.7, Q1).
const WIRKUNG_DEAKTIVIEREN =
  "Deaktivierte Teilnehmer lassen sich keiner Veranstaltung mehr hinzufügen. Bestehende Abrechnungen bleiben unverändert.";
const WIRKUNG_AKTIVIEREN = "Der Teilnehmer lässt sich wieder Veranstaltungen hinzufügen.";

function untertitel({ typ, mitglied }: Teilnehmer): string {
  return `${TYP_LABEL[typ]} · ${mitglied ? "Mitglied" : "kein Mitglied"}`;
}

// Eine Teilnehmer-Zeile im Artikel-Muster (spec-405, ADR-060 D3): Karte als Ganzes antippbar,
// Bearbeiten und Deaktivieren/Aktivieren liegen im Dialog. Erfolge melden sich als Toast,
// Ablehnungen im Dialog (spec-372 AK12/AK16).
export function TeilnehmerRow({ teilnehmer }: { teilnehmer: Teilnehmer }) {
  // Deaktivieren/Aktivieren lässt die Zeile in die andere Gruppe wandern, wo sie neu gemountet
  // wird; die Id ist dieselbe, der Fokus landet so auf der umgezogenen Zeile (Lesson #371).
  const zeilenId = `teilnehmer-${teilnehmer.id}`;
  const { ausloeserRef, oeffnen, steuerung, dialogProps } = useFormularDialog(zeilenId);

  return (
    <ListenZeile
      onOeffnen={oeffnen}
      id={zeilenId}
      ausloeserRef={ausloeserRef}
      titel={teilnehmer.name}
      untertitel={untertitel(teilnehmer)}
      zustand={teilnehmer.active ? undefined : "deaktiviert"}
      anhang={
        <Dialog {...dialogProps} title="Teilnehmer bearbeiten">
          <TeilnehmerBearbeiten teilnehmer={teilnehmer} steuerung={steuerung} />
          <TeilnehmerAktivUmschalten teilnehmer={teilnehmer} steuerung={steuerung} />
        </Dialog>
      }
    />
  );
}

interface DialogBereichProps {
  teilnehmer: Teilnehmer;
  steuerung: DialogSteuerung;
}

function TeilnehmerBearbeiten({ teilnehmer, steuerung }: DialogBereichProps) {
  const { state, pending, absenden } = useDialogFormular(updateTeilnehmerAction, steuerung, {
    erfolgsMeldung: "Gespeichert",
  });
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={teilnehmer.id} />
      <TeilnehmerFields teilnehmer={teilnehmer} />
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

// Eigenes Formular, damit „Deaktivieren" nicht die bearbeiteten Felder mitschickt (AK2.9).
// Reversibel, deshalb ohne Bestätigung (spec-372, AK2.8).
function TeilnehmerAktivUmschalten({ teilnehmer, steuerung }: DialogBereichProps) {
  const { state, pending, absenden } = useDialogFormular(setTeilnehmerActiveAction, steuerung, {
    erfolgsMeldung: teilnehmer.active ? "Teilnehmer deaktiviert" : "Teilnehmer aktiviert",
  });
  const label = teilnehmer.active ? "Deaktivieren" : "Aktivieren";
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3 border-t border-line-subtle pt-4">
      <input type="hidden" name="id" value={teilnehmer.id} />
      <input type="hidden" name="active" value={teilnehmer.active ? "false" : "true"} />
      <p className="text-sm text-muted">
        {teilnehmer.active ? WIRKUNG_DEAKTIVIEREN : WIRKUNG_AKTIVIEREN}
      </p>
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
