# Security Review: Task 94

Analysierter Diff: `git diff main...HEAD`. Sicherheitsrelevant ist allein die Erweiterung der
Permission-Fläche in `.claude/settings.json` (`Bash(gh pr ready:*)`) sowie der neue Skill-Schritt.

## Kritische Findings (Blocker)
- (keine)

## Wichtige Findings
- (keine)

## Hinweise
- [ ] **[AuthZ / Angriffsfläche]** Das `:*` in `Bash(gh pr ready:*)` erlaubt beliebige Argumente
      (z. B. eine fremde PR-Nummer/URL). Bewertung: **akzeptabel** – `gh pr ready` ist reversibel
      (`--undo`), nicht-destruktiv und durch das gh-Token-Scoping auf erreichbare Repos begrenzt.
      Es ist strikt schwächer als das bereits freigegebene `Bash(gh pr merge:*)`. Konsistent mit
      ADR-019 (granularer, tatsächlich genutzter Verb; kein Wildcard `Bash(gh *)`).

## Geprüft & unauffällig
- **Command Injection:** kein User-Input im Skill-Snippet interpoliert; `gh pr ready` ohne
  Argumente auf dem aktuellen PR; String-Vergleich der Command-Substitution ist safe.
- **Secrets:** keine Secrets im Diff; `gh` nutzt eigene Auth (nicht im Repo).
- **Dependencies:** keine neuen Abhängigkeiten.
- **Error-Handling / fail-safe:** `gh pr view`-Fehler → `$(...)` leer → Guard false → kein
  Un-Draft (kein fälschlich merge-reif aussehender Draft).
- **fail-closed:** `deny` (`.claude/**`, `.env*`) unverändert; kein `Bash(gh *)`-Wildcard –
  beides testverifiziert (`run-tests.sh`).

## Ergebnis
PASSED
