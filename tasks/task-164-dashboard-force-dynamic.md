# Task 164: dashboard-force-dynamic

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Bug #164 (Deploy Gate INT, Label `bug` + `security`): Nach dem Abmelden liefert die
Route `/` **weiterhin das authentifizierte Dashboard** statt auf `/login` umzuleiten.
`e2e/auth.spec.ts:53` schlägt fehl (`toHaveURL(/\/login/)`).

## Akzeptanzkriterien
- [x] GIVEN angemeldeter Nutzer WHEN Abmelden geklickt und danach `/` erneut geladen
      THEN Redirect auf `/login` (kein authentifiziertes Dashboard mehr).
- [x] GIVEN Dashboard bzw. Kopfzeile WHEN mit Rollen gerendert THEN werden Nav-Links zu
      geschützten Routen **nicht** automatisch geprefetcht (`prefetch={false}`).

## Root Cause
`Root Cause [2026-07-19]: app/components/AppNav.tsx + app/page.tsx – auto-geprefetchte`
`<Link>s zu geschützten Routen. Kein Server-Fehler (/ ist dynamisch, sendet no-store,`
`leitet abgemeldet auf /login um; kein Service Worker).`

**Mechanismus (aus INT-Playwright-Trace, repeat17):** #134 hat auf Dashboard **und**
Kopfzeile `<Link>`s zu `/veranstaltung`, `/verwaltung/katalog`, `/verwaltung/teilnehmer`
ergänzt. Next.js prefetcht diese automatisch beim Rendern. Jede **authentifizierte
Prefetch-Antwort rotiert das Auth.js-JWT-Session-Cookie** (Rolling Session). Beim Abmelden
landen noch fliegende Prefetch-Antworten (~40 ms) **nach** dem signOut-Clear und **setzen
das Cookie neu** → die Session wird wiederbelebt. Der folgende `/`-Aufruf sendet das
(auferstandene) Cookie → authentifiziertes Dashboard. Reines Timing ⇒ flaky (2–3 von 18).
Trace-Beleg: `+940ms ACTION / [SESSION-CLEARED]` … `+980ms PREFTCH /veranstaltung
[SESSION-SET]` (Wiederbelebung durch Prefetch nach dem Clear).

Vor #134 hatte `/` keine geschützten Links → keine Prefetches → Logout hielt zuverlässig.
Die Issue-Vermutung (`force-dynamic`) ist ein **No-op** – `/` ist bereits dynamisch.

## Fix
`prefetch={false}` auf den `<Link>`s zu geschützten Routen in `app/components/AppNav.tsx`
(renderLink) und `app/page.tsx` (Hub-Kacheln) → entfernt die authentifizierten
Auto-Prefetch-Requests, die das Session-Cookie nach dem Abmelden wiederbeleben.

## Technische Notizen
Verifikation: deterministischer Regressionstest `app/nav-prefetch.test.tsx` (RED→GREEN),
gesamte Unit-Suite grün, Build grün. Die Integrations-Reproduktion ist der INT-Deploy-Gate-e2e
`e2e/auth.spec.ts` (greift nach Merge `main`→`int`).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
Muster: Auto-Prefetch (`<Link>`) auf **authentifizierte** Routen feuert Hintergrund-RSC-Requests,
die das Rolling-Session-Cookie rotieren und mit `signOut` racen (Session-Resurrection, flaky
Logout). Bei geschützten Nav-Links `prefetch={false}` setzen. Debugging-Lehre: server-seitige
Korrektheit (dynamisch/no-store/Redirect) schließt einen Client-Race nicht aus – der
Playwright-Trace (Set-Cookie-Reihenfolge) war entscheidend.

---
Branch: `fix/164-dashboard-force-dynamic`
Erstellt: 2026-07-19 14:02
