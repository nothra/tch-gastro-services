# Review: Task 96

_Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur) des Diffs
`main...HEAD`. Nur `scripts/metrics.sh`, `scripts/checks/tests/run-tests.sh`,
`tasks/task-96-*.md`. Keine `spec-96.md` – bei einem Bugfix ist die Task-Datei die
kanonische Quelle._

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- Keine.

## Nitpicks (optional)
- [ ] [scripts/metrics.sh:87] **Ganzzahlige Ø-Lead-Time verliert die Nachkommastelle.**
  `((add/length)/3600 * 10 | round) / 10 | tostring` liefert bei einem glatten Wert
  (z. B. genau 2.0 h) den String `"2"` → Report zeigt `2 h` statt vorher `2.0 h`
  (verifiziert: `jq` gibt für `2.0` `"2"` aus). Rein kosmetisch, kein Korrektheits-
  fehler und außerhalb beider AK; nur erwähnt, weil sich das Ausgabeformat gegenüber
  `printf '%.1f'` minimal ändert. Falls das feste `x.x`-Format gewünscht ist, ließe es
  sich in `jq` mit einer Nachkommastellen-Formatierung erzwingen – für diese KPI aber
  unnötiges Gold-Plating (YAGNI).
- [ ] [scripts/checks/tests/run-tests.sh:290] **Regression-Test läuft nur, wo
  `de_DE.UTF-8` generiert ist.** Auf Standard-CI-Runnern (Ubuntu, `C`/`POSIX`-Locale)
  wird der Test übersprungen und schützt dort nicht. Das ist hier **vertretbar und
  bewusst**: Der Bug manifestiert sich ausschließlich unter einer Komma-Locale, ein
  Lauf unter `C` würde ihn ohnehin nicht reproduzieren. Das Degradations-Muster ist
  konsistent mit `skip_yq` und dokumentiert. Kein Handlungsbedarf – nur als bekannte
  Abdeckungs-Grenze festgehalten (der Test greift real nur lokal/macOS, wo die Locale
  existiert).

## Positives
- **Root-Cause statt Symptom:** Formatierung/Rundung wandert komplett in `jq`, dessen
  Zahl→String-Konvertierung per Definition locale-unabhängig (`.`-Dezimaltrenner) ist.
  Damit ist die `strtod()`-Falle von `printf '%f'` strukturell beseitigt, nicht nur
  umgangen (z. B. kein `LC_ALL=C`-Wrapper, der an anderer Stelle wieder umkippt).
- **jq-Ausdruck verifiziert:** `1.75→"1.8"`, `1.6436…→"1.6"`, `0.05→"0.1"`, `240.5→
  "240.5"` – Rundung und `.`-Trenner korrekt; `empty`-Zweig lässt `lead_time` sauber
  auf `übersprungen` (kein leeres `" h"`).
- **RED/GREEN belegt:** Regression-Test stubt `gh` mit zwei PRs (Ø 1.75 h) und erzwingt
  `LC_ALL/LC_NUMERIC=de_DE.UTF-8`; beide AK (kein `invalid number` auf stderr, Wert mit
  `.`-Trenner) sind eigene Assertions. Lokal ausgeführt: beide `#96`-Tests grün, keine
  Regression in der übrigen Suite.
- **bash-gotchas.md §3 im Test selbst angewandt:** Der Locale-Verfügbarkeits-Check
  fängt `locale -a` erst in eine Variable und greppt dann – vermeidet das dokumentierte
  SIGPIPE-Falschrot unter `set -o pipefail`. Fehler, der zur Regel wurde, sofort
  mitangewandt.
- **Kommentare erklären WHY** (locale-abhängiges `strtod`, Verweis auf #96/Task 67),
  nicht WHAT. Test-Fixture-Werte (1h + 2.5h) sind im Kommentar begründet.

## Empfehlung
APPROVED
