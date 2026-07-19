# Task 155: adr-branch-protection-main-ruleset

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

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
- [ ] GIVEN die Entscheidung ist getroffen WHEN `docs/adr/029-branch-protection-main-ruleset.md`
      vorliegt THEN enthält es Status `Accepted`, Kontext, Entscheidung, ≥ 2 Alternativen je
      Teilfrage, Begründung, Konsequenzen und die reproduzierbare Ruleset-JSON.
- [ ] GIVEN der Leser will den Live-Stand prüfen WHEN er dem ADR folgt THEN findet er den
      `gh api`-Verifikationsbefehl, dessen Ausgabe zur eingebetteten Config passt
      (`strict:false`, 5 Checks, `merge:["squash"]`, `bypass:0`, `enforcement:active`).
- [ ] GIVEN die „kanonische Quellen referenzieren"-Regel WHEN `git-workflow.md` den
      main-Schutz erwähnt THEN verweist es auf ADR-029 (der pre-push-Hook wird als lokales
      Feedback, das Ruleset als server-seitige Durchsetzung eingeordnet).
- [ ] GIVEN die #120-Regel (Branch-Typ ↔ Scope) WHEN feststeht, dass die Task docs-only ist
      THEN sind Branch (`docs/155-…`) und Label (`documentation`) entsprechend gesetzt.

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

**Scope-/Branch-Hinweis (#120-Regel):** Die Task ist nach dieser Architektur-Runde
eindeutig **docs-only** (ADR + Doku-Querverweise, kein Produktionscode). Branch-Typ und
Label vor `/implement` auf `docs/` bzw. `documentation` umstellen:
```bash
git branch -m feature/155-adr-branch-protection-main-ruleset docs/155-adr-branch-protection-main-ruleset
git push origin -u docs/155-adr-branch-protection-main-ruleset
git push origin --delete feature/155-adr-branch-protection-main-ruleset
gh issue edit 155 --add-label documentation --remove-label enhancement
```
PR-Body (#156) und diese Task-Datei spiegeln den neuen Branch-Namen.

## Offene Fragen
_Keine._ Die Speicherungsfrage (IaC vs. dokumentiert) ist in ADR-029 zugunsten der
dokumentierten Variante (YAGNI) entschieden.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/155-adr-branch-protection-main-ruleset`
Erstellt: 2026-07-19 07:01
