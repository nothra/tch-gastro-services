import Link from "next/link";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { formatCents } from "@/lib/money";
import type { KassierTagessummen } from "../../kassierSummen";

// Summenkarte über der Teilnehmerliste der Kassieren-Seite (spec-371 AK1–AK6). Rein darstellend:
// alle Zahlen kommen aus `kassierTagessummen` (ADR-033 D5, ADR-055 D1) – hier wird nichts
// nachgerechnet außer der Anzahl bezahlter Zeilen als Gegenstück der offenen. Sie liegt außerhalb
// der eingefrorenen Liste (#253) und folgt deshalb nach jedem Kassieren dem Server-Stand (AK16).

interface KassierSummenKarteProps {
  veranstaltungId: string;
  tagessummen: KassierTagessummen;
  anzahlZeilen: number;
  /** Nur abschließbare Veranstaltungen verlinken zum Abschluss – die Theke nicht (AK23). */
  abschliessbar: boolean;
}

export function KassierSummenKarte({
  veranstaltungId,
  tagessummen,
  anzahlZeilen,
  abschliessbar,
}: KassierSummenKarteProps) {
  const { offeneZeilen } = tagessummen;
  const bezahlteZeilen = anzahlZeilen - offeneZeilen;

  return (
    <section aria-labelledby="kassenstand-ueberschrift">
      <Card className="flex flex-col gap-3">
        <h2 id="kassenstand-ueberschrift" className="sr-only">
          Kassenstand
        </h2>
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          <Kennzahl label="Offener Betrag" cents={tagessummen.offenerBetragCents} />
          <Kennzahl label="Erhalten" cents={tagessummen.erhaltenCents} />
          <Kennzahl label="Spenden" cents={tagessummen.spendeCents} />
        </dl>
        <p className="text-sm text-muted">
          {bezahlteZeilen} von {anzahlZeilen} bezahlt
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge tone={offeneZeilen > 0 ? "warnung" : "erfolg"}>
            {offeneZeilen > 0 ? `Noch ${offeneZeilen} offen` : "Alles bezahlt"}
          </Badge>
          {abschliessbar && (
            <Link
              href={`/veranstaltung/${veranstaltungId}`}
              className="inline-flex min-h-11 items-center text-sm text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
            >
              Abschluss auf der Veranstaltungsseite
            </Link>
          )}
        </div>
      </Card>
    </section>
  );
}

function Kennzahl({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{formatCents(cents)}</dd>
    </div>
  );
}
