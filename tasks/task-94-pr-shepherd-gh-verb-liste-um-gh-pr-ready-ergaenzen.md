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

## Architektur-Entscheidung (/architecture, 2026-07-13)

### Technische Analyse
Kein neues Modul, kein Datenmodell, keine neue Abhängigkeit. Es geht um zwei Dinge:
1. **Ein fehlender Schritt im Ablauf** von `pr-shepherd.md`: der von `start-work.sh --draft`
   angelegte PR wird nie aus dem Draft geholt. `gh pr merge --auto` **kann auf einem Draft-PR
   nicht aktiviert werden** (GitHub lehnt Auto-Merge/Merge für Drafts ab) → Schritt 6 lief tot.
2. **Ein fehlendes Verb in der Permission-Fläche**: `Bash(gh pr ready:*)` fehlt in
   `.claude/settings.json` → der neue Schritt würde in Stage 3 einen Interrupt statt einer
   Merge-Freigabe erzeugen.

### Kein neuer ADR – Anwendung von ADR-019 §3
ADR-019 §3 hat die Design-Entscheidung „granulare `gh`-Verben, **nur tatsächlich genutzte**,
**kein** `Bash(gh *)`" bereits getroffen. Diese Task **fügt einen genutzten Verb hinzu** – das ist
die **Anwendung** dieser Entscheidung, keine **Abweichung** davon. ADR-019 hat den Fall sogar
explizit als Trade-off vorweggenommen: *„Granulare `gh`-Freigabe muss gepflegt werden, wenn
`pr-shepherd` neue `gh`-Verben nutzt."* → **kein ADR-020**. ADR-019 selbst wird **nicht** editiert
(Accepted; die Verb-Liste ist kein „living document" in der ADR, sondern lebt in
`settings.json` + `pr-shepherd.md`, abgesichert durch den Konsistenz-Test in `run-tests.sh`).

### Entscheidung zur offenen Frage: Un-Draft **spät**, als Schritt 5b (vor Schritt 6)
`gh pr ready` wird **erst nach** Schritt 2–5 (Review-Konflikte, Rebase, CI grün, Approval)
aufgerufen – direkt vor der Auto-Merge-Freigabe, und **nur** wenn `gh pr view --json isDraft`
`true` liefert.

**Option A – spät un-draften (gewählt).**
Vorteile: Der PR verlässt den Draft nur, wenn er wirklich merge-reif ist; solange ein Gate rot
ist, bleibt „Draft" ein ehrliches WIP-/Aufmerksamkeits-Signal. Bricht ein früheres Gate per
Interrupt ab, **bleibt der PR Draft** (fail-closed, kein Draft der fälschlich merge-reif aussieht).
Un-Draft und Auto-Merge-Freigabe bilden einen zusammenhängenden „Release"-Schritt.
Nachteile: erforderliche Reviewer/CODEOWNERS werden erst spät angefragt – in dieser Factory
unkritisch, da Approval ohnehin in Schritt 5 geprüft wird und `gh pr merge --auto` server-seitig
weiter auf grüne Gates wartet.

**Option B – früh un-draften (Schritt 1, verworfen).**
Vorteile: Reviewer-Anfragen feuern früh (mehr Vorlauf); einfacheres mentales Modell.
Nachteile: Der PR verlässt den Draft, während CI evtl. rot / Rebase offen ist → widerspricht der
Draft=WIP-Semantik; ein später abbrechender Lauf hinterlässt einen Nicht-Draft-PR, der merge-reif
aussieht, es aber nicht ist; mehr Benachrichtigungs-Rauschen. Schwächere fail-closed-Haltung.

**Begründung:** Option A folgt den `pr-shepherd`-Regeln („Kein Schritt überspringen",
„Kein Auto-Merge, wenn CI rot oder Approval fehlt") und der Factory-Leitlinie **fail-closed nur
dort, wo es Korrektheit schützt**. Die Idempotenz-Guard (`isDraft`-Check) erfüllt AC2 (kein
unnötiger Aufruf) – `gh pr ready` selbst ist zwar idempotent, aber der Guard vermeidet Rauschen.

### Implementierungs-Hinweise für den Coding-Agenten
- **`pr-shepherd.md`** – neuer **Schritt 5b „Draft-Status auflösen"** zwischen Schritt 5
  (Approval) und Schritt 6 (Auto-Merge):
  ```bash
  # Nur un-draften, wenn nötig – gate-idempotent (AC1/AC2)
  if [ "$(gh pr view --json isDraft -q .isDraft)" = "true" ]; then
    gh pr ready            # Draft → ready for review, bevor Auto-Merge aktiviert wird
  fi
  ```
  Die Verb-Liste in der Skill-Doku muss `gh pr ready` sichtbar nennen (der `run-tests.sh`-Check
  grep-t darauf).
- **`.claude/settings.json`** – `"Bash(gh pr ready:*)"` in die `allow`-Liste, **direkt bei** den
  anderen `gh pr *`-Verben (Zeilen 45–48). `deny` (`.claude/**`, `.env*`) unverändert; kein
  Wildcard. → **Patch-Workflow** (hard denied für Agent, siehe Technische Notizen oben).
- **`scripts/checks/tests/run-tests.sh`** – bestehenden #91-Konsistenz-Block erweitern (dieser
  liegt in `scripts/` → vom Agenten direkt editierbar, **kein** Patch nötig):
  1. Die granulare-`gh`-Verben-Assertion um `grep -qF 'Bash(gh pr ready:*)' "$SETTINGS"` ergänzen.
  2. Neue Assertion: `pr-shepherd.md` dokumentiert `gh pr ready`
     (`grep -q 'gh pr ready' "$FACTORY_ROOT/.claude/commands/pr-shepherd.md"`).
  TDD: Assertions **zuerst** ergänzen (Red gegen aktuellen Stand), dann Skill-Doku + Patch (Green).
- **Portabilität:** nur POSIX (`grep -qF`), kein PCRE – `clean-code.md` „Portabilität in
  Gate-Skripten".

## Offene Fragen
- [x] Un-Draft-Zeitpunkt entschieden: **spät, als Schritt 5b vor Auto-Merge, gated hinter
      Schritt 2–5** (Option A oben). Erledigt via /architecture 2026-07-13.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/94-pr-shepherd-gh-verb-liste-um-gh-pr-ready-ergaenzen`
Erstellt: 2026-07-13 07:52
