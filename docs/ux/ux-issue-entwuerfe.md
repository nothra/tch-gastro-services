# UX-Überarbeitung – Issue-Übersicht

> **Status:** Als GitHub-Issues angelegt am 30.09.2026 (#368–#375). Die Abschnitte unten sind
> die Ausgangsfassung der Issue-Texte; **kanonisch ist ab jetzt das jeweilige Issue** – diese
> Datei hält Herkunft, Reihenfolge und Abhängigkeiten der Überarbeitung fest.
> Grundlage: Code-Audit aller UI-Dateien unter `app/` plus Durchklicken in Handy-Breite
> (375 px). Klickbares Mockup zur Richtung (privat, Freigabe über den Ersteller):
> <https://claude.ai/artifact/Mv2XqxDzaHAubMxAZFnTqo>. Die Richtung ist abgenommen.
> Labels nach `docs/factory/guidelines/git-workflow.md` → „GitHub-Labels" (genau ein Art-Label).
> Vor der Umsetzung durchläuft jedes Issue `/requirements`; die mit **ADR-Trigger** markierten
> zusätzlich `/architecture`.

## Reihenfolge und Abhängigkeiten

```
#368 UI-Grundlage (UX-1)     ──┬─> #369 Detailseite (UX-2)
                               ├─> #370 Verzehr-Erfassung (UX-3)
                               ├─> #371 Kassieren (UX-4)
                               ├─> #372 Bestätigen & Rückmelden (UX-5)
                               ├─> #373 Listen zuerst (UX-6)
                               └─> #374 Navigation & Startseite (UX-7)
#375 Wording-Glossar (UX-8)  (parallel zu #368, fließt in alle ein)
```

| # | Issue | Titel | Art-Label | Aufwand | Verwandte Issues |
|---|---|---|---|---|---|
| UX-0 | – | ~~Theke zeigt Standard-Katalog~~ – bereits durch #365/#366 behoben | – | – | #365 |
| UX-1 | #368 | Gemeinsame UI-Grundlage: Tokens, Bausteine, Schrift | `enhancement` | M | #306 |
| UX-2 | #369 | Veranstaltungs-Detailseite neu ordnen | `enhancement` | M | #307, #181 |
| UX-3 | #370 | Verzehr-Erfassung kompakt und touch-tauglich | `enhancement` | M | #205 |
| UX-4 | #371 | Kassieren: Summe oben, Spende live, Abschluss auf der Detailseite | `enhancement` | M | #305, #272 |
| UX-5 | #372 | Einheitliches Bestätigen und Rückmelden | `enhancement` | S–M | #306 |
| UX-6 | #373 | Listenseiten: Liste zuerst, Anlegen per Button | `enhancement` | M | – |
| UX-7 | #374 | Header, Startseite und Zurück-Navigation | `enhancement` | S | – |
| UX-8 | #375 | Wording-Glossar für UI-Texte | `documentation` | S | – |

---

## UX-0 · entfällt

Der Audit-Befund „Theke lädt den Standard-Katalog statt des Katalogs der Veranstaltung" wurde
gegen einen veralteten lokalen `main` erhoben. Er ist durch #365/#366 bereits behoben: die
Theken-Seite lädt `listActiveCatalog(veranstaltung.catalogId)`, und `applyVerzehrAdjust` bindet
den Artikel serverseitig an `ziel.catalogId`. Das versehentlich angelegte Issue #367 ist als
Duplikat geschlossen.

---

## UX-1 · #368 · feat: gemeinsame UI-Grundlage (Tokens, Bausteine, Schrift)

**Labels:** `enhancement` · **ADR-Trigger:** Wahl des Komponenten-Ansatzes (shadcn/ui wie in
ADR-014 vorgesehen vs. eigene schlanke Bausteine)

### Problem
Es gibt keine gemeinsamen UI-Bausteine. Jede der 44 UI-Dateien stylt selbst:
- Hauptbutton in **6 Varianten** und zwei Farbfamilien: die Katalog-Seite nutzt `blue-600`,
  der Rest `cyan-700`. Hover nur bei Blau.
- Nebenbutton in **7+ Varianten**, drei Eckenradien (`rounded`, `rounded-md`, `rounded-lg`).
- Derselbe Eingabefeld-Klassenstring ist **9×** kopiert.
- `globals.css` definiert nur `--background`/`--foreground`; keine Komponente nutzt sie.
- Geist wird geladen (`layout.tsx`), aber `globals.css:25` überschreibt mit Arial.
- `h2` ist nur `font-semibold` in Fließtextgröße (20×), optisch kaum Hierarchie.
- 21× `text-red-600` und 9× `text-green-700` ohne Dark-Mode-Variante.
- shadcn/ui steht im Tech-Stack (PROJECT-CONTEXT), ist aber nicht installiert.

### Ziel
Ein kleiner, verbindlicher Satz an Tokens und Bausteinen, auf den alle weiteren UX-Issues
aufsetzen.

### Akzeptanzkriterien
- **AK1** – Farb-Tokens (Akzent = Vereins-Cyan, Fläche, Linie, Text, gedämpfter Text, Gefahr,
  Erfolg, Warnung) je für hell und dunkel, als Tailwind-Theme verfügbar.
- **AK2** – Bausteine mit Tests: `Button` (Varianten `primary`, `secondary`, `danger`, `ghost`;
  Größen mit **mindestens 44 px** Touch-Höhe), `Field` (Label + Input + Hinweis/Fehler, per
  `id` verknüpft), `Card`, `Badge` (Status), `Notice` (Erfolg/Fehler mit `role="status"` bzw.
  `role="alert"`), `PageHeader` (Zurück-Link, Titel, Meta, optionale Aktion).
- **AK3** – Geist wird tatsächlich angezeigt (Arial-Override entfernt).
- **AK4** – Typo-Skala festgelegt: h1, h2, h3 unterscheidbar; Beträge mit `tabular-nums`.
- **AK5** – Mindestens die Login-Seite und die Katalog-Seite sind auf die Bausteine umgestellt
  (Nachweis; Rest folgt in UX-2 … UX-7).
- **AK6** – Keine rohen Tailwind-Farbklassen in umgestellten Dateien (Lint-Regel oder
  Review-Kriterium – in `/requirements` entscheiden).

### Nicht im Scope
Seiten-Umbauten (UX-2 ff.), Lade-Indikator-Strategie (#306, nutzt aber die Bausteine).

---

## UX-2 · #369 · feat: Veranstaltungs-Detailseite neu ordnen

**Labels:** `enhancement` · **Abhängig von:** UX-1 · **Überschneidung:** #307 (Link kompakter),
#181 (QR drucken)

### Problem
`/veranstaltung/[id]` stapelt bis zu **10 Blöcke und 6 Formulare**, auf dem Handy rund drei
Bildschirme lang:

> Abschließen → Katalog wechseln → Bearbeiten → (Bericht) → Verzehr/Auslagen/Kassieren →
> Link + QR (192 px) → Teilnehmer hinzufügen → Walk-in-Formular → Teilnehmerliste → Löschen

Die drei täglichen Arbeitsschritte beginnen erst unten auf dem ersten Bildschirm, die
Teilnehmerliste ganz unten. „Abschließen" steht oben und wirkt ohne Rückfrage.

### Akzeptanzkriterien
- **AK1** – Reihenfolge: Seitenkopf (Titel, Datum, Kasse, Status als Badge) → drei
  Arbeitsschritt-Kacheln (Verzehr, Auslagen, Kassieren) mit Kurzkennzahl (z. B. Verzehr-Summe,
  „3 von 5 bezahlt") → Teilnehmerliste → eingeklappter Bereich „Einstellungen".
- **AK2** – „+ Teilnehmer" sitzt an der Liste und öffnet **einen** Dialog: Auswahl aus den
  Stammteilnehmern (mit Suche, Mehrfachauswahl) **und** darunter „Neuer Gast" (ersetzt das
  separate Walk-in-Formular).
- **AK3** – Ein Tipp auf eine Teilnehmerzeile öffnet deren Verzehr (`?zeile=`); „Entfernen"
  liegt in einem Zeilenmenü und verlangt Bestätigung (UX-5).
- **AK4** – Unter „Einstellungen" (standardmäßig zu): Katalog, Bezeichnung/Datum/Kasse,
  „Link & QR teilen" (öffnet Dialog; Abgleich mit #307) und „Veranstaltung löschen".
- **AK5** – „Abschließen" / „Wieder öffnen" steht nicht mehr auf der Detailseite, sondern am
  Ende von Kassieren (UX-4). Bei abgeschlossenen Veranstaltungen ersetzt der Abschlussbericht
  die Kacheln-Kennzahlen, „Wieder öffnen" bleibt erreichbar.
- **AK6** – Auf 375 px sind Kopf, alle drei Kacheln und die ersten Teilnehmer ohne Scrollen
  sichtbar (E2E-Screenshot-Nachweis).

---

## UX-3 · #370 · feat: Verzehr-Erfassung kompakt und touch-tauglich

**Labels:** `enhancement` · **Abhängig von:** UX-1 · **Überschneidung:** #205

### Problem
- Der Kartenkopf quetscht Name und „Getränke · Essen · Kaffee · Gesamt" nebeneinander, der
  Name bricht dreizeilig um (`app/_verzehr/VerzehrErfassung.tsx:118`).
- Aufgeklappt folgt eine lange, gleichförmige Liste; die Kategorie-Überschrift ist winzig und
  grau. Artikel mit mehreren Größen sind eingerückt, einzelne nicht.
- +/− sind 32 px groß (`MengeControl.tsx:36`), zu klein für den Theken-Einsatz.

### Akzeptanzkriterien
- **AK1** – Kopf der aktiven Person: Name groß, Gesamtbetrag groß rechts, die
  Kategorie-Aufschlüsselung klein darunter; bleibt beim Scrollen sichtbar.
- **AK2** – Kategorien (Getränke, Kaffee, Essen) als Umschalter; es ist immer genau eine
  Kategorie sichtbar.
- **AK3** – Einheitliches Zeilenmuster: Artikelname als Gruppenüberschrift, jede Größe eine
  Zeile mit Preis und Stepper; Einzelartikel folgen demselben Muster.
- **AK4** – +/− und Personen-Chips mindestens 44 × 44 px; „−" ist bei Menge 0 deaktiviert.
- **AK5** – „Nächste Person →" am Seitenende bzw. in einer fixierten Fußleiste.
- **AK6** – Gilt für beide Einstiege (Veranstalter-Seite und öffentliche Theke), da beide
  `_verzehr` nutzen.

---

## UX-4 · #371 · feat: Kassieren – Summe oben, Spende live, Abschluss auf der Detailseite

**Labels:** `enhancement` · **Abhängig von:** UX-1 · **Überschneidung:** #305 (offener Betrag,
wird abgelöst), #272 (Listen-Refactor)

### Problem
„Abschließen" steht auf der Kassieren-Seite und ist auf der Detailseite nicht mehr auffindbar
(Wieder öffnen). Tagessummen, Gesamtabrechnung und Protokoll sind drei lange Tabellen
hintereinander. Der offene Betrag fehlt (#305).

### Akzeptanzkriterien
Die verbindlichen AK stehen in `docs/specs/spec-371-kassieren-summe-abschluss.md`. Kurzfassung:
- Summenkarte oben: offener Betrag, Erhalten, Spenden, „x von n bezahlt" (löst #305 ab).
- Je Zeile Verzehr-Gesamt, Status-Badge, Spende live vor dem Absenden; **keine Schnellbeträge**
  (in `/requirements` verworfen).
- Rückmeldung nach dem Kassieren mit Betrag und Spende (Notice).
- Tagessummen, Gesamtabrechnung und Protokoll eingeklappt unter „Abrechnung im Detail".
- Kassieren-Seite ohne Statuswechsel; „Veranstaltung abschließen"/„Wieder öffnen" **nur im Kopf
  der Detailseite**, mit Bestätigung (bei offenen Zeilen mit Anzahl und Betrag).
- Eingefrorene Reihenfolge (#253) bleibt erhalten.

---

## UX-5 · #372 · feat: einheitliches Bestätigen und Rückmelden

**Labels:** `enhancement` · **Abhängig von:** UX-1 · **Überschneidung:** #306 (Lade-Feedback)

### Problem
- Ohne Rückfrage wirken: Teilnehmer entfernen (`ZeileRow`), Auslage löschen (`AuslageRow:98`),
  Katalog deaktivieren (`CatalogControls:92`), Veranstaltung abschließen (`StatusToggle`).
  Die Lösch-Buttons sind grau statt als Gefahr gestylt.
- Die vier vorhandenen Dialoge (`VeranstaltungLoeschen`, 3× `CatalogControls`) sind kopierter
  Code ohne Escape, ohne Fokusführung, mit unverknüpften Labels.
- Erfolgsmeldungen uneinheitlich („Gespeichert.", „Änderungen gespeichert.", „Katalog
  gewechselt.") oder fehlend (Status, Inline-Edits, Katalog-Dialoge); kein `role="status"`.

### Akzeptanzkriterien
- **AK1** – Ein `ConfirmDialog`-Baustein (natives `<dialog>` mit `showModal()`, Escape,
  Fokus-Rückgabe, Gefahr-Variante); alle vier bestehenden Dialoge nutzen ihn.
- **AK2** – Alle unumkehrbaren oder folgenreichen Aktionen oben verlangen Bestätigung; der
  Dialog nennt, was betroffen ist (Name, Betrag).
- **AK3** – Lösch-/Entfernen-Aktionen nutzen die `danger`-Variante.
- **AK4** – Jede erfolgreiche Schreibaktion gibt eine Rückmeldung über **einen** Mechanismus
  (Notice/Toast mit `role="status"`); Fehler über `role="alert"`.
- **AK5** – Meldungstexte nach dem Glossar (UX-8).
- **AK6** – Ist eine Aktion nicht ausführbar (z. B. „Veranstaltung löschen", wenn Verzehr,
  Kassiertes oder Auslagen erfasst sind), nennt der Dialog das **sofort beim Öffnen** samt Grund
  und bietet keine Bestätigung an; die Ablehnung kommt nicht erst nach dem Absenden. Dafür wird
  die Löschbarkeit vor dem Öffnen geprüft (Datenlage in `/requirements` klären).

---

## UX-6 · #373 · feat: Listenseiten – Liste zuerst, Anlegen per Button

**Labels:** `enhancement` · **Abhängig von:** UX-1

### Problem
- `/veranstaltung`: Die Formulare „Veranstaltung anlegen" und „Stehende Theke einrichten"
  belegen auf dem Handy den ganzen ersten Bildschirm; die Liste beginnt darunter.
- `/verwaltung/katalog/[id]`: „Artikel anlegen" belegt den ersten Bildschirm; 24 Artikel als
  hohe Einzelkarten mit je zwei Buttons, ohne Gruppierung (≈ 6 Bildschirme). Die Katalogwahl
  per Radiobutton navigiert sofort.
- `/verwaltung/teilnehmer`: gleiches Muster.

### Akzeptanzkriterien
- **AK1** – Jede Listenseite zeigt die Liste zuerst; „+ Neu" im Seitenkopf öffnet das
  Anlege-Formular (Dialog oder eigene Seite – in `/requirements` entscheiden).
- **AK2** – Veranstaltungen gruppiert in „Offen" und „Abgeschlossen" (letztere eingeklappt).
- **AK3** – „Stehende Theke einrichten" wandert in die Verwaltung (Abgleich mit #181).
- **AK4** – Katalog-Artikel kompakt als Zeilen, gruppiert nach Kategorie; Bearbeiten per Tipp
  auf die Zeile, Deaktivieren im Bearbeiten-Dialog.
- **AK5** – Katalogwahl als Auswahlliste im Seitenkopf statt Radiobuttons.
- **AK6** – Leere Zustände enthalten die passende Anlege-Aktion.
- **AK7** – Jede Veranstaltungszeile zeigt neben Datum und Bezeichnung auch **Katalog** und
  **Kasse** (Badges oder Meta-Zeile); seit #346 ist der Katalog je Veranstaltung wählbar.

---

## UX-7 · #374 · feat: Header, Startseite und Zurück-Navigation

**Labels:** `enhancement` · **Abhängig von:** UX-1

### Problem
- Der Header zeigt die E-Mail-Adresse, aber keinen App-Namen und keinen Weg zur Startseite.
- Die Startseite ist nur ein Menü aus drei Kacheln.
- `PublicHeader` existiert, wird aber nirgends eingebunden; Gäste auf `/theke/[token]` sehen
  keinen Header.
- Zurück-Links nur auf Veranstaltungs-Unterseiten; Pfeilrichtung uneinheitlich
  („← Verzehr erfassen" vs. „Verzehr erfassen →").

### Akzeptanzkriterien
- **AK1** – Header: App-Name/Wortmarke links (Link zur Startseite), Navigation, Konto-Menü
  (E-Mail + Abmelden) rechts.
- **AK2** – Startseite für Veranstalter: „Offene Veranstaltungen" als Schnellzugriff, darunter
  die Bereiche.
- **AK3** – `/theke/[token]` bindet `PublicHeader` ein (oder die Komponente wird entfernt).
- **AK4** – Jede Unterseite nutzt `PageHeader` mit Zurück-Link; Vorwärts-Aktionen als Button,
  nicht als Pfeil-Link.

---

## UX-8 · #375 · docs: Wording-Glossar für UI-Texte

**Labels:** `documentation`

### Problem
Uneinheitliche Verben und Schreibweisen:
- Anlegen / Hinzufügen / Erfassen / Einrichten
- Entfernen vs. Löschen
- Aktivieren vs. Reaktivieren
- „(EUR)" vs. „€"
- „Bitte wählen …" vs. „Bitte wählen…"
- Pfeilrichtungen
- Anglizismus „Walk-in"
- Du-Form nur an der Theke

Die Login-Seite hat keine Labels, nur Platzhaltertexte.

### Akzeptanzkriterien
- **AK1** – `docs/ux/glossar.md` legt fest: Verb je Aktionstyp, Meldungsmuster („Gespeichert",
  „<Objekt> gelöscht"), Anrede (Du an der Theke, neutral im Verwaltungsbereich – bestätigen),
  Einheiten (€), Ersatz für „Walk-in" (Vorschlag: „Neuer Gast").
- **AK2** – Verweis aus `PROJECT-CONTEXT.md` (Coding-Konventionen), damit `/implement` es lädt.
- **AK3** – Login-Seite mit sichtbaren Labels (kleiner Code-Anteil, kann auch in UX-1).

---

## Optional · Demo-Datensatz für Design-Arbeit

Die Dev-DB enthält Test-Rückstände („E2E346 …", „Testbier 354321"), die jede
Design-Beurteilung verzerren. Ein `pnpm db:seed:demo` mit realistischen Beispieldaten
(Montagsrunde, 8–10 Teilnehmer, gängige Getränke) würde Screenshots und Abnahmen erleichtern.
Schwelle Issue vs. `kleinfunde.md` gemäß ADR-043 prüfen.
