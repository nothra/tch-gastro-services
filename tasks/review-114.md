# Review: Task 114

Scope: `/pr-shepherd` Schritt 6 committet+pusht die Abschlussnotiz **vor** dem Auto-Merge
(Squash-Strategie). Betroffen: `.claude/commands/pr-shepherd.md` (Patch), `scripts/checks/tests/run-tests.sh`
(Guard), `docs/factory/PROJECT-CONTEXT.md` (Codify-Regel), Task-Datei + `tasks/patch-114.diff`.
Kein Produktcode – reine Prozess-/Doku-Härtung.

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- keine

## Nitpicks (optional)
- [ ] `.claude/commands/pr-shepherd.md:36` – Schritt 2 (Review-Kommentare auflösen) sagt generisch
      „committen" ohne den `factory-commit.sh`-Seam, den Schritt 6 jetzt nutzt (ADR-019).
      **Out-of-Scope** (nicht durch #114 eingeführt) → als eigenes Issue **#117** angelegt, nicht in
      diesem PR behoben (Scope-Disziplin).

## Positives
- **Korrektheit:** Alle 4 Akzeptanzkriterien erfüllt; Schritt-6-Reihenfolge (Notiz → commit+push →
  Auto-Merge) ist sachlich richtig und schließt die #112-Lücke. Merge-Kommando und Notiz-Text bleiben
  unverändert erhalten – nur die Reihenfolge/der commit-Schritt kommen hinzu.
- **Guard-Qualität:** Die Reihenfolge-Assertion prüft bewusst gegen die volle Form
  `gh pr merge --auto --squash` (Schritt 6), nicht gegen die kürzere Prosa-Erwähnung in Schritt 4 –
  vermeidet einen False-Positive. Integer-Absicherung per `case … in ''|*[!0-9]*)` und Presence-Check
  (`-gt 0`) folgen `clean-code.md` „Portabilität in Gate-Skripten"; nur POSIX (`grep -nF`/`cut`/`[ -lt ]`),
  kein PCRE.
- **TDD nachvollziehbar:** RED (281/2) → GREEN (283/0) dokumentiert; Patch programmatisch erzeugt
  (`difflib`), `git apply --check` + Temp-Kopie-Verifikation belegt.
- **Muster-Treue:** Patch-Workflow (#88/#91/#94), Test-Block-Stil (#91/#94) und Codify-Platzierung
  konsistent zum Bestand; ADR-019-Seam korrekt referenziert.
- **WHY-Kommentare** an Assertion und Codify-Regel erklären die Squash-Merge-Falle, nicht das WHAT.

## Empfehlung
APPROVED
