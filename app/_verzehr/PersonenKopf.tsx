import { formatCents } from "@/lib/money";
import { KATEGORIE_LABEL } from "./kategorien";
import type { ZeileSummen } from "./summen";

// Kopf der aktiven Person in der Einzelansicht (spec-370 AK1, ADR-054 D1): Name groß links,
// Gesamtbetrag groß rechts, darunter klein die Aufschlüsselung. Der Name darf zweizeilig umbrechen
// (danach Auslassung), der Betrag bricht nie um – er ist bei langen Familiennamen die eigentliche
// Information (AK1.2).
export function PersonenKopf({ name, summen }: { name: string; summen: ZeileSummen }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-3">
        <h2 className="line-clamp-2 min-w-0 break-words text-xl font-semibold">{name}</h2>
        <p className="shrink-0 whitespace-nowrap">
          <span className="sr-only">Gesamt </span>
          <span className="text-xl font-bold tabular-nums">{formatCents(summen.gesamtCents)}</span>
        </p>
      </div>
      <p className="text-sm text-muted tabular-nums">
        {KATEGORIE_LABEL.getraenk} {formatCents(summen.getraenkeCents)} · {KATEGORIE_LABEL.kaffee}{" "}
        {formatCents(summen.kaffeeCents)} · {KATEGORIE_LABEL.essen} {formatCents(summen.essenCents)}
      </p>
    </div>
  );
}
