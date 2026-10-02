# ADR 054: Verzehr-Erfassung als Einzelansicht je Person statt Fokus-Akkordeon

## Status
Proposed – wird beim Implementieren auf **Accepted** geflippt (Lesson „ADR-Status beim Implementieren").

## Date
2026-10-02

## Kontext

[spec-370](../specs/spec-370-verzehr-erfassung-kompakt.md) (#370, UX-3) baut die Verzehr-Erfassung
für Handy/Theke um. Entscheidung des Auftraggebers (2026-10-01): **eine Person auf einmal**
(Personen-Chips oben, darunter nur Kopf und Artikel dieser Person), wie im Mockup – statt aller
Teilnehmer als Karten untereinander mit genau einer offenen Karte.

Das berührt zwei bestehende Entscheidungen:

- [ADR-039](039-verzehrerfassung-fokusliste-route-neutral.md) D3/D4: Beide Zugangswege rendern
  `FokusListe` – ein **Akkordeon** (genau eine oder keine Karte offen, alle Köpfe mit Summen
  sichtbar), Startzustand „keine offen".
- [ADR-035](035-selbstbedienung-erfasser-ziel-fokus.md) D2/D3: Karte mit Kopf + Summen als
  gemeinsamer Baustein, Chip-Leiste mit Akkordeon.

Nicht berührt: ADR-025 D5 (route-neutrale UI, Action als Prop), ADR-035 D1/D4/D6 (Erfasser/Ziel,
geräte-lokale Persistenz, Identity-Gate – F7-only), ADR-039 D1 (Persistenz injiziert über
`onFokusWechsel`) und ADR-052/053 (Bausteine, Tokens, Farb-Gate).

Rein **Präsentations-/Client-Schicht**: kein Datenmodell, keine Migration, keine neue
Abhängigkeit, kein neuer Auth-Pfad, keine Änderung an Server-Actions, Summenformeln oder dem
±1-Delta-Protokoll.

**Zu entscheiden:** (D1) Komponentenzuschnitt und Name, (D2) wo Zustand lebt (aktive Person,
Kategorie), (D3) Layout von sticky Kopf und Fußleiste ohne Fremd-Layout-Wissen (#205),
(D4) Schicksal von `ZeileKarte`/`VerzehrErfassung`, (D5) Messbarkeit der 44-px-Vorgabe,
(D6) Scroll-Verhalten beim Personenwechsel.

## Entscheidung

### D1 · `FokusListe` wird durch `VerzehrEinzelansicht` ersetzt; kleine, einzeln testbare Bausteine

Die Komponente ist kein Akkordeon/keine Liste mehr; der Name `FokusListe` (ADR-039 D2 behielt ihn
aus Churn-Gründen) würde jetzt irreführen. Neuer Name **`VerzehrEinzelansicht`**, Datei
`app/_verzehr/VerzehrEinzelansicht.tsx` (`"use client"`), `FokusListe.tsx` und sein Test entfallen.
Zuschnitt (SRP, jeweils ≲ 20 Zeilen pro Funktion):

| Baustein | Verantwortung | Zustand |
|---|---|---|
| `VerzehrEinzelansicht` | hält aktive Person + Kategorie, komponiert die Teile, Wechsel-Logik | ja (Client) |
| `PersonenChips` | Chip-Leiste, `aria-pressed`, Marke „hat Verzehr" | nein |
| `PersonenKopf` | Name, Gesamt, Aufschlüsselung | nein |
| `KategorieUmschalter` | Segment-Umschalter (nur vorhandene Kategorien) | nein |
| `ArtikelListe` | Gruppen (`gruppiereArtikel`) → je Größe eine `PositionZeile` | nein |
| `MengeControl` | Stepper (44 px), Server-Action-Aufruf | `useActionState` (wie heute) |
| `kategorien.ts` | reine Funktion: sichtbare Kategorien einer Person (aus Katalog + inaktiven Positionen) | – |

Die route-neutrale Prop-Schnittstelle bleibt die aus ADR-039 D1/#308 (`zeilen`, `artikel`,
`positionen`, `action`, `editable`, `initialOpenId` → umbenannt **`initialeZeileId`**,
`onFokusWechsel`, `aktionJeZeile`) – damit bleiben beide Konsumenten bis auf Namen/Import
unverändert. Neu: optionale `kopfClassName` (D3).

### D2 · Zustand: aktive Person + Kategorie als lokaler Client-State der Einzelansicht

- **Aktive Person:** `useState`, initial `initialeZeileId` falls sie in `zeilen` vorkommt, sonst
  die **erste** Zeile (fail-soft, gleiche Regel wie ADR-039 D3 für unbekannte Werte; spec AK1a.5).
  Es gibt **keinen** „keine aktiv"-Zustand mehr. Verschwindet die aktive Zeile (Neuladen nach
  paralleler Entfernung), fällt die Ableitung auf die erste zurück (spec FS3) – abgeleitet beim
  Rendern, nicht per Effekt (Lesson `set-state-in-effect`).
- **Kategorie:** `useState`, initial die erste vorhandene in der Reihenfolge Getränke, Kaffee,
  Essen; sie **bleibt beim Personenwechsel erhalten** (spec AK2.4). Ist die gemerkte Kategorie für
  die neue Person nicht vorhanden (nur möglich beim Eintrag „Nicht mehr im Katalog", D4), fällt sie
  auf die erste vorhandene zurück – ebenfalls beim Rendern abgeleitet.
- **Kein URL-/Storage-Zustand** für die Kategorie (YAGNI). Der Personenbezug bleibt wie bisher
  `?zeile=` (F5) bzw. die geräte-lokale Ziel-Merkung (F7, über `onFokusWechsel`).
- „Nächste Person →" läuft **zyklisch** (letzte → erste, spec AK5.2) und ist nur bei ≥ 2 Teilnehmern sichtbar.
- `onFokusWechsel` feuert beim Wechsel **per Chip oder „Nächste Person"** – nicht mehr beim
  Auf-/Zuklappen (gibt es nicht mehr). Semantik für F7 bleibt: „gewählte Person = Ziel".

### D3 · Sticky Kopf als ein Block; Fußleiste `fixed`; Bleed per `className` des Konsumenten

- Chips, Kopf und Kategorie-Umschalter sind **ein** sticky Block (`sticky top-0`, Token-Fläche
  als Hintergrund) – statt heute Chip-Leiste sticky und Kartenkopf nicht. Das erfüllt spec AK1.3
  und beseitigt das `scroll-mt-16`-Kopplungsproblem (#188): es gibt keine Karte mehr, die unter
  der Leiste einrasten müsste.
- Den seitlichen Bleed (Hintergrund über die Seitenränder des Konsumenten hinaus) steuert der
  **Konsument** über `kopfClassName` (beide Seiten: derselbe Wert, derzeit `-mx-6 px-6` passend zu
  `p-6`). Die Komponente kodiert **kein** Eltern-Padding mehr – das ist der Kern von #205 und
  folgt der Lesson „Fremd-Layout-Offset vom Konsumenten via `className`" (#188).
- Fußleiste („Nächste Person →" + optional `aktionJeZeile`-Baustein) ist `fixed inset-x-0
  bottom-0` mit innerem `mx-auto max-w-3xl`, Safe-Area-Innenabstand
  (`env(safe-area-inset-bottom)`) und einem Platzhalter gleicher Höhe am Ende des Inhalts, damit
  nichts verdeckt wird. `sticky bottom-0` genügt nicht: bei kurzem Inhalt stünde die Leiste
  mitten auf der Seite statt am Bildschirmrand.

### D4 · `ZeileKarte` entfällt; `VerzehrErfassung` schrumpft zur Nur-Lese-Übersicht

`ZeileKarte` (inkl. `collapsible`/`open`/`onToggle`) hat nach dem Umbau keinen Konsumenten außer
`VerzehrErfassung` und wird entfernt. `VerzehrErfassung` bleibt **nur** für den Zustand vor der
Namenswahl der Theke (Identity-Gate Schritt 1/2, spec-54 AC B) und wird zu einer schlanken
Nur-Lese-Liste **Name + Gesamtbetrag** je Teilnehmer (Name `VerzehrUebersicht`; `KEIN_TEILNEHMER_HINWEIS`
wandert mit). Begründung: Der Auftraggeber hat die Einzelansicht für die *Erfassung* entschieden,
nicht das Entfernen der Übersicht vor der Namenswahl – das wäre eine eigene Produktentscheidung
(spec-370, 2026-10-02 bestätigt: Nur-Lese-Liste Name + Gesamt bleibt). `VerzehrUebersicht` ist billig
entfernbar, falls sich das ändert. Positionen auf deaktivierten Artikeln (ADR-026 D3) erscheinen
in der Einzelansicht als zusätzlicher Umschalter-Eintrag „Nicht mehr im Katalog", **nur** wenn die
aktive Person solche Positionen hat (`kategorien.ts`).

### D5 · 44-px-Vorgabe: Klassen im Unit-Test, Messung im E2E

jsdom hat kein Layout; `getBoundingClientRect()` liefert 0. Die Unit-Tests prüfen daher die
Zusicherung **strukturell** (Button-Baustein bzw. `min-h-11 min-w-11` am Stepper/Chip/Umschalter);
das **Messen** (spec AK4.1/4.2: „gemessen, nicht nur Klasse") übernimmt ein Playwright-Test mit
`boundingBox()` bei 375 px. Stepper-Knöpfe nutzen `buttonClasses`/`Button` aus ADR-052 (Variante
`secondary`/`ghost`, Breite per `className` – erlaubt für Layout), keine neue Kopie eines
Klassenstrings (spec AK4.6).

### D6 · Personenwechsel scrollt nach oben, Guard bleibt

Beim Wechsel (Chip oder „Nächste Person") und beim Mounten mit gesetzter Start-Person wird, wie in
ADR-039/#188, **im nächsten Frame** (`requestAnimationFrame`, `raf-stub` für Tests) nach oben
gescrollt – `window.scrollTo?.({ top: 0 })`, guarded (jsdom: „not implemented"). Weil Kopf und
Chips sticky sind, genügt „oben"; ein Ziel-Element mit `scroll-margin` entfällt. Der aktive Chip
wird per `scrollIntoView?.({ inline: "center", block: "nearest" })` in der Leiste sichtbar gehalten
(spec AK1a.3), ebenfalls guarded.

## Alternativen

### A · Zuschnitt der Komponente
- **A1 (gewählt): neue `VerzehrEinzelansicht` + kleine Bausteine, `FokusListe`/`ZeileKarte`
  entfernen.** Pro: Name sagt, was sie tut; jede Einheit klein und isoliert testbar; kein toter
  Akkordeon-Code. Con: größerer Diff (Rename/Delete + Neuanlage), Tests von `FokusListe` werden
  neu geschrieben statt angepasst.
- **A2: `FokusListe` behalten und intern auf „eine Karte, ohne Köpfe anderer" umbauen.** Pro:
  kleinerer Diff. Con: Name und Doku lügen; `ZeileKarte`-Collapse-Props blieben als toter Pfad
  oder als verkleidete Kompatibilität; widerspricht Clean-Code-Naming. → abgelehnt.

### B · Kategorie-Zustand
- **B1 (gewählt): lokaler State, bleibt über Personen erhalten.** Pro: schnell, ein Zustand, passt
  zum Zügig-Erfassen derselben Kategorie für mehrere Personen. Con: geht beim Neuladen verloren
  (akzeptiert).
- **B2: Kategorie je Person merken oder in der URL.** Pro: überlebt Neuladen. Con: mehr Zustand und
  Komplexität ohne belegten Bedarf (YAGNI); URL-Zustand überschneidet sich mit dem `?zeile=`-Vertrag
  (#308). → zurückgestellt, additiv nachrüstbar.

### C · Fußleiste
- **C1 (gewählt): `fixed` am Viewport-Rand mit Platzhalter.** Pro: spec AK5.1 („fixiert") bei jeder
  Inhaltslänge. Con: Platzhalter nötig; Zusammenspiel mit mobiler Browserleiste per Safe-Area.
- **C2: `sticky bottom-0` im Seitenfluss.** Pro: kein Platzhalter. Con: bei kurzem Inhalt nicht am
  Bildschirmrand. → abgelehnt.
- **C3: „Nächste Person" nur am Seitenende.** Pro: einfachste Lösung (spec AK5 erlaubt „bzw.").
  Con: bei langer Artikelliste erst nach Scrollen erreichbar – genau der Handy-Fall, den #370
  lösen soll. → abgelehnt.

### D · Übersicht vor der Namenswahl
- **D1 (gewählt): Nur-Lese-Liste Name + Gesamt bleibt.** Pro: kein Informationsverlust ohne
  Entscheidung; klein; billig entfernbar. Con: ein weiterer Baustein.
- **D2: Übersicht streichen, vor der Wahl nur die Fragen.** Pro: weniger Code. Con: nimmt dem Gast
  die Sicht auf die Gesamtliste. → vom Auftraggeber abgelehnt (2026-10-02).

## Begründung

Die Entscheidung folgt der etablierten Linie – route-neutrale Präsentation, Persistenz als
injizierter Callback beim Konsumenten (ADR-025 D5, ADR-039 D1) – und ändert nur, was der
Auftraggeber geändert haben will: die Darstellung. Sie ist vollständig reversibel (reine
Client-Komponente, Schnittstelle zu den Konsumenten praktisch gleich). Kleine Bausteine mit
reinen Hilfsfunktionen (`kategorien.ts`, `gruppiereArtikel`) halten die Testbarkeit hoch; der
einzige browserabhängige Teil (Maße) ist bewusst in den E2E-Test verlegt statt in unzuverlässige
jsdom-Assertions. Die in ADR-052 festgelegten Bausteine und das Farb-Gate gelten für die
berührten Dateien ab sofort (`app/_verzehr/` kommt in `eslint/ui-token-files.mjs`).

## Konsequenzen

**Positiv:**
- Kopf, Kategorie und Artikel einer Person sind auf dem Handy ohne Scrollen erreichbar; kurze
  Liste, 44-px-Ziele, „Nächste Person" immer sichtbar.
- Kein hartes Eltern-Padding mehr in der route-neutralen Komponente (#205 erledigt) und kein
  `scroll-mt-16`-Offset mehr (#188-Kopplung entfällt).
- Eine Quelle für beide Zugangswege bleibt bestehen; kein Akkordeon-Zustand mehr zu pflegen.

**Negativ / Trade-offs:**
- **Transparenz:** Die Summen der anderen Teilnehmer stehen in der Erfassung nicht mehr
  untereinander (bewusst, siehe Kontext); die Gesamtsichten liegen in Detailseite (#369) und
  Kassieren (#371).
- Größerer Diff; die Tests von `FokusListe`/`ZeileKarte`/`VerzehrErfassung` (≈ 1 000 Zeilen) werden
  durch Tests der neuen Bausteine ersetzt – nicht gelöscht, ohne Ersatz (spec AK7.3).
- Kategorie-Wahl geht beim Neuladen verloren.

**Drift-Hinweise (im selben PR nachzuziehen):**
- [ADR-039](039-verzehrerfassung-fokusliste-route-neutral.md): D2/D3/D4 **abgelöst** (Akkordeon,
  Startzustand „keine offen", Read-only „alle eingeklappt", Name `FokusListe`); D1 (Callback) gilt
  weiter. Banner an den betroffenen Stellen.
- [ADR-035](035-selbstbedienung-erfasser-ziel-fokus.md): D2 (Karte als Akkordeon) und D3 (Chip-
  Leiste als Akkordeon-Kopf) **abgelöst**; D1, D4, D5 (Read-only ohne Gate), D6 gelten fort.
- [spec-54](../specs/spec-54-selbstbedienung-link.md) AC B (Liste mit laufenden Summen) – Verweis
  auf diese ADR und spec-370.
- `docs/routes.md`: keine Routen-/Zugriffsänderung; Funktionsbeschreibung der F5-Route ggf. präzisieren.
- `eslint/ui-token-files.mjs`: `app/_verzehr/` ergänzen.

## Implementierungs-Hinweise
Siehe **Technische Notizen** in
[`tasks/task-370-verzehr-erfassung-kompakt-touch.md`](../../tasks/task-370-verzehr-erfassung-kompakt-touch.md).
