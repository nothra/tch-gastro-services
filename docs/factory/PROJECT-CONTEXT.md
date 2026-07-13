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

### Öffentliche API-Routen aus dem Auth-Proxy ausnehmen (aus #63)

Eine neue Route unter `app/api/*` ist per Default vom `proxy.ts`-Matcher **erfasst** → der
`authorized`-Callback leitet Unangemeldete auf `/login` um (307). Ein öffentlicher Endpunkt
(Healthcheck, Webhook, Versions-Info) bekommt so **nie 200**, sondern einen Redirect. Besonders
tückisch: Ein Unit-Test, der den Route-Handler (`GET()`) **direkt** aufruft, umgeht den Proxy und
ist grün – der Bug zeigt sich erst live/e2e (in #63 im Deploy-Gate-Healthcheck erst nach dem Promote).

**Regel:** Jede unauthentifiziert erreichbare Route **explizit** in den Negativ-Lookahead des
`proxy.ts`-Matchers aufnehmen (Muster: `api/auth|api/version|api/health`). Den Matcher weiterhin
eng fassen (kein pauschales `api`), damit geschützte Routen fail-closed bleiben. Für solche Routen
einen Nachweis haben, der die **Proxy-Ebene** einbezieht (Gate-Healthcheck/e2e), nicht nur den Handler.

### Vitest + Testing Library ohne `globals: true` (aus #48)

Ohne `globals: true` registriert Testing Library **kein** Auto-Cleanup → das DOM leakt zwischen
Component-Tests (ein Test sieht das Markup des vorigen; `screen`-Queries schlagen scheinbar grundlos fehl).

**Regel:** In `vitest.setup.ts` `afterEach(() => cleanup())` behalten – nicht entfernen. Async
Server Components in Tests via `render(await Component())` prüfen.

### Report-Guard: Stale-Verdict bei Pipeline-Re-Lauf (aus #91, Review-Finding)

Der `run_skill()`-Report-Guard in `run-pipeline.sh` liest bei non-zero Exit die Report-Datei
(`tasks/review-<id>.md` / `tasks/security-<id>.md`) und akzeptiert den Verdict **ohne zu prüfen,
ob der Report in diesem Lauf entstanden ist**. Reports sind versioniert – auf einem Re-Lauf-Branch
kann ein älterer `APPROVED`/`PASSED` bereits committet sein. Schlägt der `claude`-Aufruf sofort
fehl (Rate-Limit, Auth-Fehler, Crash), liest der Guard den **alten** Verdict und gibt `return 0` –
ohne dass in diesem Lauf ein Review stattfand (fail-open statt fail-closed).

**Regel (Issue #92):** Report-Datei im Preflight für die aktuelle Task entfernen – analog zum
Stale-Sentinel-Cleanup (`INTERRUPT-*.md`). Alternativ: mtime/Hash vor dem `claude`-Aufruf merken,
Verdict nur honorieren wenn die Datei sich danach verändert hat. Bis dahin: Pipeline-Re-Läufe auf
Branches mit bereits committetem Report manuell prüfen (ADR-019 §4 ergänzen).

### `.claude/**`-Änderungen erfordern Patch-Workflow (aus #91)

Änderungen an `.claude/settings.json` und `.claude/commands/*.md` sind für einen Agenten hard
denied (`Edit(.claude/**)` / `Write(.claude/**)` – #88-Grenze). Auch `factory.defaults.yml`
(root `*.yml`) und andere Konfigurationsdateien außerhalb von `scripts/*`/`pnpm`-Scope sind nicht
in der Allow-Liste und lösen einen Interrupt aus.

**Regel:** Enthält eine Task solche Änderungen, liefert der Agent sie als **Patch-Datei**
(`tasks/patch-<id>.diff`, erstellt via `git diff`) und protokolliert den Blocker explizit in der
Task-Datei. Der Mensch wendet den Patch mit `git apply tasks/patch-<id>.diff` an und erteilt dem
Agenten danach ggf. einen expliziten Bash-Grant für die Ausführung. Kein stilles Warten –
Blocker immer mit Datum + Grund + erforderliche Aktion des Menschen notieren
(Muster: `Blocker [Datum]: [Grund] – [was der Mensch tun muss]`).

**Patch NICHT von Hand schreiben (aus #94).** Der Agent kann die `.claude/**`-Datei nicht
editieren – der Reflex, den Unified-Diff dann direkt zu tippen, produziert **korrupte Patches**:
falsche Hunk-Header-Zählung (`@@ -a,b +c,d @@`) und leere Kontextzeilen ohne führendes Leerzeichen
brechen `git apply` („corrupt patch at line N"). Stattdessen den Diff **programmatisch** erzeugen:
Original in eine Temp-Kopie lesen, dort die Änderung anwenden (Python/sed im Scratchpad – **kein**
`.claude/**`-Write), und den Patch via `git diff --no-index` oder `difflib.unified_diff` generieren
(Pfad-Header auf `a/.claude/… b/.claude/…` setzen).

**Regel:** Patch immer read-only mit `git apply --check tasks/patch-<id>.diff` verifizieren, bevor
er dem Menschen übergeben wird; zusätzlich auf Temp-Kopien anwenden und die Akzeptanz-Assertions
(Grep/JSON-Validität) dagegen laufen lassen – so ist „Green nach Apply" belegt, ohne die
hard-denied Datei anzufassen.

### Debug-/Lint-Artefakte nicht durch .gitignore gedeckt (aus #67)

Im Lint-Debugging entstanden `lint-out.tmp.txt` und `scripts/lint-debug.tmp.sh` im
Arbeitsbaum. `.gitignore` deckte `*.log` und `*-debug.log*` ab, aber keine `.tmp`-Muster.
Der Review musste explizit auf das Entfernungserfordernis hinweisen – ohne diesen Fund
wären die Dateien mit `git add .` ins Repo gewandert.

**Regel:** `.gitignore` enthält jetzt `*.tmp.txt` und `*.tmp.sh`. Neue Debugging-/Lint-
Hilfsskripte, die nicht eingecheckt werden sollen, immer nach einem dieser Muster benennen
(oder das Muster in `.gitignore` ergänzen), bevor sie erstellt werden – nicht nachträglich
aufräumen.

### WHAT-Kommentar am Modul-Level (aus #67, Refactoring-Finding)

Ein Kommentar `Die Route importiert nur diese Instanz und bleibt dünn.` beschrieb in der
**Modul-Definition** (`lib/rate-limit.ts`), wie ein externer Konsument (die Route) das Modul
nutzt. Das ist ein WHAT-Kommentar am falschen Ort: Er nennt, was der Code macht, nicht warum
er so entworfen wurde – und er beschreibt den Konsumenten statt das Modul selbst.

**Regel:** Kommentare in einer Modul-Definition beschreiben das WHY der **Modul-Entscheidung**
(z. B. fail-open, kein I/O, Singleton wegen Function-Instanz-Lebensdauer). Hinweise auf die
Nutzung durch Konsumenten gehören an die **Aufrufstelle** oder in die öffentliche Schnittstellen-
Dokumentation – nicht in die Modul-Implementierung. Bereits durch `clean-code.md` abgedecktes
Prinzip; hier als konkretes Muster festgehalten.

---

## Offene Architektur-Fragen

> Noch nicht entschiedene Fragen, die eine ADR benötigen.

<!-- Wird bei /architecture befüllt -->
