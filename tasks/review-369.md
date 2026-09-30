# Review: Task 369

Runde 1 (Logik), Runde 2 (Code-Qualität) und Runde 3 (Architektur) liefen nacheinander über
`git diff origin/main...HEAD` (Stand `7123c8c`). Die tragenden Behauptungen der Wichtig-Findings
hat der Orchestrator selbst im Code nachgeprüft (`Dialog.tsx`/`ConfirmDialog.tsx`, `hasSqlState`
im Katalog gegen `drizzle-orm/pg-core/session.js`).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] [app/components/ui/ConfirmDialog.tsx:46 · app/components/ui/Dialog.tsx:46-51] Escape umgeht die
  `pending`-Sperre. `pending` sperrt nur die beiden Schaltflächen. `Dialog.handleCancel` ruft bei
  Escape aber immer `onClose()` auf. Damit tritt genau der Fall ein, vor dem der JSDoc
  (`ConfirmDialog.tsx:23-26`) warnt: Der Dialog schließt, der Server entfernt trotzdem. Lehnt der
  Server ab (AK20), sieht niemand die Meldung, denn beim nächsten Öffnen setzt `key={durchlauf}` sie
  zurück. Vorschlag: Während `pending` an `Dialog` ein No-op-`onClose` reichen (oder ein
  `dismissible`-Prop). Test: `cancel`-Event bei `pending: true` → `onClose` wird nicht aufgerufen.
- [x] [app/components/ui/Dialog.tsx:39] Der Fokus-Rücksprung (AK15/AK30) hängt an
  `document.activeElement` beim Öffnen. Safari (macOS und iOS, eine Zielplattform der PWA) fokussiert
  einen `<button>` beim Tipp nicht; `activeElement` ist dann `<body>`. Dadurch kehrt der Fokus bei
  „+ Teilnehmer" und „Link & QR teilen" nicht zurück. Die Tests rufen vorher `trigger.focus()` auf
  (`TeilnehmerHinzufuegenDialog.test.tsx:184`) und belegen deshalb nur den Chromium-Fall.
  `ZeilenMenue` ist nicht betroffen, weil es den Auslöser selbst fokussiert. Vorschlag: Das
  Rücksprungziel explizit übergeben (z. B. `returnFocusRef` oder den Auslöser im Öffnen-Handler
  fokussieren, wie es `ZeilenMenue` schon tut).
- [x] [app/components/ui/ConfirmDialog.tsx:32 · app/veranstaltung/ZeilenMenue.tsx:21-23,48,89,112-121 ·
  docs/adr/053-…:45-47 · app/components/ui/Dialog.tsx:22-26] Das Versprechen „jedes Öffnen beginnt mit
  frischem Formularzustand" gilt nur für Zustand **in** den Kindern. Beim `ConfirmDialog` liegt
  `useActionState` beim Konsumenten. `ZeilenMenue` braucht deshalb den `durchlauf`-Key-Trick und
  kopiert zusätzlich den Wrapper „Action umschließen, bei `ok` schließen" fast wörtlich aus
  `TeilnehmerHinzufuegenDialog.tsx:59-70` (`useSchliessendeAction`). #372 würde beides für vier
  weitere Dialoge wiederholen. Vorschlag: Den Hook in ein gemeinsames Modul ziehen und in beiden
  Konsumenten nutzen. Zusätzlich die Einschränkung in `ConfirmDialog`-JSDoc und ADR-053 D1 nennen,
  alternativ den Action-State in `ConfirmDialog` verlegen (`action` + `onSuccess`).
- [x] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:155-188] „Neuer Gast" (`GastBereich`) baut
  Name, Typ (samt `TYP_LABEL`) und Mitglied aus `TeilnehmerFields` nach. Die gelöschte `WalkInForm`
  nutzte `TeilnehmerFields` ausdrücklich gegen Duplikation
  (`app/verwaltung/teilnehmer/TeilnehmerFields.tsx:11`). Beide Varianten laufen schon auseinander:
  nur die neue hat `maxLength={200}` (Z. 170, magische Zahl aus `teilnehmerSchema`), und die
  Beschriftung heißt einmal „Name", einmal „Anzeigename". Der vermutliche Grund (rohe Farbklassen in
  `TeilnehmerFields`, AK31) steht nirgends. Vorschlag: WHY-Kommentar mit Verweis ergänzen, die Grenze
  200 aus einer benannten Konstante beziehen und die Zusammenführung kanonisch festhalten
  (`kleinfunde.md`). Alternativ `TeilnehmerFields` auf Bausteine umstellen und wiederverwenden.
- [x] [docs/adr/053-detailseite-dialog-baustein-mehrfach-anlage-kennzahlen.md:75-86] ADR-Drift zu D3 und
  D2 (ADR im selben PR entstanden, Lessons #55/#211). Der Code (`actions.ts:331-350,375-378`) prüft vorab
  auch **bereits erfasst** (zweite Abfrage `listZeilen`) und liefert namentliche Meldungen („Bereits
  erfasst: …" / „Nicht mehr wählbar: …" + „Es wurde niemand hinzugefügt."). `revalidatePath` läuft
  bei jeder Ablehnung, `23505` fängt nur noch das Rennen zweier Geräte ab. Die Aktivprüfung zählt
  **und** filtert `!active`. In D2 fehlt, dass `removeZeileAction` von `void` auf einen
  Rückgabe-State wechselt (Voraussetzung für AK20). Vorschlag: D3/D2 nachziehen.
- [x] [docs/anleitung/veranstalter/anleitung.md:98,111,121] Die Bilder `05`/`06`/`07` zeigen noch das
  alte Layout. Text und Alt-Texte beschreiben schon Kacheln und Dialoge. Die Lücke steht nur als
  Task-Notiz. Vorschlag: Vor dem Merge gegen eine frisch geseedete DB mit `CAPTURE_ANLEITUNG=1` neu
  erzeugen und dabei `10`/`11` (Abschließen am Ende von Kassieren) mitprüfen. Sonst die Lücke
  kanonisch festhalten, nicht nur als Task-Notiz (Lesson #345).
- [x] [e2e/anleitung-veranstalter.spec.ts:141 · e2e/wechsel-verzehr-kassieren.spec.ts:57 ·
  e2e/veranstaltung-bearbeiten-loeschen.spec.ts:87 · e2e/veranstaltung-detailseite.spec.ts:80,97-99]
  Den E2E-Helfer für den Gast-Dialog gibt es jetzt viermal, `oeffneEinstellungen` zweimal in
  unterschiedlicher Form. Die Variante in `veranstaltung-detailseite.spec.ts:97-99` klickt ohne
  `open`-Prüfung und würde ein offenes `<details>` wieder schließen. Vorschlag: gemeinsames Modul
  `e2e/helpers/…` mit der abgesicherten Variante.

## Nitpicks (optional)

- [x] [app/veranstaltung/TeilnehmerHinzufuegenDialog.tsx:86-92] FS2-Meldung kann verschwinden: War der
  abgelehnte der letzte verfügbare Stammteilnehmer, wird `verfuegbar` leer, und der Zweig „Alle
  aktiven Stammteilnehmer sind bereits erfasst" rendert keine `Notice` mit `state?.error`.
- [x] [app/veranstaltung/actions.ts:384-386] Die Meldung im Rennen („Dieser Teilnehmer ist bereits
  erfasst.") steht in der Einzahl, nennt keinen Namen und lässt „Es wurde niemand hinzugefügt." weg.
  FS2 verlangt die Namensnennung. Mindestens den Zusatz aus `nichtsAngelegt` angleichen.
- [x] [app/veranstaltung/actions.ts:339] Unbekannte Ids → „Teilnehmer nicht gefunden." ohne den
  Zusatz „Es wurde niemand hinzugefügt.". Der Test `should_rejectAndPersistNothing_when_teilnehmerIdUnknown`
  prüft `revalidatePath` nicht, obwohl der Zweig ihn auslöst.
- [x] [app/veranstaltung/actions.ts:431-432] Bei `ZEILE_NOT_FOUND` (schon auf einem anderen Gerät
  entfernt) fehlt `revalidatePath`, die veraltete Zeile bleibt in der Liste stehen.
- [x] [app/veranstaltung/TeilnehmerHinzufuegenDialog.test.tsx:195] Der Escape-Test prüft nicht den
  Fokus-Rücksprung (AK15 verlangt ihn auch bei Escape), nur generisch in `Dialog.test.tsx:79`.
- [x] [app/veranstaltung/schema.test.ts] `should_reject_when_idTooLong` prüft nur die Ablehnung, nicht
  die Meldung „Ungültige Teilnehmer-Auswahl." (Lesson #116). Der Grenzfall „genau 100 Zeichen
  akzeptiert" fehlt.
- [x] [app/veranstaltung/actions.test.ts:1329] `ensureThekeAction` profitiert jetzt nebenbei von der
  `cause`-Prüfung in `isUniqueViolation` (alter stiller Fehler behoben). Der Test nutzt aber noch die
  unumhüllte Form `{ code: "23505" }`. Fall mit umhülltem Fehler ergänzen und in den Task-Notizen
  vermerken.
- [x] [app/veranstaltung/actions.ts:399,178,468] Das Literal „Keine Veranstaltung angegeben." steht
  neben der vorhandenen Konstante `KEINE_VERANSTALTUNG`.
- [x] [app/veranstaltung/[id]/ArbeitsschrittKacheln.tsx:10-18] `segment` und `kennzahl` sind in allen
  drei Einträgen identisch. Ein Feld `schritt: keyof KachelKennzahlen` reicht.
- [x] [app/veranstaltung/[id]/Abschlussbericht.tsx:20-26] `flex flex-col gap-3` steht doppelt (auf
  `Card` und `<section>`). `<section>` ohne `aria-labelledby` ist kein benannter Bereich.
- [x] [app/veranstaltung/[id]/page.test.tsx:388-394] `should_notRenderOldForms…` ist immer grün (Dialog
  gestubbt, Altformulare gelöscht) und belegt nichts. Entfernen oder umformulieren.
- [x] [e2e/veranstaltung-bearbeiten-loeschen.spec.ts:71-72] Der Kommentar nennt noch „Teilnehmer
  erfassen, Status" als Formulare der Detailseite.
- [x] [docs/adr/034-selbstbedienung-token-zugang.md:85-86 · docs/adr/052-*.md:18,44-47] ADR-034 D6
  spricht noch vom Abschnitt „Zugang teilen". ADR-052 D1 nennt „sechs Bausteine" (jetzt acht) ohne
  Rückverweis auf ADR-053 D1. Je ein Satz Nachtrag reicht (Lesson #211).
- [ ] (bewusst offen, siehe Rework) [app/veranstaltung/kachelKennzahlen.ts:37-39] Die Auslagen-Kachel zeigt offen + erstattet als
  eine Zahl, die Unterseite beide getrennt. Durch ADR-053 D4 gedeckt; eventuell in der Anleitung
  erwähnen.

### Außerhalb des Scopes (über den Seam angelegt, ADR-018/ADR-043)

- **#385** (`bug`, `test`): `hasSqlState` in `app/verwaltung/katalog/actions.ts:35-49` prüft nur
  `error.code`. Drizzle ≥ 0.44 legt den SQLSTATE auf `DrizzleQueryError.cause`
  (`drizzle-orm/pg-core/session.js:41ff`, auch neon-http; belegt durch `db/veranstaltung.test.ts:284`).
  Duplikat- und FK-Meldungen greifen in Produktion vermutlich nie, die Unit-Tests stellen die
  unumhüllte Form nach.
- **#386** (`enhancement`): „Entfernen" löscht Verzehr (`onDelete: cascade`, `db/schema.ts:294`) und
  Kassiertes ohne Warnung. Auslagen bleiben stehen, sind danach aber nicht mehr bearbeitbar.
  Fachlich zu klären; spec-369 schließt neue Geschäftsregeln aus.
- Vorbestehend, nur zur Kenntnis: Statusprüfung und INSERT in `addZeilenAction` (`actions.ts:370-376`)
  sind wie beim alten `addZeile`/Walk-in nicht atomar. Das Abschluss-Gate bleibt unberührt.

## Positives

- `addZeilen` (`db/veranstaltung.ts:179-195`) ist ein einziges Multi-Row-INSERT: atomar ohne
  `db.transaction()`/`runAtomic`, damit Neon-HTTP-tauglich. Leere Liste früh abgefangen,
  Alles-oder-nichts per DB-Integrationstest mit Dublette belegt, einschließlich der umhüllten
  `cause`-Fehlerform.
- `addZeilenAction` prüft fail-closed in sauberer Reihenfolge: Rolle, Zod (min 1/max 200, Länge je
  Id, Bereinigung vor der Prüfung), Existenz/Status, Aktiv, Dubletten mit Namen, Unique-Index als
  letzte Grenze. Jeder Guard-Zweig hat einen eigenen Test mit wörtlicher Meldung.
- `removeZeileAction` wertet den `undefined`-Rückgabewert aus (Kern-Kurzregel 1) und behält den
  Parent-Key im WHERE (IDOR).
- Der FS2-Fall im Dialog ist robust: Die versteckten Felder entstehen aus `verfuegbar ∩ gewaehlt`,
  abgelehnte Personen fallen nach dem Neu-Rendern automatisch heraus.
- `kachelKennzahlen` ist ein reiner Adapter über `kassierZeilen`/`kassierTagessummen`/
  `auslagenSummen`, damit dieselben Zahlen wie auf der Kassieren-Seite. Die Tests nutzen von Hand
  gerechnete Literale.
- Server-/Client-Grenze sauber: `ZugangTeilen` bleibt Server Component und wird als `children` an
  `ZugangDialog` gereicht. `qrcode` kommt in keiner `"use client"`-Datei vor.
- `Dialog`/`ConfirmDialog` sind route-neutral, Escape läuft über `cancel` + `preventDefault`, React
  bleibt die einzige Quelle für „offen". Fokus-Rücksprung, Escape, nativer Schließweg und
  „kein doppeltes onClose" sind einzeln getestet.
- `page.tsx` ist reine Komposition. Abgeschlossene Veranstaltungen laden keine Kennzahlen (getestet).
  Der `StatusToggle` ist verschoben statt kopiert und exakt über `lastElementChild` plus
  „nur einmal" geprüft (AK25/AK26).
- Altkomponenten `AddTeilnehmerForm`/`WalkInForm` samt Tests und `addZeileAction` sind restlos
  entfernt, keine verwaisten Imports.
- ADR-052: Alle neuen Dateien stehen in `eslint/ui-token-files.mjs`. Die Maskierung von `[id]` im
  Glob ist in beide Richtungen getestet, inklusive Nachbarpfad.
- Routen unverändert (`?zeile=` stammt aus #308), `docs/routes.md` muss nicht angepasst werden. Der Code
  entspricht der im PR korrigierten Spec (AK6/AK7/AK21, FS5). ADR-053 steht auf Accepted.

## Rework (nach Runde 1–3)

- `c4f2ae5`: Escape-Sperre bei `pending`, `returnFocusRef` (Safari), gemeinsamer Hook
  `useSchliessendeAction`, `TEILNEHMER_NAME_MAX` + WHY-Kommentar in `GastBereich`, einheitliche
  Ablehnungsmeldungen, `revalidatePath` bei schon entfernter Zeile, Nitpicks in Actions, Tests,
  Kacheln und Abschlussbericht.
- Folge-Commit: ADR-053 D1/D2/D3 auf den Code nachgezogen, Nachträge in ADR-034 D6 und ADR-052 D1,
  gemeinsamer E2E-Helfer `e2e/helpers/detailseite.ts` (abgesicherte `oeffneEinstellungen`),
  Zusammenführung `GastBereich`/`TeilnehmerFields` und Anleitungs-Screenshots kanonisch in
  `docs/factory/kleinfunde.md`; der dortige Eintrag zum Literal `KEINE_VERANSTALTUNG` ist erledigt
  und entfernt.
- Bewusst offen: Die Auslagen-Kachel (Summe aus offen + erstattet) ist durch ADR-053 D4 gedeckt.
  Die Anleitung wird mit den neuen Screenshots ohnehin überarbeitet.

## Empfehlung

NEEDS_REWORK
