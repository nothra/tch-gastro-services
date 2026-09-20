# Spec: Mehrere Kataloge verwalten (Preislisten-Vorlagen)

> Issue: [#345](https://github.com/nothra/tch-gastro-services/issues/345) · Setzt
> [#59](https://github.com/nothra/tch-gastro-services/issues/59) voraus (Katalog als Entität +
> Migration, [ADR-050](../adr/050-katalog-als-template-entitaet.md)).
> Story-Schnitt: #59 (Container) → **#345 (hier)** mehrere Kataloge pflegen → #346 Katalog je
> Veranstaltung auswählen (dort landet der fachliche Nutzen für den Veranstalter).
> Betroffener Weg: F2 (`/verwaltung/katalog`) – Rolle `verwalter`.

## Kontext

#59 hat den Container geschaffen: es existiert genau ein, fest über die Konstante
`STANDARD_CATALOG_ID` verdrahteter Katalog „Montagsrunde". Diese Slice macht ihn **pflegbar**:
der Verwalter kann weitere Preislisten anlegen, umbenennen, deaktivieren und – als eigentliche
Template-Mechanik – einen bestehenden Katalog samt Artikeln und Preisen als Vorlage duplizieren,
statt eine abweichende Preisliste von Hand neu zu erfassen.

**Noch ohne fachlichen Nutzen für den laufenden Betrieb.** Jede Veranstaltung nutzt weiterhin
ausschließlich den Standard-Katalog (`STANDARD_CATALOG_ID`), unabhängig davon, wie viele Kataloge
jetzt existieren. Die Zuordnung eines Katalogs zu einer Veranstaltung folgt erst in #346. Theke
und Verzehrerfassung ändern ihr Verhalten in dieser Slice nicht.

## Scope

**Inbegriffen:**

- **Katalog anlegen** (leer, ohne Artikel) mit Pflichtfeld Name.
- **Katalog umbenennen.**
- **Katalog deaktivieren / reaktivieren** (Soft-Delete analog `catalog_item.active`).
- **Katalog duplizieren**: bestehenden Katalog als Vorlage kopieren – neuer Katalog mit neuem
  Namen, alle **aktiven** Artikel des Quell-Katalogs mit identischen Preisen, Größen und
  Kategorien; Kopie und Original sind danach unabhängig voneinander editierbar.
- **Katalog-Umschalter** in `app/verwaltung/katalog/`: der Verwalter wählt einen Katalog aus, um
  dessen Artikel zu sehen und zu pflegen (Artikel-CRUD bleibt unverändert, wirkt jetzt aber auf
  den gewählten statt immer den Standard-Katalog).
- Serverseitiges Rollen-Gate (`requireRole("verwalter")`) für alle neuen Schreib-Actions, analog
  zu den bestehenden Artikel-Actions.
- Freundliche Fehlermeldungen bei Namenskonflikten (Katalogname ist laut ADR-050 D2 global
  unique).

**Nicht inbegriffen:**

- **Zuordnung eines Katalogs zu einer Veranstaltung** und jede Änderung an `veranstaltung` – #346.
  Theke (`/theke/[token]`) und Verzehrerfassung (`/veranstaltung/[id]/verzehr`) bleiben unverändert
  und lesen weiterhin ausschließlich über `STANDARD_CATALOG_ID`.
- **`catalog.active` gate't nicht die Artikel-Auswahl.** Ein deaktivierter Katalog bleibt für
  `listActiveCatalog`/Theke/Verzehr technisch unverändert erreichbar – das gilt aber ohnehin nur
  für den Standard-Katalog, solange #346 nicht existiert. Deaktivierung wirkt ausschließlich in
  der Verwaltungsoberfläche (Details: AK5).
- **Hartes Löschen eines Katalogs.** Es gibt weiterhin keinen Lösch-Weg (spec-59 FS5) – nur
  Deaktivieren/Reaktivieren.
- **Sortierung/Reihenfolge der Kataloge selbst pflegen.** Die Spalte `catalog.sortOrder` existiert
  bereits (ADR-050 D2), bekommt in dieser Slice aber keine Bedienoberfläche; die Katalogliste wird
  nach `sortOrder, name` sortiert angezeigt (Default `sortOrder = 0` für alle neuen Kataloge –
  faktisch alphabetisch nach Name, bis eine Pflege-UI gebraucht wird). Kein Gold-Plating für eine
  Anforderung, die das Issue nicht stellt.
- **Duplizieren kopiert keine deaktivierten Artikel** des Quell-Katalogs (nur aktive, siehe AK2).
- Keine Änderung an `docs/routes.md` – dieselbe Route, derselbe Zugriff, nur erweiterte
  Bedienelemente auf der Seite.
- Keine Änderung an Preis-Freeze, Abschlussbericht oder Kassieren.

## Akzeptanzkriterien

- [ ] **AK1 – Katalog anlegen:** GIVEN Rolle `verwalter` auf `/verwaltung/katalog`
      WHEN ein neuer, leerer Katalog mit einem noch nicht vergebenen Namen angelegt wird
      THEN erscheint er im Katalog-Umschalter, enthält keine Artikel und ist aktiv;
      WHEN der eingegebene Name bereits von einem anderen Katalog verwendet wird
      THEN wird das abgelehnt mit einer Meldung, dass der Name bereits vergeben ist – kein
      technischer Fehler.

- [ ] **AK2 – Katalog duplizieren:** GIVEN ein Katalog mit mindestens einem aktiven und
      mindestens einem deaktivierten Artikel
      WHEN er unter einem neuen Namen dupliziert wird
      THEN entsteht ein neuer, aktiver Katalog, der **nur** die aktiven Artikel des
      Quell-Katalogs enthält – mit identischem Namen, Größe, Preis, Kategorie und Sortierung je
      Artikel, aber jeweils als neue, eigenständige Zeile;
      WHEN danach ein Artikel in der Kopie geändert wird
      THEN bleibt der entsprechende Artikel im Original unverändert (kein geteilter Zustand).

- [ ] **AK3 – Katalog umbenennen:** GIVEN ein bestehender Katalog (auch der Standard-Katalog)
      WHEN er auf einen noch nicht vergebenen Namen umbenannt wird
      THEN führen Katalogpflege, Verzehrerfassung und Theke ihr Verhalten unverändert fort
      (Rename-Sicherheit aus spec-59 AK5 gilt weiter, da die Auflösung über die ID läuft);
      WHEN auf einen bereits vergebenen Namen umbenannt wird
      THEN wird das abgelehnt mit derselben Namenskonflikt-Meldung wie in AK1.

- [ ] **AK4 – Katalog deaktivieren/reaktivieren:** GIVEN ein aktiver Katalog
      WHEN er deaktiviert wird
      THEN bleibt er im Katalog-Umschalter sichtbar (als „deaktiviert" markiert), seine Artikel
      bleiben einsehbar und weiterhin normal bearbeitbar (anlegen/ändern/deaktivieren einzelner
      Artikel funktioniert unverändert);
      WHEN er reaktiviert wird
      THEN verschwindet die Markierung wieder.

- [ ] **AK5 – Deaktivierter Katalog ist keine Duplizier-Quelle mehr:** GIVEN ein deaktivierter
      Katalog
      WHEN die Katalogliste zum Duplizieren (Quell-Katalog wählen) angezeigt wird
      THEN erscheint er dort nicht mehr zur Auswahl;
      WHEN dennoch versucht wird, ihn (z. B. per direktem Request) als Duplizier-Quelle zu
      verwenden
      THEN lehnt die Server Action das serverseitig ab – die UI-Ausblendung ist nicht die einzige
      Durchsetzung (Defense in Depth, PROJECT-CONTEXT).
      **Ausdrücklich unverändert:** `listActiveCatalog`, Theke und Verzehrerfassung prüfen
      `catalog.active` **nicht** – ein deaktivierter Katalog bleibt dort erreichbar, genau wie vor
      dieser Slice (siehe Scope „Nicht inbegriffen").

- [ ] **AK6 – Katalog-Umschalter steuert die Artikel-Pflege:** GIVEN mindestens zwei Kataloge
      existieren
      WHEN der Verwalter im Umschalter von Katalog A zu Katalog B wechselt
      THEN zeigt die Artikel-Liste und das Anlege-Formular ab sofort Katalog B, und ein dort neu
      angelegter oder geänderter Artikel landet in Katalog B, nicht in A (Parent-Key-Bindung wie
      in der bestehenden Data-Layer, ADR-050 D4).

- [ ] **AK7 – Rollen-Gate greift serverseitig:** GIVEN Rolle `veranstalter` (kein `verwalter`)
      WHEN irgendeine der neuen Katalog-Actions (anlegen, umbenennen, deaktivieren, reaktivieren,
      duplizieren) direkt aufgerufen wird
      THEN lehnt `requireRole("verwalter")` das ab – unabhängig davon, ob die UI den Button
      überhaupt anzeigt.

- [ ] **AK8 – Duplikat-Regel je Katalog bleibt unangetastet:** GIVEN zwei Kataloge
      WHEN in beiden derselbe Artikelname mit derselben Größe angelegt wird
      THEN gelingt das in beiden unabhängig voneinander (ADR-050 D2, unverändert seit #59).

## Fehlerszenarien

- [ ] **FS1 – Namenskonflikt beim Anlegen/Umbenennen/Duplizieren:** Die DB-Unique-Verletzung auf
      `catalog.name` (SQLSTATE 23505) wird in eine Nutzermeldung übersetzt, nicht als technischer
      Fehler geworfen (analog zur bestehenden `runWithUniqueCheck`-Übersetzung für Artikel).
- [ ] **FS2 – Unbekannter Katalog:** Eine Action, die eine Katalog-ID referenziert, die nicht (mehr)
      existiert (z. B. Race zwischen zwei Verwaltern), meldet einen Fehler statt stillem Erfolg
      oder Crash – Guarded-UPDATE-Rückgabewert auswerten (Kern-Kurzregel „guarded UPDATE").
- [ ] **FS3 – Leerer Quell-Katalog duplizieren:** Ein Katalog ohne aktive Artikel lässt sich
      dennoch duplizieren – die Kopie entsteht leer, das ist kein Fehlerfall.
- [ ] **FS4 – Fehlender Name:** Ein leerer oder nur aus Leerzeichen bestehender Name wird beim
      Anlegen/Umbenennen/Duplizieren von der Zod-Validierung abgelehnt, bevor die DB erreicht
      wird.

## Offene Fragen

- [x] ~~Was bedeutet „deaktiviert" konkret, solange #346 nicht existiert?~~ → Geklärt: wirkt nur
      auf die Duplizier-Quellenauswahl in der Verwaltung (AK5); Theke/Verzehr/`listActiveCatalog`
      bleiben unverändert.
- [ ] **ADR-Bedarf für `/architecture`:** ADR-050 D7 hatte #345 verpflichtet, `catalog.active` zu
      „verdrahten und testen (deaktivierter Katalog wird nicht mehr als Preisquelle angeboten)".
      Diese Spec löst das enger auf (nur Duplizier-Quelle, nicht Theke/Verzehr) als D7 wörtlich
      nahelegt. `/architecture` sollte prüfen, ob das eine kurze Ergänzung zu ADR-050 verdient
      (Begründung: kein Veranstaltungs-Katalog-Bezug existiert vor #346, ein weitergehendes Gate
      wäre unbelegbares Verhalten ohne Bedienweg) oder ob ein neuer ADR-Trigger vorliegt.
