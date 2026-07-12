# Review: Task 66

_Multi-Persona-Review der Härtung „Secret-Prüfung im Deploy-Gate über `env:` statt inline
`${{ secrets.* }}`". Grundlage: `git diff` (Arbeitsbaum), `spec-66`, `task-66`, `deploy-gate.yml`,
`run-tests.sh`. Verifikation live ausgeführt: `run-tests.sh` = 219 grün / 0 rot; `yq`-Parse grün;
`grep` bestätigt keine inline-Secret-Referenz in einem `run:`-Block._

## Kritische Findings (müssen behoben werden)

- _Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] **Prozess / Git-Hygiene:** Die eigentliche Implementierung (`deploy-gate.yml`,
      `scripts/checks/tests/run-tests.sh`, Häkchen in `task-66.md`) liegt aktuell nur als
      **uncommitteter** Arbeitsbaum-Stand vor (Index `M`), nicht als Commit auf dem Branch.
      Vor PR/`/pr-shepherd` committen (`feat:`/`refactor:` – reine Härtung), sonst enthält der PR
      die Kernänderung nicht.
- [ ] **Rebase nötig (git-workflow.md):** `git diff main...HEAD` zeigt zusätzlich
      `.claude/settings.json` und `tasks/task-88-*.md` – Änderungen aus #88/#89, die bereits auf
      `main` gemergt sind. Der Branch setzt auf einem veralteten `main` auf. Vor dem PR
      `git fetch origin && git rebase origin/main`, damit der PR-Diff **allein** auf #66 beschränkt
      ist (kein Übersprechen fremder Tasks in den Review-/Merge-Umfang).

## Nitpicks (optional)

- [ ] **`deploy-gate.yml:64-68 / 101-105` – bewusste, akzeptable Duplikation:** `NEON_*` +
      `INT_DATABASE_URL` werden je Step im `env:`-Block wiederholt (statt wie `$BYPASS` einmal
      job-weit). Das ist **richtig so** (least privilege: Secrets nur im Step exponiert, der sie
      braucht) – nur als bewusste Abweichung vom `$BYPASS`-Muster festgehalten, kein Änderungsbedarf.
- [ ] **Vorbestehende Logik-Redundanz (out of scope):** Der Step `Secrets vorhanden?` behandelt
      `NEON_*`/`INT_DATABASE_URL` als **Pflicht** (`exit 1`), während `INT-Refresh aktiv?` sie als
      **optional** (skip + `::warning::`) behandelt – die Skip-Branch ist damit faktisch toter Pfad.
      Das ist **Bestandsverhalten** (durch ADR-017 so gewollt/erklärt in den Kommentaren, Header
      Zeile 12-14 nennt sie noch „Optional") und liegt außerhalb dieses reinen Härtungs-Tasks.
      → Nicht in diesem PR ändern; falls störend, eigenes Doku-/Klärungs-Issue.

## Positives

- **Akzeptanzkriterien vollständig erfüllt** – live verifiziert: kein `${{ secrets.* }}` in einem
  `run:`-Block mehr (nur noch in `env:`/job-level), Verhalten unverändert (gleiche `::error::`- und
  `::warning::`-Meldungen, gleiche `exit 1`-Fail-closed-Logik), YAML valide.
- **Vorbildliche Test-Absicherung des Gate-Regex** (clean-code.md → „Gate-Regex gehört durch einen
  Test abgesichert, Positiv- **und** Negativ-Beispiel"): Der `secrets_in_run`-Detektor hat eine
  Positiv-Kontrolle (inline in `run:` → Fund) **und** eine Negativ-Kontrolle (`env:` → kein Fund),
  plus die Prüfung gegen das echte Gate. Kein vacuously-grünes Gate.
- **POSIX-portabler awk-Detektor** (kein `\s`/`\d`, kein PCRE-Lookahead) – erfüllt die
  Portabilitätsregel für Gate-Skripte (macOS/BSD + CI). Der Indentation-Scope-Tracker
  (Block-Scalar über Einrückung verfolgen) ist korrekt: `env:` als Sibling schließt den `run:`-Block,
  Leerzeilen schließen ihn nicht.
- **Konsistent mit etabliertem Muster** – folgt exakt dem bereits im Gate genutzten `$BYPASS`-Vorbild
  und den übrigen Steps, die Secrets schon über `env:` lesen. Kommentare erklären das WHY
  (Actions-Script-Injection), nicht das WHAT.
- **Scope sauber eingehalten** – keine neuen Secrets, keine Umbenennung, keine Meldungsänderung;
  reine Härtung ohne Verhaltensänderung, wie in der Spec spezifiziert.

## Empfehlung

APPROVED

_Die beiden „Wichtigen Findings" sind reine Git-/Prozess-Schritte (committen + rebasen) vor dem PR –
keine Code-Nacharbeit. Inhaltlich ist die Härtung korrekt, vollständig getestet und scope-treu._
