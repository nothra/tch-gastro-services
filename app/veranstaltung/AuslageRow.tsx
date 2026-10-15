"use client";

import type { RefObject } from "react";
import type { AuslageStatus } from "@/db/schema";
import type { AuslageRow as AuslageRowData } from "@/db/auslage";
import { centsToEuroInput, formatCents } from "@/lib/money";
import { useFormularDialog } from "@/app/components/FormularDialog";
import { AktionsMenue, MenueEintrag } from "@/app/components/ui/AktionsMenue";
import { Badge, type BadgeTone } from "@/app/components/ui/Badge";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Dialog } from "@/app/components/ui/Dialog";
import { ListenZeile } from "@/app/components/ui/ListenZeile";
import { Notice } from "@/app/components/ui/Notice";
import { useBestaetigung } from "@/app/components/useBestaetigung";
import { useSchliessendeAction } from "@/app/components/useSchliessendeAction";
import { AUSLAGE_KATEGORIE_LABEL } from "./labels";
import { AuslageFormular, type AuslageFormTeilnehmer } from "./AuslageForm";
import { removeAuslageAction, setAuslageStatusAction, updateAuslageAction } from "./actions";
import { AUSLAGEN_LISTE_ID } from "./auslagenListe";

// Eine Auslagen-Zeile (F6, #53, ADR-028; Umbau spec-406, ADR-061 D4): `ListenZeile` mit Betrag
// und Status-Badge; Tipp öffnet „Auslage bearbeiten", das ⋯-Menü trägt Erstatten, Bearbeiten und
// Löschen. Alle Mutationen laufen über scope-gebundene Server-Actions; `veranstaltungId` steht als
// Hidden bzw. gebundenes Argument im WHERE (IDOR, Codify #51).

// Der Status steht als Text im Badge, nie nur als Farbe (spec-406 AK2.2).
const STATUS_BADGE: Record<AuslageStatus, { text: string; tone: BadgeTone }> = {
  offen: { text: "offen", tone: "warnung" },
  erstattet: { text: "erstattet", tone: "erfolg" },
};

interface AuslageRowProps {
  auslage: AuslageRowData;
  veranstaltungId: string;
  teilnehmer: readonly AuslageFormTeilnehmer[];
  editable: boolean;
}

export function AuslageRow({ auslage, veranstaltungId, teilnehmer, editable }: AuslageRowProps) {
  if (!editable) return <AuslageAnzeige auslage={auslage} />;
  return (
    <AuslageBedienZeile
      auslage={auslage}
      veranstaltungId={veranstaltungId}
      teilnehmer={teilnehmer}
    />
  );
}

function untertitel({ kategorie, zweck }: AuslageRowData): string {
  const kategorieLabel = AUSLAGE_KATEGORIE_LABEL[kategorie];
  return zweck ? `${kategorieLabel} · ${zweck}` : kategorieLabel;
}

function AuslageKennzeichen({ auslage }: { auslage: AuslageRowData }) {
  const { text, tone } = STATUS_BADGE[auslage.status];
  return (
    <>
      <span className="font-semibold tabular-nums">{formatCents(auslage.betragCents)}</span>
      <Badge tone={tone}>{text}</Badge>
    </>
  );
}

// Nur-lesen-Karte der abgeschlossenen Veranstaltung (F2, ADR-061 D4): `ListenZeile` hat keinen
// Modus ohne Tipp-Ziel, deshalb dieselben Karten-Tokens ohne Button und Menü. Die Kartenoptik ist
// im Test an die von `ListenZeile` gebunden (Drift-Anker).
function AuslageAnzeige({ auslage }: { auslage: AuslageRowData }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line-subtle bg-surface p-3 text-foreground">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold break-words">{auslage.anzeigename}</span>
        <span className="text-sm break-words text-muted">{untertitel(auslage)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <AuslageKennzeichen auslage={auslage} />
      </span>
    </li>
  );
}

interface AuslageBedienZeileProps {
  auslage: AuslageRowData;
  veranstaltungId: string;
  teilnehmer: readonly AuslageFormTeilnehmer[];
}

function AuslageBedienZeile({ auslage, veranstaltungId, teilnehmer }: AuslageBedienZeileProps) {
  // Ersatz-Fokusziel, falls die Zeile nach einem Erfolg neu gemountet wird (Lesson #371).
  const zeilenId = `auslage-${auslage.id}`;
  const {
    ausloeserRef: zeilenRef,
    oeffnen: bearbeitenOeffnen,
    steuerung,
    dialogProps: bearbeitenDialogProps,
  } = useFormularDialog(zeilenId);
  // Nach dem Löschen verschwindet die Zeile samt ⋯-Knopf – der Fokus geht auf die Liste.
  const {
    ausloeserRef: menueRef,
    oeffnen: loeschenOeffnen,
    durchlauf,
    dialogProps: loeschDialogProps,
    schliessenNachErfolg,
  } = useBestaetigung(AUSLAGEN_LISTE_ID);
  // veranstaltungId + auslageId sind serverseitig gebunden – der Client sendet sie nicht.
  const editAction = updateAuslageAction.bind(null, veranstaltungId, auslage.id);

  return (
    <ListenZeile
      onOeffnen={bearbeitenOeffnen}
      id={zeilenId}
      ausloeserRef={zeilenRef}
      titel={auslage.anzeigename}
      untertitel={untertitel(auslage)}
      kennzeichen={<AuslageKennzeichen auslage={auslage} />}
      aktion={
        <AktionsMenue label={`Aktionen für ${auslage.anzeigename}`} ausloeserRef={menueRef}>
          {({ schliessen }) => (
            <>
              <ErstattungUmschalten
                auslage={auslage}
                veranstaltungId={veranstaltungId}
                onErfolg={schliessen}
              />
              <MenueEintrag
                onClick={() => {
                  schliessen();
                  bearbeitenOeffnen();
                }}
              >
                Bearbeiten
              </MenueEintrag>
              {/* `type="button"` außerhalb jedes Formulars: sendet auch vor der Hydration nichts ab. */}
              <MenueEintrag
                gefahr
                onClick={() => {
                  schliessen();
                  loeschenOeffnen();
                }}
              >
                Löschen
              </MenueEintrag>
            </>
          )}
        </AktionsMenue>
      }
      anhang={
        <>
          <Dialog {...bearbeitenDialogProps} title="Auslage bearbeiten">
            <AuslageFormular
              action={editAction}
              teilnehmer={teilnehmer}
              steuerung={steuerung}
              initial={{
                teilnehmerId: auslage.teilnehmerId,
                kategorie: auslage.kategorie,
                betrag: centsToEuroInput(auslage.betragCents),
                zweck: auslage.zweck ?? "",
              }}
            />
          </Dialog>
          <LoeschBestaetigung
            key={durchlauf}
            {...loeschDialogProps}
            onErfolg={schliessenNachErfolg}
            auslage={auslage}
            veranstaltungId={veranstaltungId}
          />
        </>
      }
    />
  );
}

// Bindet jede Auslagen-Mutation an Veranstaltung + Eintrag (IDOR, Codify #51) – von den
// Mutations-Forms unten geteilt.
function HiddenIds({ veranstaltungId, auslageId }: { veranstaltungId: string; auslageId: string }) {
  return (
    <>
      <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
      <input type="hidden" name="id" value={auslageId} />
    </>
  );
}

interface AuslageAktionProps {
  auslage: AuslageRowData;
  veranstaltungId: string;
}

// Reversibel, deshalb ohne Bestätigung (spec-372, spec-406 AK3.3). Ein Formular im Menü-Popup:
// Erfolg schließt das Menü, eine Ablehnung steht als Notice darunter (ADR-061 D3, FS2).
function ErstattungUmschalten({
  auslage,
  veranstaltungId,
  onErfolg,
}: AuslageAktionProps & { onErfolg: () => void }) {
  const erstattet = auslage.status === "erstattet";
  const [state, formAction, pending] = useSchliessendeAction(setAuslageStatusAction, {
    onErfolg,
    erfolgsMeldung: erstattet ? "Erstattung zurückgenommen" : "Auslage erstattet",
  });

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <HiddenIds veranstaltungId={veranstaltungId} auslageId={auslage.id} />
      <input type="hidden" name="status" value={erstattet ? "offen" : "erstattet"} />
      <MenueEintrag type="submit" disabled={pending}>
        {erstattet ? "Erstattung zurücknehmen" : "Als erstattet markieren"}
      </MenueEintrag>
      <Notice kind="fehler">{state?.error}</Notice>
    </form>
  );
}

interface LoeschBestaetigungProps extends AuslageAktionProps {
  open: boolean;
  onClose: () => void;
  onErfolg: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

// Löschen ist endgültig und fragt deshalb nach (spec-372 AK1, ADR-058 D4, spec-406 AK4).
function LoeschBestaetigung({
  open,
  onClose,
  onErfolg,
  returnFocusRef,
  auslage,
  veranstaltungId,
}: LoeschBestaetigungProps) {
  const [state, formAction, pending] = useSchliessendeAction(removeAuslageAction, {
    onErfolg,
    erfolgsMeldung: "Auslage gelöscht",
  });
  const kategorie = AUSLAGE_KATEGORIE_LABEL[auslage.kategorie];

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Auslage löschen?"
      description={`Die Auslage von „${auslage.anzeigename}“ (${kategorie}, ${formatCents(auslage.betragCents)}) wird gelöscht. Das kann nicht rückgängig gemacht werden.`}
      confirmLabel="Löschen"
      pendingLabel="Löschen …"
      variant="danger"
      action={formAction}
      error={state?.error}
      pending={pending}
    >
      <HiddenIds veranstaltungId={veranstaltungId} auslageId={auslage.id} />
    </ConfirmDialog>
  );
}
