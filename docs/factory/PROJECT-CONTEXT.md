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

## Fachdomäne

> Kanonische Quelle: **`docs/specs/README-montagsrunde.md`** (+ `docs/specs/spec-48…55`).
> Hier nur der Einstieg – Details und Akzeptanzkriterien stehen in den Specs.

**Zweck:** Ablösung des Excel-Templates „Abrechnung Veranstaltung". Der Thekenwart
rechnet einen Veranstaltungsabend ab (Getränke aus der Theke, Essen, Kaffee, Auslagen –
je Teilnehmer/Familie) und kassiert bar. Erstes Anwendungsfeld ist die wöchentliche
**Montagsrunde**; der Ablauf gilt sinngemäß für weitere Veranstaltungen.

**Kernbegriffe (Ubiquitous Language):**
- **Veranstaltung/Abend** – eine abzurechnende Zusammenkunft (Datum, Bezeichnung, Kasse,
  Essenpreis, Status `offen`/`abgeschlossen`).
- **Teilnehmer** – Person **oder** Familie (eine Abrechnungszeile); Mitglied/Nicht-Mitglied.
- **Getränke-Katalog** – pflegbare Preisliste; **Kaffee** fester Katalogpreis, **Essen**
  pro Abend festgelegt.
- **Verzehr** – Getränke + Essen + Kaffee eines Teilnehmers.
- **Auslagenerstattung** – vorgestreckte Kosten, als **eigener Vorgang** (getrennt vom
  Kassieren) erstattet; je Auslage ein Teilnehmer + Kategorie (**Getränke/Essen/Sonstiges**).
- **Kasse** – Abrechnungs­topf je Abend (fester Satz: `montagsrunde` | `vereinskasse`).
- **Kassieren / Spende** – Barzahlung des Verzehrs; Überzahlung = Spende.

**Zentrale Regeln:**
- `Verzehr-Gesamt = Summe Getränke (Theke) + Summe Sonstige (Essen + Kaffee)`
- `Spende = Erhalten − Verzehr-Gesamt`
- Auslagen mindern den Verzehr **nicht** (Abweichung vom Excel); Erstattung ist ein
  eigener Vorgang.
- `Kassenveränderung des Abends = Σ Erhalten − Σ Auslagenerstattungen` – **je zugeordneter
  Kasse**. Ein laufender Saldo über mehrere Abende ist noch nicht umgesetzt (Backlog #57).

**Rollen:** `verwalter` (Stammdaten & Preise) und `abrechner` (Abende führen & kassieren);
Teilnehmer erfassen ohne Konto per Abend-Link/QR + Namenswahl. Details in `spec-48`.

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
- **Auth-/Rollen-Checks immer serverseitig** (Routen-Gate + in Server Actions), nie ausschließlich clientseitig.
- Secrets (DB-URL, Auth-Secret) nur als Env-Vars (Vercel), nie im Repo.
- **Login/Credential-Prüfung in konstanter Zeit:** `bcrypt.compare` immer ausführen – bei unbekanntem Nutzer gegen einen konstanten Dummy-Hash (`lib/credentials.ts`), damit die Antwortzeit keine User-Enumeration erlaubt.
- **Rollen als Enum-Array** (`roles user_role[]`, ADR-016); Prüfung über den Guard `lib/authz.ts` (`requireRole`/`requireAnyRole`, fail-closed), nie über clientseitig ausgeblendete UI.

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

### Next.js 16: Middleware heißt `proxy.ts` (aus #48)

Next 16 hat die Middleware-Konvention von `middleware.ts` auf **`proxy.ts`** umbenannt. Sind
**beide** Dateien vorhanden, bricht `next build` hart ab. NextAuth-v5-Doku und ältere ADRs nennen
noch `middleware.ts` – der Route-Schutz war hier in Wahrheit längst über `proxy.ts` verdrahtet.

**Regel:** Edge-Routen-Schutz in **`proxy.ts`** (Root) verdrahten, **keine** `middleware.ts`
anlegen. Muster: `const { auth } = NextAuth(authConfig); export default auth;` mit einer
`authConfig` **ohne** `db`/`bcrypt` (edge-sicher). Negativ-Lookahead-Matcher eng fassen
(nur konkrete statische Assets ausnehmen, nicht pauschal `.*\.svg$`) – fail-closed.

### Drizzle-Migration bei Enum-Wert-Wechsel / Spalte→Array (aus #48)

Zwei Fallen: (1) `drizzle-kit generate` braucht bei mehrdeutigen Spalten-Änderungen einen
**interaktiven Prompt** (rename vs. create) und **hängt** in Non-TTY (CI/Pipeline). (2) Postgres
kann Enum-Werte nicht entfernen und eine Enum-Spalte nicht nach `Enum[]` casten → das generierte
SQL ist dann **inkohärent** (ALTER auf eine noch nicht existierende Spalte).

**Regel:** Prompt per `expect`/PTY beantworten (Default „create column" ist meist korrekt). Bei
Enum-Wert-Änderung/Enum→Enum[] das generierte SQL durch **drop-and-recreate** ersetzen (Spalte →
Type droppen → Type neu → Spalte neu), den **von drizzle-kit generierten Snapshot behalten**, und
die Migration **lokal gegen eine Wegwerf-DB** verifizieren (`0000→…→n` grün). Nur zulässig, solange
kein Prod-Datenbestand betroffen ist.

### NextAuth v5: Custom-Session-/JWT-Claims typisieren (aus #48)

`declare module "next-auth/jwt"` **greift nicht** – `next-auth/jwt` re-exportiert nur (`export *`);
die Augmentierung muss auf **`@auth/core/jwt`** zielen. Zusätzlich typisiert der `session()`-Callback
in der v5-Beta den Custom-Claim nicht sauber (`token.x` landet als `{}`).

**Regel:** In `types/next-auth.d.ts` `User`/`Session` über `next-auth` **und** `JWT` über
`@auth/core/jwt` augmentieren; im `session()`-Callback den JWT-Claim explizit casten
(`token.x as T`). Typen aus dem Data-Layer nur als `import type` (bleibt edge-sicher).

### Vitest + Testing Library ohne `globals: true` (aus #48)

Ohne `globals: true` registriert Testing Library **kein** Auto-Cleanup → das DOM leakt zwischen
Component-Tests (ein Test sieht das Markup des vorigen; `screen`-Queries schlagen scheinbar grundlos fehl).

**Regel:** In `vitest.setup.ts` `afterEach(() => cleanup())` behalten – nicht entfernen. Async
Server Components in Tests via `render(await Component())` prüfen.

---

## Offene Architektur-Fragen

> Noch nicht entschiedene Fragen, die eine ADR benötigen.

<!-- Wird bei /architecture befüllt -->
