# Task 374: header-startseite-zurueck-navigation

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Header mit Wortmarke und Konto-Menü, Startseite mit offenen Veranstaltungen, `PublicHeader` auf `/theke/[token]`, einheitlicher `PageHeader` samt Zurück-Link auf Unterseiten, Kacheln „Verzehr erfassen"/„Auslagen erfassen". Spec: `docs/specs/spec-374-header-startseite-zurueck-navigation.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1.1–1.6 Header: Wortmarke, Navigation, Konto-Menü (Aufklapp), 375-px-tauglich
- [ ] AK2.1–2.6 Startseite: Liste offener Veranstaltungen (nur `veranstalter`), Leer-Hinweis, Kacheln darunter
- [ ] AK3.1–3.4 `PublicHeader` auf `/theke/[token]` (nicht bei ungültigem Token, nicht auf `/login`)
- [ ] AK4.1–4.7 `PageHeader` + Zurück-Link auf Verzehr/Auslagen; Titel-Header auf Liste/Teilnehmer/Katalog-Index; „Kassieren" ohne Pfeil
- [ ] AK5.1–5.3 Kacheln „Verzehr erfassen"/„Auslagen erfassen"
- [ ] AK5.4 Anleitung + Screenshots aktualisiert – erst nach erfolgreichem `/implement` und `/review`
- [ ] AK6 Lint, Tests, `routes-doc-check` grün; `docs/routes.md` aktuell
- [ ] AK7 `docs/ux/ux-issue-entwuerfe.md` UX-7 angeglichen (in `/requirements` erledigt)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
_Keine._ Geklärt: Anleitung/Screenshots im selben PR nach erfolgreicher Implementierung + Review (AK5.4); Sortierung bei gleichem Datum nach Anlage-Zeit.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/374-header-startseite-zurueck-navigation`
Erstellt: 2026-10-03 20:21
