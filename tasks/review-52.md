# Review: Task 52

Multi-Persona-Review (Logik/Korrektheit · Code-Qualität · Architektur) des Feature-Branches
`feature/52-verzehr-erfassen`. Grundlage: `git diff main` (inkl. Working Tree), `spec-52`, `ADR-025`.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle AC (AC1–AC7) und Fehlerszenarien (FS1–FS3) sind implementiert und getestet;
RBAC, IDOR-Bindung, Soft-Delete-Prüfung und der atomare Upsert sind korrekt umgesetzt.

## Wichtige Findings (sollten behoben werden)

- [ ] **`db/verzehr.ts:53` + `app/_verzehr/summen.ts:20` + `VerzehrErfassung.tsx:75` –
  Position auf soft-gelöschtem Artikel wird summiert, aber nicht dargestellt und ist nicht
  korrigierbar (unsichtbare, eingefrorene Zeilensumme).**
  `listPositionen` joint `catalog_item` **ohne** `active`-Filter (bewusst, damit die
  Preisauflösung immer gelingt), die Control-Zeilen kommen aber aus `listActiveCatalog()`
  (nur `active`). Wird ein bereits konsumierter Artikel während der **offenen** Veranstaltung
  vom Verwalter deaktiviert (spec-49), dann:
  1. `zeileSummen(positionen)` zählt die Position weiter in die Zeilensumme (Header zeigt z. B.
     „Getränke 7,50"),
  2. es gibt **keine** MengeControl-Zeile mehr dafür (Artikel nicht in `artikel`),
  3. `adjustVerzehrAction` lehnt `-1` auf den inaktiven Artikel ab (D6-Schritt 5) → der Betrag
     lässt sich nicht mehr herunterzählen/korrigieren.
  Der Nutzer sieht eine Summe, die er weder einer Position zuordnen noch korrigieren kann.
  Edge-Case (setzt Deaktivierung eines konsumierten Artikels mitten im offenen Abend voraus)
  und ohne Prod-Daten nicht akut – aber eine echte Anzeige-/Korrektur-Inkonsistenz.
  **Optionen:** (a) Positionen inaktiver Artikel read-only als eigene Zeile rendern (sichtbar,
  aber gesperrt), oder (b) `summen` nur über sichtbare/aktive Positionen bilden, oder (c) bewusst
  akzeptieren und als Folge-Issue + ADR-025-Handoff-Notiz dokumentieren (analog D2-Preis-Quirk).

## Nitpicks (optional)

- [ ] `app/veranstaltung/[id]/page.tsx:62` – Der Link „Verzehr erfassen →" wird auch bei
  `abgeschlossen`er Veranstaltung angezeigt und führt dann auf die Nur-Lese-Sicht. Label
  „erfassen" ist dort leicht irreführend; ggf. Label kontextabhängig („Verzehr ansehen") oder
  Link nur bei `offen` zeigen.
- [ ] `app/_verzehr/MengeControl.tsx:25` – Die Action liefert die autoritative `menge` im
  State zurück (in Tests geprüft), die Komponente rendert aber ausschließlich die Prop
  (server-autoritativ via `revalidatePath`, ADR-025 D3). `state.menge` ist im UI ungenutzt.
  Bewusst als Doppelabsicherung, aber der Rückgabewert ist im Client toter Pfad – kurz
  kommentieren oder entfernen.
- [ ] `app/veranstaltung/schema.test.ts:44` – `should_reportDeltaMessage_when_deltaOutOfRange`
  prüft die Meldung nur innerhalb `if (!result.success)`. Parst der Wert wider Erwarten doch,
  läuft der Test vakuum-grün. Vorab `expect(result.success).toBe(false)` (oder `else expect.fail`)
  – die Ablehnung selbst ist zwar in `should_reject_when_deltaTwo` separat abgedeckt.

## Positives

- **Architektur exemplarisch ADR-025-konform:** eine `verzehr_position`-Tabelle (D1), atomarer
  Delta-Upsert mit `GREATEST(0, …)` (D3, kein Lost Update, DB-seitige 0-Klemmung + CHECK),
  Live-Katalog ohne Snapshot (D2), route-neutrale `app/_verzehr/`-UI mit Action-als-Prop (D5),
  reine DB-freie `summen.ts` (D5, domänenspezifischer Name statt `utils`, Codify #105).
- **Fail-closed-Reihenfolge der Action exakt nach D6** (Role → Zod → Status → IDOR → Soft-Delete
  → Persist); jeder Guard-Branch hat einen eigenen Test (Codify #51) – acht Branch-Tests in
  `actions.test.ts` inkl. `zeileNotInVeranstaltung` und `catalogItemInactive`.
- **IDOR-Schutz sauber umgesetzt:** `getZeile(zeileId, veranstaltungId)` bindet den Parent-Key
  ins `WHERE` (Codify #51); Integrationstest `should_onlyReturnPositionsOfGivenVeranstaltung`
  belegt die Veranstaltungs-Isolation von `listPositionen`.
- **Geld durchgängig Integer-Cent** (ADR-021); Σ `menge × priceCents` exakt ganzzahlig,
  Anzeige über `formatCents` – AC7 trivial und exakt erfüllt.
- **Zod-Grenze korrekt:** Delta ∈ {+1, −1} erzwungen, `catalogItemId`/`zeileId` getrimmt +
  Mindestlänge; Meldungsinhalt separat getestet (Codify #116-Muster).
- **Tests trennen Ebenen sauber:** DB-Integration (skipIf ohne DB), Action-Unit mit
  `vi.resetAllMocks()` (Codify #51), Client-Komponente mit Rendering-Assertions, Server-Page
  mit RBAC-/Status-/Daten-Pfaden. Kein `useEffect`-Toggle (Codify #49).

## Empfehlung

APPROVED

Begründung: Kein kritisches Finding; alle AC/FS sind implementiert und getestet, Security- und
Architektur-Vorgaben (ADR-025, Codify #50/#51/#105/#116) durchgängig eingehalten. Das eine
wichtige Finding (Summe inaktiver Artikel) ist ein seltener Edge-Case ohne Prod-Daten und lässt
sich vor `/test` beheben **oder** bewusst als Folge-Issue + ADR-025-Handoff-Notiz deferrieren –
kein Merge-Blocker.
