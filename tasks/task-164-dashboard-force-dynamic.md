# Task 164: dashboard-force-dynamic

## Status
- [x] In Bearbeitung
- [x] Review bestanden (Runde 2 APPROVED; Runde 1 NEEDS_REWORK → zentraler Fix)
- [x] Tests vollständig (proxy-Naht + prefetch-session, csrf-keep; Suite grün)
- [x] Security-Review bestanden (PASSED – rein additiv, Access-Control unverändert)
- [x] Refactoring abgeschlossen (kein Refactoring nötig – Code bereits clean)
- [x] Codify ausgeführt (Stolperstein #164 in PROJECT-CONTEXT.md)
- [x] Fertig / PR erstellt (Draft-PR #165)

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
**Primär – zentral in `proxy.ts` (`lib/prefetch-session.ts`):** Die NextAuth-Edge-Middleware
wird gewrappt; auf **RSC-/Prefetch-Requests** (kein Top-Level-Dokumentaufruf, kein POST) wird
das rotierende `…authjs.session-token`-`Set-Cookie` aus der Antwort entfernt. Damit kann keine
noch fliegende authentifizierte Prefetch-Antwort das Cookie nach `signOut` wiederbeleben –
**für ALLE geschützten Links** (nicht nur Kopfzeile/Dashboard). Echte Dokumentaufrufe und der
Login-/Logout-POST bleiben unberührt (Rolling-Session + Setzen/Löschen intakt).

Erkennung (empirisch, INT-Trace + lokaler Prod-Server): Next strippt seine Marker
`next-router-prefetch`/`rsc` VOR der Middleware; sichtbar bleibt der interne `next-url`-Header
(bei RSC/Prefetch gesetzt, bei Dokumentaufruf absent) bzw. `sec-fetch-dest ≠ "document"`.
Nur GET wird gestrippt → POST (Login/Logout) nie.

**Sekundär – Defense-in-depth + Perf:** `prefetch={false}` auf den prominenten geschützten
`<Link>`s in `app/components/AppNav.tsx` + `app/page.tsx` – spart die authentifizierte
Hintergrund-RSC-Abfrage (Neon-Last). Nicht mehr korrektheits-tragend (zentral abgesichert).

**Bewusste Entscheidung (Review-Runde 2, W2):** Der zentrale Guard unterdrückt die Session-
Rotation auf **allen** RSC-GETs – also auch echten Soft-Navigationen, nicht nur Prefetches
(die Prefetch-Marker `next-router-prefetch`/`rsc` sind in der Middleware nicht mehr sichtbar,
s. o.). Folge: Die Rolling-Session erneuert ihr Fenster nur noch bei **Dokumentaufrufen/Login**,
nicht bei Soft-Navigation. Risiko vernachlässigbar: `auth.ts` setzt kein `maxAge` → Default
**30 Tage**; ein Nutzer müsste 30 Tage lang ausschließlich soft navigieren (kein Full-Load),
um ausgeloggt zu werden – bei einer wöchentlich genutzten PWA praktisch ausgeschlossen.
Bewusst gewählt gegenüber der nicht möglichen exakten Prefetch-Erkennung.

## Technische Notizen
Verifikation:
- Unit `lib/prefetch-session.test.ts` (9 Tests, RED→GREEN): `isRscRequest` (inkl. POST-Guard) +
  `stripSessionRotation` (Secure/HTTP/chunked Cookies, andere Cookies bleiben).
- Laufzeit-A/B gegen lokalen Prod-Server (Mint-Cookie, ohne DB): RSC-GET auf `/` → **kein**
  `authjs.session-token`-Set-Cookie; Dokument-GET `/` → Set-Cookie **vorhanden**; abgemeldet → 307 `/login`.
- Unit-Guard `app/nav-prefetch.test.tsx` für die sekundären prefetch={false}-Links.
- Gesamte Unit-Suite, Typecheck, Lint, Build grün.
- Integrations-Beweis (der echte Race) = INT-Deploy-Gate-e2e `e2e/auth.spec.ts` nach Merge `main`→`int`.

### Refactoring (/refactor)
Kein Refactoring nötig. Clean-Code-Checkliste gegen den Diff geprüft: sprechende Namen, kleine
Funktionen (SRP, Early Returns), Regex als benannte Konstante, keine Duplikation/Magic Numbers,
durchgängig WHY-Kommentare. Bewusst nichts geändert (kein Gold-Plating): Header-Namen-Literale
als Einzelnutzung bleiben inline; die kurzen `prefetch={false}`-Kommentare in AppNav/page sind nicht
sinnvoll DRY-bar. Suite vor/nach identisch grün (427 passed).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
Runde 1 (`tasks/review-164.md`) → NEEDS_REWORK. Behebung im Rework (zentraler proxy.ts-Fix):
- **Kritisch (Fix unvollständig)** → behoben: zentraler Guard deckt jetzt ALLE geschützten
  Links ab (auch `app/veranstaltung/**`-Links), nicht nur Kopfzeile/Dashboard.
- **Wichtig (Test prüft Prop statt Verhalten)** → behoben: die zentrale Logik wird über echtes
  `Response`-/`Headers`-Verhalten getestet (`stripSessionRotation`) + Laufzeit-A/B.
- **Wichtig (keine zentrale Konvention)** → behoben: Prefetch-Session-Schutz liegt zentral in
  `proxy.ts`/`lib/prefetch-session`, nicht mehr per-Link verstreut.
- **Nitpicks** (Kommentar-Duplikat, areaLinks-Duplikat): per-Link-Kommentare neu gefasst;
  areaLinks bleibt lokaler Test-Helfer (gering).

## Codify-Notizen
- **Muster:** Auto-Prefetch (`<Link>`) auf **authentifizierte** Routen feuert Hintergrund-RSC-
  Requests, die das Rolling-Session-Cookie rotieren und mit `signOut` racen (Session-Resurrection,
  flaky Logout). Zentral abfangen: auf RSC-/Prefetch-Requests die Session-Rotation unterdrücken.
- **Next-16-Falle:** Next strippt seine eigenen Prefetch-/RSC-Marker (`next-router-prefetch`, `rsc`)
  **vor** der Middleware/`proxy.ts` – in der Middleware sind sie `null`. Für RSC-Erkennung in der
  Middleware den internen `next-url`-Header (bzw. `sec-fetch-dest ≠ "document"`) nutzen, nicht
  `next-router-prefetch`. Empirisch verifiziert (Debug-Header + lokaler Prod-Server).
- **Debugging-Lehre:** server-seitige Korrektheit (dynamisch/no-store/Redirect) schließt einen
  Client-Race nicht aus; der Playwright-Trace (Set-Cookie-Reihenfolge, `[SESSION-CLEARED]` vor
  racenden `[SESSION-SET]`-Prefetch-Antworten) war der entscheidende Beweis. `--repeat-each` machte
  den flaky Race reproduzierbar.
- **Review-Lehre:** Symptom-Fix am Meldepfad (`/`) ≠ Fix der Schwachstellen-Klasse; bei einem
  generischen Root Cause zentral statt per-Call-Site fixen.

---
Branch: `fix/164-dashboard-force-dynamic`
Erstellt: 2026-07-19 14:02
