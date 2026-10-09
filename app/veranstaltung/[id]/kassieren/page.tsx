import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse, VeranstaltungEreignis, VeranstaltungZeile } from "@/db/schema";
import { centsToEuroInput, formatCents } from "@/lib/money";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import { listEreignisse } from "@/db/veranstaltung-ereignis";
import {
  gruppierePositionenNachZeile,
  verzehrPositionen,
  type VerzehrPositionDetail,
} from "@/app/_verzehr/positionen";
import { Aufklapper } from "@/app/components/ui/Aufklapper";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { kassiereZeileAction } from "../../actions";
import {
  gesamtabrechnung,
  kassierTagessummen,
  kassierZeilen,
  type Gesamtabrechnung,
  type KassierTagessummen,
  type KassierZeile,
} from "../../kassierSummen";
import { auslagenSummen, type AuslagenSummen } from "../../auslagenSummen";
import { KassiereZeileForm } from "../../KassiereZeileForm";
import { KassierZeilenListe } from "../../KassierZeilenListe";
import { VerzehrAufschluesselung } from "../../VerzehrAufschluesselung";
import {
  AUSLAGE_KATEGORIE_LABEL,
  AUSLAGE_KATEGORIE_ORDER,
  EREIGNIS_ART_LABEL,
  KASSE_LABEL,
  STATUS_LABEL,
  formatDatum,
  formatZeitpunkt,
} from "../../labels";
import {
  WECHSEL_LINK_CLASS,
  personenbezogeneZeileId,
  verzehrHref,
  type SeitenSuchparameter,
} from "../../personenbezug";
import { KassierSummenKarte } from "./KassierSummenKarte";

// Authentifizierte Kassier-Seite (F8, #55, ADR-033 D6; Aufbau spec-371): Summenkarte oben, darunter
// je Teilnehmerzeile das Kassieren des vollen Verzehr-Gesamt bar (`Erhalten`) mit Live-Spende und
// Zeilenstatus, zuletzt eingeklappt Tagessummen, Gesamtabrechnung je Kasse und Protokoll.
// Abschließen/Wieder öffnen gibt es hier nicht mehr – das sitzt im Kopf der Detailseite (ADR-055
// D3). Nur Veranstalter (serverseitig auch in den Actions durchgesetzt). Liegt unter dem bereits
// von `proxy.ts` geschützten Bereich – keine Ausnahme nötig (Codify #63).
// Der Aufruf kann einen Personenbezug tragen (#308): dann wird die Zeile dieser Person hervorgehoben,
// angescrollt und ihr `Erhalten`-Feld fokussiert; jede Zeile bietet den Rückweg in die Erfassung an.
export default async function KassierenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SeitenSuchparameter>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Kein Zugriff – nur Veranstalter dürfen kassieren.</p>
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
  const kasseLabel = KASSE_LABEL[veranstaltung.kasse as Kasse];

  // SINGLE SOURCE (ADR-033 D5): dieselbe Berechnung speist Summenkarte, Zeilenanzeige, Tagessummen
  // und (in der Action) das Abschluss-Gate. Die Reihenfolge entspricht `zeilen` (map-stabil) → per
  // Index zippen.
  const kassierRows = kassierZeilen(zeilen, positionen);
  // Dieselben Positionen speisen die Zeilensummen (`kassierZeilen`) und die Aufschlüsselung
  // (`verzehrPositionen`) – so ist die Summe der Positionsbeträge per Konstruktion das
  // Verzehr-Gesamt der Zeile (kein zweiter Wahrheitspfad).
  const positionenJeZeile = gruppierePositionenNachZeile(positionen);
  // Offene Kassiervorgänge zuerst (#223): erst NACH dem Zippen von zeile/kassier/positionen stabil
  // nach dem abgeleiteten Offen-Status sortieren, damit die Index-Kopplung nicht bricht. `listZeilen`
  // liefert bereits alphabetisch und `Array.prototype.sort` ist stabil → die Alphabetik bleibt je
  // Gruppe erhalten; kein zweites Sortierkriterium nötig.
  // Diese Sortierung gilt für jeden Seitenaufruf; innerhalb einer laufenden Sitzung hält
  // `KassierZeilenListe` die zuerst gerenderte Reihenfolge fest, damit eine gerade kassierte
  // Zeile nicht sofort nach unten springt (#253).
  const zeilenMitKassier = zeilen
    .map((zeile, index) => ({
      zeile,
      kassier: kassierRows[index],
      positionen: verzehrPositionen(positionenJeZeile.get(zeile.id) ?? []),
    }))
    .sort((a, b) => Number(a.kassier.bezahlt) - Number(b.kassier.bezahlt));
  const tagessummen = kassierTagessummen(kassierRows);
  const ausgaben = auslagenSummen(auslagen);
  const abrechnung = gesamtabrechnung(tagessummen.erhaltenCents, ausgaben.gesamt.erstattetCents);

  // Serverseitig gebundenes, vertrauenswürdiges Argument (analog adjustVerzehrAction) – der Client
  // liefert die veranstaltungId nie im Formular.
  const kassiereAction = kassiereZeileAction.bind(null, id);

  // Personenbezug des Aufrufs (#308 AK2/AK3/AK11), aufgelöst gegen die Zeilen DIESER Veranstaltung –
  // ein unbekannter Wert ergibt `null` und damit den Standardzustand der Seite (F1). Er steuert
  // ausschließlich Hervorhebung, Anscrollen und Eingabefokus: Reihenfolge (#223/#253), Summen und
  // Zeilenstatus bleiben unberührt (AK4/AK12).
  const zielZeileId = personenbezogeneZeileId(
    await searchParams,
    zeilen.map((zeile) => zeile.id),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title={`Kassieren · ${veranstaltung.bezeichnung}`}
        back={{ href: `/veranstaltung/${id}`, label: "Zur Veranstaltung" }}
        meta={`${formatDatum(veranstaltung.datum)} · ${kasseLabel} · ${STATUS_LABEL[veranstaltung.status]}`}
      />

      <KassierSummenKarte
        veranstaltungId={id}
        tagessummen={tagessummen}
        anzahlZeilen={zeilen.length}
        abschliessbar={veranstaltung.typ === "veranstaltung"}
      />

      <section className="flex flex-col gap-3">
        <h2>Teilnehmer ({zeilen.length})</h2>
        {zeilen.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Teilnehmer erfasst.</p>
        ) : (
          <KassierZeilenListe
            hervorgehobeneZeileId={zielZeileId}
            zeilen={zeilenMitKassier.map(({ zeile, kassier, positionen: zeilenPositionen }) => ({
              id: zeile.id,
              inhalt: (
                <ZeilenInhalt
                  veranstaltungId={id}
                  zeile={zeile}
                  kassier={kassier}
                  positionen={zeilenPositionen}
                  kassieren={
                    offen && (
                      <KassiereZeileForm
                        action={kassiereAction}
                        zeileId={zeile.id}
                        initialErhalten={
                          kassier.erhaltenCents === null
                            ? ""
                            : centsToEuroInput(kassier.erhaltenCents)
                        }
                        verzehrGesamtCents={kassier.verzehrGesamtCents}
                        // Nur die Zeile des Personenbezugs fordert den Fokus an (#308 AK3) – sonst
                        // zöge ihn bei vielen Teilnehmern die letzte gerenderte Zeile an sich.
                        autoFocusErhalten={zeile.id === zielZeileId}
                      />
                    )
                  }
                />
              ),
            }))}
          />
        )}
      </section>

      <AbrechnungImDetail
        kasseLabel={kasseLabel}
        tagessummen={tagessummen}
        ausgaben={ausgaben}
        abrechnung={abrechnung}
        ereignisse={ereignisse}
      />
    </main>
  );
}

// Inhalt einer Teilnehmerzeile (spec-371 AK7): Name + Status-Badge, Verzehr je Kategorie und
// Verzehr-Gesamt, die Aufschlüsselung, dann Kassieren (offen) bzw. die Lesesicht (abgeschlossen).
function ZeilenInhalt({
  veranstaltungId,
  zeile,
  kassier,
  positionen,
  kassieren,
}: {
  veranstaltungId: string;
  zeile: VeranstaltungZeile;
  kassier: KassierZeile;
  positionen: VerzehrPositionDetail[];
  kassieren: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{zeile.anzeigename}</span>
        <Badge tone={kassier.bezahlt ? "erfolg" : "warnung"}>
          {kassier.bezahlt ? "bezahlt" : "offen"}
        </Badge>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <BetragEintrag label="Getränke" cents={kassier.getraenkeCents} />
        <BetragEintrag label="Essen" cents={kassier.essenCents} />
        <BetragEintrag label="Kaffee" cents={kassier.kaffeeCents} />
        <div className="flex gap-2">
          <dt className="font-semibold text-foreground">Verzehr-Gesamt</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {formatCents(kassier.verzehrGesamtCents)}
          </dd>
        </div>
      </dl>
      <VerzehrAufschluesselung positionen={positionen} />
      {kassieren || (
        // Lesesicht der abgeschlossenen Veranstaltung (spec-371 AK10): kein Eingabefeld, die
        // abgeleitete Spende steht deshalb hier statt in der Live-Vorschau des Formulars.
        <p className="text-sm tabular-nums">
          Erhalten: {kassier.erhaltenCents === null ? "—" : formatCents(kassier.erhaltenCents)} ·
          Spende: {formatCents(kassier.spendeCents)}
        </p>
      )}

      {/* Rückweg in die Erfassung DIESER Person (#308 AK5) – reine Navigation, deshalb
          auch in der Lesesicht der abgeschlossenen Veranstaltung (AK10). */}
      <Link href={verzehrHref(veranstaltungId, zeile.id)} className={WECHSEL_LINK_CLASS}>
        ← Verzehr erfassen
      </Link>
    </>
  );
}

function BetragEintrag({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex gap-2">
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatCents(cents)}</dd>
    </div>
  );
}

// Tagessummen, Gesamtabrechnung und Protokoll standardmäßig eingeklappt (spec-371 AK14/AK15,
// ADR-055 D4): `Aufklapper` (natives `<details>`, spec-403 AK5.1) – aufgeklappt dieselben Zeilen
// und Werte wie bisher. Rahmen und Fläche trägt die `Card` (ADR-052 D1); `py-0`, weil das
// `<summary>` seine Tipp-Höhe selbst mitbringt.
function AbrechnungImDetail({
  kasseLabel,
  tagessummen,
  ausgaben,
  abrechnung,
  ereignisse,
}: {
  kasseLabel: string;
  tagessummen: KassierTagessummen;
  ausgaben: AuslagenSummen;
  abrechnung: Gesamtabrechnung;
  ereignisse: VeranstaltungEreignis[];
}) {
  return (
    <Card className="py-0">
      <Aufklapper titel="Abrechnung im Detail">
        <div className="flex flex-col gap-6 border-t border-line-subtle py-4">
          <section className="flex flex-col gap-2">
            <h2>Tagessummen</h2>
            <table className="w-full text-sm">
              <tbody>
                <SummenZeile label="Getränke" cents={tagessummen.getraenkeCents} />
                <SummenZeile label="Essen" cents={tagessummen.essenCents} />
                <SummenZeile label="Kaffee" cents={tagessummen.kaffeeCents} />
                <SummenZeile label="Verzehr-Gesamt" cents={tagessummen.verzehrGesamtCents} bold />
                <SummenZeile label="Erhalten" cents={tagessummen.erhaltenCents} />
                <SummenZeile label="Spende" cents={tagessummen.spendeCents} bold />
              </tbody>
            </table>
            <p className="text-sm text-muted">
              Offene Zeilen: <span className="tabular-nums">{tagessummen.offeneZeilen}</span>
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2>Gesamtabrechnung (Kasse: {kasseLabel})</h2>
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
                <SummenZeile
                  label="Kassenveränderung"
                  cents={abrechnung.kassenveraenderungCents}
                  bold
                />
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-2">
            <h2>Protokoll</h2>
            {ereignisse.length === 0 ? (
              <p className="text-sm text-muted">
                Noch kein Abschluss oder Wiederöffnen protokolliert.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {ereignisse.map((ereignis) => (
                  <li key={ereignis.id} className="flex flex-wrap gap-x-2 text-foreground">
                    <span className="font-medium">{EREIGNIS_ART_LABEL[ereignis.art]}</span>
                    <span>· {ereignis.akteurName ?? "—"}</span>
                    <span className="tabular-nums">· {formatZeitpunkt(ereignis.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Aufklapper>
    </Card>
  );
}

// Präsentationale Summen-Zeile (rechtsbündig, tabular-nums) – die Beträge formatiert `formatCents`.
function SummenZeile({ label, cents, bold }: { label: string; cents: number; bold?: boolean }) {
  const cellClass = bold ? "font-semibold" : "";
  return (
    <tr className="border-t border-line-subtle">
      <td className={`py-1 pr-4 ${cellClass}`}>{label}</td>
      <td className={`py-1 text-right tabular-nums ${cellClass}`}>{formatCents(cents)}</td>
    </tr>
  );
}
