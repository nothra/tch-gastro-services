# Spec: Auslagenerstattung (eigener Vorgang)

> Feature F6 · Issue #53 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Teilnehmer haben manchmal **Auslagen** (z. B. für Essenszutaten), die sie vorstrecken.
Diese werden ihnen aus der **Kasse der Montagsrunde** erstattet.

**Entscheidung 2026-07-11 (Abweichung vom Excel-Template):** Die Auslagenerstattung ist
ein **eigener Vorgang** und wird **vom Kassieren getrennt**. Auslagen mindern **nicht**
den Verzehr-Gesamtbetrag des Teilnehmers (anders als Spalte U/V im Excel). Der Teilnehmer
zahlt seinen Verzehr voll; die Erstattung ist eine **separate Barauszahlung** an ihn.
Dadurch entsteht kein negativer Gesamtbetrag.

## Scope

**Inbegriffen:**
- Je Abend beliebig viele **Auslagen-Einträge** erfassen: Teilnehmer (aus dem Abend),
  Betrag in EUR, kurze Zweck-Notiz (z. B. „Grillfleisch").
- Jeder Auslagen-Eintrag hat einen Status **`offen`** → **`erstattet`** (Barauszahlung
  erfolgt), analog zum Kassieren, aber unabhängig davon.
- Übersicht der Auslagen eines Abends inkl. Summe „zu erstatten" / „erstattet".
- Erfassen/Erstatten durch den Abrechner.

**Nicht inbegriffen:**
- Verrechnung mit dem Verzehr des Teilnehmers (bewusst getrennt, siehe Kontext).
- Kassenbuch / laufender Kassen-Saldo über mehrere Abende (Backlog #57).
- Belegverwaltung / Foto-Upload von Quittungen.
- Übertrag einer nicht erfolgten Erstattung auf den nächsten Abend (analog Backlog #56).

## Akzeptanzkriterien

- [ ] GIVEN ein offener Abend WHEN der Abrechner für einen Teilnehmer eine Auslage mit
      Betrag > 0 und Zweck erfasst THEN entsteht ein Auslagen-Eintrag im Status `offen`,
      **ohne** den Verzehr-Gesamtbetrag dieses Teilnehmers zu verändern.
- [ ] GIVEN ein Auslagen-Eintrag im Status `offen` WHEN der Abrechner die Barauszahlung
      bestätigt THEN wechselt der Eintrag auf `erstattet`.
- [ ] GIVEN mehrere Auslagen eines Abends WHEN die Auslagen-Übersicht angezeigt wird THEN
      werden Summe „offen zu erstatten" und Summe „erstattet" korrekt ausgewiesen.
- [ ] GIVEN ein Teilnehmer mit Auslagen UND Verzehr WHEN sein Verzehr kassiert wird (F8)
      THEN ist der zu zahlende Verzehr-Gesamt **unabhängig** von seinen Auslagen.
- [ ] GIVEN ein Auslagen-Betrag WHEN er kein gültiger EUR-Betrag > 0 mit ≤ 2
      Nachkommastellen ist THEN wird er serverseitig (Zod) abgelehnt.
- [ ] GIVEN ein `abgeschlossener` Abend WHEN Auslagen erfasst/geändert werden sollen THEN
      ist das gesperrt, solange der Abend nicht wieder geöffnet wird (F8).

## Fehlerszenarien

- [ ] Betrag ≤ 0 oder nicht-numerisch → serverseitige Ablehnung.
- [ ] Erstattung bestätigt, obwohl kein Bargeld vorhanden → Eintrag bleibt `offen`; der
      Abrechner erstattet später (kein Zwang, sofort auf `erstattet` zu setzen).
- [ ] Auslage für einen Teilnehmer, der (noch) nicht im Abend geführt wird → Teilnehmer
      muss zuvor dem Abend hinzugefügt sein (F4/Walk-in via Abrechner).

## Offene Fragen (für /architecture)

- [ ] Datenmodell: Auslage als eigene Entität je Abend (n Einträge je Teilnehmer möglich)
      – bestätigen im Datenmodell.
- [ ] Anbindung an ein späteres Kassenbuch (#57): Auslagenerstattung als Kassen-Ausgang
      vormerken? Im MVP nur je Abend, ohne laufenden Saldo.
