import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse } from "@/db/schema";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listActiveCatalog } from "@/db/catalog";
import { listPositionen } from "@/db/verzehr";
import { FokusListe } from "@/app/_verzehr/FokusListe";
import { KEIN_TEILNEHMER_HINWEIS } from "@/app/_verzehr/VerzehrErfassung";
import { toVerzehrArtikelListe, toVerzehrZeilen } from "@/app/_verzehr/verzehr-props";
import { adjustVerzehrAction } from "../../actions";
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "../../labels";

// Authentifizierte Erfassungs-Seite (F5, ADR-025 D5): lädt Zeilen, Katalog und Positionen und
// reicht die an diese Veranstaltung gebundene Veranstalter-Action in die route-neutrale UI
// (app/_verzehr). Nur Veranstalter (serverseitig auch in der Action durchgesetzt). Solange die
// Veranstaltung offen ist, ist die Erfassung editierbar; abgeschlossen → nur Lesesicht.
export default async function VerzehrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-600 dark:text-zinc-400">
          Kein Zugriff – nur Veranstalter dürfen Verzehr erfassen.
        </p>
      </main>
    );
  }

  const veranstaltung = await getVeranstaltung(id);
  if (!veranstaltung) notFound();

  const [zeilen, artikel, positionen] = await Promise.all([
    listZeilen(id),
    listActiveCatalog(),
    listPositionen(id),
  ]);
  const offen = veranstaltung.status === "offen";
  const verzehrZeilen = toVerzehrZeilen(zeilen);

  // Die veranstaltungId ist ein serverseitig gebundenes, vertrauenswürdiges Argument der Action
  // (route-neutral, ADR-025 D5/D6) – der Client liefert sie nicht.
  const action = adjustVerzehrAction.bind(null, id);

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
          Verzehr · {veranstaltung.bezeichnung}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDatum(veranstaltung.datum)} · {KASSE_LABEL[veranstaltung.kasse as Kasse]} ·{" "}
          {STATUS_LABEL[veranstaltung.status]}
        </p>
      </div>

      {verzehrZeilen.length === 0 ? (
        // FokusListe setzt ≥1 Zeile voraus (ADR-039 D4); der leere Fall bleibt hier beim
        // Konsumenten, weil die Meldung wegabhängig ist (F5 verweist auf das Anlegen von Teilnehmern).
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{KEIN_TEILNEHMER_HINWEIS}</p>
      ) : (
        // Fokus-Akkordeon wie im Link-Weg (ADR-039 D3): keine Karte offen initial, kein
        // onFokusWechsel (F5 merkt sich kein Ziel geräte-lokal). editable an den Status gebunden.
        <FokusListe
          zeilen={verzehrZeilen}
          artikel={toVerzehrArtikelListe(artikel)}
          positionen={positionen}
          action={action}
          editable={offen}
          initialOpenId={null}
        />
      )}
    </main>
  );
}
