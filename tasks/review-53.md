# Review: Task 53 – Auslagenerstattung

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur), je Read-only.
Alle drei Personas haben unabhängig denselben Kern-Defekt (K1) gefunden.

## Kritische Findings (müssen behoben werden)

- [x] **BEHOBEN [2026-07-18]:** `listAuslagen` auf **LEFT JOIN** `veranstaltung_zeile` +
      **INNER JOIN** `teilnehmer` mit `anzeigename = COALESCE(zeile.anzeigename, teilnehmer.name)`
      umgestellt (`db/auslage.ts:49-70`). Verwaiste Auslagen bleiben nach Zeilen-Löschen sichtbar/
      korrigierbar; kein stiller Kassen-Datenverlust. ADR-028 D5 + Konsequenzen nachgezogen.
      Integrationstest `should_keepAuslageVisibleWithFallbackName_when_zeileDeleted`
      (`db/auslage.test.ts`, DB-Integration – in dieser Session skipped, s. Task-Blocker).
- [ ] **`db/auslage.ts:54-61` + `app/veranstaltung/actions.ts:122-133` + `db/veranstaltung.ts:91-102` –
      Zeile-Löschen verwaist Auslagen still → Kassen-Diskrepanz in F8.**
      `listAuslagen` filtert per **INNER JOIN** auf `veranstaltungZeile` über `(veranstaltungId,
      teilnehmerId)`. `auslage` referenziert per ADR-028 D1 bewusst direkt `teilnehmerId` (kein
      FK/Cascade auf die Zeile). `removeZeileAction` löscht eine Teilnehmerzeile **bedingungslos**
      (nur `offen`-Check, keine Auslagen-Prüfung). Folge: Entfernt der Veranstalter eine Zeile,
      für die eine – ggf. bereits `erstattet`e – Auslage existiert, bleibt die Auslage in der DB,
      fällt aber aus dem Join heraus → sie verschwindet **still** aus Übersicht, Summen
      (`page.tsx:41`) und der künftigen F8-Kassenabrechnung (die laut D6 dieselbe `listAuslagen`
      nutzt). Der Eintrag ist über die UI nicht mehr erreichbar (kein edit/delete/reset), bleibt
      aber als Waise bestehen. Bei einer bereits ausgezahlten Erstattung ist das **stiller
      finanzieller Datenverlust** – die Kasse ist real um den Betrag kürzer als gebucht, ohne
      Spur. Kein AC/Test deckt das Zeilen-Löschen-mit-Auslage-Szenario ab.
      **Empfehlung:** entweder `removeZeile`/`removeZeileAction` ablehnen lassen, solange Auslagen
      für `(veranstaltungId, teilnehmerId)` existieren (analog dem „keine Positionen"-Gedanken bei
      Verzehr), **oder** `listAuslagen` auf `leftJoin` + Namens-Fallback (über `teilnehmer`)
      umstellen, damit Orphans sichtbar/korrigierbar bleiben. Die gewählte Lösung in ADR-028
      nachziehen und einen Integrationstest ergänzen.

## Wichtige Findings (sollten behoben werden)

- [x] **BEHOBEN [2026-07-18] (W1):** Key-basierter Remount durch `formRef.current?.reset()` im
      `useCallback`-Wrapper ersetzt (`AuslageForm.tsx:44-60,73`) – leert die Felder bei **jeder**
      erfolgreichen Neu-Erfassung, nicht nur der ersten; Erfolgsmeldung bleibt stehen. Zwei Tests:
      `should_clearFields_when_createSucceeds` / `should_notResetFields_when_editSucceeds`.
- [x] **BEHOBEN [2026-07-18] (W2):** Drei separate `firstIssueMessage`-Assertions für die
      Betrag-Meldungen (Format / `>0` / int4-Obergrenze) in `schema.test.ts` (Codify #116).
- [ ] **`app/veranstaltung/AuslageForm.tsx:67` – `key`-Reset greift nur bei der ERSTEN
      Erfolgs-Erfassung.** `key={state?.ok && !isEditing ? "reset" : "edit"}`: Nach dem 1. Erfolg
      wechselt der Key `"edit"→"reset"` → Remount → Felder leer. Bei der 2. aufeinanderfolgenden
      Erfassung bleibt `state.ok` true → Key konstant `"reset"` → **kein Remount** → die getippten
      Werte bleiben stehen, das Formular wird nicht mehr geleert. Das trifft genau den Kernablauf
      „mehrere Auslagen hintereinander erfassen" und kann zu versehentlichen Doppel-Erfassungen
      führen. Kein Test deckt das ab (in `AuslageForm.test.tsx` ist `useActionState` gemockt →
      der key-basierte Remount läuft nie). **Empfehlung:** zähler-/nonce-basierter Reset-Key, der
      bei jedem `ok` inkrementiert (löst beide Fälle und ist testbar).

- [ ] **`app/veranstaltung/schema.test.ts:156-177` – Zod-Meldungsinhalt für `betrag` ungetestet
      (inkonsistent zu `kategorie`/`delta`, Codify #116).** Die Betrag-Tests prüfen nur
      `success === false` (Ablehnung), nie `firstIssueMessage(...)` gegen die drei fachlich
      unterschiedlichen, nutzerseitigen Meldungen („Bitte einen gültigen Betrag …", „Betrag muss
      größer als 0 sein.", „Betrag ist zu hoch."). Für `kategorie` (`:152`) und `delta` (`:99`)
      wird der Meldungsinhalt separat assertiert – für `betrag` fehlt es. Der Meldungsinhalt ist
      der beobachtbare Vertrag; das Literal in `AuslageForm.test.tsx:74` testet nur das Rendern
      von `state.error`, nicht die Schema-Erzeugung. **Empfehlung:** je Betrag-Ablehnungsgrund
      (Format / `>0` / int4-Obergrenze) eine eigene `firstIssueMessage`-Assertion gegen ein
      unabhängiges Literal.

## Nitpicks (optional)

- [ ] `app/veranstaltung/AuslageRow.tsx:75-92` – Status-Toggle- und Löschen-`<form>` wiederholen
      dasselbe Hidden-Input-Paar (`veranstaltungId`/`id`); eine kleine `HiddenIds`-Teilkomponente
      entfernt die Duplikation.
- [ ] `app/veranstaltung/schema.ts:58` – Magic Number `2_147_483_647` als benannte Konstante
      (z. B. `INT4_MAX` im money-Seam) wäre sprechender und wiederverwendbar.
- [ ] `app/veranstaltung/AuslagenSummary.tsx:8` – Flag-Parameter `bold?: boolean` in `SummenRow`
      (clean-code rät von Styling-Flags ab; rein präsentational, YAGNI greift teilweise).
- [ ] `lib/money.ts:38-45` – `centsToEuroInput` behandelt negative Cents nicht (`-5` → „-1,-5");
      durch DB-CHECK `> 0` domänen-unerreichbar, aber ein Guard oder ein „nur für ≥0"-Kommentar
      wäre konsistent zu `formatCents`.
- [ ] `db/schema.ts:269` vs. `db/migrations/0010_spotty_the_call.sql:17` – Kommentar sagt
      „(restrict)", die Migration erzeugt `ON DELETE no action` (Drizzle-Default). Funktional für
      den Zweck gleich (beide verhindern Hard-Delete eines referenzierten Teilnehmers), aber
      Postgres `NO ACTION` ≠ `RESTRICT` – Formulierung angleichen.
- [ ] `app/veranstaltung/actions.ts:311,326` – `setAuslageStatusAction`/`removeAuslageAction`
      werten den `undefined`-Rückgabewert bei IDOR-Mismatch nicht aus (kein Nutzer-Feedback).
      Fail-closed ist gewahrt (No-op); konsistent mit `setStatusAction`/`removeZeileAction`.
- [ ] `factory.config.yml:45-58` – Prozess-/Tooling-Änderung (implement `tier: light→heavy`,
      `max_turns 40→50` + Kommentar) im Feature-Diff. Sie ist als Task-53-Meta dokumentiert und
      bereits als `chore:`-Commits mit #53-Bezug eingecheckt; ideal wäre dennoch ein separater
      Config-PR (Trennung Feature/Infra, ADR-019/#91-Konvention). Nur zur Kenntnis.

## Positives

- **Kern-Defekt K1 dreifach unabhängig bestätigt** – ansonsten ist der Diff durchgängig ADR-treu.
- **IDOR durchgängig (Codify #51):** `update`/`setStatus`/`remove` binden `id AND veranstaltungId`
  im WHERE; bei Mismatch `undefined` → No-op, `updateAuslageAction` meldet `AUSLAGE_NOT_FOUND`.
- **`.returning()`-Typen korrekt (Codify #50):** `Promise<T | undefined>` für update/delete/status,
  `Promise<Auslage>` für insert.
- **Zod-Grenze vollständig:** `betrag > 0` + int4-Obergrenze (Codify #49), `zweck.max(200)` +
  Null-Normalisierung (Codify #50), Status-Enum eigenständig validiert; doppelt via DB-CHECK.
- **Fail-closed-Reihenfolge** (RBAC → Zod → offen → Teilnehmer-Zuordnung/`active`) spiegelt exakt
  ADR-028 D5; Guard-Duplikation sauber in `assertTeilnehmerInVeranstaltung` extrahiert, beide
  Branches je für create UND update getestet.
- **Abschluss-Sperre** greift bei allen vier Operationen (create/update/setStatus/remove).
- **D4 mustergültig:** Route unter dem bereits von `proxy.ts` geschützten Bereich (kein neuer
  Public-Endpoint, Codify #63); **kein** `app/_auslagen/`; DB-freies `auslagenSummen.ts` mit
  Domänennamen (Codify #105) inkl. `never`-Exhaustiveness-Guard, der per Type-Cast getestet ist
  (testing-standards); Anzeige über `formatCents`.
- **Schichtgrenzen sauber:** alle `auslage`-Queries nur in `db/auslage.ts`, keine rohen SQL-Strings
  in Actions/UI; neuer `centsToEuroInput`-Seam korrekt vom Anzeige-`formatCents` getrennt (Round-
  Trip-parsebar) inkl. Test.
- **Migration 0010** ist reine Neuanlage (2 Enums + Tabelle + CHECK `> 0` + 2 FKs); Journal/Snapshot
  konsistent fortgeschrieben.

## Empfehlung

NEEDS_REWORK

Begründung: K1 ist ein kritischer Korrektheits-/Finanz-Defekt (still verschwindende, ggf. bereits
ausgezahlte Erstattung aus der Kassenabrechnung) und muss vor Merge behoben werden. Zusätzlich
W1 (Formular-Reset nur einmalig, Kern-UX-Ablauf) und W2 (Testlücke Betrag-Meldungsinhalt, Codify
#116). Die Nitpicks sind optional. Alle Findings liegen **im** Task-Scope – keine Out-of-Scope-
Issues angelegt.
