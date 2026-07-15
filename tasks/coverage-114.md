# Coverage / Test-Vollständigkeit: Task 114

## Art der Änderung
Reine Prozess-/Doku-Härtung – **kein Produktcode** geändert:
`.claude/commands/pr-shepherd.md` (Skill-Doku, via Patch), `docs/factory/PROJECT-CONTEXT.md`
(Codify-Regel), `scripts/checks/tests/run-tests.sh` (Factory-Self-Test-Guard). Keine `.ts/.tsx`.

→ **Vitest-Coverage (Schwelle 80 %) ist strukturell nicht betroffen** – es entsteht kein neuer
TS-Codepfad. `pnpm test` bleibt der Regressions-Nachweis (112 grün, 13 skipped). Die für diese
Task relevante „Testebene" ist der Factory-Self-Test (`run-tests.sh`, läuft im CI-Gate).

## AC-Abdeckung
| AC | Aussage | Abgedeckt durch |
|----|---------|-----------------|
| AC1 | `pr-shepherd.md` nennt `factory-commit.sh` | Self-Test-Assertion „#114 … via factory-commit.sh" ✓ |
| AC2 | commit+push **vor** `gh pr merge --auto --squash` | Self-Test-Assertion „… (Reihenfolge)" (volle `--squash`-Form) ✓ |
| AC3 | Codify-Regel „Notiz-vor-Merge …" existiert | Dokumentation; per /review geprüft (APPROVED) – s. u. |
| AC4 | Self-Test grün | 283 grün, 0 rot ✓ |

## Bewusste Nicht-Erweiterung (Scope-Disziplin)
Für AC3 wurde **kein** zusätzlicher Grep-Guard auf `PROJECT-CONTEXT.md` ergänzt:
- Die ~10 bestehenden Stolperstein-Regeln in `PROJECT-CONTEXT.md` sind **ebenfalls nicht**
  einzeln durch Self-Tests abgesichert – ein Guard nur für #114 wäre inkonsistent.
- AC4 der Task begrenzt den Self-Test explizit auf die **zwei `pr-shepherd.md`-Assertions**.
- Ein Doku-Abschnitt wird durch **Review** verifiziert (bereits APPROVED), nicht durch einen Test.
- „Kein Gold-Plating / Scope einhalten" (CLAUDE.md, Nicht-verhandelbares Prinzip 5).

## Test-Qualität
- Deterministisch (Grep gegen Dateien, keine Zeit/Netz/Reihenfolge-Abhängigkeit).
- Unabhängig; sprechende Assertion-Namen.
- POSIX-portabel (`grep -nF`/`cut`/`case`-Integer-Guard) – `clean-code.md` „Portabilität in Gate-Skripten".

## Ergebnis
`pnpm test`: **112 grün / 13 skipped**. Factory-Self-Test: **283 grün / 0 rot**.
Keine fehlenden Tests im Scope → keine neuen Tests nötig.
