# Spec: Rate-Limit für öffentlichen `/api/health` (Neon-Free-Amplifikation)

> Issue: #67 · Quelle: Backlog-Härtung aus `tasks/review-63.md` (Z. 39–40) und
> `tasks/security-63.md` (Z. 26–28). Kanonischer Endpunkt-Kontext: ADR-007/ADR-017.

## Kontext

`app/api/health/route.ts` ist ein **öffentlicher, unauthentifizierter** Endpunkt mit
`export const dynamic = "force-dynamic"`. Er löst pro Request genau **einen Neon-DB-Roundtrip**
aus (`db.select({ roles: users.roles }).from(users).limit(1)`). Dieser DB-Read ist Absicht:
Er erkennt **Schema-Drift** (fehlende Migration auf der `roles`-Spalte), die ein reiner
Versions-Endpunkt (`/api/version`) nicht sieht.

Auf dem **Neon-Free-Tarif** ist „1 DB-Query pro Request" eine kleine Kosten-/Compute-
Amplifikationsfläche: Wird der Endpunkt dauerhaft als Uptime-Monitor gepollt oder gezielt
geflutet, skaliert die DB-Last linear mit der Request-Zahl.

**Zwang:** Der Endpunkt **muss** unauthentifiziert bleiben – das Deploy-Gate ruft nach dem
Promote `…/api/health` ohne Session auf (`deploy-gate.yml:220`) und erwartet `200` (gesund)
bzw. `503` (DB/Schema kaputt). Diese Semantik darf sich nicht ändern.

## Scope

**Inbegriffen:**
- Ein **Rate-Limit** auf `/api/health`: Anfragen über einem Schwellwert werden **ohne
  DB-Read** bedient/abgewiesen.
- Erlaubte Anfragen behalten das heutige Verhalten: DB-Read → `200 {status:"ok",…}` bzw.
  `503 {status:"error"}` inkl. server-seitigem Logging.
- Die Schema-Drift-Erkennung (Read auf `roles`) bleibt erhalten – nur seltener ausgeführt.

**Nicht inbegriffen:**
- **Kein** Auth/Login auf dem Endpunkt (muss unauth bleiben).
- **Kein** Entfernen oder Ersetzen des DB-Reads durch `SELECT 1` (Schema-Drift-Zweck bleibt).
- **Keine** Änderung an `/api/version` oder anderen Routen.
- **Kein** app-weites Rate-Limiting-Framework – nur dieser eine Endpunkt.
- **Kein** serverseitiges Response-Caching (`s-maxage`) – die gewählte Schutzart ist
  Rate-Limit, nicht Caching (bewusste Entscheidung, siehe #67).
- Keine neue externe Monitoring-/Alerting-Infrastruktur.

## Akzeptanzkriterien

- [ ] **AK-1 (Normalfall unverändert):** GIVEN die Request-Rate liegt unter dem Schwellwert
  WHEN `GET /api/health` aufgerufen wird und die DB erreichbar ist und das Schema stimmt
  THEN wird der DB-Read ausgeführt und die Antwort ist `200` mit Body `{status:"ok", stage:…}`
  (identisch zu heute, keine DB-Daten im Body).

- [ ] **AK-2 (Fehler unverändert):** GIVEN die Request-Rate liegt unter dem Schwellwert
  WHEN `GET /api/health` aufgerufen wird und der DB-Read fehlschlägt
  THEN ist die Antwort `503` mit Body `{status:"error"}` und der Fehler wird server-seitig
  geloggt (`console.error`).

- [ ] **AK-3 (Deckelung der DB-Last):** GIVEN N Anfragen innerhalb eines Rate-Fensters mit
  N deutlich über dem Schwellwert WHEN alle N gegen `/api/health` laufen THEN ist die Anzahl
  ausgeführter DB-Reads ≤ Schwellwert pro Fenster (nicht N) – d. h. die DB-Last ist von der
  Request-Zahl entkoppelt.

- [ ] **AK-4 (Throttle-Antwort ohne DB):** GIVEN der Schwellwert im aktuellen Fenster ist
  erreicht WHEN eine weitere Anfrage eintrifft THEN wird sie **ohne DB-Read** beantwortet
  (deterministischer Throttle-Status, z. B. `429`); es entsteht kein Neon-Roundtrip.

- [ ] **AK-5 (Gate bleibt grün):** GIVEN das Deploy-Gate führt nach dem Promote seinen
  einzelnen Healthcheck aus WHEN es `GET …/api/health` aufruft THEN wird diese Anfrage nicht
  gedrosselt (liegt unter dem Schwellwert) und erhält eine **live** ermittelte Antwort
  (`200`/`503`) aus dem DB-Read – kein gedrosselter/veralteter Status.

- [ ] **AK-6 (Schema-Drift wird weiter erkannt):** GIVEN eine nicht angewandte Migration
  (z. B. fehlende `roles`-Spalte) WHEN das Gate seinen post-promote Healthcheck ausführt
  THEN schlägt der DB-Read fehl und der Endpunkt liefert `503` (Drift wird sichtbar, wie heute).

## Fehlerszenarien

- [ ] **FS-1 (Limiter-Zustand nicht verfügbar):** Kann der Zähl-Zustand nicht ermittelt werden
  (Cold-Start, Store nicht erreichbar), darf der Limiter einen **legitimen Healthcheck nicht
  blockieren**. Priorität: Gate-Zuverlässigkeit vor Amplifikationsschutz → im Zweifel
  **fail-open** (Anfrage durchlassen, DB-Read ausführen), Schutzgrad degradiert bewusst.
  *(Endgültige fail-open/fail-closed-Wahl gehört in die ADR – siehe offene Fragen.)*

- [ ] **FS-2 (Kein Gate-Lockout):** Das Rate-Limit darf nicht dazu führen, dass ein Angreifer
  durch Fluten den **legitimen** Gate-Healthcheck aussperrt (globaler Zähler erschöpft →
  Gate bekommt fälschlich `429` → Gate schlägt fehl). Der Entwurf muss diesen Fall vermeiden
  (z. B. per-Quelle-Zählung oder ausreichend hoher Schwellwert + fail-open).

- [ ] **FS-3 (Antwortzeit):** Der Throttle-Pfad darf keine langsameren Antworten erzeugen als
  der DB-Pfad (Throttle = billiger, nicht teurer).

## Offene Fragen

- [ ] **Zustands-Sharing über Serverless-Instanzen:** In-Memory-Zähler pro Function-Instanz
  reichen für keine harte Garantie (jede Vercel-Instanz/Cold-Start zählt eigen). Braucht es
  einen geteilten Store (z. B. Vercel KV/Upstash) oder genügt eine **Best-Effort**-Deckelung
  pro Instanz? → **Architektur-Entscheidung (ADR)**, inkl. Kosten/Abhängigkeits-Abwägung
  (YAGNI vs. harte Garantie für ein unlaunchtes Vereinsprojekt).
- [ ] **Zähl-Dimension:** global vs. per-Quelle (IP/Header – spoofbar) vs. per-Route-Kappe? →
  ADR (hängt mit FS-2 zusammen).
- [ ] **Parameter:** Fenstergröße, Schwellwert, Throttle-Statuscode – konkrete Werte legt die
  Architektur/Implementierung fest (Default-Vorschlag: großzügig genug, dass Uptime-Poll im
  Minutentakt und der Gate-Check nie gedrosselt werden).
- [ ] **fail-open vs. fail-closed** bei Limiter-Störung (FS-1): endgültig in der ADR festlegen.
