# Task 96: metricssh-lead-time-locale-bug-beheben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung

`scripts/metrics.sh` berechnet die Lead-Time (Ø Issue→Merge über die letzten 20 PRs)
via `jq`, formatiert das Ergebnis dann aber mit bash `printf '%.1f h'`. `printf`s
`%f`-Konvertierung parst ihr Argument via `strtod()` **locale-abhängig**: Unter einer
Locale mit Komma-Dezimaltrenner (z. B. `de_DE.UTF-8`) schlägt das Parsen eines
Punkt-Dezimalwerts wie `"1.6436527777777776"` fehl (`printf: ... invalid number`),
und `printf` fällt still auf `0,0` zurück – der Report zeigt dann eine falsche
Lead-Time (`0,0 h` statt z. B. `1.6 h`), ohne dass ein Fehler sichtbar wird
(kein non-zero Exit, da `metrics.sh` mit `set -uo pipefail`, nicht `-e`, läuft).

Gefunden bei der `/daily-metrics`-Prüfung für Task 67.

- **Issue:** #96 · **Typ:** bug · tech-debt

## Akzeptanzkriterien
- [x] AK-1: GIVEN die GitHub-API liefert gemergte PRs mit einer nicht-ganzzahligen
  Ø-Lead-Time (z. B. 1.75h) UND die Shell läuft unter einer Locale mit
  Komma-Dezimaltrenner (`de_DE.UTF-8`) WHEN `metrics.sh` läuft
  THEN erscheint **keine** `printf: invalid number`-Fehlermeldung auf stderr
- [x] AK-2: GIVEN derselbe Fall WHEN der Report geschrieben wird
  THEN zeigt `Lead-Time (Issue→Merge)` den korrekt berechneten Wert mit
  Punkt-Dezimaltrenner (z. B. `1.8 h`), nicht `0,0 h`

## Technische Notizen

**Fix:** Rundung/Formatierung des Lead-Time-Werts läuft jetzt komplett in `jq`
(`(((add/length)/3600 * 10 | round) / 10 | tostring)`) statt über bash
`printf '%.1f'` – `jq`s Zahl-zu-String-Konvertierung ist immer locale-unabhängig
(Punkt-Dezimaltrenner), unabhängig von `LC_NUMERIC`/`LC_ALL` der aufrufenden Shell.

**Regression-Test:** `scripts/checks/tests/run-tests.sh` (#96) stubt `gh` (zwei
gemergte PRs, Ø 1.75h) und erzwingt `LC_ALL=de_DE.UTF-8`/`LC_NUMERIC=de_DE.UTF-8`
(Test übersprungen, falls diese Locale oder `jq` lokal fehlen – gleiches
Degradations-Muster wie `skip_yq`). RED gegen den unge­fixten Code verifiziert
(stderr-Fehler + `0,0 h` im Report), GREEN gegen den Fix.

**Nebenbei behoben (gleiche Ursache, aus bash-gotchas.md #3):** Der Locale-
Verfügbarkeits-Check im neuen Test selbst nutzte zunächst `locale -a | grep -qxF …`
direkt in der Pipe – das ist unter `set -o pipefail` das dokumentierte
SIGPIPE-Falschrot-Muster (`grep -q` schließt die Pipe beim ersten Treffer,
`locale -a` bekommt SIGPIPE). Behoben nach dem in `bash-gotchas.md` §3
vorgeschriebenen Muster: Output erst in eine Variable einfangen, dann greppen.

### Refactoring-Pass

Keine Refactorings notwendig – Code bereits clean.

Geprüft gegen die Checkliste:
- **Variablennamen:** `avg_h`, `prs`, `lead_time`, `HAS_JQ`, `HAS_DE_LOCALE`, `TMP_METRICS`, `metrics_err` – alle sprechend, keine Abkürzungen.
- **Einzelverantwortung:** Der geänderte Block in `metrics.sh` tut genau eine Sache (Lead-Time berechnen und formatieren). Kein Auslagern sinnvoll.
- **Magic Numbers:** `3600` (Sekunden pro Stunde) und `10` (Multiplikator für 1-Dezimalstellen-Rundung) waren vorher bereits vorhanden; keine neuen eingeführt. Ein benanntes Konstant wäre YAGNI in diesem Shellscript-Kontext.
- **Kommentare:** Der Block in `metrics.sh` (Z. 78–83) ist ein WHY-Kommentar (erklärt den Locale-Bug und warum jq statt printf). Der SIGPIPE-Kommentar im Test (Z. 285–286) verweist auf `bash-gotchas.md`. Beide korrekt.
- **Duplikation:** `printf '%s' "$prs" | jq` erscheint zweimal (Z. 84, Z. 88), aber für unterschiedliche Operationen (Durchschnittsberechnung vs. Länge). Zusammenführen würde die jq-Expression verkomplizieren – kein Gewinn.

Tests: 260 grün, 0 rot (inkl. #96-Locale-Test, der auf dieser Maschine vollständig lief).

## Offene Fragen

Keine – Fix ist lokal, kein ADR-Trigger (kein Framework-/Architektur-Wechsel).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/96-metricssh-lead-time-locale-bug-beheben`
Erstellt: 2026-07-13 14:07
