# Spec: Veranstaltung anlegen & führen (inkl. stehende Theken-Selbstbedienung)

> Feature F4 · Issue #51 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Jeder Abrechnungsvorgang bezieht sich auf **eine Veranstaltung**. Der Abrechner legt die
Veranstaltung an, bestimmt ihr **Datum**, wählt die **Kasse**, gegen die abgerechnet wird,
und die teilnehmenden Personen/Familien aus den Stammdaten (F3). Die Veranstaltung ist die
Klammer um alle Erfassungen (F5–F8).

**Essen ist keine Eigenschaft der Veranstaltung** (Änderung 2026-07-15): Essen-Preise kommen
**ausschließlich aus dem Katalog** – eine neue Kategorie `essen` (z. B. „Essen Montagsrunde
6 €", „Bratwurst mit Brötchen 4 €"). Bei der Erfassung (F5) wird ein Essen-Katalogartikel
**gewählt**; es gibt **keinen** Essenpreis je Veranstaltung und **keine** spontane
Preiseingabe. Die Katalog-Kategorie `essen` ist eine **F2-Erweiterung in einem eigenen Issue**
(F2/#49 ist bereits gemergt).

**Begriff (Ubiquitous Language):** Der Fachbegriff ist durchgängig **Veranstaltung**.
Die **Montagsrunde** ist eine Veranstaltung unter
vielen (Dorfmeisterschaften, Vereinsfeste …). Das **Datum** ist ein erstklassiges
Pflichtfeld: Eine Veranstaltung findet an einem bestimmten Tag statt.

**Zwei Veranstaltungs-Typen (neu, Requirements-Schärfung 2026-07-15):**

1. **Datierte Veranstaltung** (`veranstaltung`) – der Regelfall (Montagsrunde etc.): vom
   **Abrechner** angelegt, mit Datum und Bezeichnung, Status `offen` → `abgeschlossen`.
2. **Stehende Theken-Selbstbedienung** (`theke`) – ein **dauerhaft offener** Vorgang **je
   Kasse** für den **spontanen Wochentag-Verzehr**: Wer unter der Woche spontan ins Clubhaus
   kommt, sich etwas aus dem Thekenkühlschrank nimmt und es für die spätere Abrechnung
   notieren will, trägt seinen Verzehr hier ein – **ohne** dass ein Abrechner anwesend ist
   und **ohne** Login/Rolle. Ein Abrechner rechnet die aufgelaufenen Einträge **später** ab
   (F8). Nutzt bewusst dieselbe Verzehr-/Kasse-/Zeilen-Mechanik wie die datierte
   Veranstaltung (maximale Wiederverwendung, minimaler Eingriff in F5/F7/F8).

**Kassen:** Veranstaltungen werden über **unterschiedliche Kassen** abgerechnet – die
Montagsrunde über ihre **eigene Kasse**, andere Veranstaltungen (z. B. Dorfmeisterschaften)
über die **Vereinskasse**. Im MVP ist die Kasse ein **fester Satz**
(`montagsrunde` | `vereinskasse`), nicht pflegbar. Die zugeordnete Kasse bestimmt, wohin
Einnahmen und Auslagenerstattungen wirken (F6/F8).

## Scope

**Inbegriffen:**
- **Datierte Veranstaltung anlegen** mit Datum (Pflicht) und Bezeichnung (z. B. „Montagsrunde").
- **Kasse** wählen (fester Satz: `montagsrunde` | `vereinskasse`, Pflichtfeld).
- Teilnehmer aus den Stammdaten (F3) auswählen → je Teilnehmer eine Abrechnungszeile.
- Solange **offen**: Teilnehmer nachträglich hinzufügen/entfernen.
- Status: `offen` → `abgeschlossen` (Abschluss in F8); Wiederöffnen durch Abrechner.
- **Namens-Snapshot je Zeile** (Vorgabe aus ADR-022): Die Zeile referenziert `teilnehmer.id`
  **und** speichert den Anzeigenamen zum Abrechnungszeitpunkt, damit abgeschlossene
  Veranstaltungen den Namen wie damals zeigen.
- **Stehende Theken-Selbstbedienung einrichten** (je Kasse ein dauerhaft offener Vorgang):
  - Dauerhaft offen, kein Abschluss durch Zeitablauf.
  - Erfassung **ohne Login/Rolle** über einen **festen** Theken-Zugang (Link/QR am
    Theken-Gerät) – kein anwesender Abrechner nötig.
  - Verzehr nur **Getränke + Kaffee** (Essen wird an der Theke im MVP nicht angeboten).
  - Namenswahl **aus den Stammdaten** (wie Selbstbedienung F7); je Person eine Zeile.
  - Ein Abrechner kassiert die offenen Einträge später (F8); die Theke bleibt danach bestehen.

**Nicht inbegriffen:**
- Wiederkehrende Serie/Vorlage mit vorbelegten Teilnehmern (Backlog #60).
- Preis-Templates je Veranstaltungstyp (Backlog #59).
- **Essenpreis am Veranstaltungs-Datensatz und spontane Preiseingabe** – entfällt. Essen kommt
  ausschließlich aus dem Katalog (Kategorie `essen`); die **Katalog-Kategorie `essen` selbst
  ist eine F2-Erweiterung in einem eigenen Issue**, die eigentliche Essen-Erfassung ist F5/#52.
- **Essen an der stehenden Theke** (bewusst nicht im MVP – nur Getränke + Kaffee).
- **Freitext-Erfassung unbekannter Gäste** an der Theke (Auswahl nur aus Stammdaten; unbekannte
  Gäste ergänzt der Abrechner später als Walk-in – offene Frage siehe unten).
- Kassieren/Erhalten/Spende selbst (F8) und die konkrete Abrechnungs-Periodik der stehenden
  Theke – nur die **Anlage/Führung** gehört hierher; das Kassieren definiert F8/#55.

## Datenmodell-Leitplanken (verbindlich, Detail → /architecture)

- **Ein Enum `veranstaltung_typ`** (`veranstaltung` | `theke`), deutsche Werte analog
  `teilnehmer_typ`/`catalog_category` (ADR-022). Beide Typen teilen sich **eine** Tabelle
  und dieselbe Verzehr-/Zeilen-Mechanik (Wiederverwendung, keine polymorphe Doppelstruktur).
- **Kasse zukunftssicher modellieren:** Im MVP fester Satz (`montagsrunde` | `vereinskasse`).
  Das Modell so schneiden, dass daraus später leicht eine **Kassen-Entität** (Referenz statt
  loses Enum-Feld) wird – nötig, sobald eine dritte Kasse dazukommt oder das Kassenbuch (#57)
  mit laufendem Saldo je Kasse kommt. Ziel: Erweiterung ohne Migration bestehender Daten.
- **Kein Essenpreis** am Veranstaltungs-Datensatz (weder `veranstaltung` noch `theke`). Essen
  ist ein Katalogartikel der Kategorie `essen` (F2); die Preis-/Cent-Behandlung erbt der Katalog
  (ADR-021, int4-Grenze, bereits in F2 abgesichert).
- **Namens-Snapshot** in der Zeile (siehe Scope/ADR-022).

## Akzeptanzkriterien – A) Datierte Veranstaltung

- [ ] GIVEN ein angemeldeter Abrechner WHEN er eine Veranstaltung mit **Datum**, Bezeichnung
      und Kasse anlegt THEN wird eine Veranstaltung vom Typ `veranstaltung` im Status `offen`
      erstellt (kein Essenpreis).
- [ ] GIVEN das Anlegen einer Veranstaltung WHEN keine Kasse gewählt ist THEN wird das
      Speichern **serverseitig** abgelehnt (Kasse ist Pflicht).
- [ ] GIVEN das Anlegen einer datierten Veranstaltung WHEN kein Datum gewählt ist THEN wird
      das Speichern serverseitig abgelehnt (Datum ist Pflicht).
- [ ] GIVEN eine offene Veranstaltung WHEN der Abrechner Teilnehmer aus den Stammdaten
      auswählt THEN entsteht je ausgewähltem Teilnehmer genau eine Zeile mit leeren
      Positionen und dem **Anzeigenamen-Snapshot**.
- [ ] GIVEN eine offene Veranstaltung WHEN der Abrechner einen weiteren Teilnehmer hinzufügt
      oder einen (noch ohne Erfassung) wieder entfernt THEN wird die Zeile ergänzt/entfernt.
- [ ] GIVEN ein Teilnehmer mit bereits erfassten Positionen WHEN versucht wird, ihn zu
      entfernen THEN wird das verhindert oder erfordert eine **bewusste Bestätigung** (kein
      Datenverlust aus Versehen).
- [ ] GIVEN eine offene Veranstaltung WHEN der **Abrechner** einen Walk-in (neuen Teilnehmer)
      anlegt THEN wird dieser in die Stammdaten übernommen und erhält eine Zeile (F3/ADR-022).
- [ ] GIVEN eine `abgeschlossene` Veranstaltung WHEN jemand sie bearbeiten will THEN ist sie
      schreibgeschützt; ein **Abrechner** kann sie protokolliert wieder öffnen (F8), danach
      sind Änderungen erneut möglich.

## Akzeptanzkriterien – B) Stehende Theken-Selbstbedienung

- [ ] GIVEN ein angemeldeter Verwalter/Abrechner WHEN er für eine Kasse eine stehende
      Theken-Selbstbedienung einrichtet THEN existiert **genau ein** dauerhaft offener Vorgang
      vom Typ `theke` für diese Kasse (idempotent – kein zweiter für dieselbe Kasse).
- [ ] GIVEN eine eingerichtete stehende Theke WHEN ein **nicht angemeldeter** Gast den festen
      Theken-Link/QR öffnet THEN sieht er die Selbstbedienung und kann seinen Namen aus den
      **Stammdaten** wählen – ohne Login und ohne Abrechner-Rolle.
- [ ] GIVEN ein Gast hat seinen Namen gewählt WHEN er Getränke/Kaffee erfasst (F5) THEN
      entsteht bzw. ergänzt sich seine Zeile in der stehenden Theke, sodass später abgerechnet
      werden kann.
- [ ] GIVEN kein Abrechner ist anwesend WHEN ein Gast an der stehenden Theke erfasst THEN ist
      das möglich, ohne dass jemand die Veranstaltung erst anlegen muss (die Theke steht bereit).
- [ ] GIVEN eine stehende Theke ist einer Kasse zugeordnet WHEN dort (später) kassiert wird
      (F8) THEN wirken die Einnahmen auf **diese** Kasse.
- [ ] GIVEN eine stehende Theke WHEN ein Abrechner die offenen Einträge später sichtet und
      abrechnet (F8) THEN bleibt die Theke danach bestehen und weiter offen (kein Abschluss
      durch Zeitablauf).

## Fehlerszenarien

- [ ] Datierte Veranstaltung ohne jeden Teilnehmer → anlegbar (Teilnehmer kommen später),
      aber Abschluss (F8) einer komplett leeren Veranstaltung erfordert Bestätigung.
- [ ] Datum in Zukunft/Vergangenheit → erlaubt (Nacherfassung möglich).
- [ ] Zweite stehende Theke für dieselbe Kasse → abgelehnt (Idempotenz), keine Dublette.
- [ ] Essen-Position an der stehenden Theke → nicht verfügbar (nur Getränke + Kaffee).
- [ ] Ungültiges/unbekanntes Theken-Token → neutraler Fehler, keine anderen Vorgänge
      preisgegeben (analog F7).
- [ ] Gast ist **nicht** in den Stammdaten → im MVP keine Selbst-Anlage; unbekannte Gäste
      ergänzt der Abrechner später als Walk-in (offene Frage siehe unten).

## Gesetzte Entscheidungen

**Aus Requirements-Session 2026-07-11:**
- **Kasse je Veranstaltung, fester Satz**, Pflichtfeld, nicht pflegbar im MVP. Laufender
  Kassenstand über mehrere Termine bleibt Backlog #57 – im MVP nur die **Kassenveränderung**
  je Veranstaltung (F8).
- ~~Essenpreis gilt je Veranstaltung einheitlich~~ – **überholt am 2026-07-15** (siehe unten: Essen
  kommt aus dem Katalog).
- **Kaffeepreis** ist der feste Katalogpreis (F2), nicht pro Termin abweichend (Backlog #59).
- **Wiederöffnen:** eine abgeschlossene Veranstaltung kann ein **Abrechner** wieder öffnen (F8).

**Aus Requirements-Schärfung 2026-07-15 (dieser Task):**
- **„Veranstaltung" ist der Primärbegriff**; **Datum ist Pflichtfeld** der
  datierten Veranstaltung.
- **Stehende Theken-Selbstbedienung** als zweiter Veranstaltungs-Typ (`theke`) für den
  spontanen Wochentag-Verzehr – dauerhaft offen, je Kasse einer, Erfassung ohne Login/Rolle
  über festen Theken-Zugang, nur Getränke + Kaffee, Namenswahl aus den Stammdaten.
- **Spontaner Gast ist kein registrierter Nutzer** und trägt keine Abrechner-Rolle – er wählt
  seinen Namen aus den Stammdaten (konsistent mit F7: Selbstbedienung wählt nur aus der Liste;
  Walk-in unbekannter Gäste bleibt beim Abrechner).
- **Beide Typen teilen ein Datenmodell** (ein `veranstaltung_typ`-Enum, eine Tabelle, dieselbe
  Verzehr-Mechanik) – keine getrennte Struktur.
- **Essen kommt ausschließlich aus dem Katalog** (neue Kategorie `essen`): feste Preise je
  Artikel (z. B. „Essen Montagsrunde 6 €", „Bratwurst mit Brötchen 4 €"). **Kein** Essenpreis
  am Veranstaltungs-Datensatz, **keine** spontane Preiseingabe. Die Katalog-Kategorie `essen`
  wird als **eigenes F2-Erweiterungs-Issue** umgesetzt (F2/#49 ist gemergt); die Essen-Erfassung
  per Katalog-Auswahl gehört zu **F5/#52** (dessen Spec wird entsprechend angepasst).

## Offene Fragen (für /architecture & /security-review)

- [ ] **Abrechnungs-Periodik der stehenden Theke:** Wie werden bereits **kassierte** von noch
      **offenen** Einträgen getrennt, wenn die Theke nie „abschließt"? (Perioden/Snapshot pro
      Kassiervorgang?) Zusammenspiel mit F8/#55 sowie Backlog #56 (offene Posten) / #57
      (Kassenbuch). → /architecture, ggf. Anpassung an #55.
- [ ] **Fester Theken-Token vs. per-Veranstaltung-Token (F7/#54):** Der Theken-Zugang ist
      **dauerhaft** gültig (nicht tagesabhängig). Token-Länge/Zufälligkeit, Rotation und eine
      Missbrauchsbremse (Rate-Limit) sind höheres Risiko als der per-Termin-Link. →
      /security-review; erweitert F7/#54.
- [ ] **Unbekannter Gast an der Theke:** Auswahl nur aus Stammdaten (MVP) vs. optionale
      Freitext-Erfassung mit späterer Zuordnung durch den Abrechner. → /architecture.
- [ ] **Kasse der stehenden Theke:** je Kasse eine Theke (bis zu zwei) – wird nur die
      tatsächlich genutzte eingerichtet? Welche Kasse zeigt der Theken-QR standardmäßig? →
      /architecture.
- [ ] **Kasse als Entität statt Enum** (Zukunftssicherheit, s. Datenmodell-Leitplanken) →
      /architecture.
- [ ] Mehrere gleichzeitig offene datierte Veranstaltungen, übriges Datenmodell → /architecture.

## Auswirkungen auf andere Specs (Terminologie-/Modell-Abgleich)

Da „Veranstaltung" der Primärbegriff ist und ein zweiter Typ (`theke`) dazukommt, ist der feste
Theken-Zugang eine **Erweiterung von F7/#54**, das Kassieren der stehenden Theke eine
**Erweiterung von F8/#55**. Kanonische Quelle bleibt der Epic-README
([README-montagsrunde.md](README-montagsrunde.md)); die dortige Feature-Tabelle wurde um den
Theken-Hinweis ergänzt.

**Essen-Modellwechsel (2026-07-15):** Essen ist nun eine Katalog-Kategorie `essen`, nicht mehr
ein Essenpreis je Veranstaltung. Das berührt:
- **F2/#49 (gemergt):** neue Katalog-Kategorie `essen` (`catalog_category`-Enum-Wert + UI/
  Validierung/Tests, Update von [spec-49](spec-49-getraenke-katalog.md), Streichen von „Essen
  gehört NICHT hierher"). → **eigenes Issue #116** (nicht Teil von #51).
- **F5/#52 (noch offen):** Essen-Erfassung wählt einen `essen`-Katalogartikel (fester Preis)
  statt eines Essenpreises je Veranstaltung; [spec-52](spec-52-verzehr-erfassen.md) wurde entsprechend
  angepasst und hängt jetzt zusätzlich von der F2-Erweiterung ab.
