# Task 155: adr-branch-protection-main-ruleset

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen (übersprungen – docs-only, kein Code-Smell)
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

PR-Shepherd 2026-07-19: Auto-Merge freigegeben – alle required Checks grün
(lint, test, issue-sync, factory-self-test, pr-closes-issue), keine Approvals nötig
(Ruleset: 0 Approvals), `mergeStateStatus: CLEAN`. PR #157.

## Beschreibung
Den bereits live gesetzten Schutz des `main`-Branch (GitHub Repository-Ruleset
`protect-main`, ID `19162920`) als Architekturentscheidung dokumentieren. Der Schutz war
zuvor nur lokal (`pre-push.sh` + Konvention) durchgesetzt und damit umgehbar; das Ruleset
setzt ihn server-seitig fail-closed durch, ohne den autonomen Auto-Merge der Factory oder
den parallelen Handbetrieb zu brechen.

Diese Task ist **reine Dokumentation** – die Ruleset-Config ist bereits per `gh api`
angewandt. Es entsteht kein Produktionscode und kein IaC-Tooling (Entscheidung siehe
[ADR-029](../docs/adr/029-branch-protection-main-ruleset.md), Option D1 / YAGNI).

## Akzeptanzkriterien
- [x] GIVEN die Entscheidung ist getroffen WHEN `docs/adr/029-branch-protection-main-ruleset.md`
      vorliegt THEN enthält es Status `Accepted`, Kontext, Entscheidung, ≥ 2 Alternativen je
      Teilfrage, Begründung, Konsequenzen und die reproduzierbare Ruleset-JSON.
- [x] GIVEN der Leser will den Live-Stand prüfen WHEN er dem ADR folgt THEN findet er den
      `gh api`-Verifikationsbefehl, dessen Ausgabe zur eingebetteten Config passt
      (`strict:false`, 5 Checks, `merge:["squash"]`, `bypass:0`, `enforcement:active`).
- [x] GIVEN die „kanonische Quellen referenzieren"-Regel WHEN `git-workflow.md` den
      main-Schutz erwähnt THEN verweist es auf ADR-029 (der pre-push-Hook wird als lokales
      Feedback, das Ruleset als server-seitige Durchsetzung eingeordnet).
      _Abgesichert durch den Self-Test-Guard `#155` in `scripts/checks/tests/run-tests.sh`
      (TDD: RED vor dem Verweis, GREEN danach)._
- [x] GIVEN die #120-Regel (Branch-Typ ↔ Scope) WHEN feststeht, dass die Task docs-only ist
      THEN sind Branch (`docs/155-…`) und Label (`documentation`) entsprechend gesetzt.
      _Erledigt 2026-07-19: Branch via GitHub-Rename-API umbenannt, Label gewechselt,
      PR #156 dadurch geschlossen → ersetzt durch #157._

## Technische Notizen
Von `/architecture` befüllt (2026-07-19):

**Entscheidung:** siehe [ADR-029](../docs/adr/029-branch-protection-main-ruleset.md).
Ruleset statt Classic Protection; 0 Approvals; squash-only; required Checks
`lint`/`test`/`issue-sync`/`factory-self-test`/`pr-closes-issue`; `strict:false`;
`gate`/`post-merge-verify` bewusst **nicht** required; keine Bypass-Actors.

**Für `/implement` (docs-only, kein Produktionscode):**
1. ADR-029 ist bereits geschrieben – im Review auf Vollständigkeit/Korrektheit prüfen.
2. **Kanonische-Quellen-Regel:** In `docs/factory/guidelines/git-workflow.md` (Abschnitt
   „Branches" / pre-push) einen Verweis auf ADR-029 ergänzen – der lokale Hook ist
   schnelles Feedback, das Ruleset die server-seitige, fail-closed Durchsetzung. Keine
   Duplizierung der Ruleset-Details, nur Referenz.
3. Prüfen, ob `CLAUDE.md` (Guardrail „Nie direkt auf main pushen") einen ADR-029-Verweis
   erhalten soll – knapp halten, kanonische Quelle bleibt der ADR.
4. **Keine** Ruleset-JSON-Datei ins Repo und **kein** Drift-Check-Skript (bewusst
   verworfen, ADR-029 Option D2). Wer das später doch will, braucht einen **neuen** ADR.

**Scope-/Branch-Hinweis (#120-Regel) — erledigt 2026-07-19:** Die Task ist docs-only
(ADR + Doku-Querverweise, kein Produktionscode). Branch-Typ und Label wurden auf `docs/`
bzw. `documentation` umgestellt. Weil PR #156 bereits offen war, erfolgte das Rename über
die **GitHub-Branch-Rename-API** (nicht delete+recreate). Lesson: die API retargetet einen
offenen PR hier **nicht** — #156 wurde geschlossen und durch **#157** ersetzt.
```bash
gh api -X POST repos/nothra/tch-gastro-services/branches/feature/155-…/rename -f new_name=docs/155-…
gh issue edit 155 --add-label documentation --remove-label enhancement
git -C <worktree> fetch -p && git -C <worktree> branch -m feature/155-… docs/155-… && git -C <worktree> branch -u origin/docs/155-…
```

## Offene Fragen
_Keine._ Die Speicherungsfrage (IaC vs. dokumentiert) ist in ADR-029 zugunsten der
dokumentierten Variante (YAGNI) entschieden.

## Implementierungs-Notizen (`/implement`, 2026-07-19)
- **ADR-029** geschrieben (bereits in der `/architecture`-Runde).
- **`git-workflow.md`**: Absatz nach „pre-push Hook blockiert …" ergänzt – lokaler Hook =
  Feedback, Ruleset `protect-main` = server-seitige, kanonische Durchsetzung (Verweis
  ADR-029).
- **`CLAUDE.md`** Guardrail „Nie pushen …" um denselben ADR-029-Verweis ergänzt
  (W-02/W-03: kanonische Quelle synchron referenziert, da die main-Push-Regel in beiden
  Dateien steht). Kein separater Guard – bewusst minimal.
- **Test (TDD):** Doc-Guard `#155` in `scripts/checks/tests/run-tests.sh` (Muster analog
  `bash-gotchas.md`/`create-issue.sh`), RED→GREEN belegt.
- **Kein Produktionscode**, keine Routen-/API-Änderung → Routen-Doku-Drift unberührt.

### Runde 2 (`/implement` nach Review, 2026-07-19)
- **Wichtig-Finding behoben:** zweite Guard-Assertion in `run-tests.sh` (`#155` AC3-Rationale)
  auf das distinktive Token `umgehbar` – prüft jetzt nicht nur den Verweis, sondern auch das
  Framing (Hook = lokal/umgehbar vs. Ruleset = server-seitig). Unabhängigkeit belegt
  (Framing entfernt → Rationale-Guard rot, Verweis-Guard grün; #117-Muster).
- **Nitpick behoben:** ADR-029-Verweis in `git-workflow.md` von Markdown-Link auf Plain-Text
  `(ADR-029)` umgestellt – konsistent mit der Datei-Konvention (`(ADR-013)`/`(ADR-018)`).
  CLAUDE.md-Link bleibt (dort ist der Link-Stil Datei-Konvention).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/155-adr-branch-protection-main-ruleset` (vormals `feature/155-…`, umbenannt 2026-07-19)
Erstellt: 2026-07-19 07:01
