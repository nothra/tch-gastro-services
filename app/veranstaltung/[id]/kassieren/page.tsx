import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse } from "@/db/schema";
import { centsToEuroInput, formatCents } from "@/lib/money";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import { listEreignisse } from "@/db/veranstaltung-ereignis";
import { kassiereZeileAction } from "../../actions";
import { gesamtabrechnung, kassierTagessummen, kassierZeilen } from "../../kassierSummen";
import { auslagenSummen } from "../../auslagenSummen";
import { StatusToggle } from "../../StatusToggle";
import { KassiereZeileForm } from "../../KassiereZeileForm";
import {
  AUSLAGE_KATEGORIE_LABEL,
  AUSLAGE_KATEGORIE_ORDER,
  EREIGNIS_ART_LABEL,
  KASSE_LABEL,
  STATUS_LABEL,
  formatDatum,
  formatZeitpunkt,
} from "../../labels";

// Authentifizierte Kassier-Seite (F8, #55, ADR-033 D6): kassiert je Teilnehmerzeile den vollen
// Verzehr-Gesamt bar (`Erhalten`), zeigt die abgeleitete Spende + den Zeilenstatus (bezahlt/offen),
// die Tagessummen und die Veranstaltungs-Gesamtabrechnung je zugeordneter Kasse. Abschluss/
// Wiederöffnen (mit fail-closed Ablehnung bei offener Zeile) über den StatusToggle. Nur
// Veranstalter (serverseitig auch in den Actions durchgesetzt). Liegt unter dem bereits von
// `proxy.ts` geschützten Bereich – keine Ausnahme nötig (Codify #63).
export default async function KassierenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-600 dark:text-zinc-400">
          Kein Zugriff – nur Veranstalter dürfen kassieren.
        </p>
      </main>
    );
  }

  const veranstaltung = await getVeranstaltung(id);
  if (!veranstaltung) notFound();

  const [zeilen, positionen, auslagen, ereignisse] = await Promise.all([
    listZeilen(id),
    listPositionen(id),
    listAuslagen(id),
    listEreignisse(id),
  ]);
  const offen = veranstaltung.status === "offen";

  // SINGLE SOURCE (ADR-033 D5): dieselbe Berechnung speist Zeilenanzeige, Tagessummen und (in der
  // Action) das Abschluss-Gate. Die Reihenfolge entspricht `zeilen` (map-stabil) → per Index zippen.
  const kassierRows = kassierZeilen(zeilen, positionen);
  const zeilenMitKassier = zeilen.map((zeile, index) => ({ zeile, kassier: kassierRows[index] }));
  const tagessummen = kassierTagessummen(kassierRows);
  const ausgaben = auslagenSummen(auslagen);
  const abrechnung = gesamtabrechnung(tagessummen.erhaltenCents, ausgaben.gesamt.erstattetCents);

  // Serverseitig gebundenes, vertrauenswürdiges Argument (analog adjustVerzehrAction) – der Client
  // liefert die veranstaltungId nie im Formular.
  const kassiereAction = kassiereZeileAction.bind(null, id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/veranstaltung/${id}`}
          className="text-sm text-cyan-700 hover:underline dark:text-cyan-400"
        >
          ← Zur Veranstaltung
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Kassieren · {veranstaltung.bezeichnung}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDatum(veranstaltung.datum)} · {KASSE_LABEL[veranstaltung.kasse as Kasse]} ·{" "}
          {STATUS_LABEL[veranstaltung.status]}
        </p>
      </div>

      <StatusToggle id={veranstaltung.id} status={veranstaltung.status} />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Teilnehmer ({zeilen.length})</h2>
        {zeilen.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Teilnehmer erfasst.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {zeilenMitKassier.map(({ zeile, kassier }) => (
              <li
                key={zeile.id}
                className="flex flex-col gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{zeile.anzeigename}</span>
                  <span
                    className={
                      kassier.bezahlt
                        ? "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {kassier.bezahlt ? "bezahlt" : "offen"}
                  </span>
                </div>
                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="flex gap-2">
                    <dt>Getränke</dt>
                    <dd className="tabular-nums">{formatCents(kassier.getraenkeCents)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>Sonstige</dt>
                    <dd className="tabular-nums">{formatCents(kassier.sonstigeCents)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium text-zinc-900 dark:text-zinc-100">Verzehr-Gesamt</dt>
                    <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatCents(kassier.verzehrGesamtCents)}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>Spende</dt>
                    <dd className="tabular-nums">{formatCents(kassier.spendeCents)}</dd>
                  </div>
                </dl>
                {offen ? (
                  <KassiereZeileForm
                    action={kassiereAction}
                    zeileId={zeile.id}
                    initialErhalten={
                      kassier.erhaltenCents === null ? "" : centsToEuroInput(kassier.erhaltenCents)
                    }
                  />
                ) : (
                  <p className="text-sm">
                    Erhalten:{" "}
                    <span className="tabular-nums">
                      {kassier.erhaltenCents === null ? "—" : formatCents(kassier.erhaltenCents)}
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Tagessummen</h2>
        <table className="w-full text-sm">
          <tbody>
            <SummenZeile label="Getränke" cents={tagessummen.getraenkeCents} />
            <SummenZeile label="Sonstige" cents={tagessummen.sonstigeCents} />
            <SummenZeile label="Verzehr-Gesamt" cents={tagessummen.verzehrGesamtCents} />
            <SummenZeile label="Erhalten" cents={tagessummen.erhaltenCents} />
            <SummenZeile label="Spende" cents={tagessummen.spendeCents} bold />
          </tbody>
        </table>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Offene Zeilen: <span className="tabular-nums">{tagessummen.offeneZeilen}</span>
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">
          Gesamtabrechnung (Kasse: {KASSE_LABEL[veranstaltung.kasse as Kasse]})
        </h2>
        <table className="w-full text-sm">
          <tbody>
            <SummenZeile label="Einnahmen (Σ Erhalten)" cents={abrechnung.einnahmenCents} />
            {AUSLAGE_KATEGORIE_ORDER.map((kategorie) => (
              <SummenZeile
                key={kategorie}
                label={`Ausgaben – ${AUSLAGE_KATEGORIE_LABEL[kategorie]}`}
                cents={ausgaben[kategorie].erstattetCents}
              />
            ))}
            <SummenZeile
              label="Ausgaben – Auslagenerstattungen gesamt"
              cents={abrechnung.ausgabenErstattetCents}
            />
            <SummenZeile label="Kassenveränderung" cents={abrechnung.kassenveraenderungCents} bold />
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Protokoll</h2>
        {ereignisse.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Noch kein Abschluss oder Wiederöffnen protokolliert.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {ereignisse.map((ereignis) => (
              <li key={ereignis.id} className="flex flex-wrap gap-x-2 text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">{EREIGNIS_ART_LABEL[ereignis.art]}</span>
                <span>· {ereignis.akteurName ?? "—"}</span>
                <span className="tabular-nums">· {formatZeitpunkt(ereignis.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// Präsentationale Summen-Zeile (rechtsbündig, tabular-nums) – die Beträge formatiert `formatCents`.
function SummenZeile({ label, cents, bold }: { label: string; cents: number; bold?: boolean }) {
  const cellClass = bold ? "font-semibold" : "";
  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className={`py-1 pr-4 ${cellClass}`}>{label}</td>
      <td className={`py-1 text-right tabular-nums ${cellClass}`}>{formatCents(cents)}</td>
    </tr>
  );
}
