# Spec: Kassieren & Abend abschließen

> Feature F8 · Issue #55 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Zum Ende des Abends kassiert der Abrechner bei jedem Teilnehmer den Gesamtbetrag bar.
Zahlt jemand mehr, gilt der Überschuss als **Spende**. Kann jemand nicht kassiert werden
(Abrechner geht früher, kein Bargeld), bleibt die Zeile **offen**. Der Abend wird
abgeschlossen und die Tagessummen stehen fest.

## Scope

**Inbegriffen:**
- Je Zeile: Anzeige `Gesamt` (= Getränke + Sonstige − Auslagen).
- `Erhalten` (bar kassiert) je Zeile erfassen.
- `Spende` = `Erhalten − Gesamt` (automatisch; nur positiver Überschuss ist Spende).
- Zeile als **`offen`** (nicht kassiert) markieren – ohne Übertrag aufs nächste Mal.
- Abend **abschließen**: danach schreibgeschützt; Tagessummen fixiert.
- Tagessummen über alle Zeilen: Σ Getränke, Σ Sonstige, Σ Gesamt, Σ Erhalten, Σ Spende.

**Nicht inbegriffen:**
- Übertrag offener Beträge / Teilnehmer-Saldo über Abende (Backlog #56).
- Kassenbuch / laufender Kassen-Saldo (Backlog #57).
- Bargeldlose Zahlung / PayPal (Backlog #58).

## Akzeptanzkriterien

- [ ] GIVEN eine Zeile mit Verzehr und Auslagen WHEN der Gesamtbetrag gebildet wird THEN
      gilt `Gesamt = Summe Getränke + Summe Sonstige − Auslagen` (2 Nachkommastellen).
- [ ] GIVEN ein Teilnehmer zahlt genau den Gesamtbetrag WHEN `Erhalten = Gesamt` erfasst
      wird THEN ist `Spende = 0` und die Zeile gilt als **bezahlt**.
- [ ] GIVEN ein Teilnehmer zahlt mehr WHEN `Erhalten > Gesamt` erfasst wird THEN ist
      `Spende = Erhalten − Gesamt` und wird als Spende ausgewiesen.
- [ ] GIVEN ein Teilnehmer kann nicht kassiert werden WHEN der Abrechner die Zeile als
      **offen** markiert THEN bleibt sie ohne `Erhalten`, zählt nicht als bezahlt und
      **wird nicht** übertragen (MVP).
- [ ] GIVEN ein Abend mit gemischt bezahlten und offenen Zeilen WHEN der Abrechner den
      Abend abschließt THEN wird der Abend `abgeschlossen`, ist schreibgeschützt, und die
      Tagessummen sind fixiert.
- [ ] GIVEN ein abgeschlossener Abend WHEN die Tagessummen angezeigt werden THEN
      entsprechen sie der Summe der Zeilenwerte (Getränke, Sonstige, Gesamt, Erhalten,
      Spende).

## Fehlerszenarien

- [ ] `Erhalten` kein gültiger EUR-Betrag ≥ 0 → serverseitig abgelehnt.
- [ ] Teilzahlung (`0 < Erhalten < Gesamt`) → im MVP zählt die Zeile als **offen** (nicht
      teil-bezahlt); Restbetrag-Logik ist Backlog #56. (Bestätigen – siehe offene Fragen.)
- [ ] Abschluss trotz offener Zeilen → erlaubt, aber mit deutlichem Hinweis, wie viele
      Zeilen offen bleiben.
- [ ] Negativer Gesamtbetrag (Auslagen > Verzehr, F6) → Auszahlung an Teilnehmer; klare
      Darstellung, wie `Erhalten` in diesem Fall zu erfassen ist.

## Offene Fragen

- [ ] Umgang mit **Teilzahlung**: gar nicht (nur offen/bezahlt) oder Restbetrag
      speichern? MVP-Annahme: nur offen/bezahlt. → bestätigen.
- [ ] Darf ein abgeschlossener Abend wieder **geöffnet** werden (Korrektur), und durch
      welche Rolle? → /architecture.
- [ ] Negativer Gesamtbetrag: Wird ausgezahltes Geld als negatives `Erhalten` erfasst
      oder als eigener Vorgang? → mit F6 gemeinsam klären.
