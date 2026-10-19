# Security Review: Task 407

Geprüft: `git diff origin/main...HEAD` (26 Dateien; Produktionscode nur unter `app/verwaltung/katalog/**`
und ein Kommentar in `app/components/FormularDialog.tsx`), Stand HEAD `47a578e`, 2026-10-19.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] [Hygiene] Gitignorierte Wegwerf-Dateien liegen noch im Worktree (`e2e/katalog-407.tmp.spec.ts`,
  `e2e407.tmp.log`, `playwright-407.tmp.config.ts`, `scripts/{cov,e2e,mutation,vitest}407.tmp.sh`,
  `tasks/telemetry-raw-407-*.tmp.txt`). Sie sind nicht getrackt, also kein Leck über Git. Vor dem
  Merge bzw. vor `git worktree remove` löschen (Lesson `build-tooling.md`, #372). Schon in den
  Refactor-Notizen und Review-Iteration 4 vermerkt, deshalb kein neuer Eintrag in `kleinfunde.md`.

## Prüfkatalog

**Input-Validierung & Injection**
- Es gibt keine neue Server-Grenze. Die neuen Komponenten (`KatalogBearbeiten`, `KatalogAnlegen`)
  rufen dieselben Actions mit denselben Feldern auf wie das gelöschte `CatalogControls`:
  `renameCatalogAction` (`id`, `name`), `duplicateCatalogAction` (`sourceId`, `name`),
  `setCatalogActiveAction` (`id`, `active`) und `createCatalogAction` (`name`). Die Zod-Validierung
  in `actions.ts` ist unverändert.
- Jeder Bereich im Dialog ist ein eigenes `<form>` und sendet deshalb nur seine eigenen Felder.
  Es gibt keine Vermischung, die versehentlich `active=false` mitschicken könnte.
- SQL: kein neuer DB-Zugriff. Die Seite nutzt weiter `listCatalogs`/`listCatalog` aus der
  Drizzle-Data-Layer.
- XSS: Katalog- und Artikelnamen werden nur als React-Text gerendert (`titel`, `description`,
  `placeholder`, `<option>`). Kein `dangerouslySetInnerHTML` im Diff.
- Command/XML-Injection: nicht relevant.

**Authentifizierung & Autorisierung**
- Das Seiten-Gate `hasRole(…, "verwalter")` in `page.tsx` ist unverändert. Alle aufgerufenen
  Actions prüfen serverseitig mit `requireRole("verwalter")` (`actions.ts:184/198/216/232`,
  Artikel-Actions `:101/128/158`).
- BOLA/IDOR: unverändert. Die Katalog-Id kommt wie bisher aus einem Hidden-Feld. Für den einzigen
  Akteur, die Rolle `verwalter`, sind alle Kataloge in Ordnung. Der Parent-Key-Schutz bei den
  Artikel-Actions (#345) ist nicht berührt.
- Das Ausblenden von „Duplizieren" bei deaktiviertem Katalog ist reiner Komfort. Die serverseitige
  Ablehnung (`SOURCE_CATALOG_INACTIVE`) bleibt die eigentliche Grenze.
- Keine hartkodierten Credentials, kein Logging sensibler Daten.

**Daten & Kryptographie**
- Keine Secrets im Diff, keine Zufallszahlen, keine Änderung an Speicherung oder Transport.

**Dependencies**
- `package.json` und `pnpm-lock.yaml` sind unverändert. Keine neuen Abhängigkeiten.

**Error Handling**
- Fehler erscheinen nur als `state.error` aus den bestehenden Actions, also bereits übersetzte
  Fachmeldungen. Keine Stack Traces, keine neuen Fehlerpfade.

**Test-/E2E-Änderungen**
- `e2e/*` und `*.test.tsx` enthalten nur Locator-Anpassungen und Testdaten. Keine Zugangsdaten
  im Klartext über das hinaus, was die bestehenden Helfer schon nutzen.

## Out-of-Scope-Funde
Keine.

## Ergebnis
PASSED
