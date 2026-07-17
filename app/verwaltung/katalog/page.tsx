import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listCatalog } from "@/db/catalog";
import { CatalogItemForm } from "./CatalogItemForm";
import { CatalogRow } from "./CatalogRow";

// Katalog-Pflege (F2, #49; Kategorie `essen` ergänzt in #116). Nur Verwalter. Die UI-Sperre
// ist Anzeige-Komfort;
// die eigentliche Durchsetzung liegt serverseitig in den Actions (requireRole),
// nicht ausschließlich hier (Defense in Depth, PROJECT-CONTEXT).
export default async function CatalogPage() {
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

  const items = await listCatalog();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Katalog
      </h1>
      <CatalogItemForm />
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Artikel ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Artikel im Katalog.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <CatalogRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
