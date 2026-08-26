# Task 308: personenbezogener-wechsel-verzehr-kassieren

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Direkter, personenbezogener Wechsel zwischen Verzehrerfassung (`/veranstaltung/[id]/verzehr`)
und Kassieren (`/veranstaltung/[id]/kassieren`): aus der geöffneten Teilnehmer-Karte direkt in
die Kassierzeile **dieser** Person (angescrollt, hervorgehoben, `Erhalten`-Feld fokussiert) und
aus jeder Kassierzeile direkt zurück in die geöffnete Verzehr-Karte derselben Person. Reine
Navigation – keine Änderung an Summen, Zeilenstatus oder Abschluss-Gate.

**Spec:** [`docs/specs/spec-308-personenbezogener-wechsel-verzehr-kassieren.md`](../docs/specs/spec-308-personenbezogener-wechsel-verzehr-kassieren.md)

## Akzeptanzkriterien
- [ ] AK1 – Hinweg: Aktion „Kassieren" in der geöffneten Karte führt personenbezogen in die Kassieransicht
- [ ] AK2 – Zielzeile ist hervorgehoben und im Sichtbereich (sticky Kopf verdeckt sie nicht)
- [ ] AK3 – `Erhalten`-Feld der Zielzeile hat den Tastaturfokus (offene Veranstaltung)
- [ ] AK4 – Listen-Reihenfolge unberührt: Sortierung #223 und Positions-Freeze #253 bleiben gültig
- [ ] AK5 – Rückweg: Aktion „Verzehr erfassen" in jeder Kassierzeile führt personenbezogen zurück
- [ ] AK6 – Zielkarte initial geöffnet (alle anderen zu) und im Sichtbereich
- [ ] AK7 – „Kassieren"-Aktion nur in der geöffneten Karte, nicht in eingeklappten
- [ ] AK8 – Wechsel beliebig oft in beide Richtungen, ohne Umweg über die Detailseite
- [ ] AK9 – Öffentlicher Weg `/theke/[token]` zeigt keine „Kassieren"-Aktion
- [ ] AK10 – Abgeschlossene Veranstaltung: Wechsel-Links bleiben, Lesesicht bleibt Lesesicht
- [ ] AK11 – Personenbezug übersteht ein Neuladen der Zielseite
- [ ] AK12 – Summen, Erhalten, Spende, Zeilenstatus und Gesamtabrechnung unverändert
- [ ] F1 – Unbekannter Personenbezug: Standardzustand, keine Fehlermeldung, kein 404, kein Leck
- [ ] F2 – Abgeschlossen ohne `Erhalten`-Feld: Hervorhebung ja, Fokus nein, kein Laufzeitfehler
- [ ] F3 – Veranstaltung ohne Teilnehmer: Leer-Hinweis unverändert, kein Fehler
- [ ] F4 – Nutzer ohne Rolle `veranstalter`: bestehendes „Kein Zugriff"-Verhalten unverändert

## Technische Notizen

- **Kein ADR-Trigger erkannt** (`/architecture` entfällt): reine Navigation, keine neue
  Auth-Mechanik (beide Seiten sind bereits `veranstalter`-gegated), kein neues Datenmodell, keine
  neue Route. Die relevanten Entscheidungen liegen bereits vor: ADR-039 (route-neutrale
  Verzehr-Bausteine, D1: kein Feature-/Routen-Import), ADR-024 (Route-Schnitt), #223/#253
  (Sortierung + Positions-Freeze der Kassierliste).
- Vorhandene Bausteine, die der Wechsel nutzen kann: `FokusListe` hat bereits
  `initialOpenId: string | null`; die Kassierliste rendert über `EingefroreneZeilenListe`.
  `scroll-margin-top` wegen der sticky Köpfe beachten (vgl. #188).
- `docs/routes.md` braucht **keine** Änderung (keine neue Route, kein geänderter Zugriff).

## Offene Fragen
- Keine offenen fachlichen Fragen (siehe Spec → „Offene Fragen" für die bewusst dort
  entschiedenen Punkte).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/308-personenbezogener-wechsel-verzehr-kassieren`
Erstellt: 2026-08-26 19:46
