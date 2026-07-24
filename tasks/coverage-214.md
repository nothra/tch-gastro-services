# Test-Vollständigkeit & Coverage: Task 214

## Coverage-Metrik: Einordnung

Der Liefergegenstand ist ein **Shell-Test-Block** (`scripts/checks/tests/run-tests.sh`, Block
„#214"). Die Änderung fügt **null Zeilen TypeScript-Produktionscode** hinzu → die Vitest-
Zeilencoverage (Schwelle 80 %, `pnpm test:coverage`) ist durch diese Task unberührt und **nicht**
die relevante Vollständigkeitsmetrik. Bewusst **kein** Coverage-Report generiert (vermiede nur
Artefakte; ADR-040 – Coverage-Ausgabe gehört ohnehin nur in ignorierte Pfade).

Die governende Metrik ist die **AC-Abdeckung des Guards**: jede Akzeptanz-/Fehlerszenario-Zeile
der Spec wird durch mindestens eine Verhaltens-Assertion belegt. Verifiziert per RED-Nachweis
(Stub `return 0` → 8 Negativ-Assertions rot) und GREEN-Lauf.

## AC-/Szenario-Mapping (alle abgedeckt)

| Spec | Happy Path | Negativ / Edge | Assertion(en) |
|------|-----------|----------------|---------------|
| AC1 (review `## Empfehlung`, exakt) | Guard grün ggü. echter review.md | Command-Rename → rot + nennt `report_verdict(review)` | „AC1-3 …grün", „AC4 …review-Verdict-Anker" |
| AC2 (security `## Ergebnis`, exakt) | Guard grün ggü. echter security-review.md | Command-Rename → rot + nennt `report_verdict(security-review)` | „AC1-3 …grün", „AC4 …security-Verdict-Anker" |
| AC3 (drei count_section_items-Sektionen) | Guard grün + Kardinalität == 3 | Command-Rename einer Sektion → rot + nennt `count_section_items` | „AC3 …drei …extrahiert", „AC4 …Findings-Sektion" |
| AC4 (Drift → Exit≠0 + Konstante) | – | drei Drift-Fälle, jeder nennt die betroffene Konstante | drei „AC4"-Paare |
| AC5 (verdrahtet, Non-Zero bei Drift) | Guard läuft im Suite-Lauf (24 Assertions); die Positiv-Assertion (Guard grün ggü. **echten** Dateien) IST der verdrahtete Detektor – reale Drift ⇒ diese Assertion rot ⇒ Suite Exit≠0 | – | „AC1-3 …grün" (im Suite-Kontext) |
| AC6 (Konstanten aus echten Skripten, beide Seiten) | Extraktion nicht leer (Verdict ×2, Sektionen) | **Parser-seitiger** Drift: Anker/Sektion nur im Parser umbenannt → rot; Fail-closed bei nicht extrahierbarem Parser-Format | drei „AC6 …extrahiert" + zwei „AC6 …Parser-seitig" + zwei „Fail-closed" |
| Fehlerszenario 1 (fehlt/leer) | – | fehlende **und** leere Command-Datei → rot (fail-closed) | zwei „F1 (#214)" |
| Fehlerszenario 2 (nur Fließtext) | – | Anker nur im Fließtext, Sektionen intakt → rot **nur** wegen Verdict-Exaktverankerung | drei „F2 (#214)" |
| Fehlerszenario Portabilität | Suite läuft lokal (macOS/BSD) **und** CI (GNU/Alpine) grün → POSIX-Portabilität ist die Live-Prüfung | – | CI-Lauf des gesamten `run-tests.sh` |

## In /test ergänzt (AC6-Lücke geschlossen)

Vor /test mutierten alle Negativtests nur die **Command-Seite**. AC6 verlangt aber Erkennung,
wenn sich **eine der beiden Seiten** ändert („Command **oder** Parser"). Ergänzt:
- **AC6 Parser-seitiger Verdict-Drift:** Fake-`report-verdict.sh` mit umbenanntem `header=` →
  Guard rot + nennt `report_verdict(review)`.
- **AC6 Parser-seitiger Sektion-Drift:** Fake-`run-pipeline.sh` mit umbenanntem
  `count_section_items`-Argument → Guard rot + nennt `count_section_items`.
- **Fail-closed bei Parser-Format-Änderung:** Verdict- bzw. Sektion-Extraktion leer → Guard rot
  mit erklärender Meldung (deckt die Zweige „nicht extrahierbar" ab; kein stilles Grün).

## Ergebnis

- `run-tests.sh` #214-Block: **24 Assertions grün**; volle Suite **524 grün / 0 rot**, Exit 0.
- Alle 6 ACs + 3 Fehlerszenarien mit Verhaltens-Assertionen belegt; beide Drift-Richtungen (Command
  **und** Parser) exerziert.
- Kein Produktionscode geändert (nur Test-Assertionen + Fixtures).

## Hinweis an /refactor
- `drift_guard` Zeile ~1785: der `found_any`-Wächter ist nach der vorgelagerten Leer-Extraktions-
  Prüfung (~1772) praktisch unerreichbar (defensive Redundanz). Kandidat für Vereinfachung im
  Clean-Code-Pass – kein Verhaltensfehler.
