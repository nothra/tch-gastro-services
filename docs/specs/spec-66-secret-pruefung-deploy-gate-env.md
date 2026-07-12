# Spec: Secret-Prüfung im Deploy-Gate über `env:` statt inline `${{ secrets.* }}`

> Härtung · Issue #66 · Backlog aus dem Security-Review von #63 (`tasks/security-63.md`, Hinweis #2)

## Kontext

Im Deploy-Gate (`.github/workflows/deploy-gate.yml`) werden Secret-Werte an zwei Stellen
**direkt in einen `run:`-Shell-Ausdruck** interpoliert: `[ -n "${{ secrets.X }}" ]`. GitHub
Actions ersetzt `${{ … }}` **vor** der Shell-Ausführung textuell im Skript. Enthielte ein
Secret ein `"` oder einen Backtick, könnte der Wert aus dem String ausbrechen – das klassische
GitHub-Actions-Script-Injection-Muster. Es widerspricht der Projektregel „nutzerkontrollierte/
variable Werte als Daten behandeln, nie als Code" (`docs/factory/guidelines/clean-code.md` →
„Portabilität in Gate-/Shell-Skripten").

**Warum nur Defense-in-Depth / Backlog** (aus `tasks/security-63.md`): Die Werte sind
Repo-Owner-gesetzt (nicht PR-/angreiferkontrolliert), der Trigger ist ausschließlich
`push: main`, und der Worst Case ist ein **fail-closed** „Secret fehlt". Kein akuter
Angriffsvektor – aber die Härtung entfernt das Muster strukturell und folgt dem bereits im
Gate etablierten Vorbild (`$BYPASS` wird schon über den `env:`-Block gelesen).

## Scope

**Inbegriffen:**
- Alle im Gate innerhalb eines **`run:`-Shell-Ausdrucks** referenzierten Secrets über den
  `env:`-Block des jeweiligen Steps als Shell-Variablen bereitstellen und im Skript nur noch
  gequotete Shell-Variablen testen (`[ -n "$NEON_API_KEY" ]` statt `[ -n "${{ secrets.NEON_API_KEY }}" ]`).
- Betrifft **beide** betroffenen Steps:
  1. **`Secrets vorhanden?`** (aktuell Zeilen 54–73): `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`,
     `PRD_DATABASE_URL`, `PRD_ADMIN_EMAIL`, `PRD_ADMIN_PASSWORD`, `NEON_API_KEY`,
     `NEON_PROJECT_ID`, `NEON_INT_BRANCH_ID`, `NEON_PRD_BRANCH_ID`, `INT_DATABASE_URL`.
     (`VERCEL_AUTOMATION_BYPASS_SECRET` läuft bereits als `$BYPASS` – dient als Muster-Vorlage.)
  2. **`INT-Refresh aktiv?`** (aktuell Zeilen 83–96): `NEON_API_KEY`, `NEON_PROJECT_ID`,
     `NEON_INT_BRANCH_ID`, `NEON_PRD_BRANCH_ID`, `INT_DATABASE_URL`.

**Nicht inbegriffen (bewusst kein neues Verhalten – Tech-Debt-Task):**
- **Keine Änderung am Verhalten:** Welche Secrets Pflicht sind, die fail-closed-Logik
  (`exit 1` bei fehlendem Pflicht-Secret) und die Skip-mit-Warnung-Logik des INT-Refresh
  bleiben **identisch**.
- **Keine** neuen Secrets, keine Umbenennung, keine geänderten Fehlermeldungen (`::error::…`,
  `::warning::…` wortgleich).
- Secret-Referenzen, die **bereits** in einem `env:`-Block stehen (Steps „INT-DB zurücksetzen",
  „INT anonymisieren…", „E2E gegen INT", „PRD-DB migrieren…") bleiben **unverändert** – das ist
  schon das Zielmuster.
- Keine Änderung an anderen Workflows als `deploy-gate.yml`.

## Akzeptanzkriterien

- [ ] GIVEN das Deploy-Gate `deploy-gate.yml` WHEN man den `run:`-Block des Steps
      `Secrets vorhanden?` prüft THEN enthält er **kein** `${{ secrets.* }}` mehr, sondern
      testet ausschließlich gequotete Shell-Variablen (`[ -n "$VAR" ]`).
- [ ] GIVEN das Deploy-Gate WHEN man den `run:`-Block des Steps `INT-Refresh aktiv?` prüft
      THEN enthält er **kein** `${{ secrets.* }}` mehr, sondern gequotete Shell-Variablen.
- [ ] GIVEN das gesamte `deploy-gate.yml` WHEN man nach `${{ secrets.` **innerhalb eines
      `run:`-Ausdrucks** sucht THEN gibt es **keinen** Treffer mehr (nur noch in `env:`-Blöcken).
- [ ] GIVEN alle Pflicht-Secrets sind gesetzt WHEN das Gate läuft THEN verhält es sich exakt
      wie zuvor (Prüfung grün, kein Abbruch) – **kein** verändertes Verhalten.
- [ ] GIVEN ein Pflicht-Secret fehlt (leer) WHEN der Step `Secrets vorhanden?` läuft THEN
      wird die zugehörige `::error::…`-Meldung ausgegeben und der Step bricht **fail-closed**
      mit `exit 1` ab (unverändert).
- [ ] GIVEN mindestens ein Neon-/INT-Secret fehlt WHEN der Step `INT-Refresh aktiv?` läuft
      THEN wird `enabled=false` gesetzt und die `::warning::…`-Meldung ausgegeben (unverändert).

## Fehlerszenarien

- [ ] **Secret mit Sonderzeichen (`"`, Backtick, `$`):** WHEN ein solcher Wert über `env:`
      als Shell-Variable gelesen und gequotet getestet wird THEN wird er **literal** behandelt
      (keine Wort-Trennung, kein Ausbruch aus dem Test-Ausdruck) – genau die geschlossene Lücke.
- [ ] **Leeres Secret:** `[ -n "$VAR" ]` ist bei leerer/ungesetzter Variable false → gleiche
      fail-closed-/Skip-Reaktion wie bei der bisherigen inline-Form.

## Verifikation

- [ ] `deploy-gate.yml` bleibt valides YAML (Struktur/Einrückung des `env:`-Blocks korrekt).
- [ ] `actionlint` (falls verfügbar) meldet keinen neuen Fund; andernfalls YAML-Parse-Check.
- [ ] Grep-Nachweis: `grep -nE 'run:|\$\{\{ *secrets\.' .github/workflows/deploy-gate.yml`
      zeigt keine `${{ secrets.* }}`-Referenz, die zu einem `run:`-Step gehört.

## Offene Fragen

- _Keine._ Der Umfang ist durch Issue #66 und den Security-Review #63 vollständig bestimmt;
  reine Härtung ohne Verhaltensänderung.
