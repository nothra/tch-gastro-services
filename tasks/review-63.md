# Review: Task 63

> Multi-Persona-Review (Logik/Shell · Code-Qualität · Architektur) über `git diff origin/main...HEAD`.
> Erste Runde: **NEEDS_REWORK** (1 kritischer Bug + 2 wichtige Punkte). Alle im selben Zyklus
> behoben → Endstand **APPROVED**. Findings unten mit Status.

## Kritische Findings (müssen behoben werden)

- [x] **[proxy.ts ↔ deploy-gate.yml] `/api/health` lag hinter dem Auth-Proxy → Healthcheck bekäme
      nie 200.** Der Matcher nahm nur `api/auth`/`api/version` aus; `/api/health` wäre auf `/login`
      umgeleitet worden (307), der Gate-`curl` (ohne `-L`) hätte 307 gesehen, der DB-Read wäre nie
      gelaufen → das Kern-Feature (Schema-Drift erkennen) war funktionslos, das Gate bei jedem Lauf
      rot **nach** dem Promote. Der Unit-Test verdeckte es (ruft `GET()` direkt). **BEHOBEN:**
      `api/health` in die Proxy-Ausnahmeliste aufgenommen (analog `api/version`).

## Wichtige Findings (sollten behoben werden)

- [x] **[deploy-gate.yml] Sicherheits-Rationale hing an einem optionalen Schritt.** `db:migrate:int`
      lief nur bei gesetzten Neon-Refresh-Secrets (`if: refresh.enabled`), `db:migrate:prd` aber
      unbedingt. Fehlten die Neon-Secrets, wäre PRD **ohne** die von ADR-017 vorausgesetzte INT-Vorstufe
      migriert worden – dieselbe stille Lücke, die die Task schließen will. **BEHOBEN:** `NEON_*` +
      `INT_DATABASE_URL` in den Pflicht-Secrets-Check aufgenommen (fail-closed); ADR-017 & README
      dokumentieren die Kopplung (INT-Refresh von optional → Pflicht, solange PRD auto-migriert wird).
- [x] **[app/api/health/route.ts] Leerer Catch verwarf den Fehler** (keine Observability; verstößt
      gegen „niemals leere Catch-Blöcke"). **BEHOBEN:** `console.error(...)` server-seitig (Client
      erhält weiter nur `{status:"error"}`).
- [x] **[route.test.ts] `toMatchObject` (partiell) hätte ein Daten-Leak der `roles` nicht bemerkt.**
      **BEHOBEN:** strikt auf `toEqual({status:"ok", stage:"dev"})` umgestellt; 503-Pfad prüft zusätzlich
      das Logging.

## Nitpicks (optional)

- [x] **[deploy-gate.yml] `.env.prd`-Cleanup nur am Happy-Path** (enthält Prod-DB-URL + Passwort) →
      **behoben** via `trap 'rm -f .env.prd' EXIT`.
- [x] **[deploy-gate.yml] curl-Hard-Fail verschluckte die Diagnose-Meldung** → **behoben** via
      `|| true` + `${code:-000}`-Fallback.
- [ ] **[deploy-gate.yml] Dritte Kopie des `printf … > .env`-Blocks + Wait-Loop-Variante.** Für die
      Projektgröße vertretbar; bei weiterem Wachstum in ein Shell-Skript/Composite-Action ziehen. (offen, bewusst)
- [ ] **[app/api/health] Öffentlicher, unauth. DB-Read** ohne Rate-Limit – auf Neon-Free eine kleine
      Amplifikationsfläche, falls der Endpunkt dauerhaft als Uptime-Monitor gepollt wird. (offen, YAGNI)
- [ ] **[factory-ci.yml/README] Hinweis** ergänzen, `FACTORY_HEALTHCHECK_URL` **nicht** auf
      `/api/health` zu zeigen (post-merge-verify läuft parallel, vor dem Promote → Fehlalarm). (offen, Backlog)

## Positives

- **Fail-closed-Reihenfolge korrekt:** rotes INT-E2E überspringt Migrate/Promote/Healthcheck; der
  `if: failure()`-Report-Step dazwischen setzt den Status nicht zurück.
- **Migrate-vor-Promote** stimmig, in ADR-017 mit Alternativen begründet; „kein Promote bei Fehler".
- **`/api/health`** nutzt die Drizzle-Data-Layer (kein roher SQL), verwirft das Ergebnis (kein Leak),
  `force-dynamic` korrekt; Read auf `roles` erkennt Schema-Drift auch bei leerer Tabelle.
- **`db:seed:prd`** spiegelt `db:seed:int` exakt; `seed.ts` idempotent. Doku (ADR/README/.env.example)
  konsistent auf „automatisiert" umgestellt, kein widersprüchlicher Rest.

## Empfehlung

APPROVED

> Nach Rework: der kritische Proxy-Bug ist behoben (Healthcheck erreicht die Route jetzt), die
> Sicherheitskopplung INT→PRD ist fail-closed erzwungen und dokumentiert, Observability und
> Test-Strenge nachgezogen. Gates grün (25 Tests, lint, tsc, build, format, YAML). Drei offene
> Nitpicks sind bewusst nicht-blockierend (YAGNI/Backlog).
