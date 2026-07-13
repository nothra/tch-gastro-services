# Task 94: pr-shepherd-gh-verb-liste-um-gh-pr-ready-ergaenzen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Beim Live-Lauf von Task #91 (PR_SHEPHERD=true) blieb `/pr-shepherd` in Schritt 6 stecken:
der PR (#92) war noch **Draft**, `gh pr merge --auto` schlägt darauf fehl bzw. `pr-shepherd`
konnte den Draft-Status nicht selbst auflösen. `.claude/commands/pr-shepherd.md` hat dafür
**gar keinen Schritt** – es geht direkt von „Zustand erfassen" zu Review-Kommentaren/Rebase/CI/
Approval/Merge, ohne `isDraft` je zu prüfen. Der Agent erkannte das Problem selbst und fragte
den Menschen nach `gh pr ready 92` – aber dieses Verb war weder im Skill dokumentiert noch in
`.claude/settings.json` freigegeben (dortige Liste: `gh pr view|checks|update-branch|merge`,
`gh run list|rerun` – exakt das, was Task #91 als „genutzte gh-Verben" gegen `pr-shepherd.md`
geprüft hatte; `gh pr ready` fehlte schlicht, weil es zu diesem Zeitpunkt nicht im Skill stand).

Zwei Änderungen nötig:
1. **`.claude/commands/pr-shepherd.md`**: neuer Schritt (vor Schritt 6 „Auto-Merge freigeben",
   z. B. als Schritt 5b) prüft `gh pr view --json isDraft` und ruft bei `true` `gh pr ready`
   auf, bevor Auto-Merge versucht wird.
2. **`.claude/settings.json`**: `"Bash(gh pr ready:*)"` zur `allow`-Liste ergänzen (analog zu den
   anderen `gh pr *`-Verben) – sonst bleibt der neue Skill-Schritt wirkungslos.

Änderung #2 betrifft `.claude/**` und ist damit für einen Agenten **hard denied** (bewusste
#88-Grenze) – erwarteter Blocker, löst denselben **Patch-Workflow** aus, der in Task #91 codifiziert
wurde (`docs/factory/PROJECT-CONTEXT.md` → „`.claude/**`-Änderungen erfordern Patch-Workflow").

> Kanonische Quelle für den Vorfall: PR #92 / Task #91 (Live-Lauf 2026-07-13).

## Akzeptanzkriterien
- [ ] GIVEN ein PR ist `isDraft: true`, WHEN `/pr-shepherd` läuft, THEN wird `gh pr ready` vor dem
      Auto-Merge-Versuch aufgerufen (kein manueller Human-Nachfrage-Loop mehr nötig).
- [ ] GIVEN ein PR ist bereits `isDraft: false`, WHEN `/pr-shepherd` läuft, THEN wird `gh pr ready`
      nicht unnötig aufgerufen (kein Fehler bei bereits-ready PRs).
- [ ] GIVEN `.claude/settings.json`, WHEN geprüft, THEN enthält die `allow`-Liste
      `"Bash(gh pr ready:*)"`; `deny` (`.claude/**`, `.env*`) bleibt unverändert; kein
      pauschales `Bash(gh *)`.
- [ ] GIVEN Stage-3-Sub-Agent (`/pr-shepherd`, `FACTORY_STAGE=3`), WHEN er `gh pr ready` ausführt,
      THEN ohne Permission-Prompt/Interrupt (Verb ist freigegeben).
- [ ] Self-Test in `scripts/checks/tests/run-tests.sh`: `gh pr ready` ist Teil der dokumentierten
      Verbliste in `pr-shepherd.md` UND der `allow`-Liste (Konsistenz-Check, analog zu den
      bestehenden #91-Permissions-Tests) – bleibt grün.

## Technische Notizen
- Betroffene Artefakte: `.claude/commands/pr-shepherd.md`, `.claude/settings.json`,
  `scripts/checks/tests/run-tests.sh`.
- `.claude/**`-Edits kann der Agent nicht selbst schreiben → als Patch-Datei
  (`tasks/patch-94.diff`, via `git diff`) liefern, Blocker in dieser Task-Datei protokollieren,
  Mensch wendet `git apply` an und erteilt danach ggf. einen expliziten Bash-Grant.
- Kein ADR nötig – additive Config-/Doku-Änderung, kein Architektur- oder Technologie-Trigger.

## Offene Fragen
- [ ] Soll `pr-shepherd` bei `isDraft` generell zuerst ready machen, oder nur wenn alle anderen
      Gates (Review/Rebase/CI/Approval) schon grün sind? (Aktuell vorgeschlagen: erst kurz vor
      Schritt 6, um ein PR nicht vorzeitig aus dem Draft zu holen, falls CI/Review noch rot ist.)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/94-pr-shepherd-gh-verb-liste-um-gh-pr-ready-ergaenzen`
Erstellt: 2026-07-13 07:52
