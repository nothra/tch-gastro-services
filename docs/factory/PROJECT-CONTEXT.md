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

**Rollen:** `verwalter` (Stammdaten & Preise) und `veranstalter` (Owner des Veranstaltungs-
Lebenszyklus: anlegen, führen, kassieren – vormals `abrechner`, umbenannt in ADR-024);
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

**Ergänzung `vi.clearAllMocks()` vs. `vi.resetAllMocks()` (aus #51):** `clearAllMocks()` löscht
nur Call-History, **nicht** Mock-Implementierungen (`mockReturnValue`/`mockRejectedValue`). Ein
`mockRejectedValue` aus einem `describe`-Block kann dadurch in den nächsten leaken → Reihenfolge-
Abhängigkeit zwischen Test-Blöcken (Verstoß gegen Test-Isolation).

**Regel:** In `beforeEach` immer `vi.resetAllMocks()` verwenden – nicht `vi.clearAllMocks()` –
wenn Test-Blöcke eigene Mock-Implementierungen setzen. `clearAllMocks()` genügt nur, wenn
keine Mock-Implementierungen gesetzt werden (nur `vi.fn()` ohne `.mockReturnValue`/`.mockRejectedValue`).

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

### `useActionState` + Inline-Toggle: ESLint `react-hooks/set-state-in-effect` (aus #49)

Bei Inline-Edit-Formularen entsteht der Reflex, den Erfolgsfall über einen `useEffect` zu
schließen: `useEffect(() => { if (state?.ok) setEditing(false); }, [state])`. ESLint
(`react-hooks/set-state-in-effect`) flaggt das als kaskadierende Re-Render-Falle.

**Regel:** Action in einem `useCallback` wrappen, der die originale Server Action **awaitet**
und `setState` direkt danach aufruft – kein `useEffect`:
```ts
const actionWithClose = useCallback(async (prev, formData) => {
  const result = await myAction(prev, formData);
  if (result.ok) setEditing(false);
  return result;
}, []);
const [state, formAction, pending] = useActionState(actionWithClose, undefined);
```
`useActionState` akzeptiert jeden async `(prev, formData) => State`-Wrapper, nicht nur
eine direkte Server Action. Der `useCallback`-Wrapper hält die Referenz stabil.

### Drizzle UPDATE/DELETE: `.returning()` liefert `T | undefined`, nicht `T` (aus #50, Refactoring-Finding)

`db.update(…).returning()` gibt `Promise<T[]>` zurück. Trifft der `WHERE`-Ausdruck keine Zeile,
ist das Array leer – `const [updated] = …` liefert dann `undefined`. Wer die Funktion als
`Promise<T>` deklariert, lügt gegenüber dem Compiler und allen Konsumenten.

**Regel:** `update()`- und `delete()`-Funktionen mit `.returning()` deklarieren ihren
Rückgabetyp als `Promise<T | undefined>`. `insert()`-Funktionen dürfen `Promise<T>` zurückgeben
(der Row ist nach erfolgreichem INSERT garantiert vorhanden):
```ts
// Richtig:
export async function updateTeilnehmer(id: string, data: TeilnehmerData): Promise<Teilnehmer | undefined> {
  const [updated] = await db.update(teilnehmer).set(data).where(eq(teilnehmer.id, id)).returning();
  return updated;
}
// Falsch: Promise<Teilnehmer> – undefined bei no-match unsichtbar für den Compiler
```

### Zod-Schema: Obergrenze für Integer-mapped Inputs fehlt (aus #49, Security-Hint)

Regex-basierte Preis-Validierung (`/^\d+([.,]\d{1,2})?$/`) prüft das **Format**, aber nicht
die **Größe**. Ein Verwalter kann `99999999999` eingeben – Zod akzeptiert, `parseEuroToCents`
liefert > `int4`-Maximum (2 147 483 647), der `INSERT`/`UPDATE` schlägt mit einem generischen
Postgres-`numeric value out of range`-Fehler fehl. Dieser Error-Code wird nicht als
Unique-Violation erkannt und re-geworfen → unbehandelter 500, kein Nutzer-Hinweis.

**Regel:** Jedes Zod-Feld, das auf eine PostgreSQL-`int4`-Spalte mappt, braucht nach dem
`.transform(...)` ein explizites Limit:
```ts
z.string()
  .transform(parseEuroToCents)
  .refine((c) => c <= 2_147_483_647, "Preis ist zu hoch.")
```
Analog für andere Integer-Felder (z. B. `sortOrder`): `.max(2_147_483_647)` oder ein
domänen-sinnvolles Maximum. Ohne Obergrenze ist der DB-Overflow die einzige Fehlergrenze –
fail-open für den Nutzerfeedback-Weg.

**Erweiterung auf `text`-Spalten (aus #50, Security-Hint):** Bei Postgres-`text` gibt es keine
DB-seitige Grenze – überlange Eingaben landen ohne Fehler in der DB. Auch wenn die Bedrohungs-
oberfläche niedrig ist (nur authentifizierte Verwalter), fehlt jede Nutzerrückmeldung. **Regel:**
Jedes Zod-String-Feld auf einer `text`-Spalte erhält eine domänen-sinnvolle Obergrenze:
```ts
z.string().trim().min(1, "…").max(200, "Name ist zu lang.")
```
Faustregel: Displaynamen 200, Freitext 1000, URLs/Keys nach Domäne.

### Neue `lib/`-Module domänenspezifisch benennen, kein generisches `utils` (aus #105, Review-Finding)

Beim Zentralisieren eines gemeinsamen Helfers entsteht der Reflex, ihn in ein
`lib/form-utils.ts` / `lib/helpers.ts` / `lib/utils.ts` zu legen – auch wenn ein Issue
diesen Namen bereits vorschlägt (in #105 lautete der Issue-Titel wörtlich „… in
`lib/form-utils.ts` zentralisieren"). Das kollidiert mit der etablierten `lib/`-Konvention:
alle Module tragen sprechende Domänennamen (`authz`, `money`, `credentials`, `rate-limit`,
`stage`). Ein generisches „utils" benennt die technische Kategorie statt der Verantwortung
und wird zur „Grabbelkiste", in der Unzusammenhängendes landet (clean-code.md: „Keine
generischen Namen … ohne Kontext").

**Regel:** Ein neues `lib/`-Modul nach seiner **Verantwortung** benennen, nicht nach der
technischen Kategorie – z. B. `form-errors.ts` (Zod-Fehlermeldung → Nutzertext), nicht
`form-utils.ts`. Ein im Issue vorgeschlagener generischer Name ist **kein** Freibrief:
er wurde als Platzhalter notiert, nicht als bindende Design-Entscheidung – im Zweifel im
Review hinterfragen und umbenennen (kostet 1 Datei + Imports). Landet später mehr im Modul,
das keine gemeinsame Verantwortung teilt, ist das ein Zeichen, es aufzuteilen, nicht ein
`utils` zu rechtfertigen.

### Notiz-vor-Merge bei Squash-Strategie (aus #114)

Ein Skill-Schritt, der eine Notiz in eine versionierte Datei (Task-Datei, Changelog) schreibt
und **danach** `gh pr merge --auto --squash` ausführt, produziert einen Verlust: Bei
Squash-Merge landet nur committeter+gepushter Inhalt auf `main`. Eine nur lokal geschriebene
Abschlussnotiz wird durch den Merge nie übernommen – und nach dem Merge liegt die Datei auf
`main`, wo Direkt-Commits verboten sind (Änderung nur noch über einen neuen PR, für ein Häkchen
unverhältnismäßig). Aufgetreten bei #112/#114 in `/pr-shepherd` Schritt 6, wo das Merge-Kommando
sogar **vor** der Notiz stand.

**Regel:** Schreibt ein Schritt eine Notiz, die mit-gemergt werden soll, gilt die Reihenfolge
**(1) Notiz schreiben → (2) committen + pushen (Feature-Branch, via `scripts/factory-commit.sh`,
nicht rohes `git commit`/`git push`, ADR-019) → (3) erst dann Auto-Merge freigeben**. Der
commit+push-Schritt muss im Skill sichtbar **vor** dem `gh pr merge --auto --squash`-Kommando
stehen. Ein Konsistenz-Test in `scripts/checks/tests/run-tests.sh` sichert die Reihenfolge ab
(grep auf `factory-commit.sh` vor dem Freigabe-Kommando). Verwandt mit der CLAUDE.md-Guardrail
„Task-Datei final auf dem Feature-Branch abschließen – vor dem Merge" (aus #63).

### Reihenfolge-Guards: Kommando ≠ Prosa-Erwähnung (aus #114, Implement-Selbstfund)

Ein Self-Test, der die **Reihenfolge** zweier Elemente in einer Skill-Doku prüft (Kommando A
vor Kommando B), greppt naheliegend nach der kurzen Kommandoform. Kommt dieselbe Zeichenkette
im Dokument aber **auch als Prosa-Verweis** vor, matcht `grep -n … | head -1` den *frühesten*
Treffer – und das ist womöglich die Erwähnung, nicht das Kommando. Konkret in #114: die
Reihenfolge-Assertion prüfte gegen `gh pr merge --auto`; diese kurze Form steht schon in
`pr-shepherd.md` Schritt 4 als Prosa-Hinweis (Zeile 68), lange **vor** dem echten Freigabe-
Kommando in Schritt 6 → falsches FAIL. Aufgefallen erst bei der Verifikation gegen die
**gepatchte Temp-Kopie** (nicht schon am Rot-gegen-Unpatched).

**Regel:** Reihenfolge-/Positions-Guards gegen die **distinktive, vollständige** Kommandoform
prüfen (hier `gh pr merge --auto --squash`), nicht gegen ein Präfix, das auch als Fließtext
auftaucht. Und: den Guard nicht nur „rot gegen den Ist-Stand" verifizieren, sondern zusätzlich
**grün gegen die gepatchte/gewünschte Fassung** (Temp-Kopie) – nur so fällt ein Fehl-Match auf,
der zufällig trotzdem rot war. Ergänzt `clean-code.md` „Ein Gate-Regex gehört durch einen Test
abgesichert … Positiv- **und** Negativ-Beispiel"; der subtile Fall hier ist ein *legitimer*
Prosa-Treffer, der nicht matchen darf.

### IDOR: Data-Layer DELETE/UPDATE müssen Parent-ID einschließen (aus #51, Security-Finding)

`removeZeile(zeileId)` filterte nur über `zeile.id` – ohne Bindung an die übergeordnete
`veranstaltungId`. Ein manipulierter Request mit einer offenen Veranstaltung konnte über die
offene Action-Grenze eine Zeile aus einer **anderen** Veranstaltung oder Theke löschen (IDOR).
**Fix:** Signatur `removeZeile(zeileId, veranstaltungId)`, Delete via
`and(eq(id, zeileId), eq(veranstaltungId, veranstaltungId))`.

**Regel:** Jede DELETE- oder UPDATE-Operation auf einer Zeilen-Tabelle (mit FK-Bezug auf einen
Parent) **muss den Parent-Key im WHERE einschließen** – nicht nur den Primärschlüssel der Zeile.
Nur `id` als Filterbedingung ist ein IDOR-Risiko, auch wenn RBAC auf Action-Ebene greift.
Pflicht-Begleitung: Integrationstest, der belegt, dass bei `veranstaltungId`-Mismatch `undefined`
zurückkommt und die fremde Zeile unverändert bleibt.

### Soft-Delete: `active`-Prüfung nach jedem Laden by ID (aus #51, Review-Finding)

`getTeilnehmer(id)` gab soft-gelöschte Teilnehmer (`active = false`) ohne `WHERE active = true`
zurück. Die aufgerufene Action (`addZeileAction`) prüfte `active` nicht → ein manipulierter
Request konnte einen inaktiven Teilnehmer in eine Veranstaltung eintragen, obwohl die UI ihn
nicht anzeigt.

**Regel:** Jede Funktion, die eine Entität per `id` lädt und das Ergebnis anschließend in einer
Schreiboperation nutzt, prüft explizit auf `active`:
```ts
const person = await getTeilnehmer(teilnehmerId);
if (!person || !person.active) return { error: "Teilnehmer nicht gefunden." };
```
Alternativ: `active = true` bereits im Query (z. B. `and(eq(id, …), eq(active, true))`).
Nie darauf vertrauen, dass die UI nur aktive Entitäten anzeigt – die Action ist die Grenze.

### Guard-Clause-Branches in Server Actions brauchen dedizierte Tests (aus #51, Review-Finding)

Die `!id || !veranstaltungId`-Guards an der Spitze mehrerer Server Actions hatten keine Tests.
Laut `testing-standards.md` erwartet neuer Code 100 % Coverage – aber der Reflex ist, nur
Happy-Path + bekannte Error-Paths (z. B. `23505`) zu testen, nicht die Eingabe-Guards.

**Smell:** „Wenn ich diesen Guard entferne, schlägt kein Test fehl" – dann fehlt der Test.

**Regel:** Jeder Guard-Clause-Branch an der Action-Grenze (Leerfeldprüfungen, null-Guards auf
Pflicht-IDs) erhält einen eigenen Testfall, der genau diesen Branch auslöst. Beispiel:
```ts
it("should_returnError_when_veranstaltungIdMissing", async () => {
  const formData = new FormData(); // veranstaltungId fehlt
  const result = await addZeileAction(undefined, formData);
  expect(result?.error).toBeDefined();
});
```

### AC mit Direktive + Begründung: je separierbaren Teil eine eigene Assertion (aus #117, /test-Selbstfund)

Der `#117`-Doc-Guard prüfte, ob `pr-shepherd.md` Schritt 2 das Seam-**Kommando**
(`factory-commit.sh`) nennt – deckte damit aber nur AC1 ab. Die Task hatte ein zweites,
im selben Absatz stehendes Kriterium (AC2): die **fail-closed-Begründung mit ADR-019-Verweis**.
Kommando und Begründung stehen auf **getrennten, einzeln entfernbaren Zeilen** – ein
Presence-`grep` auf das Kommando lässt die Begründung ungetestet. Aufgefallen erst in `/test`,
nicht schon in `/implement`: der Reflex ist, den auffälligsten Token (das Kommando) zu prüfen und
den begleitenden Kontext (Rationale, ADR-Verweis, Warnung) als „mitgetestet" anzunehmen.

**Smell (erweitert #51):** „Entferne ich die **Begründung**, lasse aber das **Kommando** stehen –
schlägt ein Test fehl?" Wenn nein, ist das Begründungs-Kriterium ungetestet.

**Regel:** Bündelt ein Akzeptanzkriterium eine **Direktive** (Kommando/Config-Wert) **und** ihre
**Rationale** (Begründung, ADR-Verweis, Warnung), und liegen beide auf getrennt editierbaren
Zeilen, bekommt jeder separierbare Teil eine **eigene** Assertion – nicht einen gemeinsamen Grep.
Pflicht-Begleitung: Negativ-Nachweis, der die Unabhängigkeit belegt (Begründung entfernen →
Begründungs-Guard **rot**, Kommando-Guard **grün**). Deckt sich mit `testing-standards.md`
(je Kriterium ein Test) und der Positiv-**und**-Negativ-Beispiel-Regel aus `clean-code.md`.

---

## Offene Architektur-Fragen

> Noch nicht entschiedene Fragen, die eine ADR benötigen.

_Derzeit keine offenen Fragen._

> **Erledigt (ADR-024, #120):** Die Frage nach dem Route-Schnitt des Veranstaltungs-Bereichs
> (`/abrechnung/veranstaltung` – Bereich- vs. Ressource-zuerst) ist entschieden: Bereich nach
> der Entität benennen → **`/veranstaltung`** (Liste) + **`/veranstaltung/[id]`** (Detail), je
> Lifecycle-Phase eine Unterroute. Zugleich Rolle `abrechner` → `veranstalter` umbenannt.
> Details in [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).
