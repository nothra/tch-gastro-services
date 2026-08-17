# Review: Task 267

## Kritische Findings (müssen behoben werden)
Keine.

## Wichtige Findings (sollten behoben werden)
- [x] [docs/factory/guidelines/git-workflow.md:293 (vor Fix)] „Trotzdem gilt: **Jede neue Task
      dringend empfohlen in einer neuen Claude-Session starten.**" war grammatisch verunglückt –
      „dringend empfohlen" hing ohne tragendes Verb mitten im Imperativsatz. Gerade in der
      kanonischen Quelle dieser Regel (die dieser Task erst präzisiert hat) sollte der Kernsatz
      sauber lesbar sein. **Fix:** „Trotzdem gilt die **dringende Empfehlung**: Jede neue Task in
      einer neuen Claude-Session starten." Der AK7-Regressionstest in `run-tests.sh` hängt nicht
      an diesem exakten Wortlaut (er prüft Teilphrasen wie „kein technisches Gate"/„Grenze:" und
      die Ko-Präsenz von „Empfehlung" auf derselben Zeile wie die alte Wortfolge) – nach dem Fix
      weiterhin grün verifiziert (1062 grün/0 rot).

## Nitpicks (optional)
- [x] [scripts/start-work.sh:419 (vor Fix)] Der neue Hinweistext verwendete einen ASCII-Pfeil
      (`->`), während der Rest der `echo`-Ausgaben in dieser Datei durchgängig den Unicode-Pfeil
      `→` nutzt (z. B. Zeilen 157, 233, 258). **Fix:** auf `→` vereinheitlicht.

## Positives
- Alle Akzeptanzkriterien AK1–AK7 aus `docs/specs/spec-267-session-wechsel-empfehlung-praezisieren.md`
  sind gegen den tatsächlichen Diff verifiziert: `git-workflow.md` trennt Pflicht (Worktree) und
  Empfehlung (Session) explizit, nennt die start-work.sh/`/requirements`-Ausnahme und die
  Grenze (keine Folge-Task in derselben Session); `CLAUDE.md` und `OPERATING.md` sind
  widerspruchsfrei auf Empfehlung umformuliert und verweisen konsistent auf `git-workflow.md`
  als kanonische Quelle; `start-work.sh` begründet die Session-Empfehlung nicht mehr mit
  „kein geteilter HEAD" und trennt Worktree-Fakt/Session-Empfehlung in zwei Zeilen.
- Die Worktree-Pflicht bleibt inhaltlich unverändert „nicht verhandelbar" (F3 der Spec) – kein
  Kollateralschaden an der Git-Sicherheitsmaßnahme durch die Abschwächung der Session-Regel.
- Regressions-Guards in `run-tests.sh` folgen konsequent etablierten Mustern (`flat_286`/
  `assert_contains_286` für umbruchtolerante Markdown-Prosa-Checks statt zeilenweisem
  `grep -qF`, Wiederverwendung der `run_start_work`/gh-Stub-Fixtures aus dem #74/#236-Block) und
  liefern für jeden Guard (AK1–AK5) eine echte Mutations-/Negativ-Kontrolle, die den jeweils
  alten Wortlaut gegenprüft – kein Guard wäre bei einem Rückfall auf die alte Formulierung
  wortlos grün geblieben.
- AK5-Guard sitzt bewusst vor dem `TMP_SW`-Aufräumen (statt am Dateiende, wo die Fixtures längst
  entsorgt sind) – korrekt platziert, nicht nur behauptet richtig zu laufen.
- AK7-Guard nutzt ein Bash-Array statt eines space-getrennten Strings für die vier Zieldateien;
  ein String hätte den Worktree-Pfad dieses Repos (der selbst ein Leerzeichen enthält,
  `TCH Gastro Services.worktrees/…`) beim Word-Splitting zerrissen – im ersten Anlauf tatsächlich
  aufgetreten und korrekt behoben, nicht nur zufällig vermieden.
- Volle Testsuite (`scripts/checks/tests/run-tests.sh`) läuft grün: **1062 grün, 0 rot**;
  `pre-commit.sh` (Lint) und `pre-push.sh` (Vitest 687 grün, Typecheck, Prettier, Routen-Doku-
  Drift, Git-Hooks) ebenfalls grün. Keine Routen betroffen, `docs/routes.md` korrekt unverändert.
- Kein Drift in `docs/factory/lessons/`/`docs/adr/` gefunden (F4 der Spec): einziger Treffer zur
  Session-Terminologie ist eine unabhängige Kostenaussage in ADR-008, die die Ein-Task-eine-
  Session-Regel nicht betrifft.

## Empfehlung
APPROVED
