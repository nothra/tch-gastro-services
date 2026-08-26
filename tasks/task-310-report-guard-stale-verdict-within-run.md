# Task 310: report-guard-stale-verdict-within-run

## Status

- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Der Report-Guard in `run_skill()` (`scripts/run-pipeline.sh`, ADR-019 §4) honoriert einen
Verdict aus `tasks/review-<id>.md` / `tasks/security-<id>.md`, ohne zu prüfen, ob dieser
Verdict im aktuellen Skill-Aufruf entstanden ist. Dadurch gilt ein stehengebliebener Verdict
aus einer früheren Review-Iteration (bzw. aus einem früheren Pipeline-Lauf) als frischer
Erfolg – in Task 308 löste das den Circuit Breaker (Exit 2) aus, obwohl der Rework fertig und
unabhängig verifiziert grün war.

**Fix:** `run_skill()` merkt sich vor dem ersten `claude`-Versuch eines Aufrufs einen
Fingerprint der Report-Datei (bzw. „Datei fehlt") und honoriert den Verdict nur bei
verändertem Fingerprint. Nicht-destruktiv (kein Löschen), generisch für `review` **und**
`security-review` (deckt damit auch den Re-Lauf-Fall aus #91 ab), stale Verdict = regulärer
Fehlversuch im bestehenden Retry-Pfad (3 Versuche, dann `exit 1`).

Spec: [`docs/specs/spec-310-report-guard-frische-pruefung.md`](../docs/specs/spec-310-report-guard-frische-pruefung.md)

## Akzeptanzkriterien

- [x] AK1: Stale Report bei non-zero Exit → Fehlversuch statt Erfolg (Within-Run, #310)
- [x] AK2: Frisch geschriebener Report + Turn-Limit → weiterhin toleriert (ADR-019 §4)
- [x] AK3: Zuvor fehlende, im Aufruf neu geschriebene Report-Datei zählt als frisch
- [x] AK4: Re-Lauf mit committetem Report → Fehlversuch statt fail-open (#91)
- [x] AK5: `security-review` wird identisch behandelt
- [x] AK6: Retry-Semantik unverändert – `exit 1` nach 3 Versuchen, kein Circuit-Breaker-Exit 2
- [x] AK7: Fingerprint einmal pro `run_skill`-Aufruf vor dem ersten Versuch erhoben
- [x] AK8: Nicht-destruktiv – Report-Datei bleibt unverändert, kein `git status`-Effekt
- [x] AK9: Skill→Report-Datei-Zuordnung bleibt an einem Ort (`scripts/lib/report-verdict.sh`)
- [x] AK10: Nicht report-erzeugende Skills unverändert
- [x] AK11: E2E-Verhaltenstest (beide Richtungen) + Mutationsbeleg in `run-tests.sh`
- [x] AK12: ADR-019 §4 und Lesson-Absätze (#91/#310) im selben PR nachgezogen

## Technische Notizen

- Fingerprint über POSIX-`cksum` (portabel macOS/BSD/GNU/busybox, keine neue
  Capability-Prüfung); bei SHA-256 stattdessen das Muster aus `scripts/install-yq.sh`
  übernehmen.
- Neue reine Funktion neben `report_verdict` in `scripts/lib/report-verdict.sh` –
  Modul-Header („stellt EINE Funktion bereit") dabei mitpflegen.
- Nicht im Scope: `max_turns`-Kalibrierung, neuer Interrupt-Typ, Änderungen an
  `circuit_breaker_check()` / `MAX_REVIEW_ITERATIONS`, Preflight-Löschen von Reports.

### Umsetzungs-Notizen (`/implement`, 2026-08-27)

- **Kein ADR-Trigger:** Der Fix bleibt innerhalb der von ADR-019 §4 beschriebenen Guard-Mechanik
  (kein neues Werkzeug, kein neuer Vertrag, keine Persistenz-Entscheidung); ADR-019 wird
  lediglich um die Frische-Bedingung ergänzt (AK12). Keine der vier Trigger-Kategorien greift.
- **AK9 erweitert um `report_file`:** Damit die Frische-Prüfung dieselbe Skill→Datei-Zuordnung
  nutzt, ist der Pfad aus `report_verdict` in eine dritte Lib-Funktion `report_file` gezogen.
  `pipeline_summary()` baut seine Report-Pfade jetzt ebenfalls darüber – sonst hätte das
  Pfadmuster weiter in `run-pipeline.sh` gestanden. Zwei Abwesenheits-Guards sichern das.
- **AK7 dreigeteilt belegt:** „vor dem `claude`-Aufruf" folgt aus AK2 (sonst gälte nie etwas als
  frisch), „pro `run_skill`-Aufruf statt pro Pipeline-Lauf" aus AK1 (sonst würde der in
  Iteration 1 geschriebene Report die Iteration 2 durchwinken). Nur „vor der Schleife statt je
  Versuch" ist nicht behavioral unterscheidbar und daher als Zeilennummern-Vergleich plus
  Mutationsbeleg abgesichert.
- **`extract_verdict_header()` nachgezogen:** Die Lib hat jetzt zwei `case`-Blöcke über dieselben
  Skill-Namen; der Helper der #214-Guards wählt den Parser-Block über den `header='`-Filter,
  sonst hätte er die Pfad-Zeile aus `report_file` gelesen und wäre falsch rot geworden.
- **Kein Preflight-Löschen (#92):** Die nicht-destruktive Variante nimmt bewusst in Kauf, dass
  ein byte-identisch neu geschriebener Report als stale gilt – die Fehlrichtung ist fail-closed
  (ein zusätzlicher Review-Versuch), nie ein falscher Erfolg. Der #92-Vorschlag ist in der
  Lesson als „zunächst angedacht" historisiert.
- **Gates:** `bash scripts/checks/pre-commit.sh` grün (inkl. Lint); Bash-Suite
  `scripts/checks/tests/run-tests.sh` **1112 grün, 0 rot** (davon 48 neue #310-Assertions,
  `yq` vorhanden – kein `skip_yq`-Pfad).
- **Keine UI-Berührung:** Die Task ändert ausschließlich Shell-Skripte und Doku – kein
  Oberflächentest und keine E2E-/Dev-Server-Verifikation erforderlich.

## Offene Fragen

_Keine – Mechanik, Scope, Fehlerpfad und Turn-Budget sind entschieden (siehe Spec)._

## Review-Findings

<!-- Wird durch /review befüllt -->

## Codify-Notizen

<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---

Branch: `fix/310-report-guard-stale-verdict-within-run`
Erstellt: 2026-08-26 23:27
