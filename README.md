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

**Voraussetzungen:** Node ≥ 20, [pnpm](https://pnpm.io) (`npm i -g pnpm`), Docker.

```bash
pnpm install
cp .env.example .env.local          # NEXT_PUBLIC_STAGE=dev, lokale DATABASE_URL, AUTH_SECRET, SEED_ADMIN_*
pnpm db:up                          # lokale Postgres via Docker (docker-compose.yml)
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

**Refresh-/Testfluss** (wiederholbar, z. B. vor jeder Migrations-Probe):
```bash
# (Neon: int-Branch neu von PRD abzweigen = frische Prod-Daten)
pnpm db:anonymize:int    # Namen/E-Mails überschreiben, Prod-Passwörter entwerten (Guard: nur STAGE=int)
pnpm db:migrate:int      # ausstehende Migrationen auf INT testen (vor PRD)
pnpm db:seed:int         # bekannten INT-Admin (SEED_ADMIN_*) setzen
```

> `db:anonymize:int` bricht ab, wenn `NEXT_PUBLIC_STAGE` nicht `int` ist – Schutz vor
> versehentlichem Ausführen gegen DEV/PRD.

### PRD – Produktion

- Branch **`main`** → Vercel **Production** (Auto-Deploy bei Merge).
- **Vercel-Env** (Scope *Production*): `NEXT_PUBLIC_STAGE=prd`, `DATABASE_URL=<PRD-Neon-Pooled>`, `AUTH_SECRET=<prd-secret>`.
- Migrationen kontrolliert anwenden (Env-Datei `.env.prd`): `pnpm db:migrate:prd` – **erst nachdem sie auf INT geprüft wurden.**

> Die Env-Dateien `.env.local` / `.env.int` / `.env.prd` sind **gitignored** – Secrets nie committen.
> Secret erzeugen: `openssl rand -base64 32` (**nicht** `npx auth secret` – zieht das falsche CLI).

---

## Skripte

| Skript | Zweck |
|--------|-------|
| `pnpm dev` / `pnpm build` / `pnpm start` | Entwicklung / Produktions-Build / Start |
| `pnpm lint` · `pnpm format` · `pnpm format:check` | ESLint · Prettier |
| `pnpm test` · `pnpm test:coverage` | Vitest |
| `pnpm db:up` · `pnpm db:down` | lokale Docker-Postgres starten/stoppen (DEV) |
| `pnpm db:generate` | Drizzle-Migration aus dem Schema erzeugen (offline) |
| `pnpm db:migrate` · `db:migrate:int` · `db:migrate:prd` | Migration auf DEV / INT / PRD anwenden |
| `pnpm db:seed` · `db:seed:int` | Initial-Admin auf DEV / INT anlegen |
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

---

## Entwicklung mit der dm-Factory (Werkzeug)

Dieses Repo nutzt als **Entwicklungs-Harness** die [dm-Factory](https://gitlab.dm-drogeriemarkt.com/ctech_tv/dm-factory-template)
(agentische Entwicklung mit Claude Code) – auf GitHub portiert. Praktisch heißt das:

- **Issue-first**: neue Aufgabe mit `bash scripts/start-work.sh "<beschreibung>"` (legt GitHub-Issue,
  Branch und Task-Datei an). Task-ID = Issue-Nummer.
- **PR-Workflow** mit CI-Gates (`.github/workflows/`): Lint, Tests, Self-Test, Issue-Sync.
- Details: [`CLAUDE.md`](CLAUDE.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), [`docs/`](docs/) (ADRs, Guidelines).

Die Factory ist reines Werkzeug – sie ist **nicht** Teil der ausgelieferten Anwendung.

---

## Änderungshistorie

Siehe [docs/CHANGELOG.md](docs/CHANGELOG.md).
