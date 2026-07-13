# Review: Task 91

## Kritische Findings (müssen behoben werden)
_(keine)_

## Wichtige Findings (sollten behoben werden)
- [ ] [scripts/run-pipeline.sh:239-246] **Report-Guard kann einen veralteten Verdict aus einem
      früheren Lauf als Erfolg werten (fail-open).** Der Guard liest bei jedem non-zero Exit
      `tasks/review-<id>.md` / `security-<id>.md` und wertet als Erfolg, sobald ein gültiger
      Verdict drinsteht – ohne zu prüfen, ob der Report **in diesem Lauf** entstand. Diese Dateien
      sind versioniert (`git ls-files tasks/` zeigt `review-48.md` u.a.) und der Preflight bereinigt
      nur den INTERRUPT-Sentinel (`run-pipeline.sh:164-167`), **nicht** die Reports. Failure-Szenario:
      Pipeline wird auf einem Branch **erneut** gestartet, auf dem `review-91.md` bereits mit
      `APPROVED` committet ist; die `claude`-Session für `/review` bricht im 1. Versuch non-zero ab
      (Auth-/Rate-Limit-/Crash – nicht „max turns nach fertigem Report"). Der Guard liest den
      **alten** `APPROVED`, gibt sofort `return 0` (ohne Retry), Phase 2 grep't erneut `APPROVED` →
      die Pipeline läuft weiter, obwohl in diesem Lauf **kein** Review stattfand und der Code sich seit
      dem alten Approval geändert haben kann. Das widerspricht dem in Spec/ADR-019 §4 verankerten
      Guard-Zweck („damit ein halbfertiger Report nicht fälschlich als Erfolg zählt", fail-closed).
      Empfehlung (eine genügt): (a) Report-Datei im Preflight für die aktuelle Task entfernen – analog
      zum Stale-Sentinel; oder (b) Existenz/Content-Hash/mtime der Report-Datei **vor** dem
      `claude`-Aufruf merken und den Verdict nur honorieren, wenn er sich verändert hat.
      _(Bewusstes Akzeptieren mit kurzer Begründung im ADR ist auch ein valider Abschluss – dann
      bitte explizit dokumentieren.)_

## Nitpicks (optional)
- [ ] [scripts/factory-commit.sh:60] `git add -A` stagt **alles** im Arbeitsbaum. Falls ein Skill
      Nebenartefakte hinterlässt (z. B. einen `tasks/INTERRUPT-<id>.md`-Sentinel oder nicht
      ignorierte Zwischendateien), landen sie ungewollt im Commit. Im Scope („commit + push des
      Feature-Branches") vertretbar; ggf. später auf gezielteres Staging eingrenzen.
- [ ] [scripts/factory-commit.sh:44,51] Kein-git-Repo und detached HEAD teilen sich Exit 3. Die
      Meldungen sind klar unterscheidbar, aber getrennte Codes würden die Diagnose in Logs
      erleichtern. Rein kosmetisch.
- [ ] [scripts/lib/report-verdict.sh:35] Trifft ein Report den literalen Template-Rest
      `APPROVED | NEEDS_REWORK` in einer Zeile, liefert `grep -oE … | tail -1` `NEEDS_REWORK`
      (letzter Treffer). Verhalten identisch zum bisherigen `pipeline_summary()` – kein Regress,
      nur als bekannte Eigenheit vermerkt.

## Positives
- **Sauber gegen ADR-019 gebaut:** Seam statt breiter git-Permission-Fläche (§1), read-only-git +
  granulare `gh`-Verben ohne Wildcard (§2/§3), geteilter Verdict-Helper für Guard **und**
  `pipeline_summary()` (§4, kein Drift), Budget-Puffer mit `@reason` (§5).
- **`gh`-Verbliste verifiziert vollständig:** die 6 freigegebenen Verben decken sich exakt mit
  `grep 'gh (pr|run)' .claude/commands/pr-shepherd.md` – offene Frage 2 korrekt geschlossen, kein
  überflüssiges Verb.
- **`factory-commit.sh` konsequent fail-closed:** main/master, `--force`/Zusatz-Args, kein Repo,
  detached HEAD, Push-Fehler weitergereicht (kein stiller „committed, nicht gepusht"); „nichts zu
  committen" = Exit 0 (robust, kein Pipeline-Abbruch). stdout/stderr-Hygiene beachtet.
- **Guard fail-closed für den No-Verdict-Fall** und **nur** für die zwei Report-Skills; alle anderen
  Skills behalten `non-zero = Fehlversuch`. `interrupt-check.sh` läuft auch nach dem tolerierten
  Abbruch (kein stiller Übergang).
- **Portabilität eingehalten:** POSIX-Regex (`grep -oE`), `grep -F --`/Integer-Guards, pipefail
  korrekt mit `|| true` geschluckt.
- **Testabdeckung breit & real:** Wrapper über echtes git + Bare-Remote (Happy-Path, main/master,
  leer, fehlende Message, Zusatz-Arg, kein Repo, detached, Push-Fehler); Guard-Helper (Verdict da →
  erkannt, ohne → leer, Nicht-Report-Skill, letzter gewinnt); Permissions- & Skill-Doku-Konsistenz.
  Die Copy-in-Temp-Regression (fehlende `report-verdict.sh` in 3 Testaufbauten) sauber gefixt.
- 254 grün / 0 rot.

## Empfehlung
APPROVED

> Kernscope (Lücke 1 + 2) vollständig, tests grün, ADR-019 exakt umgesetzt, `gh`-Verbliste
> verifiziert. Das eine wichtige Finding (Stale-Report-Guard, `run-pipeline.sh:239`) ist ein
> konditionaler Fail-open-Pfad – kein Merge-Blocker im ersten Lauf, aber vor breiterem
> Wiederholungs-Einsatz der Pipeline zu beheben **oder** bewusst im ADR zu akzeptieren.
