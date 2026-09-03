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
- **Katalog** – pflegbare Preisliste je Kategorie (`getraenk`/`kaffee`/`essen`); **Kaffee**
  und **Essen** sind Katalogartikel mit **festem** Preis (Essen = Kategorie `essen`, kein
  Veranstaltungs-Property), gewählt bei der Erfassung (ADR-023 §D4/§D7, #116).
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
  Kasse**. Ein laufender Saldo über mehrere Veranstaltungen ist noch nicht umgesetzt (Backlog #57).

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

**Routen-Übersicht:** Alle Seiten und API-Route-Handler mit Pfad, Funktion und Zugriff
(Rolle/öffentlich) stehen kuratiert in [`docs/routes.md`](../routes.md). Kanonische Quelle bleibt
der Code (`app/**/page.tsx`, `app/api/**/route.ts`); die Übereinstimmung sichert der Drift-Check
`scripts/checks/routes-doc-check.sh` fail-closed im Push-Gate.

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
>
> **Volltext ausgelagert (ADR-037):** Die vollständigen Learnings stehen thematisch
> getrennt unter [`docs/factory/lessons/`](lessons/) und sind **nicht** mehr `@import`-
> geladen – bei Bedarf die passende Datei gezielt lesen. `/codify` schreibt neue Learnings
> dorthin (Volltext) **plus** eine Index-Zeile hier, nicht mehr in diesen Abschnitt.
>
> **Bedarfsgesteuertes Laden:** Der Index (unten) trägt je Eintrag/Gruppe einen
> **„Laden bei"-Trigger** (Skill + Situation). Beim Start eines Skills nur die Lessons öffnen,
> deren Trigger zum **laufenden Skill** und zur **Domäne der Task** passt – nicht alle
> `lessons/` vorsorglich lesen. Beispiel: `/pr-shepherd` lädt nur die `/pr-shepherd`-Zeilen aus
> `factory-workflow.md`; eine `/implement`-Task an einer Server Action lädt `db-drizzle.md`
> (+ ggf. `frontend-react.md`), aber nicht `next-auth.md`, wenn kein Auth/Routen betroffen ist.

### Kern-Kurzregeln (immer geladen)

> Die wenigen Regeln, die praktisch **jede** Feature-Task berühren (Data-Layer/Validierung),
> bleiben als Einzeiler inline. Volltext + Begründung je in der verlinkten Lesson.

1. **Drizzle `.returning()` bei UPDATE/DELETE → Rückgabetyp `T | undefined`** (nicht `T`); bei No-Match ist das Array leer. → [`lessons/db-drizzle.md`](lessons/db-drizzle.md)
2. **IDOR: DELETE/UPDATE auf Zeilen-Tabellen führen den Parent-Key im `WHERE` mit** (nicht nur den Primärschlüssel). → [`lessons/db-drizzle.md`](lessons/db-drizzle.md)
3. **Soft-Delete: nach jedem Laden by ID `active` prüfen, bevor geschrieben wird** (die Action ist die Grenze, nicht die UI). → [`lessons/db-drizzle.md`](lessons/db-drizzle.md)
4. **Zod: Felder auf `int4`/`text` bekommen eine Obergrenze** (`.max`/`.refine`), sonst ist der DB-Overflow die einzige Fehlergrenze. → [`lessons/db-drizzle.md`](lessons/db-drizzle.md)

### Index der ausgelagerten Learnings

> Eine Zeile je Learning (Titel + Herkunfts-Issue), gruppiert nach Ziel-Lesson-Datei. Jede Gruppe
> nennt einen **„Laden bei"-Trigger** (Skill + Situation); wo eine Datei gemischte Auslöser hat
> (`factory-workflow.md`), steht der Trigger `→ …` je Zeile. Danach entscheiden, welche Lesson der
> aktuelle Skill wirklich braucht.

**[`lessons/frontend-react.md`](lessons/frontend-react.md)** – React/UI, Client Components, route-neutrale UI-Bausteine · **Laden bei:** `/implement`, `/review` bei React/UI-Komponenten

- `useActionState` + Inline-Toggle: ESLint `react-hooks/set-state-in-effect` (aus #49)
- Route-neutrale Module: keine Feature-Imports beim Implementieren prüfen (aus #52, Review-Finding)
- Formular-Reset nach jeder Erfassung: key-Remount wirkt nur einmalig (aus #53, Review-Finding W1)
- `aria-modal="true"` ist ein Versprechen, kein Automatismus – Fokus-Trap explizit bauen + alle Branches testen (aus #134)
- Schreib-Gate darf die Lese-Ansicht nicht mitverstecken – vorhandenes `editable`-Flag nutzen (aus #54, Review-Runde-1-Finding)
- `setState`-Updater-Funktionen müssen rein bleiben – keine Seiteneffekte darin (aus #183, Review-Runde-1-Finding)
- Layout-abhängige DOM-Aktion nach layout-änderndem `setState` erst im nächsten Frame; sticky Header braucht `scroll-margin-top` am Ziel (aus #188)
- Route-neutrale Komponente: Fremd-Layout-Offset vom Konsumenten via `className` steuern, nicht hardcoden/an fremd-semantischen Prop koppeln (aus #188, Review-Finding; Nachtrag aus #187)
- Verschieben eines route-neutralen Moduls: alte Datei löschen ist Teil des Moves, nicht optional (aus #187, Review-Eskalation Runde 1–4)
- `.map`-Key aus Anzeigefeldern statt stabilem Identifier ist eine latente Kollisionsquelle (aus #206, Review-Runde-2-Finding)

**[`lessons/next-auth.md`](lessons/next-auth.md)** – Next.js-Framework, `proxy.ts`, NextAuth/Session, öffentliche Routen · **Laden bei:** `/implement`, `/review` bei Auth/`proxy.ts`/Routen

- Next.js 16: Middleware heißt `proxy.ts` (aus #48)
- NextAuth v5: Custom-Session-/JWT-Claims typisieren (aus #48)
- Öffentliche API-Routen aus dem Auth-Proxy ausnehmen (aus #63)
- Auto-Prefetch geschützter Routen belebt die Session nach dem Abmelden wieder (aus #164)

**[`lessons/db-drizzle.md`](lessons/db-drizzle.md)** – Drizzle ORM, Migrationen, IDOR, Soft-Delete, Joins, guarded UPDATE, Zod-Obergrenzen · **Laden bei:** `/implement`, `/review`, `/test` bei Data-Layer (Drizzle)

- Drizzle-Migration bei Enum-Wert-Wechsel / Spalte→Array (aus #48)
- Drizzle UPDATE/DELETE: `.returning()` liefert `T | undefined`, nicht `T` (aus #50, Refactoring-Finding)
- Zod-Schema: Obergrenze für Integer-mapped Inputs fehlt (aus #49, Security-Hint)
- IDOR: Data-Layer DELETE/UPDATE müssen Parent-ID einschließen (aus #51, Security-Finding)
- Soft-Delete: `active`-Prüfung nach jedem Laden by ID (aus #51, Review-Finding)
- Orphan-sichere Joins: Snapshot-Referenz kann verschwinden, auch wenn die Business-Entity bleibt (aus #53, Review-Finding K1)
- Guarded UPDATE bei Status-Transition-Actions: `undefined`-Rückgabe auswerten, nicht `{ok:true}` annehmen (aus #55, Review-Runde-1-Finding W1)

**[`lessons/testing.md`](lessons/testing.md)** – Vitest, Coverage, Guard-Tests, Zod-Meldungs-Tests · **Laden bei:** `/implement`, `/test` beim Testschreiben/Coverage

- Vitest + Testing Library ohne `globals: true` (aus #48)
- Guard-Clause-Branches in Server Actions brauchen dedizierte Tests (aus #51, Review-Finding)
- AC mit Direktive + Begründung: je separierbaren Teil eine eigene Assertion (aus #117, /test-Selbstfund)
- Zod-Fehlermeldung: Ablehnungs-Test ≠ Meldungs-Test (aus #116, Review-Runde-1-Finding)
- Neue gesourcte Lib in run-pipeline.sh → alle Temp-Repo-Scaffoldings in run-tests.sh mitkopieren (aus #197)
- Layout-Timing-Test-Stub (rAF) vor dem Neuschreiben im selben Verzeichnis suchen, nicht duplizieren (aus #194, Review-Finding)
- Callback-Prop nur durch Codelesen belegt ist keine Testabdeckung – Coverage-Report gegen jedes Review-Positiv gegenprüfen (aus #187, /test-Selbstfund)
- Spiegel-/Symmetrie-Akzeptanzkriterien beide Richtungen explizit assertieren – Wiring-/Abwesenheits-Guard ersetzt die zweite Assertion nicht (aus #211, Review-Finding)
- Strict-mode-/Umgebungs-Kontrakt-Tests auf die Fehler-/No-Match-Zweige legen, nicht den früh-returnenden Happy-Path (aus #207, Review-Finding W3)
- Deterministisches Gate/Backstop im Orchestrator-Skript braucht E2E-Verhaltenstest, nicht nur Wiring-Grep (aus #212, Review-Finding)
- Negativ-Test mit mehreren Fail-Pfaden auf den Ziel-Pfad isolieren (nur er darf greifen) + pfadspezifisches Signal assertieren – sonst grün aus dem falschen Grund (aus #214, Review-Finding W1)
- Kopplungs-/Drift-Guard (liest Quelle A, prüft gegen B): je Seite ein eigener Negativtest (A brechen / B brechen) + Fail-closed bei unlesbarer Quelle (aus #214, /test-Selbstfund)
- ESLint-Ignore-Config verhaltensbasiert testen (`isPathIgnored`, nicht Config-Array) + Diskriminierungs-Kontrolle in der Gegenrichtung (bekanntes Nicht-Mitglied → `false`) (aus #172, /test-Selbstfund)
- Row/Cell-Index-Assertions gegen einen gerenderten Report sind Magic Numbers – Herleitung sofort mitschreiben, nicht erst im Review (aus #189, Review-Runde-1-Finding)
- Flaky Timeout durch unamortisierten teuren Erst-Aufruf: in `beforeAll` mit eigenem endlichem Timeout aufwärmen, nicht global das Timeout erhöhen (aus #238)
- Neue Regressions-Assertion-Schleife gegen bereits vorhandene Schleife mit identischem Rumpf abgleichen, bevor eine parallele Schleife angelegt wird (aus #240, /test→/refactor-Diskrepanz)
- 4. Vorkommnis desselben Smells auf Einzel-Assertion-Ebene: sechs neue Präsenz-/Abwesenheits-Checks in `run-tests.sh` reimplementierten inline den Rumpf der bereits vorhandenen Helfer `assert_contains_286`/`assert_absent`, statt sie aufzurufen – erst `/refactor` bemerkte es, nicht `/implement` (aus #267, /implement→/refactor-Diskrepanz)
- 5. Vorkommnis desselben Smells auf Test-Scaffolding-Ebene: eigene parallele Repo-Scaffold-Funktion (`scaffold_310`) statt Aufruf + Differenz-Ergänzung auf der bestehenden `_mk_pipe_repo` – in `/implement` selbst per Review-Rework korrigiert (aus #310, Review-Runde-1-Finding W3)
- `grep -qF`-Fixed-String-Regressionstest gegen Markdown-Prosa: beim Umbrechen die Testphrase auf einer Zeile halten, sonst lautlos rot – gilt in beide Richtungen (Prosa ändern UND neuen Test gegen bestehende Prosa schreiben) (aus #240/#249; viertes Vorkommnis aus #286, /test-Selbstfund – ab zwei Mehrwort-Checks gegen dieselbe Datei lohnt ein zeilenumbruch-toleranter Lese-Helper mehr als Zeilen-für-Zeile-Vorsicht)
- Mutationsbeleg muss denselben Assert-Ausdruck (inkl. Negation/Vergleich) ausführen, nicht nur denselben Grundbefehl – sonst beweist er nur Syntax/Quoting, nicht Kausalität zum echten Guard (aus #286, Review-Runde-2-Finding)
- „Kein Argument übergeben"-Test simuliert nicht automatisch Abwesenheit, wenn das Skript einen `${N:-$REPO_ROOT/...}`-Default auf einen echten, existierenden Repo-Pfad hat – garantiert fehlenden Pfad explizit übergeben (aus #254, Review-Finding)
- YAML-Testfixture per `printf >>` an eine Kopie mit bereits vorhandenem Top-Level-Key anhängen erzeugt ein Duplicate-Key-Dokument (yq „last-key-wins") – Test besteht nur zufällig; echten `yq -i eval`-Merge nutzen (aus #255, Review-Runde-3-Finding)
- Rezidiv des #240-Duplikat-Schleife-Learnings trotz vorhandener Lesson: mehrdeutiger Spec-Wortlaut („Werteliste ergänzen **oder** neue Schleife daneben platzieren") bot die vom Lesson-Text bereits verbotene Alternative als scheinbar gleichwertige Option an – bei Widerspruch zwischen Spec und Lesson gilt der Lesson-Text (aus #251, Review-Runde-1-Finding)
- Neuer git-Repo-Fixture-Helper, der committet, braucht lokale Git-Identität (`git config user.email`/`user.name`) – ohne sie läuft er nur zufällig, weil die lokale Entwicklungsumgebung meist einen Fallback liefert; in identitätsloser Umgebung schlägt der Commit fehl (aus #265, Review-Finding)
- Positions-/Zustand-Freeze-Test braucht vor dem Zielfall eine echte, divergenzerzeugende Aktion – sonst können weder Reihenfolge- noch Status-Assertion zwischen „Freeze wirkt" und „kein Freeze da" unterscheiden (aus #253, dreifach in Review-Runde 1–3 gefunden)
- Positivkontrolle für einen Mutations-Fixture (belegt Datei-Existenz/Parsbarkeit gegen einen Fail-closed-Pfad wie AK6) darf keinen bereits vorhandenen Mutanten wiederverwenden, der selbst eine Fail-closed-Vorbedingung des Kontroll-Guards verletzt – RED-vor-GREEN gilt auch für die Kontrolle selbst (aus #284, Review-Runde-2-Nitpick + /test-Selbstfund)
- Zähl-Assertion in einem per `awk` extrahierten Funktionsrumpf: das Label darf nur behaupten, was das Extraktionsfenster abdeckt – ruft die als isoliert behandelte Funktion denselben Wert über eine externe Hilfsfunktion außerhalb des Fensters erneut ab, gehört das explizit ins Label, sonst übernimmt eine spätere Review-Runde die falsche Zusammenfassung ungeprüft (aus #312, Review-Runde-3-Finding W1)
- Neuer EXIT-Trap/Hook, der ein externes CLI aufruft, aus einem von mehreren bestehenden echten Pipeline-Tests geteilten Scaffold heraus: Stub fürs CLI ins Scaffold selbst legen, nicht auf ambientes Fail-Fast der Testmaschine verlassen (aus #314, Review-Runde-2-Finding)

**[`lessons/build-tooling.md`](lessons/build-tooling.md)** – pnpm, Turbopack/Vercel-Bundling, Typecheck-Gate, gitignore-Artefakte · **Laden bei:** bei Build/CI/Dependencies/Vercel-Bundling

- Debug-/Lint-Artefakte nicht durch .gitignore gedeckt (aus #67); wiederholt bei Wegwerf-E2E-Verifikation + unverifizierter „ist gitignoret"-Behauptung im Dateikommentar (aus #324)
- Lint/Vitest fangen keine Typfehler – Gate-Lücke bis zum manuellen `pnpm build` (aus #137)
- pnpm@11: `overrides`/Settings gehören in `pnpm-workspace.yaml`, nicht ins `package.json`-`pnpm`-Feld (aus #167)
- Turbopack/Vercel: Node-Libs mit Laufzeit-`fs.readFileSync(__dirname + …)` externalisieren (aus #193)
- Verschachtelte alte `@types/node`-Kopie (transitive Dependency) kollidiert mit generischem `Buffer`-Typ bei TS≥5.7 – Cast über die Ziel-Funktionssignatur, nicht `as unknown as Buffer` (aus #189)
- `pnpm audit` scheitert in dieser Sandbox an einem Gzip-Decoding-Bug – Registry-Endpoint direkt per `curl` + manuellem `gunzip` abfragen liefert echte Advisory-Daten statt nur des Lockfile-Ersatzkriteriums (aus #228, /security-review-Selbstfund)
- Override-Ziel-Range immer als Caret innerhalb derselben Major-Linie (nicht offenes `>=`), bei Advisories in zwei Major-Linien disjunkte Selektoren; ein „No-op"-Verdacht auf einen Override ist zu messen (entfernen, neu auflösen, Version prüfen), nicht aus der Parent-Range anzunehmen (aus #291, Review-Runde-1/2-Findings)
- `pnpm audit` zeigt bei Paketen mit mehreren parallel gepflegten Major-Linien (z. B. `brace-expansion`) nur eine Range-Gruppe, die nicht zur per `pnpm why` aufgelösten Version passen muss – vor „echtes Finding" die volle GHSA-Advisory-Liste (`vulnerabilities[]` komplett) gegenprüfen (aus #231, /security-review-Selbstfund)

**[`lessons/code-style.md`](lessons/code-style.md)** – Clean-Code-Muster (Naming, Kommentar-Ort) · **Laden bei:** `/refactor`, `/review` (Clean-Code)

- WHAT-Kommentar am Modul-Level (aus #67, Refactoring-Finding)
- Neue `lib/`-Module domänenspezifisch benennen, kein generisches `utils` (aus #105, Review-Finding)
- Fail-Safe/Guard symmetrisch auf alle Inputs einer Vergleichsoperation (aus #197, Review-Finding)
- Zähl-/Aufzählungs-nennender Modul-Header („stellt EINE Funktion bereit") beim Hinzufügen einer Einheit mitpflegen (aus #207, Review-Finding W1)
- Magic-Number-Konsistenz-Bewertung braucht projektweiten Grep, nicht nur Datei-/PR-lokalen Vergleich (aus #142, Review→Refactor-Diskrepanz)
- Neue Verfügbarkeits-/Capability-Prüfung (`command -v` o. ä.) gegen bereits vorhandene im selben File abgleichen, statt eine dritte Schreibweise einzuführen (aus #224, Review-Runde-1-Finding)
- Fix für falschen WHY-Kommentar (falsche Kausalkette) per Grep auf kopierte Geschwister-Stellen im selben PR ausweiten, nicht nur die gemeldete Zeile fixen (aus #264, Review-Runde-1-Finding, Rezidiv in Runde 3)
- „Empirisch verifiziert" im Kommentar ohne tatsächliche Prüfung in dieser Session – Rezidiv an anderer Stelle trotz Fix, plus Versionsangabe unbemerkt auf 7 Stellen kopiert (aus #268, Review-Runde 2 W3 + Runde 4 W1)
- JSDoc auf einem geteilten Options-Interface, die einen konkreten Produktionswert nennt, driftet beim zweiten Konsumenten mit abweichendem Wert – gleiches Muster an einem Nachbarfeld derselben Struktur übersehen (aus #182, Review-Runde 1 W2 + Runde 2 Nitpick 1)

**[`lessons/factory-workflow.md`](lessons/factory-workflow.md)** – Git/CI, Pipeline-Skills, Patch-Workflow, Branch/Label, Review-Scope, Terminologie-Sweep, kanonische Quellen, Blocker · **Laden bei:** je Eintrag unterschiedlich – Trigger je Zeile

- Agenten-Blockerverhalten (aus Task 002 / K-01, K-02) → jeder Skill – beim Blockieren/Abbruch
- Kanonische Quellen immer referenzieren (aus Task 002 / W-02, W-03) → `/codify`, `/implement` – bei Regel-Listen
- Fast-Forward-Pushes aus CI brauchen vollen Verlauf (aus Task 42, bei Live-Verifikation #40) → CI-/Deploy-Gate-Arbeit
- Branch-Typ und Label korrigieren wenn Scope über die initiale Annahme hinauswächst (aus #120) → `/architecture`→`/implement` – Branch/Label
- Branch-Protection required Checks: nur `pull_request`-getriggerte Jobs (aus #155) → CI-/Ruleset-Arbeit
- Report-Guard: Stale-Verdict bei Pipeline-Re-Lauf (aus #91, Review-Finding; Within-Run-Variante in der Review-Iterationsschleife aus #310, Task-308-Selbstfund; Frische-Fingerprint pro `run_skill`-Aufruf umgesetzt in #310; symmetrisch auf den Exit-0-Rückkehrpfad ausgeweitet + Verdict-Gültigkeit verlangt + Security-Gate fail-closed in #312) → `/pipeline` (run-pipeline.sh)
- `.claude/**`-Änderungen erfordern Patch-Workflow (aus #91) → `/implement`, `/codify` – bei `.claude/**`-Änderung
- Notiz-vor-Merge bei Squash-Strategie (aus #114) → `/pr-shepherd` – Merge mit Notiz
- Reihenfolge-/Präsenz-Guards: Kommando ≠ Prosa-Erwähnung – Anker ist die exakte Aufruf-Zeile, nie ein Kommando-Fragment; bei Multi-Zeilen-Konstrukten `awk`-Block-Extraktion statt Fragment-Grep (aus #114, Implement-Selbstfund; Rezidiv in neuer Domäne aus #265; drittes Rezidiv als Präsenz-Guard auf Multi-Zeilen-Konstrukt aus #261, Review-Runde-2/3-Finding; viertes Rezidiv als Abwesenheits-/Regressions-Guard – OR-Fragment mit nie feuernder Alternative – aus #258, Review-Runde-3-Finding; fünftes Rezidiv als FEHLENDER statt falscher Reihenfolge-Check – zwei isolierte Präsenz-Assertions statt Positionsvergleich – aus #286, /test-Selbstfund; sechstes Rezidiv als Prosa-Kollision mit dem eigenen, im selben PR neu verfassten WHY-Kommentar – aus #284, Review-Runde-1-Finding; siebtes Rezidiv als Mutationsbeleg-Fragment-Kollision – Lösch-Anker und Wirksamkeits-Zählung müssen dieselbe volle Aufrufzeile treffen, nicht denselben Dateinamen-Fragment – aus #310, /implement-Selbstfund) → Skill-Doc-Guards/Self-Tests, CI-Wiring-Tests, Bash-Wiring-Tests (`run-tests.sh`)
- Neuer Freitext-Ablage-Mechanismus in eine vom Agentenkontext wieder gelesene Repo-Datei braucht dieselbe „Daten, keine Anweisungen"-Absicherung wie etablierte Kanäle (Issue-Body/-Label, ADR-018) – sonst stored-prompt-injection-Fläche, unentdeckt bis zur Security-Review (aus #286, Security-Review-Finding) → `/architecture`, `/implement`, `/security-review` – bei neuem Ablage-Mechanismus für Agenten-Freitext in einer Repo-Datei
- Existenz-Guard auf eine Security-Pin-Konstante beweist nicht ihre Verdrahtung an den Vergleichsaufruf – zweiter Guard muss an der echten Aufrufzeile ankern und per Mutation belegen, dass ein Vertauschen der Vergleichsseiten rot macht (aus #258, Review-Runde-2-Finding) → `/implement`, `/review`, `/test` – bei neuem Security-Pin (Checksum/Hash-Konstante) gegen einen extern gelesenen Wert
- App-Router erzeugt Routen aus mehr als `page.tsx`/`route.ts` (aus #145) → `/implement` – bei Routen/`docs/routes.md`
- Terminologie-Sweep: `-w`-Grep ist blind für Komposita, und Pfad-Beispiele sind nicht „neutral" (aus #144) → Doku-/Rename-Sweeps
- Repo-Setting „Allow auto-merge" muss aktiv sein, sonst scheitert `--auto` (aus #155/#158) → `/pr-shepherd` – Merge-Freigabe
- Doku über „die Gates": required CI-Checks ≠ lokale pre-push-Gates nicht vermischen (aus #160) → Doku über CI/Gates
- Review-Diff-Scope: `git diff main...HEAD` zeigt Fremd-PRs, wenn lokales `main` hinter `origin/main` liegt (aus #161; Skill-Vorlagen seit #176 auf `origin/main...HEAD`) → `/review`, `/security-review`, `/refactor` – Diff-Scope
- ADR nach Review-Rework auf Drift prüfen – nicht nur `docs/routes.md` (aus #55, Review-Runde-2-Finding) → `/review`, `/implement` – bei ADR-Änderung
- Turn-Limit-Exhaustion (ursprünglich `/refactor`): Retry ohne Gedächtnis baut auf halbfertigem Fremd-Stand auf (aus #185); tritt auch ohne Code-Diff auf, Orchestrator prüft vor Retry nicht auf `git status` (aus #264, Härtung ausgelagert: #275); drittes Vorkommnis bei `/implement` bestätigt – Defekt ist orchestrator-weit, nicht `/refactor`-spezifisch (aus #324) → `/pipeline`, jeder code-schreibende Skill – bei Turn-Limit
- Verlustfreie Doku-Migration/Split: skriptbasiert + Byte-Reconstruction-Assertion (aus #196) → `/implement` – bei Doku-Migration/Split
- ADR-Status beim Implementieren einer frisch erstellten ADR auf Accepted flippen (aus #197, Review-Finding) → `/implement`, `/review` – bei ADR-Umsetzung
- PR ändert die von einer ADR namentlich beschriebene Mechanik → ADR-Beschreibung im selben PR mitpflegen (ergänzt #55; triggert auch ohne ADR-Datei-Änderung) (aus #211, Review-Finding) → `/implement`, `/review` – bei Code-Änderung, die eine ADR beschreibt
- Auch Lesson-/Kontext-Doku im Präsens beschreibt eine Mechanik / nennt einen offenen „Follow-up (#N)" – erledigt der PR die Mechanik/den Follow-up, dieselbe Prosa im selben PR nachziehen (erweitert #211 über ADRs hinaus; historische Vorfall-Narrative bleiben) (aus #176, Review-Finding) → `/codify`, `/review` – bei Doku, die die geänderte Mechanik/einen erledigten Follow-up beschreibt
- Test einer `.claude/**`-Patch-Lieferung prüft den Endzustand der committeten Live-Datei, nicht das transiente Patch-Artefakt (ergänzt #145) (aus #212, Review-Finding) → `/implement`, `/review`, `/test` – bei Test zu einer `.claude/**`-Patch-Änderung
- Neuer Interrupt-Typ → OPERATING.md-Interrupt-Tabelle mitpflegen (kanonische Registry, kein Gate) (aus #212, Review-Finding) → `/implement`, `/review` – bei neuem `raise-interrupt.sh`-Typ
- Vorbestehenden, scheinbar unabhängigen Bash-Suite-Testfehlschlag mit Hunk-Scope- + Referenz-Check belegen, nicht nur behaupten (aus #239, /review-Selbstfund) → `/review`, `/test` – bei vorbestehendem, scheinbar unabhängigem Testfehlschlag
- Neuer Worktree hat kein `.env.local` → irreführender `CredentialsSignin`-E2E-Fehlschlag ist Umgebungsproblem, keine Regression (aus #228, /implement-Selbstfund; Root-Cause-Fix in #236 umgesetzt: `start-work.sh` kopiert die Datei jetzt automatisch, offen bleibt nur `pnpm db:seed`) → `/implement` – bei erstem E2E-Lauf in neuem Worktree
- Permission-Regeln in `.claude/settings.json`: slash-freie Muster matchen auf jeder Tiefe (Root-Anker = führender Slash), `Write(pfad)`-Regeln werden von Claude Code aktuell gar nicht ausgewertet (aus #224, claude --print-Verhaltensprobe) → `/implement`, `/security-review` – bei neuer `.claude/settings.json`-Permission-Regel
- Neue Edit-Freigabe auf bislang gesperrter Config-Klasse: prüfen, ob sie Review-/Security-Review-Tier-Parameter steuert und ob deren Validierung einen Mindest-Floor erzwingt (aus #224, Security-Review-Finding, Issue #241) → `/security-review` – bei neuer Edit-Freigabe auf Pipeline-Config
- Real-vs-environmental-Einordnung eines gemeldeten Testfehlschlags braucht Wiederholung (isoliert + volle Suite + CI-Historie), nicht nur Diff-Scope-Analyse (aus #244, /requirements-Selbstfund) → `/requirements`, `/review`, `/test` – bei Einordnung eines nicht mehr reproduzierbaren Testfehlschlags
- Ein Floor auf einen Lookup-Key (Tier-Label, Rollen-Name, Environment-Name) ist kein Floor auf die Zielseite der Indirektion (`model_tiers` u. ä.) – Zielseite mitprüfen oder als eigenes Issue benennen (aus #241, Security-Review-Finding, Issue #249) → `/security-review`, `/implement` – bei Config-Gate mit Pin auf einen Lookup-Key
- Write-Tool-Zielpfad im Worktree explizit gegen den Worktree-Suffix prüfen, nicht dem Bash-cwd vertrauen (der nach jedem Bash-Aufruf auf den Hauptbaum zurückspringt) (aus #240, /implement-Selbstfund) → jeder Skill – bei neuer Datei per `Write`-Tool in einer Worktree-Session
- Divergiertes `origin/main` während laufender Pipeline: Rebase-Verantwortung bleibt bei `/pr-shepherd` (`gh pr update-branch`, kein Force-Push) – ein Zwischenschritt rebast nicht eigenständig gegen `main`, sonst erzwingt das einen Force-Push, den `factory-commit.sh` bewusst nicht anbietet (aus #249, /refactor-Selbstfund) → `/review`, `/test`, `/refactor`, `/security-review` – bei divergiertem `origin/main` auf bereits gepushtem Feature-Branch
- `awk`-Job-Block-Isolation in CI-Wiring-Tests muss auch am Job-Trennkommentar (`# ───`) abbrechen, nicht nur am nächsten Job-Key – sonst bluten Kommentarzeilen des Folge-Jobs in den extrahierten Block hinein (aus #255, Review-Runde-1-Finding) → `/implement`, `/review` – bei neuem `awk`/`sed`-Block-Extraktor für einen CI-Job in `run-tests.sh`
- Fix zwischen zwei Runden einer laufenden Multi-Agenten-Kette sofort committen (nicht erst am Ende bündeln) – sonst sieht eine spätere Runde, die ihren Kontext per `git diff origin/main...HEAD` bezieht, einen veralteten Stand (aus #251, Review-Runde-3-Finding) → `/review`, `/security-review` – bei Fix zwischen zwei Runden einer laufenden Review-Kette
- `PR_SHEPHERD`/`FACTORY_STAGE` in der aufrufenden Shell exportiert schlagen in jedes von der Testsuite erzeugte Wegwerf-Repo durch und lösen dort ungewollt Pipeline-Phasen aus – vor der Einordnung als Regression mit `unset` gegenprüfen (aus #262, Task-Selbstfund; Härtung umgesetzt in #264 – gilt weiter für andere Skripte mit eigenen Env-Schaltern) → `/implement`, `/test`, `/review` – bei rotem, diff-unabhängigem E2E-Test während `PR_SHEPHERD`/`FACTORY_STAGE` exportiert sind
- Neuer `pre-push.sh`-Check, der lokalen Installationszustand voraussetzt (nicht nur Repo-Inhalt): bestehende Self-Tests, die `pre-push.sh` echt gegen das reale `FACTORY_DIR` aufrufen (kein Fixture), brechen in CI, wenn dieser Zustand dort nie erfüllt ist – CI muss den Zustand vor der Self-Test-Suite herstellen, nicht den Check abschwächen (aus #265, User-gemeldete CI-Regression) → `/implement`, `/review` – bei neuem `pre-push.sh`/`pre-commit.sh`-Check mit Abhängigkeit von lokalem Umgebungszustand
- Frisch im selben PR erstellte/geänderte Spec braucht denselben Drift-Check wie ADRs/Lessons – Code gegen die eigene Spec-Prosa spiegeln, nicht die Spec unhinterfragt als Maßstab nehmen (aus #253, Review-Runde-3-Finding) → `/review` – bei Spec, die im selben PR entstanden/geändert wurde
- „Nicht allow-gelistet" ist kein Umgebungs-Blocker, solange der Wrapper-Skript-Weg (`scripts/*.tmp.sh`, bereits erlaubt über `Bash(bash scripts/*)`) ungeprüft ist – nur eine echte Datei-Zugriffssperre (z. B. `.env*` unter Deny) ist ein echter Blocker (aus #291, zwei Rework-Runden verloren) → jeder Skill – vor dem Dokumentieren eines Umgebungs-/Berechtigungs-Blockers
- `kleinfunde.md`-Eintrag mit `Datei:Zeile`-Ankern, im selben PR angelegt, braucht denselben Drift-Check wie ADR/Lesson/Spec (#211/#176/#253) – auch wenn die Drift-Quelle die eigenen Folge-Commits derselben Task sind (aus #291, Review-Finding) → `/review`, `/security-review` – vor Merge-Freigabe, wenn dieser PR selbst einen `kleinfunde.md`-Eintrag angelegt hat
- Fork-Subagent für eine Review-Runde: eigene Turns (z. B. `ScheduleWakeup`-Wartetexte) nach dem Spawn können in seinen Kontext bluten – lieferte hier statt echter Findings nur eine Paraphrase des eigenen Wartetexts zurück; Ergebnis bei Verdacht per `TaskOutput` gegenprüfen, nicht nur der kurzen `<result>`-Zusammenfassung vertrauen (aus #298, Selbstfund während `/review`) → `/review`, `/security-review` – bei Nutzung von Fork-Subagenten für Review-/Analyse-Runden
- Rezidiv des #298-Fork-Kontamination-Learnings: der empfohlene Resume-mit-Korrektur verschlimmerte die Konfusion statt sie zu beheben – der Fork erklärte die Korrektur zum Prompt-Injection-Versuch, hielt an einer falschen Selbstwahrnehmung (er sei die Haupt-Session) fest und fabrizierte einen falschen Fortschrittsstatus für nie beauftragte Runden. Regel verschärft: Resume ist ein einmaliger Versuch, kein zweiter Retry – danach die Runde ohne Fork-Delegation direkt im Orchestrator-Kontext durchführen (aus #267, Selbstfund während `/review`) → `/review`, `/security-review` – wenn ein per `TaskOutput` verifizierter Fork nach einem Korrektur-Resume weiterhin keine echten Findings liefert
- Review-Sub-Agent kann eine falsche Bash-/Shell-Verhaltensbehauptung selbstsicher als „empirisch geprüft" ausgeben (anders als #298/#267: hier lieferte der Agent echte, aber inhaltlich falsche Findings) – jede technische Tatsachenbehauptung über Sprach-/Shell-Semantik in einem Kritisch-/Wichtig-Finding selbst mit einem Standalone-Repro nachvollziehen, bevor sie in den Report übernommen wird (aus #314, Selbstfund während `/review`; Bash-Detail in `docs/factory/guidelines/bash-gotchas.md` #12) → `/review`, `/security-review` – bei einer Kritisch-/Wichtig-Einstufung, deren Begründung eine überprüfbare Verhaltensbehauptung ist
- Anker-Liste einer Fail-safe-Klassifizierungsregel (z. B. das `factory-pipeline`-Aspekt-Label) drei Runden lang nur auf Vollständigkeit/Nicht-Überlappung geprüft, nie auf Vorhersagekraft gegen den echten Repo-Inhalt – ein Anker (`docs/specs/`) erwies sich erst in Runde 4 als nahe 50/50-Münzwurf statt Trennlinie, weil er eine Ablagekonvention statt eine Subsystem-Grenze kodierte (aus #315, Review-Runde-4-Finding) → `/implement`, `/review` – bei neuem oder geprüftem Pfad-Anker in einer Fail-safe-Klassifizierungs-/Tie-Break-Regel
- AK mit Pflichtinhalt in der PR-Beschreibung selbst (nicht in einer Repo-Datei) wird vom Standard-Draft-Body aus `start-work.sh` nicht automatisch erfüllt – kein Commit-Schritt zieht ihn nach, erst `/review` deckt die Lücke per `gh pr view --json body` auf; Inhalt per `gh pr edit <nr> --body "..."` explizit nachziehen, spätestens vor `/review` (aus #233, Review-Runde-1-Finding) → `/implement`, `/review` – bei einem Spec-AK, das Inhalt in der PR-Beschreibung selbst fordert
- Content-scannender Anti-Regressions-Guard (`grep -r` über ein ganzes Verzeichnis, nicht nur Wiring-Anker) ist blind für Tracked-Status – ein gitignoretes `*.tmp.*`-Scratch-Artefakt aus einer vorherigen Session kann das verbotene Muster rein textuell enthalten (auch als Log-Zeile einer bestandenen Assertion); bei unerwartetem Rot zuerst `git status --ignored` prüfen, nicht den Guard abschwächen (aus #312, zweimal in derselben Task) → `/review`, `/test`, `/refactor`, `/security-review` – bei unerwartetem Rot eines verzeichnisweiten Content-Scan-Guards in `run-tests.sh` trotz sauberem `git status`
- Ein von einem Review-Report vorformulierter Fix-Text trägt die Deixis seiner eigenen Perspektive mit („diese Spec selbst" im Report meinte die besprochene Spec) – wörtlich in eine andere Zieldatei (Guideline) übernommen, verliert der Verweis sein Antezedens und geht ins Leere (aus #315, Review-Runde-5-Finding) → `/implement`, `/review` – beim wörtlichen Übernehmen eines Fix-Vorschlags aus einem Review-/Security-/Codify-Report in eine andere Zieldatei

---

## Offene Architektur-Fragen

> Noch nicht entschiedene Fragen, die eine ADR benötigen.

_Derzeit keine offenen Fragen._

> **Erledigt (ADR-024, #120):** Die Frage nach dem Route-Schnitt des Veranstaltungs-Bereichs
> (`/abrechnung/veranstaltung` – Bereich- vs. Ressource-zuerst) ist entschieden: Bereich nach
> der Entität benennen → **`/veranstaltung`** (Liste) + **`/veranstaltung/[id]`** (Detail), je
> Lifecycle-Phase eine Unterroute. Zugleich Rolle `abrechner` → `veranstalter` umbenannt.
> Details in [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).
