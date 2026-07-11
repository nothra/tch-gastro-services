# Spec: Auslagenerstattung (eigener Vorgang)

> Feature F6 · Issue #53 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Teilnehmer haben manchmal **Auslagen** (z. B. für Essenszutaten, Getränke-Einkauf), die
sie vorstrecken. Diese werden ihnen aus der **dem Abend zugeordneten Kasse** erstattet
(F4: Montagsrunde-Kasse oder Vereinskasse).

**Entscheidung 2026-07-11 (Abweichung vom Excel-Template):** Die Auslagenerstattung ist
ein **eigener Vorgang** und wird **vom individuellen Kassieren getrennt**. Auslagen
mindern **nicht** den Verzehr-Gesamtbetrag des Teilnehmers – er zahlt seinen Verzehr voll
(F8). Die Erstattung ist eine **separate Barauszahlung** an ihn.

**Berücksichtigung in der Gesamtabrechnung (Entscheidung 2026-07-11):** Die Erstattungen
fließen **auf Abend-Ebene** in die Gesamt-/Kassenabrechnung ein – als **Ausgaben**, den
Einnahmen (Summe Erhalten) gegenübergestellt. Es gibt **keine** Netto-Verrechnung je
Teilnehmer beim Kassieren. Die Kassenwirkung des Abends steht in F8.

## Scope

**Inbegriffen:**
- Je Abend beliebig viele **Auslagen-Einträge** erfassen, jeder mit:
  - **Teilnehmer** (aus dem Abend) – die Auslage ist genau **einem** Teilnehmer zugeordnet,
  - **Kategorie** ∈ { `getraenke`, `essen`, `sonstiges` },
  - **Betrag** in EUR (> 0),
  - optionale Zweck-Notiz (z. B. „Grillfleisch"),
  - **Status** `offen` → `erstattet` (Barauszahlung erfolgt), unabhängig vom Kassieren.
- Übersicht der Auslagen eines Abends mit Summen **je Kategorie** und gesamt, getrennt
  nach „offen zu erstatten" und „erstattet".
- Erfassen/Erstatten durch den Abrechner.

**Nicht inbegriffen:**
- Netto-Verrechnung mit dem Verzehr des Teilnehmers beim Kassieren (bewusst getrennt).
- Kassenbuch / laufender Kassen-Saldo über mehrere Abende (Backlog #57).
- Belegverwaltung / Foto-Upload von Quittungen.
- Übertrag einer nicht erfolgten Erstattung auf den nächsten Abend (analog Backlog #56).

## Akzeptanzkriterien

- [ ] GIVEN ein offener Abend WHEN der Abrechner für einen Teilnehmer eine Auslage mit
      Kategorie, Betrag > 0 und optionaler Notiz erfasst THEN entsteht ein Auslagen-
      Eintrag im Status `offen`, **einem Teilnehmer und einer Kategorie zugeordnet**, und
      **ohne** den Verzehr-Gesamtbetrag dieses Teilnehmers zu verändern.
- [ ] GIVEN ein Auslagen-Eintrag im Status `offen` WHEN der Abrechner die Barauszahlung
      bestätigt THEN wechselt der Eintrag auf `erstattet`.
- [ ] GIVEN Auslagen eines Abends in verschiedenen Kategorien WHEN die Auslagen-Übersicht
      angezeigt wird THEN werden Summen **je Kategorie** (Getränke/Essen/Sonstiges) und
      gesamt korrekt ausgewiesen, getrennt nach „offen" und „erstattet".
- [ ] GIVEN ein Teilnehmer mit Auslagen UND Verzehr WHEN sein Verzehr kassiert wird (F8)
      THEN ist der zu zahlende Verzehr-Gesamt **unabhängig** von seinen Auslagen (keine
      Netto-Verrechnung).
- [ ] GIVEN die Auslagen eines Abends WHEN die Abend-Gesamtabrechnung gebildet wird (F8)
      THEN gehen die Erstattungen als **Ausgaben je Kategorie** in die Kassenabrechnung
      des Abends **für die zugeordnete Kasse** ein.
- [ ] GIVEN ein Auslagen-Betrag WHEN er kein gültiger EUR-Betrag > 0 mit ≤ 2
      Nachkommastellen ist THEN wird er serverseitig (Zod) abgelehnt.
- [ ] GIVEN eine Auslage ohne gewählte Kategorie oder ohne Teilnehmer WHEN gespeichert
      wird THEN wird sie serverseitig abgelehnt (Kategorie und Teilnehmer sind Pflicht).
- [ ] GIVEN ein `abgeschlossener` Abend WHEN Auslagen erfasst/geändert werden sollen THEN
      ist das gesperrt, solange der Abend nicht wieder geöffnet wird (F8).

## Fehlerszenarien

- [ ] Betrag ≤ 0, nicht-numerisch, fehlende Kategorie oder fehlender Teilnehmer →
      serverseitige Ablehnung.
- [ ] Erstattung bestätigt, obwohl kein Bargeld vorhanden → Eintrag bleibt `offen`; der
      Abrechner erstattet später (kein Zwang, sofort auf `erstattet` zu setzen).
- [ ] Auslage für einen Teilnehmer, der (noch) nicht im Abend geführt wird → Teilnehmer
      muss zuvor dem Abend hinzugefügt sein (F4/Walk-in via Abrechner).

## Offene Fragen (für /architecture)

- [ ] Datenmodell: Auslage als eigene Entität je Abend (n Einträge je Teilnehmer/Kategorie
      möglich) – bestätigen im Datenmodell.
- [ ] Anbindung an ein späteres Kassenbuch (#57): Auslagenerstattung als kategorisierter
      Kassen-Ausgang vormerken? Im MVP nur je Abend, ohne laufenden Saldo.
