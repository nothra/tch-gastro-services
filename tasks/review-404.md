# Review: Task 404

Iteration 2 · 2026-10-09 · Diff `origin/main...HEAD` (33 Dateien), Schwerpunkt Rework `e0275b1..HEAD`
(`0b891e0`, `b04b5aa`) · drei Runden (Logik, Code-Qualität, Architektur), im Orchestrator direkt
durchgeführt. Alle Funde gegen den Code nachgeprüft; betroffene Unit-Tests lokal grün
(`TeilnehmerHinzufuegenDialog.test.tsx`, `actions.test.ts`, `app/verwaltung/teilnehmer` – 234/234).

Iteration-1-Funde: alle vier Wichtig-Funde behoben (Fokus beim Schrittwechsel, E2E-Namen/Helfer,
Promise-Aufräumen nach Lesson #370, Zeilenverweise auf `actions.ts`); Nitpicks bis auf die
begründet abgelehnten zwei erledigt.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [docs/ux/glossar.md:187] Rezidiv des Iteration-1-Funds W4 (Lesson #375): Die Zeile verweist auf `app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:29` („Teilnehmer hinzufügen"). Durch den Rework (mehrzeiliger `Schritt`-Typ, WHY-Kommentar, `AUSWAHL_BEIM_OEFFNEN`) steht der Text jetzt in `:36`. Vor dem Rework stimmte `:29` (Hunk `@@ -23,7 +24,13`). Die Task-Datei sagt dazu „alle Tabellenzeilen per Grep geprüft“. Geprüft wurden aber nur die `actions.ts`-Zeilen, nicht die Anker in Dateien, die der Rework selbst geändert hat. Fix: `:29` → `:36`. Danach alle `Datei:Zeile`-Anker der Glossar-Tabellen gegen die Dateien prüfen, die dieser PR ändert (`TeilnehmerHinzufuegenDialog.tsx`, `schema.ts`, `TeilnehmerAnlegen.tsx`, `actions.ts`); die übrigen stimmen derzeit.
- [ ] [docs/factory/kleinfunde.md:46-47] Der in diesem PR angelegte Eintrag „`createWalkInAction`: Anlegen und Hinzufügen nicht atomar" empfiehlt das Gegenteil der Lesson #345: „mit `db.transaction()` bündeln (Lesson #345: nicht `runAtomic`)". Laut `docs/factory/lessons/db-drizzle.md:169-171` gilt: ausschließlich `runAtomic` (`db/atomic.ts`), **nie** `db.transaction()` direkt. Der Neon-HTTP-Treiber in INT/PRD wirft bei `.transaction()` „No transactions support in neon-http driver", lokal und in CI bleibt alles grün. Wer den Eintrag wörtlich umsetzt, baut genau den Fehler, der nur in Produktion auffällt. Fix: Fix-Zeile umdrehen (`runAtomic`, ID für den Teilnehmer vorab per `crypto.randomUUID()`, weil `.batch()` keine Abhängigkeit zwischen Abfragen erlaubt; Treiber-Mock-Test analog `db/catalog.duplicateCatalog-driver.test.ts`). Aufwandsschätzung entsprechend anpassen.

## Nitpicks (optional)
- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:164-169] `fokussieren` wird auch im Leer-Zweig (`verfuegbar.length === 0`) durchgereicht. Der Unit-Test `should_focusAbsprung_when_zurueckTapped` prüft aber nur den Kein-Treffer-Zweig, das E2E nur den Treffer-Zweig. Der Leer-Zweig (Anlegen → Zurück ohne verfügbare Teilnehmer) hat keine `toHaveFocus`-Assertion (Lesson #352/#211: beide Zweige eines aufgespaltenen Pfads belegen).
- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.test.tsx] Kein Test prüft, dass `zurueckVomAnlegen` beim erneuten Öffnen zurückgesetzt wird (Anlegen → Zurück → Abbrechen → Öffnen → Absprung **nicht** fokussiert). `should_notFocusAbsprung_when_dialogOpenedFresh` deckt nur das erste Öffnen ab. Den Reset hält `oeffnenBeiAuswahl` (`:54-57`); eine Regression dort bliebe unbemerkt.
- [ ] [docs/adr/053-detailseite-dialog-baustein-mehrfach-anlage-kennzahlen.md:59] Die Zeile ist nach der Rework-Einfügung nicht umbrochen (~125 Zeichen, Rest der ADR ≤ 100). Rein kosmetisch.
- [ ] [docs/adr/053-detailseite-dialog-baustein-mehrfach-anlage-kennzahlen.md:71-74] Der Fokus-Absatz nennt nur den Erfolgsfall (`ersatzFokusId`). Die neue Regel für den Schrittwechsel („der neue Schritt setzt den Fokus selbst“) steht nur im Code-Kommentar (`TeilnehmerHinzufuegenDialog.tsx:27-29`). Optional einen Halbsatz ergänzen, damit künftige mehrstufige Dialoge die Regel in der ADR finden.
- [ ] [docs/anleitung/veranstalter/bilder/06-teilnehmer-hinzufuegen.png] Unverändert offen als menschlicher Schritt vor dem Merge (Task-Datei). Die Capture-Spec legt jetzt „Clara Neumann" an, kollidiert also nicht mehr mit der Duplikat-Warnung; laut `kleinfunde.md` läuft sie aber weiterhin nicht bis zum Ende durch.

## Out-of-Scope (klassifiziert nach ADR-043)
_Keine neuen._ Aus Iteration 1 bestehen Issue #416 und der Kleinfund „`createWalkInAction` nicht atomar“ (siehe Wichtig-Fund 2 zu dessen Fix-Text).

## Positives
- Fokus beim Schrittwechsel sauber gelöst. Das Ziel hängt am Zustand (`Schritt.zurueckVomAnlegen`) statt an einem Effekt, und React-`autoFocus` greift genau beim Mount im schon offenen Dialog. Der WHY-Kommentar nennt Lesson #371. Unit-Tests decken beide Richtungen ab, dazu die Gegenprobe „beim Öffnen nicht". Das E2E prüft beide Ziele im echten Browser.
- Lesson #370 korrekt umgesetzt: Resolve-Liste, `afterEach` in `act`, und der Ablehnungstest prüft jetzt die angezeigte Meldung statt nur den Zustand des Knopfes.
- E2E-Namen konsequent je Lauf eindeutig (alle `LAUF`-Defaults auf `Date.now()`). F1 in `wechsel-…` hat einen eigenen Namen, weil die Tests parallel laufen. Der Kommentar des Helfers erklärt das Warum („Teilnehmer überleben ihre Veranstaltung“). Geprüft: alle zehn Aufrufer von `teilnehmerAnlegenUndHinzufuegen` nutzen eindeutige Namen.
- `AbbrechenKnopf` als Baustein in `FormularDialog.tsx`: Der Leer-Zweig hat keine Handkopie mehr, `DialogAktionen` nutzt denselben Knopf (Lesson #369).
- `useAuswahl` senkt die Props von `AuswahlSchritt` von 8 auf 6 und bündelt Suche und Auswahl dort, wo sie den Schrittwechsel überstehen müssen.
- Die ADR-053-Drift aus Iteration 1 ist behoben; der Widerruf zu D3 ist als markierter Nachtrag statt als stille Umschreibung eingetragen.
- Die Ablehnung der beiden Nitpicks ist in der Task-Datei begründet: `schema.ts` landet im Client-Bundle, ein Duplikat-Helfer mit DB-Zugriff würde `db/` dorthin ziehen. Das ist ein guter Architektur-Einwand.
- Alle AK1–AK8 und die Fehlerszenarien der Spec sind weiterhin erfüllt; keine Routen geändert → `docs/routes.md` nicht betroffen.

## Empfehlung
NEEDS_REWORK
