# Task 310: report-guard-stale-verdict-within-run

## Status

- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
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
  Pfadmuster weiter in `run-pipeline.sh` gestanden. Gesichert über beide Seiten des
  Kopplungs-Guards: zwei Präsenz-Guards auf die `report_file`-Aufrufzeilen in
  `pipeline_summary()` und ein Abwesenheits-Guard gegen selbst gebaute Report-Pfade (ERE, deckt
  `${task_id}`/`$task_id`/`${TASK_ID}` ab – Rework nach Review-Nitpick).
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
  `scripts/checks/tests/run-tests.sh` **1127 grün, 0 rot** (davon 65 #310-Assertions – 48 aus
  der ersten Runde, 10 aus dem Rework der Review-Runde 1, 7 aus dem Nitpick-Nachlauf der
  Runde 2; `yq` vorhanden, kein `skip_yq`-Pfad). Zahlen jeweils gezählt, nicht geschätzt.
- **Keine UI-Berührung:** Die Task ändert ausschließlich Shell-Skripte und Doku – kein
  Oberflächentest und keine E2E-/Dev-Server-Verifikation erforderlich.

### Test-Verifikation (`/test`, 2026-08-27)

Unabhängiger Testing-Agent hat AK1–AK12 einzeln gegen die #310-Testblöcke in
`scripts/checks/tests/run-tests.sh` verifiziert (jeweils per Zeilenreferenz, Verhalten am
echten Skript geprüft, nicht nur Textvorhandensein) – keine Lücke gefunden, keine Ergänzung
nötig. Suite erneut ausgeführt: **1120 grün, 0 rot**. Keine Produktionsdatei angefasst.

## Offene Fragen

_Keine – Mechanik, Scope, Fehlerpfad und Turn-Budget sind entschieden (siehe Spec)._

## Review-Findings

Runde 1 (`/review`, Verdict `NEEDS_REWORK`, Bericht:
[`tasks/review-310.md`](review-310.md)) – keine kritischen Findings, drei wichtige, vier
Nitpicks. Rework in `/implement` (2026-08-27), Details je Finding im Bericht unter
„Rework":

- **W1 behoben:** `report_fingerprint` nutzt jetzt `cksum 2>/dev/null < "$file"`. Bash wertet
  Redirections links→rechts aus – mit der stderr-Umleitung *hinter* der Eingabe-Umleitung
  landete die „Permission denied"-Meldung trotzdem im Pipeline-Log. Reine Log-Hygiene, das
  Ergebnis war schon vorher fail-closed.
- **W2 behoben:** der `UNREADABLE`-Zweig ist getestet. Deterministischer Zugang über
  `PATH=/nonexistent-dir` (kein `chmod`/Root-Bezug), plus die Verhaltensaussage
  „fortbestehender Lesefehler = identischer Fingerprint = stale" und die Nicht-Kollision mit
  einer echten Prüfsumme. Die W1-Log-Hygiene ist zusätzlich behavioral gepinnt (stderr leer)
  **mit** Mutationsbeleg gegen eine Lib mit getauschter Reihenfolge; nur dieser
  `chmod 000`-Block läuft unter `id -u != 0` (root liest Modus 000) und meldet den Skip.
- **W3 behoben:** `scaffold_310()` setzt auf `_mk_pipe_repo` auf und ergänzt nur die Differenz
  (Interrupt-Pfad, Skill-Marker-Mocks, Task-Datei, `sleep`-Stub) – fünftes Vorkommnis des
  Duplikat-Smells aus `lessons/testing.md` (#240/#267), diesmal als *paralleler* statt
  erweiterter Helfer. Die #212-Inline-Blöcke bleiben unberührt (Fremd-Code); ihr
  `DEFAULTS`/`DEFAULTS_YML`-Doppel steht als Out-of-Scope-Fund in `kleinfunde.md`.
- **Nitpicks:** ADR-019 §4-Einleitungssatz um „in diesem Skill-Aufruf" ergänzt (§4 ist damit
  auf jeder Lesetiefe korrekt); AK9-Guards auf beide Seiten erweitert; `.issue-body-310.tmp.md`
  entfernt (Inhalt liegt als Issue #312).
- **Bewusst nicht umgesetzt:** die Subshell in `report_verdict` (`report-verdict.sh:79`) hinter
  das `case` zu ziehen. Sie fällt nur bei nicht report-erzeugenden Skills an und hat dort
  keinen messbaren Effekt; die Symmetrie zu `report_fingerprint` (Pfad in Zeile 1) wiegt mehr.
- **Out-of-Scope-Fund des Reviews:** Issue **#312** – der Verdict-Konsum in Phase 2/5 prüft die
  Frische nicht, wenn `claude` mit Exit 0 endet, ohne den Report neu zu schreiben. Eigene Spec
  nötig (berührt die Konsumenten, nicht den Guard).

Runde 2 (`/review`, Verdict `APPROVED`, Bericht: [`tasks/review-310.md`](review-310.md)) –
keine kritischen und keine wichtigen Findings; W1–W3 aus Runde 1 als behoben verifiziert.
Fünf Nitpicks bleiben offen (ADR-019-Artefaktliste `:165-166`, fehlender `interrupt-check.sh`
im Stale-Zweig `run-pipeline.sh:283-285`, totes `raise-interrupt.sh`-Scaffolding,
doppelte Verneinung in einer Assertion, Zahlendrift „56" statt 58 in den Gates-Notizen oben).
Kein neuer Out-of-Scope-Fund. Gates in der Review-Session: Bash-Suite **1120 grün, 0 rot**,
`pre-commit.sh` grün, Arbeitsbaum sauber.

Nitpick-Nachlauf zu Runde 2 (`/implement`, 2026-08-27) – vier der fünf umgesetzt, Details je
Nitpick im Bericht unter „Rework Runde 2":

- **Verhaltensrelevant (der einzige Code-Fix dieser Runde):** Der Stale-Zweig in
  `run_skill()` ruft jetzt `interrupt-check.sh` auf. Ohne die Zeile hätte dieser PR eine vor
  #310 bestehende Stopp-Bedingung verloren – ein Aufruf, der einen Interrupt signalisiert und
  danach non-zero endet, lief zuvor über den (damals erfolgreichen) Verdict-Zweig in den harten
  Stopp; seit der Frische-Prüfung wären zwei weitere Heavy-Versuche gefolgt, ohne
  Blocker-Eintrag in der Task-Datei. Neu abgesichert: E2E-Test mit echtem
  `raise-interrupt.sh`-Aufruf im `claude`-Stub (Interrupt erkannt, kein „failed after 3
  attempts", Blocker-Eintrag vorhanden) **plus** Mutant, der ausschließlich diese Aufrufzeile
  entfernt. Spec (Fehlerpfad-Bullet) und ADR-019 §4 sind im selben Commit nachgezogen – die
  Ausnahme ist damit dokumentiert, nicht implizit.
- **Doku/Test-Hygiene:** ADR-019-Artefaktliste auf „Verdict da **und** frisch" korrigiert;
  `raise-interrupt.sh` im Wegwerf-Repo ist durch den neuen Stub echt genutzt (kein totes
  Scaffolding mehr); Assertions-Zahl in den Gates-Notizen auf den gezählten Stand gebracht.
- **Bewusst offen gelassen:** die doppelte Verneinung in `run-tests.sh:5799`. Sie führt den
  Original-Assert-Ausdruck negiert aus, wie das #286-Learning es für Mutationsbelege verlangt;
  `[ -n … ]` wäre ein anderer Operator und damit ein schwächerer Beleg (gleiches Muster
  bereits bei `:5843`).

## Codify-Notizen

<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Kandidat aus dem Nitpick-Nachlauf (2026-08-27, Selbstfund): **Siebtes Vorkommnis von
„Kommando ≠ Prosa-Erwähnung" (#114)** – das Mutations-`awk` des neuen Interrupt-Tests ankerte
auf dem Dateinamen `interrupt-check.sh` und löschte damit die Erwähnung im WHY-Kommentar
**direkt über** der Aufrufzeile; der echte Aufruf blieb stehen, die Mutation war wirkungslos,
und der „Mutation greift"-Guard war nur deshalb grün, weil er dieselbe Fragment-Zählung nutzte.
Wie beim sechsten Vorkommnis (#284) war die Kollisionsquelle der eigene, im selben Commit
geschriebene Kommentar – und wie dort blieb der Mutationsbeleg dadurch stumm statt rot.
Verschärfung fürs Regelwerk: Bei Mutations-Guards ist der Anker die **vollständige
Aufrufzeile** (hier `bash "$FACTORY_DIR/scripts/checks/interrupt-check.sh"`), und die
Wirksamkeits-Zählung muss dieselbe exakte Zeichenkette zählen wie die Mutation löscht –
sonst belegen beide nur, dass irgendeine Zeile verschwand.

---

Branch: `fix/310-report-guard-stale-verdict-within-run`
Erstellt: 2026-08-26 23:27
