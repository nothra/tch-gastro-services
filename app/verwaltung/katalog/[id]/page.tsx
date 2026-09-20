import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listCatalogs, listCatalog } from "@/db/catalog";
import { CatalogItemForm } from "../CatalogItemForm";
import { CatalogRow } from "../CatalogRow";
import { CatalogSwitcher } from "./CatalogSwitcher";
import { CatalogManager } from "./CatalogManager";

// Dynamische Katalog-Seite (#345). Der Parameter [id] gibt an, welcher Katalog
// gerade gepflegt wird (Artikel anlegen/ändern/deaktivieren landen hier). Nur Verwalter.
// Die UI-Sperre ist Anzeige-Komfort; die eigentliche Durchsetzung liegt serverseitig
// in den Actions (requireRole), nicht ausschließlich hier (Defense in Depth).
export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: catalogId } = await params;

  const session = await auth();
  if (!hasRole(session?.user?.roles, "verwalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-600 dark:text-zinc-400">
          Kein Zugriff – nur Verwalter dürfen den Katalog pflegen.
        </p>
      </main>
    );
  }

  const [allCatalogs, items] = await Promise.all([
    listCatalogs(),
    listCatalog(catalogId),
  ]);

  // Der gerade ausgewählte Katalog – wird vom Umschalter hervorgehoben
  const currentCatalog = allCatalogs.find((c) => c.id === catalogId);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Katalog
        </h1>
        {/* Katalog-Umschalter für #345: alle Kataloge (aktiv + inaktiv) */}
        <CatalogSwitcher currentId={catalogId} allCatalogs={allCatalogs} />
      </div>

      {/* Katalog-Management-Controls (#345): anlegen, umbenennen, deaktivieren, duplizieren */}
      <CatalogManager currentCatalog={currentCatalog} />

      <CatalogItemForm catalogId={catalogId} />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Artikel ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Artikel im Katalog.</p>
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
