# Review: Task 388

**Review-Iteration 2** (Stand `f10f959`, nach dem Rework auf die Findings aus Iteration 1). Geprüft wurde der Diff seit
Iteration 1 (`git diff 1a3af09..HEAD`: `kleinfunde.md`, Spec, Task-Datei – reine Textänderungen) sowie die Bilder und die
Capture-Spec unverändert gegen `origin/main` (`origin/main` ist nicht weitergelaufen). Die drei Runden hat der Reviewer
selbst ohne Sub-Agenten durchgeführt; er hat die Änderung mit entwickelt, deshalb wurden die geänderten Behauptungen
nachgemessen und nicht nur gelesen: die Zeilenanker gegen die Dateien, die Ursache gegen die DB des letzten Capture-Laufs
(lesende Abfragen), die #324-Aussage per `git show --stat`.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._ Beide Wichtig-Findings aus Iteration 1 sind behoben:

- **Ursache im Kleinfund und in den Task-Notizen:** Der Kleinfund nennt jetzt den Teilstring-Treffer von
  `hasText: "Bier"` auf „Weizenbier 0,5 l" (3,00 €) und den exakten Treffer als Fix. Nachgemessen am Stand der DB des
  Laufs: Anna Becker 2 × Weizenbier + 1 × Filterkaffee (7,50 €), Familie Klein 1 × Weizenbier + 1 × Schnitzel (12,00 €,
  stimmt zufällig), Bernd Wagner 1 × Alkoholfreies + 1 × Schnitzel – exakt so, wie der Text es beschreibt. Die Aussage,
  die übrigen Artikel seien eindeutig, trifft zu (alle drei kommen genau einmal im Sortiment vor). Die Anker `:173`,
  `:197`, `:252`, `:259` stehen am Stand `f10f959` unverändert an der beschriebenen Stelle.
- **Spec gegen den gelieferten Stand:** Q3 mit Datum und Begründung ist eingetragen, AK2–AK4 und AK6–AK8 sind
  abgehakt, AK1/AK5 als „zurückgestellt", AK9 als „angepasst" gekennzeichnet. Die Entscheidung („nur `05`–`07`
  liefern") steht damit in der Spec, nicht nur in der Task-Datei.

## Nitpicks (optional)

- [ ] [tasks/task-388-…md:19-28, :51] Die Task-Datei trägt die Akzeptanzkriterien noch in der Form vor dem Rework:
  `AK1`, `AK5`, `AK9` und die Sammelzeile „Siehe `docs/specs/spec-388-…md`" stehen als `[ ]`, und die Zeile `AK9:
  Kleinfund-Eintrag entfernt, Gates grün` beschreibt den Stand vor Q3 (die Spec sagt „angepasst: ersetzt statt
  entfernt"). Die Projektregel „Keine offenen Checkboxen in der Task-Datei → kein Done" lässt sich so nur mit einer
  offenen, erklärungsbedürftigen Ausnahme erfüllen. Vorschlag für den Abschluss (`/codify` bzw. vor
  `/pr-shepherd`): `AK1`/`AK5`/`AK9` im Wortlaut an Q3 angleichen („zurückgestellt: siehe Kleinfund" bzw. „Kleinfund
  ersetzt, Gates grün"), dann abhaken und die Sammelzeile abhaken – die Spec behält ihre offenen Kriterien als
  ehrlichen Stand. Kein Merge-Risiko.
- [ ] [docs/anleitung/veranstalter/bilder/07-zugang-teilen.png] Unverändert aus Iteration 1: Das Link-Feld zeigt nur
  `http://localhost:3388/t` (schmales Feld neben „Link kopieren", privater Test-Port); die alten Bilder zeigten
  `localhost:3000/theke/…`. Dokumentiert, Abbildung für den Zweck tauglich.
- [ ] [docs/anleitung/veranstalter/bilder/05-veranstaltung-fuehren.png] Unverändert aus Iteration 1: „Kassieren: 4 von 4
  bezahlt" bei 0,00 € Verzehr ist korrekt und im Fließtext erklärt, kann aber irritieren.

## Positives

- **Der Rework war genau so groß wie die Findings:** drei Textdateien, keine Bilder, keine Spec-Änderung am Code; der
  Diff seit Iteration 1 ist klein und gezielt.
- **Eine falsche Ursachenbehauptung wurde nicht nur korrigiert, sondern neu gemessen** (Abfrage der gesamten
  Verzehr-Positionen des Laufs, nicht nur der von Anna), bevor der Kleinfund umgeschrieben wurde. Damit ist auch die
  zufällig stimmende Summe von Familie Klein im Text erklärt.
- **AK6 weiter belegt:** Der Diff gegen `main` enthält an Bildern genau `05`, `06`, `07` (`git diff --name-status
  origin/main...HEAD`); `01`–`04`, `08`–`12` sind byte-identisch.
- **Die Folgearbeit bleibt kanonisch verankert** (`kleinfunde.md`: Capture-Spec/`10`–`12`, veraltetes `anleitung.pdf`
  mit korrekter Herkunft #324/#369/#388), und die Zusage „#324 hat den Text geändert" ist per `git show --stat`
  belegt (12 Einfügungen, 3 Löschungen in `anleitung.md`).
- **Gates:** Lint, Format, Typecheck und die Pre-Push-Gates liefen bei allen Pushes durch.

## Verlauf

- **Iteration 1** (Stand `f5e5a1d`): 0 kritische, 2 wichtige (falsche Ursache im Kleinfund, Spec nicht nachgezogen),
  3 Nitpicks, `NEEDS_REWORK`.
- **Iteration 2** (Stand `f10f959`): 0 kritische, 0 wichtige, 3 Nitpicks, `APPROVED`. Das war die zweite Anwendung auf
  **geänderten** Stand (drei Textdateien); der Circuit Breaker greift nicht.
- Keine Out-of-Scope-Funde in dieser Iteration.

## Empfehlung

APPROVED
