# Review: Task 137

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur) des Diffs `main...HEAD`.
Grundlage: spec-137, ADR-027, ADR-025 (D5), Codify-Regeln #52/#105.

## Kritische Findings (müssen behoben werden)

- [x] **`app/_verzehr/VerzehrErfassung.tsx:22`** – `CATEGORY_ORDER: readonly CatalogCategory[]`
      referenziert den Typ `CatalogCategory`, dessen Import (`import type { CatalogCategory } from "@/db/schema"`)
      im Diff **entfernt** wurde (Zeile 3 alt). Der Typ ist weder importiert noch global noch aus
      `./artikel-anzeige` re-exportiert → **`next build` bricht mit einem TS-Fehler ab**
      (`Cannot find name 'CatalogCategory'`). Der Fehler ist durch die grünen Gates verdeckt:
      `pnpm lint` (eslint, kein Type-Check) und `pnpm test` (vitest/esbuild, strippt Typen) prüfen
      keine Typreferenzen; `next.config` hat **kein** `ignoreBuildErrors`, und die
      pre-commit/pre-push-Checks führen **kein** `tsc` aus – der Bruch schlägt also erst im
      Vercel-/CI-Build zu.
      **Fix:** `import type { CatalogCategory } from "@/db/schema";` wieder ergänzen.
      *(Begründung: Build-Break = blockiert Merge. Nachweis via `node_modules/.bin/tsc --noEmit`
      empfohlen, da die vorhandenen Gates diesen Fehlerpfad nicht abdecken.)*

## Wichtige Findings (sollten behoben werden)

- [x] **`app/_verzehr/VerzehrErfassung.tsx:178`** (`ArtikelGruppe`) – Varianten in einer
      Mehrfach-Gruppe rendern `label={variante.size.trim()}` **direkt**, ohne den leeren-Größe-Guard
      aus `groessenSuffix`. Das Katalogschema erlaubt via `UNIQUE(name, size)` gleichzeitig
      `("Cola","")` **und** `("Cola","0,5 l")` als zwei aktive Artikel. `gruppiereArtikel`
      gruppiert rein nach `name` → beide landen in einer Gruppe (`varianten.length > 1`) →
      die leere-Größe-Variante rendert `label = ""` und `PositionZeile` zeigt eine **nackte Zeile
      „ · 2,50 €"** (kein Name, keine Größe, führender Punkt). Das ist genau das
      „sichtbare leere Suffix", das das Spec-Fehlerszenario (spec-137, Zeile 80/81) untersagt –
      hier nur im Gruppen-Zweig statt im flachen. Kein Test deckt diesen Fall ab (die Gruppen-Tests
      nutzen ausschließlich nicht-leere Größen).
      **Vorschlag:** In der Gruppe für leere Größe einen Fallback rendern (z. B. „ohne Größe" –
      hier ist der Kontext *innerhalb* einer Namensgruppe, anders als D4/D5, wo der Name die
      Unterscheidung trägt) und einen Test `should_showFallback_when_variantSizeEmptyInGroup`
      ergänzen. Alternativ im ADR bewusst als „kann nicht auftreten" ausschließen und begründen.

## Nitpicks (optional)

- [x] **`app/_verzehr/VerzehrErfassung.tsx:103/112`** – Uneinheitliche React-Key-Strategie im
      Kategorie-`<ul>`: Mehrfach-Gruppe nutzt `key={gruppe.name}`, Einzel-Variante
      `key={gruppe.varianten[0].id}`. Funktioniert (Keys nur unter Geschwistern eindeutig, Namen
      sind je Gruppierung eindeutig, IDs kollidieren praktisch nicht mit Namen), ist aber
      inkonsistent. Einheitlich `key={gruppe.name}` für beide Zweige läse sich klarer.

- [x] **`app/_verzehr/artikel-anzeige.ts:20` / `VerzehrErfassung.tsx:178`** – Trim-Logik an zwei
      Stellen (`groessenSuffix` trimmt; `ArtikelGruppe` ruft separat `variante.size.trim()`). Ein
      gemeinsamer Label-Helfer (z. B. `groessenLabel(size)` → getrimmte Größe oder Fallback) würde
      die Gruppen- und die Flach-Darstellung konsistent halten und Finding #2 gleich mit abdecken.

- [ ] **`db/verzehr.test.ts:172`** – Der `size`-Join-Integrationstest hängt an `describe.skipIf(!hasDb)`
      und läuft in DB-loser CI **nicht** mit. Bestehendes Muster der Datei, kein neues Problem;
      erwähnt, damit der `size`-Vertrag nicht als „überall verifiziert" gilt, wenn keine DB da ist.

## Positives

- **ADR-treue Umsetzung:** `gruppiereArtikel` als stabiles group-by (Bucket am Erstauftreten,
  kein Re-Sort) setzt ADR-027 D3 exakt um – inkl. Test für **nicht benachbarte** gleichnamige
  Varianten (unterschiedl. `sortOrder`), wie im ADR-Handoff explizit gefordert.
- **Route-Neutralität eingehalten (Codify #52):** `grep -r 'from "@/app/[^_]' app/_verzehr/` ist
  leer; `artikel-anzeige.ts` importiert nur den Data-Layer-Typ `@/db/schema` – kein Feature-Import.
- **Saubere Verortung (Codify #105):** DB-freier, sprechend benannter Helfer `artikel-anzeige.ts`
  (kein generisches `utils`), 100 % unit-testbar; die Komponente wird zur reinen Projektion.
- **`groessenSuffix`** deckt leere und Whitespace-Größe testgetrieben ab (Fehlerszenarien der Spec);
  `PositionZeile` von `name` auf ein neutrales `label` umgestellt – gute Verallgemeinerung.
- **Präsentational sauber gehalten:** Mengensteuerung, Summen (`zeileSummen`) und Preise unberührt;
  `size` additiv durch den route-neutralen Vertrag + Page-Mapping + `listPositionen` durchgereicht.
- Tests je Akzeptanzkriterium mit exakten Textassertions (RTL rendert echtes DOM).

## Empfehlung
NEEDS_REWORK

> Blockierend ist das kritische Finding (Build-Break durch fehlenden `CatalogCategory`-Import).
> Zusätzlich sollte das wichtige Finding (leere Größe in Mehrfach-Gruppe → nackte „ · Preis"-Zeile,
> Verstoß gegen das Spec-Fehlerszenario) vor dem Merge adressiert oder im ADR bewusst ausgeschlossen
> werden. Nach Fix: erneuter Kurz-Check von `next build`/`tsc` (die grünen lint/test-Gates fangen den
> Typfehler nicht).
