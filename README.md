# TCH Gastro Services

Maßgeschneiderte, **nicht-kommerzielle** Web-App für die Gastronomie-Vorgänge des
**Tennisclub Heuchelheim (TCH)**. Sie läuft als **installierbare PWA** im Browser und
auf privaten iOS-/Android-Geräten und ermöglicht die schnelle, einfache Erfassung
alltäglicher Vorgänge – mit rollenbasiertem Zugriff.

> Status: frühe Aufbauphase. Grundgerüst, Persistenz und Login stehen; fachliche
> Erfassungs-Features folgen.

---

## Betriebsumgebung

| Ebene | Technologie |
|-------|-------------|
| **Hosting** | [Vercel](https://vercel.com) (Hobby, nicht-kommerziell), Function-Region **Frankfurt `fra1`** |
| **App** | [Next.js](https://nextjs.org) (App Router) · React · **TypeScript** |
| **Client** | **PWA** (installierbar, iOS + Android) · Tailwind CSS |
| **Datenbank** | **PostgreSQL** – lokal (Docker) in DEV, [Neon](https://neon.com) (EU/Frankfurt) in INT/PRD |
| **DB-Zugriff** | [Drizzle ORM](https://orm.drizzle.team) – `node-postgres` lokal, Neon serverless HTTP auf Vercel |
| **Auth** | [Auth.js / NextAuth v5](https://authjs.dev) – E-Mail+Passwort (bcrypt, JWT), Rollen (RBAC) |
| **Paketmanager** | pnpm · Node ≥ 20 |

Produktivdaten in der EU (Neon Frankfurt + Vercel `fra1`). Alle Bausteine sind im
Vereinsbetrieb kostenfrei. Hintergrund: [ADR-014](docs/adr/014-tech-stack-selection.md).

---

## Umgebungen (Stages)

Drei getrennte Stages, gesteuert über `NEXT_PUBLIC_STAGE` (`dev` | `int` | `prd`):

| Stage | Zweck | Hosting | Datenbank |
|-------|-------|---------|-----------|
| **DEV** | lokale Entwicklung | lokal (`pnpm dev`) | **lokale** Postgres (Docker) auf dem Dev-System |
| **INT** | Integrationstests, Migrations-Proben mit produktionsnahen Daten | Vercel, Branch **`int`** (Preview) | **Neon-Branch von PRD** (CoW-Klon, anonymisiert) |
| **PRD** | Produktion | Vercel, Branch **`main`** (Production) | Neon-Produktions-DB |

**Sichtbare Unterscheidung:** DEV und INT zeigen ein **farbiges Banner** (DEV grau, INT orange),
ein **stage-eingefärbtes Icon** (Homescreen/Tab) und ein `[DEV]`/`[INT]`-Titel-Suffix. **PRD** hat
**kein** Banner und das TCH-Standard-Icon (teal) – so ist Produktion nie mit den anderen zu verwechseln.

### DEV – lokale Entwicklung

**Voraussetzungen:** Node ≥ 20, [pnpm](https://pnpm.io) (`npm i -g pnpm`), Docker mit **Docker Compose v2** (`docker compose`).

```bash
pnpm install
cp .env.example .env.local          # NEXT_PUBLIC_STAGE=dev, lokale DATABASE_URL, AUTH_SECRET, SEED_ADMIN_*
pnpm db:up                          # lokale Postgres 18 via Docker Compose v2 (docker-compose.yml)
pnpm db:migrate                     # Schema anlegen (nutzt .env.local)
pnpm db:seed                        # ersten Admin anlegen
pnpm dev                            # http://localhost:3000 → Login → Startseite (mit DEV-Banner)
```

`.env.local` (DEV):
```
NEXT_PUBLIC_STAGE=dev
DATABASE_URL=postgresql://tch:tch@localhost:5432/tch_dev
AUTH_SECRET=<openssl rand -base64 32>
SEED_ADMIN_EMAIL=... / SEED_ADMIN_PASSWORD=...
```

### INT – Integrationsumgebung

Zweck: **DB-Migrationen verlässlich testen**, bevor sie auf PRD laufen – mit produktionsnahen Daten.

INT nutzt einen **Neon-Branch der Produktions-DB**: ein Copy-on-Write-Klon, der die
Produktionsdaten sekundenschnell und ohne Dump/Restore bereitstellt. Der Branch enthält
zunächst **echte personenbezogene Daten** → **direkt nach dem Abzweigen anonymisieren** (DSGVO).

**Einrichtung:**
1. In **Neon**: Branch **`int`** von der Produktions-Branch erstellen (Region Frankfurt) → dessen **Pooled**-Connection-String.
2. **Branch `int`** existiert im Repo → Vercel deployt ihn als Preview.
3. **Vercel-Env-Variablen** branch-spezifisch für `int` (Scope *Preview*, Git-Branch `int`):
   `NEXT_PUBLIC_STAGE=int`, `DATABASE_URL=<INT-Neon-Branch-Pooled>`, `AUTH_SECRET=<int-secret>`.
4. Lokal `.env.int` anlegen (`NEXT_PUBLIC_STAGE=int`, `DATABASE_URL=<INT-Branch>`, `SEED_ADMIN_*`).

**Automatisch bei jedem INT-Deploy (ADR-015):** Das Deploy-Gate frischt INT bei jedem
`main`-Push selbst auf – **Reset von PRD → anonymisieren → migrieren → Admin seeden** – bevor
die E2E laufen. Voraussetzung sind die Neon-Secrets (siehe [Deploy-Gate](#deploy-gate-e2e-vor-production)).
Fehlen sie, wird der Refresh mit Warnung übersprungen (kein Reset = keine neue PII).

**Manueller Refresh-/Testfluss** (lokal, identische Schritte):
```bash
# (Neon: int-Branch von PRD zurücksetzen = frische Prod-Daten; CI nutzt scripts/neon-reset-int.sh)
pnpm db:anonymize:int    # Namen/E-Mails überschreiben, Prod-Passwörter entwerten (Guard: nur STAGE=int)
pnpm db:migrate:int      # ausstehende Migrationen auf INT testen (vor PRD)
pnpm db:seed:int         # bekannten INT-Admin (SEED_ADMIN_*) setzen
```

> `db:anonymize:int` bricht ab, wenn `NEXT_PUBLIC_STAGE` nicht `int` ist – Schutz vor
> versehentlichem Ausführen gegen DEV/PRD.

**Oberflächentests (E2E) gegen INT – Vercel-Bypass einrichten**

Die INT-Preview ist durch **Vercel Deployment Protection** (SSO) geschützt: jeder Request
wird auf `vercel.com/sso-api` umgeleitet. Automatisierte Oberflächentests kommen nur mit
einem **Protection-Bypass-Secret** durch (der Schutz für menschliche Zugriffe bleibt aktiv).

1. In **Vercel** → Projekt → **Settings → Deployment Protection** → **„Protection Bypass for
   Automation"** aktivieren und ein **Secret** erzeugen (kopieren).
   *(Alternativ – offener – „Vercel Authentication" für Preview deaktivieren.)*
2. Secret lokal in `.env.int` hinterlegen (gitignored, nie committen):
   ```
   VERCEL_AUTOMATION_BYPASS_SECRET=<secret-aus-vercel>
   ```
3. **INT-Testnutzer** sicherstellen: `pnpm db:seed:int` (legt den `SEED_ADMIN_*`-Login in der INT-DB an).
4. Die E2E-Tests senden das Secret als HTTP-Header an jede Anfrage und melden sich mit dem INT-Admin an:
   ```
   x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>
   ```
   Ziel-URL (INT): `https://tch-gastro-services-git-int-tch-developers.vercel.app`.
5. Ausführen: **`pnpm test:e2e:int`** (nutzt `.env.int`: Bypass-Header + INT-Admin-Login).

> Ohne gültiges Bypass-Secret liefern alle INT-Routen (auch `/login`) die Vercel-SSO-Seite –
> Tests würden dann nicht die App, sondern Vercels Login sehen.

### PRD – Produktion

- Branch **`production`** → Vercel **Production**. Prod wird **nur über das Deploy-Gate** aktualisiert (nicht direkt bei `main`-Merge).
- **Vercel-Env** (Scope *Production*): `NEXT_PUBLIC_STAGE=prd`, `DATABASE_URL=<PRD-Neon-Pooled>`, `AUTH_SECRET=<prd-secret>`.
- **Migrationen laufen automatisch im Gate** (`pnpm db:migrate:prd`, ADR-017) – erst **nachdem** dieselbe Migration auf INT (Reset-from-PRD → anonymisiert → migriert → E2E) grün war, und **vor** dem Promote (fail-closed: Migration rot → kein Promote). `.env.prd` ist nur noch für **manuelle** Sonderfälle (Hotfix/Reparatur) gedacht.

### Deploy-Gate (E2E vor Production)

`.github/workflows/deploy-gate.yml` entkoppelt Prod vom `main`-Push:

**Push auf `main` → INT auf den Commit bringen → INT-DB von PRD auffrischen (Reset → anonymisieren →
migrieren → seed) → auf INT-Build warten (`/api/version` == Commit) → Playwright-E2E gegen INT →
nur bei Grün: PRD-DB migrieren + seeden → `main` → `production` → Vercel deployt Prod →
auf PRD-Build warten → `/api/health`-Check (DB-Read).**

- Pflicht-**Secrets** (Gate): `VERCEL_AUTOMATION_BYPASS_SECRET`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`,
  **`PRD_DATABASE_URL`**, **`PRD_ADMIN_EMAIL`**, **`PRD_ADMIN_PASSWORD`** (Prod-Migration + -Seed, ADR-017).
  `PRD_DATABASE_URL` ist der Prod-Neon-Connection-String; `PRD_ADMIN_*` das Prod-Login (idempotent geseedet).
  Fehlt eines davon, bricht das Gate **fail-closed** ab – die Prod-Migration wird **nie still übersprungen.**
- **INT-Refresh-Secrets** `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_INT_BRANCH_ID`, `NEON_PRD_BRANCH_ID`,
  `INT_DATABASE_URL`. Seit ADR-017 **ebenfalls Pflicht**: Der INT-Refresh (Reset-from-PRD → anonymisieren
  → migrieren → E2E) ist die **Absicherungs-Vorstufe** der automatischen PRD-Migration – ohne ihn liefe
  die Prod-Migration ohne den bewiesenen INT-Lauf. Die Branch-IDs (`br-…`) und das API-Token stehen in
  der Neon-Konsole; `INT_DATABASE_URL` ist der gepoolte Connection-String des INT-Branches (wie in
  `.env.int`). Der Refresh läuft **fail-closed**: schlägt Reset/Anonymisierung/Migration fehl, gibt es **kein** Promote.
- **Prod-Migration automatisiert (ADR-017):** `db:migrate:prd` + `db:seed:prd` laufen **vor** dem
  Promote – abgesichert dadurch, dass die INT-Stufe dieselbe Migration gegen prod-nahe, anonymisierte
  Daten bereits angewandt und per E2E getestet hat. Migration/Seed rot → **kein** Promote.
- **Aktivierungs-Reihenfolge:** (1) Secrets setzen (inkl. `PRD_*`), (2) Gate einmal grün laufen lassen
  (legt/aktualisiert `production`), (3) **dann** in Vercel **Production Branch = `production`** setzen.
- E2E **oder** Prod-Migration rot → **kein** Promote → Production bleibt auf dem letzten Stand.
- Nach dem Promote verifiziert das Gate das **tatsächlich deployte** Prod via `/api/health`
  (DB-Read auf die `roles`-Spalte) – CI-grün ↔ Prod-grün (ADR-007).

#### Deploy-Freeze bei rotem Gate (ADR-032)

Der Promote akkumuliert (`main`-HEAD → `production`) und ist selbst-korrigierend – **solange das
Gate verlässlich ist**. Ein einmal rotes Gate über echten Code-/Migrationsdefekt darf aber nicht
durch einen späteren, evtl. **flaky-grünen** Lauf still überholt werden (Vorfall 19.07.2026:
#134-rot → #167-flaky-grün → Prod-Defekt). Dagegen schützt der **Deploy-Freeze**:

- **Setzen (fail-closed):** Wird ein **verifikationsrelevanter** Schritt rot – *E2E gegen INT*,
  *`db:migrate:int`* oder *`db:migrate:prd`* – setzt das Gate einen persistenten Marker: das
  Git-Ref **`refs/factory/deploy-freeze`** (zeigt auf den blockierenden Commit-SHA). Reine
  Infra-/Vorbereitungsfehler (Secret-Check, Install, INT-Deploy-Timeout, Neon-Reset,
  Anonymisierung) frieren **nicht** ein.
- **Blockieren (fail-closed):** Vor der PRD-DB-Migration prüft das Gate den Marker. Ist er gesetzt
  **oder unlesbar**, werden **PRD-Migration + Seed, Promote-Push und Healthcheck übersprungen** –
  der Lauf endet **grün** (kein neuer Fehlalarm), aber es wird **nichts deployt**. `main` läuft
  normal weiter (Merges + Gate-Läufe), nur der **Promote** pausiert.
- **Benachrichtigung (fail-open):** Beim Setzen/Blockieren kommentiert das Gate ein dediziertes
  **„Deploy-Freeze"-Tracking-Issue** (SHA + Grund + Run-Link) → GitHub-Notification.
- **Freigabe (Maintainer):** Voraussetzung ist ein **gemergter, verifizierter Fix**. Dann den
  Workflow **„Deploy-Freeze aufheben (Freigabe)"** manuell starten:
  **GitHub → Actions → *Deploy-Freeze aufheben (Freigabe)* → *Run workflow*** (Grund angeben).
  Er löscht das Ref (idempotent) und schließt das Tracking-Issue; der Lauf protokolliert, **wer**
  freigegeben hat. Der **nächste grüne** Gate-Lauf promotet wieder regulär.
  Notfalls per CLI: `bash scripts/deploy-freeze.sh release` (setzt Repo-Schreibrecht + `origin`
  voraus); `bash scripts/deploy-freeze.sh status` zeigt den blockierenden SHA.

> Die Env-Dateien `.env.local` / `.env.int` / `.env.prd` sind **gitignored** – Secrets nie committen.
> Secret erzeugen: `openssl rand -base64 32` (**nicht** `npx auth secret` – zieht das falsche CLI).

---

## Skripte

| Skript | Zweck |
|--------|-------|
| `pnpm dev` / `pnpm build` / `pnpm start` | Entwicklung / Produktions-Build / Start |
| `pnpm lint` · `pnpm format` · `pnpm format:check` | ESLint · Prettier |
| `pnpm test` · `pnpm test:coverage` | Vitest (Unit) |
| `pnpm test:e2e` | Playwright-Oberflächentests gegen **DEV** (startet Dev-Server; DB via `pnpm db:up`) |
| `pnpm test:e2e:int` | Playwright gegen **INT** (Vercel-Preview; benötigt `VERCEL_AUTOMATION_BYPASS_SECRET` in `.env.int`) |
| `pnpm db:up` · `pnpm db:down` | lokale Docker-Postgres starten/stoppen (DEV) |
| `pnpm db:generate` | Drizzle-Migration aus dem Schema erzeugen (offline) |
| `pnpm db:migrate` · `db:migrate:int` · `db:migrate:prd` | Migration auf DEV / INT / PRD anwenden |
| `pnpm db:seed` · `db:seed:int` · `db:seed:prd` | Login-Admin auf DEV / INT / PRD anlegen (idempotent) |
| `pnpm db:anonymize:int` | INT-Daten anonymisieren (nach Neon-Branch-Refresh; Guard: nur `STAGE=int`) |
| `pnpm db:studio` | Drizzle Studio (DEV) |

---

## Deployment (Vercel)

Das GitHub-Repo ist mit einem Vercel-Projekt verbunden:
- **`main` → Production (PRD)**, **`int` → Preview (INT)**, sonstige PRs → Preview.
- **Function-Region `fra1`** ist über [`vercel.json`](vercel.json) fixiert.
- Env-Variablen werden **je Environment/Branch** im Vercel-Dashboard gesetzt (siehe Stage-Tabellen oben).

INT ist ein **Neon-Branch** der PRD-DB (anonymisiert), DEV eine lokale Docker-DB. Migrationen laufen
den Weg **DEV → INT → PRD**.

---

## Projektstruktur (Auszug)

```
app/                      # Next.js App Router (Seiten, /login, /api/auth, components/StageBanner)
lib/stage.ts              # Stage-Erkennung (Banner/Icon/Titel je DEV/INT/PRD)
db/                       # Drizzle: schema.ts, index.ts (dualer Treiber), migrations/, seed.ts
auth.ts · auth.config.ts  # Auth.js (Node bzw. edge-sichere Config)
proxy.ts                  # Route-Schutz (Next-16-Nachfolger von middleware)
docker-compose.yml        # lokale DEV-Postgres
vercel.json               # Vercel-Region fra1
```

Eine kuratierte **Routen-Übersicht** (alle Seiten + API-Route-Handler mit Funktion und
Zugriff/Rolle) steht in [`docs/routes.md`](docs/routes.md); ein Drift-Check im Push-Gate hält sie
mit dem `app/`-Baum synchron.

---

## Entwicklung mit der dm-Factory (Werkzeug)

Dieses Repo nutzt als **Entwicklungs-Harness** die [dm-Factory](https://gitlab.dm-drogeriemarkt.com/ctech_tv/dm-factory-template)
(agentische Entwicklung mit Claude Code) – auf GitHub portiert. Praktisch heißt das:

- **Zwei Phasen:** Der Mensch **schärft die Anforderung** interaktiv (Phase 1: Requirements, ggf.
  Architecture – nicht automatisierbar), die Automatik **setzt sie um** (Phase 2: Implement → … → PR
  – vollautomatisierbar oder Skill für Skill). Kanonische Ablauf-Beschreibung: [`docs/factory/OPERATING.md`](docs/factory/OPERATING.md).
- **Issue-first**: neue Aufgabe mit `bash scripts/start-work.sh "<beschreibung>"` (legt GitHub-Issue,
  Branch und Task-Datei an). Task-ID = Issue-Nummer.
- **PR-Workflow** mit CI-Gates (`.github/workflows/`): Lint, Tests, Self-Test, Issue-Sync.
- Details: [`docs/factory/OPERATING.md`](docs/factory/OPERATING.md) (Runbook), [`CLAUDE.md`](CLAUDE.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), [`docs/`](docs/) (ADRs, Guidelines).

Die Factory ist reines Werkzeug – sie ist **nicht** Teil der ausgelieferten Anwendung.

---

## Häufige Fragen (FAQ)

Nutzungsfragen (z. B. Tastaturbedienung im Safari) beantwortet die
[FAQ](docs/FAQ.md).

---

## Änderungshistorie

Siehe [docs/CHANGELOG.md](docs/CHANGELOG.md).
