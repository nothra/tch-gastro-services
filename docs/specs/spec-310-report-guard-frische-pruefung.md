# Spec: Report-Guard prüft die Frische des Verdicts

## Kontext

Der Report-Guard in `run_skill()` (`scripts/run-pipeline.sh`, ADR-019 §4) wertet einen
non-zero Exit eines report-erzeugenden Skills (`review`, `security-review`) als **Erfolg**,
wenn `report_verdict` in der zugehörigen Report-Datei einen gültigen Verdict findet. Das ist
gewollt: `/review` schreibt seinen Report und reißt bisweilen **danach** das Turn-Limit – der
Lauf war inhaltlich fertig.

Der Guard prüft dabei aber nicht, **ob dieser Verdict im aktuellen Versuch entstanden ist**.
Er liest lediglich eine Datei, die aus einem früheren Aufruf stammen kann:

- **Within-Run (Issue #310, beobachtet in Task 308):** Die `REVIEW_ITERATION`-Schleife in
  Phase 2 ruft `/review` mehrfach auf und liest jedes Mal dieselbe Datei. In Task 308 erreichte
  `/review` in Iteration 2 **und** 3 das Turn-Limit (30), **bevor** ein neuer Report geschrieben
  war. Beide Male wertete der Guard den stehengebliebenen `NEEDS_REWORK` aus Iteration 1 als
  frischen Erfolg, zählte die Iteration – und der Circuit Breaker brach den Lauf nach zwei
  Iterationen mit Exit 2 ab, obwohl der Rework längst fertig und unabhängig verifiziert grün war
  (Gates grün, 736 Tests).
- **Re-Lauf (aus #91, bis heute offen):** Auf einem Branch mit bereits committetem Report gilt
  derselbe Mechanismus. Scheitert der erste `claude`-Aufruf sofort (Rate-Limit, Auth-Fehler,
  Crash), liest der Guard den **alten** `APPROVED`/`PASSED` und meldet Erfolg, ohne dass in
  diesem Lauf je ein Review stattfand – fail-open statt fail-closed.

Beide Varianten haben dieselbe Ursache und bekommen denselben Fix: Der Guard honoriert einen
Verdict nur noch, wenn sich die Report-Datei **seit dem Beginn dieses Skill-Aufrufs verändert**
hat.

## Scope

**Inbegriffen:**

- Frische-Prüfung im Report-Guard von `run_skill()` – generisch für **beide**
  report-erzeugenden Skills (`review`, `security-review`) und damit für jeden Aufruf:
  Review-Iterationsschleife (#310) **und** Pipeline-Re-Lauf (#91).
- Mechanik: **Fingerprint-Snapshot** (Inhalts-Prüfsumme bzw. Marker „Datei fehlt") **vor** dem
  ersten `claude`-Versuch eines Aufrufs; Verdict gilt nur bei verändertem Fingerprint.
  Nicht-destruktiv – die Report-Datei wird nicht gelöscht oder verändert.
- Fehlerpfad: Ein stale Verdict ist ein **Fehlversuch** im bestehenden Retry-Pfad
  (3 Versuche mit Backoff, danach `exit 1`). Kein neuer Interrupt-Typ.
- Skill→Report-Datei-Zuordnung bleibt an **einer** Stelle (`scripts/lib/report-verdict.sh`);
  die Frische-Prüfung nutzt dieselbe Quelle.
- Doku-Nachzug im selben PR: ADR-019 §4 (beschreibt die Guard-Mechanik namentlich) und
  `docs/factory/lessons/factory-workflow.md` (Absätze zu #91 und zur Within-Run-Variante #310).
- E2E-Verhaltenstest in der Bash-Suite (`scripts/checks/tests/run-tests.sh`).

**Nicht inbegriffen:**

- **Keine Änderung am Turn-Budget** (`max_turns: 30` für `review`/`security-review` bleibt) –
  das Turn-Limit ist die Ursache des Abbruchs, nicht des Fehlverhaltens.
- Kein neuer Interrupt-Typ (`STALE_REPORT` o. Ä.) und keine Änderung an der
  OPERATING.md-Interrupt-Tabelle.
- Keine Änderung an `circuit_breaker_check()` selbst (zählt weiterhin abgeschlossene
  Review-Iterationen) und keine Änderung an `MAX_REVIEW_ITERATIONS`.
- Keine Änderung am Verdict-**Parsing** in `report_verdict` (Anker-Semantik aus #211 bleibt).
- Kein Löschen von Report-Dateien im Preflight.

## Akzeptanzkriterien

- [ ] AK1 (Within-Run, Kern): GIVEN `tasks/review-<id>.md` enthält einen Verdict aus einer
      früheren Review-Iteration desselben Laufs, WHEN `/review` in einer Folge-Iteration mit
      non-zero Exit endet, **ohne** die Report-Datei zu verändern, THEN wertet `run_skill()`
      den Versuch als Fehlversuch (kein `return 0`) und gibt eine Meldung aus, die den stale
      Verdict als Grund benennt.
- [ ] AK2 (Regression ADR-019 §4): GIVEN dieselbe Ausgangslage, WHEN `/review` die Report-Datei
      mit einem gültigen Verdict neu schreibt und **danach** mit non-zero Exit endet
      (Turn-Limit), THEN gilt der Aufruf weiterhin als Erfolg und die Pipeline arbeitet mit
      diesem Verdict weiter.
- [ ] AK3 (Neuanlage): GIVEN vor dem Aufruf existiert keine Report-Datei, WHEN der Skill sie mit
      gültigem Verdict schreibt und danach non-zero endet, THEN gilt der Aufruf als Erfolg
      (Übergang „fehlt" → „vorhanden" ist eine Veränderung).
- [ ] AK4 (Re-Lauf, #91): GIVEN ein Branch mit bereits committetem Report samt gültigem Verdict
      aus einem früheren Pipeline-Lauf, WHEN der erste `claude`-Versuch des neuen Laufs
      scheitert, ohne die Datei zu berühren, THEN kein Erfolg, sondern Fehlversuch mit Retry.
- [ ] AK5 (`security-review` gleichbehandelt): GIVEN `tasks/security-<id>.md` enthält einen
      Verdict aus einem früheren Aufruf, WHEN `/security-review` non-zero endet, ohne die Datei
      zu verändern, THEN Fehlversuch – der alte Verdict wird nicht als Ergebnis dieses Laufs
      gewertet (weder `PASSED` noch `NEEDS_FIXES`).
- [ ] AK6 (Retry-Semantik unverändert): GIVEN alle drei Versuche eines Aufrufs enden mit
      unverändertem Report, WHEN der dritte Versuch scheitert, THEN bricht die Pipeline über den
      bestehenden Pfad mit `exit 1` und der Meldung „failed after 3 attempts" ab – nicht über den
      Circuit Breaker (`exit 2`).
- [ ] AK7 (Snapshot-Zeitpunkt): GIVEN ein Aufruf von `run_skill review`, WHEN er startet, THEN
      wird der Fingerprint genau **einmal vor dem ersten Versuch dieses Aufrufs** erhoben und für
      alle Versuche desselben Aufrufs als Referenz genutzt; jeder neue Schleifendurchlauf von
      Phase 2 erhebt ihn erneut.
- [ ] AK8 (nicht-destruktiv): GIVEN ein stale Report, WHEN der Guard ihn als stale erkennt,
      THEN bleibt die Datei inhaltlich unverändert auf der Platte (kein `rm`, kein Truncate) und
      die Prüfung verändert den `git status` nicht.
- [ ] AK9 (ein Ort): GIVEN die Skill→Report-Datei-Zuordnung in `scripts/lib/report-verdict.sh`,
      WHEN die Frische-Prüfung die zu prüfende Datei bestimmt, THEN nutzt sie dieselbe
      Zuordnung – die Pfadmuster `tasks/review-<id>.md` / `tasks/security-<id>.md` existieren
      nicht zusätzlich in `scripts/run-pipeline.sh`.
- [ ] AK10 (andere Skills unberührt): GIVEN ein nicht report-erzeugender Skill (`implement`,
      `test`, `refactor`, `codify`, `pr-shepherd`), WHEN er non-zero endet, THEN bleibt das
      Verhalten unverändert (Fehlversuch → Retry → `exit 1`), unabhängig von vorhandenen
      Report-Dateien.
- [ ] AK11 (E2E-Verhaltenstest): GIVEN die Bash-Suite `scripts/checks/tests/run-tests.sh`,
      WHEN sie läuft, THEN belegt ein E2E-Test mit `claude`-Stub **beide** Richtungen am echten
      Skript – stale Report → Fehlversuch (AK1) und frisch geschriebener Report → toleriert
      (AK2) – statt nur die Existenz der Prüfzeile zu greppen; ein Mutationsbeleg zeigt, dass
      der Test bei entferntem Frische-Vergleich rot wird.
- [ ] AK12 (Doku-Nachzug): GIVEN ADR-019 §4 und die Lesson-Absätze zu #91/#310 in
      `docs/factory/lessons/factory-workflow.md` beschreiben die Guard-Mechanik im Präsens,
      WHEN der Fix gemerged wird, THEN beschreiben beide Texte die umgesetzte Frische-Bedingung
      (inkl. Auflösung der Übergangsanweisung „bis dahin manuell prüfen").

## Fehlerszenarien

- [ ] Report-Datei fehlt vor **und** nach dem Aufruf → kein Verdict → Fehlversuch (unverändertes
      Verhalten, Frische-Prüfung ändert daran nichts).
- [ ] Report-Datei wurde verändert, enthält aber keinen oder einen mehrdeutigen Verdict-Anker →
      `report_verdict` liefert leer → Fehlversuch (fail-closed, unverändert aus #211).
- [ ] Report-Datei verändert, Verdict inhaltlich identisch zur Vorrunde (z. B. erneut
      `NEEDS_REWORK` mit neuem Text) → **frisch** → gilt, die Iteration zählt regulär.
- [ ] Report-Datei byte-identisch neu geschrieben → wird als stale gewertet → Retry. Bewusst
      in Kauf genommenes Restrisiko der nicht-destruktiven Variante: die Fehlrichtung ist
      fail-closed (ein zusätzlicher Review-Versuch), nie ein falscher Erfolg.
- [ ] Fingerprint nicht ermittelbar (Lesefehler, fehlendes Werkzeug) → fail-closed: der Verdict
      gilt als nicht belegbar frisch → Fehlversuch, nie stiller Erfolg.
- [ ] `--dry-run`: keine `claude`-Aufrufe, kein Guard-Durchlauf → Verhalten unverändert.

## Offene Fragen

_Keine – die vier Design-Forks (Mechanik, Scope, Fehlerpfad, Turn-Budget) sind am 2026-08-26
entschieden und oben unter „Scope" festgehalten._

## Technische Hinweise

- **Fingerprint-Werkzeug:** POSIX-`cksum` (auf macOS/BSD, GNU und busybox/Alpine vorhanden,
  Ausgabe = Prüfsumme + Bytegröße) genügt für reine Änderungserkennung und erspart eine neue
  Capability-Prüfung. Wird stattdessen SHA-256 genutzt, ist das bestehende Muster aus
  `scripts/install-yq.sh` (`sha256sum` → `shasum -a 256` → Abbruch) zu übernehmen, statt eine
  dritte Schreibweise einzuführen (Lesson `code-style.md`).
- **Ablageort:** Eine reine Funktion neben `report_verdict` in `scripts/lib/report-verdict.sh`
  hält Pfadwissen und Frische-Prüfung an einem Ort (AK9) und bleibt wie `report_verdict` ohne
  echten Pipeline-Lauf testbar. Der Modul-Header dieser Datei nennt heute genau eine Funktion –
  er ist beim Hinzufügen mitzupflegen (Lesson `code-style.md`).
