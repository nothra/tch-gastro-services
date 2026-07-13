# Security Review: Task 67

Scope: Härtung des öffentlichen `/api/health`-Endpunkts durch Rate-Limit (ADR-020).
Geprüft: `lib/rate-limit.ts`, `app/api/health/route.ts`, deren Tests sowie die
Erreichbarkeit über `proxy.ts`. Threat Surface: **öffentlich, unauthentifiziert**,
löst pro erlaubter Anfrage einen Neon-DB-Roundtrip aus (Amplifikations-Risiko auf
Neon-Free).

## Prüfkatalog

### Input-Validierung & Injection
- Endpunkt nimmt **keinen** User-Input entgegen (kein Query-Param, kein Body-Parsing).
  Kein Injection-Vektor.
- DB-Zugriff ist ein statischer Drizzle-ORM-Select (`db.select({roles}).from(users).limit(1)`),
  kein roher SQL-String → keine SQL-Injection.
- `tryAcquire()` verarbeitet keine externen Werte; reine interne Arithmetik.

### Authentifizierung & Autorisierung
- Endpunkt ist **bewusst öffentlich** (Deploy-Gate-Healthcheck, Uptime-Poll) – korrekt.
- `api/health` ist im Negativ-Lookahead des `proxy.ts`-Matchers eingetragen
  (`proxy.ts:18`) → unauthentifiziert erreichbar, kein 307-Redirect auf `/login`
  (Regelkonform mit der #63-Codify-Regel „Öffentliche API-Routen aus dem Auth-Proxy
  ausnehmen"). Andere `api/*`-Routen bleiben fail-closed geschützt.
- Keine hartkodierten Credentials.

### Daten & Kryptographie
- Keine Secrets/Keys im Code.
- **Keine Datenpreisgabe:** DB-Ergebnis wird verworfen; Response ist ausschließlich
  `{status:"ok", stage}` (Test erzwingt strikt via `toEqual`, dass `roles` nicht leaken).
  `stage` stammt aus `NEXT_PUBLIC_STAGE` (per Konvention public) – unkritisch.
- Keine Zufallszahlen/Krypto im Spiel.

### Dependencies
- **Keine** neuen Dependencies (nur `NextResponse` + bestehende `@/db`, `@/lib/rate-limit`).

### Error Handling & Information Disclosure
- 503-Pfad gibt dem Client nur `{status:"error"}`; der volle Fehler wird **server-seitig**
  (Vercel-Function-Logs) via `console.error` protokolliert – kein Stack-Trace / keine
  DB-Details nach außen. Korrekt.

## Kritische Findings (Blocker)
- Keine.

## Wichtige Findings
- Keine.

## Hinweise
- [ ] [DoS/Design] **Globaler Zähler ⇒ Kollateral-Throttling legitimer Health-Checks.**
  Der Rate-Limiter zählt route-global (nicht per Quelle, ADR-020). Ein Fluter kann das
  30/60s-Budget einer Function-Instanz erschöpfen, sodass ein *legitimer* Uptime-Poll in
  dasselbe Fenster fällt und `429` erhält. Abgefedert durch: 429 ≠ 503 (Uptime-Monitor
  meldet nicht fälschlich „down"), fail-open bei Cold-Start, und der einzelne Deploy-Gate-
  `curl` liegt strukturell weit unter der Schwelle (AK-5/FS-2). **Bewusster Trade-off**
  (Gate-Zuverlässigkeit vor perfektem Schutz) – kein Handlungsbedarf, hier nur dokumentiert.
- [ ] [DoS/Design] **Per-Instanz-Zustand skaliert mit Vercel-Fan-out.** Da der Zähler pro
  warmer Function-Instanz lebt, ist die effektive DB-Last `limit × Instanzzahl`. Unter
  starkem Flood skaliert Vercel horizontal → der Amplifikationsschutz schwächt sich genau
  im Lastfall ab. In ADR-020 als **Best-Effort** akzeptiert (kein geteilter Store: YAGNI,
  keine Netz-Abhängigkeit im Gate-Pfad). Reduziert die Amplifikation weiterhin deutlich
  gegenüber „kein Limit". Falls sich Neon-Free-Kosten als real erweisen: Backlog-Kandidat
  für einen geteilten Store (z. B. Upstash/Vercel KV) – **kein** Blocker für diese Task.
- [ ] [Info-Disclosure] `429`/`200` offenbart einem Angreifer die Existenz eines
  Rate-Limits. Vernachlässigbar; keine Aktion.

## Ergebnis
PASSED

Keine kritischen oder wichtigen Findings im Scope. Die verbleibenden Hinweise beschreiben
die in ADR-020 bewusst akzeptierten Grenzen des Best-Effort-Ansatzes und sind bereits
dokumentiert – kein eigenes Backlog-Issue erforderlich. Merge aus Security-Sicht **nicht
blockiert**.
