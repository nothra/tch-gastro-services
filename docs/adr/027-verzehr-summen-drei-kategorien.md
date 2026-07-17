# ADR 027: Verzehr-Zusammenfassung – drei Kategorien statt „Getränke/Sonstige"

## Status
Accepted

## Date
2026-07-17

## Kontext

[spec-138](../specs/spec-138-verzehr-kategorien-aufloesen.md) (#138) löst die Sammel-Anzeige
**Sonstige** in der Zeilen-Zusammenfassung der Seite *Verzehr erfassen* auf.

ADR-025 rahmte die Zeilen-Summe bewusst als **zweiwertige Lese-Gruppierung** „Getränke (Theke)"
vs. „Sonstige (Essen + Kaffee)" (ADR-025 „Schlüssel-Einsicht", D5, Frage 3). Die reine Summen-
Logik `zeileSummen` (`app/_verzehr/summen.ts`) fasst deshalb alles, was nicht `getraenk` ist, im
Topf `sonstigeCents` zusammen; `VerzehrErfassung.tsx` zeigt `Getränke · Sonstige`.

Der Katalog kennt aber **drei** Kategorien (`getraenk` / `kaffee` / `essen`, ADR-023 §D4). Die
drei **Erfassungs-Sektionen** darunter sind bereits einzeln aufgeführt (`CATEGORY_ORDER`,
`VerzehrErfassung.tsx:22`) – nur die Kopf-Summe fasst Kaffee + Essen zusammen und verdeckt so eine
fachlich getrennte Aufteilung.

Die Entscheidung ist **vollständig reversibel** (keine Prod-Daten, **keine** Schema-/Migrations-
Änderung, kein Datenmodell-Eingriff): Sie betrifft ausschließlich eine reine Lese-/Anzeige-Logik
im Modul `app/_verzehr/`. Sie revidiert jedoch die von ADR-025 **explizit** getroffene
Zwei-Töpfe-Rahmung und wird deshalb – analog zu ADR-026, das ebenfalls einen ADR-025-Randfall
fokussiert nachschärft – als eigene, kurze ADR dokumentiert.

## Entscheidung

Die Kopf-Summe je Teilnehmerzeile weist **alle drei** Katalog-Kategorien einzeln aus. Die von
ADR-025 etablierte Kern-Aussage bleibt unangetastet: Die Aufteilung ist weiterhin eine reine
**Lese-Gruppierung nach `catalog_category`**, **kein** Struktur-/Schema-Unterschied. Es entsteht
lediglich ein Lese-Topf mehr.

### D1 — `zeileSummen` liefert drei getrennte Töpfe

`ZeileSummen` wird von `{ getraenkeCents, sonstigeCents }` auf
`{ getraenkeCents, essenCents, kaffeeCents }` umgestellt. Der `else`-Zweig (alles-nicht-Getränk →
`sonstigeCents`) wird durch eine explizite Kategorie-Zuordnung ersetzt. Die Arithmetik bleibt
Integer-Cent (ADR-021), exakt ganzzahlig, keine Rundung. **Kein `sonstigeCents` mehr** – ein
sauberer Schnitt statt eines zusätzlichen, redundanten Feldes (kein Konsument außerhalb des
Moduls liest es, siehe Konsequenzen).

### D2 — Anzeige: alle drei immer sichtbar, Reihenfolge Getränke · Essen · Kaffee

Die Kopf-Zeile zeigt `Getränke {…} · Essen {…} · Kaffee {…}` in **genau dieser Reihenfolge** –
konsistent mit `CATEGORY_ORDER` (`VerzehrErfassung.tsx:22`), sodass Kopf-Summe und die Sektionen
darunter dieselbe Ordnung haben. Alle drei Kategorien werden **immer** gerendert, auch bei
`0,00 €`.

Begründung der Immer-Anzeige (statt „nur > 0 zeigen"): Eine konstante, vorhersehbare Zeile ist an
einem schnell bedienten Theken-Gerät ruhiger zu lesen als eine, deren Beträge je Teilnehmer
erscheinen und verschwinden; sie spiegelt außerdem die stets drei sichtbaren Erfassungs-Sektionen
darunter. Der „Nachteil" (0,00-€-Rauschen) ist bei nur drei festen Kategorien gering.

### D3 — Nur `summen.ts` + `VerzehrErfassung.tsx`; kein Datenmodell, keine Kassier-/Spenden-Änderung

Verzehr-Gesamt bleibt `getraenkeCents + essenCents + kaffeeCents` (wertgleich zur bisherigen
`getraenke + sonstige`). Kassieren/Spende (`Erhalten − Verzehr-Gesamt`) ist unberührt. `db/`,
Actions, Migrationen und die Erfassungs-Sektionen bleiben unverändert.

## Alternativen

### Option A: Drei Töpfe, alle drei immer anzeigen, Reihenfolge wie CATEGORY_ORDER (gewählt)
**Vorteile:** Deckt die Spec-AC wörtlich; Kopf-Summe deckungsgleich mit den drei Sektionen
darunter; sauberer Schnitt (kein toter `sonstigeCents`); reine, 100 % unit-testbare Lese-Logik;
keine Schema-Änderung.
**Nachteile:** Bei Getränke-only-Teilnehmern zeigt die Zeile `Essen 0,00 € · Kaffee 0,00 €`
(bewusst akzeptiert, D2).

### Option B: Drei Töpfe, aber nur Kategorien mit Betrag > 0 anzeigen
**Vorteile:** Kein 0,00-€-Rauschen.
**Nachteile:** Variable Zeilenbreite/Inhalt je Teilnehmer; inkonsistent zu den stets drei
sichtbaren Erfassungs-Sektionen; mehr bedingte Render-Logik + zusätzliche Testfälle für einen
kosmetischen Gewinn. In dieser Session gegen A entschieden.

### Option C: Zwei-Töpfe-Rahmung beibehalten, kein ADR (Status quo)
**Vorteile:** Kein Aufwand.
**Nachteile:** Verfehlt das Ziel von #138; die fachlich getrennten Kategorien Kaffee/Essen bleiben
verdeckt. Verworfen.

### Nebenentscheidung: `sonstigeCents` als drittes Feld behalten vs. ersetzen
- **Gewählt:** ersetzen (`essenCents` + `kaffeeCents`, kein `sonstigeCents`). Kein Konsument liest
  `sonstigeCents` außerhalb des Moduls (verifiziert per `grep`) → ein toter Sammel-Topf wäre
  irreführende Redundanz.
- **Verworfen:** `sonstigeCents = essenCents + kaffeeCents` zusätzlich mitführen – niemand braucht
  es; widerspricht YAGNI/Clean Code.

## Begründung

Die Kern-Architektur von ADR-025 (eine `verzehr_position`-Tabelle, Kategorie-Aufteilung als reine
Lese-Gruppierung) trägt die Änderung ohne Bruch – es kommt lediglich ein Lese-Topf hinzu. Genau
weil ADR-025 die Zwei-Töpfe-Sicht ausdrücklich benennt, wird die Revision hier festgehalten und
dort verlinkt (kanonische Quellen synchron halten, Codify W-02/W-03). Option A ist die kleinste
Lösung, die die Spec vollständig erfüllt und die Kopf-Summe an die bereits kategorienweise
gegliederte UI angleicht.

## Konsequenzen

**Positiv:**
- Kaffee und Essen sind in der Zeilen-Summe getrennt sichtbar; Kopf-Summe und Sektionen sind
  konsistent (gleiche Kategorien, gleiche Reihenfolge).
- Keine Schema-/Migrations-/Datenmodell-Änderung; Verzehr-Gesamt und Kassier-/Spenden-Logik
  unverändert.
- Die Summen-Logik bleibt DB-frei und zu 100 % unit-testbar (ADR-025 D5).

**Zu beachten / Handoff:**
- **ADR-025** wird nicht neu geschrieben; seine „Getränke/Sonstige"-Formulierung (Schlüssel-
  Einsicht, D5, Frage 3) ist ab hier durch diese ADR präzisiert (Verweis nachtragen, analog dem
  ADR-026-Verweis).
- **Veraltete `(Getränke/Sonstige)`-Kommentare** in `summen.ts`, `summen.test.ts` und
  `VerzehrErfassung.tsx` (Zeile ~21) beim Implementieren auf die Drei-Kategorien-Sicht angleichen
  – nicht neben der neuen Formulierung stehen lassen (Codify W-02/W-03).
- **F7 (#54, öffentliche Theke)** blendet Essen aus (ADR-023 §D7). `zeileSummen` bleibt neutral:
  ohne Essen-Positionen ist `essenCents = 0`; ob die Theke-UI die 0-Essen-Kategorie anzeigt oder
  ausblendet, entscheidet F7 an der Aufrufstelle – die reine Summen-Logik erzwingt nichts.

## Implementierungs-Hinweise (für den Coding-Agenten)

- **TDD, Red → Green** – zuerst die Tests umschreiben (sie sind aktuell auf `sonstigeCents`
  formuliert), dann die Produktion anpassen.
- `app/_verzehr/summen.ts`:
  - `ZeileSummen` → `{ getraenkeCents: number; essenCents: number; kaffeeCents: number }`.
  - `zeileSummen`: drei Akkumulatoren; `switch (position.category)` bzw. explizites Mapping statt
    `if getraenk … else`. Modul-Kommentar (Zeilen 3–5) auf „drei Kategorien" aktualisieren.
- `app/_verzehr/summen.test.ts`:
  - Alle `sonstigeCents`-Assertions auf `essenCents`/`kaffeeCents` umstellen; je Kategorie ein
    eigener Test (AC-1..AC-3). Leer-Fall und `menge = 0`-Fall auf drei Felder erweitern. `toEqual`
    im Mixed-Fall gegen das volle Drei-Felder-Objekt (Codify: erwarteter Wert als Literal).
- `app/_verzehr/VerzehrErfassung.tsx`:
  - Kopf-Summe (Zeile ~86): `Getränke {formatCents(summen.getraenkeCents)} · Essen
    {formatCents(summen.essenCents)} · Kaffee {formatCents(summen.kaffeeCents)}`.
  - Veralteten Kommentar Zeile 21 („Essen + Kaffee (Sonstige)") angleichen.
- `app/_verzehr/VerzehrErfassung.test.tsx`:
  - Component-Test: eine Zeile mit Positionen in mehreren Kategorien → alle drei Beträge sichtbar
    (AC-4); eine Getränke-only-Zeile → Essen und Kaffee mit `0,00 €` sichtbar (AC-5).
- **Nicht anfassen:** `db/`, Actions, Migrationen, die Erfassungs-Sektionen, der Abschnitt „Nicht
  mehr im Katalog" (ADR-026), Kassier-/Spenden-Logik.
