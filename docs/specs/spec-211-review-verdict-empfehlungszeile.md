# Spec: Verdict-Erkennung liest ausschließlich die strukturierte Empfehlungs-/Ergebnis-Zeile

## Kontext

`scripts/run-pipeline.sh` und der geteilte Helper `scripts/lib/report-verdict.sh::report_verdict()`
bestimmen den Review-/Security-Review-Verdict per **Volltext-Grep** über den kompletten Report:

- Phase-2-Loop: `grep -q "APPROVED" tasks/review-<id>.md` (`run-pipeline.sh:428`)
- Security-Gate: `grep -q "NEEDS_FIXES" tasks/security-<id>.md` (`run-pipeline.sh:460`)
- `report_verdict()`: `grep -oE '<pattern>' … | tail -1` – „letztes Vorkommen gewinnt"
  (`report-verdict.sh:35`)

Der Report-Contract liefert den Verdict aber an einer **festen, strukturierten Stelle**:

- Review (`.claude/commands/review.md` §Empfehlung): Überschrift `## Empfehlung`, darunter
  `APPROVED` **oder** `NEEDS_REWORK`.
- Security-Review (`.claude/commands/security-review.md` §Ergebnis): Überschrift `## Ergebnis`,
  darunter `PASSED` **oder** `NEEDS_FIXES`.

Der restliche Report ist Fließtext und darf die Verdict-Wörter frei erwähnen (z. B. „Alle drei
Personas empfahlen für sich **APPROVED**."). Am 2026-07-23 (Task #206, Review-Runde 2) hat genau
das den Bug ausgelöst: Der Report trug den echten Verdict `NEEDS_REWORK` (`tasks/review-206.md:92`),
erwähnte aber danach im Fließtext `APPROVED` (`:96`). Folge:

- Der Phase-2-Loop (`grep -q "APPROVED"`) wertete Runde 2 fälschlich als bestanden und übersprang
  den Rework-Loop.
- `report_verdict()`s „letztes Vorkommen"-Heuristik hätte denselben Fehler gemacht (die
  Fließtext-Erwähnung steht **nach** der Verdict-Zeile).
- Die Pipeline meldete „erfolgreich abgeschlossen", obwohl die Task-Datei offene Checkboxen hatte
  und der PR (#208) im Draft blieb.

Ziel: Der Verdict wird **ausschließlich** aus der strukturierten Anker-Zeile gelesen; eine
Fließtext-Erwähnung anderswo im Report kann das Ergebnis nicht mehr verfälschen. Beide Konsumenten
nutzen dieselbe Logik (ADR-019 §4 „eine Verdict-Erkennung, ein Ort").

## Scope

**Inbegriffen:**
- Anker-basierte Verdict-Erkennung in `scripts/lib/report-verdict.sh::report_verdict()`
  (kanonischer, geteilter Ort) – skill-spezifischer Anker:
  - `review` → Überschrift `## Empfehlung`, Tokens `APPROVED | NEEDS_REWORK`
  - `security-review` → Überschrift `## Ergebnis`, Tokens `PASSED | NEEDS_FIXES`
- Umstellung der beiden Ad-hoc-Volltext-Greps in `scripts/run-pipeline.sh` auf denselben Helper:
  - Phase-2-Review-Loop (`:428`)
  - Security-Gate vor Merge (`:460`)
- Anpassung der Shell-Tests (`scripts/checks/tests/run-tests.sh`) an den neuen Contract – inkl.
  Update aller Test-Fixtures (Report-Mocks), die den Anker bisher weglassen.

**Nicht inbegriffen:**
- Änderungen am Report-Contract selbst (`.claude/commands/review.md`, `security-review.md`) –
  die Anker-Überschriften bleiben unverändert.
- Änderungen an anderen Feld-/Status-Erkennungen der Pipeline (nur der Verdict).
- Rückwärtskompatible Fließtext-Fallback-Erkennung – bewusst **nicht** (siehe Fehlerszenarien:
  fehlender Anker = fail-closed).
- Neue Verdict-Tokens oder neue Skills.

## Akzeptanzkriterien

- [ ] **AK1 – Verdict aus der Anker-Zeile:** GIVEN ein Review-Report mit
  `## Empfehlung` gefolgt (in der ersten nicht-leeren Zeile) von `NEEDS_REWORK`
  WHEN `report_verdict review <id>` läuft
  THEN wird `NEEDS_REWORK` ausgegeben.

- [ ] **AK2 – Fließtext-Erwähnung wird ignoriert:** GIVEN ein Review-Report mit Verdict-Zeile
  `NEEDS_REWORK` unter `## Empfehlung` und **danach** im Fließtext dem Wort `APPROVED`
  (z. B. „Alle Personas empfahlen für sich APPROVED")
  WHEN `report_verdict review <id>` läuft
  THEN wird `NEEDS_REWORK` ausgegeben (nicht `APPROVED`) – die Reihenfolge im Dokument ist irrelevant.

- [ ] **AK3 – Erste nicht-leere Zeile zählt:** GIVEN ein Report, bei dem zwischen `## Empfehlung`
  und der Verdict-Zeile eine oder mehrere Leerzeilen liegen
  WHEN `report_verdict review <id>` läuft
  THEN wird der Verdict aus der ersten nicht-leeren Zeile nach der Überschrift gelesen.

- [ ] **AK4 – Security-Review-Anker:** GIVEN ein Security-Report mit `## Ergebnis` gefolgt von
  `NEEDS_FIXES` und einer Fließtext-Erwähnung von `PASSED` an anderer Stelle
  WHEN `report_verdict security-review <id>` läuft
  THEN wird `NEEDS_FIXES` ausgegeben.

- [ ] **AK5 – Phase-2-Loop nutzt die Anker-Logik:** GIVEN ein Review-Report mit Verdict-Zeile
  `NEEDS_REWORK` unter `## Empfehlung` und einer Fließtext-Erwähnung von `APPROVED`
  WHEN `run-pipeline.sh` den Phase-2-Review-Loop auswertet
  THEN wird **nicht** „Review bestanden" gemeldet, sondern der Rework-Loop betreten
  (kein Volltext-`grep -q "APPROVED"` mehr).

- [ ] **AK6 – Security-Gate nutzt die Anker-Logik:** GIVEN ein Security-Report mit Ergebnis-Zeile
  `PASSED` unter `## Ergebnis` und einer Fließtext-Erwähnung von `NEEDS_FIXES`
  WHEN `run-pipeline.sh` das Security-Gate auswertet
  THEN blockiert die Pipeline **nicht** fälschlich (kein Volltext-`grep -q "NEEDS_FIXES"` mehr).

- [ ] **AK7 – Ein Ort:** GIVEN die drei bisherigen Ad-hoc-Verdict-Prüfungen
  (`run-pipeline.sh:428`, `:460`, `report-verdict.sh`)
  WHEN der Code nach dem Fix betrachtet wird
  THEN existiert die Verdict-Erkennungslogik nur an **einer** Stelle (`report_verdict`), und beide
  `run-pipeline.sh`-Stellen rufen sie auf (ADR-019 §4).

- [ ] **AK8 – Bestehende Tests grün / migriert:** GIVEN die Shell-Test-Suite
  (`scripts/checks/tests/run-tests.sh`) inkl. der `--dry-run`-Integrationstests
  WHEN sie nach dem Fix läuft
  THEN ist sie grün; die Report-Mock-Fixtures tragen den korrekten Anker (`## Empfehlung` /
  `## Ergebnis`), und der bisherige „letztes Vorkommen gewinnt"-Test ist durch einen
  Anker-basierten Test ersetzt.

## Fehlerszenarien

- [ ] **F1 – Fehlender Anker (fail-closed):** GIVEN ein Report ohne die Anker-Überschrift
  (`## Empfehlung` bzw. `## Ergebnis`)
  WHEN `report_verdict` läuft
  THEN wird **kein** Verdict ausgegeben (leerer stdout, Exit 0) – **kein** Volltext-Fallback.
  Für den Phase-2-Loop bedeutet das „nicht bestanden" (Rework), für das Security-Gate „nicht
  blockiert", für den Report-Guard „Fehlversuch".

- [ ] **F2 – Anker-Zeile ohne gültiges Token:** GIVEN `## Empfehlung`, gefolgt von einer ersten
  nicht-leeren Zeile, die kein gültiges Verdict-Token enthält (z. B. `(noch offen)`)
  WHEN `report_verdict review <id>` läuft
  THEN wird kein Verdict ausgegeben (leerer stdout).

- [ ] **F3 – Fehlende Report-Datei:** GIVEN keine `tasks/review-<id>.md`
  WHEN `report_verdict` läuft
  THEN leerer stdout, Exit 0 (unverändertes Verhalten).

- [ ] **F4 – Mehrdeutige Anker-Zeile:** GIVEN eine Anker-Zeile, die **beide** Tokens enthält
  (z. B. unverändert aus dem Template kopiert: `APPROVED | NEEDS_REWORK`)
  WHEN `report_verdict` läuft
  THEN wird kein eindeutiger Verdict ausgegeben (leerer stdout, fail-closed) – kein stilles Raten.

## Offene Fragen

_Keine – die zwei Verhaltensentscheidungen (fehlender Anker → fail-closed; erste nicht-leere Zeile
nach der Überschrift) sind mit dem Entwickler geklärt (2026-07-23)._
