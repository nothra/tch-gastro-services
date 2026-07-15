# Task 114: abschlussnotiz-vor-merge

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`/pr-shepherd` Schritt 6 dokumentiert die Abschlussnotiz **nach** `gh pr merge --auto --squash`
und weist **nicht** an, sie zuvor zu **committen + pushen**. Bei unserer Squash-Merge-Strategie
landet eine nur lokal geschriebene Notiz dadurch **nie auf `main`** – nach dem Merge liegt die
Task-Datei auf `main` und ließe sich nur noch über einen neuen PR ändern (Direkt-Commit verboten).
Genau die „rechtzeitig"-Falle aus #112.

Zwei Änderungen:
1. **`.claude/commands/pr-shepherd.md`** Schritt 6 umordnen:
   (a) Abschlussnotiz in die Task-Datei schreiben →
   (b) **committen + pushen** auf dem Feature-Branch via `scripts/factory-commit.sh`
       (der mandatierte Commit/Push-Seam, ADR-019 – deckt commit **und** push ab) →
   (c) **erst dann** `gh pr merge --auto --squash`.
2. **`docs/factory/PROJECT-CONTEXT.md`**: Codify-Regel „Notiz-vor-Merge bei Squash-Strategie".

`.claude/commands/**` ist für den Agenten **hard denied** (#88-Grenze) → **Patch-Workflow**
(`tasks/patch-114.diff`, `git apply`), siehe CLAUDE.md „`.claude/**`-Änderungen erfordern
Patch-Workflow" (#91/#94). Der Test-Guard in `scripts/checks/tests/run-tests.sh` liegt in
`scripts/` und ist direkt editierbar.

> Kanonische Quelle: Issue #114; Vorfall bei #112.

## Akzeptanzkriterien
- [x] GIVEN `/pr-shepherd` Schritt 6, WHEN der Agent die Abschlussnotiz schreibt, THEN wird sie
      per `scripts/factory-commit.sh` committet **und** gepusht, **bevor** Auto-Merge freigegeben
      wird. → `pr-shepherd.md` nennt `factory-commit.sh`.
- [x] GIVEN die Reihenfolge in Schritt 6, WHEN geprüft, THEN steht der commit+push-Schritt
      (`factory-commit.sh`) **vor** `gh pr merge --auto` (Zeilen-Reihenfolge). → Ordering-Assertion.
- [x] GIVEN `docs/factory/PROJECT-CONTEXT.md`, WHEN geprüft, THEN existiert eine Regel
      „Notiz-vor-Merge bei Squash-Strategie". → Codify-Abschnitt ergänzt.
- [x] Self-Test in `scripts/checks/tests/run-tests.sh` (analog #94): beide `pr-shepherd.md`-Grep-
      Assertions grün, `pnpm test`/Gates bleiben grün.

## Technische Notizen
- Betroffene Artefakte: `.claude/commands/pr-shepherd.md` (Patch), `docs/factory/PROJECT-CONTEXT.md`
  (direkt), `scripts/checks/tests/run-tests.sh` (direkt).
- Kein neues Verhalten im Produktcode – reine Prozess-/Doku-Härtung. **Kein ADR-Trigger**
  (keine Technologiewahl/Architekturmuster/Schnittstellen-Vertrag/irreversible Konsequenz).
- `factory-commit.sh` kapselt `git add -A → git commit → git push` (ADR-019) → deckt „committen
  **und** pushen" ab; kein rohes `git commit`/`git push` im Skill.

## Offene Fragen
<!-- keine -->

## Implementierungs-Notizen (/implement 2026-07-15)

TDD Red → Green umgesetzt (analog #94):

- **RED:** Zwei Assertions in `scripts/checks/tests/run-tests.sh` (nach dem #94-Block) ergänzt:
  (1) `pr-shepherd.md` nennt `factory-commit.sh`; (2) Reihenfolge – `factory-commit.sh` steht
  **vor** dem Freigabe-Kommando `gh pr merge --auto --squash`. Beide schlagen gegen den
  Ist-Stand fehl → **281 grün, 2 rot**.
  - Fallstrick dabei behoben: Die Reihenfolge-Assertion darf **nicht** gegen `gh pr merge --auto`
    prüfen – diese kürzere Form kommt schon in Schritt 4 als **Prosa-Verweis** (Zeile 68) vor.
    Geprüft wird deshalb gegen die volle `gh pr merge --auto --squash`-Form (nur in Schritt 6).
- **GREEN (via Patch):** Die `.claude/commands/pr-shepherd.md`-Änderung liegt in
  `tasks/patch-114.diff` (Agent hard-denied auf `.claude/**`, #88 → Patch-Workflow). Schritt 6
  umgeordnet: (1) Notiz schreiben → (2) `bash scripts/factory-commit.sh` (commit **und** push,
  ADR-019) → (3) `gh pr merge --auto --squash`. Das Merge-Kommando + der Notiz-Text bleiben
  erhalten, nur die Reihenfolge/der commit-Schritt kommen hinzu.
- **Patch programmatisch erzeugt** (nicht von Hand getippt, #94-Regel): via `difflib.unified_diff`
  aus einer Temp-Kopie (Skript im Scratchpad, kein `.claude/**`-Write). Pfad-Header `a/.claude/…
  b/.claude/…`.
- **Verifikation ohne Schreibzugriff:** `git apply --check tasks/patch-114.diff` sauber; Patch auf
  Temp-Kopie angewendet → beide Assertions grün (factory-commit Zeile 119 < merge Zeile 123),
  `gh pr merge --auto --squash` weiterhin vorhanden.
- **PROJECT-CONTEXT.md:** Stolperstein „Notiz-vor-Merge bei Squash-Strategie (aus #114)" ergänzt.

**Erwarteter Endstand nach Patch-Apply:** 283 grün, 0 rot. Bis dahin ist die Suite bewusst 2 rot –
der Patch ist Teil dieser Lieferung. Lokale Gates (`pnpm lint`/`pnpm test`) unberührt (nur
Shell/Doku geändert); der Factory-Self-Test läuft in CI (`factory-ci.yml`).

**Blocker [2026-07-15]: GREEN-Schritt nicht vom Agenten abschließbar** – `.claude/commands/pr-shepherd.md`
ist hard denied (`Edit/Write(.claude/**)`, #88). Erforderliche Aktion des Menschen: im Worktree
`git apply tasks/patch-114.diff` ausführen (macht die 2 roten CI-Assertions grün), dann die
`.claude/**`-Änderung committen (bzw. dem Agenten dafür einen expliziten Bash-Grant erteilen).
Erst danach ist der Factory-Self-Test in CI vollständig grün und die Task abschließbar.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/114-abschlussnotiz-vor-merge`
Erstellt: 2026-07-15 16:20
