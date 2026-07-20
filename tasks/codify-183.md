## Codify-Report: Task 183

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` (Bekannte Stolpersteine) – **`setState`-Updater-Funktionen
  müssen rein bleiben – keine Seiteneffekte darin.** Wegen: Review-Runde 1 fand, dass
  `FokusListe.toggle` Seiteneffekte (`writeZielId`, `scrollIntoView`) direkt in der
  `setOpenId((current) => …)`-Updater-Funktion ausführte statt nur den nächsten State zu
  berechnen – ein Verstoß gegen die React-Reinheitsgarantie für Updater (Doppelausführung unter
  StrictMode/Concurrent-Rendering, Cross-Component-State-Update während der Render-Phase). Der Fix
  (Commit `50f85e3`) delegiert an eine benannte `waehleZiel`-Funktion, die die Effekte im
  Event-Handler ausführt und danach rein `setState` aufruft. Dieses Muster war noch nicht
  codifiziert (verwandt, aber verschieden von der bestehenden `useActionState`+`useEffect`-Regel
  aus #49) und ist generisch genug, um in künftigen Tasks mit Akkordeon-/Toggle-Logik erneut
  aufzutreten – daher als eigener Stolperstein mit Vorher/Nachher-Codebeispiel und Review-Smell
  festgehalten.

### Keine Änderungen nötig
- **Coverage-Lücke `FokusListe.tsx:95` (positionen-Filter):** In `/test` gefunden, weil alle
  bisherigen Tests eine leere `positionen`-Liste nutzten und der Filter-Callback nie über ein
  Element lief. Das ist kein Prozessfehler, sondern der Coverage-Gate hat exakt so funktioniert
  wie vorgesehen (Lücke gefunden, Test nachgezogen, Verhalten statt nur Coverage-Zahl geprüft).
  Zu eng an diese eine Komponente gebunden, um eine generische Regel abzuleiten – die bestehenden
  Testing-Standards (100 % Coverage bei neuem Code, Verhalten statt Tautologie prüfen) decken den
  Fall bereits ab.
- **`erfasser-lookup`-Dedup (Refactor-Schritt, Commit `0072f85`):** Doppelte
  `zeilen.find((z) => z.id === erfasserId)`-Berechnung in zwei Branches – bereits durch die
  bestehende Clean-Code-Regel „keine Code-Duplikation" abgedeckt, kein neues Muster.
- **Übrige Nitpicks aus Review-Runde 1** (`?? ""`-Fallback, `aria-controls`) sind bewusste,
  begründete YAGNI-Entscheidungen (siehe Task-Datei) – keine wiederkehrenden Fehler, keine Regel
  nötig.
- Security-Review: PASSED, keine Findings, keine Learnings.

### Empfehlung für nächste Features
- Beim Einführen einer neuen Akkordeon-/Toggle-Komponente mit State + Persistenz + Scroll (Muster
  wie `FokusListe`) den neuen Stolperstein direkt beim Schreiben des ersten Entwurfs prüfen, statt
  erst im Review zu finden.
- Task 183 lief über zwei Review-Runden (1× NEEDS_REWORK, 1× APPROVED) und war ansonsten sauber
  (Security PASSED, Refactor nur 1 kleiner Fund) – der Zweischritt-Zustandsmaschinen-Ansatz aus
  ADR-035 hat sich in der Umsetzung bewährt, keine Architektur-Nacharbeit nötig.
