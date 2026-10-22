# Spec: Trennlinie Factory/Projekt im TCH-Repo ziehen (T1a)

> **Detail-Spec zu Teil-Task T1a** des Epics #424. Verfeinert
> [spec-424](spec-424-factory-in-eigenes-repo-auslagern.md) für **AK1.5**, die **Datei-Anteile von
> AK3.2/AK3.3** und **AKE.1**; widerspricht ihr nicht. Technische Grundlage:
> [ADR-063](../factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D3 (Besitz), D8 (ADRs),
> D11 (Schnitt).
>
> **Umsetzung in drei PRs** (Entscheidung 2026-10-19, Q1) – jede Teil-Task hat ihr eigenes Issue,
> diese Spec gilt für alle drei:
>
> | Teil-Task | Issue | AK-Gruppen |
> |---|---|---|
> | T1a-1 · Dokumente sortieren | #426 | A, B, C, L + X1–X3 |
> | T1a-2 · Mischdateien & Gates | #431 | D, E, F, G, H, I + X1–X3 |
> | T1a-3 · Projekt-Orte & Texte | #432 | J, K + X1–X3 |

## Kontext

Bevor die Factory das TCH-Repo verlässt (T1b), muss **im TCH-Repo selbst** feststehen, welche Datei
der Factory gehört und welche dem Projekt – und es darf keine Datei mehr geben, die beides ist.
Heute mischen u. a. `CLAUDE.md`, `.claude/settings.json`, `.gitignore`, `factory-ci.yml`,
`pre-push.sh`, mehrere Lessons und Factory-Texte generische Regeln mit TCH-Details (pnpm, Neon,
Vercel, Routen-Doku). Außerdem liegen Factory- und App-ADRs in einer Reihe (`docs/adr/`).

T1a zieht diese Linie **verhaltensneutral**: Nach dem Merge arbeitet die Pipeline genau wie vorher,
aber jede Datei hat genau einen Besitzer, und alles Projekteigene liegt an Orten, die ein späteres
Factory-Update (T2) nie anfasst. Damit wird der riskanteste Teil des Epics mit der vorhandenen
Testsuite prüfbar, bevor irgendetwas öffentlich wird (ADR-063 „Begründung").

**Bestandsaufnahme (2026-10-19, Branch-Start):** 1 222 getrackte Dateien; 67 Dateien in
`docs/adr/` (62 ADRs inkl. Dubletten 027/032/040 + README); 7 Lessons (5 494 Zeilen);
`run-tests.sh` 8 619 Zeilen, davon ~37 Stellen zu TCH-Skripten; Markdown-Links auf `docs/adr/`
in 178 Dateien (157 davon Specs/Tasks).

## Begriffe

- **Factory-Datei** – gehört der Factory; wandert in T1b nach `nothra/dev-factory`, kommt ab T2 als
  übernommene Datei zurück.
- **Projekt-Datei** – gehört TCH; bleibt nur hier; ab T2 eine Anpassungsstelle.
- **Fragment** – Teil einer zusammengesetzten Datei (ADR-063 D3), entweder Factory- oder
  Projekt-Fragment.
- **Zuordnungstabelle** – `docs/factory/OWNERSHIP.md` (ADR-063 D11).

## Scope

**Inbegriffen:**
1. Zuordnungstabelle `docs/factory/OWNERSHIP.md` + Vollständigkeits-Test.
2. Factory-ADRs per `git mv` nach `docs/factory/adr/` (Nummern bleiben), Verweise reparieren.
3. Lessons trennen: App-Lessons nach `docs/project/lessons/`, gemischte Lessons eintragsweise
   aufteilen, Index in `PROJECT-CONTEXT.md` nachziehen.
4. `CLAUDE.md` → dünne Projekt-Datei, die `docs/factory/FACTORY.md` (generischer Teil) importiert.
5. Zusammengesetzte Dateien `.claude/settings.json` und `.gitignore` aus je einem Factory- und
   einem Projekt-Fragment.
6. `factory-ci.yml` nur noch Factory-Jobs; `lint`/`test` in projekteigenes `ci.yml`.
7. Erweiterungspunkte `scripts/project/checks/pre-commit.d/` und `pre-push.d/`;
   `routes-doc-check.sh` wandert dorthin.
8. Gate-Kommandos aus `factory.config.yml` → `commands.*`; Labels aus `labels.aspects` /
   `labels.aspects_extra`.
9. TCH-only-Skripte nach `scripts/project/`, ihre Self-Tests nach `scripts/project/tests/`.
10. Factory-Texte (Skills, Agenten, Guidelines, `OPERATING.md`) von TCH-Details befreien; Details
    in `PROJECT-CONTEXT.md` (neuer Abschnitt „Lokale Umgebung & Oberflächentests") bzw.
    projekteigene Doku.
11. ADR-063 auf **Accepted**, Nachträge für die in T1a getroffenen Detailentscheidungen.

**Nicht inbegriffen:**
- Anlegen von `nothra/dev-factory`, Historien-Übertrag, Scans, Releases (T1b).
- `factory.lock`, `factory-sync.sh` (außer dem Zusammensetzen, siehe Q2), Update-Workflow,
  Integritäts-Gate `factory-integrity`, `create_factory_issue` (T2).
- Issues/Labels umziehen, `factory-pipeline` entfernen, `build-pipeline` anlegen, repo-übergreifender
  Verweis-Check (T3). `factory-pipeline` bleibt in T1a in TCH wählbar.
- Bereinigung der ADR-Dubletten (#321) – nur Verschieben, keine Umnummerierung.
- Inhaltliche Änderung an Pipeline-Verhalten, App-Code (`app/`, `db/`, `lib/`), Deploy-Abläufen.
- Vollständige Begriffsfreiheit der Factory-Seite (AK1.3) – Pflicht erst in T1b; T1a liefert nur
  die Befreiung der in AK-K1 genannten Texte und eine Restliste (AK-K3).

## Akzeptanzkriterien

> Gruppen A–L sind so geschnitten, dass sie bei Bedarf auf mehrere PRs verteilt werden können
> (siehe Offene Frage Q1). Jede Gruppe ist für sich verhaltensneutral.

### A · Zuordnungstabelle (AK1.5)

- [ ] **AK-A1** GIVEN der Stand nach T1a WHEN man `docs/factory/OWNERSHIP.md` öffnet THEN ordnet sie
  jede getrackte Datei genau einer Seite zu (`factory` | `project`), über Pfad oder Glob-Muster,
  und nennt je Muster eine Kurzbegründung.
- [ ] **AK-A2** GIVEN die Zuordnungstabelle WHEN ein Test sie gegen `git ls-files` prüft THEN schlägt
  er fehl, sobald eine Datei **keiner** oder **mehr als einer** Seite zugeordnet ist, und nennt die
  Datei. (Negativtests: je ein Fall „fehlt" und „doppelt".)
- [ ] **AK-A3** GIVEN die in spec-424 AK1.5 genannten TCH-Inhalte (`neon-reset-int.sh`,
  `deploy-freeze*.sh`, `deploy-gate.yml`, `deploy-freeze-release.yml`, `routes-doc-check.sh`,
  `frontend-react.md`, `db-drizzle.md`, `next-auth.md`) WHEN man sie in der Tabelle sucht THEN sind
  sie `project` zugeordnet.
- [ ] **AK-A4** GIVEN die Anpassungsstellen aus ADR-063 D3 (`CLAUDE.md`, `factory.config.yml`,
  `docs/factory/PROJECT-CONTEXT.md`, `.claude/settings.project.json`, `.gitignore.project`,
  `scripts/project/**`, `docs/project/**`, `docs/adr/**`, `docs/specs/**`, `tasks/**`, projekteigene
  Workflows, App-Code) WHEN man sie in der Tabelle sucht THEN sind sie `project` zugeordnet.
- [ ] **AK-A5** GIVEN die Tabelle WHEN T1b daraus die Allowlist für `git filter-repo` erzeugen will
  THEN ist sie maschinenlesbar (ein festes, im Dokument beschriebenes Zeilenformat, das der Test aus
  AK-A2 selbst parst) – kein zweites Format, das auseinanderlaufen kann.
- [ ] **AK-A6** GIVEN eine neue Datei wird in einem späteren PR angelegt WHEN sie in der Tabelle
  fehlt THEN schlägt der Test aus AK-A2 im lokalen Gate **und** in CI fehl (ein bestehender Required
  Check, kein neuer Check-Name).

### B · ADRs trennen (Datei-Anteil AK3.2)

- [ ] **AK-B1** GIVEN die Factory-ADRs (Vorschlag in Anhang 1, final in der Zuordnungstabelle) WHEN
  T1a abgeschlossen ist THEN liegen sie unter `docs/factory/adr/` mit unverändertem Dateinamen und
  Nummer, verschoben per `git mv` (`git log --follow` zeigt die Historie vor dem Umzug).
- [ ] **AK-B2** GIVEN die App-ADRs WHEN T1a abgeschlossen ist THEN liegen sie weiter in `docs/adr/`.
- [ ] **AK-B3** GIVEN irgendeine getrackte Markdown-Datei (inkl. Specs, Tasks, Lessons, Kommentare in
  Skripten) WHEN sie per relativem Link auf eine ADR-Datei zeigt THEN existiert das Linkziel. Ein Test
  prüft das repo-weit und nennt jeden toten ADR-Link.
- [ ] **AK-B4** GIVEN beide ADR-Verzeichnisse WHEN man ihr `README.md` öffnet THEN listet jedes genau
  die ADRs seines Verzeichnisses; das Projekt-README weist auf `docs/factory/adr/` hin.
- [ ] **AK-B5** GIVEN eine **aktive** Projekt-Datei (`CLAUDE.md`, `PROJECT-CONTEXT.md`, `README.md`,
  `CONTRIBUTING.md`, `docs/project/**`, App-ADRs) WHEN sie im Fließtext eine Factory-ADR nennt THEN
  schreibt sie `Factory-ADR-NNN` (ADR-063 D8). Archiv-Dateien (`docs/specs/**`, `tasks/**`) behalten
  ihren Fließtext; nur ihre Links werden repariert (AK-B3).
- [ ] **AK-B6** GIVEN ADR-063 WHEN T1a gemergt ist THEN steht sie auf **Accepted** und enthält einen
  Nachtrag mit den in T1a getroffenen Detailentscheidungen (Q2–Q6).

### C · Lessons trennen (Datei-Anteil AK3.3)

- [ ] **AK-C1** GIVEN die App-Lessons `frontend-react.md`, `db-drizzle.md`, `next-auth.md` WHEN T1a
  abgeschlossen ist THEN liegen sie per `git mv` unter `docs/project/lessons/`.
- [ ] **AK-C2** GIVEN die gemischten Lessons (mindestens `testing.md`, `build-tooling.md`,
  `factory-workflow.md`) WHEN sie aufgeteilt werden THEN landet jeder Eintrag entweder in der
  Factory-Lesson (`docs/factory/lessons/`) oder in einer gleichnamigen Projekt-Lesson
  (`docs/project/lessons/`); ein Test belegt, dass kein Eintrag verloren ging oder verdoppelt wurde
  (Rekonstruktion gegen den Ausgangsstand, Lesson aus #196).
- [ ] **AK-C3** GIVEN der Lessons-Index in `PROJECT-CONTEXT.md` WHEN T1a abgeschlossen ist THEN führt er
  Factory- und Projekt-Lessons in getrennten Gruppen, jeder Link zeigt auf eine existierende Datei,
  und jede Index-Zeile behält ihren „Laden bei"-Trigger.
- [ ] **AK-C4** GIVEN die Kern-Kurzregeln in `PROJECT-CONTEXT.md` WHEN eine verlinkte Lesson umgezogen
  ist THEN zeigt der Link auf den neuen Ort.
- [ ] **AK-C5** GIVEN ein Skill (`/codify`) schreibt ein neues Learning WHEN er die Zieldatei wählt
  THEN beschreibt seine Anleitung beide Orte und die Zuordnungsregel (Factory vs. Projekt).

### D · `CLAUDE.md` und `FACTORY.md`

- [ ] **AK-D1** GIVEN die heutige `CLAUDE.md` WHEN T1a abgeschlossen ist THEN steht ihr generischer
  Teil (Kernprinzip, Prinzipien, Pipeline, Coding-Guidelines-Imports, Kern-Kurzregeln Git, Agent-Rollen,
  Work Tracking, generische Guardrails, Self-Improvement, Versionsangabe) in
  `docs/factory/FACTORY.md`.
- [ ] **AK-D2** GIVEN die neue `CLAUDE.md` WHEN man sie öffnet THEN enthält sie nur
  `@docs/factory/FACTORY.md`, `@docs/factory/PROJECT-CONTEXT.md` und die TCH-eigenen Regeln
  (mindestens die Routen-Doku-Regel aus #145).
- [ ] **AK-D3** GIVEN alte und neue Fassung WHEN man den Inhalt vergleicht THEN ist jede inhaltliche
  Zeile der alten `CLAUDE.md` in genau einer der beiden Dateien wiederzufinden (außer Import- und
  Überschriftsanpassungen); ein Test oder eine dokumentierte Rekonstruktion belegt das.
- [ ] **AK-D4** GIVEN `import-context-limit-check.sh` WHEN er läuft THEN zählt er die verschachtelten
  Imports (`CLAUDE.md` → `FACTORY.md` → Guidelines) vollständig, bleibt unter der Grenze und schlägt
  in einem Negativtest fehl, wenn ein nur über `FACTORY.md` eingebundener Import die Grenze reißt.
- [ ] **AK-D5** GIVEN eine neue Claude-Code-Session im Repo WHEN sie startet THEN sind dieselben
  Guidelines im Dauerkontext wie vorher (Nachweis: Liste der geladenen Dateien vorher/nachher in der
  Task-Datei).

### E · Zusammengesetzte Dateien

- [ ] **AK-E1** GIVEN `.claude/settings.json` WHEN T1a abgeschlossen ist THEN existieren
  `.claude/settings.factory.json` (Factory) und `.claude/settings.project.json` (Projekt, u. a.
  `Edit(app/**)`-artige Regeln), und `.claude/settings.json` ist **inhaltsgleich** zum Stand vor T1a
  (gleiche Hooks in gleicher Reihenfolge, gleiche Menge an Allow/Deny/Ask-Regeln).
- [ ] **AK-E2** GIVEN `.gitignore` WHEN T1a abgeschlossen ist THEN existieren
  `docs/factory/gitignore.factory` und `.gitignore.project`, und die Menge der ignorierten Pfade ist
  unverändert (Nachweis: `git status --ignored` bzw. `git check-ignore` über eine feste Probenliste
  vorher/nachher gleich).
- [ ] **AK-E3** GIVEN die Fragmente WHEN man das dokumentierte Zusammensetz-Kommando ausführt THEN
  entsteht byte-identisch die committete Datei (deterministisch, zweimal ausgeführt = gleiches
  Ergebnis); ein Test schlägt fehl, wenn committete Datei und Zusammensetzung auseinanderlaufen.
- [ ] **AK-E4** GIVEN ein Entwickler will eine Projekt-Permission ergänzen WHEN er die Doku liest
  THEN steht dort: Projekt-Fragment ändern, neu zusammensetzen, beide committen.

### F · CI-Workflows

- [ ] **AK-F1** GIVEN `.github/workflows/factory-ci.yml` WHEN T1a abgeschlossen ist THEN enthält es nur
  Factory-Jobs (`pr-closes-issue`, `issue-sync`, `config-validation`, `factory-self-test`,
  `post-merge-verify`) und keinen `pnpm`-Aufruf.
- [ ] **AK-F2** GIVEN das neue projekteigene `.github/workflows/ci.yml` WHEN ein PR läuft THEN führt es
  die Jobs `lint` und `test` mit unverändertem Job-Namen, Trigger und Inhalt aus.
- [ ] **AK-F3** GIVEN das Ruleset `protect-main` WHEN man die Namen der Required Checks vor und nach
  T1a vergleicht THEN sind sie identisch und werden auf dem T1a-PR alle gemeldet (kein „Expected –
  waiting"-Check).
- [ ] **AK-F4** GIVEN `deploy-gate.yml`, `deploy-freeze-release.yml`, `factory-poll.yml` WHEN T1a
  abgeschlossen ist THEN sind sie in der Tabelle zugeordnet (Deploy-Workflows `project`,
  `factory-poll.yml` `factory`) und rufen Skripte unter ihren neuen Pfaden auf.

### G · Erweiterungspunkte in den Git-Gates

- [ ] **AK-G1** GIVEN ausführbare Skripte in `scripts/project/checks/pre-commit.d/` bzw. `pre-push.d/`
  WHEN `pre-commit.sh` bzw. `pre-push.sh` läuft THEN ruft es sie in lexikalischer Reihenfolge auf;
  scheitert eines, scheitert das Gate mit dem Skriptnamen in der Meldung (fail-closed).
- [ ] **AK-G2** GIVEN das Verzeichnis fehlt oder ist leer WHEN das Gate läuft THEN läuft es ohne
  Fehler weiter.
- [ ] **AK-G3** GIVEN eine nicht ausführbare Datei im Verzeichnis WHEN das Gate läuft THEN wird sie
  nicht stillschweigend übergangen: das Gate scheitert mit Hinweis auf das fehlende Ausführbar-Bit.
- [ ] **AK-G4** GIVEN `routes-doc-check.sh` WHEN T1a abgeschlossen ist THEN liegt es unter
  `scripts/project/checks/pre-push.d/`, `pre-push.sh` nennt es nicht mehr namentlich, und eine
  Routen-Doku-Drift blockiert den Push weiterhin (Verhaltenstest, nicht nur Wiring-Grep).

### H · Gate-Kommandos aus der Konfiguration

- [ ] **AK-H1** GIVEN `factory.config.yml` WHEN T1a abgeschlossen ist THEN enthält es
  `commands.lint`, `commands.test`, `commands.typecheck`, `commands.format`, `commands.coverage` mit
  den heutigen TCH-Werten.
- [ ] **AK-H2** GIVEN `factory.defaults.yml` WHEN man es liest THEN enthält es **keinen** pnpm-Default
  für `commands.*`.
- [ ] **AK-H3** GIVEN `pre-commit.sh`, `pre-push.sh`, `run-pipeline.sh` WHEN sie ein Gate-Kommando
  brauchen THEN lesen sie es aus der Konfiguration; die bestehenden Env-Overrides
  (`FACTORY_LINT_COMMAND` …) behalten Vorrang, und die Sonderbedeutung „leerer Format-Wert =
  übersprungen" bleibt erhalten.
- [ ] **AK-H4** GIVEN ein Pflicht-Kommando fehlt in Konfiguration und Env WHEN das Gate läuft THEN
  bricht es mit einer Meldung ab, die den fehlenden Schlüssel nennt (fail-closed, kein stiller
  pnpm-Fallback).
- [ ] **AK-H5** GIVEN `config-validation-check.sh` WHEN `commands.*` einen ungültigen Typ hat THEN
  lehnt die Validierung die Konfiguration ab (Positiv- und Negativtest).
- [ ] **AK-H6** GIVEN `start-work.sh` WHEN es einen Worktree vorbereitet THEN kommen
  Abhängigkeits-Installation und der Hinweis „vor dem ersten E2E-Lauf seeden" aus der
  Projekt-Konfiguration statt aus dem Skript (siehe Q4); ohne Eintrag entfällt der Schritt still.

### I · Labels aus der Konfiguration

- [ ] **AK-I1** GIVEN `factory.defaults.yml` WHEN man es liest THEN enthält es die generischen
  Art- und Aspekt-Labels (`labels.kinds`, `labels.aspects`); `factory.config.yml` enthält
  `labels.aspects_extra` mit den TCH-eigenen Aspekten – in T1a mindestens `factory-pipeline`
  (wandert in T3).
- [ ] **AK-I2** GIVEN `git-workflow.md` WHEN man die Label-Tabelle liest THEN beschreibt sie das
  Schema und die generischen Labels und verweist für projekteigene Labels auf `PROJECT-CONTEXT.md`;
  der bestehende Label-Drift-Guard prüft gegen die neue Quelle.
- [ ] **AK-I3** GIVEN `start-work.sh --labels` bzw. der Issue-Seam WHEN ein Aspekt-Label übergeben
  wird THEN verhalten sie sich wie vor T1a (siehe Q5).

### J · TCH-Skripte und ihre Tests an projekteigene Orte

- [ ] **AK-J1** GIVEN `neon-reset-int.sh`, `deploy-freeze.sh`, `deploy-freeze-notify.sh` WHEN T1a
  abgeschlossen ist THEN liegen sie per `git mv` unter `scripts/project/`, und alle Aufrufer
  (Workflows, Doku, Skripte) nutzen den neuen Pfad.
- [ ] **AK-J2** GIVEN die Self-Tests dieser Skripte und von `routes-doc-check.sh` WHEN T1a
  abgeschlossen ist THEN liegen sie in einer projekteigenen Suite unter `scripts/project/tests/`, und
  `run-tests.sh` enthält keinen Verweis mehr auf diese Skripte (Umfang inkl. Workflow-Tests und
  Fixture-Namen: Q9; gemeinsame Helfer-Lib: Q10).
- [ ] **AK-J3** GIVEN die projekteigene Suite WHEN ein PR läuft THEN läuft sie in CI innerhalb eines
  bestehenden Required Checks und macht ihn bei Fehlschlag rot.
- [ ] **AK-J4** GIVEN Anzahl der Testfälle WHEN man vor und nach T1a zählt THEN ist
  `Factory-Suite nachher + Projekt-Suite nachher = Suite vorher` (zuzüglich neuer T1a-Tests,
  separat ausgewiesen); kein Test geht verloren.

### K · Factory-Texte generisch

- [ ] **AK-K1** GIVEN `implement.md`, `coding-agent.md`, `review-agent.md`, `git-workflow.md`,
  `testing-standards.md`, `bash-gotchas.md`, `OPERATING.md` WHEN man sie nach `pnpm`, `Neon`,
  `Vercel`, `db:seed`, `Drizzle` durchsucht THEN gibt es keinen Treffer mehr; wo nötig, verweisen
  sie auf `PROJECT-CONTEXT.md` → „Lokale Umgebung & Oberflächentests" bzw. auf projekteigene Doku.
- [ ] **AK-K2** GIVEN die TCH-spezifischen Abschnitte von `OPERATING.md` (u. a. Deploy-Gate-Secrets,
  Vercel-Production-Branch, destruktive Produktions-Migrationen) WHEN T1a abgeschlossen ist THEN
  stehen sie in einer projekteigenen Datei unter `docs/project/` (`betrieb.md`, Q11), und `OPERATING.md` verweist an
  den Stellen darauf, wo ein Projekt typischerweise Eigenes ergänzt.
- [ ] **AK-K3** GIVEN alle `factory`-Dateien laut Tabelle WHEN man sie nach den AK1.3-Begriffen
  (`Veranstaltung`, `Montagsrunde`, `Thekenwart`, `TCH`, `tch-gastro`, `Neon`, `Vercel`) durchsucht
  THEN liegt die Trefferliste (Datei, Anzahl) in der Task-Datei als Eingabe für T1b vor; T1a muss sie
  außerhalb von AK-K1 nicht auf null bringen.

### L · Kleinfunde

- [ ] **AK-L1** GIVEN `docs/factory/kleinfunde.md` WHEN T1a abgeschlossen ist THEN liegen Einträge zu
  Projekt-Dateien in `docs/project/kleinfunde.md`, Einträge zu Factory-Dateien bleiben; die Skills,
  die Kleinfunde schreiben, nennen beide Orte und die Zuordnungsregel (siehe Q6).

### Epic-weit (AKE.1 für T1a)

- [ ] **AK-X1** GIVEN der Stand vor T1a (`main` beim Branch-Start) und nach T1a WHEN man
  `run-tests.sh` (+ Projekt-Suite), `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`
  ausführt THEN sind beide Stände grün; die Ergebnisse stehen in der Task-Datei.
- [ ] **AK-X2** GIVEN der T1a-PR WHEN er gemergt wird THEN sind alle Required Checks grün und ihre
  Namen unverändert (AK-F3).
- [ ] **AK-X3** GIVEN ein Stage-2-Skill-Lauf nach dem Merge (z. B. `start-work.sh` im ID-Modus und
  `pre-push.sh` auf einem Probe-Branch) WHEN er läuft THEN verhält er sich wie vorher (Ausgabe und
  Exit-Code der Gates gleich, bis auf geänderte Pfade in Meldungen).

## Fehlerszenarien

- [ ] **F-1** Eine Datei fehlt in der Zuordnungstabelle oder steht doppelt → AK-A2-Test rot, Datei
  benannt.
- [ ] **F-2** Ein ADR-Link zeigt nach dem Umzug ins Leere → AK-B3-Test rot, Quelle und Ziel benannt.
- [ ] **F-3** Ein Lesson-Eintrag geht beim Aufteilen verloren oder wird verdoppelt → AK-C2-Test rot.
- [ ] **F-4** Committete `.claude/settings.json`/`.gitignore` weicht von der Zusammensetzung ab → AK-E3-Test rot.
- [ ] **F-5** Ein Projekt-Check in `pre-push.d/` scheitert oder ist nicht ausführbar → Push blockiert,
  Skriptname in der Meldung (AK-G1/G3).
- [ ] **F-6** Ein Pflicht-Gate-Kommando ist nicht konfiguriert → Gate bricht mit Schlüsselnamen ab (AK-H4).
- [ ] **F-7** Ein Required Check verschwindet durch die Workflow-Teilung → PR bleibt blockiert; T1a gilt
  erst als fertig, wenn alle Required Checks gemeldet und grün sind (AK-F3).

## Offene Fragen

> Q2–Q6 sind Detailentscheidungen **innerhalb** von ADR-063 D3/D8; sie brauchen kein neues
> `/architecture`, werden aber als Nachtrag in ADR-063 festgehalten (AK-B6). Die Empfehlung gilt,
> solange der Entwickler nicht widerspricht.
>
> **Stand 2026-10-20:** Q2–Q6 sind wie empfohlen entschieden und stehen im
> [Nachtrag von ADR-063](../factory/adr/063-factory-eigenes-repo-vendored-manifest.md) (aus T1a-1).
> Q7 und Q8 kamen beim `/requirements`-Lauf für T1a-2 (#431) dazu, Q9–Q12 beim Lauf für
> T1a-3 (#432, 2026-10-22).

- [x] **Q1 · Weiter teilen?** Umfang: 54 AK, grob 60–80 Dateien von Hand plus ~160 Link-Reparaturen
  per Skript. Das liegt deutlich über der Turn-Limit-Schwelle (> 25 AK / > 40 Dateien, Lesson #369).
  **Entschieden (2026-10-19, Entwickler):** in drei nacheinander laufende PRs geteilt, je eigene
  Task/Issue, alle auf diese Spec verweisend:
  - **T1a-1 · Dokumente sortieren (#426):** A, B, C, L (Tabelle zuerst, dann ADRs, Lessons, Kleinfunde).
  - **T1a-2 · Mischdateien & Gates (#431):** D, E, F, G, H, I.
  - **T1a-3 · Projekt-Orte & Texte (#432):** J, K.
  Jede Teil-PR erfüllt AK-X1–X3 für sich und hält die Zuordnungstabelle (AK-A2) aktuell. Reihenfolge
  strikt T1a-1 → T1a-2 → T1a-3 → T1b; AK-B6 (ADR-063 Accepted + Nachtrag Q2–Q6) liegt in T1a-1,
  damit die Detailentscheidungen vor T1a-2 feststehen.
- [x] **Q2 · Zusammensetzen vor T2:** `factory-sync.sh` kommt erst in T2. **Empfehlung:** T1a legt
  `scripts/factory-sync.sh` mit **nur** dem Modus `--compose` an (ADR-063 D3 nennt genau diesen
  Aufruf); T2 ergänzt die übrigen Modi.
- [x] **Q3 · ADR-Zuordnung:** Vorschlag in Anhang 1. Grenzfälle: ADR-029 (Ruleset, generisches
  Factory-Prinzip mit TCH-Check-Namen) → Factory; ADR-063 selbst → Factory (regelt die Verteilung);
  ADR-015/017/032-deploy-freeze (Deploy) → Projekt.
- [x] **Q4 · Worktree-Vorbereitung in `start-work.sh`:** `pnpm install` und der `db:seed`-Hinweis sind
  TCH-spezifisch. **Empfehlung:** optionale Schlüssel `commands.install` und
  `start_work.hint` in `factory.config.yml` (gleiches Muster wie `commands.*`).
- [x] **Q5 · Label-Validierung:** ADR-063 D3 sagt, `start-work.sh` und Seam „validieren gegen die
  Vereinigung". Heute gibt es keine Ablehnung, nur fail-open-Degradation (fehlendes Label fällt weg).
  **Empfehlung:** in T1a nur die Datenquelle verlegen, Verhalten unverändert lassen (AKE.1); eine
  harte Ablehnung erst in T3 zusammen mit dem Label-Wechsel.
- [x] **Q6 · Kleinfunde:** **Empfehlung:** aufteilen nach betroffener Datei (AK-L1); ab T2 gehen
  Factory-Kleinfunde ohnehin als Issue ins Factory-Repo (ADR-063 D7).

- [x] **Q7 · Quelle der CI-Kommandos (T1a-2, #431):** Die Jobs `lint`/`test` lesen ihr Kommando heute
  aus den Repository-Variablen `FACTORY_LINT_COMMAND`/`FACTORY_TEST_COMMAND`. **Entschieden
  (2026-10-20, Entwickler):** Das projekteigene `ci.yml` behält die Repository-Variablen (AK-F2,
  Inhalt unverändert). Sie wirken dort wie der Env-Override, der nach AK-H3 Vorrang vor
  `commands.*` hat. Der Kommentar „gleiche Variable wie in `pre-commit.sh`/`pre-push.sh`, kein
  Doppel-Pflegen" wird an den neuen Stand angepasst (lokal: `commands.*`, Override per Env).
  Eine Umstellung von CI auf `commands.*` ist nicht Teil von T1a.
- [x] **Q8 · Größe von T1a-2 (#431):** D–I umfassen 26 AK plus AK-X1–X3, das liegt über der
  Turn-Limit-Schwelle (Lesson #369). **Entschieden (2026-10-20, Entwickler):** **ein** PR, aber
  Phase 2 **manuell in Etappen** (Stage 2, je Etappe eine frische Session) statt `run-pipeline.sh`.
  Die fehlende OTEL-Telemetrie wird in der Task-Datei vermerkt (Lesson #346).

- [x] **Q9 · Umfang der Projekt-Suite (T1a-3, #432):** AK-J2 nennt nur die Self-Tests der Skripte.
  `run-tests.sh` prüft aber auch die Projekt-Workflows `deploy-gate.yml` und
  `deploy-freeze-release.yml` (#66, #173, „Deploy-Gate-Verdrahtung"). Außerdem verwenden mehrere
  Factory-Mechanik-Tests (#426 Zuordnung, #431 Gates/Workflows) TCH-Pfade als Beispieldaten.
  **Entschieden (2026-10-22, Entwickler):** Jeder Test, der eine **Projekt-Datei** laut
  `OWNERSHIP.md` prüft, zieht in die Projekt-Suite – also die Skript-Tests und die Workflow-Tests.
  Factory-Mechanik-Tests, die TCH-Pfade nur als **Fixture-Daten** nutzen, bekommen neutrale Namen.
  Ihr Anteil, der echte TCH-Dateien prüft, zieht mit um. Maßstab für AK-J2: Ein Grep nach den
  TCH-Skript- und TCH-Workflow-Namen in `run-tests.sh` liefert danach keinen Treffer.
  Grund: In T1b läuft `run-tests.sh` in `nothra/dev-factory`, wo es diese Dateien nicht gibt.
- [x] **Q10 · Gemeinsame Test-Helfer (T1a-3, #432):** **Entschieden (2026-10-22, Entwickler):** Die
  Prüf-Helfer (`assert_exit`, `assert_true`, `assert_contains_286`, `assert_absent` u. Ä.) ziehen
  in eine Factory-Lib unter `scripts/checks/tests/lib/`. `run-tests.sh` und die Projekt-Suite
  sourcen beide diese Lib, es gibt keine Kopie. Die Lib ist eine Factory-Datei und kommt ab T2 mit
  Factory-Updates. Die Projekt-Suite läuft im Required Check `test` des projekteigenen `ci.yml`
  (AK-J3), nicht in `factory-ci.yml`, denn diese Datei gehört der Factory.
- [x] **Q11 · Ort der TCH-Betriebsdoku (T1a-3, #432):** **Entschieden (2026-10-22, Entwickler):**
  - Die TCH-Abschnitte aus `OPERATING.md` (AK-K2) ziehen nach `docs/project/betrieb.md`. Dazu
    gehören Deploy-Gate-Secrets, der Vercel-Production-Branch, destruktive Produktions-Migrationen
    und die TCH-Zeilen der Werkzeug-Tabelle.
  - Die lokalen Setup- und Oberflächentest-Details aus `implement.md`/`coding-agent.md`
    (`db:up`, `db:seed`, E2E) stehen ebenfalls dort.
  - `PROJECT-CONTEXT.md` bekommt nur einen **kurzen** Abschnitt „Lokale Umgebung &
    Oberflächentests" (Richtwert ≤ 10 Zeilen) mit dem Verweis. Er schont den gedeckelten
    `@import`-Dauerkontext (Factory-ADR-047).
- [x] **Q12 · Ablauf von T1a-3 (#432):** J + K umfassen 7 AK plus AK-X1–X3. Das liegt unter der
  Turn-Limit-Schwelle, aber `run-tests.sh` (~9 400 Zeilen) ist groß, und `implement.md` braucht
  den `.claude/**`-Patch-Weg. **Entschieden (2026-10-22, Entwickler):** wie Q8 – ein PR, Phase 2
  manuell in zwei Etappen (Etappe 1 = J, Etappe 2 = K), je eine frische Session. Für diese Task
  gibt es keine OTEL-Telemetrie (Lesson #346).

## Anhang 1 · Vorschlag ADR-Zuordnung (final in `OWNERSHIP.md`)

| Seite | ADRs |
|---|---|
| **Factory** → `docs/factory/adr/` | 001–013, 018, 019, 029, 030, 037, 038, 040 (beide), 041, 042, 043, 045, 047, 049, 051, 063 |
| **Projekt** → bleibt `docs/adr/` | 014–017, 020–028 (inkl. beider 027), 031, 032 (beide), 033–036, 039, 044, 046, 048, 050, 052–062 |
