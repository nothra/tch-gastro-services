# Security Review: Task 63 (Deploy-Gate: PRD-Auto-Migration + /api/health)

> OWASP-Pass über `git diff origin/main...HEAD`. Threat Surface: kleine, nicht-kommerzielle
> Vereins-PWA, **privates** Repo, Vercel + Neon EU. Trigger des Gates: `on: push: [main]`.

## Kritische Findings (Blocker)

- _Keine._

## Wichtige Findings

- _Keine, die unter dem tatsächlichen Trigger-Modell blockieren._ Der Angriffsvektor
  „PR exfiltriert Prod-Secrets / löst Prod-Migration aus" ist durch `push: main` (kein
  `pull_request`) + ephemeren Runner + privates Repo praktisch geschlossen.

## Hinweise

- [x] **[deploy-gate.yml] `.env.int`-Cleanup nur am Happy-Path (Asymmetrie zum `.env.prd`-trap).**
      **BEHOBEN:** `trap 'rm -f .env.int' EXIT` ergänzt – räumt die Credential-Datei auch bei
      Fehler auf, konsistent zum PRD-Step.
- [ ] **[deploy-gate.yml „Secrets vorhanden?"] Secrets inline `[ -n "${{ secrets.X }}" ]` statt über
      `env:`.** Ein Secret mit `"`/Backtick könnte aus dem Test-String ausbrechen (Actions-Script-
      Injection-Muster). **Bewusst akzeptiert:** Werte sind Repo-Owner-gesetzt (nicht PR-/angreifer-
      kontrolliert), Trigger nur `push: main`, und der Worst Case ist ein **fail-closed** „Secret fehlt".
      Folgt dem bestehenden Muster des Steps. Backlog: bei Gelegenheit auf `env:`-Variablen heben.
- [ ] **[app/api/health] Öffentlicher, unauth. DB-Read ohne Rate-Limit** → kleine Amplifikations-
      fläche gegen Neon-Free bei Dauerbeschuss. **YAGNI** für das unlaunchte Projekt; muss unauth
      bleiben (CI-Healthcheck). Backlog: leichtes Caching/Throttling, falls dauerhaft gepollt.
- [ ] **[deploy-gate.yml] `playwright-report`-Artefakt** kann Login-Traces des E2E-Admins enthalten
      (Retention 7 Tage). **Vorbestehend** (nicht durch diesen Diff eingeführt); privates Repo +
      kurze Retention mildern. Backlog: Trace/Screenshot-Maskierung.

## Positives (belegt)

- **Trigger fail-safe:** `on: push: [main]` (kein `pull_request`) → Fork-/PR-Läufe erhalten die
  Prod-Secrets nie und können weder Prod-Migration noch Promote auslösen.
- **Fail-closed-Kette:** PRD-Migration/-Seed laufen **vor** dem Promote; Fehler → kein Promote.
  INT→PRD-Kopplung hart erzwungen (`NEON_*`/`INT_DATABASE_URL` im Pflicht-Check) – schließt die
  stille Lücke „PRD-Migration ohne bewiesene INT-Vorstufe".
- **Least-Privilege:** `permissions: contents: write`; Promote-Push **ohne** `--force`, mit
  `fetch-depth: 0` (echter FF-Guard, Learning aus Task 42). `--force` nur auf Wegwerf-Ref `int`.
- **Kein Secret-Leak:** printf → gitignorte Datei (`.env*`), kein stdout/`set -x`; Wait-Loops
  echoen nur den SHA; GitHub maskiert registrierte Secrets. `.env.prd`/`.env.int` per trap gelöscht.
- **`/api/health` ohne Datenpreisgabe:** Drizzle-Data-Layer (kein Roh-SQL), Ergebnis verworfen,
  Fehler nur server-seitig geloggt, Client bekommt `{status:"error"}`; Test verriegelt via `toEqual`
  gegen Rollen-Leak. `proxy.ts`-Ausnahme eng gefasst (nur `api/health`, analog `api/version`).
- **Keine Injection:** URLs hartkodierte Env-Konstanten, `$SHA` aus `github.sha` (Hex), Variablen gequotet.

## Ergebnis

PASSED

> Keine Blocker/wichtigen Findings. Ein Härtungs-Hinweis (`.env.int`-trap) direkt behoben; drei
> weitere bewusst als Defense-in-Depth/Backlog akzeptiert (owner-gesetzte Secrets + fail-closed,
> Rate-Limit YAGNI, vorbestehendes Artefakt).
