# Test-Coverage: Task 63

## Coverage (vitest `pnpm test:coverage`, Schwelle 80 %)

| Metrik      | Wert    | Schwelle | Status |
|-------------|---------|----------|--------|
| Statements  | 87.5 %  | 80 %     | ✅ |
| Branches    | 88.88 % | 80 %     | ✅ |
| Functions   | 70.58 % | 80 %     | ⚠️ siehe unten |
| Lines       | 88.63 % | 80 %     | ✅ |

25 Tests in 7 Dateien grün.

**Zur Functions-Kennzahl (70.58 %):** Sie liegt nur deshalb unter 80 %, weil `/api/health`
neu `users` aus `db/schema.ts` importiert und damit `schema.ts` **erstmals** in den
Coverage-Satz zieht. Ungedeckt ist dort ausschließlich die Schema-Definitions-Glue
(`$defaultFn(() => crypto.randomUUID())` u. Ä.) – **keine** Business-Logik. Laut
`testing-standards.md` sind „Konfigurationsklassen ohne Logik" bewusst **nicht** zu testen;
ein Test dafür wäre ein sinnloser 100%-Coverage-Test. Die einzige **neue testbare Logik**
dieser Task (`app/api/health/route.ts`) ist über beide Pfade voll abgedeckt.

## Akzeptanzkriterium → Test-Nachweis

| AC (task-63) | Nachweis |
|---|---|
| AC1 PRD-DB automatisch migriert (vor Promote) | `deploy-gate.yml` Step „PRD-DB migrieren + Login seeden" **vor** „Promote"; Reihenfolge im Review verifiziert. CI-verifiziert beim nächsten `main`-Deploy. |
| AC2 Migration rot → kein Promote | Step-Reihenfolge + GitHub-Actions-Semantik (Fehler stoppt Folge-Steps); im Review bestätigt. |
| AC3 Fehlende Prod-Secrets → Abbruch | „Secrets vorhanden?"-Check (`exit 1`) für `PRD_*` **und** `NEON_*`/`INT_DATABASE_URL`. |
| AC4 Prod-Login geseedet | `db:seed:prd` (package.json) im Gate; `seed.ts` idempotent. |
| AC5 `/api/health`-Check nach Deploy | Gate-Step „Auf PRD-Deployment warten + Healthcheck"; `/api/health` seit Fix aus dem Auth-Proxy ausgenommen (proxy.ts). |
| AC6 `/api/health` 200 ok / 503 error, kein Leak | `app/api/health/route.test.ts` (beide Pfade, `toEqual` verriegelt gegen Daten-Leak, 503-Logging geprüft). |

## Nicht unit-testbar (bewusst)

- **`deploy-gate.yml`** (Shell/CI): wird durch den echten Gate-Lauf beim nächsten `main`-Deploy
  verifiziert; die Factory testet keine Projekt-Workflows (nur `factory-self-test` prüft die
  Factory-Skripte). Logik im Review/Security gegengeprüft.
- **`/api/health` end-to-end hinter dem Proxy:** vom Gate-Healthcheck selbst gegen Prod exerziert
  (der genau der im Review gefundene 307-Bug war → jetzt gefixt).
