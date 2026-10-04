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
ADR: `docs/adr/056-header-konto-menue-startseite-oeffentlicher-header.md` (ergänzt ADR-031).
- **Konto-Menü:** natives Popover (`popover` + `popovertarget`), keine eigene Fokus-Logik; Positionierung `fixed` oben rechts mit Safe-Area. Mindestbrowser Chrome 114 / Safari 17 / Firefox 125.
- **Header:** Hamburger · Wortmarke (`Link` auf `/`) · Desktop-Nav · `ml-auto` · Konto-Knopf; Hamburger/Konto `shrink-0`, Wortmarke `truncate`. `AppNav`-Props bleiben (`label` nur noch im Menü).
- **Startseite:** neue `listOffeneVeranstaltungen()` (DB-Filter `status='offen'`, `typ='veranstaltung'`, `datum DESC, created_at DESC`); nur aufrufen, wenn Rolle `veranstalter`; `try/catch` um genau diesen Aufruf, bei Fehler Hinweis + Kacheln. Liste als Komponente `app/veranstaltung/OffeneVeranstaltungen.tsx`. `docs/routes.md` Zeile `/` anpassen.
- **`PublicHeader`:** in `app/theke/[token]/page.tsx` nach dem `notFound()`-Check, `contextLabel={bezeichnung}`; auf Token-Klassen umstellen.
- **AK4:** `PageHeader` auf Verzehr/Auslagen (back = „Zur Veranstaltung“), Liste, Teilnehmer; „Kassieren“ ohne Pfeil. Farb-Gate (`eslint/ui-token-files.mjs`) nur um vollständig umgestellte Dateien erweitern (`AppNav`, `KontoMenue`, `PublicHeader`, `app/page.tsx`, `OffeneVeranstaltungen`); die vier Seiten folgen mit #373.
- **Tests:** jsdom kennt die Popover-API nicht, deshalb prüfen Unit-Tests Attribute und Verdrahtung, Öffnen/Escape/Fokus prüft Playwright. DB-Integrationstest für `listOffeneVeranstaltungen` mit `__test__`-Präfix (eigenes Namensfenster). Nach `next dev`: `git checkout -- CLAUDE.md`.
- **Reihenfolge:** Implementierung, dann `/review`, erst danach Anleitung und Screenshots (AK5.4).

## Offene Fragen
_Keine._ Geklärt: Anleitung/Screenshots im selben PR nach erfolgreicher Implementierung + Review (AK5.4); Sortierung bei gleichem Datum nach Anlage-Zeit.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/374-header-startseite-zurueck-navigation`
Erstellt: 2026-10-03 20:21
