# Review: Task 94

Reviewter Diff: `git diff main...HEAD` – 3 Code-/Config-Artefakte
(`.claude/commands/pr-shepherd.md`, `.claude/settings.json`,
`scripts/checks/tests/run-tests.sh`) plus Task-Doku + `tasks/patch-94.diff`.

## Kritische Findings (müssen behoben werden)
- (keine)

## Wichtige Findings (sollten behoben werden)
- (keine)

## Nitpicks (optional)
- [ ] `tasks/patch-94.diff` bleibt nach dem Apply als redundanter Audit-Artefakt im Repo. Das
      entspricht dem in #91 codifizierten Patch-Workflow (bewusst behalten als Nachweis) – bei
      Bedarf beim Merge/Cleanup entfernbar. Kein Handlungsbedarf im Scope dieser Task.
- [ ] Der Konsistenz-Test greppt nur auf das Literal `gh pr ready` in `pr-shepherd.md`, nicht auf
      den `isDraft`-Guard drumherum. Bewusst analog zu den bestehenden #91-Grep-Checks
      (z. B. `gh pr update-branch`) – ausreichend, da der Guard-Ablauf per /architecture festgelegt
      und im Review geprüft ist.

## Positives
- **Saubere TDD-Reihenfolge:** Assertions zuerst (Red: 255/2), dann Skill-Doku + Patch (Green:
  257/0) – nachvollziehbar über getrennte Commits.
- **Fail-closed konsequent:** `isDraft`-Guard un-draftet nur bei echtem Draft und erst nach den
  Gates 2–5; leerer/fehlender `gh`-Output führt (via `[ "" = "true" ]` → false) nicht zu einem
  fehlerhaften `gh pr ready`. Kein `Bash(gh *)`-Wildcard, `deny` unverändert.
- **ADR-019 §3 korrekt als Anwendung (nicht Abweichung)** umgesetzt: genau der genutzte Verb
  ergänzt, kein neuer ADR nötig – Trade-off war dort bereits vorweggenommen.
- **Konsistenz maschinell abgesichert:** neuer Test koppelt allow-Liste ↔ Skill-Doku, sodass ein
  künftiges Auseinanderlaufen (Ursache des #94-Vorfalls) rot wird.
- **Portabilität beachtet:** nur `grep -qF` (POSIX), kein PCRE – konform zu clean-code.md.

## Empfehlung
APPROVED
