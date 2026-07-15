# Spec: Verzehr erfassen – Getränke-Strichliste, Essen, Kaffee

> Feature F5 · Issue #52 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> Hängt ab von F4 (#51) und – seit dem Essen-Modellwechsel 2026-07-15 – zusätzlich von der
> **F2-Erweiterung „Katalog-Kategorie `essen`"** (#116). „Abend" ist hier synonym zu
> „Veranstaltung" (spec-51).

## Kontext

Das Herzstück: Über den Abend hinweg werden je Teilnehmer-Zeile die entnommenen
Getränke als **Strichliste** erfasst, dazu Essen und Kaffee. Es ersetzt die Striche in
der Excel-Tabelle. Erfassen dürfen der Abrechner **und** die Teilnehmer selbst
(Selbstbedienung, Zugang siehe F7). Alle sehen und bearbeiten die ganze Liste –
volle Transparenz wie beim gemeinsamen Zettel heute.

## Scope

**Inbegriffen:**
- Je Zeile pro Getränke-Artikel eine Menge hoch-/runterzählen (Strichliste, +/−).
- Essen: **Auswahl eines Essen-Katalogartikels** (Kategorie `essen`, F2) und Anzahl Portionen
  (× fester Katalogpreis des gewählten Artikels). **Kein** Essenpreis je Abend, keine spontane
  Preiseingabe (Änderung 2026-07-15). An der stehenden Theke wird Essen nicht angeboten.
- Kaffee: Anzahl (× fester Kaffeepreis aus dem Katalog, F2).
- **Live-Berechnung** je Zeile:
  - `Summe Getränke (Theke)` = Σ Menge × Getränkepreis
  - `Summe Sonstige` = Σ (Essen-Anzahl × Essen-Katalogpreis) + Kaffee-Anzahl × Kaffeepreis
- Anzeige der ganzen Teilnehmerliste des Abends mit den laufenden Summen.
- Korrektur: Mengen jederzeit (solange Abend `offen`) nach oben/unten anpassbar.

**Nicht inbegriffen:**
- Auslagen (F6) und Kassieren/Erhalten/Spende (F8) – dort spezifiziert.
- Zugang/Identifikation der Selbstbedienung (F7).
- Bearbeitung nach Abschluss des Abends (F8).

## Akzeptanzkriterien

- [ ] GIVEN ein offener Abend mit Teilnehmerzeilen WHEN ein Nutzer bei einem Getränk „+1"
      wählt THEN erhöht sich die Menge um 1 und die Zeilensumme „Getränke" aktualisiert
      sich sofort (Menge × aktueller Katalogpreis).
- [ ] GIVEN eine erfasste Menge > 0 WHEN „−1" gewählt wird THEN sinkt die Menge um 1,
      minimal auf 0 (keine negativen Mengen).
- [ ] GIVEN ein Essen-Katalogartikel mit Preis X WHEN bei einer Zeile n Portionen dieses
      Artikels erfasst werden THEN beträgt der Essenanteil n × X (Preis aus dem Katalog, nicht
      vom Abend).
- [ ] GIVEN ein Katalog-Kaffeepreis Y WHEN bei einer Zeile m Kaffee erfasst werden THEN
      beträgt der Kaffeeanteil m × Y.
- [ ] GIVEN mehrere Personen erfassen gleichzeitig (eigenes Handy + Theken-Gerät) WHEN
      zwei Änderungen an **verschiedenen** Zeilen erfolgen THEN gehen beide verlustfrei
      ein.
- [ ] GIVEN zwei gleichzeitige Änderungen an **derselben** Zeile/Menge WHEN sie
      eintreffen THEN bleibt das Ergebnis nachvollziehbar korrekt (keine „lost update";
      Umgang mit Nebenläufigkeit → /architecture).
- [ ] GIVEN alle Preise in EUR WHEN Summen gebildet werden THEN wird auf 2
      Nachkommastellen kaufmännisch gerundet und im deutschen Format (Komma) angezeigt.

## Fehlerszenarien

- [ ] Menge unter 0 → nicht möglich (Minimum 0).
- [ ] Abend bereits `abgeschlossen` → Erfassung wird abgelehnt.
- [ ] Verbindungsabbruch während einer Änderung → Nutzer erkennt, ob seine Änderung
      angekommen ist (kein stiller Verlust); WLAN ist stabil, aber der Fall wird
      sauber behandelt.

## Gesetzte Entscheidungen (2026-07-11)

- **Erfassung ist anonym** – es wird **nicht** protokolliert, wer eine Menge eingetragen
  hat (wie beim gemeinsamen Zettel heute).
- **Walk-in:** Nur der **Abrechner** legt einen neuen Teilnehmer spontan an (F3/F4);
  Selbstbedienungs-Nutzer wählen ausschließlich aus der bestehenden Liste.

## Offene Fragen (für /architecture)

- [ ] Sollen Änderungen live bei anderen Geräten erscheinen (Echtzeit) oder reicht ein
      Neuladen? → /architecture (Aufwand vs. Nutzen).
- [ ] Umgang mit Nebenläufigkeit an derselben Zeile (kein „lost update") → /architecture.
