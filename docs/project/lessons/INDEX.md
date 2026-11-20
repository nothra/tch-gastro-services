# Projekt-Lessons – Einzelliste

> **Besitzer: Projekt** (TCH-spezifisch, nicht in `factory.lock`), **nicht** `@import`-geladen: der Index passte mit
> dem Deckel aus Factory `v0.8.0` (750 Zeilen / 38.000 Bytes) nicht mehr in `docs/factory/PROJECT-CONTEXT.md` (#428).
> Dort stehen nur die Kern-Kurzregeln und je Lesson-Datei eine Übersichtszeile mit „Laden bei"-Trigger; diese Datei
> öffnen, sobald ein Trigger passt, und nur die passenden Einträge der Lesson lesen.
>
> Eine Zeile je Learning (Titel + Herkunfts-Issue). **`/codify` hängt Index-Zeilen eines Projekt-Learnings hier ans Ende
> der Gruppe ihrer Lesson-Datei an** (Abweichung vom Factory-Skilltext, der `PROJECT-CONTEXT.md` nennt – siehe Task #428).
> Wohin ein Learning gehört: Datei in `factory.lock` → Factory-Lesson, sonst Projekt-Lesson.

**[`docs/project/lessons/frontend-react.md`](../project/lessons/frontend-react.md)** – React/UI, Client Components, route-neutrale UI-Bausteine · **Laden bei:** `/implement`, `/review` bei React/UI-Komponenten

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
- Reset-Handler für einen gültigen Submit gehört an `onSubmit` des `<form>`, nicht an `onClick` des Buttons – `onClick` feuert auch, wenn die native Pflichtfeld-Validierung die Absendung abbricht (aus #352, Review-Runde-3-Finding)
- `setState` am Anfang einer Form-Action wird erst mit ihrem Ende sichtbar – „läuft gerade" aus `onSubmit` melden, Ende im `finally` der Action; Test mit nie auflösendem Promise (aus #369, /implement-Selbstfund)
- Verhaltensvertrag eines geteilten Bausteins (Schließen/Sperren/Fokus) in den Baustein legen und alle Konsumenten prüfen – ein Fix im auffälligen Konsumenten ließ den schwereren Geschwister-Defekt eine Iteration länger stehen (aus #369, Review-Iteration 1/2)
- Statuswechsel, der den Seitenzweig tauscht, remountet den Auslöser – Fokus-Rückgabe zeigt auf entfernten Knoten; Erfolgsfall gesondert festlegen und testen (aus #371, Review-Nitpick)
- Nativer Popover: `aria-expanded` ist kein DOM-Attribut und jsdom kennt die API nicht – Unit-Test nur Verdrahtung, Öffnen/Escape/Expanded per Playwright über den AX-Baum (aus #374)
- Refactor, der Klassen/Konstanten aus gegateten Dateien in eine neue Datei zieht: Zieldatei im selben Commit ins Farb-Gate (`eslint/ui-token-files.mjs`) und Handkopien greppen (aus #374, Review-Runde-2-Finding)
- `<form action>` setzt Eingaben auch nach Ablehnung zurück – Dialog mit Fehler im Dialog: `onSubmit` + `startTransition` (aus #373, AK1.4)
- Rezidiv #371: Dialog, dessen Erfolg den Auslöser unmountet, von Anfang an mit Fokus-Ersatzziel + Erfolgsfall-Test bauen; neuer Hook neben ähnlichem vorher abgleichen, route-neutral ablegen (aus #373, Review-Iteration 1 W1/W2)
- Seitenweites Overlay (Toast) im `<body>` ist bei offenem modalem `<dialog>` verdeckt und inert, `toBeVisible()` bleibt grün – Portal in den offenen Dialog, Nachweis per Klick + Screenshot (aus #372, /implement-Selbstfund)
- Rezidiv #373: Erfolgs-Fokus-Vertrag in zwei Hooks kopiert – den ganzen Vertrag in einen Helfer ziehen, nicht nur das letzte Stück; Helfer als eigenes Modul, nicht aus einer Komponenten-Datei (aus #372, Review-Iteration 1/2)
- Schrittwechsel im selben Dialog: `autoFocus` greift nur beim Mount – Fokus je Richtung explizit setzen, je Richtung + Gegenprobe „beim Öffnen nicht“ testen (aus #404, Review-Iteration 1 W1)
- Ersatz-Fokusziel in zugeklapptem `<details>` ist nicht fokussierbar (Fokus → `<body>`, jsdom blind) – im Hook auf den `<summary>` ausweichen, beide Richtungen + Playwright-Gegenprobe (aus #405, /implement-Selbstfund)
- Komponente mit Ref-Prop: Props vorab destrukturieren, sonst meldet `react-hooks/refs` jeden `props.x`-Zugriff; Union mit `never`-Gegenstücken + `@ts-expect-error`-Test (aus #405, /implement-Selbstfund)
- Rezidiv #369: Lauf-Sperre eines Menü-/Dialog-Bausteins im Fix nur für den auffälligen Eintrag gelöst – Geschwister-Einträge (Bearbeiten/Löschen) schlossen weiter; Sperre für alle Interaktionsflächen im Baustein, Test `it.each` (aus #406, Review-Iteration 2)
- Sonderzweig (leer/gesperrt) in einer Komponente mit Erfassen-/Bearbeiten-Betriebsart: betriebsartabhängige Texte aus einer Hilfsfunktion für beide Zweige, nicht als Literal – „Erfassen“ stand auch beim Bearbeiten (aus #420, Review-Iteration 1 W1)

**[`docs/project/lessons/next-auth.md`](../project/lessons/next-auth.md)** – Next.js-Framework, `proxy.ts`, NextAuth/Session, öffentliche Routen · **Laden bei:** `/implement`, `/review` bei Auth/`proxy.ts`/Routen

- Next.js 16: Middleware heißt `proxy.ts` (aus #48)
- NextAuth v5: Custom-Session-/JWT-Claims typisieren (aus #48)
- Öffentliche API-Routen aus dem Auth-Proxy ausnehmen (aus #63)
- Auto-Prefetch geschützter Routen belebt die Session nach dem Abmelden wieder (aus #164)
- Früher Gate-/Drossel-Zweig vor einer Server-Action-Route muss deren Antwortprotokoll einhalten, sonst globaler Client-Crash statt Inline-Fehler (aus #297, Security-Review-Finding, Issue #331)
- `/_next/image`-Rauchtest gegen beliebiges `public/`-Asset kann am eigenen Auth-Proxy-Matcher scheitern (interner Self-Fetch der Bildoptimierung läuft durch denselben Proxy) statt an der Optimierung selbst – gegen einen matcher-ausgenommenen Pfad testen (aus #337, /implement-Selbstfund)
- Nachtrag: tragfähiger `/_next/image`-Nachweis ist `/favicon.ico` (200); SVG-Ablehnung 400 ist der GHSA-2464-Fix, kein Fehler (aus #443)

**[`docs/project/lessons/db-drizzle.md`](../project/lessons/db-drizzle.md)** – Drizzle ORM, Migrationen, IDOR, Soft-Delete, Joins, guarded UPDATE, Zod-Obergrenzen · **Laden bei:** `/implement`, `/review`, `/test` bei Data-Layer (Drizzle)

- Drizzle-Migration bei Enum-Wert-Wechsel / Spalte→Array (aus #48)
- Drizzle UPDATE/DELETE: `.returning()` liefert `T | undefined`, nicht `T` (aus #50, Refactoring-Finding)
- Zod-Schema: Obergrenze für Integer-mapped Inputs fehlt (aus #49, Security-Hint)
- IDOR: Data-Layer DELETE/UPDATE müssen Parent-ID einschließen (aus #51, Security-Finding)
- Soft-Delete: `active`-Prüfung nach jedem Laden by ID (aus #51, Review-Finding)
- Orphan-sichere Joins: Snapshot-Referenz kann verschwinden, auch wenn die Business-Entity bleibt (aus #53, Review-Finding K1)
- Guarded UPDATE bei Status-Transition-Actions: `undefined`-Rückgabe auswerten, nicht `{ok:true}` annehmen (aus #55, Review-Runde-1-Finding W1)
- Neue Mehrfach-Write-Funktion in `db/` nutzt `db.transaction()` statt `runAtomic` – Treiber-Inkompatibilität nur in Produktion (Neon-HTTP) sichtbar, lokale/CI-Tests bleiben grün (aus #345, Review-Runde-2-Finding, Architektur-Fokus) · **Laden bei:** `/implement`, `/review` (Architektur-Fokus) – bei neuer Mehrfach-Write-Funktion in `db/`
- Serverseitig-fix → client-gelesenes Feld (FK-Bezug) öffnet neue DB-Fehlerklassen (z. B. `23503`), die der bestehende Error-Translation-Wrapper nicht abdeckt (aus #345, Security-Review-Hinweis, Issue #353)
- Zweiter Fehler-Übersetzungs-Wrapper um einen einzelnen DB-Call: Catch-Scope exakt auf den riskanten Aufruf begrenzen, nicht auf nachfolgende unabhängige Schritte (z. B. `revalidatePath`) ausweiten (aus #353, Review-Runde-1-Finding)
- Wegwerf-E2E-Verifikation gegen den lokalen Dev-Server schreibt in dieselbe geteilte Dev-DB wie die DB-Integrationstests – ohne `__test__`-Präfix oder manuelles Aufräumen danach bricht eine spätere, fremde DB-Regressionstest-Annahme (aus #346, /test-Selbstfund) · **Laden bei:** `/implement` – bei Wegwerf-E2E-Verifikation gegen die lokale Dev-DB; `/test` – bei unerklärtem, diff-unabhängigem DB-Integrationstest-Fehlschlag

**[`docs/project/lessons/testing.md`](../project/lessons/testing.md)** – Vitest, Coverage, Zod-Meldungs-Tests, React-/E2E-/Playwright-Tests der App · **Laden bei:** `/implement`, `/test`, `/review` beim Testschreiben/Coverage der App

- Vitest + Testing Library ohne `globals: true` (aus #48)
- Guard-Clause-Branches in Server Actions brauchen dedizierte Tests (aus #51, Review-Finding)
- Zod-Fehlermeldung: Ablehnungs-Test ≠ Meldungs-Test (aus #116, Review-Runde-1-Finding)
- Layout-Timing-Test-Stub (rAF) vor dem Neuschreiben im selben Verzeichnis suchen, nicht duplizieren (aus #194, Review-Finding)
- Callback-Prop nur durch Codelesen belegt ist keine Testabdeckung – Coverage-Report gegen jedes Review-Positiv gegenprüfen (aus #187, /test-Selbstfund)
- ESLint-Ignore-Config verhaltensbasiert testen (`isPathIgnored`, nicht Config-Array) + Diskriminierungs-Kontrolle in der Gegenrichtung (bekanntes Nicht-Mitglied → `false`) (aus #172, /test-Selbstfund)
- Row/Cell-Index-Assertions gegen einen gerenderten Report sind Magic Numbers – Herleitung sofort mitschreiben, nicht erst im Review (aus #189, Review-Runde-1-Finding)
- Flaky Timeout durch unamortisierten teuren Erst-Aufruf: in `beforeAll` mit eigenem endlichem Timeout aufwärmen, nicht global das Timeout erhöhen (aus #238)
- Positions-/Zustand-Freeze-Test braucht vor dem Zielfall eine echte, divergenzerzeugende Aktion – sonst können weder Reihenfolge- noch Status-Assertion zwischen „Freeze wirkt" und „kein Freeze da" unterscheiden (aus #253, dreifach in Review-Runde 1–3 gefunden)
- Exhaustiveness-Guard (`never`-Check) braucht einen eigenen Test – Zweig per Type-Cast erzwingen (verschoben aus `testing-standards.md`, #319)
- Mock-Default `mockResolvedValue([])` verdeckt den Mapping-Lambda – mind. ein Test mit befülltem Array (verschoben aus `testing-standards.md`, #319)
- Diskriminierungs-Kontrolle für Pfad-Präfix-Prädikate vor einem Auth-Gate: Negativtest braucht einen ähnlichen Nachbar-Pfad, nicht nur einen entfernten (Rezidiv von #172, aus #297, Review-Runde-2-Finding)
- Modulweit geteilter Rate-Limiter-Singleton in Tests: absolut statt relativ einfrieren + `resetModules` pro Test, sonst reihenfolgeabhängig (aus #297, Review-Runde-3-Finding; nur per `--sequence.shuffle` reproduzierbar)
- DOM-Adjazenz-Behauptung („unmittelbar") mit `toBe(index + 1)` statt `toBeGreaterThan` belegen – Rezidiv von #322 in neuer Domäne (aus #318, Review-Runde-1-Finding)
- Positions-/Struktur-Test auf der Prop-Kombination schreiben, die der reale Produktions-Konsument tatsächlich nutzt, nicht auf dem Default-Pfad der Komponente (aus #318, Review-Runde-1-Finding)
- Gleicher Testdaten-Namensliteral in mehreren DB-Integrationstestdateien (gleiche Tabelle, gleiche Unique-Constraint-Spalte) kollidiert unter Vitests Parallelisierung – je Datei ein eigenes Namensfenster statt geteiltem Präfix; Konvention ohne Enforcer, Kommentar muss alle Namensfelder der Tabelle nennen (aus #59/#347)
- Regex-/Listen-Gate über ein externes Namens-/Syntax-Universum (Tailwind-Paletten, Präfixformen): Enumeration per Drift-Test aus der Quelle ableiten, je Form ein `invalid`-Fall – handgezählte Listen fanden in zwei Review-Runden je neue Lücken (aus #368, Review-Runde-1/2-Findings) · **Laden bei:** `/implement`, `/test`, `/review` – bei neuem/erweitertem Regex-/Listen-Gate
- Negativ-Fixture auf einem realen Pfad bricht, sobald dieser Pfad später in eine Gate-Liste kommt – vor dem Erweitern der Liste alle „nicht enthalten"-Tests greppen und auf ungelisteten Nachbarn umstellen (aus #371, /implement-Selbstfund) · **Laden bei:** `/implement`, `/test` – bei Erweiterung von `eslint/ui-token-files.mjs` oder ähnlichen Pfad-Listen
- Playwright `reuseExistingServer` kann gegen einen fremden Dev-Server (anderer Checkout) laufen – eigenen Server auf freiem Port + `PLAYWRIGHT_BASE_URL`, sonst ist „grün" kein Beleg (aus #368, /implement-Selbstfund) · **Laden bei:** `/implement`, `/test` – bei E2E-/Screenshot-Nachweis im Worktree
- E2E gegen den Dev-Server über `localhost`, nicht `127.0.0.1` – dort blockt Next dev die HMR-Ressourcen (`allowedDevOrigins`), ohne Hydration wirkt es wie eine Regression (aus #374, /implement-Selbstfund) · **Laden bei:** `/implement`, `/test` – bei E2E-Nachweis gegen den lokalen Dev-Server
- Test-Double, das den geprüften Zweig nicht unterscheiden kann (jsdom-`SVGElement` hat ein wirkungsloses `focus()`), macht den Test zum Abdeckungs-Test – Spion-Double + Mutationsbeleg in drei Schritten (mutieren per `python3`, `git diff --stat` zeigt es, Test rot); BSD-`sed -i` ohne Suffix scheitert still und lässt einen grünen Lauf wie Beleg aussehen (aus #369, Review-Iteration 3 + /refactor-Selbstfund)
- Playwright-`hasText` mit String ist ein Teilstring-Treffer (`Bier` trifft `Weizenbier`) – Namen exakt matchen; und eine Fehlerursache erst an den echten Daten messen, bevor sie in Kleinfund/Task-Notiz steht (aus #388, Review-Iteration 1)
- Manuell gestartete Capture-/E2E-Spec (nicht in CI) rottet unbemerkt: Zählungen relativ zum Startwert (`Artikel (1)` brach an den 16 migrierten Standard-Artikeln, Migration 0004), Seed-/Migrations-PRs auf absolute Startannahmen prüfen, Dialog-Screenshots erst nach Fokus-/Scroll-Reset (aus #388, /implement)
- Opt-in-E2E-Spec (per Env-Flag abgeschaltet), die nie lief, belegt nichts – prüfte hier `transform` statt Tailwind-v4-`rotate`; Lauf-Freigabe früh in `/implement` einholen, CSS-Assertion einmal gegen den echten Browser messen (aus #403, Review-Iteration 1 K1 + Iteration 3; Rezidiv aus #406, Review-Iteration 2 – Lauf im selben `/implement`-Schritt, nicht erst im Rework) · **Laden bei:** `/implement`, `/test`, `/review` – bei E2E-Spec mit Env-Flag-Gate oder CSS-Eigenschafts-Assertion
- Playwright `getByRole(name)` ist Teilstring-Treffer wie `hasText` – ein neues Bedienelement im Dialog (z. B. „Meldung schließen") bricht Locatoren auf „Schließen"; `exact: true` + Grep über alle Specs (aus #372, /implement) · **Laden bei:** `/implement`, `/test` – bei neuem Element in einem Dialog/einer Seite mit bestehenden E2E-Specs
- React-19-Async-Actions: nie auflösende Promises halten einen modulweiten Scope offen – spätere Abwesenheits-Tests sind grün aus dem falschen Grund; Resolve-Liste + `afterEach` in `act`, Anwesenheits-Vorbedingung, Mutationsbeleg je Test (aus #370, /implement-Selbstfund) · **Laden bei:** `/implement`, `/test`, `/review` – bei Tests mit offen gehaltener `useActionState`-Action
- Factory-Sync löscht/ersetzt eine Datei, die Projekt-Tests lesen (`OWNERSHIP.md`, `FACTORY.md`): Suite nach dem letzten Eingriff laufen lassen, Pfade in `scripts/project/tests/` greppen, auf `factory.lock` umstellen, veraltete Migrationstests entfernen (aus #428, Review-Iteration 1)

**[`docs/project/lessons/repo-werkzeuge.md`](../project/lessons/repo-werkzeuge.md)** – Werkzeuge über die ganze Repo-Historie (Herauslösen, Massen-Umschreibung, Secret-/PII-Gate vor öffentlichem Push) · **Laden bei:** `/implement`, `/review`, `/security-review` an `scripts/project/factory-extract*` oder einem neuen Gate um einen externen Scanner

- Gate um einen fremden Scanner: alle Abschalt-Eingänge (Ziel-/Arbeitsverzeichnis-Dateien, Umgebung, Inline-Marker, globale Fingerprints) und alle Datenflächen (Messages, alle Refs) vorab aufzählen, je Eintrag Test + Gegenbeweis mit echtem Scanner (aus #427, Security-Review + Re-Review)
- Umschreibregel über Repo-Inhalt: alte gegen neue Regel auf dem echten Bestand vergleichen, jede abweichende Zeile ansehen (aus #427, Review-Iteration 1)

**[`docs/project/lessons/build-tooling.md`](../project/lessons/build-tooling.md)** – pnpm, Turbopack/Vercel-Bundling, Typecheck-Gate, Abhängigkeiten/Audit · **Laden bei:** bei Build/CI/Dependencies/Vercel-Bundling

- Lint/Vitest fangen keine Typfehler – Gate-Lücke bis zum manuellen `pnpm build` (aus #137)
- pnpm@11: `overrides`/Settings gehören in `pnpm-workspace.yaml`, nicht ins `package.json`-`pnpm`-Feld (aus #167)
- Turbopack/Vercel: Node-Libs mit Laufzeit-`fs.readFileSync(__dirname + …)` externalisieren (aus #193)
- Verschachtelte alte `@types/node`-Kopie (transitive Dependency) kollidiert mit generischem `Buffer`-Typ bei TS≥5.7 – Cast über die Ziel-Funktionssignatur, nicht `as unknown as Buffer` (aus #189)
- `pnpm audit` scheitert in dieser Sandbox an einem Gzip-Decoding-Bug – Registry-Endpoint direkt per `curl` + manuellem `gunzip` abfragen liefert echte Advisory-Daten statt nur des Lockfile-Ersatzkriteriums (aus #228, /security-review-Selbstfund)
- Override-Ziel-Range immer als Caret innerhalb derselben Major-Linie (nicht offenes `>=`), bei Advisories in mehreren Major-Linien disjunkte Selektoren – Ausnahme: hat die Selektor-Linie keinen eigenen Fix, zeigt der Caret in die Fix-Linie (#339); ein „No-op"-Verdacht auf einen Override ist zu messen (entfernen, **ohne Alt-Lockfile** neu auflösen, Version prüfen), nicht aus der Parent-Range anzunehmen (aus #291, Review-Runde-1/2-Findings; #339)
- `pnpm audit` zeigt bei Paketen mit mehreren parallel gepflegten Major-Linien (z. B. `brace-expansion`) nur eine Range-Gruppe, die nicht zur per `pnpm why` aufgelösten Version passen muss – vor „echtes Finding" die volle GHSA-Advisory-Liste (`vulnerabilities[]` komplett) gegenprüfen (aus #231, /security-review-Selbstfund; drittes Vorkommnis als echte ungedeckte Major-Linie statt Anzeige-Artefakt aus #337, /security-review-Selbstfund)
- Security-Deps-Durchgang: Alert-AK „Dependabot meldet nichts mehr" ist vor dem Merge nicht prüfbar (nur Default-Branch) – in Vorab- und Nach-Merge-Teil trennen; Ersatz bei defektem `pnpm audit` ist die npm-Bulk-Advisory-API mit Gegenprobe gegen Altversionen, über den ganzen Lockfile-Baum (aus #390, /security-review) · **Laden bei:** `/requirements`, `/implement`, `/security-review` – bei Deps-/Advisory-Durchgang
- `next dev` (≥16.3) schreibt automatisch einen `<!-- BEGIN:nextjs-agent-rules -->`-Block ans Ende von `CLAUDE.md`/`AGENTS.md` – gehört nicht in einen fachlichen Task-Commit, aus dem Diff entfernen (aus #337, Review-Runde-1-Finding; Rezidiv in #369 und #370 – der Block empfiehlt selbst das Mitcommitten, die Lesson gilt: nach jedem `next dev`-Lauf `git checkout -- CLAUDE.md`)
- next-Bump: `eslint-config-next` ist versionsgleich gepinnt und mitzuheben; `next dev` legt im Worktree zusätzlich ein untracked `AGENTS.md` an – vor dem Commit löschen (aus #443)
- Nur als Peer im Baum hängende Dependency (z. B. `vite` via `vitest`): `pnpm update`/`overrides` wirken nicht – `pnpm add -D <peer>@^Floor` + `pnpm remove <peer>`; Lockfile-Streuung am `git diff` messen (aus #444)
- `pnpm update <paket>@^X` schreibt den neuesten Specifier (`^4.6.7` statt `^4.6.6`) – in Spec/AK die Untergrenze nennen, geschriebenen Specifier in die Task-Notiz übernehmen (aus #448, Review-Nitpick)
- AK „ohne Alt-Lockfile" nicht mit `pnpm install` gegen das bestehende Lockfile abhaken – Frisch-Auflösung per `pnpm install --lockfile-only` ohne Lockfile, je mit/ohne Override messen (aus #412, Review-Runde-1-Finding)

**[`docs/project/lessons/code-style.md`](../project/lessons/code-style.md)** – Clean-Code-Muster der App (`lib/`, Schema-Konstanten, JSDoc, Tailwind) · **Laden bei:** `/refactor`, `/review` (Clean-Code)

- Neue `lib/`-Module domänenspezifisch benennen, kein generisches `utils` (aus #105, Review-Finding)
- Magic-Number-Konsistenz-Bewertung braucht projektweiten Grep, nicht nur Datei-/PR-lokalen Vergleich (aus #142, Review→Refactor-Diskrepanz)
- JSDoc auf einem geteilten Options-Interface, die einen konkreten Produktionswert nennt, driftet beim zweiten Konsumenten mit abweichendem Wert – gleiches Muster an einem Nachbarfeld derselben Struktur übersehen (aus #182, Review-Runde 1 W2 + Runde 2 Nitpick 1)
- Rezidiv „X schützt vor Y": benannte Tailwind-Gruppe (`group/name`) schützt nur vor fremden `.group`-Vorfahren, nicht vor Verschachtelung – Wirkungsbehauptung gegen die Selektorsemantik prüfen, an allen Fundstellen (ADR, Kommentar, Testname) gleich eng formulieren (aus #403, Review-Iteration 2 W1)

**[`docs/project/lessons/factory-workflow.md`](../project/lessons/factory-workflow.md)** – App-/UI-spezifische Workflow-Stolpersteine (Routen, E2E im Worktree, UI-Einstiegspunkte, Layout-Specs) · **Laden bei:** `/implement`, `/review` bei Routen/UI/E2E im Worktree

- App-Router erzeugt Routen aus mehr als `page.tsx`/`route.ts` (aus #145) → `/implement` – bei Routen/`docs/routes.md`
- E2E im frischen Worktree: vorhandene `.env.local` ≠ geseedete DB – `CredentialsSignin` zuerst gegen `db:migrate` + `db:seed` prüfen; `dotenv`-Nutzung löst den Secret-Datei-Guardrail aus (aus #370, /test-Nachtest) → `/implement`, `/test` – bei erstem E2E-Lauf im Worktree
- Neuer Worktree hat kein `.env.local` → irreführender `CredentialsSignin`-E2E-Fehlschlag ist Umgebungsproblem, keine Regression (aus #228, /implement-Selbstfund; Root-Cause-Fix in #236 umgesetzt: `start-work.sh` kopiert die Datei jetzt automatisch, offen bleibt nur `pnpm db:seed`) → `/implement` – bei erstem E2E-Lauf in neuem Worktree
- Verschobener UI-Einstiegspunkt: E2E-Helfer, Capture-Spec, Screenshots und Anleitung per Grep im selben Schritt mitziehen – kein Unit-Test/Lint fängt sie (aus #391, Review-Iteration 1; Rezidiv in der menschlichen Vor-Merge-Checkbox: jedes betroffene Bild listen, aus #373 W3) → `/implement`, `/review` – bei Verschieben/Umbenennen eines UI-Einstiegs
- Neues Zeilen-/Listenlayout in einer Spec: Dichte-/Mess-Grenzen bestehender Specs und E2E-Tests vorher greppen und die Wahl als Offene Frage festhalten – spec-407 riss spec-373 AK4.6 (1796 > 1624 px), erst `/review` Iteration 2 fand es, drei Iterationen + Eskalation; „gelöscht"-Notiz erst nach `ls` auf die Dateinamen schreiben (aus #407, Review-Iteration 2/3) → `/requirements`, `/implement` – bei Spec/Änderung eines Zeilen-, Karten- oder Listenlayouts
