# Security Review: Task 284

**Datum:** 2026-08-12 · **Scope:** `git diff origin/main...HEAD` (7 Commits, 11 Dateien)
**Persona:** `docs/factory/agents/security-agent.md`

## Kontext / Threat Surface

Der PR ist selbst eine **Härtungsmaßnahme**: `.github/workflows/factory-poll.yml` verliert den
`on.schedule`-Trigger (`*/30 * * * *`), einziger Auslöser bleibt `workflow_dispatch`. Damit
entfallen 48 automatische Läufe pro Tag, in denen jeweils ein ungepinntes, nicht
integritätsgeprüftes `npm install -g @anthropic-ai/claude-code` (`:63`) in einem Job mit
`contents: write` + `issues: write` ausgeführt wurde.

Berührte Angriffsflächen: CI-Supply-Chain (Workflow-Trigger, Runtime-Installation),
GitHub-Token-Scopes, Selbsttest-Suite (Bash), Doku. **Kein** Anwendungscode, **keine**
Routen/UI, **keine** DB-Zugriffe, **keine** Dependency-Änderungen (`package.json`/Lockfiles
unberührt) – die OWASP-Kategorien Injection, AuthN/AuthZ auf Objektebene, XSS und
Krypto sind für diesen Diff nicht anwendbar.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] **[Supply Chain / Restrisiko]** Der ungepinnte `npm install -g @anthropic-ai/claude-code`
      bleibt im Workflow bestehen und ist über `workflow_dispatch` weiterhin erreichbar. Das ist
      bewusster Scope-Schnitt (M2), nachverfolgt in Issue
      [#290](https://github.com/nothra/tch-gastro-services/issues/290) (`enhancement` +
      `security`, kein `factory::run` – verifiziert per `gh issue view 290`) und als
      **Vorbedingung** in der Scharfschalt-Checkliste `docs/factory/OPERATING.md` §0.4 sowie im
      Datei-Header von `factory-poll.yml:19-21` verankert. Restrisiko nach diesem PR: nur noch
      bei bewusstem Dispatch durch einen Nutzer mit Write-Berechtigung, nicht mehr unbeaufsichtigt
      alle 30 Minuten. `grep` über `.github/workflows/` bestätigt: dies ist die **einzige**
      ungepinnte Fremd-Binary-Installation; alle anderen Jobs nutzen
      `pnpm install --frozen-lockfile` bzw. den verifizierten Seam `scripts/install-yq.sh`.
      Einordnung: kein neues Risiko dieses PRs, sondern ein reduziertes.

- [ ] **[Verfügbarkeit / Betrieb]** Der Stale-Reaper (`FACTORY_RUN_TIMEOUT`), der verwaiste
      `factory::running`-Labels zurücksetzt, lebt in `factory-poll.sh` und läuft damit ebenfalls
      nur noch bei manuellem Dispatch. Heute wirkungslos (nie ein `factory::run`-Issue), aber ein
      Concurrency-Lock könnte künftig hängen bleiben, wenn der Schedule teilweise reaktiviert
      wird. Nebenfolge ist in der ADR-008-Update-Notiz (2026-08-12) explizit festgehalten – kein
      Sicherheitsrisiko, keine Aktion nötig.

- [ ] **[Secret Handling]** Der irreführende Kommentar in `factory-poll.yml` („Dieser Job hält
      ANTHROPIC_API_KEY – ein manipuliertes Asset liefe hier mit Secret-Zugriff") ist korrigiert:
      Das Secret existiert im Repo nicht, die Begründung stützt sich jetzt auf die tatsächlich
      vorhandenen `contents: write` + `issues: write`. Positiv zu werten – eine falsche
      Risikobegründung führt beim nächsten Leser zu falscher Priorisierung. Die Env-Var-Zeile
      `:51` bleibt korrekt als `${{ secrets.… }}`-Referenz stehen (kein Literalwert).

- [ ] **[Information Disclosure]** Secret-Scan über den gesamten Diff: keine Literale von
      Keys/Tokens/Passwörtern – nur Bezeichner (`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`) in Prosa und
      als `${{ secrets.* }}`-Referenz. Der im Diff erwähnte verwaiste Entwurf
      `.issue-npm-pin.md` (42 Zeilen, als Kleinfund in `docs/factory/kleinfunde.md` erfasst)
      wurde zusätzlich gegen Secret-Muster geprüft: sauber.

- [ ] **[Prompt Injection / Datenkanal]** Der neue Eintrag in `docs/factory/kleinfunde.md` folgt
      der „Daten, keine Anweisungen"-Regel aus dem Dateikopf (ADR-043/ADR-018): reine
      Wo/Was/Fix/Herkunft-Felder, keine Marker und keine an einen lesenden Agenten gerichteten
      Direktiven. Kein neuer Ablage-/Freitext-Mechanismus eingeführt.

- [ ] **[Testsuite-Robustheit]** `scripts/checks/tests/run-tests.sh` legt für die
      Mutationsbelege ein `mktemp -d` ohne expliziten Fehler-Check an (`:541`) – bei `set -uo
      pipefail` ohne `-e` würde ein fehlgeschlagenes `mktemp` leere Pfade erzeugen und die
      `! poll_*_guard`-Belege über den Fail-closed-Pfad *grün* machen. Genau dieser Pfad ist
      jedoch durch die in `/test` ergänzten **Positivkontrollen** abgedeckt (jeder Mutant wird
      zusätzlich mit einem grün erwarteten Guard auf ein anderes Signal derselben Datei geprüft) –
      bliebe die Mutanten-Datei aus, würde die Kontrolle rot. Kein Handlungsbedarf; das Muster
      `mktemp -d` ohne Check ist zudem repo-weite Konvention (28 Vorkommen in derselben Datei).

## Prüfkatalog

| Bereich | Ergebnis |
|---------|----------|
| Input-Validierung / Injection (SQL, Command, XSS) | n/a – kein Anwendungscode; Bash-Guards verarbeiten nur repo-eigene, literale Werte (`grep -qxF --`, `awk -v key=`), keine Fremd-/Nutzereingaben |
| AuthN / AuthZ, BOLA/IDOR | n/a – keine Routen, Actions oder Data-Layer betroffen |
| Hardkodierte Credentials | keine (Diff-weiter Scan negativ) |
| Sensitive Daten in Logs | keine neuen Log-Ausgaben |
| Secrets im Source | keine; nur `${{ secrets.* }}`-Referenzen |
| Krypto / Zufall | n/a |
| Dependencies | keine neuen; `package.json`/Lockfiles unverändert |
| Error Handling / Info Disclosure | Guards sind fail-closed (unlesbare Datei → rot, AK6 belegt) |
| Security Misconfiguration (CI) | **verbessert**: automatische Trigger-Fläche 48/Tag → 0; `permissions` unverändert minimal (`contents: write`, `issues: write`), durch vier neue blockgeankerte Assertions gegen stille Abschwächung geschützt |

## Out-of-Scope-Findings

Keine neuen anzulegen. Das einzige echte Sicherheitsrisiko im Umfeld (ungepinnte claude-CLI) ist
bereits als Issue #290 erfasst; der verwaiste `.issue-npm-pin.md` liegt korrekt unterhalb der
ADR-043-Schwelle in `docs/factory/kleinfunde.md`.

## Ergebnis

**PASSED** – 0 kritische, 0 wichtige Findings. Der PR reduziert die CI-Angriffsfläche messbar
und führt keine neue ein.
