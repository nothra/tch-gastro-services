# Security Review: Task 91

Scope: Stage-3-Infrastruktur (Shell-Seam + Permission-Config), kein Produktcode.
Geprüfte Artefakte: `scripts/factory-commit.sh`, `scripts/lib/report-verdict.sh`,
`scripts/run-pipeline.sh` (Report-Guard), `.claude/settings.json`, `factory.defaults.yml`.
Basis: `git diff main...HEAD`, OWASP Top 10 + Prüfkatalog `/security-review`.

## Kritische Findings (Blocker)
- [ ] _Keine._

## Wichtige Findings
- [ ] _Keine._

## Hinweise
- [ ] **[Injection] `git commit -m "$COMMIT_MESSAGE"` – sauber, kein Handlungsbedarf.**
      Die Commit-Message wird als einzelnes, doppelt gequotetes Positionsargument übergeben
      (kein `eval`, keine Wort-Splittung). Ein Wert wie `$(rm -rf .)` oder `--force` landet als
      **literale Message**, nicht als Flag/Kommando. Die `[ "$#" -ne 1 ]`-Wache verhindert zudem
      das Einschmuggeln zusätzlicher Flags (Force-Push-Einfallstor). Bewusst gut gelöst.

- [ ] **[Data Exposure] `git add -A` stagt den gesamten Arbeitsbaum – Rest-Risiko durch `.gitignore` gedeckt.**
      Secrets liegen laut Projekt-Konvention nur als Vercel-Env-Vars vor; `.gitignore` schließt
      `.env*` aus (`!.env.example`). Damit kann `git add -A` **keine** `.env`-Secrets committen/pushen.
      Rest-Risiko (niedrig): ein *neu* eingeführtes secret-tragendes File außerhalb des `.env*`-Musters
      (z. B. `*.pem`, `credentials.json`) würde still mitgestaged. Empfehlung: `.gitignore`-Hygiene für
      solche Muster beibehalten; keine Code-Änderung nötig, da außerhalb des Task-Scopes.

- [ ] **[Authorization] `Bash(gh pr merge:*)` erlaubt unbeaufsichtigtes Mergen – by design (ADR-019/pr-shepherd).**
      Das Verb gibt dem non-interaktiven Agenten Merge-Fähigkeit ohne Prompt. Das ist die
      beabsichtigte PR-Shepherd-Fläche und bleibt fail-closed abgesichert (pre-push-Hook blockt
      `main`/`master`, `factory-commit.sh` doppelt gegen main/master). Kein pauschales
      `Bash(gh *)`/`Bash(git *)`, deny-Liste unverändert. Bewusst dokumentiert, kein Finding.

- [ ] **[Authorization] `Bash(git branch:*)` deckt auch destruktives lokales `git branch -D` ab.**
      Nur lokale Auswirkung (kein Remote), niedriges Risiko. Der Wildcard folgt demselben Muster
      wie die übrigen read-only-git-Verben. Falls man minimal-invasiv sein will, ließe sich
      `git branch` auf Listen/Anlegen einschränken – für den aktuellen Bedarf vertretbar.

- [ ] **[Injection / Path] `report-verdict.sh`: `task_id` fließt in den Dateipfad ein – Eingabe ist intern/vertrauenswürdig.**
      `file="$tasks_dir/review-${task_id}.md"` und `grep -oE "$pattern" "$file"`: `pattern` ist ein
      **festes Literal** (kein user-kontrollierter Regex → keine ReDoS/Regex-Injection), `task_id`
      stammt aus der Pipeline (Issue-Nummer, upstream validiert), nicht aus externer Request-Eingabe.
      Verhalten ist fail-safe (fehlende Datei/kein Verdict → leerer stdout, Exit 0). Kein Handlungsbedarf.

- [ ] **[Information Disclosure] Diagnostik korrekt.** `factory-commit.sh` schreibt nur Branch-Namen
      und Status-Text auf stderr – keine Secrets, keine Tokens, keine internen Stack Traces.

## Ergebnis
PASSED

Keine kritischen oder wichtigen Findings. Der Commit/Push-Seam ist konsequent fail-closed
(main/master, detached HEAD, kein Repo, Push-Fehler weitergereicht, kein `--force`), die
Permission-Erweiterung ist granular (keine Wildcards über `git`/`gh`), und die deny-Liste
(`.claude/**`, `.env*`, `Read(.env*)`) bleibt intakt. Merge aus Security-Sicht freigegeben.
Die Hinweise sind Beobachtungen/Härtungsoptionen ohne Merge-Blocker – keine Auslagerung als
eigenes Issue erforderlich.
