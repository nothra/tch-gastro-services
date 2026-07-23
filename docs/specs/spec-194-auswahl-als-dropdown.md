# Spec: Selbstbedienung – Erfasser-/Ziel-Auswahl als Dropdown

> Feature F7 · Issue #194 · verfeinert die Auswahl-UX aus
> [spec-183](spec-183-erfasser-ziel-teilnehmer-verzehr.md) (Erfasser/Ziel-Zweischritt).
>
> **Kanonische Basis:** Das clientseitige Identitäts-Gate (`app/theke/[token]/IdentityGate.tsx`)
> mit dem geführten Zweischritt „Wer bist du?" → „Für wen …?" ist mit #183 bereits umgesetzt.
> Diese Spec ändert **ausschließlich das Auswahl-Widget** der beiden Schritte – kein neues
> Datenmodell, keine Migration, keine Server-/DB-Änderung.

## Kontext

Beim erstmaligen Öffnen des Selbstbedienungs-Links führt das `IdentityGate` durch zwei
Auswahlschritte: **Erfasser** („Wer bist du?", `ErfasserPicker`) und **Ziel-Teilnehmer**
(„Für wen möchtest du einen Verzehr erfassen?", `ZielPicker`). Beide werden heute als **lange,
senkrechte Liste** voll-breiter Buttons (`<ul>` mit einem `<button>` je Teilnehmer) gerendert.

Beobachtete Schwächen (aus #194):

- Bei vielen Teilnehmern/Familien wird die Liste sehr lang und erfordert viel Scrollen –
  besonders auf Handy/Tablet.
- Nach Auswahl des Erfassers wird der anschließende Ziel-Schritt nicht in den Sichtbereich
  gebracht; der Nutzer landet mitten in der Ansicht und muss erneut suchen.

Beide Auswahlen werden auf ein **natives Dropdown-Feld** (`<select>`) umgestellt. Das reduziert
die vertikale Höhe der Startseite, macht die Auswahl auf Handy/Tablet kompakt und ist von Haus
aus per Tastatur und Screenreader bedienbar.

## Gesetzte Entscheidungen (aus /requirements, 2026-07-23)

- **Interaktionsmodell: Auto-Weiter + Platzhalter.** Jedes `<select>` hat als erste, vorausgewählte
  Option einen neutralen Platzhalter („Bitte wählen…"). Die Auswahl eines echten Eintrags löst den
  nächsten Schritt **sofort** aus (`onChange`) – kein zusätzlicher „Weiter"-Button. Der Platzhalter
  ist nötig, damit die Wahl **jeder** echten Option ein `change`-Ereignis feuert (eine vorausgewählte
  „Für mich"-Option würde beim erneuten Wählen kein Ereignis auslösen). Nächstliegend zum heutigen
  Verhalten (Button-Tap = sofort weiter), aber ein Tap weniger als ein Bestätigungs-Button.
- **Fokus statt Scroll:** Nach Auswahl des Erfassers erhält das Ziel-`<select>` programmatisch den
  Fokus (im nächsten Frame nach dem State-Wechsel, Codify #188). Dadurch kommt der Ziel-Schritt
  ohne manuelles Scrollen in den Sichtbereich – tastatur- und screenreader-freundlich, ohne
  separaten Scroll-Sprung.

## Scope

**Inbegriffen:**

- **`ErfasserPicker`** rendert statt der Button-Liste ein natives `<select>`:
  Platzhalter-Option „Bitte wählen…" (vorausgewählt), danach je eine `<option>` pro Teilnehmer.
  Auswahl merkt den Erfasser (`writeErfasserId`) – Verhalten wie heute, nur anderes Widget.
- **`ZielPicker`** rendert ein natives `<select>`:
  Platzhalter „Bitte wählen…" (vorausgewählt), danach **„Für mich (Name)"** als **erste** echte
  Option (übernimmt den Erfasser als Ziel), danach die übrigen Teilnehmer (ohne den Erfasser).
  Auswahl merkt das Ziel (`writeZielId`).
- **Fokus** aufs Ziel-`<select>` nach der Erfasser-Wahl (nächster Frame).
- **Beschriftung/a11y:** Die vorhandene Frage-Überschrift bleibt sichtbar und ist dem `<select>`
  als Label zugeordnet (`<label>`/`aria-labelledby`), sodass die Auswahl per Tastatur und
  Screenreader benannt und bedienbar bleibt.
- Die darunter sichtbare **read-only-Erfassungsliste** (`readOnlyListe`, spec-54 AC B) bleibt
  während beider Schritte unverändert sichtbar.

**Nicht inbegriffen (unverändert aus spec-183):**

- Akkordeon der Erfassbereiche, Sticky-Teilnehmer-Auswahl, „Erfasser wechseln"-Aktion,
  `FokusListe`, Wiederkehr-Logik, die `erfasser-ziel-storage`-Persistenz und der Read-only-Pfad –
  alles bleibt wie in #183. Diese Spec berührt nur die beiden Auswahl-Widgets.
- Serverseitige Speicherung/Protokollierung des Erfassers (Erfassung bleibt anonym, spec-52/
  ADR-034 D4). Keine Datenmodell-Änderung, keine Migration.
- Anlegen neuer Teilnehmer über den Link (bleibt spec-54 B4 – nur Auswahl aus der Liste).
- Optische Sonder-Hervorhebung der „Für mich"-Option über die Reihenfolge hinaus: Ein natives
  `<option>` lässt sich kaum stylen; „hervorgehoben" ist hier als **erste** echte Option realisiert.

## Akzeptanzkriterien

### Erfasser-Auswahl (Schritt 1)

- [ ] GIVEN erstmaliges Öffnen (offene Veranstaltung, kein Erfasser gemerkt) WHEN die Seite lädt
      THEN erscheint „Wer bist du?" als `<select>` mit vorausgewähltem Platzhalter „Bitte wählen…",
      es gibt **keine** Teilnehmer-Buttons, und die Erfassbereiche darunter sind sichtbar, aber
      nicht bearbeitbar.
- [ ] GIVEN das Erfasser-`<select>` mit allen Teilnehmern als Optionen WHEN ein Teilnehmer gewählt
      wird THEN wird er clientseitig pro Token gemerkt UND direkt der Ziel-Schritt angezeigt – ohne
      zusätzlichen „Weiter"-Button.

### Ziel-Auswahl (Schritt 2)

- [ ] GIVEN ein gewählter Erfasser WHEN der Ziel-Schritt erscheint THEN ist es ein `<select>` mit
      vorausgewähltem Platzhalter „Bitte wählen…", gefolgt von „Für mich (Name)" als **erster**
      echter Option, danach den übrigen Teilnehmern (der Erfasser erscheint nicht ein zweites Mal).
- [ ] GIVEN das Ziel-`<select>` WHEN „Für mich" gewählt wird THEN wird der Erfasser aus Schritt 1
      als Ziel-Teilnehmer übernommen (ohne erneute Namenssuche), gemerkt und dessen Erfassbereich
      freigeschaltet/aufgeklappt.
- [ ] GIVEN das Ziel-`<select>` WHEN ein anderer Teilnehmer gewählt wird THEN wird dieser als
      Ziel-Teilnehmer gemerkt und dessen Erfassbereich freigeschaltet.

### Fokus / Sichtbarkeit

- [ ] GIVEN die Erfasser-Auswahl ist erfolgt WHEN der Ziel-Schritt erscheint THEN erhält das
      Ziel-`<select>` programmatisch den Fokus (im nächsten Frame nach dem State-Wechsel), sodass
      es ohne manuelles Scrollen im Sichtbereich ist.

### Barrierefreiheit

- [ ] GIVEN eine der beiden Auswahlen WHEN sie per Tastatur/Screenreader bedient wird THEN ist das
      `<select>` mit seiner Frage-Beschriftung („Wer bist du?" bzw. „Für wen möchtest du einen
      Verzehr erfassen?") verknüpft (zugängliches Label) und vollständig per Tastatur bedienbar.

### Regression (unverändertes Verhalten)

- [ ] GIVEN gemerkter Erfasser UND gemerkter Ziel-Teilnehmer WHEN der Link erneut geöffnet wird
      THEN werden beide Auswahl-Schritte übersprungen und die Fokus-Ansicht erscheint (wie #183).

## Fehlerszenarien

- [ ] GIVEN ein Auswahl-`<select>` mit vorausgewähltem Platzhalter WHEN der Platzhalter selbst
      „gewählt" bzw. keine echte Option gewählt wird THEN passiert nichts (kein Weiterschalten,
      kein gemerkter Wert) – der Schritt bleibt stehen.
- [ ] GIVEN eine Teilnehmerliste mit nur einem Eintrag (Erfasser = einziger Teilnehmer) WHEN der
      Ziel-Schritt erscheint THEN enthält das `<select>` den Platzhalter und „Für mich (Name)"
      (keine weiteren Optionen) und „Für mich" schaltet korrekt frei.

## Offene Fragen

_Keine – Interaktionsmodell und Fokus-Verhalten in /requirements entschieden (siehe oben)._
