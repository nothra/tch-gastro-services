# Review: Task 404

Iteration 1 · 2026-10-09 · Diff `origin/main...HEAD` (26 Dateien) · drei Runden (Logik, Code-Qualität,
Architektur). Alle Kritisch-/Wichtig-Funde im Orchestrator gegen den Code nachgeprüft.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:89-98, :117, :268-275] Fokus geht beim Schrittwechsel verloren: Der Absprung („Teilnehmer anlegen" / „„X" als Teilnehmer anlegen") und „← Zur Auswahl" hängen sich mit dem Wechsel selbst aus, kein neues Fokusziel wird gesetzt (`Dialog.tsx` steuert den Fokus nur beim Öffnen/Schließen). Tastatur- und Screenreader-Nutzer landen auf `<body>` im modalen Dialog, der neue Titel wird nicht angesagt. Rezidiv der Lesson #371/#373 („Auslöser remountet → Fokus-Ersatzziel festlegen und testen"). Fix: beim Wechsel zum Anlegen das Namensfeld fokussieren, beim Zurück den Absprung-Button; je eine `toHaveFocus`-Assertion (Unit), Fokus im E2E einmal mitprüfen.
- [ ] [e2e/helpers/detailseite.ts:28-41] Der Helfer `gastHinzufuegen` kennt die neue Duplikat-Warnung nicht, sein Kommentar („Die Namen der Specs sind je Lauf eindeutig") stimmt nicht: `e2e/wechsel-verzehr-kassieren.spec.ts:22-23` legt `ZIEL` (`LAUF` Default `"a"`) in `:75` und erneut in `:155` an → beim zweiten Mal „Trotzdem anlegen", der Helfer wartet in `:39` auf das Schließen und läuft in den Timeout – schon im ersten Lauf auf frischer DB. Ab dem zweiten Lauf ebenso `veranstaltung-bearbeiten-loeschen.spec.ts:38` (Default `"a"`, `:165`, `:219/222`) und `anleitung-veranstalter.spec.ts:301` („Gastspieler" fest – das ist die Capture-Spec, die für den offenen Screenshot-Schritt gebraucht wird). Fix: Namen dort je Lauf eindeutig machen (`Date.now()`-Suffix als Default, wie in `kassieren-summe-abschluss.spec.ts:25`) bzw. in `wechsel-…` die zweite Veranstaltung den vorhandenen Teilnehmer auswählen lassen; Kommentar korrigieren. Helfer bei der Gelegenheit umbenennen (z. B. `teilnehmerAnlegenUndHinzufuegen`) – sein Rumpf ist ohnehin neu (Spec-Scope „soweit der Umbau sie berührt").
- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.test.tsx:435-482] Lesson #370 verletzt: `neverResolving()` (`:440`, `:458`) wird nie aufgelöst, kein `afterEach` in `act` – direkt danach läuft `should_unlockClose_when_actionRejected` (`:473-482`) im offen gehaltenen Scope und prüft nur `Abbrechen` enabled, nicht dass die Ablehnung angezeigt wurde (grün aus dem falschen Grund möglich). Fix: Resolve-Liste + `afterEach` in `act`; im Ablehnungstest zusätzlich `getByRole("alert")` mit dem Fehlertext assertieren.
- [ ] [docs/ux/glossar.md:157-159] Die Zeilenverweise der #401-Tabelle auf `app/veranstaltung/actions.ts` sind durch diesen Diff um 7 Zeilen verrutscht (Import-Aufteilung + neue State-Felder): `:339`→`:346`, `:335`→`:342`, `:96–99`→`:103–106`, `:93`→`:100`. Die Tabelle wurde im selben PR bearbeitet (`:162-163`, `:187`), diese Zeilen nicht (Lesson #375: Abweichungsliste nach jeder Änderung neu greppen).

## Nitpicks (optional)
- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:156-160] „Abbrechen" im Leer-Zweig ist eine Handkopie aus `DialogAktionen` (`FormularDialog.tsx:183-185`), Container weicht schon ab (`flex justify-end` vs. `flex flex-wrap justify-end gap-2`). Lesson „Verhaltensvertrag in den Baustein" (#369): `DialogAktionen` ohne Absenden-Knopf aufrufbar machen oder einen `AbbrechenKnopf` exportieren.
- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:254-255] Kommentar „Jede Ablehnung betrifft den eingegebenen Namen …" ist zu absolut – auch Zod-Fehler zu `typ`/`mitglied` landen am Namensfeld (über die UI kaum erreichbar). Enger formulieren.
- [ ] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:123-132] `AuswahlSchritt` hat 8 Props (Guideline: max. 3). Vertretbar wegen gehobenem Zustand (WHY steht in `:76-78`); ein Hook `useAuswahl()` in `DialogInhalt`, der ein `auswahl`-Objekt liefert, würde es auf 5 senken.
- [ ] [app/veranstaltung/actions.ts:412-415, app/verwaltung/teilnehmer/actions.ts:37-40] Die Duplikat-Prüfung ist zweimal identisch kopiert; der Wortlaut ist zusammengezogen, die Prüfung nicht. Zugleich ist der State-Typ dreimal deklariert (`DuplikatWarnung.tsx:4-7`, `TeilnehmerFormState`, `VeranstaltungFormState:90-92`) – `DuplikatState` + Prüf-Helfer neben `TEILNEHMER_DUPLIKAT_WARNUNG` in `schema.ts` würde beides bündeln, und die Actions importierten keinen Typ aus einer UI-Datei.
- [ ] [docs/adr/053-detailseite-dialog-baustein-mehrfach-anlage-kennzahlen.md:57-58, :63-64, :121, :161] ADR-Drift: `:57-58` nennt `useFormularDialog` als Lauf-Melder – tatsächlich meldet `useDialogFormular` (`FormularDialog.tsx:78-81`), `useFormularDialog` hält die Sperre; `:63-64` führt `TeilnehmerHinzufuegenDialog` weiter als direkten Nutzer von `useSchliessendeAction`; `:121` („„Neuer Gast" bleibt `createWalkInAction` unverändert") steht unmarkiert vor dem Nachtrag, der es widerruft; `:161` „`+ Teilnehmer`-Dialog" im Präsens.
- [ ] [app/components/FormularDialog.tsx:14] Kopfkommentar „Hülle … der Listenseiten" – seit #404 nutzt auch die Detailseite sie.
- [ ] [e2e/teilnehmer-anlegen.spec.ts:89, :96, :130, :135] Locatoren ohne `exact: true` (Lesson #372/#388); umgekehrt macht `exact: true` in der Abwesenheitsprüfung `:78` sie schwächer (ein zurückkehrendes „Anzeigename" fiele nicht auf).
- [ ] [app/veranstaltung/actions.test.ts:1014, :1078] Fixture-Name „Neuer Gast" liest sich nach dem Umbau irreführend; der Test „notWarn_when_veranstaltungClosedAndNameDuplicate" prüft nicht, dass `createTeilnehmer`/`addZeile` ausbleiben (AK4.4 „weder Teilnehmer noch Zeile").
- [ ] [app/verwaltung/teilnehmer/TeilnehmerFields.tsx:3] Der neue Import von `./schema` zieht `zod` und `@/db/schema` in die Client-Bundles der Verwaltung (für den Detail-Dialog war das schon so). Optional: `TEILNEHMER_NAME_MAX` in ein abhängigkeitsfreies Modul.
- [ ] [docs/anleitung/veranstalter/bilder/06-teilnehmer-hinzufuegen.png] Zeigt noch „Neuer Gast" – bereits als menschlicher Schritt vor dem Merge in der Task-Datei vermerkt; hängt am zweiten Wichtig-Fund (Capture-Spec „Gastspieler").

## Out-of-Scope (klassifiziert nach ADR-043)
- **Issue #416** – Duplikat-Bestätigung an den gewarnten Namen binden: `confirmDuplicate` bleibt nach einer Warnung „true", auch wenn der Name danach geändert wird (`DuplikatWarnung.tsx:16`) → ein zweites Duplikat entsteht ohne Warnung. Reproduzierbar, älter als #404 (Verwaltung), gilt seit #404 auch beim Anlegen aus der Veranstaltung.
- **kleinfunde.md** – „`createWalkInAction`: Anlegen und Hinzufügen nicht atomar" (`actions.ts:405-418`, nur im Rennen zweier Geräte, älter als #404).

## Positives
- Reihenfolge in `createWalkInAction` (Rolle → Veranstaltung offen → Zod → Duplikat, `actions.ts:401-415`) ist begründet und per Test „should_notWarn_when_veranstaltungClosedAndNameDuplicate" gegen „Trotzdem anlegen läuft in die nächste Ablehnung" abgesichert.
- `TeilnehmerFields` wird jetzt wirklich von Verwaltung und Anlege-Schritt geteilt; Nachbau im `GastBereich` und der zugehörige `kleinfunde.md`-Eintrag sind weg (AK6). `DuplikatWarnung`/`anlegenLabel` beseitigen Copy-Paste; Warnungstext liegt korrekt in `schema.ts` (eine `"use server"`-Datei darf nur async-Funktionen exportieren).
- Der Dialog nutzt jetzt dieselben Bausteine wie die Listenseiten (`useFormularDialog`/`useDialogFormular`/`DialogAktionen`); der eigene Lauf-Zähler entfällt. `onSubmit` + `startTransition` lässt die Eingaben nach der Duplikat-Warnung stehen (Lesson #373).
- Zustand sauber verortet: Schritt beim Konsumenten (Titel hängt davon ab), Suche/Auswahl in `DialogInhalt` – übersteht den Schrittwechsel (AK3.2), beginnt bei jedem Öffnen frisch (ADR-053 D1); beides kommentiert und getestet.
- AK3.3 in beiden Richtungen getestet (mit Treffer leerer Name, ohne Treffer Suchtext), Unit und E2E. Knopf-Listen-Assertions (`:112`, `:343`) schützen gegen zusätzliche Bedienelemente.
- Token-Gate gepflegt (`DuplikatWarnung.tsx` in `eslint/ui-token-files.mjs`); Glossar-Texte stimmen mit dem Code überein; keine Routen geändert → `docs/routes.md` nicht betroffen; E2E-Daten mit `__test__`-Präfix und Lauf-Suffix.
- Alle AK1–AK8 und Fehlerszenarien der Spec sind in Code und Tests umgesetzt; „Anzeigename"-Zod-Meldungen sind bewusst an #401 übergeben (Spec: Schema unverändert).

## Empfehlung
NEEDS_REWORK
