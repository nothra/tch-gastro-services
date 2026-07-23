## Codify-Report: Task 194

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – „Layout-Timing-Test-Stub
  (rAF) vor dem Neuschreiben im Verzeichnis suchen" – wegen: `IdentityGate.test.tsx` hat den
  `requestAnimationFrame`-Capture-Stub aus `FokusListe.test.tsx` (#188) blind noch einmal
  geschrieben, statt ihn im selben Routen-Verzeichnis wiederzufinden und zu teilen. Erst im
  Code-Qualität-Review aufgefallen (nicht in `/implement`), in `/refactor` behoben (gemeinsamer
  Helper `app/theke/[token]/raf-stub.ts`). Index-Zeile in `PROJECT-CONTEXT.md` ergänzt (Trigger:
  `/implement`, `/test` beim Schreiben eines Timing-/Browser-API-Stubs).

### Keine Änderungen nötig

- Die übrigen Review-Nitpicks (Nitpick: `useId()`+`aria-labelledby` statt `<label>`-Wrapping;
  eigene `selectClass` statt `inputClass`; unerreichbarer `?? ""`-Fallback aus #183) sind
  begründete Einzelfall-Entscheidungen bzw. vorbestehende, unveränderte Muster – kein
  wiederkehrendes Fehlermuster, das eine neue Regel rechtfertigt.
- Security-Review (`tasks/security-194.md`): PASSED ohne Findings – reine Client-Komponente ohne
  neue Angriffsfläche. Keine Lesson nötig.
- Kein ADR-Trigger (bestätigt in `/implement` Schritt 0 und im Architektur-Review-Runde 3) – kein
  Bedarf für eine neue Architektur-Regel.

### Empfehlung für nächste Features

- Bei künftigen Konvertierungen von Button-Listen auf native `<select>`-Dropdowns kann das
  `PlatzhalterSelect`-Muster aus `IdentityGate.tsx` (Platzhalter-Option + Auto-Weiter-`onChange`,
  extrahiert als kleine Wrapper-Komponente) als Vorlage dienen – ist aber (noch) kein
  wiederkehrendes Muster über mehrere Features, daher keine eigene Lesson, nur diese Notiz.
