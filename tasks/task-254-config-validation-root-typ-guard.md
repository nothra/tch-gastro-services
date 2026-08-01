# Task 254: config-validation-root-typ-guard

## Status
- [x] In Bearbeitung
- [x] Implementiert (Tests grün, 599/599)
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/checks/config-validation-check.sh` setzt implizit voraus, dass der
Override-Root (`factory.config.yml`) ein YAML-Mapping ist. Ohne expliziten
Root-Typ-Check liefert `leaf_paths()` bei einem Nicht-Map-Root (Skalar, Bool,
Sequence, Mehrdokument-YAML) keine oder irreführende Pfade — das Gate schlägt
nur zufällig fehl, mit einer irreführenden Folgemeldung (Regel 4b) statt der
eigentlichen Ursache. Ergänzt einen expliziten, frühen Root-Typ-Guard plus
einen eigenständigen Mehrdokument-Guard für den Override. Details:
[spec-254](../docs/specs/spec-254-config-validation-root-typ-guard.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN Skalar-Root im Override WHEN Gate läuft THEN exit ≠ 0 mit
      expliziter "kein Mapping"-Meldung (nicht die irreführende
      max_turns-Meldung aus Regel 4b)
- [x] GIVEN Boolean-Root im Override WHEN Gate läuft THEN dieselbe explizite
      "kein Mapping"-Meldung
- [x] GIVEN Sequence-Root im Override WHEN Gate läuft THEN dieselbe explizite
      "kein Mapping"-Meldung
- [x] GIVEN Mehrdokument-YAML im Override (zwei gültige Mapping-Dokumente via
      `---`) WHEN Gate läuft THEN eigene, unterscheidbare Meldung zur
      Mehrdokument-Struktur
- [x] GIVEN gültiger Override (ein Dokument, Mapping-Root) WHEN Gate läuft
      THEN unverändertes Verhalten (keine Regression bei Regeln 1–6)
- [x] GIVEN kein Override-File vorhanden WHEN Gate läuft THEN neue Checks
      werden übersprungen (wie bei bestehenden Override-only-Regeln)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**ADR-Trigger-Prüfung (OPERATING.md §4.1, gegen alle vier Kategorien):**
- Technologiewahl: keine — `yq` ist bereits Prerequisite (ADR-009 §A), keine
  neue Library/Framework/DB/Dienst.
- Architekturmuster: keine — keine neue Schicht, kein Query-Modell-Wechsel,
  reine Ergänzung von zwei Guard-Zeilen in einem bestehenden Bash-Gate.
- Schnittstellen-Vertrag: keiner — CLI-Signatur
  (`config-validation-check.sh [<defaults>] [<override>]`) und Exit-Code-
  Semantik (0 = gültig, ≠0 = ungültig) bleiben unverändert; es kommen nur
  zwei neue, früher greifende Fail-Fälle mit klareren Meldungen hinzu, die
  vorher ohnehin schon (nur verwirrend) fehlgeschlagen sind.
- Langfristige/irreversible Konsequenz: keine — trivial rückbaubar (zwei
  Guard-Blöcke entfernen), keine Daten-/Schema-Migration.

→ **Kein ADR-Trigger aktiv. Kein ADR nötig.** Direkt weiter zu `/implement`.

**Implementierungs-Hinweise für den Coding-Agenten:**
- Reihenfolge im Skript: Mehrdokument-Guard **zuerst**, dann Root-Typ-Guard —
  beide innerhalb des bestehenden `if override_present; then`-Blocks, **vor**
  Regel 1b (YAML-Parse) bzw. direkt danach und in jedem Fall vor Regel 2
  (`leaf_paths`/unbekannte Keys) und Regel 6 (`model_tiers.heavy`), da beide
  einen Mapping-Root voraussetzen.
- Multidoc-Erkennung zuerst, sonst würde ein Multidoc-Mapping (`!!map\n!!map`)
  bereits am generischen Root-Typ-Vergleich (`= "!!map"`) scheitern und mit
  der falschen ("kein Mapping") Meldung abbrechen, obwohl beide Dokumente
  Mappings sind.
- Bestehendes Muster für Zeilen-Vergleiche/Guards im Skript weiterverwenden
  (`fail()`-Helper, `grep -qxF --`, `case`-Integer-Guards) — kein neuer Stil.
- Nur POSIX-kompatibles Shell/`grep -E` (clean-code.md „Portabilität in
  Gate-/Shell-Skripten") — Gate läuft auf macOS (lokal) und Alpine/GNU (CI).
- Tests: bestehendes Muster in `scripts/checks/tests/run-tests.sh` im
  `HAS_YQ`-Block direkt nach den „Gate #249"-Assertions (ca. Zeile 1320)
  fortführen — Format `assert_true "$([[ $rc -ne 0 ]]; echo $?)" "Gate #254
  AKn: …"`, je AK mindestens ein Positiv- und ein Negativ-Fixture (analog zu
  #241/#249). Kein neues Test-File — an derselben zentralen Stelle bleiben.

## Offene Fragen
Keine — geklärt: Guard nur für Override (nicht Defaults); Mehrdokument
bekommt eigene Meldung.

## Implementierungs-Notizen
- Mehrdokument-Erkennung über `yq eval-all 'document_index' "$OVERRIDE" | sort -u | wc -l`
  (> 1 → Mehrdokument). Ein leeres Override-File liefert dabei `0` (ein Dokument mit
  Tag `!!null`), keine leere Ausgabe — deckt sich mit dem bestehenden "leerer Override
  ist gültig"-Fall.
- Root-Typ-Guard lässt `!!null` (leeres/kommentarloses Override) explizit zu, da dieser
  Fall bereits vor Task 254 als gültig galt (Regel 2 lässt ihn unverändert durch).
- Reihenfolge wie in den Implementierungs-Hinweisen vorgegeben: Mehrdokument-Guard vor
  Root-Typ-Guard, beide vor Regel 1b (YAML-Parse) bzw. Root-Typ-Guard danach — ein
  Multidoc-File liefert bei `yq eval 'tag'` sonst je Dokument eine eigene Zeile
  ("!!map\n!!map") und würde am generischen Vergleich vorbeirutschen oder falsch
  fehlschlagen; der Multidoc-Guard fängt das vorher ab.
- Tests ergänzt in `scripts/checks/tests/run-tests.sh` im bestehenden `HAS_YQ`-Block
  direkt nach den Gate-#249-Assertions (Gate #254 AK1–AK6). Volle Suite: 599 grün, 0 rot.

## Review-Findings
<!-- Wird durch /review befüllt -->
Siehe [tasks/review-254.md](review-254.md). Drei Perspektiven (Logik, Code-Qualität,
Architektur), keine kritischen Findings. Eine Wichtig-Finding (Gate #254 AK6 testete
den "kein Override"-Skip-Pfad nicht isoliert) direkt in dieser Session behoben.
Verdict: APPROVED (mit optionalen Nitpicks für /refactor).

## Test-Vollständigkeit (/test)
Siehe [tasks/coverage-254.md](coverage-254.md). Alle 6 Akzeptanzkriterien 1:1 auf
eigene Testfälle abgebildet (Gate #254 AK1–AK6), Happy-Path/Fehlerfälle/Boundary
(Dokumentanzahl 1 vs. 2) abgedeckt, Tests unabhängig/deterministisch/Black-Box.
Keine App-TS-Dateien betroffen → `pnpm test:coverage`-Schwelle nicht anwendbar für
diesen Task. Keine neuen Tests nötig, keine Produktionscode-Änderung in diesem
Schritt. Volle Gate-Suite: 599 grün, 0 rot.

## Refactoring-Notizen (/refactor)
Kein neues Verhalten, nur Struktur/Kommentare — Tests vor/nach identisch grün (599/599).
Behobene Nitpicks aus `tasks/review-254.md`:
- Header-Regelkatalog: `1b.` (YAML-Parse) ergänzt, Nummerierungslücke `1a→1c` geschlossen.
- `sort -u` bei der Mehrdokument-Zählung entfernt (redundant, `document_index`-Werte
  sind je Dokument bereits eindeutig) + Kommentar ergänzt, warum der Fallback bei
  nicht-numerischem Output bewusst NICHT selbst `fail()`t (Regel 1b liefert die
  treffendere Meldung).
- Case-Statement-Polarität des Root-Typ-Guards (Allow-List statt Deny-List) mit
  WHY-Kommentar versehen (YAML-Tags sind keine endliche "böse" Menge).
- Nicht geändert (bewusst, laut Review als vertretbarer Trade-off eingestuft):
  Testredundanz Gate #254 AK5 vs. bestehendem "sauberer Override"-Test — dient der
  AK-Rückverfolgbarkeit, keine Produktionscode-Auswirkung.

## Security-Review-Findings (/security-review)
Siehe [tasks/security-254.md](security-254.md). Keine kritischen/wichtigen Findings.
Zentrale Bypass-Analyse (können die neuen Guards Regel 5/241-Mindest-Tier oder
6/249-`model_tiers.heavy`-Lock umgehen?) empirisch gegen echtes `yq` getestet
(Mehrdokument-Angriff, YAML-Merge-Key-Smuggling) — kein Bypass gefunden, die neuen
Guards laufen strikt VOR und zusätzlich zu den bestehenden Regeln. Ergebnis: PASSED.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Siehe [tasks/codify-254.md](codify-254.md). Neue Lesson in
[`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) + Index-Zeile in
`PROJECT-CONTEXT.md`: „Kein Argument übergeben"-Tests gegen Bash-Gates mit
`${N:-$REPO_ROOT/...}`-Default können versehentlich den Default statt der Abwesenheit
testen (Ursache der AK6-Review-Finding). Keine weiteren Regeln nötig.

---
Branch: `feature/254-config-validation-root-typ-guard`
Erstellt: 2026-08-01 21:32
