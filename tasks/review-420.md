# Review: Task 420

Diff-Basis: `git diff origin/main...HEAD` (14 Dateien, +389/−87). Runden 1–3 direkt im
Orchestrator-Kontext durchgeführt (kleiner Diff; Lesson #298/#267 zu Fork-Kontamination).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [app/veranstaltung/AuslageForm.tsx:55-61] **Im Bearbeiten-Dialog steht ohne Teilnehmerzeilen
  „Erfassen“.** Der Zweig `teilnehmer.length === 0` setzt `label="Erfassen"` /
  `laufLabel="Erfassen …"` fest, prüft `bearbeiten` aber nicht. `AuslageRow.tsx:151-161` nutzt
  dasselbe `AuslageFormular` für „Auslage bearbeiten“ mit derselben `teilnehmer`-Liste aus den
  Zeilen (`[id]/auslagen/page.tsx:39`). `removeZeileAction` (`actions.ts:427-446`) entfernt eine
  Zeile, auch wenn es zu ihr eine Auslage gibt (die Auslage bleibt mit Ersatzname,
  `db/auslage.ts:43-44`). Werden so alle Zeilen entfernt, zeigt der Dialog „Auslage bearbeiten“
  einen deaktivierten Button **„Erfassen“**. Nach Glossar und `AuslageForm.tsx:73-74` müsste dort
  „Speichern“ stehen. Vor diesem PR stand dort nur „Abbrechen“, die falsche Beschriftung ist also
  neu. **Fix:** dieselbe Auswahl `bearbeiten ? "Speichern" : "Erfassen"` (und für den Busy-Text)
  in beiden Zweigen verwenden, am besten als eine Konstante bzw. kleine Hilfsfunktion (das
  beseitigt nebenbei die doppelten Literale `:58-59`/`:73-74`). Dazu ein Test
  `should_showDisabledSpeichern_when_bearbeitenOhneTeilnehmer`. Dass die Auslage in diesem Fall gar
  nicht bearbeitet werden kann, war schon vorher so; das ist außerhalb des Scopes → **Issue #423**.

## Nitpicks (optional)

- [ ] [docs/specs/spec-406-auslagen-ui-grundlage-angleichen.md:76-78] AK1.8 (Leerzustand mit
  Aktion „Auslage erfassen“, Muster `imLeerzustand`) ist durch spec-420 AK1.1 abgelöst, hat aber
  keinen Hinweis darauf. Ein Satz wie „abgelöst durch spec-420 AK1.1“ verhindert, dass ein späterer
  Leser oder Agent den alten Leerzustand-Button für den Sollzustand hält (Lessons #253/#211). Gleiches
  gilt für AK1.7 („statt des Formulars den Hinweis“): ergänzt um spec-420 AK3.
- [ ] [app/veranstaltung/AuslageForm.test.tsx:271] `toHaveClass("justify-end")` prüft eine
  Stilklasse statt der Anordnung selbst. AK3.4 ist durch die Reihenfolge `["Abbrechen", "Erfassen"]`
  und das gemeinsame Elternelement schon belegt. Robuster wäre ein Vergleich mit der Fußzeile aus
  dem Fall mit Teilnehmern (gleicher `className` des Containers). Optional.
- [ ] [tasks/task-420-…md, spec-420 Q4] Q4 (Leerzustand-Text unverändert ohne Hinweis auf
  „+ Neu“) ist weiterhin offen und soll laut Spec „in der Review bestätigt“ werden. Aus Code-Sicht
  ist die Annahme stimmig (Glossar-Regel AK2.3, `+ Neu` sichtbar im Kopf); **fachliche Bestätigung
  durch Ralf** vor dem Merge einholen und Q4 schließen.

## Positives

- `DialogAktionen` um `deaktiviert` erweitert statt eine zweite Fußzeile nachzubauen. AK3.4 ist
  damit strukturell abgesichert, nicht nur durch einen Test, und `AbbrechenKnopf` fällt als
  direkter Import weg.
- `imLeerzustand` bei `AuslageErfassen` konsequent entfernt, der Seiten-Helper `erfassen(...)`
  ist aufgelöst. Kein toter Prop bleibt. Der Baustein `AnlegeDialog` behält `imLeerzustand` für
  Veranstaltung/Teilnehmer/Artikel, so wie AK2.3 es festlegt.
- Fokus-Vertrag: „+ Neu“ ist jetzt Auslöser **und** Fokusziel. Der Ersatz-Fokus-Pfad (Lesson
  #371/#373) fällt für die Auslagen-Seite weg. Abbrechen und Escape sind je mit Fokus-Assertion
  getestet (Unit + E2E).
- Tests decken beide Richtungen ab (AK3.2 deaktiviert ↔ AK3.5 aktivierbar,
  `deaktiviert` ↔ nicht gesetzt in `FormularDialog.test`), wie es Lesson #211 verlangt.
  „Genau ein Button“ wird mit `toEqual([neu])` statt per Zählung belegt.
- E2E-Lauf im selben `/implement`-Schritt gegen eigenen Dev-Server (Port 3420) belegt (Lessons
  #368/#403). Locatoren exakt (`exact: true`, Lesson #372), `neuImKopf` als Helfer zentralisiert.
- Die Glossar-Prüftabelle stimmt mit dem Code überein, nachgeprüft: `TeilnehmerAnlegen.tsx:23/31/42`,
  `ArtikelAnlegen.tsx:24/38/48-49`, Leerzustand-Auslöser `teilnehmer/page.tsx:35`,
  `ArtikelBereich.tsx:34`. Der Teilnehmer-Busy-Text steht tatsächlich schon unter #401
  (`glossar.md:189`). Anker `AuslageForm.tsx:23` stimmt.
- ADR-061 D4 mitgezogen (Lesson #211). `docs/routes.md` bleibt unberührt, keine Routen-Änderung.
  Weitere E2E-Konsumenten (`anleitung-veranstalter.spec.ts`, `bestaetigen-rueckmelden.spec.ts`)
  nutzen nur `erfasseAuslage` über „+ Neu“. Der Screenshot `09-auslagen.png` entsteht erst nach
  dem Erfassen und ist nicht betroffen (Lesson #391).

## Empfehlung

NEEDS_REWORK
