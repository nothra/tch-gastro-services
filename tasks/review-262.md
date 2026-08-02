# Review: Task 262

Diff-Scope: `git diff origin/main...HEAD` (8 Dateien) – `scripts/checks/commit-msg-check.sh` (neu),
`scripts/install-hooks.sh` (neu), `scripts/factory-commit.sh`, `scripts/init-factory.sh`,
`scripts/checks/tests/run-tests.sh`, ADR-042, Spec, Task-Datei.
Drei Runden: (1) Korrektheit/Edge Cases, (2) Clean Code & Testqualität, (3) Architektur/ADR/Doku.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle Akzeptanzkriterien AK1–AK8 und beide Fehlerszenarien sind implementiert;
das Verhalten der Guards ist korrekt (exakter Trim-Vergleich, kein zu breites Matching,
`-h`/`--help`-Guard vor der Argumentprüfung in `factory-commit.sh`).

## Wichtige Findings (sollten behoben werden)

- [ ] [scripts/install-hooks.sh:26-40] **`core.hooksPath` wird ignoriert – Installer meldet
      Erfolg, obwohl die Hooks inert sind.** Das Skript schreibt immer nach
      `$(git rev-parse --git-common-dir)/hooks` und gibt „Git-Hooks aktuell" aus. Ist in einem
      Repo `core.hooksPath` gesetzt (in Next.js-Projekten häufig, z. B. husky), führt Git
      **ausschließlich** die Hooks aus diesem Pfad aus – der `commit-msg`-Guard wäre installiert,
      aber wirkungslos, und das Repo hielte sich für geschützt. Das widerspricht dem im
      Datei-Header dokumentierten Fail-closed-Anspruch („damit ein fehlgeschlagenes Retrofit
      nicht als ‚Hooks aktiv' durchgeht"). Betroffen ist v. a. der Template-Pfad über
      `init-factory.sh` (dieses Repo selbst setzt `core.hooksPath` nicht).
      → `git -C "$REPO_DIR" config --get core.hooksPath` auswerten: entweder dorthin installieren
      oder fail-closed abbrechen mit klarer Meldung.

- [ ] [scripts/checks/tests/run-tests.sh:1893-1927] **Fehlerszenario 2 der Spec ist auf der
      `factory-commit.sh`-Seite ungetestet.** Die Spec fordert „leere Commit-Message → bestehende
      Leer-Prüfung bleibt unverändert wirksam (kein Duplikat, keine Regression)". Getestet ist nur
      die Hook-Seite (`commit-msg-check` lässt eine leere Message durch) und der Fall **ohne**
      Argument (`bash "$FCOMMIT"`, Fall 5 von #91). Ein Aufruf mit **leerem String**
      (`bash "$FCOMMIT" ""` → `[ -z "${1:-}" ]`, `factory-commit.sh:53`) existiert in der Suite
      nicht – ausgerechnet dieser Zweig steht jetzt direkt hinter dem neuen `-h|--help`-Guard.
      Eine spätere Umstellung des Argument-Parsings (Schleife über `-*`, `shift`) würde ihn
      lautlos aushebeln. → Testfall ergänzen: `""` → exit ≠ 0 + pfadspezifische Meldung
      („genau ein Argument erwartet"), nichts committet.

- [ ] [docs/factory/guidelines/git-workflow.md / CLAUDE.md:141-145 / docs/factory/OPERATING.md:426]
      **Neues Gate und neuer kanonischer Installationsweg sind in keiner gelesenen Doku
      erwähnt.** `install-hooks.sh` und der `commit-msg`-Hook kommen ausschließlich in ADR-042,
      `spec-262` und der Task-Datei vor (verifiziert per Repo-Grep). Die Stellen, die die lokalen
      Gates beschreiben („Nie committen ohne `pre-commit.sh`", „der pre-push Hook erzwingt …"),
      kennen den dritten Hook nicht, und ein frischer Clone erfährt nirgends, dass
      `bash scripts/install-hooks.sh` zu laufen hat. Das ist genau das Muster aus den
      Lessons #211/#176 (PR ändert die von Doku/ADR beschriebene Mechanik → dieselbe Prosa im
      selben PR nachziehen). Zusätzlich lebt der Merge-Nachlauf („einmalig manuell ausführen")
      nur in `tasks/task-262-…md`, die nach dem Merge praktisch nicht mehr gelesen wird.
      → Ein Satz in CLAUDE.md → Guardrails und in `git-workflow.md` (Hook-Installation/Retrofit
      via `scripts/install-hooks.sh`, `commit-msg`-Gate).

- [ ] [scripts/install-hooks.sh:53 (erzeugter `commit-msg`-Hook)] **Repo-weiter Hook + Branches
      ohne das Prüfskript = blockierte Commits.** Der Hook ruft `bash scripts/checks/commit-msg-check.sh "$1"`
      über einen relativen Pfad auf und gilt dank gemeinsamem `.git`-Verzeichnis sofort für **alle**
      Worktrees/Branches. Auf jedem Branch, der die Datei (noch) nicht enthält – parallele
      In-Flight-Worktrees, die vor dem Merge von #262 angelegt wurden, `git bisect`, ältere
      Feature-Branches – endet der Hook mit `No such file or directory` (exit 127) und **jeder
      Commit dort ist blockiert**, mit kryptischer Meldung. `pre-commit`/`pre-push` haben dieses
      Problem nicht, weil ihre Skripte seit dem Bootstrap 2026-07-08 auf allen Branches liegen.
      Da CLAUDE.md parallele Worktrees ausdrücklich vorschreibt, ist das ein realistischer Fall.
      → Entweder den Hook auf ein fehlendes Skript tolerant machen (`[ -f … ] || exit 0`, bewusste
      Fail-open-Ausnahme nur für den Nicht-vorhanden-Fall) **oder** in ADR-042 §Consequences +
      der Doku-Zeile oben explizit festhalten: Retrofit erst nach dem Merge, laufende Worktrees
      vorher auf `main` rebasen.

- [ ] [tasks/task-262-flag-guard-commit-message.md:74-76] **Das angekündigte Out-of-Scope-Issue
      existiert nicht.** Die Gate-Verifikation schließt mit „Härtung … ist out of scope für #262
      → eigenes Issue", aber `gh issue list` (open, alle offenen Issues geprüft) enthält keinen
      passenden Eintrag – der Befund (E2E-Block erbt `PR_SHEPHERD`/`FACTORY_STAGE` aus der
      Umgebung) würde damit verloren gehen. Anlage über den Seam war in dieser Review-Session
      durch den Permission-Classifier blockiert (Verkettung `. scripts/lib/create-issue.sh && …`).
      → Issue nachziehen (`enhancement` + `test`,`tech-debt`) und die Nummer in der Task-Datei
      referenzieren.

## Nitpicks (optional)

- [ ] [scripts/install-hooks.sh:41-48] Bestehende **fremde** Hooks werden ohne Warnung und ohne
      Backup überschrieben (für Factory-Hooks gewollt und getestet, für einen manuell angelegten
      oder von einem Tool erzeugten Hook aber stiller Verlust). Mindestens eine Zeile Hinweis in
      der Ausgabe, wenn eine vorhandene Datei ersetzt wurde.
- [ ] [scripts/checks/commit-msg-check.sh / scripts/install-hooks.sh] Beide neuen Dateien sind
      im Index `100644`, während alle übrigen `scripts/checks/*.sh` und die Einstiegsskripte
      (`init-factory.sh`, `start-work.sh`, …) `100755` sind. Funktional egal (Aufruf immer über
      `bash …`), aber inkonsistent zu den direkten Nachbarn.
- [ ] [scripts/install-hooks.sh:44] `hook_file="$HOOKS_DIR/$1"` nutzt `$1`, obwohl `hook_name` in
      derselben `local`-Zeile schon dafür steht – `"$HOOKS_DIR/$hook_name"` ist eindeutiger.
- [ ] [scripts/init-factory.sh:82-85] Jeder Nicht-Null-Exit von `install-hooks.sh` wird als „Kein
      git-Repository gefunden" ausgegeben, obwohl das Skript die echte Ursache bereits präzise auf
      stderr meldet (z. B. `mkdir`-Fehler). Neutraler formulieren („Hook-Installation
      fehlgeschlagen – siehe Meldung oben") und den Retrofit-Hinweis behalten.
- [ ] [scripts/checks/tests/run-tests.sh:3566-3567] Der AK8-Negativtest
      (`grep -qF '.git/hooks'` darf **nicht** treffen) ist fail-open: wäre `init-factory.sh`
      unlesbar oder verschoben, liefert `grep` ebenfalls ≠ 0 und die Assertion würde grün.
      Lesson #214 („Kopplungs-/Drift-Guard … Fail-closed bei unlesbarer Quelle") →
      Lesbarkeits-Vorbedingung (`[ -r "$INIT_FACTORY" ]`) davorsetzen.
- [ ] [scripts/checks/tests/run-tests.sh:1915-1916] `--help extra` prüft nur `exit ≠ 0`, ohne das
      pfadspezifische Signal („genau ein Argument erwartet"). Deterministisch ist es zwar (die
      Argumentzahl-Prüfung greift zuerst), und es folgt der Konvention der älteren #91-Fälle – die
      neuen E2E-Fälle im selben Block assertieren die Ursache aber bereits mit `grep -qF`.
- [ ] [scripts/checks/tests/run-tests.sh:3402, 3415] `for case in "${cm_pass_cases[@]}"` nutzt das
      Bash-Schlüsselwort `case` als Schleifenvariable. Läuft, liest sich aber irritierend –
      `cm_case` wäre klarer.
- [ ] [docs/adr/042-hook-installation-single-source.md:13] Der `-h|--help`-Guard in
      `factory-commit.sh` wird als „bereits existierend" beschrieben, obwohl er erst mit diesem PR
      entsteht (Spec listet ihn unter „Inbegriffen"). Für spätere Leser irreführend.

## Positives

- **Guard-Design trifft die Grenze genau:** exakter Vergleich des getrimmten Inhalts statt Regex –
  keine BSD/GNU-Portabilitätsfalle (`clean-code.md` → „Portabilität in Gate-Skripten"), und die
  Abgrenzung gegen `-x`/`-refactor: …`/`--help` im Fließtext ist auf **beiden** Seiten (Hook und
  `factory-commit.sh`) explizit getestet, nicht nur behauptet.
- **Fail-closed konsequent** in `commit-msg-check.sh`: fehlendes Argument, leeres Argument, nicht
  existierende und (bedingt, mit sauberem Skip für root) nicht lesbare Message-Datei – je ein Test.
- **Echte Verhaltenstests statt Wiring-Greps:** der `commit-msg`-Pfad wird end-to-end über ein
  reales `git commit` im Wegwerf-Repo geprüft, inklusive pfadspezifischem Ablehnungssignal
  („sieht aus wie ein CLI-Flag") – genau die Lesson aus #212/#214 angewandt. Die bewusste
  Neutralisierung des `pre-commit`-Hooks im Testrepo ist kommentiert und begründet.
- **Idempotenz belegt statt angenommen:** Hook-Inhalte werden vor/nach dem zweiten Lauf verglichen,
  zusätzlich Retrofit über einen veralteten Hook-Stand und der Kein-git-Repo-Fall (fail-closed).
- **Worktree-Annahme aus ADR-042 ist verifiziert**, nicht nur beschrieben (Installation aus einem
  Linked Worktree landet im gemeinsamen `.git`).
- **Kein Over-Engineering:** ADR-042 begründet ausdrücklich, warum die zwei Flag-Literale *nicht*
  in eine gemeinsame Quelle extrahiert werden; AK5 verzichtet korrekt auf eine zweite
  Happy-Path-Schleife und stützt sich auf den bestehenden #91-Fall 1 (Lesson #240/#251).
- ADR-042 hat Status `Accepted`, echte Alternativen (A/B/C) mit Trade-offs und benennt die
  Negativfolge (manueller Retrofit-Schritt) offen.

## Empfehlung

NEEDS_REWORK

Kein kritischer Defekt – das gelieferte Verhalten stimmt. Nachzuarbeiten sind: die Fail-open-Lücke
des Installers bei `core.hooksPath`, der fehlende Test für die leere Message auf der
`factory-commit.sh`-Seite, die Doku-Nachführung (CLAUDE.md/`git-workflow.md`) für Gate + Installer,
die Absicherung/Dokumentation des repo-weiten Hooks gegenüber Branches ohne Prüfskript sowie das
angekündigte, aber nicht angelegte Out-of-Scope-Issue.
