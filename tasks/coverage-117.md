# Coverage: Task 117

## Art der Änderung
Skill-Doku-Konsistenz + Gate-Guard. **Kein TypeScript-/Laufzeitcode** berührt → die
Vitest-Suite und die 80-%-Coverage-Schwelle (`PROJECT-CONTEXT.md`) sind unverändert; der
`pnpm test`-Lauf im pre-push-Gate blieb bei jedem `factory-commit` grün (183 passed / 27 skipped).
Relevante Abdeckung ist hier die **Factory-Self-Test-Suite** (`scripts/checks/tests/run-tests.sh`),
die die Skill-Doku-Invariante prüft.

## AC → Test-Abdeckung

| AC | Verhalten | Test (run-tests.sh) | Status |
|----|-----------|---------------------|--------|
| AC1 | Schritt 2 committet Review-Fixes über `scripts/factory-commit.sh` | `#117: … via factory-commit.sh (Seam)` – greppt den Seam im Schritt-2-Abschnitt | ✓ |
| AC2 | fail-closed-Begründung + ADR-019-Verweis im selben Abschnitt | `#117: … fail-closed-Begründung (ADR-019)` – separat vom Kommando geprüft | ✓ |
| AC3 | Guard prüft **Schritt-2**-Abschnitt, distinkt von Schritt 6 | Beide `#117`-Asserts grenzen auf `### Schritt 2`→`### Schritt 3` ein | ✓ |
| AC4 | Patch programmatisch, `git apply --check` grün | manuell verifiziert (read-only) + Patch-Konvention (`patch-94/114.diff`) | ✓ |
| AC5 | RED-vor / GREEN-nach-Patch belegt | RED gegen ungepatcht, GREEN gegen gepatcht; volle Suite 285/0 | ✓ |

## Edge Cases / Negativ-Nachweise
- **AC1 unabhängig von AC2:** Negativ-Test – Begründung aus Schritt 2 entfernt, Kommando belassen
  → AC2-Guard **ROT**, AC1-Guard bleibt grün. Beweist, dass beide Kriterien getrennt abgesichert
  sind (kein „ein Treffer deckt beides").
- **Header-Reihenfolge fail-closed:** `[ s3 -gt s2 ]` + Integer-Sicherheit über `first_match_line`
  ⇒ fehlende/vertauschte Header ⇒ RED (kein stilles Durchwinken).
- **Kein Fehl-Match über Schritt 6:** Section-Extraktion statt globalem Grep (Lehre #114).

## Test-Qualität
- Verhalten statt Implementierung geprüft (Invariante der Skill-Doku, nicht interne Zeilennummern).
- Deterministisch, keine Zeit-/Netz-/Reihenfolge-Abhängigkeit; POSIX-portabel.
- Kein Mocking nötig (reine Datei-Assertions).

## Ergebnis
`bash scripts/checks/tests/run-tests.sh` → **285 grün / 0 rot**. Alle 5 AC test-abgedeckt.
