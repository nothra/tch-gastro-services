# Review: Task 406

> Iteration 3 · Diff `origin/main...HEAD` (33 Dateien, 12 Commits bis `38dc6de`), Schwerpunkt auf
> dem Rework `13336f2..38dc6de` (6 Dateien) · drei Runden (Logik, Code-Qualität, Architektur).
> Vitest der 8 betroffenen Dateien (`AktionsMenue`, `AuslageRow`, `ZeilenMenue`, `ListenZeile`,
> `AuslageForm`, `AuslageErfassen`, `[id]/auslagen/page`, `color-gate-wiring`): 158/158 grün.
> `scripts/checks/pre-commit.sh` (inkl. `pnpm lint`) grün. `pnpm typecheck` in dieser Session nicht
> gelaufen (Kommando nicht freigegeben) – der pre-push-Hook prüft ihn vor dem Push.
>
> Circuit Breaker: dritte Review-Runde auf diesem Code – Ergebnis APPROVED, keine Eskalation nötig.
>
> Iteration 2 (2 wichtige Findings): beide behoben und geprüft.
> 1. **Einträge während des Laufs:** `AktionsMenue` sperrt über `LaufKontext` jeden `MenueEintrag`
>    (`disabled || laeuft`). Der Konsument verdrahtet nichts, `ZeilenMenue` ruft `meldeLauf` nie
>    und bleibt deshalb unberührt. Tests: Baustein (Sperre + Freigabe nach Laufende) und
>    `AuslageRow` (`it.each` um „Bearbeiten"/„Löschen" erweitert, zusätzlich `offenerDialog()`
>    null; Freigabe nach Ablehnung).
> 2. **E2E:** `e2e/auslagen.spec.ts` + `bestaetigen-rueckmelden.spec.ts` gegen einen eigenen Dev-Server
>    gelaufen (4/4, Task-Datei). Die Sperre ist nur in jsdom belegt, weil sich eine verzögerte
>    Ablehnung im E2E nicht ohne Eingriff in die Action erzeugen lässt. Das ist ehrlich vermerkt
>    und akzeptabel.
>
> Nitpicks aus Iteration 2 erledigt: JSDoc `meldeLauf`, ADR-061 D1 (Eintrags-Sperre) und neuer
> Umbruch, ADR-060 Z. 41–45.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [ ] [app/veranstaltung/AuslageRow.tsx:213] `disabled={pending}` am Erstatten-Eintrag ist seit dem
  `LaufKontext` praktisch redundant: `meldeStart` setzt `laeuft` schon beim `onSubmit`, also vor
  `pending`. Als zusätzliche Absicherung harmlos. Nur entfernen, wenn es beim `/refactor` stört.
- [ ] [Arbeitsbaum, gitignoret] Die Wegwerf-Dateien `scripts/e2e406.tmp.sh`,
  `playwright-406.tmp.config.ts` und `e2e406-{dev,migrate,seed}.tmp.log` liegen noch herum
  (Lesson #372: direkt nach der Nutzung löschen). In der Task-Datei ist das als Aufgabe für den
  Menschen vermerkt. Spätestens vor `/test` entfernen, damit verzeichnisweite Scans sie nicht
  erfassen (Lesson #312).
- [ ] Aus Iteration 1 bewusst offen (in der Task-Datei begründet, keine Spec-Pflicht):
  Menü-Label-Eindeutigkeit, `STATUS_BADGE` in `labels.ts`, Busy-Text beim Erstatten, `role="menu"`-A11y-Runde.
  Zur A11y-Runde gehört auch: Nach einer Ablehnung steht der Tastaturfokus auf `<body>`, weil der
  gesperrte Eintrag den Fokus verliert. Das gab es vorher schon (`disabled={pending}`), es ist
  nicht neu.

## Out-of-Scope (klassifiziert nach ADR-018/ADR-043)

- Keine neuen. Aus Iteration 1 bestehen Issue #419 und der ergänzte Kleinfund (`login`-Kopie).

## Positives

- Die Sperre steht vollständig im Baustein (Lesson #369). Der Kontext statt eines `laeuft`-Werts
  in der `steuerung` verhindert, dass ein künftiger Konsument das Verdrahten vergisst. Das explizite
  `disabled` des Konsumenten bleibt per `||` erhalten.
- Ein `MenueEintrag` außerhalb eines `AktionsMenue` fällt auf den Kontext-Default `false` zurück:
  kein Laufzeitfehler, kein unerwartetes Sperren.
- Die Tests prüfen das Verhalten, nicht die Verdrahtung: Menü bleibt, kein Dialog geöffnet,
  Ablehnung als `alert` im Menü, danach wieder bedienbar. Beide Richtungen (gesperrt/freigegeben)
  sind belegt (Lesson #211).
- JSDoc und ADR-061 D1 beschreiben jetzt eindeutig, dass nur der Erfolg `schliessen` während des
  Laufs rufen darf. Damit ist die Falle für den nächsten Konsumenten benannt.
- Der E2E-Lauf folgt den Lessons (eigener Port, `localhost`, `db:migrate` + `db:seed`,
  Wegwerf-Config ohne `webServer`). Die Grenze der E2E-Abdeckung ist dokumentiert statt verschwiegen.

## Empfehlung
APPROVED
