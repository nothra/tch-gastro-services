# Spec: Auslagen-Seite – Auslöser und Dialog-Fall „keine Teilnehmer“ angleichen (#420)

> Issue #420 · Nachtrag zum UI-Feinschliff (#368–#375, #406). Baut auf spec-406 (Auslagen-Seite)
> und dem Wording-Glossar (`docs/ux/glossar.md`, spec-375) auf. Verwandt: #407 (Katalog-Seite,
> bewusst getrennt) – die gemeinsame Benennungsfrage ist hier einmal entschieden (Q1).

## Kontext

Nach der Sichtprüfung der umgestellten Auslagen-Seite (`/veranstaltung/[id]/auslagen`) wirken
Button-Anordnung und Benennung gegenüber Teilnehmer, Artikel und Veranstaltungsliste uneinheitlich:

- Im Leerzustand stehen **zwei Auslöser** für denselben Dialog: „+ Neu“ im Seitenkopf und
  „Auslage erfassen“ in der Leerzustand-Karte – dazu liegt die Summen-Übersicht zwischen Kopf
  und Liste.
- Der Dialog-Fall „keine Teilnehmer“ zeigt nur „Abbrechen“ und keine Primäraktion; alle anderen
  Dialoge zeigen „Abbrechen“ + Primärbutton (`DialogAktionen`).
- Die Benennung („Auslage erfassen“ / „Erfassen“ / „Auslage erfasst“) liest sich neben den
  „anlegen“-Seiten uneinheitlich. Sie folgt aber dem Glossar (erfassen = Beträge eintragen) und
  **bleibt** (Q1).

Primärer Nutzer: Rolle `veranstalter`, überwiegend am Smartphone.

## Scope

**Inbegriffen:**
- Leerzustand der Auslagen-Seite ohne eigenen Auslöser; einziger Auslöser ist „+ Neu“ im Kopf.
- Dialog-Fall „keine Teilnehmer“ mit „Abbrechen“ + deaktiviertem Primärbutton.
- Glossar: ausdrückliche Regel zur Benennung von Auslöser und Dialogtexten (Q1), Eintrag zum
  Leerzustand.
- Mitziehen betroffener Unit-Tests und E2E-Specs/-Helfer.

**Nicht inbegriffen:**
- Dialogtitel „Auslage erfassen“, Primärbutton „Erfassen“ / Busy „Erfassen …“, Erfolgsmeldung
  „Auslage erfasst“, beim Bearbeiten „Speichern“ / „Gespeichert“ – bleiben unverändert (Q1).
- Leerzustand von Teilnehmer und Artikel (behalten „Teilnehmer anlegen“ / „Artikel anlegen“).
- Reihenfolge Kopf → Summen-Übersicht → Liste (entschieden in spec-406 Q2) und alle Felder,
  Validierung, Server Actions, Berechtigungen, Routen.
- Katalog-Seite (#407).

## Akzeptanzkriterien

### Auslöser (AK1)

- [ ] **AK1.1** GIVEN eine offene Veranstaltung ohne Auslagen WHEN die Seite lädt THEN gibt es
  genau **einen** Auslöser für den Dialog: „+ Neu“ im Seitenkopf; die Leerzustand-Karte
  („Noch keine Auslagen erfasst.“) enthält **keinen** Button.
- [ ] **AK1.2** GIVEN eine offene Veranstaltung mit Auslagen WHEN die Seite lädt THEN ist
  „+ Neu“ weiterhin der einzige Auslöser (unverändert).
- [ ] **AK1.3** GIVEN eine abgeschlossene Veranstaltung WHEN die Seite lädt THEN gibt es weder im
  Kopf noch im Leerzustand einen Auslöser (unverändert).
- [ ] **AK1.4** GIVEN der Leerzustand WHEN „+ Neu“ gedrückt wird THEN öffnet der Dialog
  „Auslage erfassen“ wie bisher; Abbrechen/`Esc` gibt den Fokus an „+ Neu“ zurück, und nach
  erfolgreichem Erfassen erscheint die Erfolgsmeldung „Auslage erfasst“ (Verhalten aus
  spec-406 AK1.3–AK1.6 bleibt).

### Benennung (AK2)

- [ ] **AK2.1** GIVEN das Glossar WHEN es gelesen wird THEN steht dort eine Regel, die für
  Auslöser, Dialogtitel, Primärbutton, Busy-Text und Erfolgsmeldung zusammen festlegt:
  Auslöser im Seitenkopf ist immer „+ Neu“; Dialogtitel, Primärbutton, Busy-Text und Erfolg
  folgen dem Verb des Aktionstyps – **anlegen** für neue Objekte (Teilnehmer, Artikel,
  Katalog, Veranstaltung, Theke), **erfassen** für Beträge und Mengen (Auslage, Verzehr).
- [ ] **AK2.2** GIVEN die Regel aus AK2.1 WHEN Auslagen-, Teilnehmer- und Artikel-Dialog
  gegen sie geprüft werden THEN sind alle drei konform (kein Text-Änderungsbedarf an
  Dialogtiteln/Buttons/Erfolgsmeldungen; die Prüfung ist im Glossar bzw. der Spec belegt).
- [ ] **AK2.3** GIVEN das Glossar WHEN es gelesen wird THEN nennt es für den Leerzustand: wer
  seinen Auslöser nur im Seitenkopf trägt (Auslagen), hat im Leerzustand keinen eigenen
  Button; Teilnehmer/Artikel behalten „<Objekt> anlegen“ (Ist-Zustand, kein Änderungsauftrag).

### Dialog ohne Teilnehmer (AK3)

- [ ] **AK3.1** GIVEN die Veranstaltung hat keine Teilnehmerzeile WHEN „+ Neu“ gedrückt wird
  THEN zeigt der Dialog weiterhin den Warnhinweis („Zuerst Teilnehmer zur Veranstaltung
  hinzufügen, dann sind Auslagen erfassbar.“) und die Buttons „Abbrechen“ und „Erfassen“.
- [ ] **AK3.2** GIVEN der Fall aus AK3.1 THEN ist „Erfassen“ **deaktiviert** (nicht
  aktivierbar, per Tastatur nicht auslösbar) und es werden keine Formularfelder gezeigt.
- [ ] **AK3.3** GIVEN der Fall aus AK3.1 WHEN „Abbrechen“ oder `Esc` betätigt wird THEN
  schließt der Dialog ohne Wirkung und der Fokus kehrt zu „+ Neu“ zurück.
- [ ] **AK3.4** GIVEN der Fall aus AK3.1 WHEN die Buttons gerendert werden THEN folgt ihre
  Anordnung exakt `DialogAktionen` (Abbrechen links, Primär rechts) wie in den übrigen Dialogen.
- [ ] **AK3.5** GIVEN die Veranstaltung hat mindestens eine Teilnehmerzeile THEN ist „Erfassen“
  aktivierbar wie bisher (Gegenprobe zu AK3.2).

### Nachziehen (AK4)

- [ ] **AK4.1** `docs/ux/glossar.md` enthält die Regel aus AK2.1/AK2.3; die Auslagen-Zeilen der
  Abweichungsliste/„Bereits konform“-Tabelle sind auf den neuen Stand geprüft.
- [ ] **AK4.2** Unit-Tests (`AuslageErfassen.test.tsx`, `[id]/auslagen/page.test.tsx`,
  Formular-Test zum Fall „keine Teilnehmer“) und E2E (`e2e/auslagen.spec.ts`,
  `e2e/helpers/auslagen.ts`) sind auf den einzigen Auslöser und den deaktivierten Primärbutton
  angepasst; kein Test erwartet mehr „Auslage erfassen“ als Leerzustand-Button.
- [ ] **AK4.3** `docs/routes.md` bleibt unverändert (keine Routenänderung) und `pnpm lint`,
  `pnpm test` sind grün.

## Fehlerszenarien

- [ ] Rolle ohne `veranstalter`: Seite zeigt unverändert den Kein-Zugriff-Text; keine Auslöser.
- [ ] Veranstaltung ohne Teilnehmer **und** ohne Auslagen: Leerzustand ohne Button, „+ Neu“ im
  Kopf öffnet den Dialog mit deaktiviertem „Erfassen“ (AK1.1 + AK3.2 zusammen).
- [ ] Veranstaltung wird im geöffneten „keine Teilnehmer“-Dialog von woanders geändert: kein
  neues Verhalten gefordert (Dialog bleibt, bis geschlossen).

## Entschiedene Fragen (mit Ralf, 2026-10-19)

- [x] **Q1 Benennung:** Nur der **Auslöser** heißt „+ Neu“ (analog Teilnehmer/Artikel).
  Dialogtitel „Auslage erfassen“, „Erfassen“, „Erfassen …“, „Auslage erfasst“ bleiben –
  das Glossar-Verb „erfassen“ für Beträge bleibt, die Regel wird ausdrücklich festgehalten
  (AK2.1). Gilt als Antwort auf die gemeinsame Frage mit #407; #407 nutzt bereits „anlegen“
  für neue Objekte und ist damit konform.
- [x] **Q2 Anordnung:** Leerzustand **ohne eigenen Button**; „+ Neu“ im Kopf ist der einzige
  Auslöser. Summen-Übersicht bleibt über der Liste (spec-406 Q2 unverändert).
- [x] **Q3 Dialog ohne Teilnehmer:** „Abbrechen“ + **deaktivierter** Primärbutton „Erfassen“
  (nicht „Schließen“, nicht nur „Abbrechen“).

## Offene Fragen

- [ ] **Q4 Leerzustand-Text:** Annahme: „Noch keine Auslagen erfasst.“ bleibt unverändert, ohne
  zusätzlichen Hinweis auf „+ Neu“. Falls ein Hinweis gewünscht ist, wäre er nur bei offener
  Veranstaltung sinnvoll – bitte in der Review bestätigen oder ändern.
