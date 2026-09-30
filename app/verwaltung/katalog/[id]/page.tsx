import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listCatalogs, listCatalog } from "@/db/catalog";
import { CatalogItemForm } from "../CatalogItemForm";
import { CatalogRow } from "../CatalogRow";
import { CatalogSwitcher } from "./CatalogSwitcher";
import { CatalogControls } from "./CatalogControls";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";

// Dynamische Katalog-Seite (#345). Der Parameter [id] gibt an, welcher Katalog
// gerade gepflegt wird (Artikel anlegen/ändern/deaktivieren landen hier). Nur Verwalter.
// Die UI-Sperre ist Anzeige-Komfort; die eigentliche Durchsetzung liegt serverseitig
// in den Actions (requireRole), nicht ausschließlich hier (Defense in Depth).
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

  // Der gerade ausgewählte Katalog – wird vom Umschalter hervorgehoben
  const currentCatalog = allCatalogs.find((c) => c.id === catalogId);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <PageHeader title="Katalog" />

      <Card className="flex flex-col gap-4">
        {/* Katalog-Umschalter für #345: alle Kataloge (aktiv + inaktiv) */}
        <CatalogSwitcher currentId={catalogId} allCatalogs={allCatalogs} />

        {/* Katalog-Management-Controls (#345): anlegen, umbenennen, deaktivieren, duplizieren */}
        <CatalogControls currentCatalog={currentCatalog} />
      </Card>

      <CatalogItemForm catalogId={catalogId} />

      <section className="flex flex-col gap-3">
        <h2>Artikel ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Artikel im Katalog.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <CatalogRow key={item.id} item={item} catalogId={catalogId} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
