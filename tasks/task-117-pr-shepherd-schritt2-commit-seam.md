# Task 117: pr-shepherd-schritt2-commit-seam

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`.claude/commands/pr-shepherd.md` **Schritt 2** (Review-Kommentare auflösen) stellt den
Review-Fix-Commit von rohem „committen" auf den mandatierten Commit/Push-Seam
`scripts/factory-commit.sh` um (ADR-019) – analog zu Schritt 6 (#114) und zu
`implement`/`test`/`refactor`. Rein Skill-Doku-Konsistenz (tech-debt), kein neues Verhalten.

Spec: `docs/specs/spec-117-pr-shepherd-schritt2-commit-seam.md`.

`.claude/**` ist für Agenten hard-denied → Umsetzung als Patch (`tasks/patch-117.diff`,
programmatisch erzeugt, `git apply --check` grün). Der Konsistenz-Test liegt unter `scripts/*`
und wird direkt editiert.

## Akzeptanzkriterien
<!-- Von /requirements befüllt; abgehakt in /implement -->
- [x] AC1: Schritt 2, Punkt 2 weist `bash scripts/factory-commit.sh "fix: address review comment – … (task-$ARGUMENTS)"` an – nicht rohes „committen"/`git commit`. (im Patch `tasks/patch-117.diff`)
- [x] AC2: kurze fail-closed-Begründung mit ADR-019-Verweis, konsistent zu implement/test/refactor. (im Patch)
- [x] AC3: Konsistenz-Guard in `scripts/checks/tests/run-tests.sh` prüft den **Schritt-2**-Seam-Verweis über den Zeilenbereich zwischen den Headern `### Schritt 2`/`### Schritt 3` (distinkt vom Schritt-6-Test; ein Treffer im falschen Abschnitt färbt nicht grün).
- [x] AC4: Änderung als `tasks/patch-117.diff` (programmatisch via `difflib`, nicht von Hand); `git apply --check tasks/patch-117.diff` grün. Blocker unten notiert.
- [x] AC5: Guard **rot** gegen ungepatchte reale Datei, **grün** gegen gepatchte Temp-Kopie verifiziert; volle Suite 283 grün / 1 rot (der 1 rote = genau dieser Guard, bewusst RED bis der Patch angewandt ist).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Betroffene Stelle: `.claude/commands/pr-shepherd.md:36` (Schritt 2, Punkt 2) – laut Grep die
  einzige verbliebene Roh-`committen`-Stelle ohne Seam-Verweis.
- Seam-Vertrag: `scripts/factory-commit.sh "<message>"` (genau ein Argument, main/master- &
  `--force`-fail-closed, push inklusive). Message-Konvention bleibt beim Skill.
- Test-Modell: bestehender #114-Block in `run-tests.sh` (~Z. 1483–1505) – neuer Guard analog,
  aber auf den Schritt-2-Abschnitt eingegrenzt (Lehre #114: Kommando ≠ Prosa-Erwähnung).

## Blocker / Erforderliche Aktion des Menschen
Blocker [2026-07-15]: `.claude/commands/pr-shepherd.md` ist für Agenten hard-denied
(`Edit/Write(.claude/**)`, #88-Grenze) – die Schritt-2-Änderung wurde daher als
`tasks/patch-117.diff` geliefert, nicht direkt editiert. Der Mensch muss den Patch anwenden:

```bash
git apply tasks/patch-117.diff
bash scripts/factory-commit.sh "feat: pr-shepherd Schritt 2 committet Review-Fixes via factory-commit.sh (#117)"
```

Bis dahin ist der neue Guard `#117` in `run-tests.sh` bewusst **rot** (RED-Zustand, TDD) und
das CI-Gate `factory-ci` schlägt fehl. Nach dem Apply ist die Suite vollständig grün
(gegen die gepatchte Fassung bereits verifiziert). `git apply --check` wurde read-only bestätigt.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- keine offen.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `improvement/117-pr-shepherd-schritt2-commit-seam`
Erstellt: 2026-07-15 20:53
