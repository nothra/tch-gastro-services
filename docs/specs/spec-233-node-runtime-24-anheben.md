# Spec: Node-Runtime auf 24 anheben

## Kontext

Node 20 ist seit **30. April 2026 End-of-Life** – es erhält keine Security-Patches mehr. Die
Dokumentation dieses Projekts nennt an fünf Stellen weiterhin „Node 20+" bzw. „Node ≥ 20" als
Laufzeit-Anforderung und verweist damit auf eine tote Version.

Zusätzlich besteht bereits heute ein **Drift zwischen Doku und Realität**, unabhängig vom
eigentlichen Upgrade: die CI läuft an allen drei Stellen schon auf Node 22, während die Doku
20 sagt. `package.json` deklariert bislang **gar kein** `engines`-Feld – es gibt also keine
maschinenlesbare Untergrenze, die den Drift hätte auffallen lassen.

**Ist-Stand, in der Requirements-Phase frisch gegen den Worktree verifiziert** (nicht aus dem
Issue-Text übernommen – der Issue-Text listet nur eine der fünf Doku-Stellen):

| Stelle | Ist | Art |
|---|---|---|
| `docs/factory/PROJECT-CONTEXT.md:67` | `Next.js (App Router) / Node 20+` | Doku (Projekt-Gedächtnis) |
| `README.md:23` | `pnpm · Node ≥ 20` | Doku (Tech-Stack-Tabelle) |
| `README.md:46` | `**Voraussetzungen:** Node ≥ 20, …` | Doku (Onboarding) |
| `CONTRIBUTING.md:35` | `Voraussetzungen (Node ≥ 20, pnpm, Docker) …` | Doku (Onboarding) |
| `docs/adr/014-tech-stack-selection.md:37` | `| Paketmanager | **pnpm**, Node 20+ |` | ADR (Tech-Stack-Entscheidung) |
| `docs/adr/036-abschlussbericht-erzeugung-excel-pdf.md:25` | `Rahmenbedingungen: … Node 20+, …` | ADR (Rahmenbedingung) |
| `.github/workflows/deploy-gate.yml:56` | `node-version: 22` | CI |
| `.github/workflows/factory-ci.yml:114` (Job `lint`) | `node-version: 22` | CI |
| `.github/workflows/factory-ci.yml:139` (Job `test`) | `node-version: 22` | CI |
| `package.json` | kein `engines`-Feld | Manifest |
| Vercel-Projekteinstellung „Node.js Version" | unbekannt (außerhalb des Repos) | Umgebung |

**Nicht betroffen (geprüft):** `.github/workflows/factory-poll.yml` und
`.github/workflows/deploy-freeze-release.yml` verwenden weder `actions/setup-node` noch Node –
dort ist nichts anzupassen. Eine `.nvmrc`/`.node-version` existiert nicht.

**Zielversion Node 24** (Begründung aus dem Issue, in dieser Phase bestätigt):

- **Node 22** ist nur noch Maintenance-LTS (EOL April 2027) – kürzere Restlaufzeit.
- **Node 24** ist Active LTS (EOL April 2028) und bereits Vercel-Default-Runtime.
- **Node 26** ist erst ab Oktober 2026 LTS und auf Vercel derzeit nicht als Runtime verfügbar –
  kommt für Produktion/Integration noch nicht in Frage.

**Zwei Abweichungen vom Issue-Text, in dieser Phase entschieden:**

1. **Der Doku-Sweep umfasst alle sechs Fundstellen**, nicht nur `PROJECT-CONTEXT.md`. README
   und CONTRIBUTING sind der Onboarding-Pfad – blieben sie bei „Node ≥ 20", wäre der Drift nach
   dem Merge nur verschoben statt behoben. Auch beide ADR-Stellen ziehen mit
   (Nutzer-Entscheidung dieser Phase): ADR-014 ist die lebende Tech-Stack-Referenz, ADR-036
   nennt die Runtime als Rahmenbedingung – beide würden sonst eine EOL-Version als gültigen
   Rahmen ausweisen.
2. **`engines.node` wird als offene Untergrenze `>=24` gesetzt**, nicht als exakte 24er-Linie.
   Begründung: die lokale Entwicklungsmaschine läuft aktuell Node 26.3.0; eine `^24`-Range
   würde sie formal ausschließen. Unabhängig davon wird die **lokale Umgebung für die
   Verifikation dieses Tasks auf 24 gefahren** (siehe AK-6), damit die Gates gegen dieselbe
   Version laufen wie Vercel und CI. Bereitgestellt über die keg-only Homebrew-Formel
   `node@24` (24.19.0, installiert in dieser Phase) – nicht über nvm: das Setup ist bereits
   Homebrew-verwaltet, ein zweiter Versionsmanager würde sich im PATH überlagern. Keg-only
   heißt: das globale `node` (26.3.0) bleibt unverändert, Node 24 wird per vorangestelltem
   PATH `/opt/homebrew/opt/node@24/bin` aktiviert.

## Scope

**Inbegriffen:**

- **Manifest:** `engines.node` in `package.json` neu einführen mit dem Wert `>=24`.
- **CI:** die drei `node-version: 22`-Stellen (`deploy-gate.yml`, `factory-ci.yml` Jobs `lint`
  und `test`) auf `24` anheben.
- **Doku:** die sechs Fundstellen „Node 20+" / „Node ≥ 20" auf Node 24 anheben
  (`PROJECT-CONTEXT.md`, `README.md` 2×, `CONTRIBUTING.md`, ADR-014, ADR-036).
- **Verifikation lokal unter Node 24** (bereitgestellt über `node@24`, keg-only): `pnpm install`, `pnpm build`,
  `pnpm test`, `pnpm test:e2e` sowie die regulären Gates.
- **Manueller Nachlauf, dokumentiert:** die Vercel-Projekteinstellung „Node.js Version" auf
  24.x prüfen/setzen. Kein Repo-Artefakt – gehört als expliziter Schritt in die Task-Notizen
  und in die PR-Beschreibung, damit er nach dem Merge nicht untergeht.

**Nicht inbegriffen:**

- **Keine `.nvmrc` / `.node-version`** (Nutzer-Entscheidung dieser Phase). `engines.node`
  bleibt die einzige Quelle im Repo; CI pinnt weiterhin explizit über `node-version:` im
  Workflow. Eine dritte Stelle würde eigenständig driften und bräuchte einen eigenen
  Drift-Check.
- **Kein Dependency-Update.** Insbesondere **kein `@testing-library/jest-dom`-Bump** – der
  Issue-Text nennt nur, dass zu *prüfen* ist, ob Node 24 die jest-dom-7-Blockade auflöst. Das
  Ergebnis dieser Prüfung ist eine Notiz (bzw. ein Folge-Issue), keine Änderung in diesem PR.
- **Keine Änderung an `packageManager` / pnpm-Version.**
- **Kein neues Verhalten in der App.** Reine Runtime-/Doku-Anhebung (`chore`, `tech-debt`) –
  bestehende Tests bleiben unverändert grün, es entstehen keine neuen Produkt-Tests.
- **Node 26 als Zielversion** – erst nach Vercel-Verfügbarkeit und LTS (Oktober 2026), eigener
  Task.

## Akzeptanzkriterien

- [ ] **AK-1** GIVEN `package.json` ohne `engines`-Feld WHEN der Task umgesetzt ist THEN
      enthält `package.json` ein `engines`-Objekt mit `"node": ">=24"`, und `pnpm install`
      läuft damit ohne Engine-Warnung oder -Fehler durch.
- [ ] **AK-2** GIVEN die drei CI-Stellen auf `node-version: 22`
      (`deploy-gate.yml:56`, `factory-ci.yml` Job `lint`, `factory-ci.yml` Job `test`)
      WHEN der Task umgesetzt ist THEN steht an **allen drei** Stellen `node-version: 24`, und
      im Repo existiert **kein** verbleibendes `node-version: 22` mehr
      (Nachweis: `grep -rn "node-version" .github/workflows/` zeigt ausschließlich `24`).
- [ ] **AK-3** GIVEN die sechs Doku-Fundstellen mit „Node 20+" bzw. „Node ≥ 20"
      (`PROJECT-CONTEXT.md:67`, `README.md:23`, `README.md:46`, `CONTRIBUTING.md:35`,
      ADR-014:37, ADR-036:25) WHEN der Task umgesetzt ist THEN nennt jede davon Node 24, und
      eine Volltextsuche nach `Node 20`/`Node ≥ 20`/`Node 22` liefert außerhalb von
      `pnpm-lock.yaml`, `tasks/` und diesem Spec-Kontextabschnitt **keinen** Treffer mehr.
- [ ] **AK-4** GIVEN die CI-Workflows auf Node 24 WHEN der PR gepusht ist THEN sind die
      required Checks aus `factory-ci` (`lint`, `test`) und `deploy-gate` grün – also auf Node
      24 tatsächlich ausgeführt, nicht übersprungen.
- [ ] **AK-5** GIVEN eine lokale Node-24-Umgebung WHEN `pnpm install`, `pnpm build`,
      `pnpm test` und `pnpm test:e2e` dort ausgeführt werden THEN terminiert jedes davon
      erfolgreich; `pnpm build` ist explizit eingeschlossen, weil Lint/Vitest keine
      Turbopack-/Build-Fehler fangen (Lesson #137/#193).
- [ ] **AK-6** GIVEN die Entwicklungsmaschine mit global installiertem Node 26.3.0 WHEN die
      Verifikation aus AK-5 läuft THEN geschieht das unter Node 24 aus der keg-only Formel
      `node@24` (PATH-Präfix `/opt/homebrew/opt/node@24/bin`), nicht unter der
      Default-Version 26 – Nachweis: `node -v` meldet `v24.x` **im selben Lauf** wie die
      Gates, nicht in einem separaten Kommando davor.
- [ ] **AK-7** GIVEN die Frage aus dem Issue, ob Node 24 die `@testing-library/jest-dom`-7-
      Blockade auflöst WHEN der Task abgeschlossen ist THEN ist das Ergebnis der Prüfung in der
      Task-Datei festgehalten (aufgelöst / weiterhin blockiert, mit Begründung) – und
      `@testing-library/jest-dom` selbst ist **unverändert**.
- [ ] **AK-8** GIVEN die Vercel-Projekteinstellung „Node.js Version" (außerhalb des Repos)
      WHEN der PR zum Merge freigegeben wird THEN ist der manuelle Schritt „Runtime auf 24.x
      setzen" in der PR-Beschreibung als Nachlauf benannt, damit Repo-Stand und
      Deploy-Umgebung nicht auseinanderlaufen.

## Fehlerszenarien

- [ ] **Ein Dependency deklariert eine Engine-Range, die Node 24 ausschließt.** → `pnpm install`
      meldet das als Engine-Warnung. Kein stilles Ignorieren: entweder das Paket hebt seine
      Range (Update prüfen) oder der Konflikt wird als Blocker eskaliert – nicht durch Zurücknahme
      auf 22 umgangen.
- [ ] **`pnpm build` bricht unter Node 24, obwohl `pnpm test` grün ist.** → Erwartbarer Pfad
      (Lesson #137/#193: Turbopack-/Bundling-Fehler entstehen erst im Build). Deshalb ist der
      Build in AK-5 eigenständig gefordert und darf nicht durch „Tests sind grün" ersetzt werden.
- [ ] **`pnpm test:e2e` schlägt im Worktree mit `CredentialsSignin` fehl.** → Zuerst als
      Umgebungsproblem prüfen (Seed der geteilten lokalen DB, `pnpm db:seed`), bevor es als
      Node-24-Regression eingeordnet wird (Lesson `factory-workflow.md`, aus #228).
- [ ] **CI wird grün, obwohl ein Job den Node-Bump gar nicht ausführt.** → AK-4 verlangt den
      Nachweis über die tatsächlich gelaufenen required Checks; ein übersprungener oder
      gecachter Job zählt nicht als Beleg.
- [ ] **Doku-Sweep bleibt unvollständig, weil nach dem Wortlaut „Node 20+" gesucht wird.** →
      Die Fundstellen schreiben unterschiedlich (`Node 20+`, `Node ≥ 20`, `node-version: 22`).
      AK-3 fordert deshalb eine Suche über **alle drei** Schreibweisen, nicht nur eine
      (Lesson #144: Terminologie-Sweeps sind blind für Varianten).
- [ ] **Vercel bleibt auf der alten Runtime.** → Repo sagt 24, Deploy läuft weiter auf 22/20.
      AK-8 hält den manuellen Schritt fest; `/post-merge-verify` prüft danach das Verhalten der
      deployten Umgebung.

## Offene Fragen

- [x] Welchen Umfang hat der Doku-Sweep – nur `PROJECT-CONTEXT.md` (Issue-Wortlaut) oder alle
      Fundstellen? → **Alle sechs**, inklusive beider ADR-Stellen (Nutzer-Entscheidung dieser
      Phase).
- [x] Welche Range bekommt `engines.node`? → **`>=24`** (offene Untergrenze), damit die lokale
      Node-26-Installation gültig bleibt.
- [x] Wird eine `.nvmrc`/`.node-version` eingeführt? → **Nein** – eine kanonische Quelle
      (`engines.node`) statt einer dritten, eigenständig driftenden Stelle.
- [x] Wie wird „lokal unter Node 24 grün" erfüllt, wenn die Maschine Node 26 fährt? → **Node 24
      lokal installieren** und die Gates dort fahren (AK-6). Umgesetzt in dieser Phase über
      `brew install node@24` (24.19.0, keg-only); nvm war auf der Maschine nicht vorhanden und
      wurde bewusst nicht nachgerüstet.
- [ ] **Kein ADR-Trigger erkennbar.** Die Zielversion 24 und ihre Begründung stehen bereits im
      Issue und sind hier übernommen; es entsteht keine neue strukturelle Entscheidung –
      `/architecture` kann übersprungen werden. ADR-014 wird nur in seiner Versionsangabe
      nachgezogen, nicht in seiner Entscheidung geändert.
