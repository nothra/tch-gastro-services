# Security Review: Task #428

Geprüft: `git diff origin/main...HEAD` (Schwerpunkt: neuer Workflow `factory-update.yml`, geänderte Workflow-Env, Secret-Scan über den ganzen Diff, Abhängigkeits-Dateien, Vertrauenskette des Factory-Bezugs). Der App-Code (`app/`, `db/`, `lib/`) ist unverändert – Input-Validierung, Injection, AuthN/AuthZ, Krypto und Error-Handling der App sind nicht berührt.

## Kritische Findings (Blocker)
- keine

## Wichtige Findings
- keine

## Hinweise
- [ ] Secrets/Token: `FACTORY_SYNC_TOKEN` muss als **Environment-Secret** `factory-update` (mit Deployment-Branch-Regel `main`) angelegt werden, nicht als Repository-Secret (AK2.17h, menschlicher Schritt). Der Job `guard` schlägt bei einem Repository-Secret absichtlich rot an; vor dem ersten Lauf bleibt der Workflow ein No-op ohne Token. Minimale Rechte des Fine-grained PAT wie in `OPERATING.md` §0.6 beschrieben.
- [ ] Workflow-Härtung (positiv, keine Aktion): `permissions: contents: read` global; Token und ungeprüfter Release-Code laufen nie im selben Job (`fetch` ohne Environment/Secret, `publish` führt keinen Release-Code aus); alle Jobs checken den Standard-Branch aus, `persist-credentials: false`; Artefakt-Retention 1 Tag; Werte aus `github.*`/`needs.*` gehen nur über `env:` in die Skripte, nie inline in `run:` (kein Script-Injection-Pfad). Das gilt auch für die neuen `PR_HEAD_REF`/`PR_HEAD_REPO`/`PR_BASE_REPO` in `factory-ci.yml`.
- [ ] Vertrauenskette: Der Bezug kommt aus `nothra/dev-factory` (Tag v0.8.0, im Lock mit Commit-SHA fixiert). `factory-integrity` prüft die Dateihashes gegen das Lock und das Lock gegen das Release-Manifest (CI grün; fail-closed bei unerreichbarem Repo). Ein kompromittiertes Factory-Repo könnte nur über einen Update-PR wirken, den Gates und ein Mensch freigeben müssen; der Workflow merged nie und aktiviert kein Auto-Merge.
- [ ] GitHub Actions sind per Tag (`@v4`) statt per Commit-SHA gepinnt – konsistent mit dem bisherigen Bestand, aber ein Lieferketten-Restrisiko; als Härtung für die Factory (nicht diesen PR) denkbar.
- [ ] Dependencies: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` unverändert (0 Diff-Zeilen), keine neuen Abhängigkeiten. Die vier offenen Dependabot-Hinweise (moderate) auf `main` sind vorbestehend und nicht Teil dieses PR.
- [ ] Secret-Scan über den gesamten Diff (Token-Präfixe, Private-Key-Header): keine Treffer.

## Ergebnis
PASSED
