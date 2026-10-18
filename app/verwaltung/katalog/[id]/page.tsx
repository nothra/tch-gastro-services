import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listCatalogs, listCatalog } from "@/db/catalog";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ArtikelBereich } from "./ArtikelBereich";
import { CatalogSwitcher } from "./CatalogSwitcher";
import { KatalogAnlegen } from "./KatalogAnlegen";
import { KatalogBearbeiten } from "./KatalogBearbeiten";

// Dynamische Katalog-Seite (#345). Der Parameter [id] gibt an, welcher Katalog
// gerade gepflegt wird (Artikel anlegen/ändern/deaktivieren landen hier). Nur Verwalter.
// Die UI-Sperre ist Anzeige-Komfort; die eigentliche Durchsetzung liegt serverseitig
// in den Actions (requireRole), nicht ausschließlich hier (Defense in Depth).
// Zweiteilung (spec-407): oben der Katalog (auswählen, bearbeiten, anlegen – Neben-Knöpfe),
// darunter dessen Artikel im umrandeten Bereich mit „+ Neu" als einzigem Primär-Knopf.
export default async function CatalogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: catalogId } = await params;

  const session = await auth();
  if (!hasRole(session?.user?.roles, "verwalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Kein Zugriff – nur Verwalter dürfen den Katalog pflegen.</p>
      </main>
    );
  }

  const [allCatalogs, items] = await Promise.all([listCatalogs(), listCatalog(catalogId)]);
  const currentCatalog = allCatalogs.find((c) => c.id === catalogId);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <PageHeader title="Katalog" />
        <CatalogSwitcher currentId={catalogId} allCatalogs={allCatalogs} />
        {/* Ohne auflösbaren Katalog (unbekannte Id) gibt es nichts zu bearbeiten (AK1.5). */}
        <div className="flex flex-wrap gap-2">
          {currentCatalog && <KatalogBearbeiten katalog={currentCatalog} />}
          <KatalogAnlegen />
        </div>
      </div>

      <ArtikelBereich items={items} catalogId={catalogId} />
    </main>
  );
}
