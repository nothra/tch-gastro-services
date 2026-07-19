# Security Review: Task 173

Scope: `scripts/deploy-freeze.sh`, `scripts/deploy-freeze-notify.sh`,
`.github/workflows/deploy-gate.yml`, `.github/workflows/deploy-freeze-release.yml`,
Test-Verdrahtung in `scripts/checks/tests/run-tests.sh`. Rein CI/Shell/YAML – kein App-Code.
Analysiert gegen: Actions-Script-Injection, Command-Injection, fail-closed-Korrektheit,
Token-/Permission-Scope, Injection über Ref-/Issue-Inhalt, Info-Disclosure, Release-Race.

## Kritische Findings (Blocker)
- Keine.

## Wichtige Findings
- Keine.

## Hinweise
- [ ] [Fail-open an der System-Grenze / bekannt & dokumentiert] Der eigentliche Schutz hängt
  daran, dass `git push origin <sha>:refs/factory/deploy-freeze` mit dem `contents: write`-
  `GITHUB_TOKEN` real durchgeht. Ist der Push serverseitig geblockt (Ruleset/Token-Scope), wird
  bei rotem Gate **kein** Freeze gesetzt → ein späterer flaky-grüner Lauf promotet (genau der
  #134→#167-Vorfall). Das ist der einzige Rest-Fail-open-Pfad und in der Task-Datei als
  Post-Merge-Blocker protokolliert. Mitigierend korrekt umgesetzt: `set_freeze` endet bei
  Push-Fehler **non-zero** (sichtbar, nicht still), und `freeze_set` bricht bei unklarer Lage
  nicht ohne Push ab. Empfehlung: den Live-Push nach Merge wie geplant verifizieren; scheitert er,
  auf Option B (PAT + Repo-Variable, ADR-032) umstellen – nicht annehmen, dass er geht.
  (`deploy-gate.yml:288-304`, `deploy-freeze.sh:79-119`)
- [ ] [Defense-in-Depth / Autorisierung der Entblock-Richtung] Der Freigabe-Workflow
  (`deploy-freeze-release.yml`) hebt die Sicherheitssperre auf und ist per `workflow_dispatch`
  für **jede** Person mit Repo-Schreibrecht auslösbar; die Voraussetzung „Fix gemergt +
  verifiziert" ist nur dokumentiert, nicht technisch erzwungen. Das entspricht ADR-032 §6 und ist
  kein Defekt. Empfehlung (optional): den Job an eine GitHub **Environment** mit *required
  reviewers* binden – dann erfordert die Entblockung ein Vier-Augen-Approval und ist auditierbar,
  ohne die Autonomie des Gate-Setzens zu berühren. (`deploy-freeze-release.yml:13-19,31-33`)
- [ ] [Markdown/Content-Injection – vernachlässigbar] Der `grund`/`reason`-String fließt über
  `printf '%s'` (literal, keine Format-String-Lücke) in den Issue-Body und wird `gh` als
  **Argument** übergeben (keine Shell-Interpolation → keine Command-Injection). Theoretisch
  könnte Markdown im Body landen; die Quelle ist aber entweder ein Literal aus dem Gate
  (`E2E gegen INT rot` etc.) oder die frei getippte Maintainer-Eingabe `inputs.grund` – im
  Release-Pfad wird `grund` zudem gar nicht in den Issue-Body übernommen. Kein realer
  Angriffsvektor, nur zur Vollständigkeit notiert. (`deploy-freeze-notify.sh:49-62`)

## Verifizierte, korrekt umgesetzte Punkte (kein Finding)
- **Script-Injection Freigabe-Workflow behoben (Review-Runde 2):** `inputs.grund` und
  `github.actor` werden ausschließlich über `env:` (`GRUND`/`ACTOR`) gelesen und nur gequotet
  (`"$GRUND"`/`"$ACTOR"`) genutzt – kein inline `${{ … }}` in `run:`. Durch den TDD-Guard
  `userinput_in_run` (Positiv-/Negativ-Kontrolle) abgesichert. (`deploy-freeze-release.yml:47-55,63-73`)
- **deploy-gate.yml:** Alle Secrets über `env:` + gequotete `-n`-Tests; die einzigen inline
  `${{ … }}` in `run:` sind `steps.*.outcome` (GitHub-kontrolliertes Enum success/failure/…, kein
  User-Input) – nicht injizierbar. Kein `github.event.*`/Commit-Message/Branch-Name im `run:`.
- **fail-closed check:** `check` gibt 0=frozen, 10=frei, sonst=unklar; das Gate promotet nur bei
  **exakt** Exit 10. Unlesbarer/unerreichbarer Remote → `return 2` → `frozen=true`. Script-/Git-
  Crash → non-10 → fail-closed. (`deploy-freeze.sh:48-61`, `deploy-gate.yml:203-229`)
- **Promote-Guard fail-closed gegen Migrations-Fehler:** Die Promote-/Migrate-/Healthcheck-Steps
  nutzen `if:` ohne Status-Funktion → GitHub AND-et implizit `success()`. Schlägt `migrate_prd`
  fehl, ist `success()` false → Promote wird übersprungen (kein Deploy auf halb-migrierter DB).
- **Check vor PRD-Migration (AC4):** `check_freeze` steht vor `migrate_prd` (Positions-Guard im
  Test) – kein Prod-DB-Seiteneffekt während eines Freezes.
- **Least Privilege:** beide Workflows nur `contents: write` + `issues: write`; kein PAT, kein
  breiterer Scope. `refs/factory/*` bewusst außerhalb `protect-main` (ADR-029) – dokumentiert.
- **Secret-Handling:** `.env.int` (always()-Cleanup) und `.env.prd` (trap EXIT) werden auch im
  Fehlerfall gelöscht; Secrets nur via `printf '%s'` literal geschrieben, nie geloggt.
- **Race/Idempotenz:** gemeinsame `concurrency: deploy-gate` (`cancel-in-progress: false`)
  serialisiert Setzen ↔ Freigeben; `release` fail-open, aber mit **ehrlicher** Meldung bei
  unverifizierbarer Lage (kein falsches „released"). (`deploy-freeze.sh:121-154`)
- **notify fail-open sauber getrennt:** endet immer Exit 0, kann den fail-closed Marker nie
  blockieren.

## Ergebnis
PASSED
