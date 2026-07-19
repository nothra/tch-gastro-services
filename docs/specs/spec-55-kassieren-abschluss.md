# Spec: Kassieren & Veranstaltung abschließen

> Feature F8 · Issue #55 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> **Zielbild (ADR-024, #120):** F8 wird die authentifizierte Unterroute
> `app/veranstaltung/[id]/kassieren` (Bereich `app/abrechnung/veranstaltung` → **`app/veranstaltung`**
> umbenannt). Die Owner-Rolle `abrechner` → **`veranstalter`**.
> Siehe [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).

## Kontext

Zum Ende der Veranstaltung kassiert der Veranstalter bei jedem Teilnehmer seinen **Verzehr** bar.
Zahlt jemand mehr, gilt der Überschuss als **Spende**. Kann jemand nicht kassiert werden
(Veranstalter geht früher, kein Bargeld), bleibt die Zeile **offen**. Die Veranstaltung wird
abgeschlossen und die Tagessummen stehen fest.

**Wichtig (Entscheidung 2026-07-11):** Auslagen werden hier **nicht** verrechnet – deren
Erstattung ist ein eigener Vorgang (F6). Der Verzehr-Gesamt ist daher immer ≥ 0.

## Scope

**Inbegriffen:**
- Je Zeile: Anzeige `Verzehr-Gesamt` = `Summe Getränke (Theke) + Summe Sonstige (Essen + Kaffee)`.
- `Erhalten` (bar kassiert) je Zeile erfassen.
- `Spende` = `Erhalten − Verzehr-Gesamt` (automatisch; nur positiver Überschuss ist Spende).
- Zeilen-Status **`offen`** oder **`bezahlt`** – **kein** Restbetrag/Teilzahlung im MVP.
  **Status-Logik (hybrid, Entscheidung 2026-07-19):** `Erhalten ≥ Verzehr-Gesamt` ⇒ Zeile
  automatisch **`bezahlt`**; der Veranstalter kann eine Zeile zusätzlich **explizit `offen`**
  lassen bzw. wieder auf `offen` setzen (Fall „nicht kassierbar"), auch ohne erfasstes
  `Erhalten`. Eine Zeile mit `Verzehr-Gesamt = 0` und `Erhalten = 0` gilt als **bezahlt**
  (nichts zu kassieren) und zählt beim Abschluss **nicht** als offene Zeile.
- Veranstaltung **abschließen**: danach schreibgeschützt; Tagessummen fixiert.
- Abgeschlossene Veranstaltung durch einen **Veranstalter wieder öffnen**, korrigieren, erneut
  abschließen – jede (Wieder-)Öffnung/Abschluss wird protokolliert.
- Tagessummen über alle Zeilen: Σ Getränke, Σ Sonstige, Σ Verzehr-Gesamt, Σ Erhalten,
  Σ Spende.
- **Veranstaltungs-Gesamtabrechnung (Kassenabrechnung der Veranstaltung):** bezogen auf die der Veranstaltung
  **zugeordnete Kasse** (F4: `montagsrunde` | `vereinskasse`); stellt die **Einnahmen**
  (Σ Erhalten) den **Ausgaben** (Auslagenerstattungen, F6) gegenüber:
  - Auslagenerstattungen **je Kategorie** (Getränke / Essen / Sonstiges) und gesamt,
  - **Kassenveränderung der Veranstaltung** = Σ Erhalten − Σ Auslagenerstattungen,
    ausgewiesen **für die zugeordnete Kasse**.
  Kassieren bleibt dabei je Teilnehmer **brutto** (kein Netto mit Auslagen). Ein
  laufender Saldo je Kasse über mehrere Veranstaltungen ist **nicht** Teil des MVP (Backlog #57).

**Nicht inbegriffen:**
- Verrechnung/Anzeige von Auslagen in der Kassierzeile (eigener Vorgang, F6).
- Teilzahlung / offener Restbetrag (bewusst nicht, MVP).
- Übertrag offener Beträge / Teilnehmer-Saldo über Veranstaltungen (Backlog #56).
- Kassenbuch / laufender Kassen-Saldo (Backlog #57).
- Bargeldlose Zahlung / PayPal (Backlog #58).

## Akzeptanzkriterien

- [ ] GIVEN eine Zeile mit erfasstem Verzehr WHEN der Verzehr-Gesamt gebildet wird THEN
      gilt `Verzehr-Gesamt = Summe Getränke + Summe Sonstige` (2 Nachkommastellen,
      **ohne** Auslagen-Abzug).
- [ ] GIVEN ein Teilnehmer zahlt genau den Verzehr-Gesamt WHEN `Erhalten = Verzehr-Gesamt`
      erfasst wird THEN ist `Spende = 0` und die Zeile gilt als **bezahlt**.
- [ ] GIVEN eine Zeile ohne jeden Verzehr (`Verzehr-Gesamt = 0`) und ohne `Erhalten` WHEN
      der Status gebildet wird THEN gilt die Zeile als **bezahlt** (nichts zu kassieren) und
      zählt beim Abschluss **nicht** als offene Zeile.
- [ ] GIVEN eine bereits als bezahlt geltende Zeile (z. B. `Erhalten ≥ Verzehr-Gesamt`) WHEN
      der Veranstalter sie **explizit auf `offen`** setzt (nicht kassierbar) THEN gilt sie als
      **offen** und zählt als offene Zeile – unabhängig vom erfassten `Erhalten`.
- [ ] GIVEN ein Teilnehmer zahlt mehr WHEN `Erhalten > Verzehr-Gesamt` erfasst wird THEN
      ist `Spende = Erhalten − Verzehr-Gesamt` und wird als Spende ausgewiesen; Zeile
      **bezahlt**.
- [ ] GIVEN ein Teilnehmer zahlt weniger als den Verzehr-Gesamt (`Erhalten < Verzehr-
      Gesamt`) WHEN das erfasst wird THEN gilt die Zeile **nicht** als bezahlt; sie
      bleibt/wird **offen** (kein Restbetrag gespeichert – MVP).
- [ ] GIVEN ein Teilnehmer kann nicht kassiert werden WHEN der Veranstalter die Zeile als
      **offen** markiert THEN bleibt sie ohne `Erhalten`, zählt nicht als bezahlt und
      **wird nicht** übertragen (MVP).
- [ ] GIVEN eine Veranstaltung mit gemischt bezahlten und offenen Zeilen WHEN der Veranstalter die
      Veranstaltung abschließt THEN wird die Veranstaltung `abgeschlossen`, ist schreibgeschützt, und die
      Tagessummen sind fixiert.
- [ ] GIVEN eine abgeschlossene Veranstaltung WHEN ein Veranstalter sie wieder öffnet THEN sind
      Korrekturen (Verzehr, Erhalten, Auslagen) wieder möglich; die Wiederöffnung wird
      protokolliert; nach erneutem Abschluss sind die Summen neu fixiert.
- [ ] GIVEN eine abgeschlossene Veranstaltung WHEN die Tagessummen angezeigt werden THEN
      entsprechen sie der Summe der Zeilenwerte (Getränke, Sonstige, Verzehr-Gesamt,
      Erhalten, Spende).
- [ ] GIVEN eine Veranstaltung mit zugeordneter Kasse und Auslagenerstattungen (F6) WHEN die
      Veranstaltungs-Gesamtabrechnung angezeigt wird THEN werden die Erstattungen **je Kategorie**
      und gesamt als Ausgaben ausgewiesen und die **Kassenveränderung**
      = Σ Erhalten − Σ Auslagenerstattungen **für die zugeordnete Kasse** korrekt
      berechnet.
- [ ] GIVEN das individuelle Kassieren eines Teilnehmers mit eigenen Auslagen WHEN sein
      `Erhalten` erfasst wird THEN bleibt der zu kassierende Betrag der **volle**
      Verzehr-Gesamt (die Auslagen wirken nur in der Veranstaltungs-Gesamtabrechnung, nicht hier).

## Fehlerszenarien

- [ ] `Erhalten` kein gültiger EUR-Betrag ≥ 0 → serverseitig abgelehnt.
- [ ] Abschluss trotz offener Zeilen → erlaubt, aber mit deutlichem Hinweis, wie viele
      Zeilen offen bleiben.
- [ ] Wiederöffnen durch eine Person ohne Veranstalter-Rolle → serverseitig abgelehnt (F1).

## Offene Fragen (für /architecture)

- [ ] Protokollierung von Öffnen/Abschluss: eigenes Audit-Log oder Zeitstempel+Nutzer an
      der Veranstaltung? → /architecture.
- [ ] Konsistenz der fixierten Tagessummen bei Wiederöffnung (neu berechnen vs.
      Snapshot je Abschluss) → /architecture.
