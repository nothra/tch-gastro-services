# Spec: Kassieren & Abend abschließen

> Feature F8 · Issue #55 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Zum Ende des Abends kassiert der Abrechner bei jedem Teilnehmer seinen **Verzehr** bar.
Zahlt jemand mehr, gilt der Überschuss als **Spende**. Kann jemand nicht kassiert werden
(Abrechner geht früher, kein Bargeld), bleibt die Zeile **offen**. Der Abend wird
abgeschlossen und die Tagessummen stehen fest.

**Wichtig (Entscheidung 2026-07-11):** Auslagen werden hier **nicht** verrechnet – deren
Erstattung ist ein eigener Vorgang (F6). Der Verzehr-Gesamt ist daher immer ≥ 0.

## Scope

**Inbegriffen:**
- Je Zeile: Anzeige `Verzehr-Gesamt` = `Summe Getränke (Theke) + Summe Sonstige (Essen + Kaffee)`.
- `Erhalten` (bar kassiert) je Zeile erfassen.
- `Spende` = `Erhalten − Verzehr-Gesamt` (automatisch; nur positiver Überschuss ist Spende).
- Zeilen-Status **`offen`** oder **`bezahlt`** – **kein** Restbetrag/Teilzahlung im MVP.
- Abend **abschließen**: danach schreibgeschützt; Tagessummen fixiert.
- Abgeschlossenen Abend durch einen **Abrechner wieder öffnen**, korrigieren, erneut
  abschließen – jede (Wieder-)Öffnung/Abschluss wird protokolliert.
- Tagessummen über alle Zeilen: Σ Getränke, Σ Sonstige, Σ Verzehr-Gesamt, Σ Erhalten,
  Σ Spende.
- **Abend-Gesamtabrechnung (Kassenabrechnung des Abends):** bezogen auf die dem Abend
  **zugeordnete Kasse** (F4: `montagsrunde` | `vereinskasse`); stellt die **Einnahmen**
  (Σ Erhalten) den **Ausgaben** (Auslagenerstattungen, F6) gegenüber:
  - Auslagenerstattungen **je Kategorie** (Getränke / Essen / Sonstiges) und gesamt,
  - **Kassenveränderung des Abends** = Σ Erhalten − Σ Auslagenerstattungen,
    ausgewiesen **für die zugeordnete Kasse**.
  Kassieren bleibt dabei je Teilnehmer **brutto** (kein Netto mit Auslagen). Ein
  laufender Saldo je Kasse über mehrere Abende ist **nicht** Teil des MVP (Backlog #57).

**Nicht inbegriffen:**
- Verrechnung/Anzeige von Auslagen in der Kassierzeile (eigener Vorgang, F6).
- Teilzahlung / offener Restbetrag (bewusst nicht, MVP).
- Übertrag offener Beträge / Teilnehmer-Saldo über Abende (Backlog #56).
- Kassenbuch / laufender Kassen-Saldo (Backlog #57).
- Bargeldlose Zahlung / PayPal (Backlog #58).

## Akzeptanzkriterien

- [ ] GIVEN eine Zeile mit erfasstem Verzehr WHEN der Verzehr-Gesamt gebildet wird THEN
      gilt `Verzehr-Gesamt = Summe Getränke + Summe Sonstige` (2 Nachkommastellen,
      **ohne** Auslagen-Abzug).
- [ ] GIVEN ein Teilnehmer zahlt genau den Verzehr-Gesamt WHEN `Erhalten = Verzehr-Gesamt`
      erfasst wird THEN ist `Spende = 0` und die Zeile gilt als **bezahlt**.
- [ ] GIVEN ein Teilnehmer zahlt mehr WHEN `Erhalten > Verzehr-Gesamt` erfasst wird THEN
      ist `Spende = Erhalten − Verzehr-Gesamt` und wird als Spende ausgewiesen; Zeile
      **bezahlt**.
- [ ] GIVEN ein Teilnehmer zahlt weniger als den Verzehr-Gesamt (`Erhalten < Verzehr-
      Gesamt`) WHEN das erfasst wird THEN gilt die Zeile **nicht** als bezahlt; sie
      bleibt/wird **offen** (kein Restbetrag gespeichert – MVP).
- [ ] GIVEN ein Teilnehmer kann nicht kassiert werden WHEN der Abrechner die Zeile als
      **offen** markiert THEN bleibt sie ohne `Erhalten`, zählt nicht als bezahlt und
      **wird nicht** übertragen (MVP).
- [ ] GIVEN ein Abend mit gemischt bezahlten und offenen Zeilen WHEN der Abrechner den
      Abend abschließt THEN wird der Abend `abgeschlossen`, ist schreibgeschützt, und die
      Tagessummen sind fixiert.
- [ ] GIVEN ein abgeschlossener Abend WHEN ein Abrechner ihn wieder öffnet THEN sind
      Korrekturen (Verzehr, Erhalten, Auslagen) wieder möglich; die Wiederöffnung wird
      protokolliert; nach erneutem Abschluss sind die Summen neu fixiert.
- [ ] GIVEN ein abgeschlossener Abend WHEN die Tagessummen angezeigt werden THEN
      entsprechen sie der Summe der Zeilenwerte (Getränke, Sonstige, Verzehr-Gesamt,
      Erhalten, Spende).
- [ ] GIVEN ein Abend mit zugeordneter Kasse und Auslagenerstattungen (F6) WHEN die
      Abend-Gesamtabrechnung angezeigt wird THEN werden die Erstattungen **je Kategorie**
      und gesamt als Ausgaben ausgewiesen und die **Kassenveränderung**
      = Σ Erhalten − Σ Auslagenerstattungen **für die zugeordnete Kasse** korrekt
      berechnet.
- [ ] GIVEN das individuelle Kassieren eines Teilnehmers mit eigenen Auslagen WHEN sein
      `Erhalten` erfasst wird THEN bleibt der zu kassierende Betrag der **volle**
      Verzehr-Gesamt (die Auslagen wirken nur in der Abend-Gesamtabrechnung, nicht hier).

## Fehlerszenarien

- [ ] `Erhalten` kein gültiger EUR-Betrag ≥ 0 → serverseitig abgelehnt.
- [ ] Abschluss trotz offener Zeilen → erlaubt, aber mit deutlichem Hinweis, wie viele
      Zeilen offen bleiben.
- [ ] Wiederöffnen durch eine Person ohne Abrechner-Rolle → serverseitig abgelehnt (F1).

## Offene Fragen (für /architecture)

- [ ] Protokollierung von Öffnen/Abschluss: eigenes Audit-Log oder Zeitstempel+Nutzer am
      Abend? → /architecture.
- [ ] Konsistenz der fixierten Tagessummen bei Wiederöffnung (neu berechnen vs.
      Snapshot je Abschluss) → /architecture.
