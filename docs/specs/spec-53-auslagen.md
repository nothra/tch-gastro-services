# Spec: Auslagen erfassen (mindern Gesamtbetrag)

> Feature F6 · Issue #53 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Teilnehmer haben manchmal **Auslagen** (z. B. für Essenszutaten). Diese werden ihnen aus
der Kasse der Montagsrunde erstattet, indem sie im Excel vom Gesamtbetrag **abgezogen**
werden (`Gesamt = Getränke + Sonstige − Auslagen`). Erfasst wird die Auslage durch den
Abrechner.

## Scope

**Inbegriffen:**
- Je Zeile einen Auslagen-Betrag in EUR erfassen/ändern (Standard 0).
- Auslagen mindern den Zeilen-Gesamtbetrag (Verrechnung, keine separate Auszahlung).
- Optional: kurze Notiz/Zweck zur Auslage (z. B. „Grillfleisch").

**Nicht inbegriffen:**
- Kassenbuch / laufender Kassen-Saldo (Backlog #57).
- Belegverwaltung / Foto-Upload von Quittungen.
- Auszahlung getrennt vom Verzehr (im MVP wird verrechnet).

## Akzeptanzkriterien

- [ ] GIVEN eine Teilnehmer-Zeile WHEN der Abrechner einen Auslagen-Betrag > 0 erfasst
      THEN wird dieser Betrag vom Zeilen-Gesamt abgezogen
      (`Gesamt = Getränke + Sonstige − Auslagen`).
- [ ] GIVEN Auslagen, die den Verzehr übersteigen WHEN der Gesamtbetrag berechnet wird
      THEN darf der Gesamtbetrag **negativ** sein (dem Teilnehmer wird ausgezahlt) und
      wird als solcher klar angezeigt.
- [ ] GIVEN ein erfasster Auslagen-Betrag WHEN er kein gültiger EUR-Betrag ≥ 0 mit ≤ 2
      Nachkommastellen ist THEN wird er serverseitig abgelehnt.
- [ ] GIVEN eine erfasste Auslage WHEN der Abrechner sie auf 0 zurücksetzt THEN entfällt
      der Abzug wieder.
- [ ] GIVEN ein `abgeschlossener` Abend WHEN Auslagen geändert werden sollen THEN ist das
      gesperrt (siehe F8).

## Fehlerszenarien

- [ ] Negativer Auslagen-Betrag als Eingabe → abgelehnt (Auslage ist ≥ 0; ein negatives
      *Gesamt* entsteht rechnerisch, nicht durch negative Eingabe).
- [ ] Nicht-numerische Eingabe → Validierungsfehler an der Server-Grenze.

## Offene Fragen

- [ ] Soll ein negativer Gesamtbetrag beim Kassieren (F8) als **Auszahlung an den
      Teilnehmer** behandelt werden (Erhalten negativ) oder separat? → mit F8 klären.
- [ ] Braucht die Auslage einen Bezug zur Kasse (für spätere Kassenbuch-Integration
      #57)? Im MVP nur Verrechnung, kein Saldo.
