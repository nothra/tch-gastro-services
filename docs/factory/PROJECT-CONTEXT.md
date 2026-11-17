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
rechnet eine Veranstaltung ab (Getränke aus der Theke, Essen, Kaffee, Auslagen –
je Teilnehmer/Familie) und kassiert bar. Erstes Anwendungsfeld ist die wöchentliche
**Montagsrunde**; der Ablauf gilt sinngemäß für weitere Veranstaltungen.

**Kernbegriffe (Ubiquitous Language):**
- **Veranstaltung** – eine abzurechnende Zusammenkunft (Datum, Bezeichnung, Kasse,
  Status `offen`/`abgeschlossen`). Essen ist **kein** Feld der Veranstaltung, sondern ein
  Katalogartikel (ADR-023 §D4/§D7).
- **Teilnehmer** – Person **oder** Familie (eine Abrechnungszeile); Mitglied/Nicht-Mitglied.
- **Katalog** – **benannte, eigenständige Preisliste** (ADR-050): „Montagsrunde" und „Dorfmeisterschaften" sind
  Kataloge mit eigenen Artikeln und Preisen. Jeder **Katalogartikel** gehört zu genau einem Katalog (Pflichtbezug,
  DB-fail-closed); „gleicher Name + Größe" ist **je Katalog** ein Duplikat. Es gibt keinen „Veranstaltungstyp" (die
  Typ-Semantik trägt der Katalogname), `kasse` ist nicht die Preis-Achse (Geldtopf ≠ Preisliste). Artikel tragen eine
  Kategorie (`getraenk`/`kaffee`/`essen`); Kaffee und Essen haben **feste** Preise, gewählt bei der Erfassung (ADR-023 §D4/§D7).
- **Verzehr** – Getränke + Essen + Kaffee eines Teilnehmers.
- **Auslagenerstattung** – vorgestreckte Kosten, als **eigener Vorgang** (getrennt vom
  Kassieren) erstattet; je Auslage ein Teilnehmer + Kategorie (**Getränke/Essen/Sonstiges**).
- **Kasse** – Abrechnungs­topf je Veranstaltung (fester Satz: `montagsrunde` | `vereinskasse`).
- **Kassieren / Spende** – Barzahlung des Verzehrs; Überzahlung = Spende.

**Zentrale Regeln:**
- `Verzehr-Gesamt = Summe Getränke (Theke) + Summe Sonstige (Essen + Kaffee)`
- `Spende = Erhalten − Verzehr-Gesamt`
- Auslagen mindern den Verzehr **nicht** (Abweichung vom Excel); Erstattung ist ein
  eigener Vorgang.
- `Kassenveränderung der Veranstaltung = Σ Erhalten − Σ Auslagenerstattungen` – **je zugeordneter
  Kasse**. Ein laufender Saldo über mehrere Veranstaltungen wird in dieser App nicht geführt (#57 – nicht geplant; Kassen laufen außerhalb).

**Rollen:** `verwalter` (Stammdaten & Preise) und `veranstalter` (Owner des Veranstaltungs-
Lebenszyklus: anlegen, führen, kassieren – vormals `abrechner`, umbenannt in ADR-024);
Teilnehmer erfassen ohne Konto per Veranstaltungs-Link/QR + Namenswahl. Details in `spec-48`.

---

## Tech-Stack

| Feld | Wert |
|------|------|
| **Primärsprache** | TypeScript |
| **Framework / Runtime** | Next.js (App Router) / Node 24+ · Hosting: Vercel (Region fra1) |
| **Datenbank** | PostgreSQL (Neon, Free-Tarif, Region Frankfurt/EU) |
| **Build-Tool** | pnpm + Next.js |
| **Weitere Technologien** | PWA (@serwist/next), Tailwind CSS + eigene Bausteine (`app/components/ui/`, ADR-052), Drizzle ORM, Zod, Auth.js (NextAuth v5) |

---

## Build & Run

`pnpm install` · `pnpm dev` (Dev-Server) · `pnpm build` (Produktions-Build)

---

## Testing

- **Kommandos:** `pnpm test` (Unit/Integration) · `pnpm test:coverage` · `pnpm vitest run <pfad-oder-muster>` (einzeln) · `pnpm test:e2e` (Playwright)
- **Test-Framework:** Vitest (Unit/Integration) + Playwright (E2E); **Mindest-Coverage:** 80 %
- **Test-Konventionen:** Arrange-Act-Assert; Unit-Tests neben dem Code als `*.test.ts(x)`, E2E unter `e2e/`; siehe `docs/factory/guidelines/testing-standards.md`

---

## Lokale Umgebung & Oberflächentests

Details und Kommandos: [`docs/project/betrieb.md`](../project/betrieb.md).

- **Setup:** `pnpm install` · `.env.local` · `pnpm db:up` · `pnpm db:migrate` · `pnpm db:seed` · `pnpm dev`
- **Oberflächentests** (UI-Tasks, zusätzlich zu den Gates; die Skill-Texte sagen nur „E2E-Werkzeug des Projekts", hier steht es):
  je Akzeptanzkriterium eine Playwright-Spec unter `e2e/*.spec.ts`; `pnpm test:e2e` startet den Dev-Server über die
  `webServer`-Config selbst (`reuseExistingServer` außerhalb CI); interaktiv: Preview-Config `dev` (`pnpm dev`) durchklicken.
  Voraussetzung: `.env.local` (im Worktree über `start_work.copy_files` kopiert) und geseedete DB.
- **Stage 3:** E2E nur mit laufender DB; sonst Nachtest in der Task-Datei vermerken

---

## Code-Qualität

`pnpm lint` (ESLint: `next/core-web-vitals`, TypeScript) · `pnpm format:check` / `pnpm format` (Prettier)

---

## Architektur

- **Stil:** Feature-orientierte Schichtung mit dem Next.js App Router; UI (Server/Client Components) → Server Actions/Route Handlers → gekapselte Data-Layer (Drizzle). Clean Code/SOLID gemäß `docs/factory/guidelines/`.
- **Domain-Aufteilung:** nach Feature/Domäne unter `app/`; DB-Schema & -Zugriff gebündelt in einer Data-Layer (`db/`), nicht in UI/Actions verstreut.
- **API-Stil:** primär **Server Actions** für Formular-Erfassung; REST-artige **Route Handlers** (`app/api/`) wo externe/GET-Zugriffe nötig sind.
- **Besonderheiten:** installierbare **PWA**; **RBAC** über Auth.js + Rollen-Spalte (serverseitig durchgesetzt); **EU-Datenresidenz** (Neon Frankfurt, Vercel `fra1`).

**Routen-Übersicht:** Alle Seiten und API-Route-Handler mit Pfad, Funktion und Zugriff
(Rolle/öffentlich) stehen kuratiert in [`docs/routes.md`](../routes.md). Kanonische Quelle bleibt
der Code (`app/**/page.tsx`, `app/api/**/route.ts`); die Übereinstimmung sichert der Drift-Check
`scripts/project/checks/pre-push.d/routes-doc-check.sh` fail-closed im Push-Gate.

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
- **Neue UI nutzt die Bausteine aus `app/components/ui/` und Token-Klassen** (`bg-surface`, `text-muted` …), keine rohen Tailwind-Farben und kein `dark:` (ADR-052). Umgestellte Pfade in `eslint/ui-token-files.mjs` eintragen – ab da lehnt `pnpm lint` rohe Farbklassen dort ab.
- **UI-Texte (Labels, Buttons, Meldungen, Platzhalter) folgen dem Wording-Glossar [`docs/ux/glossar.md`](../ux/glossar.md)** – Verb je Aktionstyp, Meldungsmuster, Anrede Du, „€", „…"; bei UI-Text-Arbeit in `/implement` und `/review` lesen.

---

## Projekt-Labels

> Projekteigene Aspekt-Labels (`labels.aspects_extra` in `factory.config.yml`) zusätzlich zu den
> generischen aus `docs/factory/guidelines/git-workflow.md` → „GitHub-Labels". Die Label-Menge steht
> in der Konfiguration, hier stehen Bedeutung und Zuordnungsregel.

| Label | Aspekt |
|-------|--------|
| `factory-pipeline` | Arbeit am **Factory-Harness** (Pipeline, Skills, Gates, Factory-Doku) statt an der TCH-Applikation |

> **`factory-pipeline` trennt Werkzeug von Produkt** (aus #315; Herleitung: `docs/specs/spec-315-factory-pipeline-label-dokumentieren.md`).
> Das Label beantwortet „welches Subsystem", nicht „welche Dimension zusätzlich", und entscheidet sich an den berührten Pfaden:
>
> - **Factory-Harness → Label setzen.** Pfad-Anker: `scripts/`, `.claude/`, `.github/workflows/`, `docs/factory/`.
> - **TCH-Applikation → Label weglassen.** Pfad-Anker: `app/`, `db/`, `lib/`.
>
> **Im Zweifel Label setzen** (berührt ein Issue beide Seiten oder liegt außerhalb beider Listen: Repo-Wurzel, `docs/adr/`,
> `tasks/`, `e2e/`, `docs/specs/` – Ablagekonvention, keine Subsystem-Grenze). Einseitig fail-safe wie „im Zweifel Issue":
> ein zu viel gesetztes Label kostet einen Filterklick, ein fehlendes macht Factory-Arbeit im Backlog unsichtbar.

---

---

## Bekannte Stolpersteine

> Wird durch `/codify` befüllt (Dinge, die Claude wiederholt falsch gemacht hat). Volltext liegt thematisch in
> [`docs/factory/lessons/`](lessons/) (Factory) und [`docs/project/lessons/`](../project/lessons/) (TCH), **nicht**
> `@import`-geladen (Factory-ADR-037). **Bedarfsgesteuert laden:** beim Start eines Skills nur die Lessons öffnen, deren
> „Laden bei"-Trigger zum laufenden Skill und zur Domäne der Task passt – nicht alle vorsorglich lesen.

### Kern-Kurzregeln (immer geladen)

> Die wenigen Regeln, die praktisch **jede** Feature-Task berühren (Data-Layer/Validierung),
> bleiben als Einzeiler inline. Volltext + Begründung je in der verlinkten Lesson.

1. **Drizzle `.returning()` bei UPDATE/DELETE → Rückgabetyp `T | undefined`** (nicht `T`); bei No-Match ist das Array leer. → [`docs/project/lessons/db-drizzle.md`](../project/lessons/db-drizzle.md)
2. **IDOR: DELETE/UPDATE auf Zeilen-Tabellen führen den Parent-Key im `WHERE` mit** (nicht nur den Primärschlüssel). → [`docs/project/lessons/db-drizzle.md`](../project/lessons/db-drizzle.md)
3. **Soft-Delete: nach jedem Laden by ID `active` prüfen, bevor geschrieben wird** (die Action ist die Grenze, nicht die UI). → [`docs/project/lessons/db-drizzle.md`](../project/lessons/db-drizzle.md)
4. **Zod: Felder auf `int4`/`text` bekommen eine Obergrenze** (`.max`/`.refine`), sonst ist der DB-Overflow die einzige Fehlergrenze. → [`docs/project/lessons/db-drizzle.md`](../project/lessons/db-drizzle.md)

### Index der ausgelagerten Learnings

> Hier steht nur der **Index der Projekt-Lessons** (`docs/project/lessons/`, TCH-spezifisch): eine Zeile je Learning
> (Titel + Herkunfts-Issue), gruppiert nach Ziel-Lesson-Datei, je Gruppe mit **„Laden bei"-Trigger** (Skill +
> Situation); wo eine Datei gemischte Auslöser hat (`factory-workflow.md`), steht der Trigger `→ …` je Zeile.
> Die **Factory-Lessons** (`docs/factory/lessons/`, generisch) werden mit der Factory ausgeliefert; ihre Einzelliste steht
> in `docs/factory/lessons/INDEX.md`, die Trigger je Lesson-Datei in `docs/factory/FACTORY.md`. Danach entscheiden,
> welche Lesson der aktuelle Skill wirklich braucht. Wohin ein neues Learning gehört, regelt `/codify`
> (Datei in `factory.lock` → Factory, sonst Projekt).

#### Projekt-Lessons (`docs/project/lessons/`)

> Einzelliste (eine Zeile je Learning): [`docs/project/lessons/INDEX.md`](../project/lessons/INDEX.md) – nicht `@import`-geladen (Deckel, #428). Neue Index-Zeilen eines Projekt-Learnings gehören **dorthin**, nicht hierher.

| Lesson-Datei | Laden bei |
|---|---|
| `frontend-react.md` | `/implement`, `/review` bei React/UI-Komponenten |
| `next-auth.md` | `/implement`, `/review` bei Auth/`proxy.ts`/Routen |
| `db-drizzle.md` | `/implement`, `/review`, `/test` bei Data-Layer (Drizzle) |
| `testing.md` | `/implement`, `/test`, `/review` beim Testschreiben/Coverage der App |
| `repo-werkzeuge.md` | `/implement`, `/review`, `/security-review` an `scripts/project/factory-extract*` oder einem neuen Gate um einen externen Scanner |
| `build-tooling.md` | bei Build/CI/Dependencies/Vercel-Bundling |
| `code-style.md` | `/refactor`, `/review` (Clean-Code) |
| `factory-workflow.md` | `/implement`, `/review` bei Routen/UI/E2E im Worktree |

---

## Offene Architektur-Fragen

> Noch nicht entschiedene Fragen, die eine ADR benötigen.

_Derzeit keine offenen Fragen._

> **Erledigt (ADR-024, #120):** Route-Schnitt des Veranstaltungs-Bereichs → `/veranstaltung` + `/veranstaltung/[id]`; Rolle `abrechner` → `veranstalter`.
