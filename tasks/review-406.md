# Review: Task 406

> Iteration 2 · Diff `origin/main...HEAD` (33 Dateien, 8 Commits bis `e47be68`), Schwerpunkt auf
> dem Rework `b384bdd..e47be68` (17 Dateien) · drei Runden (Logik, Code-Qualität, Architektur).
> Vitest der 9 betroffenen Dateien (inkl. `ZeilenMenue.test.tsx`): 157/157 grün, Coverage der
> 6 Produktivdateien (`AktionsMenue`, `ListenZeile`, `AuslageRow`, `AuslageForm`, `AuslageErfassen`,
> `ZeilenMenue`) 100 % (Statements/Branches/Functions/Lines). Lint/Typecheck in dieser Session
> nicht erneut gelaufen (Kommandos nicht freigegeben). E2E nicht gelaufen.
>
> Iteration 1 (4 wichtige Findings): alle vier behoben und geprüft – Sperre im `AktionsMenue`
> (Außenklick/Escape/Auslöser, Escape jetzt am Dokument), Farb-Gate-Gegenprobe auf ungelistete
> `.tsx` + `fatal`-Ausschluss im Helfer, `KARTEN_CLASS` statt behauptetem Drift-Anker, Nachträge in
> ADR-052/059/060. Nitpicks bis auf die bewusst offenen vier erledigt; Anker (`AuslageRow.tsx:143`,
> `ZeilenMenue.tsx:34`, `AuslageForm.tsx:24`, `AbschlussAktion.tsx:57-87`) gegen den Code geprüft.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [app/veranstaltung/AuslageRow.tsx:127-144 + app/components/ui/AktionsMenue.tsx:23-28, :78-84] **„Bearbeiten"/„Löschen" schließen das Menü auch während einer laufenden Erstattung – die Ablehnung verpufft weiter stumm (AK3.4, gleiche Fehlerklasse wie Iteration 1).** Die Sperre greift nur für Außenklick, Escape und Auslöser. Während `pending` ist nur der Erstatten-Eintrag `disabled` (Z. 213); „Bearbeiten" und „Löschen" bleiben bedienbar und rufen `schliessen()`, das laut JSDoc bewusst „frei" bleibt und `laeuft` zurücksetzt. Ablauf: „Als erstattet markieren" → sofort „Bearbeiten" → Menü hängt aus, `ErstattungUmschalten` samt `useActionState` ist weg, die Ablehnung erscheint nirgends (nur der Erfolg meldet sich noch per Toast). Lesson #369: Sperr-Vertrag in den Baustein, **alle** Wege prüfen. **Fix:** im Baustein lösen, z. B. sperrt `AktionsMenue` während `laeuft` alle `MenueEintrag`e (Kontext → `disabled`), oder `steuerung` liefert `laeuft` und der Konsument deaktiviert die anderen Einträge; Test mit offen gehaltener Action (Lesson #370): Klick auf „Bearbeiten" bzw. „Löschen" während des Laufs → Menü bleibt, Ablehnung als `alert` sichtbar.
- [ ] [tasks/task-406-auslagen-ui-grundlage-angleichen.md (Checkbox „Oberflächentest") + e2e/auslagen.spec.ts:27] **Die Opt-in-E2E-Spec ist nie gelaufen.** `e2e/auslagen.spec.ts` ist hinter `E2E_406=1` abgeschaltet, die Task-Checkbox ist offen. Genau die Teile, die jsdom nicht belegen kann (Escape/Außenklick am Menü, Fokus-Rückgabe, Escape am nativen `<dialog>`, jetzt auch die neue Sperre), sind damit unbelegt – Lesson #403 („Opt-in-E2E-Spec, die nie lief, belegt nichts") und Memo „Oberflächentests gehören in `/implement`". **Fix:** im Rework gegen den lokalen Dev-Server laufen lassen (eigener Port + `PLAYWRIGHT_BASE_URL`, `localhost`, geseedete DB – Lessons #368/#374/#370), zusammen mit `bestaetigen-rueckmelden.spec.ts`, und das Ergebnis in der Task-Datei festhalten. Falls die Freigabe fehlt: früh beim Menschen einholen, nicht bis zum Merge offen lassen.

## Nitpicks (optional)

- [ ] [app/components/ui/AktionsMenue.tsx:23-28] JSDoc „`schliessen` selbst bleibt frei: der Erfolg ruft es" – nach dem Fix oben präzisieren, dass nur der Erfolgspfad frei schließen darf (sonst lädt der Satz zum gleichen Fehler beim nächsten Konsumenten ein).
- [ ] [docs/adr/061-…-auslagen.md:46-49] Die Sperr-Beschreibung nennt Außenklick, Escape und Auslöser; mit dem Fix oben die Einträge ergänzen (Lesson #211).
- [ ] [docs/adr/060-listenzeile-dialog-ausloeser-notice-warnung.md:41-42] Der Nachtrag-Einschub macht Z. 42 ~110 Zeichen lang; der Rest des Absatzes ist auf ≤ 100 umbrochen.
- [ ] [docs/adr/061-…-auslagen.md:44-45, :91-92] Abgerissene Kurzzeilen nach dem Einfügen („`onClick`/`disabled`). Den" / „Tipp-Ziel und Menü. Das ist ein") – Absatz neu umbrechen.
- [ ] Aus Iteration 1 bewusst offen (in der Task-Datei begründet, keine Spec-Pflicht): Menü-Label-Eindeutigkeit bei mehreren Auslagen eines Teilnehmers, `STATUS_BADGE` in `labels.ts`, Busy-Text beim Erstatten (vorbestehend), `role="menu"`-A11y-Runde.

## Out-of-Scope (klassifiziert nach ADR-018/ADR-043)

- Keine neuen. Aus Iteration 1 bestehen Issue #419 und der ergänzte Kleinfund (`login`-Kopie).

## Positives

- Sperre sauber im Baustein (Lesson #369): `meldeLauf` passt direkt auf `onLaeuftChange` von `useSchliessendeAction`, Start per `onSubmit`/`meldeStart`, Ende im `finally` – kein neuer Mechanismus. `schliessen` setzt `laeuft` zurück, damit ein Erfolg (Ende kommt nach dem Schließen) das nächste Öffnen nicht sperrt – mit eigenem Test.
- Escape vom Popup an das Dokument verlegt, weil der deaktivierte Eintrag den Fokus verliert – mit WHY-Kommentar und Test „Fokus außerhalb des Menüs".
- `AuslageRow`-Tests decken alle drei Schließwege per `it.each` mit offen gehaltener Action ab und prüfen die Ablehnung danach im Menü; Gegenprobe „nach Ablehnung wieder schließbar" vorhanden.
- Farb-Gate: `fatal`-Ausschluss im Helfer schützt **alle** Fälle, nicht nur die Gegenprobe; ungelistete, nicht existierende `.tsx` kann nicht später ins Gate wandern (Lesson #371).
- `KARTEN_CLASS` als echte Bindung statt behauptetem Anker; ADR-061 benennt den verbleibenden Drift (`gap-3 p-3`) ehrlich.
- Nitpicks sorgfältig nachgezogen: exakte Zählung mit Herleitung (Lesson #322/#189), Reihenfolge-Assertion im Button-Modus mit `toBe(index + 1)` (Lesson #318), `zweck` im FormData, Neustart-Test für die Render-Funktion, ADR-061-API und Hinweis 2 korrigiert, Kleinfund-Anker und Datum aktualisiert.

## Empfehlung
NEEDS_REWORK
