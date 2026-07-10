# Projekt-Kontext

> **Initialisierung:** Diese Datei wird durch `scripts/init-factory.sh` angelegt (Basis)
> und durch `/setup-project` in Claude Code vervollständigt (Tech-Stack-Analyse).
>
> Halte sie aktuell – sie ist das Projekt-Gedächtnis der Factory.
> Agenten haben kein Langzeitgedächtnis. Diese Datei ist ihr Onboarding-Dokument.

---

## Projekt

| Feld | Wert |
|------|------|
| **Name** | TCH Gastro Services |
| **Beschreibung** | Maßgeschneiderte, nicht-kommerzielle PWA für die Gastronomie-Vorgänge des Tennisclub Heuchelheim (TCH); Browser + iOS + Android, Betrieb auf Vercel |
| **Typ** | webapp / PWA (Browser + Android + iOS, Vercel) |
| **Team** | TCH-Developer |
| **Startdatum** | 2026-07-08 |
| **Repository** | https://github.com/nothra/tch-gastro-services |

---

## Tech-Stack

| Feld | Wert |
|------|------|
| **Primärsprache** | TypeScript |
| **Framework / Runtime** | Next.js (App Router) / Node 20+ · Hosting: Vercel (Region fra1) |
| **Datenbank** | PostgreSQL (Neon, Free-Tarif, Region Frankfurt/EU) |
| **Build-Tool** | pnpm + Next.js |
| **Weitere Technologien** | PWA (@serwist/next), Tailwind CSS + shadcn/ui, Drizzle ORM, Zod, Auth.js (NextAuth v5) |

---

## Build & Run

```bash
# Abhängigkeiten installieren
pnpm install

# Dev-Server / lokale Ausführung starten
pnpm dev

# Produktions-Build
pnpm build
```

---

## Testing

```bash
# Alle Tests ausführen (Unit/Integration)
pnpm test

# Tests mit Coverage-Report
pnpm test:coverage

# Einen einzelnen Test ausführen
pnpm vitest run <pfad-oder-muster>

# End-to-End-Tests (Playwright)
pnpm test:e2e
```

- **Test-Framework:** Vitest (Unit/Integration) + Playwright (E2E)
- **Mindest-Coverage:** 80 %
- **Test-Konventionen:** Arrange-Act-Assert; Unit-Tests neben dem Code als `*.test.ts(x)`, E2E unter `e2e/`; siehe `docs/factory/guidelines/testing-standards.md`

---

## Code-Qualität

```bash
# Linting ausführen
pnpm lint

# Formatierung prüfen
pnpm format:check

# Formatierung automatisch anwenden
pnpm format
```

- **Linter:** ESLint (`next/core-web-vitals`, TypeScript)
- **Formatter:** Prettier

---

## Architektur

- **Stil:** Feature-orientierte Schichtung mit dem Next.js App Router; UI (Server/Client Components) → Server Actions/Route Handlers → gekapselte Data-Layer (Drizzle). Clean Code/SOLID gemäß `docs/factory/guidelines/`.
- **Domain-Aufteilung:** nach Feature/Domäne unter `app/`; DB-Schema & -Zugriff gebündelt in einer Data-Layer (`db/`), nicht in UI/Actions verstreut.
- **API-Stil:** primär **Server Actions** für Formular-Erfassung; REST-artige **Route Handlers** (`app/api/`) wo externe/GET-Zugriffe nötig sind.
- **Besonderheiten:** installierbare **PWA**; **RBAC** über Auth.js + Rollen-Spalte (serverseitig durchgesetzt); **EU-Datenresidenz** (Neon Frankfurt, Vercel `fra1`).

Relevante ADRs: siehe `docs/adr/` – insbesondere **ADR-014** (Tech-Stack-Wahl).

---

## Projektspezifische Coding-Konventionen

> Hier nur Ergänzungen zu den globalen Guidelines in `docs/factory/guidelines/`.
> Nur dokumentieren, was in diesem Projekt anders oder zusätzlich gilt.

- **TypeScript strict**; Eingaben an jeder Server-Grenze mit **Zod** validieren.
- **DB-Zugriff nur über die Drizzle-Data-Layer** – keine rohen SQL-Strings in UI/Server Actions.
- Aus Vercel-Functions den **Neon serverless HTTP-Treiber** (`@neondatabase/serverless`) nutzen (kein klassischer TCP-Pool → keine Verbindungs-Erschöpfung).
- **Auth-/Rollen-Checks immer serverseitig** (Middleware + in Server Actions), nie ausschließlich clientseitig.
- Secrets (DB-URL, Auth-Secret) nur als Env-Vars (Vercel), nie im Repo.

---

## Bekannte Stolpersteine

> Wird durch `/codify` befüllt – Dinge, die Claude wiederholt falsch gemacht hat
> und die als projektspezifische Regeln gelten.

### Agenten-Blockerverhalten (aus Task 002 / K-01, K-02)

Agenten wissen, dass sie bei fehlenden Voraussetzungen stoppen sollen – schreiben aber nicht **warum** sie stehen. Das macht Blockiergründe für den Menschen unsichtbar.

**Regel:** Wenn ein Agent pausiert oder abbricht (fehlende ADR, fehlende Task-Datei, Schreibfehler), muss er den Grund **explizit in der Task-Datei protokollieren** bevor er stoppt. Kein stilles Warten.

Format: `Blocker [Datum]: [Grund] – [was der Mensch tun muss]`

### Kanonische Quellen immer referenzieren (aus Task 002 / W-02, W-03)

Wenn eine Regel oder Liste an mehreren Stellen auftaucht (Skill + Persona + Spec), muss jede Kopie auf die kanonische Quelle verweisen. Fehlt der Verweis, entstehen beim nächsten Update inkonsistente Versionen.

**Regel:** Bei Änderungen an Regel-Listen: (1) Kanonische Quelle aktualisieren, (2) alle Kopien synchronisieren, (3) alte Formulierungen vollständig ersetzen – nie neben neuen stehen lassen.

### Fast-Forward-Pushes aus CI brauchen vollen Verlauf (aus Task 42, bei Live-Verifikation #40)

`actions/checkout@v4` klont per Default **shallow** (`fetch-depth: 1`). Ein normaler
`git push origin HEAD:<ziel>` auf ein **bereits existierendes** Branch-Ref wird dann serverseitig
als **non-fast-forward abgelehnt**, weil der Shallow-Clone den Fast-Forward nicht belegen kann –
selbst wenn das Ziel echter Vorfahr ist. Tückisch: Der **erste** Lauf geht durch, weil er das Ref
*neu anlegt* (Neuanlage kennt keinen FF-Check) – der Bug schlägt erst beim zweiten Promote zu.
Konkret aufgetreten im Deploy-Gate beim Promote `main`→`production`.

**Regel:** Für Fast-Forward-/Promote-Pushes aus GitHub Actions **`with: fetch-depth: 0`** am
Checkout setzen (voller Verlauf → echter FF-Guard, fail-closed). `--force` nur für **Wegwerf-Refs**
verwenden (z. B. `int`), nie für Deployment-/Prod-Refs.

---

## Offene Architektur-Fragen

> Noch nicht entschiedene Fragen, die eine ADR benötigen.

<!-- Wird bei /architecture befüllt -->
