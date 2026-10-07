## Codify-Report: Task 373

### Neue Regeln hinzugefügt
- `docs/factory/lessons/frontend-react.md` – `<form action>` setzt Eingaben auch nach einer Ablehnung zurück; Dialoge mit
  „Fehler bleibt im Dialog" brauchen `onSubmit` + `startTransition` – wegen: AK1.4, Designentscheidung von `FormularDialog`.
- `docs/factory/lessons/frontend-react.md` – Rezidiv der #371-Lesson: Dialog, dessen Erfolg den Auslöser unmountet, von
  Anfang an mit Fokus-Ersatzziel und Erfolgsfall-Test bauen; neuer Hook neben ähnlichem vorher abgleichen und
  route-neutral ablegen – wegen: Review-Iteration 1 W1 (Fokusverlust) und W2 (duplizierter Hook mit falscher Begründung).
- `docs/factory/lessons/factory-workflow.md` – Rezidiv der #391-Lesson: die menschliche Vor-Merge-Checkbox listet jedes
  betroffene Bild und zieht Unterschrift/„Stand" sofort nach – wegen: Review-Iteration 1 W3 (Bild 02 fehlte).
- `docs/factory/PROJECT-CONTEXT.md` – zwei neue Index-Zeilen (frontend-react), eine Index-Zeile erweitert (#391-Eintrag).

### Keine Änderungen nötig
- Security-Review: keine Findings, nur Hinweise (Rollen-Gate der Seite strenger als die Action, bewusst) – kein Lerneffekt.
- Review-Iteration 2 und die Nitpicks (doppelter `FormAction`-Typ) wurden bereits in `/refactor` bzw. der Task-Datei
  erledigt; kein Muster über die obigen hinaus.
- Out-of-Scope-Funde sind bereits angelegt (Issue #398, `kleinfunde.md`-Eintrag zu `Dialog.handleClose`).

### Empfehlung für nächste Features
- Vor dem Merge bleibt ein menschlicher Schritt: Anleitungs-Screenshots 02/03/04 und `anleitung.pdf` mit frisch
  geseedeter DB neu erzeugen (Kommando im Kopf von `e2e/anleitung-veranstalter.spec.ts`).
- Offen aus der Task: Abstimmung #181 (QR/Link/Druck) mit `/verwaltung/theke` beim Start von #181.
