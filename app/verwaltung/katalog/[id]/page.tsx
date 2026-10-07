import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { listCatalogs, listCatalog } from "@/db/catalog";
import type { CatalogCategory, CatalogItem } from "@/db/schema";
import { CATEGORY_LABEL } from "@/app/_verzehr/category-labels";
import { ArtikelAnlegen } from "../ArtikelAnlegen";
import { CatalogRow } from "../CatalogRow";
import { CatalogSwitcher } from "./CatalogSwitcher";
import { CatalogControls } from "./CatalogControls";
import { Leerzustand } from "@/app/components/ui/Leerzustand";
import { PageHeader } from "@/app/components/ui/PageHeader";

// Dynamische Katalog-Seite (#345). Der Parameter [id] gibt an, welcher Katalog
// gerade gepflegt wird (Artikel anlegen/ändern/deaktivieren landen hier). Nur Verwalter.
// Die UI-Sperre ist Anzeige-Komfort; die eigentliche Durchsetzung liegt serverseitig
// in den Actions (requireRole), nicht ausschließlich hier (Defense in Depth).
// Liste zuerst, Anlegen per „+ Artikel"-Dialog, Artikel nach Kategorie gruppiert (spec-373).
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
        <PageHeader
          title="Katalog"
          action={<ArtikelAnlegen catalogId={catalogId} ausloeser="+ Artikel" />}
        />
        <CatalogSwitcher currentId={catalogId} allCatalogs={allCatalogs} />
        {/* Katalog-Management (#345) rückt unverändert unter die Auswahlliste (spec-373). */}
        <CatalogControls currentCatalog={currentCatalog} />
      </div>

      {items.length === 0 ? (
        <Leerzustand
          text="Noch keine Artikel in diesem Katalog."
          aktion={
            <ArtikelAnlegen catalogId={catalogId} ausloeser="Artikel anlegen" imLeerzustand />
          }
        />
      ) : (
        <ArtikelGruppen items={items} catalogId={catalogId} />
      )}
    </main>
  );
}

// Gruppen in der Reihenfolge von CATEGORY_LABEL, leere entfallen (AK4.1). Innerhalb der Gruppe
// bleibt die Sortierung aus `listCatalog` erhalten – auch für inaktive Artikel (AK4.4).
function ArtikelGruppen({ items, catalogId }: { items: CatalogItem[]; catalogId: string }) {
  const kategorien = Object.keys(CATEGORY_LABEL) as CatalogCategory[];
  return (
    <>
      {kategorien.map((kategorie) => {
        const gruppe = items.filter((item) => item.category === kategorie);
        if (gruppe.length === 0) return null;
        const ueberschriftId = `kategorie-${kategorie}`;
        return (
          <section key={kategorie} aria-labelledby={ueberschriftId} className="flex flex-col gap-2">
            <h2 id={ueberschriftId}>
              {CATEGORY_LABEL[kategorie]} ({gruppe.length})
            </h2>
            <ul className="divide-y divide-line-subtle overflow-hidden rounded-lg border border-line-subtle bg-surface">
              {gruppe.map((item) => (
                <CatalogRow key={item.id} item={item} catalogId={catalogId} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
