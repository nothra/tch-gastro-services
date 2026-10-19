import type { CatalogCategory, CatalogItem } from "@/db/schema";
import { CATEGORY_LABEL } from "@/app/_verzehr/category-labels";
import { Card } from "@/app/components/ui/Card";
import { Leerzustand } from "@/app/components/ui/Leerzustand";
import { ArtikelAnlegen } from "../ArtikelAnlegen";
import { CatalogRow } from "../CatalogRow";

// Umrandeter Artikelbereich der Katalogseite (spec-407 AK3/AK4, ADR-062 D4): `Card` mit
// Kopfzeile „Artikel <n>" und „+ Neu" – dem einzigen Primär-Knopf der Seite –, darunter die
// Kategorie-Gruppen oder der Leerzustand. Server-Komponente; nur Zeilen und Dialoge sind Client.

const UEBERSCHRIFT_ID = "artikel-bereich";

interface ArtikelBereichProps {
  /** Alle Artikel des Katalogs, aktive und deaktivierte, in der Sortierung aus `listCatalog`. */
  items: CatalogItem[];
  catalogId: string;
}

export function ArtikelBereich({ items, catalogId }: ArtikelBereichProps) {
  return (
    <section aria-labelledby={UEBERSCHRIFT_ID}>
      <Card className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={UEBERSCHRIFT_ID}>
            Artikel <span className="text-muted">{items.length}</span>
          </h2>
          <ArtikelAnlegen catalogId={catalogId} ausloeser="+ Neu" />
        </header>
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
      </Card>
    </section>
  );
}

// Gruppen in der Reihenfolge von CATEGORY_LABEL, leere entfallen (AK4.1). Innerhalb der Gruppe
// bleibt die Sortierung aus `listCatalog` erhalten – auch für deaktivierte Artikel (AK4.4).
function ArtikelGruppen({ items, catalogId }: ArtikelBereichProps) {
  const kategorien = Object.keys(CATEGORY_LABEL) as CatalogCategory[];
  return (
    <>
      {kategorien.map((kategorie) => {
        const gruppe = items.filter((item) => item.category === kategorie);
        if (gruppe.length === 0) return null;
        const ueberschriftId = `kategorie-${kategorie}`;
        return (
          <section key={kategorie} aria-labelledby={ueberschriftId} className="flex flex-col gap-2">
            <h3 id={ueberschriftId} className="text-sm font-semibold text-muted">
              {CATEGORY_LABEL[kategorie]} ({gruppe.length})
            </h3>
            <ul className="flex flex-col gap-2">
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
