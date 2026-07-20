import { notFound } from "next/navigation";
import type { Kasse } from "@/db/schema";
import { getVeranstaltungByToken, listZeilen } from "@/db/veranstaltung";
import { listActiveCatalog } from "@/db/catalog";
import { listPositionen } from "@/db/verzehr";
import { adjustVerzehrByTokenAction } from "@/app/veranstaltung/actions";
import { KASSE_LABEL, STATUS_LABEL, formatDatum } from "@/app/veranstaltung/labels";
import { toVerzehrArtikelListe, toVerzehrZeilen } from "@/app/_verzehr/verzehr-props";
import { IdentityGate } from "./IdentityGate";

// Öffentliche, login-freie Selbstbedienungs-Route (F7, #54, ADR-034 D1): lädt die Veranstaltung
// ausschließlich über den Token (getVeranstaltungByToken), antwortet bei Miss neutral mit
// notFound() (kein Leak) und rendert dieselbe route-neutrale VerzehrErfassung wie die
// authentifizierte F5-Seite – inkl. Essen. Die Autorisierung liegt allein am Token: die
// token-scoped Action self-scoped auf diese Veranstaltung (kein requireRole, kein IDOR).
// Solange offen → editierbar hinter dem Namens-Gate; abgeschlossen → Read-only ohne Gate.
export default async function ThekePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const veranstaltung = await getVeranstaltungByToken(token);
  if (!veranstaltung) notFound();

  const [zeilen, artikel, positionen] = await Promise.all([
    listZeilen(veranstaltung.id),
    listActiveCatalog(),
    listPositionen(veranstaltung.id),
  ]);
  const editable = veranstaltung.status === "offen";

  // Der Token ist ein serverseitig gebundenes Argument der Action (self-scoping, ADR-034 D3) –
  // der Client liefert nur zeileId/catalogItemId/delta.
  const action = adjustVerzehrByTokenAction.bind(null, token);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {veranstaltung.bezeichnung}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDatum(veranstaltung.datum)} · {KASSE_LABEL[veranstaltung.kasse as Kasse]} ·{" "}
          {STATUS_LABEL[veranstaltung.status]}
        </p>
      </div>

      <IdentityGate
        token={token}
        zeilen={toVerzehrZeilen(zeilen)}
        artikel={toVerzehrArtikelListe(artikel)}
        positionen={positionen}
        action={action}
        editable={editable}
      />
    </main>
  );
}
