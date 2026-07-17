# Review: Task 137

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur) des Diffs `main...HEAD`.
Grundlage: spec-137, ADR-027, ADR-025 (D5), Codify-Regeln #52/#105.

> **Runde 2 (2026-07-18).** Die drei kritischen/wichtigen Findings aus Runde 1 wurden in
> Commit `1f80657` behoben; dieser Report verifiziert die Fixes und prüft den Diff erneut
> über alle drei Dimensionen. Die abgehakten Runde-1-Findings sind unten zur Nachvollziehbarkeit
> erhalten.

## Kritische Findings (müssen behoben werden)

_Keine._

- [x] **(Runde 1, behoben)** `VerzehrErfassung.tsx` – fehlender `import type { CatalogCategory }`
      (Build-Break, von lint/vitest nicht erfasst). **Verifiziert:** Import wieder vorhanden
      (`VerzehrErfassung.tsx:4`) und durch `CATEGORY_ORDER: readonly CatalogCategory[]` (Zeile 24)
      genutzt. `VerzehrArtikel` hat jetzt genau eine Definition (`artikel-anzeige.ts:6`), aus
      `VerzehrErfassung.tsx:21` re-exportiert – keine Duplikat-/Dangling-Referenz.
      *(Hinweis: `tsc --noEmit` konnte in dieser Session nicht ausgeführt werden – Permission.
      Nachweis stützt sich auf die statische Import-/Nutzungs-Prüfung + den in der Task-Datei
      protokollierten grünen `pnpm build` nach dem Fix. Vor Merge idealerweise erneut `next build`.)*

## Wichtige Findings (sollten behoben werden)

_Keine._

- [x] **(Runde 1, behoben)** Leere Größe in Mehrfach-Gruppe rendert nackte „ · Preis"-Zeile.
      **Verifiziert:** neuer Helfer `groessenLabel(size)` (`artikel-anzeige.ts:24`) liefert
      Fallback „ohne Größe" und wird in `ArtikelGruppe` (`VerzehrErfassung.tsx:180`) verwendet;
      Test `should_showFallback_when_variantSizeEmptyInGroup` deckt `("Cola","")` + `("Cola","0,5 l")`
      in einer Gruppe ab und assertet zusätzlich negativ, dass keine mit „·" beginnende Zeile
      entsteht.

## Nitpicks (optional)

- [x] **(Runde 1, behoben)** Uneinheitliche React-Key-Strategie – beide Zweige des
      Kategorie-`<ul>` nutzen jetzt `key={gruppe.name}` (`VerzehrErfassung.tsx:105/117`).
- [ ] **`app/_verzehr/artikel-anzeige.ts:20/25`** – `groessenSuffix` und `groessenLabel` trimmen
      beide unabhängig (`size.trim()`). Bewusst zwei Funktionen mit unterschiedlicher Semantik
      (Suffix mit `·`-Präfix bzw. Fallback-Label); die doppelte Trim-Zeile ist minimal. Kein
      Handlungsbedarf – eine gemeinsame `trimmedSize`-Extraktion wäre eher Over-Engineering für
      zwei Zeilen.
- [ ] **`VerzehrErfassung.test.tsx`** – `should_showOnlyName_when_sizeIsEmpty` und
      `should_renderFlatRow_when_onlyOneVariantForName` überschneiden sich stark (beide: Einzel-Cola
      `size=""` → „Cola · 2,50 €"). Vertretbar, da sie unterschiedliche ACs (AC2 „nur Name" vs.
      AC4 „keine Verschachtelung") belegen und Letzterer die Abwesenheit einer separaten
      Namens-Überschrift zusätzlich negativ prüft.

## Positives

- **Alle blockierenden Runde-1-Findings sauber adressiert** – jeweils mit begleitendem Test
  (`should_showFallback_when_variantSizeEmptyInGroup`) statt nur punktuellem Fix.
- **ADR-treue Umsetzung:** `gruppiereArtikel` als stabiles group-by (Bucket am Erstauftreten des
  Namens via `indexByName`-Map, kein Re-Sort) setzt ADR-027 D3 exakt um – inkl. Test für
  **nicht benachbarte** gleichnamige Varianten.
- **Route-Neutralität eingehalten (Codify #52):** `grep -r 'from "@/app/[^_]' app/_verzehr/` ist
  leer; `artikel-anzeige.ts` importiert nur den Data-Layer-Typ `@/db/schema`.
- **Saubere Verortung (Codify #105):** DB-freier, sprechend benannter Helfer `artikel-anzeige.ts`
  (kein `utils`), 100 % unit-testbar; `VerzehrErfassung` wird zur reinen Projektion. `PositionZeile`
  von `name` auf ein neutrales `label` verallgemeinert – trägt Flach-, Gruppen- und Inaktiv-Fall.
- **Semantische Trennung `groessenSuffix` vs. `groessenLabel`:** Suffix (Kontext: Name daneben) vs.
  Label (Kontext: Name als Gruppenüberschrift) sauber getrennt, jeweils mit Whitespace-/Leer-Tests –
  die ADR-Unterscheidung D4 (nur Name) vs. Gruppen-Fallback ist im Code sichtbar begründet.
- **Präsentational sauber gehalten:** `MengeControl`, Summen (`zeileSummen`) und Preise unberührt;
  `size` additiv durch route-neutralen Vertrag + Page-Mapping + `listPositionen` durchgereicht.
- **Tests je Akzeptanzkriterium** mit exakten Textassertions (RTL rendert echtes DOM); Data-Layer-
  `size`-Join durch Integrationstest belegt.

## Empfehlung
APPROVED

> Die Runde-1-Blocker sind behoben und verifiziert; über alle drei Dimensionen keine neuen
> kritischen oder wichtigen Findings. Zwei verbleibende Nitpicks sind bewusst offen (kein
> Handlungsbedarf). Empfehlung: weiter zu `/test`.
>
> Zwei Verifikations-Hinweise für die Folgeschritte (kein Blocker):
> 1. `tsc`/`next build` in dieser Review-Session nicht ausführbar (Permission) – der Runde-1-Bug
>    war ein Typfehler, den lint/vitest nicht fangen. Vor Merge einmal `next build` bestätigen.
> 2. Der DB-`size`-Join-Test hängt weiterhin an `describe.skipIf(!hasDb)` (bestehendes Datei-Muster,
>    kein neues Problem) – in DB-loser CI wird der `size`-Vertrag also nicht mitverifiziert.
