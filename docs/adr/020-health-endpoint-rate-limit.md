# ADR 020: Rate-Limit für den öffentlichen `/api/health`-Endpunkt

## Status
Accepted

## Date
2026-07-13

## Context

`app/api/health/route.ts` ist ein **öffentlicher, unauthentifizierter** Endpunkt
(`export const dynamic = "force-dynamic"`). Er löst pro Request genau **einen Neon-DB-Roundtrip**
aus (`db.select({ roles: users.roles }).from(users).limit(1)`). Der Read ist Absicht: Er erkennt
**Schema-Drift** (nicht angewandte Migration auf der `roles`-Spalte), die ein reiner
Versions-Endpunkt nicht sieht (ADR-017).

Auf dem **Neon-Free-Tarif** ist „1 DB-Query pro Request" eine Amplifikationsfläche: Dauerhaftes
Uptime-Polling oder gezieltes Fluten skaliert die DB-Last linear mit der Request-Zahl. Task #67
will diese Last **deckeln**, ohne die Semantik zu ändern.

**Harte Randbedingungen:**
- Der Endpunkt **muss** unauthentifiziert bleiben. Das Deploy-Gate ruft nach dem Promote
  **genau einmal** `curl --max-time 15 "$PRD_URL/api/health"` auf und erwartet `200` (gesund)
  bzw. `503` (DB/Schema kaputt) (`deploy-gate.yml`, ADR-017). Ein einzelner Request pro Deploy
  darf **nie** gedrosselt werden.
- Laufzeit: Next.js App Router auf **Vercel Serverless Functions** (Node, Region fra1). Die Route
  ist **kein** Edge-Handler (sie nutzt den Neon-HTTP-Treiber + Drizzle) – Modul-Zustand einer
  **warmen** Instanz bleibt über Invocations hinweg erhalten; jede Instanz/jeder Cold-Start zählt
  eigen.

Vier Fragen sind zu entscheiden (Spec „Offene Fragen"): **(1)** State-Store, **(2)** Zähl-Dimension,
**(3)** Parameter, **(4)** fail-open vs. fail-closed.

## Decision

1. **State-Store: Best-Effort In-Memory-Zähler pro Function-Instanz** (Modul-Level-State),
   **kein** geteilter Store.
2. **Zähl-Dimension: globale Route-Kappe** (ein Zähler für alle `/api/health`-Requests),
   **nicht** per-Quelle.
3. **Parameter (Default): Fixed-Window `60 s`, Schwellwert `30` erlaubte Reads/Fenster,
   Throttle-Status `429`** mit Body `{ status: "throttled" }`.
4. **Störungsverhalten: fail-open** – kann der Zähl-Zustand nicht ermittelt werden, wird die
   Anfrage durchgelassen (DB-Read läuft), der Schutzgrad degradiert bewusst.

Die Logik lebt als kleines, framework-unabhängiges, testbares Modul (`lib/rate-limit.ts`) mit
**injizierbarer Uhr** und **injizierbaren Parametern** (Details in der Task-Datei). Die Route
hält eine dünne, mit `Date.now` konfigurierte Singleton-Instanz.

## Alternatives

### Frage 1 – State-Store

**Option A: Best-Effort In-Memory pro Instanz (empfohlen)**
- **Pro:** Keine neue Abhängigkeit, keine Kosten, keine Secrets. Reine lokale Arithmetik → **kein
  I/O** im Throttle-Pfad (erfüllt FS-3 zwangsläufig: Throttle immer billiger als ein DB-Read).
  Cold-Start = frischer Zähler = Anfrage erlaubt → **inhärent fail-open** (deckt FS-1 strukturell).
- **Contra:** Keine **harte** instanzübergreifende Garantie. Bei M warmen Instanzen ist die
  aggregierte DB-Last ≤ `Schwellwert × M` pro Fenster, nicht ≤ `Schwellwert`. AK-3 gilt damit
  **pro Instanz** streng, cross-instance nur best-effort.

**Option B: Geteilter Store (Vercel KV / Upstash Redis)**
- **Pro:** Harte, instanzübergreifende Deckelung → AK-3 global exakt.
- **Contra:** Neue **kostenpflichtige** Abhängigkeit + Secrets + Betriebskomplexität. Fügt **jedem**
  Request (auch dem Throttle-Pfad) einen **Netz-Roundtrip** hinzu → gefährdet FS-3 und schafft eine
  neue Fehlerquelle genau im Pfad, der den Gate-Healthcheck schützen soll. Für ein **noch nicht
  gelauntes** Vereinsprojekt ohne realistischen Angreifer klarer YAGNI-Verstoß.

### Frage 2 – Zähl-Dimension

**Option A: Globale Route-Kappe (empfohlen)**
- **Pro:** Einfachster Zustand (ein Zähler + ein Fenster-Start). Deckelt die DB-Amplifikation
  unabhängig von der Quelle. Kein unbegrenztes Wachstum von Zustand.
- **Contra:** Ein Flood im selben Fenster kann theoretisch den Gate-Request mitzählen (FS-2).
  Wird durch **großzügigen Schwellwert + fail-open** entschärft (Spec nennt genau diese Kombination
  als zulässig) – und der einzelne Gate-Request liegt praktisch immer unter dem Schwellwert.

**Option B: Per-Quelle (IP / `X-Forwarded-For`)**
- **Pro:** Ein einzelner Flooder sperrt andere Quellen (inkl. Gate) nicht aus.
- **Contra:** `X-Forwarded-For` ist **spoofbar** → ein Angreifer rotiert Header/IPs und bekommt je
  „Quelle" ein frisches Budget → Schutz läuft leer. Ein Map-Zustand pro Quelle wächst unbegrenzt
  (neue Amplifikations-/Memory-Fläche). Zuviel Mechanik für den Zweck.

**Option C: Kein Limit, stattdessen `s-maxage`-Caching**
- Durch die Spec **ausgeschlossen** (Schutzart ist bewusst Rate-Limit, nicht Caching); zudem würde
  Caching AK-5 verletzen (Gate braucht eine **live** ermittelte Antwort, keinen Cache-Treffer).

### Frage 3 – Parameter

**Option A: Fenster `60 s`, Schwellwert `30`, Status `429` (empfohlen)**
- **Pro:** Riesiger Puffer für legitime Nutzung: ein Uptime-Poll selbst im 10-s-Takt (6/min) plus
  der einzelne Gate-Check plus manuelle Checks bleiben weit unter 30/min (AK-5, FS-2). Gleichzeitig
  wird die Flood-DB-Last auf ≤ 30 Reads/min/Instanz gedeckelt (AK-3, AK-4). `429 Too Many Requests`
  ist der semantisch korrekte, deterministische Throttle-Status und **≠ `200`/`503`**, kollidiert
  also nicht mit der Gate-Erwartung.
- **Contra:** Ein 1-s-Uptime-Poll (60/min) würde gedrosselt – für dieses Projekt unrealistisch und
  bewusst nicht unterstützt. Werte sind per Env/Optionen justierbar, falls nötig.

**Option B: Engeres Fenster/kleinerer Schwellwert (z. B. `10/min`)**
- **Pro:** Stärkere Deckelung.
- **Contra:** Höheres Risiko, legitime Poller/Multi-Region-Monitore zu drosseln (verletzt eher AK-5).
  Der Nutzen ist marginal (Neon-Free verträgt 30/min problemlos).

### Frage 4 – Störungsverhalten

**Option A: fail-open (empfohlen)**
- **Pro:** Worst Case = ein DB-Read läuft trotzdem → **Status quo von heute, keine Regression**.
  Priorisiert Gate-Zuverlässigkeit über Amplifikationsschutz (Spec-Vorgabe FS-1). Mit In-Memory
  ist fail-open zudem der **natürliche** Cold-Start-Zustand.
- **Contra:** Bei Limiter-Störung ist der Amplifikationsschutz temporär aus. Akzeptiert.

**Option B: fail-closed**
- **Pro:** Schutz bleibt auch bei Störung erhalten.
- **Contra:** Worst Case = legitimer Gate-/Health-Check wird fälschlich mit `429` blockiert →
  **falscher Deploy-Fehlschlag** (FS-2/AK-5 verletzt). Schlimmer als das Problem, das gelöst wird.
  Verworfen.

## Rationale

**YAGNI + Reversibilität** sind ausschlaggebend. Der zu schützende Wert ist gering (Neon-Free-Compute
eines unlaunchten Vereinsprojekts), ein realer Angreifer praktisch nicht vorhanden – die Härtung ist
**vorsorglich**. Eine In-Memory-Best-Effort-Deckelung senkt die Amplifikation um Größenordnungen,
ohne eine kostenpflichtige Abhängigkeit, neue Secrets oder eine neue Fehlerquelle in den kritischen
Gate-Pfad einzuführen. Die Entscheidung ist **vollständig reversibel**: Sollte das Projekt wachsen
oder ein harter Cross-Instance-Cap nötig werden, lässt sich hinter der `lib/rate-limit.ts`-Schnittstelle
ein geteilter Store (Option 1B) nachrüsten, ohne die Route zu ändern.

Alle Kriterien bleiben erfüllt: **AK-1/AK-2** (erlaubte Requests unverändert), **AK-3/AK-4**
(DB-Reads pro Instanz ≤ Schwellwert, Throttle ohne DB-Read), **AK-5** (einzelner Gate-Request nie
gedrosselt), **AK-6** (Schema-Drift-Read bleibt erhalten), **FS-1** (fail-open), **FS-2**
(hoher Schwellwert + fail-open), **FS-3** (In-Memory-Check ohne I/O ist immer billiger als der DB-Read).

## Consequences

**Positiv:**
- Kein neuer Fremd-Service, keine Kosten, keine Secrets; der kritische Gate-Pfad bekommt keine neue
  Netz-Abhängigkeit.
- Die Rate-Limit-Logik ist ein isoliertes, deterministisch testbares Modul (injizierbare Uhr +
  Parameter) – kein echter Timer, keine echte DB im Test nötig.
- Die Schnittstelle kapselt die Store-Wahl → späterer Wechsel auf einen geteilten Store ist ein
  lokaler, reversibler Eingriff.

**Negativ / Trade-offs:**
- **Keine harte instanzübergreifende Garantie.** AK-3 gilt streng nur pro Instanz; bei M warmen
  Instanzen ist die aggregierte DB-Last ≤ `Schwellwert × M`/Fenster. Für die erwartete Last
  akzeptiert (bewusster YAGNI-Trade-off gegenüber Option 1B).
- Der Zähler lebt nur auf **warmen** Instanzen; Cold-Starts setzen ihn zurück (was fail-open und
  damit die Gate-Zuverlässigkeit gerade stützt).
- Ein extrem aggressiver 1-s-Uptime-Poll würde gedrosselt – bewusst nicht unterstützt; Parameter
  sind justierbar.
- Der In-Memory-Ansatz setzt voraus, dass die Route auf der **Node**-Serverless-Runtime läuft
  (nicht Edge) und `dynamic = "force-dynamic"` bleibt (kein Caching, das den Zähl-Pfad umginge).
