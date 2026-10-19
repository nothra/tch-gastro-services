"use client";

import { useState, type ReactNode } from "react";
import type { Catalog } from "@/db/schema";
import {
  useDialogFormular,
  useFormularDialog,
  type DialogSteuerung,
} from "@/app/components/FormularDialog";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { Field } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import type { FormAction } from "@/app/components/useSchliessendeAction";
import {
  duplicateCatalogAction,
  renameCatalogAction,
  setCatalogActiveAction,
  type CatalogFormState,
} from "../actions";

// „Katalog bearbeiten" (spec-407 AK2, ADR-062): Umbenennen, Duplizieren und Deaktivieren/Aktivieren
// in EINEM Dialog. Jeder Bereich ist ein eigenes Formular auf derselben `DialogSteuerung` – er
// sendet nur seine Felder, meldet Ablehnungen bei sich und sperrt während seiner Action alle
// übrigen Knöpfe samt Schließen (D2). Deaktivieren fragt als Schritt im selben Dialog nach statt
// über einen geschachtelten `ConfirmDialog` (D1).

// Ein Schrittwechsel hängt den Knopf aus, der ihn ausgelöst hat (Lesson #371/#404): der neue
// Schritt setzt den Fokus deshalb selbst – in die Bestätigung auf „Abbrechen", zurück auf
// „Deaktivieren". Beim Öffnen bestimmt dagegen der Dialog das Fokusziel.
type Schritt = { art: "bearbeiten"; zurueckVonBestaetigung: boolean } | { art: "bestaetigen" };

const BEARBEITEN_BEIM_OEFFNEN: Schritt = { art: "bearbeiten", zurueckVonBestaetigung: false };

const BEREICH_CLASS = "flex flex-col gap-3 py-4 first:pt-0 last:pb-0";

const SCHRITT_TITEL: Record<Schritt["art"], string> = {
  bearbeiten: "Katalog bearbeiten",
  bestaetigen: "Katalog deaktivieren?",
};

export function KatalogBearbeiten({ katalog }: { katalog: Catalog }) {
  const { ausloeserRef, oeffnen, steuerung, dialogProps } = useFormularDialog();
  // Hier statt im Dialog-Inhalt, weil Titel und Beschreibung des Dialogs vom Schritt abhängen.
  const [schritt, setSchritt] = useState<Schritt>(BEARBEITEN_BEIM_OEFFNEN);

  function oeffnenBeimBearbeiten() {
    setSchritt(BEARBEITEN_BEIM_OEFFNEN);
    oeffnen();
  }

  const bestaetigen = schritt.art === "bestaetigen";
  return (
    <>
      <Button ref={ausloeserRef} variant="secondary" size="sm" onClick={oeffnenBeimBearbeiten}>
        Katalog bearbeiten
      </Button>
      <Dialog
        {...dialogProps}
        title={SCHRITT_TITEL[schritt.art]}
        description={
          bestaetigen
            ? `„${katalog.name}“ ist danach für neue Veranstaltungen nicht mehr wählbar.`
            : undefined
        }
      >
        {bestaetigen ? (
          <BestaetigenSchritt
            katalog={katalog}
            steuerung={steuerung}
            onZurueck={() => setSchritt({ art: "bearbeiten", zurueckVonBestaetigung: true })}
          />
        ) : (
          <BearbeitenSchritt
            katalog={katalog}
            steuerung={steuerung}
            deaktivierenFokussieren={schritt.zurueckVonBestaetigung}
            onDeaktivieren={() => setSchritt({ art: "bestaetigen" })}
          />
        )}
      </Dialog>
    </>
  );
}

interface SchrittProps {
  katalog: Catalog;
  steuerung: DialogSteuerung;
}

interface BearbeitenSchrittProps extends SchrittProps {
  /** Rückkehr aus der Bestätigung: „Deaktivieren" bekommt den Fokus zurück. */
  deaktivierenFokussieren: boolean;
  onDeaktivieren: () => void;
}

function BearbeitenSchritt({
  katalog,
  steuerung,
  deaktivierenFokussieren,
  onDeaktivieren,
}: BearbeitenSchrittProps) {
  return (
    <>
      <div className="flex flex-col divide-y divide-line-subtle">
        <BereichFormular
          action={renameCatalogAction}
          steuerung={steuerung}
          erfolgsMeldung="Katalog umbenannt"
          label="Umbenennen"
        >
          <input type="hidden" name="id" value={katalog.id} />
          <Field label="Neuer Name" name="name" defaultValue={katalog.name} />
        </BereichFormular>

        {/* AK2.5 (#345 AK5): nur aktive Kataloge sind Duplizier-Quellen – der Bereich fehlt bei
            einem deaktivierten Katalog, statt erst serverseitig abgelehnt zu werden. */}
        {katalog.active && (
          <BereichFormular
            action={duplicateCatalogAction}
            steuerung={steuerung}
            erfolgsMeldung="Katalog dupliziert"
            label="Duplizieren"
          >
            <input type="hidden" name="sourceId" value={katalog.id} />
            <p className="text-sm text-muted">
              „{katalog.name}“ wird mit allen aktiven Artikeln kopiert.
            </p>
            <Field label="Name der Kopie" name="name" placeholder={`${katalog.name} (Kopie)`} />
          </BereichFormular>
        )}

        {katalog.active ? (
          <div className={BEREICH_CLASS}>
            <Button
              variant="secondary"
              onClick={onDeaktivieren}
              autoFocus={deaktivierenFokussieren}
              disabled={steuerung.gesperrt}
              className="self-start"
            >
              Deaktivieren
            </Button>
          </div>
        ) : (
          // Aktivieren ist reversibel und wirkt ohne Rückfrage (spec-372 AK4).
          <BereichFormular
            action={setCatalogActiveAction}
            steuerung={steuerung}
            erfolgsMeldung="Katalog aktiviert"
            label="Aktivieren"
          >
            <input type="hidden" name="id" value={katalog.id} />
            <input type="hidden" name="active" value="true" />
          </BereichFormular>
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={steuerung.schliessen} disabled={steuerung.gesperrt}>
          Schließen
        </Button>
      </div>
    </>
  );
}

interface BereichFormularProps {
  action: FormAction<CatalogFormState>;
  steuerung: DialogSteuerung;
  erfolgsMeldung: string;
  /** Verb des Absenden-Buttons und Name des Formulars; der Busy-Text folgt ihm (Glossar). */
  label: string;
  children: ReactNode;
}

function BereichFormular({
  action,
  steuerung,
  erfolgsMeldung,
  label,
  children,
}: BereichFormularProps) {
  const { state, pending, absenden } = useDialogFormular(action, steuerung, { erfolgsMeldung });
  return (
    <form aria-label={label} onSubmit={absenden} className={BEREICH_CLASS}>
      {children}
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

interface BestaetigenSchrittProps extends SchrittProps {
  onZurueck: () => void;
}

// Mountet nur über den Schrittwechsel (geöffnet wird immer beim Bearbeiten), `autoFocus` auf
// „Abbrechen" greift deshalb genau beim Hineinwechseln – das sichere Ziel einer danger-Aktion.
function BestaetigenSchritt({ katalog, steuerung, onZurueck }: BestaetigenSchrittProps) {
  const { state, pending, absenden } = useDialogFormular(setCatalogActiveAction, steuerung, {
    erfolgsMeldung: "Katalog deaktiviert",
  });
  return (
    <form onSubmit={absenden} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={katalog.id} />
      <input type="hidden" name="active" value="false" />
      <Notice kind="fehler">{state?.error}</Notice>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onZurueck} disabled={steuerung.gesperrt} autoFocus>
          Abbrechen
        </Button>
        <Button type="submit" variant="danger" disabled={pending || steuerung.gesperrt}>
          {pending ? "Deaktivieren …" : "Deaktivieren"}
        </Button>
      </div>
    </form>
  );
}
