# ADR 035: Selbstbedienung – Erfasser/Ziel-Trennung, Fokus-Akkordeon, geräte-lokale Persistenz

## Status
Accepted

## Date
2026-07-20

## Kontext

[spec-183](../specs/spec-183-erfasser-ziel-teilnehmer-verzehr.md) (#183) überarbeitet die
Selbstbedienungs-Erfassung (F7, `app/theke/[token]`), die mit #54/[ADR-034](034-selbstbedienung-token-zugang.md)
geliefert wurde. Heute schaltet eine **einzelne** Frage „Wer bist du?" die Bearbeitung frei und
zeigt die **gesamte** Teilnehmerliste mit **allen** Erfassbereichen dauerhaft aufgeklappt.

Die Überarbeitung verschiebt den Fokus auf den **Ziel-Teilnehmer** und trennt zwei Rollen:

- **Erfasser** – wer bedient; einmalig festgelegt, danach selten gewechselt.
- **Ziel-Teilnehmer** – für wen gebucht wird; steuert den aufgeklappten Erfassbereich, schnell
  wechselbar (Handy/Tablet).

Aus /requirements sind gesetzt: Erfasser bleibt **anonym & clientseitig** (keine DB-Änderung,
keine Migration – wie ADR-034 D4); Navigation über **sticky Teilnehmer-Auswahl + Akkordeon**;
geführter **Zweischritt** mit verpflichtender Ziel-Auswahl und **„Für mich"** als erster Option.

Diese Task ist **reine Präsentations-/Client-Schicht**: kein Datenmodell, keine Migration, keine
neue Dependency, **kein** neuer Autorisierungspfad – das Capability-Modell (Token = Autorisierung,
ADR-034 D3) und die token-scoped Action bleiben unverändert. Zu klären sind: (1) wie das Akkordeon
in die route-neutrale UI passt, **ohne** die authentifizierte F5-Seite (`app/veranstaltung/[id]/verzehr`)
umzubauen, (2) das Client-Persistenz-Schema inkl. Umgang mit dem Alt-Schlüssel aus #54, (3) die
Form der Sticky-Auswahl.

## Entscheidung

### D1 · Zweistufige Identität mit „Für mich"-Schnellauswahl, geräte-lokal persistiert
`IdentityGate` (Client-Wrapper, `"use client"`) wird zur kleinen Zustandsmaschine über zwei
geräte-lokal gemerkte Werte **pro Token**:

- **Erfasser fehlt** → Frage **„Wer bist du?"** (Auswahl aus der Teilnehmerliste). Wahl merken.
- **Erfasser gesetzt, Ziel fehlt** → Frage **„Für wen möchtest du einen Verzehr erfassen?"**. Die
  **erste** Option ist **„Für mich"** (übernimmt den Erfasser als Ziel, ohne erneute Suche),
  darunter die übrigen Teilnehmer. Wahl merken.
- **Beide gesetzt** → Fokus-Ansicht (D2): der Ziel-Erfassbereich ist offen; eine **unauffällige**
  Aktion „Erfasser wechseln" ist erreichbar (nicht im Vordergrund).

Persistenz ausschließlich in **localStorage** (analog ADR-034 D4, kein Server-State, Erfassung
bleibt anonym). Gespeichert werden **Zeilen-IDs**, nicht Anzeigenamen – IDs sind stabil und
eindeutig (robust gegen gleichnamige Teilnehmer/Umbenennung); der Anzeigename wird zur Laufzeit
aus `zeilen` aufgelöst. Schlüssel: `tch:sb:erfasser:<token>` und `tch:sb:ziel:<token>`.

### D2 · Fokus-Akkordeon durch Wiederverwendung der präsentationalen Karte – F5 bleibt unberührt

> **Teilweise geändert durch [ADR-039](039-verzehrerfassung-fokusliste-route-neutral.md) (#187):**
> „F5 bleibt unberührt" gilt nicht mehr – F5 übernimmt dieselbe Fokusliste. `FokusListe` wandert
> nach `app/_verzehr/` und wird token-/persistenzfrei (Ziel-Merkung via injiziertem Callback).
> Der Rest von D2 (exportierte `ZeileKarte`, optionale Akkordeon-Props) bleibt gültig.

Die per-Teilnehmer-Karte (heute die interne `ZeileKarte` in `VerzehrErfassung.tsx`) wird
**exportiert** und erhält **optionale** Akkordeon-Props (`collapsible?`, `open?`, `onToggle?`).

- **F5 + F7-Read-only-Flatfall:** `VerzehrErfassung` rendert die Karte **wie bisher** ohne diese
  Props → flach, voll aufgeklappt, kein Verhalten geändert. Die F5-Seite wird **nicht** angefasst.
- **F7 editierbar:** eine **neue Client-Komponente** `app/theke/[token]/FokusListe.tsx`
  (`"use client"`) rendert dieselbe Karte **collapsible** und hält den Akkordeon-Zustand
  (genau **eine** offen = Ziel-Teilnehmer). Die Karte zeigt im eingeklappten Zustand weiterhin
  **Kopf = Name + laufende Summen** (Getränke/Essen/Kaffee) – volle Transparenz (spec-54 AC B);
  eingeklappt entfällt nur der Erfassungs-Körper (Kategorien + `MengeControl`).

Die Karte hat **keine** server-only-Abhängigkeiten (nur Typ-Importe + präsentationale Helfer),
ist also sowohl im Server-Baum (F5) als auch im Client-Baum (F7) rendernbar. Import-Richtung
bleibt regelkonform (Feature `app/theke` → route-neutrales `app/_verzehr`, Codify #52) – nie
umgekehrt.

### D3 · Sticky-Auswahl als horizontal scrollbare Chip-Leiste
Oben in `FokusListe` eine **sticky**, horizontal scrollbare **Chip-Leiste**: je Teilnehmer ein
Button, der aktive (= Ziel) mit `aria-current`. Tippen setzt den Ziel-Teilnehmer, öffnet dessen
Karte (andere zu), merkt die Wahl (D1) und bringt die Karte per `scrollIntoView` in den
Sichtbereich (Aufruf **guarded**: `ref.current?.scrollIntoView?.({ block: "start" })` – jsdom hat
keine Implementierung). Ein **Such-/Filterfeld** wird bewusst **nicht** gebaut (YAGNI für die
erwartete Listenlänge einer Montagsrunde); die Chip-Leiste scrollt und zentriert den aktiven Chip.
Ist die Liste künftig sehr lang, ist ein Dropdown/Suchfeld additiv nachrüstbar.

### D4 · Fail-open bei fehlendem localStorage; Stale-ID → Schritt erneut fragen
Jeder localStorage-Zugriff wird gekapselt und **fail-open** behandelt (try/catch): ist der Speicher
nicht verfügbar (privater Modus/deaktiviert), funktioniert der Ablauf weiter – die Fragen werden bei
jedem Laden erneut gestellt, **kein** Absturz. Zeigt eine gemerkte ID **nicht** (mehr) auf eine
aktuelle Zeile (Stale-Fallback), wird genau der betroffene Schritt erneut gefragt: unbekannter
Erfasser → „Wer bist du?"; unbekanntes Ziel (Erfasser bekannt) → direkt „Für wen?".

### D5 · Read-only im selben Akkordeon-Layout, ohne Gate
Eine **abgeschlossene** Veranstaltung nutzt dieselbe `FokusListe` mit `editable={false}` und
**ohne** Erfasser-/Ziel-Flow. Standardzustand: **alle Karten eingeklappt** (kein impliziter Fokus);
die Sticky-Auswahl bleibt zum Aufklappen/Ansehen nutzbar. Kein Sonderpfad, kein Schreibzugriff.

### D6 · Legacy-Schlüssel `tch:sb:name:<token>` aus #54 einmalig als Erfasser übernehmen
Fehlt `tch:sb:erfasser:<token>`, aber der Alt-Schlüssel `tch:sb:name:<token>` (aus #54, enthält
einen **Namen**) existiert, wird er **einmalig adoptiert**: den Namen auf eine aktuelle Zeile
mappen → deren ID als Erfasser übernehmen, den Alt-Schlüssel danach entfernen. Findet sich kein
Match, wird der Alt-Schlüssel ignoriert/geräumt. So verlieren #54-Nutzer ihre Wiedererkennung nicht.

## Alternativen

### Akkordeon-Mechanismus
- **A (gewählt): kontrolliertes React-Akkordeon über die wiederverwendete Karte.** Pro:
  deterministisch und testbar (Vitest/Testing-Library, strikte TDD-Vorgabe), volle Kontrolle über
  „genau eine offen" + Sticky-Auswahl + Scroll; F5 unberührt. Con: etwas Client-State.
- **B: natives Exclusive-Accordion `<details name="…">` + Fragment-Auto-Open.** Pro: kein JS,
  Browser schließt andere automatisch. Con: jsdom implementiert weder das Exclusive-Verhalten noch
  `scrollIntoView`/Fragment-Auto-Open → in der TDD-Suite **nicht** verlässlich prüfbar; das
  Zusammenspiel mit gemerktem Ziel + programmatischem Öffnen aus der Sticky-Auswahl ist fragil.
  → abgelehnt.

### Ort der Akkordeon-Logik
- **A (gewählt): neue F7-Client-Komponente `FokusListe`, Karte per optionalem Prop collapsible.**
  Pro: SRP, F5-Flatliste unverändert, kein Client-State in der Server-Komponente `VerzehrErfassung`.
  Con: eine neue Komponente + Export der Karte.
- **B: Akkordeon-Modus direkt in `VerzehrErfassung` (Prop `renderMode`).** Pro: eine Komponente.
  Con: zwängt Client-State in die bisher server-gerenderte, von F5 genutzte UI; vermischt zwei
  Darstellungsmodi in einer Datei; höheres Risiko einer F5-Regression. → abgelehnt.

### Persistenz-Wert
- **A (gewählt): Zeilen-IDs speichern.** Pro: stabil, eindeutig, robust gegen gleichnamige/
  umbenannte Teilnehmer; Stale-Check = ID nicht in `zeilen`. Con: Legacy-Namensschlüssel braucht
  einmalige Adoption (D6).
- **B: Anzeigenamen speichern (wie #54).** Pro: kein Migrationsschritt. Con: mehrdeutig bei
  Namensgleichheit, bricht bei Umbenennung. → abgelehnt.

### Sticky-Auswahl-Form
- **A (gewählt): horizontale Chip-Leiste.** Pro: Ein-Tipp-Wechsel, schnell auf Touch, kein
  Overlay. Con: bei sehr langer Liste horizontales Scrollen.
- **B: natives `<select>`/Dropdown.** Pro: skaliert auf beliebige Länge, OS-Picker. Con: zwei
  Taps (öffnen + wählen), langsamer für den häufigen Wechsel. → additiv nachrüstbar, vorerst
  zurückgestellt.

## Begründung

Der Leitgedanke bleibt wie in ADR-034 **maximale Wiederverwendung bei minimaler neuer Fläche**:
Die per-Teilnehmer-Karte wird zum gemeinsamen präsentationalen Baustein, den F5 flach und F7
als Akkordeon nutzt – **eine** Quelle für Kopf + Summen + Erfassung, kein Duplikat, keine
Änderung an F5. Alle neuen Entscheidungen liegen in der **Präsentations-/Client-Schicht** und
sind reversibel (Chips↔Dropdown, Persistenz-Schlüssel), was schnelle Entscheidungen rechtfertigt
(architecture-principles: reversible Entscheidungen schnell treffen). Der einzige Eingriff in einen
**bereits ausgelieferten Vertrag** ist das localStorage-Schema (#54) – deshalb der explizite
Migrationspfad D6 und die geräte-lokale, anonyme Persistenz-Linie (konsistent mit ADR-034 D4).

## Konsequenzen

**Positive:**
- Fokus auf den Ziel-Teilnehmer; „Für mich" macht den häufigsten Fall zum Ein-Tipp-Weg.
- F5 bleibt unverändert; DRY über die wiederverwendete Karte.
- Kein Datenmodell/keine Migration/keine Dependency/kein neuer Auth-Pfad – additiv auf ADR-034.
- Read-only „geschenkt" über denselben Akkordeon-Pfad (`editable={false}`, kein Gate).

**Negative / Trade-offs:**
- Neue Client-Komponente `FokusListe` + Export/optionale Props an der Karte (etwas mehr Fläche in
  `app/_verzehr`).
- Client-State (Akkordeon/Auswahl) und ein geändertes localStorage-Schema inkl. Legacy-Adoption
  (D6) – muss getestet werden (Keep-Test Alt→Neu, Stale-Fallbacks, Storage-nicht-verfügbar).
- Chip-Leiste bei sehr langer Liste nur horizontal scrollbar (Dropdown/Suche bewusst zurückgestellt).
- Persistenz bleibt geräte-lokal: Gerätewechsel/Storage-Clear vergisst Erfasser+Ziel (akzeptiert –
  je ein Klick).

## Implementierungs-Hinweise
Siehe **Technische Notizen** in
[`tasks/task-183-teilnehmer-fokus-verzehrerfassung.md`](../../tasks/task-183-teilnehmer-fokus-verzehrerfassung.md)
(betroffene Dateien, TDD-Reihenfolge, Testfälle für Zweischritt/„Für mich"/Akkordeon/Stale/
Legacy-Adoption). Keine `docs/routes.md`-Änderung (keine neue Route), keine Migration.
