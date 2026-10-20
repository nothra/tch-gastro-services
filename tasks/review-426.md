# Review: Task 426

Scope: T1a-1 (AK-Gruppen A, B, C, L, X, F-1..F-3). Diff `origin/main...HEAD`, 140 Dateien, kein Eingriff in `app/`, `db/`, `lib/`, `e2e/`.
Geprüft: `ownership-check.sh`, `adr-links-check.sh`, `pre-push.sh` (Check 6a), `OWNERSHIP.md`, ADR-063-Nachtrag, Lessons-/Kleinfunde-Split, `.claude/commands`-Patch (Endzustand), Task-Datei.
Nachgelaufen: `ownership-check.sh` (1233 Dateien, factory 105 / project 1128, exit 0), `adr-links-check.sh` (305 geprüft, exit 0), `import-context-limit-check.sh` (965 von 1100), Self-Test-Suite laut Nutzer grün.

## Kritische Findings (müssen behoben werden)
Keine.

## Wichtige Findings (sollten behoben werden)
- [ ] `tasks/task-426-trennlinie-factory-projekt-ziehen.md:57-58` AK-X2 (Required-Check-Namen unverändert, grün auf dem PR) und AK-X3 (Echtlauf `start-work.sh`) stehen noch auf `[~]`. Beides ist erst mit laufender CI bzw. nach dem Merge belegbar – vor `/pr-shepherd` per `gh pr checks` bestätigen und in der Task-Datei nachtragen. Kein Code-Mangel, aber ein offener Nachweis.

## Nitpicks (optional)
- [ ] `scripts/checks/ownership-check.sh:~92` Der Dateilisten-Zweig filtert mit `NF == 1` bei `FS="|"`. Ein getrackter Dateiname mit `|` hätte `NF > 1` und würde **still übersprungen** statt als „keiner Seite zugeordnet" gemeldet. Aktuell 0 solche Dateien (`git ls-files | grep -c '|'` = 0), daher kein Ist-Defekt; ein fail-closed-Zweig (Zeile mit `|` → Fehler) würde die Lücke schließen.
- [ ] `scripts/checks/ownership-check.sh:17` Kopfkommentar/`set -euo pipefail` weicht vom Schwester-Skript `adr-links-check.sh` (`set -uo pipefail`) ab. Beides funktioniert (awk-Exit wird bewusst durchgereicht); nur Konsistenzhinweis.
- [ ] `docs/specs/spec-426-trennlinie-factory-projekt-ziehen.md` AK-Checkboxen stehen alle auf `[ ]`, der Stand der Umsetzung steht in der Task-Datei. Falls Spec-AK abgehakt werden sollen, im Abschluss-Schritt nachziehen; sonst ignorieren.
- [ ] AK-A4 nennt `.claude/settings.project.json`, `.gitignore.project`, `scripts/project/**` als `project`. Diese Pfade existieren erst nach #431/#432; der Übergangshinweis in `OWNERSHIP.md` deckt das ab. Beim Anlegen der Dateien dort die Zeilen mitziehen (der Check erzwingt es ohnehin).

## Positives
- Ein einziger Parser für die Zuordnung (`--list factory` = T1b-Allowlist), fail-closed bei leerer/unlesbarer Tabelle und Dateiliste; „fehlt" und „doppelt" werden getrennt gemeldet, jede Datei namentlich.
- Doppelt abgesichert: lokal in `pre-push.sh` (Check 6a) **und** über die bestehende Self-Test-Suite in CI – kein neuer Required-Check-Name (AK-A6/X2).
- Verlustfreie Lessons-Trennung belegt durch Manifest-Fixture (175 Einträge) + Rekonstruktions-Assertion (Lesson #196), Index/Kern-Kurzregeln/Präambeln nachgezogen.
- ADR-Umzug per `git mv` mit repo-weitem Link-Check (`adr-links-check.sh`), Patch-Dateien bewusst ausgenommen; `Factory-ADR-NNN` nur in aktiven Projekt-Dateien, Archiv unverändert (AK-B5).
- `.claude/**` korrekt über den Patch-Workflow geliefert; Tests prüfen den Endzustand der Live-Dateien (Lesson #212).
- Verhaltensneutral: kein App-Code berührt, @import-Deckel eingehalten.

## Empfehlung
APPROVED
