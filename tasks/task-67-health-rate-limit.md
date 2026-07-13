# Task 67: health-rate-limit

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Härtung des öffentlichen, unauthentifizierten `/api/health`-Endpunkts gegen
Neon-Free-Amplifikation. Der Endpunkt löst heute pro Request genau einen Neon-DB-Roundtrip aus
(`db.select({ roles }).from(users).limit(1)`), der Schema-Drift erkennt. Ein **Rate-Limit**
deckelt, **wie oft** dieser DB-Read pro Zeitfenster ausgeführt wird → DB-Last wird von der
Request-Zahl entkoppelt. Der Endpunkt bleibt **unauth** und für den Deploy-Gate-Healthcheck
(`200`/`503`) nutzbar.

- **Issue:** #67 · **Typ:** enhancement · security · tech-debt
- **Spec:** `docs/specs/spec-67-health-rate-limit.md`
- **Quelle:** Backlog-Härtung aus `tasks/review-63.md` (Z. 39–40), `tasks/security-63.md` (Z. 26–28)
- **Schutzart (entschieden):** Rate-Limit (Flood-Schutz), **kein** Response-Caching.
- **DB-Read (entschieden):** bleibt erhalten (Schema-Drift-Erkennung), läuft aber nur für erlaubte Anfragen.

## Akzeptanzkriterien

- [ ] AK-1: GIVEN Rate unter Schwellwert WHEN `GET /api/health`, DB erreichbar, Schema ok
  THEN DB-Read läuft, Antwort `200 {status:"ok", stage:…}` (unverändert, keine DB-Daten im Body)
- [ ] AK-2: GIVEN Rate unter Schwellwert WHEN DB-Read schlägt fehl
  THEN `503 {status:"error"}` + server-seitiges `console.error` (unverändert)
- [ ] AK-3: GIVEN N ≫ Schwellwert Anfragen/Fenster WHEN alle gegen `/api/health`
  THEN ausgeführte DB-Reads ≤ Schwellwert pro Fenster (DB-Last von Request-Zahl entkoppelt)
- [ ] AK-4: GIVEN Schwellwert im Fenster erreicht WHEN weitere Anfrage
  THEN Throttle-Antwort **ohne** DB-Read (deterministischer Status, z. B. `429`)
- [ ] AK-5: GIVEN Deploy-Gate führt seinen einzelnen post-promote Healthcheck aus
  THEN Anfrage wird nicht gedrosselt → **live** `200`/`503` aus dem DB-Read
- [ ] AK-6: GIVEN nicht angewandte Migration (fehlende `roles`-Spalte) WHEN Gate-Healthcheck
  THEN DB-Read schlägt fehl → `503` (Schema-Drift bleibt sichtbar)

### Fehlerszenarien
- [ ] FS-1: Limiter-Zustand nicht verfügbar → legitimer Healthcheck wird nicht blockiert (fail-open)
- [ ] FS-2: Kein Gate-Lockout durch Fluten (per-Quelle oder hoher Schwellwert + fail-open)
- [ ] FS-3: Throttle-Pfad nicht langsamer als der DB-Pfad

## Technische Notizen
<!-- Von /architecture befüllt -->

> Architektur-Entscheidung: **ADR-019** (`docs/adr/019-health-endpoint-rate-limit.md`).
> Kurz: **In-Memory-Best-Effort-Zähler pro Function-Instanz**, **globale Route-Kappe**,
> Default **Fixed-Window 60 s / 30 Reads / `429`**, **fail-open**.

**Wo lebt die Logik – neues Modul `lib/rate-limit.ts` (framework-unabhängig, testbar):**

- Factory statt globalem Modul-State, damit Tests eigene Instanzen mit Fake-Uhr bauen können:
  ```ts
  export interface RateLimiterOptions {
    limit: number;        // erlaubte Anfragen pro Fenster (Default-Nutzung: 30)
    windowMs: number;     // Fensterlänge in ms (Default-Nutzung: 60_000)
    now?: () => number;   // injizierbare Uhr, Default () => Date.now()
  }
  export interface RateLimiter {
    /** true = erlaubt (weiter, DB-Read), false = gedrosselt (ohne Side-Effect ablehnen) */
    tryAcquire(): boolean;
  }
  export function createRateLimiter(options: RateLimiterOptions): RateLimiter { … }
  ```
- **Fixed-Window-Implementierung:** Modul-lokal `count` + `windowStart`. Bei jedem `tryAcquire()`:
  wenn `now() - windowStart >= windowMs` → `windowStart = now()`, `count = 0` (Fenster-Reset).
  Dann: `count < limit` → `count++`, `return true`; sonst `return false`. Reine O(1)-Arithmetik,
  **kein I/O** (erfüllt FS-3).
- **Konfigurierte Singleton-Instanz** im selben Modul für den Produktions-Gebrauch, z. B.
  `export const healthRateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });`
  (nutzt implizit `Date.now`). Die Route importiert nur diese Instanz und bleibt dünn.

**Einhängen in `app/api/health/route.ts` – Guard **vor** dem DB-Read:**
```ts
import { healthRateLimiter } from "@/lib/rate-limit";
// …
export async function GET() {
  if (!healthRateLimiter.tryAcquire()) {
    // Throttle: ohne DB-Read, deterministisch, ≠ 200/503 (AK-4, FS-3)
    return NextResponse.json({ status: "throttled" }, { status: 429 });
  }
  try {
    await db.select({ roles: users.roles }).from(users).limit(1);   // unverändert (AK-1, AK-6)
    return NextResponse.json({ status: "ok", stage: process.env.NEXT_PUBLIC_STAGE ?? "dev" });
  } catch (error) {
    console.error("health: DB-Read fehlgeschlagen", error);          // unverändert (AK-2)
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
```
- `export const dynamic = "force-dynamic"` **bleibt** (kein Caching, das den Zähl-Pfad umginge).
- **Kein** `export const runtime = "edge"` setzen – der In-Memory-Zustand braucht die
  Node-Serverless-Runtime (warme Instanz hält Modul-State).
- **fail-open (FS-1):** In-Memory hat keinen externen Store, der „nicht erreichbar" sein könnte;
  Cold-Start = frischer Zähler = `tryAcquire()` gibt `true` → strukturell fail-open. `createRateLimiter`
  wirft nicht. Falls doch je eine externe Quelle dazukäme: `try/catch` um `tryAcquire()`, im
  `catch` durchlassen (nicht drosseln).

**Wie testen (Vitest, `lib/rate-limit.test.ts`, kein echter Timer/keine DB):**
- **Arrange:** `let clock = 0; const r = createRateLimiter({ limit: 3, windowMs: 1000, now: () => clock });`
- `should_allowUpToLimit_when_withinWindow`: 3× `tryAcquire()` → `true`, 4. Aufruf → `false` (AK-3/AK-4).
- `should_resetCounter_when_windowElapsed`: Limit ausschöpfen, `clock += 1000`, nächster Aufruf → `true`.
- `should_notResetCounter_when_stillInsideWindow`: `clock += 999` reicht nicht → weiterhin `false`.
- **Route-Tests** (`app/api/health/route.test.ts`): `db` mocken (Erfolg → 200 / throw → 503) und den
  Singleton bzw. eine injizierte Instanz drosseln, um den `429`-Pfad **ohne** DB-Aufruf zu prüfen
  (assert: `db.select` wurde nicht aufgerufen → belegt AK-4). Async Server Component-/Handler-Aufruf
  via `await GET()` (siehe CLAUDE.md „Vitest + Testing Library"). Auf 100 % Coverage des neuen Codes achten.

**Gate-Nachweis (nicht nur Handler):** Der einzelne Gate-`curl` liegt unter dem Schwellwert und bleibt
`200`/`503` (AK-5) – kein Extra-Aufwand nötig, aber im PR erwähnen, dass 30/60 s den Gate-Check und
einen minütlichen Uptime-Poll nie drosseln.

## Offene Fragen

> Alle vier Fragen sind in **ADR-019** (`docs/adr/019-health-endpoint-rate-limit.md`) entschieden –
> nicht mehr offen.

- [x] Zustands-Store → **Best-Effort In-Memory pro Function-Instanz** (kein geteilter Store; YAGNI, reversibel) — ADR-019
- [x] Zähl-Dimension → **globale Route-Kappe** (nicht per-Quelle: spoofbar + unbegrenzter Zustand) — ADR-019
- [x] Parameter → **Fixed-Window 60 s / Schwellwert 30 / Throttle-Status `429`** — ADR-019
- [x] Störungsverhalten → **fail-open** (Gate-Zuverlässigkeit vor Amplifikationsschutz, FS-1) — ADR-019

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/67-health-rate-limit`
Erstellt: 2026-07-13 06:37
