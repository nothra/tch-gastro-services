# Spec: Auslagenerstattung (eigener Vorgang)

> Feature F6 · Issue #53 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> **Zielbild (ADR-024, #120):** F6 wird die authentifizierte Unterroute
> `app/veranstaltung/[id]/auslagen` (Bereich `app/abrechnung/veranstaltung` → **`app/veranstaltung`**
> umbenannt). Die Owner-Rolle `abrechner` → **`veranstalter`**; „Abrechner" in diesem Dokument
> meint diese Rolle. Siehe [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).

## Kontext

Teilnehmer haben manchmal **Auslagen** (z. B. für Essenszutaten, Getränke-Einkauf), die
sie vorstrecken. Diese werden ihnen aus der **der Veranstaltung zugeordneten Kasse** erstattet
(F4: Montagsrunde-Kasse oder Vereinskasse).

**Entscheidung 2026-07-11 (Abweichung vom Excel-Template):** Die Auslagenerstattung ist
ein **eigener Vorgang** und wird **vom individuellen Kassieren getrennt**. Auslagen
mindern **nicht** den Verzehr-Gesamtbetrag des Teilnehmers – er zahlt seinen Verzehr voll
(F8). Die Erstattung ist eine **separate Barauszahlung** an ihn.

**Berücksichtigung in der Gesamtabrechnung (Entscheidung 2026-07-11):** Die Erstattungen
fließen **auf Veranstaltungs-Ebene** in die Gesamt-/Kassenabrechnung ein – als **Ausgaben**, den
Einnahmen (Summe Erhalten) gegenübergestellt. Es gibt **keine** Netto-Verrechnung je
Teilnehmer beim Kassieren. Die Kassenwirkung der Veranstaltung steht in F8.

## Scope

**Inbegriffen:**
- Je Veranstaltung beliebig viele **Auslagen-Einträge** erfassen, jeder mit:
  - **Teilnehmer** (aus der Veranstaltung) – die Auslage ist genau **einem** Teilnehmer zugeordnet,
  - **Kategorie** ∈ { `getraenke`, `essen`, `sonstiges` },
  - **Betrag** in EUR (> 0),
  - optionale Zweck-Notiz (z. B. „Grillfleisch"),
  - **Status** `offen` → `erstattet` (Barauszahlung erfolgt), unabhängig vom Kassieren.
- **Korrigieren** eines Eintrags (Teilnehmer, Kategorie, Betrag, Notiz ändern) sowie
  **Löschen** eines Eintrags – solange die Veranstaltung `offen` ist (Fehleingaben korrigierbar,
  analog #135).
- **Rücknahme** einer Erstattung: `erstattet` → `offen` zurücksetzbar (Undo einer
  versehentlich bestätigten Barauszahlung), solange die Veranstaltung `offen` ist.
- Übersicht der Auslagen einer Veranstaltung mit Summen **je Kategorie** und gesamt, getrennt
  nach „offen zu erstatten" und „erstattet".
- Erfassen/Korrigieren/Löschen/Erstatten durch den Abrechner.

**Nicht inbegriffen:**
- Netto-Verrechnung mit dem Verzehr des Teilnehmers beim Kassieren (bewusst getrennt).
- Kassenbuch / laufender Kassen-Saldo über mehrere Veranstaltungen (Backlog #57).
- Belegverwaltung / Foto-Upload von Quittungen.
- Übertrag einer nicht erfolgten Erstattung auf die nächste Veranstaltung (analog Backlog #56).

## Akzeptanzkriterien

- [ ] GIVEN eine offene Veranstaltung WHEN der Abrechner für einen Teilnehmer eine Auslage mit
      Kategorie, Betrag > 0 und optionaler Notiz erfasst THEN entsteht ein Auslagen-
      Eintrag im Status `offen`, **einem Teilnehmer und einer Kategorie zugeordnet**, und
      **ohne** den Verzehr-Gesamtbetrag dieses Teilnehmers zu verändern.
- [ ] GIVEN ein Auslagen-Eintrag im Status `offen` WHEN der Abrechner die Barauszahlung
      bestätigt THEN wechselt der Eintrag auf `erstattet`.
- [ ] GIVEN ein Auslagen-Eintrag im Status `erstattet` UND die Veranstaltung ist `offen` WHEN der
      Abrechner die Erstattung zurücknimmt THEN wechselt der Eintrag zurück auf `offen` und
      wird wieder als „offen zu erstatten" geführt.
- [ ] GIVEN ein Auslagen-Eintrag UND die Veranstaltung ist `offen` WHEN der Abrechner Teilnehmer,
      Kategorie, Betrag oder Notiz ändert THEN wird der Eintrag mit den (serverseitig
      validierten) neuen Werten gespeichert, **ohne** den Verzehr-Gesamtbetrag des
      Teilnehmers zu verändern.
- [ ] GIVEN ein Auslagen-Eintrag UND die Veranstaltung ist `offen` WHEN der Abrechner ihn löscht
      THEN verschwindet er aus der Übersicht und geht nicht mehr in die Summen
      (offen/erstattet, je Kategorie) noch in die Kassenabrechnung der Veranstaltung ein.
- [ ] GIVEN Auslagen einer Veranstaltung in verschiedenen Kategorien WHEN die Auslagen-Übersicht
      angezeigt wird THEN werden Summen **je Kategorie** (Getränke/Essen/Sonstiges) und
      gesamt korrekt ausgewiesen, getrennt nach „offen" und „erstattet".
- [ ] GIVEN ein Teilnehmer mit Auslagen UND Verzehr WHEN sein Verzehr kassiert wird (F8)
      THEN ist der zu zahlende Verzehr-Gesamt **unabhängig** von seinen Auslagen (keine
      Netto-Verrechnung).
- [ ] GIVEN die Auslagen einer Veranstaltung WHEN die Veranstaltungs-Gesamtabrechnung gebildet wird (F8)
      THEN gehen die Erstattungen als **Ausgaben je Kategorie** in die Kassenabrechnung
      der Veranstaltung **für die zugeordnete Kasse** ein.
- [ ] GIVEN ein Auslagen-Betrag WHEN er kein gültiger EUR-Betrag > 0 mit ≤ 2
      Nachkommastellen ist THEN wird er serverseitig (Zod) abgelehnt.
- [ ] GIVEN eine Auslage ohne gewählte Kategorie oder ohne Teilnehmer WHEN gespeichert
      wird THEN wird sie serverseitig abgelehnt (Kategorie und Teilnehmer sind Pflicht).
- [ ] GIVEN eine `abgeschlossene` Veranstaltung WHEN Auslagen erfasst, geändert, gelöscht, erstattet
      oder zurückgesetzt werden sollen THEN ist jede dieser Operationen gesperrt, solange die
      Veranstaltung nicht wieder geöffnet wird (F8).

## Fehlerszenarien

- [ ] Betrag ≤ 0, nicht-numerisch, fehlende Kategorie oder fehlender Teilnehmer →
      serverseitige Ablehnung.
- [ ] Erstattung bestätigt, obwohl kein Bargeld vorhanden → Eintrag bleibt `offen`; der
      Abrechner erstattet später (kein Zwang, sofort auf `erstattet` zu setzen).
- [ ] Auslage für einen Teilnehmer, der (noch) nicht in der Veranstaltung geführt wird → Teilnehmer
      muss zuvor der Veranstaltung hinzugefügt sein (F4/Walk-in via Abrechner).
- [ ] Ändern/Löschen/Erstatten/Zurücksetzen eines Eintrags, der zu einer **anderen** Veranstaltung
      gehört → serverseitige Ablehnung; die Operation muss den Veranstaltungs-Bezug (`veranstaltungId`)
      im WHERE einschließen, nicht nur die Eintrags-ID (IDOR-Schutz, CLAUDE.md).

## Geklärte Entscheidungen (Requirements 2026-07-18)

- **Korrigieren + Löschen** erfasster Auslagen ist Teil von F6 (Betrag, Kategorie,
  Teilnehmer, Notiz änderbar; Eintrag löschbar) – solange die Veranstaltung `offen` ist.
- **Erstattung rücknehmbar:** `erstattet` → `offen` zurücksetzbar (Undo), solange die
  Veranstaltung `offen` ist. `erstattet` ist damit kein Endzustand.

## Offene Fragen (für /architecture)

- [ ] Datenmodell: Auslage als eigene Entität je Veranstaltung (n Einträge je Teilnehmer/Kategorie
      möglich) – bestätigen im Datenmodell. Löschen als Hard- oder Soft-Delete? (Soft-Delete
      wäre konsistent mit #135; Betrag/Historie spielt für die Veranstaltungs-Summe keine Rolle,
      da gelöschte Einträge nicht in die Summen eingehen.)
- [ ] Statusmodell mit Rücknahme (`offen` ⇄ `erstattet`): als einfaches Boolean/Enum-Feld
      abbilden, keine Übergangs-Historie im MVP.
- [ ] Anbindung an ein späteres Kassenbuch (#57): Auslagenerstattung als kategorisierter
      Kassen-Ausgang vormerken? Im MVP nur je Veranstaltung, ohne laufenden Saldo.
