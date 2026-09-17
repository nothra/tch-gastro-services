# Spec: Katalog als Entität + Migration (Grundlage Preis-Templates)

> Issue: [#59](https://github.com/nothra/tch-gastro-services/issues/59) ·
> Betroffene Wege: F2 (`/verwaltung/katalog`), F5 (`/veranstaltung/[id]/verzehr`),
> F7 (`/theke/[token]`) – jeweils **verhaltensneutral**
>
> Story-Schnitt: **#59 (hier)** Katalog als Entität → **#345** mehrere Kataloge verwalten →
> **#346** Katalog je Veranstaltung auswählen (dort landet der fachliche Nutzen).

## Kontext

Heute existiert **genau eine** Preisliste: die Tabelle `catalog_item` ist eine flache Menge von
Artikeln ohne übergeordneten Container. Die Duplikat-Regel `UNIQUE(name, size)` gilt global über
alle Artikel.

Fachlich gebraucht werden aber **mehrere Preislisten**: Kaffee kostet bei der Montagsrunde 1,00 €,
bei den Dorfmeisterschaften 2,50 €. Solange die Artikel keinen Container haben, ist das nicht
abbildbar – derselbe Artikel kann nicht zweimal mit verschiedenen Preisen existieren.

Diese Task legt **nur den Container** an: eine Katalog-Entität, der alle bestehenden Artikel
zugeordnet werden. Der Katalog **ist** das Template – ein eigener „Veranstaltungstyp" entsteht
bewusst nicht (Begründung gehört in den ADR, siehe „Offene Fragen").

**Bewusst ohne sichtbaren Nutzen.** Verwalter und Veranstalter merken nichts von der Änderung. Der
Grund ist Deploy-Sicherheit: die Migration bleibt allein deploybar (Expand/Contract) und berührt
den laufenden Montagsrunden-Betrieb nicht. Sichtbar wird das Feature erst in #345/#346.

**Günstige Randbedingung:** der Preis-Freeze je Verzehr-Position (`einzelpreisCents`, ADR-033 D2)
schützt abgeschlossene Veranstaltungen bereits heute gegen nachträgliche Katalog-Änderungen. Das
gesamte Feature kann keine Historie verfälschen.

**Erfolgsmaß dieser Slice:** nach dem Deploy ist jeder Artikel genau einem Katalog zugeordnet,
und **kein einziger** bestehender Test oder Bedienweg verhält sich anders als vorher.

## Scope

**Inbegriffen:**

- Neue Katalog-Entität mit **Name**, **Aktiv-Kennzeichen** und **Sortierung** (Feldliste laut
  Issue #59).
- Pflicht-Katalogbezug je Artikel, **fail-closed in der DB** (nicht nur in der App).
- Verschiebung der Duplikat-Regel von „Name + Größe global" auf „Name + Größe **innerhalb eines
  Katalogs**".
- Daten-Migration: Standard-Katalog **„Montagsrunde"** anlegen und **alle** bestehenden Artikel
  ihm zuordnen; idempotent und auch auf leerer DB (frischer Clone / CI) lauffähig.
- Der Katalogname ist **änderbar**, ohne dass die Anwendung bricht: die Auflösung des
  Standard-Katalogs hängt **nicht** am Namen (Nutzer-Entscheidung zu dieser Task).
- Katalog-Bezug in der Data-Layer (`db/catalog.ts`): Artikel werden immer im Kontext eines
  Katalogs gelesen und geschrieben; alle heutigen Aufrufer übergeben den Standard-Katalog.
- Artikel-Abfrage per ID ist **katalog-gebunden** (Parent-Key im `WHERE`, Kern-Kurzregel 2).
- ADR zum Modell (Katalog = Template; `kasse` ist nicht die Preis-Achse) im
  `/architecture`-Schritt dieser Task.
- Fortschreibung der Fachdomäne in `docs/factory/PROJECT-CONTEXT.md` (Begriff „Katalog").

**Nicht inbegriffen:**

- **Keine UI und keine Server Action zum Anlegen, Umbenennen, Sortieren oder Deaktivieren von
  Katalogen** – das ist #345. In dieser Slice entsteht der Katalog ausschließlich durch die
  Migration; ein Umbenennen erfolgt bis #345 direkt in der DB.
- **Keine Wirkung des Aktiv-Kennzeichens am Katalog.** Die Spalte entsteht laut Issue-Vorgabe,
  ihre Semantik („inaktiver Katalog wird nicht mehr als Preisquelle angeboten") gehört zu #345 –
  erst dort existieren mehrere Kataloge und eine Pflege-UI, gegen die sie testbar ist. In dieser
  Slice ist der Standard-Katalog immer aktiv.
- **Keine Katalog-Auswahl je Veranstaltung** und keine Änderung an `veranstaltung` – das ist #346.
- **Kein „Katalog duplizieren"** – #345.
- Kein eigener fachlicher Veranstaltungstyp und keine M:N-Zuordnungstabelle Typ↔Katalog.
- Keine Verwendung von `kasse` als Preis-Achse (Kasse = Geldtopf, Katalog = Preisliste).
- Keine Änderung an Preisen, Artikelnamen, Größen, Kategorien oder Sortierung bestehender Artikel.
- Keine Änderung an Verzehr-Erfassung, Kassieren, Auslagen, Abschluss-Gate, Abschlussbericht oder
  Preis-Freeze.
- Keine neuen Routen und keine Änderung an Pfad oder Zugriff bestehender Routen → `docs/routes.md`
  braucht in diesem Vorgang **keine** Änderung.
- Keine Gruppierungs-Änderung im Abschlussbericht (Artikel-ID vs. Name/Größe) – offen für #346.
- Keine Performance-Anforderung über den Status quo hinaus: die Artikelmenge liegt im
  zweistelligen Bereich, es gibt keine Mengen- oder Latenzvorgabe.

## Akzeptanzkriterien

- [ ] **AK1 – Katalog-Entität existiert:** GIVEN eine migrierte Datenbank
      WHEN die Migrationen dieser Task gelaufen sind
      THEN existiert eine Katalog-Tabelle mit Name, Aktiv-Kennzeichen und Sortierung, und der
      Name ist eindeutig (ein zweiter Katalog mit gleichem Namen wird von der DB abgelehnt).

- [ ] **AK2 – Standard-Katalog „Montagsrunde" mit allen Artikeln:** GIVEN eine Datenbank mit
      bestehenden Artikeln in `catalog_item`
      WHEN die Migration gelaufen ist
      THEN existiert ein aktiver Katalog mit dem Namen „Montagsrunde", und **jeder** bestehende
      Artikel ist genau diesem Katalog zugeordnet – es gibt keinen Artikel ohne Katalogbezug.

- [ ] **AK3 – Katalogbezug ist DB-Pflicht:** GIVEN die migrierte Datenbank
      WHEN versucht wird, einen Artikel ohne Katalogbezug anzulegen
      THEN lehnt die Datenbank das ab (fail-closed, unabhängig vom Aufrufweg), und der Bezug zeigt
      referenziell auf einen existierenden Katalog.

- [ ] **AK4 – Duplikat-Regel gilt je Katalog:** GIVEN ein Katalog K1 enthält den Artikel
      „Bier / 0,5 l"
      WHEN derselbe Name und dieselbe Größe **erneut in K1** angelegt werden
      THEN wird das abgelehnt und dem Verwalter die unveränderte Meldung „Ein Artikel mit dieser
      Bezeichnung und Größe existiert bereits." angezeigt;
      WHEN derselbe Name und dieselbe Größe in einem **anderen** Katalog K2 angelegt werden
      THEN gelingt das.

- [ ] **AK5 – Umbenennen bricht nichts:** GIVEN der Standard-Katalog wird umbenannt (z. B. von
      „Montagsrunde" auf „Montagsrunde 2026")
      WHEN danach die Katalogpflege, die Verzehrerfassung und die Theke aufgerufen werden
      THEN verhalten sich alle drei unverändert und zeigen dieselben Artikel wie vor dem
      Umbenennen – die Auflösung des Standard-Katalogs wertet den Namen nicht aus.

- [ ] **AK6 – Artikel-Abfrage ist katalog-gebunden:** GIVEN Artikel A liegt in Katalog K1
      WHEN ein einzelner Artikel unter Angabe von Katalog **K2** per ID angefragt wird
      THEN gibt es keinen Treffer (der Katalog-Schlüssel ist Teil der Abfragebedingung, nicht nur
      der Primärschlüssel).

- [ ] **AK7 – Verhaltensneutral für den Verwalter:** GIVEN ein angemeldeter `verwalter` auf
      `/verwaltung/katalog`
      WHEN er die Liste öffnet, einen Artikel anlegt, ändert, deaktiviert und reaktiviert
      THEN ist das Verhalten identisch zum Stand vor dieser Task: dieselbe Liste in derselben
      Reihenfolge, dieselben Formularfelder, dieselben Meldungen – **kein** neues Eingabefeld und
      **keine** neue Anzeige zum Katalog.

- [ ] **AK8 – Verhaltensneutral für Veranstalter und Theke:** GIVEN eine offene Veranstaltung und
      eine Theke
      WHEN die Verzehrerfassung (`/veranstaltung/[id]/verzehr`) und die öffentliche Theke
      (`/theke/[token]`) geöffnet werden
      THEN wird dieselbe Menge aktiver Artikel in derselben Reihenfolge zur Auswahl angeboten wie
      vor dieser Task, und eine Erfassung führt zum unveränderten Ergebnis.

- [ ] **AK9 – Migration ist wiederholbar und leer-DB-fest:** GIVEN eine leere, frisch migrierte
      Datenbank (frischer Clone, CI) **oder** eine Datenbank, auf der die Migration bereits lief
      WHEN die Migrationen erneut angewandt werden
      THEN läuft das ohne Fehler durch, und es entsteht **kein** zweiter Standard-Katalog und
      **keine** doppelte Artikel-Zuordnung.

- [ ] **AK10 – Modell dokumentiert:** GIVEN die umgesetzte Änderung
      WHEN der PR geprüft wird
      THEN liegt ein ADR vor, der Katalog-als-Template, die Verwerfung eines eigenen
      Veranstaltungstyps und die Verwerfung von `kasse` als Preis-Achse begründet, und der
      Begriff „Katalog" in `docs/factory/PROJECT-CONTEXT.md` beschreibt den Katalog als eigene
      Entität.

## Fehlerszenarien

- [ ] **FS1 – Artikel ohne Katalog:** Ein Schreibversuch ohne Katalogbezug wird von der DB
      abgelehnt (AK3); die Anwendung schluckt das nicht still.
- [ ] **FS2 – Unbekannter oder fremder Artikel an der Verzehr-Grenze:** Wird ein Artikel per ID
      erfasst, der im angefragten Katalog nicht existiert (oder gar nicht), antwortet die
      Verzehr-Action mit ihrer bestehenden Fehlermeldung für unbekannte Artikel – kein Crash,
      keine Erfassung mit Preis 0.
- [ ] **FS3 – Duplikat innerhalb eines Katalogs:** Die DB-Unique-Verletzung (SQLSTATE 23505) wird
      weiterhin in die Nutzermeldung aus AK4 übersetzt und nicht als technischer Fehler geworfen.
- [ ] **FS4 – Soft-Delete unverändert:** Ein deaktivierter Artikel bleibt dem Katalog zugeordnet,
      erscheint weiter in der Verwalter-Liste, nicht in der Auswahl – und historische
      Verzehr-Positionen bleiben über den Join auflösbar.
- [ ] **FS5 – Referenz-Schutz:** Ein Katalog, dem Artikel zugeordnet sind, kann nicht so entfernt
      werden, dass Artikel ohne Katalog zurückbleiben (in dieser Slice existiert ohnehin kein
      Lösch-Weg – die DB-Referenz ist der Guard).

## Offene Fragen

> Die ersten beiden Fragen sind im `/architecture`-Schritt entschieden
> ([ADR-050](../adr/050-katalog-als-template-entitaet.md)); die Begründung steht dort.

- [x] ~~Wie wird der Standard-Katalog stabil aufgelöst?~~ → **ADR-050 D3**: stabiler Text-Key
      `'standard'`, im Code als Konstante `STANDARD_CATALOG_ID`, von der Migration geseedet.
      Rename-sicher (AK5), ohne zusätzliche Spalte und ohne Lookup – und restlos entfernbar,
      wenn #346 den Katalog aus der Veranstaltung nimmt.
- [x] ~~Welche Data-Layer-Funktionen nehmen den Katalogbezug in die Signatur?~~ → **ADR-050 D4**:
      alle sechs (`listCatalog`, `listActiveCatalog`, `getCatalogItem`, `createItem`,
      `updateItem`, `setItemActive`), als **Pflichtparameter ohne Default** – damit der Compiler
      in #346 jede umzustellende Aufrufstelle findet. `catalogId` wird serverseitig gesetzt und
      nie aus `FormData` geparst; das Zod-Schema bleibt unverändert (stützt AK7).
- [ ] **Wie erreicht der `verwalter` das Umbenennen bis #345?** In dieser Slice nur direkt in der
      DB. Falls das zu unbequem ist, wäre ein minimaler Pflege-Weg vorzuziehen – das würde aber
      den Schnitt „verhaltensneutral" verlassen und gehört dann in #345.

## ADR

**Erledigt:** [ADR-050 – Katalog als Template-Entität](../adr/050-katalog-als-template-entitaet.md)
(Accepted, 2026-09-17). Entschieden sind dort: das Modell (Katalog = Template, kein
Veranstaltungstyp, `kasse` nicht die Preis-Achse), der Schema-Schnitt, die
Standard-Katalog-Auflösung, die Aufrufform der Data-Layer, die katalog-freien Lese-/Freeze-Pfade
und die Expand-Migration. Nächster Schritt: `/implement 59`.
