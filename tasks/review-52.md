# Review: Task 52

Multi-Persona-Review (Logik/Korrektheit · Code-Qualität · Architektur) des Feature-Branches
`feature/52-verzehr-erfassen`. Grundlage: `git diff main...HEAD`, `spec-52`, `ADR-025`.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle AC (AC1–AC7) und Fehlerszenarien (FS1–FS3) sind implementiert und getestet;
RBAC-Guard, IDOR-Bindung (`getZeile(zeileId, veranstaltungId)`), Soft-Delete-Prüfung und der
atomare Delta-Upsert (`GREATEST(0, …)` + DB-CHECK) sind korrekt umgesetzt.

## Wichtige Findings (sollten behoben werden)

- [ ] **`db/verzehr.ts:53` + `app/_verzehr/summen.ts:20` + `app/_verzehr/VerzehrErfassung.tsx:57` –
  Position auf einem soft-gelöschten Artikel wird in die Zeilensumme gezählt, aber nicht
  dargestellt und ist nicht korrigierbar (unsichtbare, eingefrorene Summe).**
  `listPositionen` joint `catalog_item` **ohne** `active`-Filter (bewusst, damit die
  Preisauflösung immer gelingt), die MengeControl-Zeilen kommen aber aus `listActiveCatalog()`
  (nur `active`). Deaktiviert der Verwalter einen bereits konsumierten Artikel während einer
  **offenen** Veranstaltung (spec-49), dann (1) zählt `zeileSummen` die Position weiter in den
  Header, (2) es gibt keine `MengeControl`-Zeile mehr dafür, (3) `adjustVerzehrAction` lehnt `-1`
  auf den inaktiven Artikel ab (D6-Schritt 5) → der Betrag lässt sich nicht mehr herunterzählen.
  Der Nutzer sieht eine Summe, die er weder zuordnen noch korrigieren kann. Edge-Case (ohne
  Prod-Daten nicht akut), aber echte Anzeige-/Korrektur-Inkonsistenz.
  **Optionen:** (a) Positionen inaktiver Artikel read-only als eigene Zeile rendern (sichtbar,
  gesperrt), (b) `summen` nur über sichtbare/aktive Positionen bilden, oder (c) bewusst als
  Folge-Issue + ADR-025-Handoff-Notiz deferrieren (analog D2-Preis-Quirk).

- [ ] **`app/_verzehr/VerzehrErfassung.tsx:1` – route-neutrale Erfassungs-UI koppelt an das
  Verwaltungs-Feature (`import { CATEGORY_LABEL } from "@/app/verwaltung/katalog/CatalogFields"`).**
  `app/_verzehr/` ist laut ADR-025 D5 bewusst route-neutral, damit F7 (#54, öffentliche Theke) es
  ohne Umbau wiederverwenden kann. Der Import zieht ein Modul aus `app/verwaltung/katalog/` in
  diesen geteilten Baum – die spätere Theke-Route hinge damit an einem Verwalter-Feature-Modul.
  Das untergräbt die Route-Neutralität und die Separation of Concerns (analog Codify #105:
  neutrale Platzierung gemeinsam genutzter Bausteine). **Empfehlung:** die kanonische
  `CATEGORY_LABEL`-Map in ein neutrales Modul verschieben (z. B. `app/_verzehr/` oder neben dem
  `catalogCategory`-Enum in `db/schema`-Nähe) und Verwaltung **und** `_verzehr` daraus importieren
  lassen – bevor F7 die Kette erbt.

## Nitpicks (optional)

- [ ] `app/veranstaltung/[id]/page.tsx:62` – Der Link „Verzehr erfassen →" erscheint auch bei
  `abgeschlossen`er Veranstaltung und führt auf die Nur-Lese-Sicht. Label „erfassen" ist dort
  leicht irreführend; ggf. kontextabhängig („Verzehr ansehen") oder nur bei `offen` zeigen.
- [ ] `app/_verzehr/MengeControl.tsx:44` – Die Action liefert die autoritative `menge` im State
  zurück (in Tests geprüft), die Komponente rendert aber ausschließlich die server-autoritative
  Prop (via `revalidatePath`, ADR-025 D3). `state.menge` ist im Client ein toter Pfad – bewusst
  als Doppelabsicherung, aber kurz kommentieren oder entfernen.
- [ ] `app/veranstaltung/schema.test.ts:90` – `should_reportDeltaMessage_when_deltaOutOfRange`
  prüft die Meldung nur innerhalb `if (!result.success)`. Parst der Wert wider Erwarten doch,
  läuft der Test vakuum-grün (Verstoß gegen testing-standards / Codify #116). Vorab
  `expect(result.success).toBe(false)` ergänzen. (Die Ablehnung selbst ist in
  `should_reject_when_deltaTwo` separat abgedeckt.)

## Positives

- **Architektur exemplarisch ADR-025-konform:** eine `verzehr_position`-Tabelle (D1), atomarer
  Delta-Upsert mit `GREATEST(0, …)` (D3, kein Lost Update, DB-seitige 0-Klemmung + CHECK),
  Live-Katalog ohne Snapshot (D2), route-neutrale `app/_verzehr/`-UI mit Action-als-Prop (D5),
  reine DB-freie `summen.ts` (D5, domänenspezifischer Name statt `utils`, Codify #105).
- **Fail-closed-Reihenfolge der Action exakt nach D6** (Role → Zod → Status → IDOR → Soft-Delete
  → Persist); jeder Guard-Branch hat einen eigenen Test (Codify #51).
- **IDOR-Schutz sauber:** `getZeile(zeileId, veranstaltungId)` bindet den Parent-Key ins `WHERE`
  (Codify #51); der Integrationstest `should_onlyReturnPositionsOfGivenVeranstaltung` belegt die
  Veranstaltungs-Isolation von `listPositionen`.
- **Geld durchgängig Integer-Cent** (ADR-021); Σ `menge × priceCents` ist exakt ganzzahlig,
  Anzeige über `formatCents` (de-DE) – AC7 trivial und exakt erfüllt.
- **Zod-Grenze korrekt:** Delta ∈ {+1, −1} erzwungen, `catalogItemId`/`zeileId` getrimmt +
  Mindestlänge; `veranstaltungId` bewusst kein Client-Feld, sondern serverseitig gebunden
  (`adjustVerzehrAction.bind(null, id)`, ADR-025 D5/D6).
- **Tests trennen Ebenen sauber:** DB-Integration (skipIf ohne DB, nicht-destruktiv), Action-Unit
  mit `vi.resetAllMocks()` (Codify #51), Client-Komponente mit Rendering-Assertions, Server-Page
  mit RBAC-/Status-/Daten-Pfaden. Kein `useEffect`-Toggle (Codify #49).

## Empfehlung

APPROVED

Begründung: Kein kritisches Finding; alle AC/FS sind implementiert und getestet, Security- und
Architektur-Vorgaben (ADR-025, Codify #50/#51/#105/#116) durchgängig eingehalten. Die beiden
wichtigen Findings sind (1) ein seltener Edge-Case ohne Prod-Daten und (2) eine
Kopplungs-/Refactor-Frage – beide sinnvoll vor `/test` zu beheben **oder** bewusst als
Folge-Issue + ADR-025-Handoff-Notiz zu deferrieren; kein Merge-Blocker.
