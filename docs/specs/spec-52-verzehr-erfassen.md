# Spec: Verzehr erfassen – Getränke-Strichliste, Essen, Kaffee

> Feature F5 · Issue #52 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Das Herzstück: Über den Abend hinweg werden je Teilnehmer-Zeile die entnommenen
Getränke als **Strichliste** erfasst, dazu Essen und Kaffee. Es ersetzt die Striche in
der Excel-Tabelle. Erfassen dürfen der Abrechner **und** die Teilnehmer selbst
(Selbstbedienung, Zugang siehe F7). Alle sehen und bearbeiten die ganze Liste –
volle Transparenz wie beim gemeinsamen Zettel heute.

## Scope

**Inbegriffen:**
- Je Zeile pro Getränke-Artikel eine Menge hoch-/runterzählen (Strichliste, +/−).
- Essen: Anzahl Portionen (× Essenpreis des Abends, F4).
- Kaffee: Anzahl (× fester Kaffeepreis aus dem Katalog, F2).
- **Live-Berechnung** je Zeile:
  - `Summe Getränke (Theke)` = Σ Menge × Getränkepreis
  - `Summe Sonstige` = Essen-Anzahl × Essenpreis + Kaffee-Anzahl × Kaffeepreis
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
- [ ] GIVEN ein Abend mit Essenpreis X WHEN bei einer Zeile n Essen erfasst werden THEN
      beträgt der Essenanteil n × X.
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

## Offene Fragen

- [ ] Gibt es beim gemeinsamen Zählen ein Bedürfnis nach „wer hat's eingetragen"
      (Nachvollziehbarkeit) oder bewusst anonym wie heute? (Annahme: anonym.) → bestätigen.
- [ ] Sollen Änderungen live bei anderen Geräten erscheinen (Echtzeit) oder reicht ein
      Neuladen? → /architecture (Aufwand vs. Nutzen).
- [ ] Walk-in ohne Stammdaten-Eintrag: spontanes Anlegen einer Zeile? → hängt an F3/F4.
