# Review: Task 420

Iteration 2 (nach Rework `953267b`). Diff-Basis: `git diff origin/main...HEAD` (16 Dateien,
+488/−93). Runden 1–3 direkt im Orchestrator-Kontext (kleiner Diff; Lesson #298/#267).
Iteration 1: NEEDS_REWORK (W1, N1–N3), siehe Abschnitt „Rework-Prüfung".

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

_Keine._

## Rework-Prüfung (Iteration 1 → 2)

- **N3 erledigt:** Q4 hat Ralf am 2026-10-19 fachlich entschieden: Der Leerzustand-Text bleibt
  unverändert. In spec-420:120 und in der Task-Datei ist Q4 geschlossen. Das deckt sich mit
  dem Code (`auslagen/page.tsx`, Leerzustand ohne Button) und mit der Glossar-Regel AK2.3.

- **W1 erledigt:** `AuslageForm.tsx:48/71-75` holt mit `primaerBeschriftung(bearbeiten)` die
  Beschriftung für beide Zweige. Ohne Teilnehmer steht beim Bearbeiten jetzt ein deaktiviertes
  „Speichern“. Die doppelten Literale sind weg. Abgesichert durch den Test
  `should_showDisabledSpeichern_when_bearbeitenOhneTeilnehmer` (`AuslageForm.test.tsx`). Der Test
  prüft auch die Gegenrichtung: kein „Erfassen“. Das Fehlerszenario ist in spec-420:102-104
  nachgetragen, der Verweis auf Issue #423 ist gesetzt.
- **N1 erledigt:** spec-406 AK1.7 hat den Hinweis „ergänzt durch spec-420 AK3“, AK1.8 den
  Hinweis „abgelöst durch spec-420 AK1.1“.
- **N2 erledigt:** Der AK3.4-Test vergleicht den `className` der Fußzeile mit dem Fall mit
  Teilnehmern, nicht mehr mit `justify-end`. Dazu kommen Reihenfolge und gemeinsames
  Elternelement.
- **Anker-Drift (Lesson #404/#291) nachgeprüft:** Der Rework hat in `AuslageForm.tsx` nur Zeilen
  unterhalb von Zeile 44 geändert. Der Glossar-Anker `AuslageForm.tsx:23` („Bitte wählen …“)
  stimmt weiter. Es gibt keine weiteren `docs/`-Anker auf `AuslageForm.tsx`/`AuslageErfassen.tsx`.
- **Gates:** Die betroffenen Unit-Tests laufen grün (`AuslageForm`, `AuslageErfassen`,
  `FormularDialog`, `auslagen/page`: 4 Dateien, 59 Tests). `pnpm lint` ist grün. Der Typecheck
  (`tsc --noEmit`) lief in dieser Review nicht, weil er nicht freigegeben war. Das Spreaden von
  `{ label, laufLabel }` in `DialogAktionen` ist typgleich zu den bisherigen Props. Das
  Build-Gate bleibt bei `/test` bzw. CI (Lesson #137). E2E wurde nicht erneut ausgeführt: Der
  Rework berührt nur den Bearbeiten-Zweig ohne Teilnehmer, und den deckt `auslagen.spec.ts`
  nicht ab.

## Positives

- `DialogAktionen` hat jetzt `deaktiviert` (Default `false`), statt dass eine zweite Fußzeile
  nachgebaut wird. AK3.4 ist damit strukturell abgesichert. `AbbrechenKnopf` bleibt Export,
  weil `TeilnehmerHinzufuegenDialog.tsx:171` ihn noch nutzt. Es entsteht kein toter Export.
- Die Rework-Lösung ist klein und beseitigt Duplikation: Eine Hilfsfunktion versorgt beide
  Zweige, das verhindert eine erneute Drift zwischen den Beschriftungen.
- `imLeerzustand` ist bei `AuslageErfassen` konsequent entfernt. `AnlegeDialog` behält den Prop
  für Teilnehmer und Artikel (AK2.3).
- Der Fokus-Vertrag ist vereinfacht: „+ Neu“ ist Auslöser und Fokusziel zugleich. Abbrechen und
  Escape sind je mit Fokus-Assertion getestet (Unit + E2E).
- Beide Richtungen sind getestet (AK3.2 ↔ AK3.5, `deaktiviert` ↔ nicht gesetzt,
  Erfassen ↔ Bearbeiten ohne Teilnehmer, Lesson #211). „Genau ein Button“ wird über
  `toEqual([neu])` belegt, nicht über eine Zählung.
- Glossar-Prüftabelle, ADR-061 D4 und spec-406 sind mitgezogen. `docs/routes.md` ist unberührt,
  es gibt keine Routenänderung. E2E-Locatoren sind exakt (Lesson #372), der Helfer `neuImKopf`
  ist zentralisiert.

## Empfehlung

APPROVED
