"use client";

import { useState } from "react";
import { centsToEuroInput, formatCents } from "@/lib/money";
import type { AuslageRow as AuslageRowData } from "@/db/auslage";
import { AUSLAGE_KATEGORIE_LABEL, AUSLAGE_STATUS_LABEL } from "./labels";
import { AuslageForm, type AuslageFormTeilnehmer } from "./AuslageForm";
import { removeAuslageAction, setAuslageStatusAction, updateAuslageAction } from "./actions";

const buttonClass = "rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700";

// Eine Auslagen-Zeile (F6, #53, ADR-028): Anzeige plus – solange die Veranstaltung offen ist –
// Erstattung umschalten (offen ⇄ erstattet), Inline-Korrektur und Löschen. Alle Mutationen laufen
// über scope-gebundene Server-Actions; `veranstaltungId` steht als Hidden im WHERE (IDOR, Codify #51).
export function AuslageRow({
  auslage,
  veranstaltungId,
  teilnehmer,
  editable,
}: {
  auslage: AuslageRowData;
  veranstaltungId: string;
  teilnehmer: readonly AuslageFormTeilnehmer[];
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    // veranstaltungId + auslageId sind serverseitig gebunden – der Client sendet sie nicht.
    const editAction = updateAuslageAction.bind(null, veranstaltungId, auslage.id);
    return (
      <li className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <AuslageForm
          action={editAction}
          teilnehmer={teilnehmer}
          submitLabel="Speichern"
          initial={{
            teilnehmerId: auslage.teilnehmerId,
            kategorie: auslage.kategorie,
            betrag: centsToEuroInput(auslage.betragCents),
            zweck: auslage.zweck ?? "",
          }}
          onSuccess={() => setEditing(false)}
        />
        <button type="button" onClick={() => setEditing(false)} className={`w-fit ${buttonClass}`}>
          Abbrechen
        </button>
      </li>
    );
  }

  const erstattet = auslage.status === "erstattet";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-col">
        <span className="font-medium">{auslage.anzeigename}</span>
        <span className="flex flex-wrap gap-x-1 text-sm text-zinc-600 dark:text-zinc-400">
          <span>{AUSLAGE_KATEGORIE_LABEL[auslage.kategorie]}</span>
          <span aria-hidden>·</span>
          <span>{formatCents(auslage.betragCents)}</span>
          <span aria-hidden>·</span>
          <span>{AUSLAGE_STATUS_LABEL[auslage.status]}</span>
          {auslage.zweck && (
            <>
              <span aria-hidden>·</span>
              <span>{auslage.zweck}</span>
            </>
          )}
        </span>
      </div>

      {editable && (
        <div className="flex items-center gap-2">
          <form action={setAuslageStatusAction}>
            <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
            <input type="hidden" name="id" value={auslage.id} />
            <input type="hidden" name="status" value={erstattet ? "offen" : "erstattet"} />
            <button type="submit" className={buttonClass}>
              {erstattet ? "Erstattung zurücknehmen" : "Als erstattet markieren"}
            </button>
          </form>
          <button type="button" onClick={() => setEditing(true)} className={buttonClass}>
            Bearbeiten
          </button>
          <form action={removeAuslageAction}>
            <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
            <input type="hidden" name="id" value={auslage.id} />
            <button type="submit" className={buttonClass}>
              Löschen
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
