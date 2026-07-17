# Task 137: verzehr-erfassen-gre-je-artikel-anzeigen-und-gleichnamige-artikel-gruppieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Anzeige-/UX-Verfeinerung der Verzehr-Erfassung (F5, #52): In der Artikelauswahl wird zu
jedem Artikel die **Größe** (`size`) angezeigt, und **gleichnamige Artikel** (gleicher
`name`, unterschiedliche `size`) werden **gruppiert** dargestellt. Rein präsentational –
Preise, Mengen und Summen bleiben unverändert.

Spec: [spec-137](../docs/specs/spec-137-verzehr-groesse-anzeigen-gruppieren.md)

Entscheidungen aus /requirements (2026-07-17):
- Beide Teile (Größe anzeigen **und** Gruppierung) in dieser Task.
- Leere Größe (`size = ""`, z. B. Kaffee) → **nur Name**, kein Suffix (kein „· ohne Größe").
- Größe auch im Abschnitt „Nicht mehr im Katalog" (erfordert `size` in
  `VerzehrPositionRow` / `listPositionen`).

## Akzeptanzkriterien

- [x] GIVEN aktiver Artikel mit gesetzter Größe WHEN er angeboten wird THEN wird die Größe
      sichtbar angezeigt (`· {size}`, z. B. „Cola · 0,5 l").
- [x] GIVEN aktiver Artikel ohne Größe (`size = ""`) WHEN er angezeigt wird THEN erscheint
      nur der Name (kein Suffix, kein „· ohne Größe").
- [x] GIVEN mehrere aktive Artikel mit gleichem `name` und unterschiedlicher `size` in
      derselben Kategorie WHEN sie angeboten werden THEN sind sie gruppiert dargestellt und
      die Größen eindeutig unterscheidbar.
- [x] GIVEN ein Name mit nur einer Variante WHEN er angezeigt wird THEN entsteht keine
      unnötige Gruppierungs-Verschachtelung (Darstellung bleibt schlank).
- [x] GIVEN Größen-Varianten desselben Namens WHEN dargestellt THEN in deterministischer,
      stabiler Reihenfolge (Varianten stehen zusammen).
- [x] GIVEN soft-gelöschter Artikel mit Verzehr (`menge > 0`) und Größe WHEN im Abschnitt
      „Nicht mehr im Katalog" angezeigt THEN wird seine Größe ebenfalls sichtbar.
- [x] GIVEN dieselbe Auswahl WHEN Größe/Gruppierung angezeigt THEN bleiben Mengensteuerung,
      Zeilensummen und Preise unverändert.
- [x] GIVEN die route-neutrale UI (`app/_verzehr/`, ADR-025 D5) WHEN `size` ergänzt wird
      THEN bleibt das Modul feature-frei (keine `app/<feature>/`-Imports).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Betroffene Stellen (aus /requirements-Recherche):
- `app/_verzehr/VerzehrErfassung.tsx` – `VerzehrArtikel`-Typ (+`size`), `PositionZeile`-Anzeige,
  Gruppierung je Kategorie; auch Abschnitt „Nicht mehr im Katalog".
- `app/veranstaltung/[id]/verzehr/page.tsx:68` – Page-Mapping reicht `size` durch.
- `db/verzehr.ts` – `VerzehrPositionRow` (+`size`), `listPositionen`-Select (+`catalogItems.size`).
- Muster-Referenz: `app/verwaltung/katalog/CatalogRow.tsx:62` (dort `· ohne Größe`; hier bewusst abweichend).

### Architektur-Entscheidung: [ADR-027](../docs/adr/027-verzehr-groesse-anzeigen-gruppieren.md)

Rein präsentational (ADR-025 D1–D4 unberührt). Umsetzungs-Reihenfolge (TDD):

1. **Data-Layer** `db/verzehr.ts`: `VerzehrPositionRow` +`size: string`; `listPositionen`-Select
   um `size: catalogItems.size` ergänzen. (Integrationstest, dass `size` durchkommt.)
2. **Route-neutraler Helfer** `app/_verzehr/artikel-anzeige.ts` (DB-frei, testbar, Codify #105 –
   **kein** `utils`, **keine** `app/<feature>/`-Imports):
   - `groessenSuffix(size)` → `""` bei leer/whitespace (trim), sonst ` · {trimmed}`.
   - `gruppiereArtikel(artikel)` → `VerzehrArtikelGruppe[]` (`{ name, varianten }`), **stabiles
     group-by name**, Katalog-Reihenfolge bewahrt (Bucket am Erstauftreten), Varianten in
     Eingabereihenfolge – **kein** Re-Sort.
   - Unit-Tests: gesetzte Größe, leere Größe, Whitespace-Größe, mehrere Varianten, Einzel-Variante,
     **nicht benachbarte** gleichnamige Varianten (unterschiedl. `sortOrder`).
3. **UI** `app/_verzehr/VerzehrErfassung.tsx`: `VerzehrArtikel` +`size`; je Kategorie über
   `gruppiereArtikel` rendern – >1 Variante: Namens-Überschrift + eingerückte `{size} · {preis}`-
   Zeilen; genau 1 Variante: flache Zeile `{name}{groessenSuffix} · {preis}` (keine Gruppen-Chrome).
   Inaktiv-Abschnitt: Größe via `groessenSuffix`, **keine** Gruppierung (ADR-027 D5).
   `MengeControl`/Summen/Preise unverändert.
4. **Page** `app/veranstaltung/[id]/verzehr/page.tsx`: `size: item.size` ins Mapping.
5. **Route-Neutralität prüfen** (Codify #52): `grep -r 'from "@/app/[^_]' app/_verzehr/` = leer.

Verworfen (ADR-027): Dropdown/Segment-Buttons je Name (versteckt je-Größe-Strichliste);
alphabetisches Sortieren (ignoriert `sortOrder`).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

Nachtest [2026-07-17]: Interaktive Oberflächenverifikation (Dev-Server + Browser) konnte in
dieser Session nicht durchgeführt werden – kein Browser-/Screenshot-Tool verfügbar. Abgedeckt
stattdessen über Komponententests (React Testing Library, rendert echtes DOM, prüft exakten
Text je Akzeptanzkriterium) + Integrationstest für `size`-Join in `db/verzehr.ts` + statischer
Route-Neutralitäts-Check (`grep`, leer). `pnpm lint` und `pnpm test` (274 passed) grün. Vor dem
Merge einen manuellen Klick-Test gegen `pnpm dev` nachholen (deckt sich mit `/post-merge-verify`
falls das ausfällt).

## Review-Findings
<!-- Wird durch /review befüllt -->

Aus `tasks/review-137.md` (Empfehlung: NEEDS_REWORK) behoben [2026-07-18]:
- **Kritisch:** Fehlender `import type { CatalogCategory } from "@/db/schema"` in
  `VerzehrErfassung.tsx` (Build-Break, von Lint/Vitest nicht erkannt) – Import wieder ergänzt.
  Verifiziert via `pnpm build` (grün, war zuvor nicht Teil der Gates).
- **Wichtig:** Leere Größe (`size = ""`) innerhalb einer Mehrfach-Gruppe rendert jetzt über den
  neuen Helfer `groessenLabel(size)` (`artikel-anzeige.ts`) den Fallback „ohne Größe" statt einer
  nackten „ · Preis"-Zeile. Test `should_showFallback_when_variantSizeEmptyInGroup` deckt
  `("Cola","")` + `("Cola","0,5 l")` in derselben Gruppe ab (Katalog erlaubt das via
  `UNIQUE(name, size)`).
- **Nitpick:** Key-Strategie im Kategorie-`<ul>` vereinheitlicht (`key={gruppe.name}` für
  Gruppen- und Flach-Zweig).
- **Nitpick (Trim-Duplikation):** durch `groessenLabel` als gemeinsamen Helfer neben
  `groessenSuffix` mit erledigt.
- Nicht behoben (bewusst, kein neues Problem): DB-Join-Integrationstest bleibt hinter
  `describe.skipIf(!hasDb)` – bestehendes Muster der Datei, außerhalb Scope dieser Task.

`pnpm lint`, `pnpm test` (279 passed) und `pnpm build` grün nach dem Fix.

## Test-Vervollständigung [2026-07-18]

Review-Runde 2 (`tasks/review-137.md`) ist **APPROVED** mit Empfehlung „weiter zu `/test`".
Deckungs-/Vollständigkeits-Check:

- **Coverage:** `pnpm test:coverage` – 280 passed, 39 skipped (DB-lose `describe.skipIf(!hasDb)`-
  Blöcke, bestehendes Muster). `app/_verzehr/VerzehrErfassung.tsx` und `artikel-anzeige.ts` je
  **100 %** Stmts/Branch/Funcs/Lines (HTML-Report geprüft, `coverage/app/_verzehr/`). `db/verzehr.ts`
  zeigt 0 % im Text-Summary nur, weil der `size`-Join-Test DB-lose übersprungen wird – kein neuer
  Befund (bereits in Review-Runde 2 Hinweis 2 notiert).
- **AC-Abgleich gegen spec-137:** alle 8 Akzeptanzkriterien + beide Fehlerszenarien haben je einen
  eigenen `it`-Block (Happy Path, leere Größe, Whitespace-Größe, Gruppierung, Einzel-Variante,
  stabile Reihenfolge inkl. nicht-benachbarter Varianten, Inaktiv-Abschnitt, Preise/Summen
  unverändert, Route-Neutralität via `grep`).
- **Ergänzt:** `should_showOnlyName_when_inactivePositionSizeIsEmpty` – Runde-1/2-Fix
  (`groessenLabel`-Fallback) galt bisher nur für den Gruppen-Zweig; dieser Test belegt, dass die
  Inaktiv-Sektion bei leerer Größe weiterhin nur den Namen zeigt (kein „ohne Größe"-Fallback dort,
  da sie nie gruppiert wird, ADR-027 D5).
- **Verifikations-Hinweis aus Review-Runde 2 abgearbeitet:** `pnpm build` lokal ausgeführt →
  grün (kompiliert, TypeScript-Check ohne Fehler, alle Routen generiert). Damit ist der
  Runde-1-Build-Break (fehlender `CatalogCategory`-Import) auch über das Build-Gate bestätigt,
  nicht nur statisch.
- `pnpm lint` grün, kein Produktionscode in diesem Schritt geändert (nur Test ergänzt).

## Refactoring [2026-07-18]

Clean-Code-Pass über den geänderten Code (`app/_verzehr/artikel-anzeige.ts`,
`app/_verzehr/VerzehrErfassung.tsx`, `db/verzehr.ts`, Page-Mapping). Der Code war nach zwei
Review-Runden bereits aufgeräumt (Route-Neutralität, Key-Strategie, Trim-Duplikation via
`groessenLabel` schon vorher behoben) – ein weiterer Schritt genügte:

- **Erklärende Variable statt wiederholtem Index-Zugriff:** In `ZeileKarte` (Einzel-Varianten-
  Zweig) wurde `gruppe.varianten[0]` viermal wiederholt (Ternary-Ausdruck). Extrahiert zu
  `const einzelArtikel = gruppe.varianten[0];`, Ternary zu if/return für die zusätzliche
  Anweisung. Kein neues Verhalten.

`pnpm lint` und `pnpm test` (280 passed, 39 skipped, identisch zu vorher) grün vor und nach
dem Schritt. Kein weiterer Refactoring-Bedarf identifiziert (Funktionslängen, Naming, Duplikation,
Magic Strings bereits im Rahmen der Review-Runden bereinigt).

## Security-Review [2026-07-18]

`tasks/security-137.md` – Ergebnis **PASSED** (keine Blocker, keine wichtigen Findings).
Geprüft: XSS/Output-Encoding (`size`/`name` nur als JSX-Text-Children, React-Auto-Escaping,
kein `dangerouslySetInnerHTML`), SQL-Injection (nur zusätzliche `size`-Spalte im Drizzle-
`.select()`), IDOR/BOLA (Query-Grenze `WHERE veranstaltungId = <id>` unverändert, `size` über
`innerJoin(catalogItems)` – keine fremde Veranstaltung durchreichbar), keine neuen Dependencies,
keine Secrets/Logs/Stack-Traces.

Ein **out-of-scope-Hinweis** (kein Blocker): Katalog-Schreibpfad `app/verwaltung/katalog/schema.ts`
validiert die `text`-Felder `name`/`size` ohne `.max()`-Obergrenze (Codify #50). Verifiziert –
zutreffend, aber Vorbedingung, nicht durch #137 eingeführt (#137 liest `size` nur). Empfehlung:
separates Härtungs-Issue (Anlage per Seam durch den Menschen freizugeben – gh-Aufruf brauchte
in dieser Session Approval).

## Codify-Notizen

Vollständiger Report: `tasks/codify-137.md`. Kurzfassung: neue Regel in
PROJECT-CONTEXT.md ("Lint/Vitest fangen keine Typfehler") + `pnpm typecheck`-Gate in
`scripts/checks/pre-push.sh` ergänzt (schließt den Review-Runde-1-Build-Break-Fund),
inkl. Mini-Fix eines dadurch aufgedeckten vorbestehenden stale `@ts-expect-error` in
`db/veranstaltung.test.ts`. Out-of-Scope-Issue `#142` (Katalog-Schema `.max()`-Obergrenze)
über `create-issue.sh` angelegt.

---
Branch: `feature/137-verzehr-erfassen-gre-je-artikel-anzeigen-und-gleichnamige-artikel-gruppieren`
Erstellt: 2026-07-17 22:12
