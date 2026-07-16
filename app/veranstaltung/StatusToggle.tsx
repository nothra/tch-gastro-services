import type { VeranstaltungStatus } from "@/db/schema";
import { setStatusAction } from "./actions";

// Abschließen (F8) bzw. protokolliertes Wiederöffnen durch den Veranstalter. Das versteckte
// Zielstatus-Feld kippt jeweils auf den Gegenwert.
export function StatusToggle({ id, status }: { id: string; status: VeranstaltungStatus }) {
  const offen = status === "offen";
  return (
    <form action={setStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={offen ? "abgeschlossen" : "offen"} />
      <button
        type="submit"
        className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
      >
        {offen ? "Abschließen" : "Wieder öffnen"}
      </button>
    </form>
  );
}
