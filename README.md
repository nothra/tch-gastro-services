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
| **Datenbank** | [Neon](https://neon.com) **PostgreSQL** (Free-Tarif, Region Frankfurt/EU) |
| **DB-Zugriff** | [Drizzle ORM](https://orm.drizzle.team) über den Neon serverless HTTP-Treiber |
| **Auth** | [Auth.js / NextAuth v5](https://authjs.dev) – E-Mail+Passwort (bcrypt, JWT), Rollen (RBAC) |
| **Paketmanager** | pnpm · Node ≥ 20 |

**Datenhaltung in der EU** (Neon Frankfurt + Vercel `fra1`). Alle Bausteine sind im
Vereinsbetrieb kostenfrei. Hintergrund & Begründung: [ADR-014](docs/adr/014-tech-stack-selection.md).

---

## Lokale Entwicklung

**Voraussetzungen:** Node ≥ 20, [pnpm](https://pnpm.io) (`npm i -g pnpm`).

```bash
# 1. Abhängigkeiten
pnpm install

# 2. Umgebungsvariablen
cp .env.example .env.local          # dann Werte eintragen (siehe unten)

# 3. Datenbank vorbereiten
pnpm db:migrate                     # Schema in Neon anlegen
pnpm db:seed                        # ersten Admin anlegen (SEED_ADMIN_* aus .env.local)

# 4. Dev-Server
pnpm dev                            # http://localhost:3000  → Login → Startseite
```

### Umgebungsvariablen (`.env.local`)

| Variable | Zweck |
|----------|-------|
| `DATABASE_URL` | Neon **Pooled** Connection String (Host mit `-pooler`, Region Frankfurt) |
| `AUTH_SECRET` | Cookie-/JWT-Secret. Erzeugen: `openssl rand -base64 32` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Zugangsdaten des Initial-Admins für `pnpm db:seed` |

> `.env.local` ist gitignored – **niemals Secrets committen**.
> Hinweis: `npx auth secret` nicht verwenden (zieht das falsche „Better Auth"-CLI) –
> stattdessen `openssl rand -base64 32`.

---

## Skripte

| Skript | Zweck |
|--------|-------|
| `pnpm dev` / `pnpm build` / `pnpm start` | Entwicklung / Produktions-Build / Start |
| `pnpm lint` · `pnpm format` · `pnpm format:check` | ESLint · Prettier |
| `pnpm test` · `pnpm test:coverage` | Vitest |
| `pnpm db:generate` | Drizzle-Migration aus dem Schema erzeugen (offline) |
| `pnpm db:migrate` · `pnpm db:studio` | Migration anwenden · Drizzle Studio (nutzen `.env.local`) |
| `pnpm db:seed` | Initial-Admin anlegen |

---

## Deployment (Vercel)

Das GitHub-Repo ist mit einem Vercel-Projekt verbunden: **Push auf `main` → Produktions-Deploy**,
Pull Requests erhalten Preview-Deployments.

Einmalige Einrichtung im Vercel-Dashboard:
1. **Environment Variables** (Scope *Production* + *Preview*): `DATABASE_URL`, `AUTH_SECRET`.
2. **Function-Region** auf **Frankfurt `fra1`** (bzw. `vercel.json`).

Lokal und Vercel nutzen **dieselbe Neon-Datenbank** → Migration/Seed nur einmal nötig.

---

## Projektstruktur (Auszug)

```
app/                     # Next.js App Router (Seiten, /login, /api/auth)
db/                      # Drizzle: schema.ts, index.ts (Client), migrations/, seed.ts
auth.ts · auth.config.ts # Auth.js (Node bzw. edge-sichere Config)
proxy.ts                 # Route-Schutz (Next-16-Nachfolger von middleware)
types/                   # Typ-Erweiterungen (z. B. Rolle in der Session)
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
