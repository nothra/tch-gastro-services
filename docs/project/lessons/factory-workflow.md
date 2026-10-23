# Lessons: Workflow (Git/CI, Pipeline, Patch) (Projekt)

> Ausgelagerte `/codify`-Learnings (Volltext) – projektspezifische Learnings (TCH Gastro Services) zu **Workflow (Git/CI, Pipeline, Patch)**.
> **Nicht** `@import`-geladen (ADR-037) – bei Bedarf gezielt lesen. Kanonische Quelle je
> Regel ist der jeweilige Eintrag hier; im @import-Pfad (`PROJECT-CONTEXT.md`) steht nur eine Index-Zeile.
> Neue Learnings kommen in die Lesson-Datei **ihrer Seite** (Zuordnungsregel: betrifft das Learning eine
> Datei der Factory laut `docs/factory/OWNERSHIP.md` → `docs/factory/lessons/`, sonst → `docs/project/lessons/`;
> siehe `/codify` + ADR-037).
> Factory-Anteil dieses Themas: [`docs/factory/lessons/factory-workflow.md`](../../factory/lessons/factory-workflow.md).

### App-Router erzeugt Routen aus mehr als `page.tsx`/`route.ts` (aus #145)

Beim Erstellen der Routen-Übersicht (`docs/routes.md`) und des Drift-Checks
(`scripts/checks/routes-doc-check.sh`) fiel auf: der Next.js App Router erzeugt Routen **nicht nur**
aus `page.tsx` (Seite) und `route.ts` (Handler), sondern auch aus **Metadaten-Dateikonventionen** –
`app/manifest.ts` → `/manifest.webmanifest`, ebenso `sitemap.ts`, `robots.ts`, `icon.*`,
`apple-icon.*`, `opengraph-image.*`. Diese haben **keinen** `page.tsx`/`route.ts` und sind bewusst
**außerhalb** des Drift-Check-Sets (er greppt nur `page.tsx`/`api/**/route.ts`); im aktuellen Baum
existiert nur `manifest.ts`, in `docs/routes.md` als **Prosa-Notiz** geführt (keine parsebare
Tabellenzeile, sonst meldete der Check Fehl-Drift).

**Regel:** Der Drift-Check deckt `page.tsx` + `app/api/**/route.ts` ab – **nicht** die
Metadaten-Routen. Wird künftig eine solche Datei (`sitemap.ts`, `robots.ts`, `icon.tsx`, …)
hinzugefügt, den entsprechenden Pfad **manuell** in die Prosa-Notiz von `docs/routes.md` aufnehmen
(kein Automatismus fängt das). Wer den Drift-Check erweitern will, muss das Ableitungs-Muster für
diese Konventionen separat definieren **und** per Fixture testen (analog zum bestehenden
Route-Group-/`_private`-Fall in `scripts/project/tests/run-project-tests.sh`).

### Neuer Worktree hat kein `.env.local` → irreführender `CredentialsSignin`-Fehlschlag beim ersten E2E-Lauf, keine echte Regression (aus #228, /implement-Selbstfund)

`start-work.sh` legt jede Task standardmäßig in einem **eigenen** Worktree an (Geschwister-
Ordner `…​.worktrees/<branch>`, siehe `git-workflow.md` → „Parallele Sessions"). `.env.local`
ist gitignored und wurde damals dabei **nicht** mitkopiert (heute automatisiert, siehe Regel
unten). Die lokale Postgres-DB läuft dagegen meist schon als **gemeinsamer** Docker-Container
über alle Worktrees hinweg (fester Host-Port, zwei Wochen alt in #228). Ein
`pnpm test:e2e e2e/auth.spec.ts` im frischen Worktree scheitert dadurch beim Login mit
`CredentialsSignin` – nicht weil der Login-Code kaputt ist, sondern weil für die aus der (damals
von Hand nachkopierten, heute automatisch gespiegelten) `.env.local` geladenen
`SEED_ADMIN_*`-Zugangsdaten schlicht **noch kein Konto in der DB existiert**. In #228 sah das
zunächst wie eine echte Regression durch den next-auth-Versions-Bump aus, war aber ein reines
Umgebungs-Setup-Problem.

**Smell:** „Login-E2E-Test schlägt im frisch angelegten Worktree mit `CredentialsSignin` fehl,
obwohl der Code unverändert ist (oder nur eine Dependency gebumpt wurde)?" → zuerst Umgebung
prüfen, nicht den Code verdächtigen.

**Regel:** Vor dem ersten `pnpm test:e2e` in einem neuen Worktree `pnpm db:seed` laufen lassen
(idempotent, legt das Admin-Konto an/aktualisiert es für die geladenen `SEED_ADMIN_*`-Werte) –
**bevor** ein E2E-Fehlschlag vorschnell dem gerade bearbeiteten Task-Diff zugeschrieben wird.
Das Kopieren der `.env.local` – früher der manuelle Schritt davor – ist **nicht** mehr nötig:
`start-work.sh` erledigt es seit #236 automatisch beim Anlegen des Worktrees und weist im
Abschluss-Output auf den noch nötigen `db:seed`-Lauf hin. Kopiert wird aus dem Baum, in dem das
Skript liegt (`$FACTORY_DIR` – üblicherweise, aber nicht zwingend der Haupt-Baum); eine im Ziel
vorhandene Datei wird nie überschrieben, Opt-out ist `FACTORY_WT_SKIP_ENV=1`.

### E2E im frischen Worktree: vorhandene `.env.local` ≠ geseedete DB – `CredentialsSignin` vor „Regression" zuerst gegen `db:migrate` + `db:seed` prüfen (aus #370, /test-Nachtest)

Ergänzt die #228-Lesson (fehlende `.env.local`): auch **mit** `.env.local` scheiterte der erste Lauf an
`[auth][error] CredentialsSignin`, weil die lokale DB keinen Seed-Admin hatte. Nach `pnpm db:migrate` + `pnpm db:seed`
(beide per Wegwerf-Skript `scripts/*.tmp.sh`, da `dotenv`) liefen alle Specs grün. Der dmTECH-Guardrail meldet
`dotenv`-Aufrufe mit `.env.local` als Zugriff auf eine Secret-Datei (`cmd.secretfile.read`) – vor der Nutzung beim Menschen
bestätigen lassen, Werte nie ausgeben.

### Verschiebt ein PR den UI-Einstiegspunkt einer Funktion, E2E-Helfer, Capture-Spec, Screenshots und Anleitung im selben Schritt mitziehen (aus #391, Review-Iteration 1)

Einstellungen wanderten vom Seitenende in einen Zahnrad-Dialog im Kopf. Die Unit-Tests waren sofort grün; Iteration 1 fand
dennoch veraltete Screenshots 05/07, E2E-Helfer (`oeffneEinstellungen`) auf dem alten Weg und eine Anleitung mit dem alten
Ort – Stellen, die weder Unit-Test noch Lint berühren.

**Regel:** Bei „Funktion X ist jetzt woanders erreichbar" sofort `grep -rn "<altes Label/Selektor>" e2e/ docs/anleitung/`
und die Treffer samt Screenshot-Capture in derselben Task abräumen; E2E nur gegen einen Dev-Server **dieses** Worktrees
belegen (Lesson testing #368). Nebenbei neu erzeugte, nicht betroffene Bilder nicht mitcommitten.

**Rezidiv (aus #373, Review-Iteration 1 W3):** Dieselbe Lücke in der menschlichen Vor-Merge-Checkbox: Sie nannte nur die
Screenshots 03/04, Bild 02 (Kachelübersicht, die „Theke" verlor), Bildunterschrift und „Stand" fehlten. Wer Bilder nicht
selbst erzeugen kann, listet in der Checkbox **jedes** betroffene Bild (Treffer des Greps oben) und zieht
Unterschrift/„Stand" sofort im Text nach.

### Neues Zeilen-/Listenlayout gegen die Dichte-Vorgaben bestehender Specs messen, bevor es in die Spec kommt (aus #407, Review-Iteration 2/3)

spec-407 setzte die Artikelzeile zweizeilig (Name, Größe als Untertitel). Erst der E2E-Lauf `listenseiten` in
`/review` Iteration 2 zeigte, dass 20 Artikel dann 1796 px belegen, die Dichte-Grenze aus spec-373 AK4.6 aber 1624 px
erlaubt. Weder `/requirements` noch `/implement` hatten diese Grenze gegen das neue Layout gehalten, weil sie nur als
Messung in einer Opt-in-E2E-Spec stand. Der Fund kostete drei Review-Iterationen und eine Eskalation an Ralf
(Circuit Breaker), obwohl die Frage („einzeilig oder spec-373 ablösen?") schon am Spec-Tisch entscheidbar war.

**Regel:** Ändert eine Spec das Zeilen-, Karten- oder Listenlayout, greppt `/requirements` vorher die Specs und E2E-Tests
nach Dichte-/Höhen-/Mess-Grenzen auf derselben Seite (`listenseiten`, `AK4.6`, `toBeLessThan`, `boundingBox`). Gibt es
eine, steht die Wahl (Layout anpassen oder alte Grenze ausdrücklich ablösen) als Offene Frage in der Spec. `/implement`
fährt die zuständige Mess-Spec in seinem ersten Lauf, nicht erst `/review`.

Außerdem aus #407: „Wegwerf-Spec und Screenshots gelöscht" stand in der Task-Notiz, die Dateien lagen aber noch im
Worktree (Review-Nitpick und Security-Hinweis). Eine Lösch-Aussage in einer Notiz erst nach `ls`/`git status --ignored`
auf die Dateinamen schreiben (Rezidiv #372).
