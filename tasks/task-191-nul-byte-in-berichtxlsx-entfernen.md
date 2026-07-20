# Task 191: nul-byte-in-berichtxlsx-entfernen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Ein unsichtbares NUL-Byte (`\x00`) in `app/veranstaltung/berichtXlsx.ts` (Funktion `artikelKey`,
Zeile 20) durch das ursprünglich beabsichtigte Trennzeichen (Leerzeichen) ersetzen. Das Byte war
bereits im ersten `/implement`-Lauf von Task #185 unbemerkt entstanden (Ursache nicht mehr
rekonstruierbar – vermutlich ein Encoding-Glitch beim Schreiben der Datei) und ist unbemerkt durch
alle Gates von #185 gerutscht (Lint, Typecheck, 604 Tests, Format-Check, Review, Security-Review,
Codify), weil ein NUL-Byte innerhalb eines Template-Strings syntaktisch gültig ist und in keinem
Text-basierten Review visuell auffällt. Es macht `git diff`/`git blame` für die Datei dauerhaft
„binär" und ist offensichtlich nicht beabsichtigt (kein Kommentar erklärt es als bewusste Wahl).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] `app/veranstaltung/berichtXlsx.ts` enthält keine NUL-Bytes mehr (`python3 -c "assert 0 not in open(path,'rb').read()"`).
- [x] `artikelKey` liefert weiterhin eindeutige Spalten-Schlüssel (Name + Größe, jetzt mit
  Leerzeichen-Trennzeichen) – keine Verhaltensänderung, alle 604 Tests weiterhin grün.
- [x] `git diff --text` zeigt einen normalen Ein-Zeilen-Textdiff statt „Binary files differ".

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR nötig – reiner 1-Byte-Encoding-Fix, keine Architektur-/Verhaltensänderung. Aufgrund der
Trivialität wurde die volle Stage-3-Pipeline (implement/review/test/refactor/security-review/
codify als Agenten-Läufe) nicht durchlaufen, sondern der Fix direkt angewendet und gegen die
vollständige Test-/Lint-/Typecheck-/Format-Suite verifiziert (analog zur Proportionalitäts-Regel
in `git-workflow.md` „für ein Häkchen unverhältnismäßig"). Verifiziert: 604 Tests grün, Typecheck
grün, Format grün, Lint grün – identisch zum Vorzustand vor dem Fix.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->
Manuell verifiziert statt `/review`-Agentenlauf (Proportionalität, siehe Technische Notizen):
Diff ist eine reine Byte-Ersetzung ohne Verhaltensänderung, kein Finding zu erwarten.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Bereits in #185 als Codify-Learning erfasst (`docs/factory/PROJECT-CONTEXT.md` → „`/refactor`
Turn-Limit-Exhaustion"). Ergänzung hier: Byte-Level-Korruption in String-Literalen ist für
Text-basierte Reviews (Agent oder Mensch) unsichtbar – ein `git diff`/`git show`-Output rendert
ein NUL-Byte oft als nichts oder als Leerzeichen. Einziger verlässlicher Nachweis ist ein
Byte-Scan (`python3 -c "... .count(0)"` o. Ä.), kein visueller Diff-Vergleich.

---
Branch: `fix/191-nul-byte-in-berichtxlsx-entfernen`
Erstellt: 2026-07-20 17:13
