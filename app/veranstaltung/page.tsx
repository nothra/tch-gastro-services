import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listVeranstaltungen } from "@/db/veranstaltung";
import { listCatalogs } from "@/db/catalog";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { VeranstaltungAnlegen } from "./VeranstaltungAnlegen";
import { VeranstaltungListe } from "./VeranstaltungListe";

// Veranstaltungen anlegen & führen (F4, #51). Nur Veranstalter. Die UI-Sperre ist Anzeige-
// Komfort; die Durchsetzung liegt serverseitig in den Actions (requireRole), nicht nur hier.
// Liste zuerst, Anlegen per „+ Neu"-Dialog (spec-373); die stehende Theke liegt seit #373 unter
// `/verwaltung/theke`.
export default async function VeranstaltungenPage() {
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">
          Kein Zugriff – nur Veranstalter dürfen Veranstaltungen anlegen und führen.
        </p>
      </main>
    );
  }

  // Nur aktive Kataloge sind ein gültiges Anlage-Ziel (#346 AK6). `listCatalogs` liefert auch
  // deaktivierte (sie bleiben in der Verwaltung sichtbar, ADR-050 D7) – die Auswahl filtert sie
  // hier heraus; die Action prüft es serverseitig erneut (Defense in Depth, FS1). Die Zeilen
  // brauchen dagegen alle, damit auch ein deaktivierter Katalog mit Namen erscheint (AK7.3).
  const [veranstaltungen, kataloge] = await Promise.all([listVeranstaltungen(), listCatalogs()]);
  const aktiveKataloge = kataloge.filter((katalog) => katalog.active);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Veranstaltungen"
        action={<VeranstaltungAnlegen kataloge={aktiveKataloge} ausloeser="+ Neu" />}
      />
      <VeranstaltungListe
        veranstaltungen={veranstaltungen}
        kataloge={kataloge}
        anlegbareKataloge={aktiveKataloge}
      />
    </main>
  );
}
