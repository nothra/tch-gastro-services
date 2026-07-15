import type { VeranstaltungZeile } from "@/db/schema";
import { removeZeileAction } from "./actions";

// Eine Teilnehmerzeile: zeigt den Namens-Snapshot. Solange die Veranstaltung offen ist
// (`editable`), kann der Veranstalter die Zeile entfernen. In #51 gibt es noch keine erfassten
// Positionen (F5) – daher kein Bestätigungs-Dialog (spec-51, ADR-023 D7).
export function ZeileRow({
  zeile,
  veranstaltungId,
  editable,
}: {
  zeile: VeranstaltungZeile;
  veranstaltungId: string;
  editable: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="font-medium">{zeile.anzeigename}</span>
      {editable && (
        <form action={removeZeileAction}>
          <input type="hidden" name="veranstaltungId" value={veranstaltungId} />
          <input type="hidden" name="zeileId" value={zeile.id} />
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          >
            Entfernen
          </button>
        </form>
      )}
    </li>
  );
}
