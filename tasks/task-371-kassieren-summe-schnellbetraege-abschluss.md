# Task 371: kassieren-summe-schnellbetraege-abschluss

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Kassieren-Seite aufräumen (Spec: `docs/specs/spec-371-kassieren-summe-abschluss.md`): Summenkarte oben
(offener Betrag löst #305 ab), Spende live vor dem Absenden, Rückmeldung mit Betrag/Spende,
Tagessummen + Gesamtabrechnung + Protokoll eingeklappt unter „Abrechnung im Detail".
Abschließen/Wieder öffnen nur noch im Kopf der Detailseite, mit Bestätigung.
**Schnellbeträge entfallen** (Entscheidung in /requirements).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 Summenkarte oben: offener Betrag, Erhalten, Spenden, „x von n bezahlt"
- [ ] AK2 Offener Betrag: Teilzahlung/Überzahlung/unbezahlt korrekt
- [ ] AK3 Leerzustand „0,00 €" / „0 von 0 bezahlt"
- [ ] AK4 Offener Betrag aus `kassierTagessummen` (Single Source)
- [ ] AK5 Formatierung `formatCents` + `tabular-nums`
- [ ] AK6 Hinweis „Noch n offen"/„Alles bezahlt" mit Link zur Detailseite
- [ ] AK7 Zeile: Verzehr-Gesamt + Status-Badge
- [ ] AK8 Spende live aus getipptem Betrag
- [ ] AK9 Leere/unlesbare Eingabe → 0,00 €, kein Fehler
- [ ] AK10 Abgeschlossen: Kassieren-Seite schreibgeschützt
- [ ] AK11 375 px ohne Horizontal-Scroll, Touch-Ziele ≥ 44 px
- [ ] AK12 Rückmeldung (Notice) mit Betrag und Spende
- [ ] AK13 Server-Fehler als Notice
- [ ] AK14 „Abrechnung im Detail" eingeklappt (Tagessummen, Gesamtabrechnung, Protokoll)
- [ ] AK15 Einklappbereich tastaturbedienbar (`<details>`)
- [ ] AK16 Eingefrorene Reihenfolge (#253) bleibt
- [ ] AK17 Kassieren-Seite ohne Abschließen/Wieder öffnen
- [ ] AK18 Detailseite: „Veranstaltung abschließen" im Kopf neben dem Badge
- [ ] AK19 Abschließen mit ConfirmDialog
- [ ] AK20 Dialog nennt bei offenen Zeilen Anzahl und Betrag; Server-Ablehnung bleibt
- [ ] AK21 Kein Offen-Hinweis ohne offene Zeile
- [ ] AK22 Wieder öffnen im Kopf, mit Bestätigung, protokolliert
- [ ] AK23 Theke: kein Abschließen
- [ ] AK24 Kopf bei 375 px umbrechend
- [ ] FS1–FS4 Fehlerszenarien laut Spec

## Technische Notizen
[ADR-055](../docs/adr/055-kassieren-spende-live-abschluss-im-kopf.md) (Proposed → beim Implementieren auf Accepted):
- D1: `spendeCents()` + `offenerBetragCents` in `kassierSummen.ts` (Single Source, auch für Client)
- D2: `kassiereZeileAction` liefert `erhaltenCents` zurück; Spende rechnet der Client; Notice statt „Gespeichert."
- D3: `AbschlussAktion` (Client, `ConfirmDialog`) im `PageHeader`-Slot der Detailseite; `StatusToggle` + Test löschen
- D4: „Abrechnung im Detail" als natives `<details>`
- ADR-053 D6 trägt einen Überholt-Hinweis; nach dem Löschen von `StatusToggle` Doku-Treffer per Grep prüfen
- Reihenfolge: reine Summen → Action → Formular → `AbschlussAktion` → Seiten; `eslint/ui-token-files.mjs` pflegen

## Offene Fragen
- [ ] Protokoll langfristig auf die Detailseite? (Hier: bleibt in „Abrechnung im Detail"; ggf. eigenes Issue)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/371-kassieren-summe-schnellbetraege-abschluss`
Erstellt: 2026-10-02 23:22
