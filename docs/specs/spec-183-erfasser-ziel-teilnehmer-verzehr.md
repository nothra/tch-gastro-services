# Spec: Selbstbedienung – Erfasser/Ziel-Teilnehmer-Fokus bei der Verzehrerfassung

> Feature F7-Überarbeitung · Issue #183 · baut auf [spec-54](spec-54-selbstbedienung-link.md)
> und [ADR-034](../adr/034-selbstbedienung-token-zugang.md) auf.
>
> **Kanonische Basis:** Die öffentliche Token-Route `app/theke/[token]`, die token-scoped
> Verzehr-Action und das clientseitige (anonyme) Identitäts-Gate sind mit #54 bereits umgesetzt.
> Diese Spec überarbeitet **ausschließlich die Erfassungs-UX** – kein neues Datenmodell,
> keine Migration.

## Kontext

Nach #54 schaltet auf `theke/[token]` eine **einzelne** Frage „Wer bist du?" die Bearbeitung
frei; danach ist die **gesamte** Teilnehmerliste mit **allen** Erfassbereichen dauerhaft
aufgeklappt sichtbar. Der Fokus liegt damit auf dem *Erfasser* (wer bedient), nicht auf dem
*Teilnehmer*, für den der Verzehr gebucht wird.

Im typischen Betrieb (Montagsrunde, gemeinsames Theken-Gerät oder eigenes Handy) will die
bedienende Person schnell zum Erfassbereich **eines bestimmten Teilnehmers** springen. Die
lange, komplett aufgeklappte Liste ist dafür unpraktisch – besonders auf Handy/Tablet.

Diese Überarbeitung verschiebt den Fokus auf den **Ziel-Teilnehmer** und trennt ihn vom
**Erfasser**:

- **Erfasser** – die bedienende Person; einmalig beim ersten Öffnen festgelegt, danach nur
  noch selten gewechselt. Reine Geräte-Wiedererkennung, **nicht** serverseitig gespeichert.
- **Ziel-Teilnehmer** – der Teilnehmer, für den gerade Verzehr gebucht wird; steuert, welcher
  Erfassbereich aufgeklappt ist, und ist schnell wechselbar.

## Gesetzte Entscheidungen (aus /requirements, 2026-07-20)

- **Erfasser bleibt anonym & clientseitig** (localStorage pro Token, analog #54/ADR-034 D4).
  Keine Kopplung an den Verzehr, keine Datenmodell-Änderung, keine Migration. Der Erfasser ist
  reine UX-Bequemlichkeit.
- **Schnelle Navigation** über eine **dauerhaft erreichbare (sticky) Teilnehmer-Auswahl** oben
  (Chips oder Dropdown) **plus Akkordeon** der Erfassbereiche.
- **Zweistufiger Einstieg mit verpflichtender Ziel-Auswahl:** Nach „Wer bist du?" wird direkt
  „Für wen möchtest du einen Verzehr erfassen?" abgefragt; erst danach erscheint der (aufgeklappte)
  Erfassbereich.

## Scope

**Inbegriffen:**
- Zweistufiger Einstieg beim **erstmaligen** Öffnen (offene Veranstaltung, nichts gemerkt):
  1. „Wer bist du?" → legt den **Erfasser** fest (Auswahl aus der Teilnehmerliste), wird gemerkt.
  2. „Für wen möchtest du einen Verzehr erfassen?" → legt den **Ziel-Teilnehmer** fest, wird
     gemerkt, und navigiert zu dessen aufgeklapptem Erfassbereich.
- **Akkordeon**: nur der Erfassbereich des Ziel-Teilnehmers ist aufgeklappt, alle anderen
  eingeklappt. Ein eingeklappter Bereich zeigt weiterhin **Name + laufende Summen** (Getränke /
  Essen / Kaffee) – volle Transparenz bleibt (spec-54 AC B).
- **Sticky-Teilnehmer-Auswahl** oben, dauerhaft erreichbar beim Scrollen; Tippen wählt den
  Ziel-Teilnehmer, klappt dessen Bereich auf (übrige zu) und bringt ihn in den Sichtbereich.
  Touch-taugliche Trefferflächen für Handy/Tablet.
- **Wechsel des Erfassers** ist möglich, aber **untergeordnet** dargestellt (unauffällige, aber
  erreichbare Aktion) – steht bei der laufenden Erfassung nicht im Vordergrund.
- **Wiederkehr**: gemerkter Erfasser + gemerkter Ziel-Teilnehmer → beide Fragen werden
  übersprungen, der zuletzt gewählte Erfassbereich ist direkt aufgeklappt.
- **Read-only** (abgeschlossene Veranstaltung): kein Erfasser-/Ziel-Flow; Liste im selben
  Akkordeon-Layout, aber nicht bearbeitbar.

**Nicht inbegriffen:**
- Serverseitige Speicherung/Protokollierung des Erfassers oder einer Erfasser-Teilnehmer-Zuordnung
  (Erfassung bleibt anonym, spec-52/ADR-034 D4). Keine Migration.
- Anlegen neuer Teilnehmer über den Link (bleibt spec-54 B4 – nur Auswahl aus der Liste).
- Kassieren/Abschluss über den Link (bleibt beim Veranstalter, F8).
- Passwort/PIN-Schutz des Links (bewusst verworfen, spec-54).
- Einschränkung, für **wen** ein Erfasser buchen darf – die volle Liste bleibt erfass- und
  einsehbar (Transparenzmodell unverändert); der Ziel-Teilnehmer steuert nur den Fokus.

## Akzeptanzkriterien

### Zweistufiger Einstieg
- [ ] GIVEN erstmaliges Öffnen des Links (offene Veranstaltung, kein Erfasser gemerkt) WHEN die
      Seite lädt THEN erscheint zuerst „Wer bist du?" mit Auswahl aus der Teilnehmerliste, und
      die Erfassbereiche sind noch nicht bearbeitbar.
- [ ] GIVEN „Wer bist du?" WHEN ein Erfasser gewählt wird THEN wird er clientseitig pro Token
      gemerkt UND direkt „Für wen möchtest du einen Verzehr erfassen?" abgefragt.
- [ ] GIVEN „Für wen?" WHEN ein Ziel-Teilnehmer gewählt wird THEN wird die Auswahl gemerkt, dessen
      Erfassbereich aufgeklappt (alle anderen eingeklappt) und die Bearbeitung ist freigeschaltet.

### Wiederkehr / Persistenz
- [ ] GIVEN gemerkter Erfasser UND gemerkter Ziel-Teilnehmer WHEN der Link erneut geöffnet wird
      THEN werden beide Fragen übersprungen und der zuletzt gewählte Erfassbereich ist direkt
      aufgeklappt.

### Akkordeon & Transparenz
- [ ] GIVEN mehrere Teilnehmer WHEN einer ausgewählt/aufgeklappt ist THEN sind die übrigen
      Erfassbereiche eingeklappt.
- [ ] GIVEN ein eingeklappter Erfassbereich WHEN er dargestellt wird THEN zeigt er weiterhin
      Name + laufende Summen (Getränke/Essen/Kaffee) an (volle Transparenz bleibt).
- [ ] GIVEN ein eingeklappter Teilnehmer WHEN darauf getippt wird THEN klappt er auf und der
      zuvor offene klappt zu (höchstens einer offen).

### Schnelle Navigation
- [ ] GIVEN die Erfassungsansicht auf Handy/Tablet WHEN nach unten gescrollt wird THEN bleibt
      oben eine dauerhaft erreichbare Teilnehmer-Auswahl (Chips/Dropdown) sichtbar.
- [ ] GIVEN die Sticky-Auswahl WHEN ein Teilnehmer angetippt wird THEN wird er zum
      Ziel-Teilnehmer, sein Erfassbereich klappt auf (übrige zu), er kommt in den Sichtbereich,
      und die Auswahl wird gemerkt.

### Erfasser-Wechsel (untergeordnet)
- [ ] GIVEN eine laufende Erfassung WHEN der Nutzer den Erfasser wechseln möchte THEN ist das
      über eine unauffällige, aber erreichbare Aktion möglich; danach wird der neue Erfasser
      gemerkt (ggf. erneut „Wer bist du?").

### Read-only
- [ ] GIVEN eine abgeschlossene Veranstaltung WHEN der Link geöffnet wird THEN gibt es keinen
      Erfasser-/Ziel-Flow; die Liste wird im selben Akkordeon-Layout, aber nicht bearbeitbar
      dargestellt.

## Fehlerszenarien
- [ ] GIVEN gemerkter Erfasser oder Ziel-Teilnehmer ist nicht (mehr) in der Liste WHEN die Seite
      lädt THEN wird die betreffende Frage erneut gestellt (Stale-Fallback), ohne Fehlfunktion.
- [ ] GIVEN localStorage ist nicht verfügbar (z. B. privater Modus) WHEN die Seite geöffnet wird
      THEN funktioniert der Ablauf weiter, nur ohne Wiedererkennung (bei jedem Laden wird erneut
      gefragt) – fail-open UX, kein Absturz.
- [ ] GIVEN eine leere Teilnehmerliste WHEN der Link geöffnet wird THEN erscheint der bestehende
      neutrale Hinweis („Noch keine Teilnehmer erfasst …"), kein Gate.

## Offene Fragen (für /architecture)
- [ ] Konkrete UI-Form der Sticky-Auswahl (Chips vs. Dropdown) und Verhalten bei **sehr langer**
      Teilnehmerliste (horizontal scrollende Chips vs. Dropdown/Suche).
- [ ] Persistenz-Schema: zwei Schlüssel (z. B. `tch:sb:erfasser:<token>`, `tch:sb:ziel:<token>`)
      und Umgang mit dem bestehenden Alt-Schlüssel `tch:sb:name:<token>` aus #54 (übernehmen als
      Erfasser vs. ignorieren).
- [ ] Akkordeon-/Auswahl-Zustand ausschließlich clientseitig (analog ADR-034 D4, kein
      Server-State); Standardzustand im Read-only-Fall (alle zu vs. erster offen).
- [ ] Wiederverwendung der route-neutralen `app/_verzehr/VerzehrErfassung` mit einem
      Akkordeon-/Fokus-Mechanismus, ohne die authentifizierte F5-Seite zu verändern (ggf.
      Steuerung per zusätzlichem, optionalem Prop statt Umbau).
