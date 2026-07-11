# Epic: Digitale Veranstaltungs-Abrechnung (Montagsrunde)

Digitaler Ersatz für das Excel-Template „Abrechnung Veranstaltung". Der Thekenwart
(Dieter, Ralf, …) rechnet einen Veranstaltungsabend ab: Getränke aus der Theke,
Essen, Kaffee, Auslagen – pro Teilnehmer bzw. Familie – und kassiert bar.

## Fixierte Rahmenentscheidungen (Requirements-Session 2026-07-11)

| Achse | Entscheidung |
|---|---|
| Erfassung | Hybrid, Selbstbedienung: eigenes Handy **und** gemeinsames Theken-Gerät |
| Zugang Teilnehmer | Abend-**Link/QR + Namenswahl** aus Stammdaten, **kein** Passwort |
| Sichtbarkeit | **Volle Transparenz** – jeder sieht/bearbeitet die ganze Liste (wie heute) |
| Rollen (mit Login) | **Verwalter** (Stammdaten/Preise) + **Abrechner** (Abende/kassieren) |
| Teilnehmer | Zentrale Stammdaten, **kein** eigenes Konto |
| Bezahlung | Nur **bar** im MVP (PayPal später) |
| Offene Posten & Kassenbuch | **später** (Backlog) |
| Offline | **keine** Offline-Anforderung (WLAN stabil), PWA nur installierbar |

## MVP-Features (Issues #48–#55)

| # | Issue | Spec | hängt ab von |
|---|---|---|---|
| F1 | #48 Login & Rollen | [spec-48](spec-48-login-rollen.md) | – |
| F2 | #49 Getränke-Katalog & Preise | [spec-49](spec-49-getraenke-katalog.md) | F1 |
| F3 | #50 Teilnehmer-Stammdaten | [spec-50](spec-50-teilnehmer-stammdaten.md) | F1 |
| F4 | #51 Abend anlegen & führen | [spec-51](spec-51-abend-anlegen.md) | F2, F3 |
| F5 | #52 Verzehr erfassen | [spec-52](spec-52-verzehr-erfassen.md) | F4 |
| F6 | #53 Auslagen erfassen | [spec-53](spec-53-auslagen.md) | F5 |
| F7 | #54 Selbstbedienung Link/QR | [spec-54](spec-54-selbstbedienung-link.md) | F5 |
| F8 | #55 Kassieren & Abschluss | [spec-55](spec-55-kassieren-abschluss.md) | F5, F6 |

## Backlog (bewusst nicht im MVP, Issues #56–#60)

- #56 Offene Posten übertragen & Teilnehmer-Saldo über mehrere Abende
- #57 Kassenbuch der Montagsrunde (laufender Saldo)
- #58 Online-Bezahlung (PayPal)
- #59 Preis-Templates je Veranstaltungstyp (z. B. Kaffee 1 € vs. 2,50 €)
- #60 Wiederkehrende Veranstaltungsserie / Vorlagen

## Referenz-Preisliste (aus dem Excel-Template, Stand 2026-04-28)

Wird über den Getränke-Katalog (F2) gepflegt, nicht im Code fixiert.

| Artikel | Größe | Preis |
|---|---|---|
| ISO-Sportdrink | 0,5 l | 2,00 € |
| Cola/Fanta/Spezi/Limo | 0,2 / 0,33 / 0,5 / 0,7 l | 1,20 / 1,60 / 2,10 / 2,50 € |
| Mineralwasser | 0,2 / 0,5 l | 0,50 / 1,00 € |
| Sprudel | 1,0 l | 1,20 € |
| Weinschorle | 0,25 / 0,5 l | 2,00 / 3,50 € |
| Bier | 0,33 / 0,5 l | 2,00 / 2,50 € |
| Weizenbier | 0,5 l | 3,00 € |
| Sekt | 0,1 / 0,7 l | 1,50 / 8,00 € |
| Kaffee | – | fest im Katalog (Beispiel 1,00 €) |
| Essen | – | **pro Abend** festgelegt (i. d. R. 6 / 7 €) |

**Zeilenberechnung (bewusste Abweichung vom Template, Entscheidung 2026-07-11):**
`Verzehr-Gesamt = Summe Getränke (Theke) + Summe Sonstige (Essen + Kaffee)`
`Spende = Erhalten − Verzehr-Gesamt`

Anders als im Excel (Spalte V = T + Q − U) mindern **Auslagen den Verzehr nicht**.
Die **Auslagenerstattung ist ein eigener Vorgang** (Barauszahlung aus der Kasse an den
Teilnehmer), getrennt vom individuellen Kassieren. Dadurch gibt es keinen negativen
Gesamtbetrag. Jede Auslage ist **einem Teilnehmer** und einer **Kategorie**
(Getränke / Essen / Sonstiges) zugeordnet. Auf **Abend-Ebene** fließen die Erstattungen
in die Gesamt-/Kassenabrechnung ein:
`Kassenveränderung des Abends = Σ Erhalten − Σ Auslagenerstattungen`.
Siehe [spec-53](spec-53-auslagen.md) und [spec-55](spec-55-kassieren-abschluss.md).

## Gesetzte MVP-Entscheidungen (Requirements-Schärfung 2026-07-11)

- **Nicht-Mitglieder** zahlen dieselben Preise wie Mitglieder (Kennzeichen nur Info/Auswertung).
- **Essenpreis** gilt **abendweit einheitlich**; eine spätere Änderung wirkt auf alle Essen des Abends.
- **Erfassung ist anonym** – keine Urheber-Nachverfolgung („wer hat eingetragen").
- **Walk-in:** nur der **Abrechner** legt spontan einen neuen Teilnehmer an (landet in den Stammdaten); Selbstbedienung wählt nur aus der bestehenden Liste.
- **Teilzahlung:** eine Zeile ist **offen oder bezahlt**, kein Restbetrag im MVP.
- **Auslagenerstattung:** **eigener Vorgang**, getrennt vom individuellen Kassieren; je
  Auslage **ein Teilnehmer** + **Kategorie** (Getränke/Essen/Sonstiges); auf **Abend-Ebene**
  in der Gesamt-/Kassenabrechnung als Ausgaben berücksichtigt (siehe oben).
- **Abschluss-Korrektur:** ein **Abrechner** darf einen abgeschlossenen Abend **wieder öffnen**, korrigieren und erneut abschließen (protokolliert).
