# Task 172: eslint-playwright-artefakte-ignorieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
`pnpm lint` brach nach jedem `pnpm test:e2e`-Lauf mit tausenden Fehlern ab, weil ESLint die
von Playwright **generierten** Verzeichnisse `test-results/` und `playwright-report/` mitlintete
(minifiziertes JS im HTML-Report + Trace-Ressourcen). `.gitignore` deckt beide ab, ESLint hat
aber eine eigene Ignore-Liste (`globalIgnores` in `eslint.config.mjs`), die die Pfade nicht
enthielt. Da `pnpm lint` im pre-commit-Hook läuft, blockierte das jeden Commit bis zum manuellen
`rm -rf test-results playwright-report`.

**Fix:** `globalIgnores` in `eslint.config.mjs` um `"test-results/**"` und
`"playwright-report/**"` ergänzt (analog zu `coverage/**` / `.gitignore`).

## Akzeptanzkriterien
- [x] GIVEN ein `pnpm test:e2e`-Lauf hat `test-results/` erzeugt WHEN `pnpm lint` läuft THEN wird
  das Verzeichnis ignoriert (kein Abbruch), ohne dass es vorher gelöscht wird.
- [x] GIVEN ein `pnpm test:e2e`-Lauf hat `playwright-report/` erzeugt WHEN `pnpm lint` läuft THEN
  wird das Verzeichnis ignoriert (kein Abbruch), ohne dass es vorher gelöscht wird.

## Technische Notizen
- Verhaltensbasierter Regression-Guard in `eslint.config.test.ts` über die ESLint-Node-API
  (`ESLint#isPathIgnored`) statt String-Matching der Ignore-Liste – prüft die tatsächliche
  Ignore-Wirkung. Beide Verzeichnisse einzeln assertiert (Wegfall genau eines Eintrags → roter Test).
- Reale Verifikation lokal: Artefakt-Verzeichnisse mit lint-verletzendem JS angelegt → `pnpm lint`
  grün (exit 0); Artefakte danach wieder entfernt.
- Kein ADR-Trigger (reine Ergänzung der ESLint-Ignore-Liste).

## Offene Fragen
_Keine._

## Review-Findings
Review (`tasks/review-172.md`): **APPROVED**, keine Findings.

## Refactoring
- `eslint.config.test.ts`: dreifach dupliziertes `const eslint = new ESLint()` zu einer geteilten,
  read-only Instanz auf describe-Ebene zusammengeführt (DRY; isolationssicher, da `isPathIgnored`
  ein reiner Lesezugriff ist; Config-Resolution nur noch einmal). Kein Verhalten geändert – 3 Tests
  vor und nach dem Refactor identisch grün.

## Codify-Notizen
Siehe `tasks/codify-172.md`. Ein Learning festgehalten: ESLint-Ignore-Config verhaltensbasiert
testen (`isPathIgnored`) + Diskriminierungs-Kontrolle in der Gegenrichtung
(`docs/factory/lessons/testing.md`, Index-Zeile in `PROJECT-CONTEXT.md`). Review/Security ohne
Findings – keine weitere Regeländerung nötig.

---
Branch: `chore/172-eslint-playwright-artefakte-ignorieren`
Erstellt: 2026-07-24 09:55
