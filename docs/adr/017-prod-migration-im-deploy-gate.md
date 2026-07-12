# ADR 017: Prod-DB-Migration & Post-Deploy-Healthcheck automatisiert im Deploy-Gate

## Status
Accepted

## Date
2026-07-12

## Context
Bei der Live-Prüfung von #48 fiel eine Lücke im Deploy-Gate (`deploy-gate.yml`, ADR-015) auf:

- Das Gate bringt INT auf den Commit, **frischt die INT-DB von PRD auf** (Reset →
  anonymisieren → **migrieren** → seeden), wartet auf den INT-Build, fährt **Playwright-E2E
  gegen INT** und promotet **nur bei Grün** `main` → `production`. Vercel deployt danach den
  Prod-**Code**.
- **Aber:** `db:migrate:prd` wurde in **keinem** Workflow ausgeführt – es war laut README ein
  bewusst **manueller** Schritt. Folge: Der Prod-**Code** kann ein Schema erwarten (`roles`),
  das die Prod-**DB** noch nicht hat → Login bricht. Genau so nach dem #48-Merge geschehen:
  Code live auf Prod, DB-Migration `0002` offen.
- Zusätzlich verifizierte `post-merge-verify` (ADR-007) faktisch nichts: keine
  `FACTORY_HEALTHCHECK_URL` gesetzt (→ übersprungen), und `/api/version` berührt die DB nicht,
  würde einen Schema-Mismatch also selbst bei Konfiguration nicht erkennen. Der Job läuft zudem
  beim `main`-Push **parallel** zum Gate – zu einem Zeitpunkt, an dem Prod noch gar nicht
  promotet ist.

Der Mensch hat entschieden: Die Prod-DB-Migration **soll nicht manuell** laufen, sondern
automatisiert im Gate – die Absicherung durch das INT-Gate (Migration gegen **prod-nahe,
anonymisierte** Daten) **plus** die E2E-Tests wird als ausreichend bewertet.

## Decision

**1 – Prod-DB-Migration im Gate, nach INT-E2E-Grün, vor dem Promote.**
Neue Gate-Reihenfolge:
```
… E2E@INT grün → PRD migrieren (db:migrate:prd) + PRD seeden (db:seed:prd)
              → Promote main→production → auf PRD-Deploy warten → /api/health-Check
```
Die Migration läuft **erst**, wenn dieselbe Migration auf INT (Reset-from-PRD + anonymisiert)
sauber angewandt **und** per E2E verifiziert wurde. Schlägt `db:migrate:prd`/`db:seed:prd`
fehl, bricht das Gate ab → **kein Promote** (fail-closed: Prod-Code bleibt konsistent zum
alten Schema).

**2 – Prod-Login per Seed-Skript.**
`db:seed:prd` (`dotenv -e .env.prd -- tsx db/seed.ts`) spiegelt `db:seed:int`; das Gate stellt
so idempotent ein Prod-Login sicher (kein User-Admin-UI, konsistent mit ADR-016).

**3 – Prod-Secrets sind Pflicht (fail-closed, kein stilles Skippen).**
`PRD_DATABASE_URL`, `PRD_ADMIN_EMAIL`, `PRD_ADMIN_PASSWORD` werden im „Secrets vorhanden?"-Check
verlangt. Anders als der INT-Refresh (optional, skip-with-warning) darf die Prod-Migration
**nicht** still übersprungen werden – genau das war die Lücke.

**4 – Aussagekräftiger Healthcheck `/api/health` (DB-Read).**
Neuer Endpunkt liest die `user.roles`-Spalte (`db.select({roles}).from(users).limit(1)`) und
gibt `200 {status:"ok"}` bzw. bei DB-/Schema-Fehler `503 {status:"error"}` zurück – **ohne**
Datenpreisgabe. Das Gate wartet nach dem Promote auf `PRD /api/version == SHA` und prüft dann
`/api/health` – so wird das **tatsächlich deployte** Prod (neuer Code **+** migrierte DB)
verifiziert, nicht ein Zeitpunkt davor.

## Alternatives

- **Promote → dann migrieren:** Fenster „neuer Code + altes Schema" (Login bricht bis Migration
  durch ist). Verworfen – bei Migrationsfehler steht Prod mit neuem Code auf altem/halbem Schema.
  Migrate-first + „kein Promote bei Fehler" hält den Code-Stand konsistent.
- **Manuelle Prod-Migration beibehalten (Status quo):** sicherste Kontrolle, aber genau die
  Fehlerquelle (vergessener Schritt → Prod kaputt). Vom Menschen explizit verworfen.
- **GitHub Environment mit Required-Reviewer vor Prod-Migration:** fügt einen manuellen Gate
  wieder ein – widerspricht „soll nicht manuell". Verworfen.
- **Healthcheck nur in `post-merge-verify`:** Timing falsch (läuft parallel zum Gate, bevor Prod
  promotet ist) → prüft den alten Stand. Deshalb liegt der autoritative Healthcheck **im Gate**.

## Rationale
Das INT-Gate ist gezielt eine **prod-nahe Migrationsprobe**: INT wird von PRD geklont,
anonymisiert, migriert und per E2E getestet. Damit ist die Migration vor dem Prod-Lauf
empirisch abgesichert – die Voraussetzung, unter der die manuelle Kontrolle entfallen kann.
Fail-closed an zwei Stellen (Pflicht-Secrets, „kein Promote bei Migrationsfehler") folgt dem
Projektgrundsatz „Gates statt Vertrauen". Der DB-berührende Healthcheck schließt die konkrete
#48-Klasse (Schema-Drift) und macht CI-grün ↔ Prod-grün endlich deckungsgleich (ADR-007).

## Consequences

**Positiv:**
- Kein „Code live, DB nicht migriert"-Zustand mehr; jede migrationstragende Änderung wandert
  automatisch bis zur migrierten, per Healthcheck bestätigten Prod-Umgebung.
- `/api/health` ist wiederverwendbar (Uptime-Monitoring, `FACTORY_HEALTHCHECK_URL`).

**Negativ / Trade-offs:**
- **Neue Pflicht-Secrets** (`PRD_DATABASE_URL`, `PRD_ADMIN_EMAIL`, `PRD_ADMIN_PASSWORD`) – bis sie
  gesetzt sind, schlägt das Gate bewusst fehl (kein stiller Erfolg).
- Kurzes Fenster „alter Code + neues Schema" zwischen Migration und Vercel-Prod-Deploy –
  bei additiven Migrationen unkritisch; destruktive Migrationen (Spalte/Enum entfernen) sollten
  nach Möglichkeit **expand/contract** erfolgen. Für dieses kleine, unlaunchte Projekt akzeptabel.
- Migrationen müssen **vorwärtskompatibel/sicher** bleiben; bei Fehlschlag ist ein manueller
  Blick auf die (ggf. teilmigrierte) Prod-DB nötig – Migrationen entsprechend klein & idempotent halten.
- Prod-Login-Passwort wird bei jedem Gate-Lauf idempotent auf den Secret-Wert gesetzt (bewusst,
  bis es ein User-Admin-Feature gibt – ADR-016).
