import { formatCents } from "@/lib/money";
import { AUSLAGE_KATEGORIE_LABEL, AUSLAGE_KATEGORIE_ORDER, AUSLAGE_STATUS_LABEL } from "./labels";
import type { AuslagenSummen, KategorieSummen } from "./auslagenSummen";

// Präsentationale Übersicht der Auslagen-Summen (ADR-028 D4): je Kategorie und gesamt, getrennt
// nach „offen zu erstatten" und „erstattet". Reine Anzeige – die Summen berechnet das DB-freie
// `auslagenSummen`-Modul, die Beträge formatiert `formatCents` (de-DE).
function SummenRow({ label, summen, bold }: { label: string; summen: KategorieSummen; bold?: boolean }) {
  const cellClass = bold ? "font-semibold" : "";
  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className={`py-1 pr-4 ${cellClass}`}>{label}</td>
      <td className={`py-1 pr-4 text-right tabular-nums ${cellClass}`}>
        {formatCents(summen.offenCents)}
      </td>
      <td className={`py-1 text-right tabular-nums ${cellClass}`}>
        {formatCents(summen.erstattetCents)}
      </td>
    </tr>
  );
}

export function AuslagenSummary({ summen }: { summen: AuslagenSummen }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Übersicht</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="py-1 pr-4 font-medium">Kategorie</th>
            <th className="py-1 pr-4 text-right font-medium">{AUSLAGE_STATUS_LABEL.offen}</th>
            <th className="py-1 text-right font-medium">{AUSLAGE_STATUS_LABEL.erstattet}</th>
          </tr>
        </thead>
        <tbody>
          {AUSLAGE_KATEGORIE_ORDER.map((kategorie) => (
            <SummenRow
              key={kategorie}
              label={AUSLAGE_KATEGORIE_LABEL[kategorie]}
              summen={summen[kategorie]}
            />
          ))}
          <SummenRow label="Gesamt" summen={summen.gesamt} bold />
        </tbody>
      </table>
    </section>
  );
}
