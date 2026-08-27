# Task 312: verdict-konsum-frische-pruefung

## Status

- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Die in #310 eingeführte Frische-Prüfung des Report-Guards in `run_skill()`
(`scripts/run-pipeline.sh`) sitzt ausschließlich im **non-zero-Exit-Zweig**. Endet
`claude --print` mit **Exit 0**, kehrt `run_skill()` mit `return 0` zurück, ohne den erhobenen
`report_fingerprint_before` je anzusehen. Die beiden Verdict-Konsumenten lesen danach ungeprüft
die Report-Datei: Phase 2 (Vergleich gegen `APPROVED`, entscheidet über das Verlassen des
Review-Loops) und Phase 5 (Vergleich gegen `NEEDS_FIXES`, entscheidet über das Security-Gate).

Beendet `/review` einen Aufruf mit Exit 0, ohne seinen Report (neu) zu schreiben, liest Phase 2
einen stehengebliebenen `APPROVED` aus einer früheren Iteration oder einem früheren, committeten
Pipeline-Lauf – die Pipeline verlässt den Review-Loop, ohne dass in diesem Lauf ein Review
stattfand. Dieselbe fail-open-Richtung wie #91/#310, nur über den Erfolgs- statt den Fehlerpfad.

Der Fix macht die Prüfung **symmetrisch**: Für `review`/`security-review` gilt ein Aufruf – egal
mit welchem Exit-Code – nur als Erfolg, wenn der Report **in diesem Aufruf verändert** wurde
**und** einen eindeutigen Verdict enthält. Zusätzlich wird das Security-Gate in Phase 5 auf
fail-closed umgedreht (nur ein eindeutiges `PASSED` passiert), weil es heute auch einen völlig
fehlenden Report durchwinkt.

**Spec:** [`docs/specs/spec-312-verdict-konsum-frische-pruefung.md`](../docs/specs/spec-312-verdict-konsum-frische-pruefung.md)

## Akzeptanzkriterien

- [ ] AK1 (Kern, Phase 2): Exit 0 + unveränderter Report mit altem `APPROVED` → Fehlversuch, kein
      `return 0`, Meldung benennt den stale Verdict, Review-Loop wird nicht verlassen.
- [ ] AK2 (Regression Erfolgs-Pfad): Exit 0 + im Aufruf geschriebener Report mit gültigem Verdict
      → weiterhin Erfolg, Pipeline arbeitet mit diesem Verdict weiter.
- [ ] AK3 (gültiger Verdict verlangt): Exit 0 + frisch geschriebener Report **ohne** eindeutigen
      Verdict-Anker → Fehlversuch (schließt die Phase-5-Lücke „leerer Verdict passiert").
- [ ] AK4 (`security-review` stale): Exit 0 + unveränderter Report mit altem `PASSED` →
      Fehlversuch.
- [ ] AK5 (Interrupt hat Vorrang): signalisierter Interrupt + Exit 0 ohne frischen Report →
      sofortiger harter Stopp über `interrupt-check.sh`, kein Retry.
- [ ] AK6 (Retry-Semantik): drei Exit-0-Versuche ohne frischen, gültigen Report → `exit 1` mit
      „failed after 3 attempts", nicht Circuit Breaker (`exit 2`).
- [ ] AK7 (andere Skills unberührt): `implement`/`test`/`refactor`/`codify`/`pr-shepherd` mit
      Exit 0 → unverändert Erfolg, unabhängig von Report-Dateien.
- [ ] AK8 (Gate-Polarität Phase 5): Gate blockiert alles außer einem eindeutigen `PASSED`.
- [ ] AK9 (eine Bedingung, ein Ort): „frisch UND gültig" steht genau einmal im Code (gemeinsame
      Hilfsfunktion), gleicher Snapshot, gleiche Lib, kein Report-Pfad in `run-pipeline.sh`.
- [ ] AK10 (Meldungen unterscheidbar): Exit-0-Erfolgsmeldung bleibt von „Turn-Limit toleriert"
      unterscheidbar; alle bestehenden #310-Assertions bleiben grün.
- [ ] AK11 (E2E + Mutationsbeleg): E2E-Tests am echten Skript für beide Richtungen, aufgebaut auf
      dem vorhandenen #310-Harness; Mutation des echten Guard-Ausdrucks macht sie rot.
- [ ] AK12 (Gate-Polarität getestet): `PASSED` → weiter, `NEEDS_FIXES` → `exit 1`; die
      unerreichbar gewordene dritte Richtung per Vergleichs-Anker + Mutationsbeleg gepinnt.
- [ ] AK13 (Doku-Nachzug): ADR-019 §4 und der Report-Guard-Absatz in
      `docs/factory/lessons/factory-workflow.md` beschreiben die symmetrische Bedingung, die
      Verdict-Gültigkeit und die neue Gate-Polarität; Lesson-Regel um „alle Rückkehrpfade"
      geschärft.

## Technische Notizen

Entschieden am 2026-08-27 (vier Design-Forks, Details in der Spec unter „Scope"):

1. **Ort:** Prüfung in `run_skill()`, symmetrisch zum non-zero-Zweig – nicht in den Konsumenten.
   `run_skill()` kann dann per Konstruktion nie mit stale Report zurückkehren.
2. **Strenge:** frisch **und** gültiger Verdict (schließt die Phase-5-Lücke mit).
3. **Fehlerpfad:** Fehlversuch im bestehenden Retry (3 Versuche → `exit 1`), kein neuer
   Interrupt-Typ; Interrupt-Prüfung vor der Frische-Prüfung.
4. **Gate Phase 5:** Polarität gedreht auf „nur eindeutiges `PASSED` passiert".

Umsetzungshinweise (Volltext in der Spec, Abschnitt „Technische Hinweise"):

- Erfolgsbedingung beider Zweige ist nach dem Fix identisch → gemeinsame Hilfsfunktion (AK9);
  die **Meldungen** bleiben `rc`-abhängig, damit die #310-Assertions greifen (AK10).
- Exit-Code `set -e`-sicher einsammeln (`if … then rc=0; else rc=$?; fi`), kein nacktes
  `cmd; rc=$?`.
- `report_fingerprint_before` bleibt oberhalb der Retry-Schleife (AK7 aus #310 ist dort
  positionell getestet); `report_fingerprint_now` im Exit-0-Zweig neu erheben.
- Test-Harness `scaffold_310`/`commit_310`/`run_310` wiederverwenden, keinen parallelen
  Zweitaufbau (Lesson `testing.md`, 5. Vorkommnis des Duplikat-Scaffold-Smells). Fixture-IDs
  `310`–`313` sind belegt – für die neuen Tests andere IDs wählen.
- `--dry-run` kehrt vor jedem `claude`-Aufruf zurück; die neue Prüfung darf dort nicht greifen.

## Offene Fragen

_Keine._

## Review-Findings

<!-- Wird durch /review befüllt -->

## Codify-Notizen

<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---

Branch: `fix/312-verdict-konsum-frische-pruefung`
Erstellt: 2026-08-27 07:25
