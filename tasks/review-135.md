# Review: Task 135

> Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur) des Diffs
> `fix/135-verzehr-soft-deleted-artikel-korrigierbar` gegen `main`.
> Basis: spec-135, ADR-026, ADR-025. Gates lokal geprüft: 70 Tests grün, 11 skipped
> (DB-Integration ohne lokale DB übersprungen).

## Kritische Findings (müssen behoben werden)
- [ ] _Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] _Keine._

## Nitpicks (optional)
- [ ] [app/veranstaltung/actions.ts:176-179] Guard behandelt eine auf **0 dekrementierte**
      Position eines inaktiven Artikels als „bestehende Position". Da `adjustMenge` die Zeile
      nie löscht (`GREATEST(0, …)` lässt den Row bei `menge=0` stehen), liefert `getPosition`
      auch für eine ausgenullte Position ein Ergebnis → ein direkter Action-Aufruf (`+1`) könnte
      Verzehr auf einem deaktivierten Artikel wieder hochzählen. **Das ist spec-konform** (AC5/FS1
      sprechen von „noch **keine** Position existiert"; ein `menge=0`-Row *existiert*) und in der
      UI nicht erreichbar (menge=0 wird nicht gerendert, ADR-026 D3). Nur zur Bewusstheit: die in
      ADR-026 D3 formulierte Aussage „re-erfassen ist dann bewusst nicht mehr möglich" gilt auf
      **UI-Ebene**, nicht auf der Action-Grenze. Keine Under-Billing-/Escalation-Folge; kein
      Handlungsbedarf, außer man will die Semantik verschärfen (z. B. `getPosition`-Existenz an
      `menge > 0` binden) – das wäre aber Scope-Erweiterung gegenüber spec-135.
- [ ] [app/_verzehr/VerzehrErfassung.test.tsx:216-229] `should_countInactivePositionInSum` prüft
      den Betrag über den **Zeilen-Header** (`getByText(/5,00\s*€/)`), nicht über den Abschnitt
      „Nicht mehr im Katalog" selbst. Weil im Test `artikel={[]}` ist, kann die Summe nur aus der
      inaktiven Position stammen – die Assertion ist damit eindeutig, aber indirekt. Optional: den
      Kommentar präzisieren, dass bewusst der aggregierte Header (aus `zeileSummen`, ADR-026 D4)
      geprüft wird.

## Positives
- **Vollständige AC-Abdeckung, je Kriterium eine eigene Assertion** (Codify #51/#116/#117):
  AC1 Sichtbarkeit, AC2 Summe, AC3 −1, AC4 +1, AC5/FS1 keine Neu-Erfassung, AC7/FS2 read-only,
  plus Data-Layer-Tests für `active` und `getPosition` (exist/undefined). Erwartete Werte sind
  Literale (`5,00 €`, `menge: 1`, `adjustMengeMock` mit `("z1","c1",1)`), keine Tautologien.
- **Guard-Reihenfolge fail-closed unverändert** (Role → Zod → Status → IDOR → Item/Position →
  Persist, ADR-025 D6). Die Lockerung ist minimal-invasiv als zusätzlicher `!item.active`-Zweig
  eingehängt; der Zusatz-Query (`getPosition`) läuft nur im seltenen inaktiv-Fall (ADR-026 D2).
- **Kein IDOR durch `getPosition`:** `zeileId` ist zuvor via `getZeile(zeileId, veranstaltungId)`
  an die Veranstaltung gebunden (Codify #51); `getPosition` filtert zusätzlich auf
  `catalogItemId` (`and(eq(zeileId), eq(catalogItemId))`, limit 1).
- **`getPosition` deklariert korrekt `Promise<VerzehrPosition | undefined>`** (Codify #50).
- **Read-Model-Ansatz sauber (ADR-026 D1):** `active` explizit im Select statt impliziter
  Set-Vergleich gegen `listActiveCatalog()`; self-documenting, am Data-Layer testbar. Join bleibt
  bewusst ohne `active`-Filter (Preisauflösung gelingt weiter, ADR-025 D2).
- **Route-Neutralität gewahrt (Codify #52):** kein `@/app/<feature>`-Import in `app/_verzehr/`
  (geprüft). `summen.ts` unangetastet (ADR-026 D4) – kein Under-Billing.
- **Kommentare erklären das WHY** mit ADR-/Codify-Verweisen (WHAT-frei), keine auskommentierten
  Blöcke, sprechende Namen (`inaktivePositionen`, `getPosition`).
- Änderung ist additiv (Lese-Spalte), keine Schema-/Migrations-Änderung – konsistent mit ADR-026.

## Empfehlung
APPROVED
