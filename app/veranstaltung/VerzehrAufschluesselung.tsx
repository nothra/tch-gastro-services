import { formatCents } from "@/lib/money";
import { artikelBezeichnung, type VerzehrPositionDetail } from "@/app/_verzehr/positionen";

// Präsentationale, aufklappbare Verzehr-Aufschlüsselung einer Teilnehmerzeile (F8, #206, spec-206):
// zeigt je konsumierter Position Menge, Bezeichnung (inkl. Größe), Einzelpreis und Positionsbetrag.
// Native <details>/<summary> → standardmäßig eingeklappt, tastaturbedienbar und ohne Client-JS, damit
// die Kassier-Seite Server Component bleiben kann. Reine Anzeige: die Positionen liefert das DB-freie
// `verzehrPositionen` (SINGLE SOURCE mit dem Abschlussbericht), die Beträge formatiert `formatCents`
// (de-DE) – die Summe der Positionsbeträge entspricht per Konstruktion dem Verzehr-Gesamt der Zeile.
export function VerzehrAufschluesselung({
  positionen,
}: {
  positionen: readonly VerzehrPositionDetail[];
}) {
  return (
    <details className="text-sm text-zinc-600 dark:text-zinc-400">
      <summary className="cursor-pointer select-none text-cyan-700 hover:underline dark:text-cyan-400">
        Verzehr anzeigen
      </summary>
      {positionen.length === 0 ? (
        <p className="mt-2">Kein Verzehr erfasst</p>
      ) : (
        <table className="mt-2 w-full">
          <thead className="sr-only">
            <tr>
              <th>Menge</th>
              <th>Artikel</th>
              <th>Einzelpreis</th>
              <th>Positionsbetrag</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((position) => (
              <tr key={`${position.category}-${position.name}-${position.size}`}>
                <td className="py-0.5 pr-3 tabular-nums whitespace-nowrap">{position.menge} ×</td>
                <td className="py-0.5 pr-3">{artikelBezeichnung(position)}</td>
                <td className="py-0.5 pr-3 text-right tabular-nums">
                  {formatCents(position.einzelpreisCents)}
                </td>
                <td className="py-0.5 text-right tabular-nums">
                  {formatCents(position.zeilenbetragCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
