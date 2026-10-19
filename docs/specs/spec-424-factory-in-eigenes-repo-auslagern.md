# Spec: Factory in eigenes Repo auslagern (Epic)

> **Epic-Spec.** #424 ist das Dach. Umgesetzt wird in drei Teil-Tasks (T1–T3), die je ein eigenes
> Issue, eine eigene Detail-Spec und einen eigenen PR bekommen und **nacheinander** laufen
> (T1 → T2 → T3). Diese Spec legt das gemeinsame Ziel, den Schnitt und die Akzeptanzkriterien
> auf Epic-Ebene fest; die Detail-Specs dürfen verfeinern, aber nicht widersprechen.

## Kontext

Die dm Development Factory (Pipeline-Skripte, Skills, Gates, Hooks, Agent-Personas,
Factory-Doku) wird heute **im selben Repo** wie die TCH-App weiterentwickelt. Werkzeug und
Produkt teilen sich Historie, Issue-Nummernraum, ADR-Nummernfolge und Lessons. Folgen:

- Factory-Verbesserungen sind an TCH gebunden und für **andere Projekte nicht wiederverwendbar**
  (Hauptziel dieses Epics).
- Der TCH-Backlog mischt Produkt- und Werkzeugarbeit (heute nur über das Aspekt-Label
  `factory-pipeline` filterbar, #315).
- Die ADR-Reihe mischt Factory- und App-Entscheidungen (inkl. Nummernkollisionen, #321).

**Entscheidungen aus dem Gespräch mit dem Entwickler (2026-10-19):**

| Frage | Entscheidung |
|---|---|
| Ziel | Factory wird ein **wiederverwendbares Werkzeug** für beliebige Projekte; TCH ist erster Konsument |
| Ort des Factory-Repos | Neues **privates GitHub-Repo unter `nothra`** (nicht dm-GitLab) |
| Einbindung in Projekte | Factory-Dateien liegen **als festgelegte Version committet** im Projekt-Repo (keine Laufzeit-Abhängigkeit vom Factory-Repo) |
| Schnitt | Epic + 3 Teil-Tasks |
| Historie | Die bisherige Git-Historie der Factory-Dateien **wird mitgenommen** |
| Update-Auslöser | Eine neue Factory-Version erzeugt **automatisch einen Update-PR** im Projekt-Repo |
| Lokale Änderungen an übernommenen Dateien | **Verboten, Gate blockiert**; Anpassung nur über vorgesehene Stellen |
| Weiterentwicklung der Factory | **Mit der eigenen Pipeline** (Factory-Repo nutzt sich selbst) |
| Neues Projekt aufsetzen | **Teil des Epics** als Nachweis der Wiederverwendbarkeit |

## Begriffe

- **Factory-Repo** – das neue Repo, kanonische Quelle der Factory.
- **Projekt-Repo** – ein Repo, das die Factory nutzt (zuerst `nothra/tch-gastro-services`).
- **Factory-Version** – ein benannter, unveränderlicher Stand des Factory-Repos.
- **Übernommene Dateien** – Dateien, die aus einer Factory-Version ins Projekt-Repo kommen und
  dort nicht verändert werden dürfen.
- **Anpassungsstellen** – Dateien/Orte im Projekt-Repo, die das Projekt selbst pflegt und die ein
  Factory-Update nie überschreibt (mindestens: `factory.config.yml`,
  `docs/factory/PROJECT-CONTEXT.md`, projektspezifische Lessons, projekteigene ADRs/Specs/Tasks,
  projekteigene CI-Workflows). Die vollständige Liste legt T1/`/architecture` fest.

## Scope

**Inbegriffen:**
- T1 · **Werkzeugkasten packen:** Factory-Repo anlegen; generische Factory-Inhalte mit Historie
  dorthin; TCH-spezifische Inhalte bleiben in TCH; Factory-Versionen veröffentlichen; Factory-Repo
  entwickelt sich mit der eigenen Pipeline (Gates, Self-Tests, CI).
- T2 · **Werkzeug abholen:** Projekt-Repo bindet eine Factory-Version ein; neue Version →
  automatischer Update-PR; Gate gegen lokale Änderungen an übernommenen Dateien; ein neues,
  leeres Projekt lässt sich aus dem Factory-Repo aufsetzen (Nachweis); Factory-Funde, die bei der
  Projekt-Arbeit entstehen (Issues, Kleinfunde, generische Learnings), landen direkt im Factory-Repo.
- T3 · **Umziehen:** offene `factory-pipeline`-Issues, Factory-ADRs und Factory-Lessons wandern ins
  Factory-Repo; TCH-Doku und Prozess verweisen für Factory-Arbeit auf das Factory-Repo; das Label
  `factory-pipeline` wandert ins Factory-Repo, TCH bekommt dafür `build-pipeline` für die
  projekteigene Build-/CI-/Deploy-Pipeline.

**Nicht inbegriffen:**
- Umzug auf dm-GitLab bzw. Rückführung in `ctech_tv/dm-factory-template` (eigener späterer Schritt).
- Unterstützung anderer Plattformen als GitHub (GitLab o. ä.).
- Verteilung als Claude-Code-Plugin (ggf. späteres Folge-Thema).
- Inhaltliche Weiterentwicklung der Factory (neue Skills/Gates/Verhalten) – das Epic **verschiebt**,
  es ändert kein Pipeline-Verhalten. Ausnahme: was für Versionierung, Update und Änderungs-Gate
  neu nötig ist.
- Änderungen an der TCH-App (`app/`, `db/`, `lib/`) und an TCH-Deploy-Abläufen
  (Deploy-Gate, INT-Refresh, Deploy-Freeze) außer Verweisen.
- Inhaltliches Abarbeiten der umziehenden Factory-Issues.
- Weitere echte Konsumenten-Projekte außer TCH und dem Nachweis-Projekt.

## Akzeptanzkriterien

### T1 · Werkzeugkasten packen

- [ ] **AK1.1** GIVEN das Epic ist umgesetzt WHEN man das Factory-Repo öffnet THEN existiert es als
  privates Repo unter `nothra` und enthält Pipeline-Skripte, Skills, Agent-Personas, Gates/Hooks,
  generische Guidelines und Factory-Doku.
- [ ] **AK1.2** GIVEN eine aus TCH übernommene Factory-Datei WHEN man im Factory-Repo deren Historie
  ansieht (`git log --follow`) THEN sind die Commits aus der TCH-Zeit sichtbar.
- [ ] **AK1.3** GIVEN das Factory-Repo WHEN man es nach TCH-Domänenbegriffen und TCH-Infrastruktur
  durchsucht (mindestens: `Veranstaltung`, `Montagsrunde`, `Thekenwart`, `TCH`, `tch-gastro`,
  `Neon`, `Vercel`) THEN gibt es keinen Treffer außerhalb ausdrücklich erlaubter Stellen
  (z. B. Herkunftshinweis, Beispiel-Doku); die erlaubten Stellen sind dokumentiert.
- [ ] **AK1.4** GIVEN die Historie wird mitgenommen WHEN man die **Historie** des Factory-Repos nach
  Secrets und TCH-Anwendungsdaten durchsucht THEN enthält sie weder Secrets noch App-Code
  (`app/`, `db/`, `lib/`) noch personenbezogene Daten.
- [ ] **AK1.5** GIVEN TCH-spezifische Factory-nahe Inhalte (u. a. `scripts/neon-reset-int.sh`,
  Deploy-Gate-/Deploy-Freeze-Workflows, `routes-doc-check.sh`, App-Lessons wie
  `frontend-react.md`, `db-drizzle.md`, `next-auth.md`) WHEN T1 abgeschlossen ist THEN liegt für
  jede Factory-Datei eine dokumentierte Zuordnung „generisch → Factory-Repo" bzw.
  „TCH-spezifisch → bleibt in TCH" vor, und keine Datei fehlt in der Zuordnung.
- [ ] **AK1.6** GIVEN eine Änderung im Factory-Repo WHEN sie gepusht/als PR gestellt wird THEN laufen
  dort die Factory-Gates und die Factory-Self-Tests (heute `run-tests.sh`) und sind grün; `main` ist
  wie in TCH nur über PR änderbar.
- [ ] **AK1.7** GIVEN das Factory-Repo WHEN ein Entwickler dort eine neue Task startet THEN funktioniert
  der gewohnte Ablauf (`start-work.sh` → `/requirements` … `/pr-shepherd`) inkl. Issue-first und
  Task↔Issue-Invariante.
- [ ] **AK1.8** GIVEN ein gemergter Stand im Factory-Repo WHEN eine Factory-Version veröffentlicht
  wird THEN hat sie eine eindeutige, aufsteigend vergleichbare Kennung und einen menschenlesbaren
  Änderungsvermerk (was ist neu, was bricht).

### T2 · Werkzeug abholen

- [ ] **AK2.1** GIVEN das TCH-Repo nach T2 WHEN man nachsieht, welche Factory-Version eingebunden ist
  THEN steht genau eine Version an genau einer Stelle im Repo, und die übernommenen Dateien
  entsprechen exakt dieser Version.
- [ ] **AK2.2** GIVEN TCH nutzt Factory-Version N WHEN Version N+1 veröffentlicht wird THEN entsteht
  ohne menschliches Zutun ein Update-PR im TCH-Repo, der die Version auf N+1 hebt, die übernommenen
  Dateien aktualisiert und den Änderungsvermerk von N+1 im PR-Body zeigt.
- [ ] **AK2.3** GIVEN ein Update-PR WHEN er erstellt wird THEN verändert er keine Anpassungsstelle
  (`factory.config.yml`, `PROJECT-CONTEXT.md`, projekteigene Lessons/ADRs/Specs/Tasks/Workflows).
- [ ] **AK2.4** GIVEN ein Update-PR WHEN die CI des Projekt-Repos läuft THEN laufen dieselben Gates wie
  bei jedem anderen PR; ein Update wird nie automatisch gemergt.
- [ ] **AK2.5** GIVEN eine lokale Änderung an einer übernommenen Datei im Projekt-Repo WHEN sie
  committet/gepusht bzw. als PR gestellt wird THEN lehnt ein Gate sie ab und nennt die Datei und den
  Hinweis, dass die Änderung ins Factory-Repo gehört. Das Gate greift auch serverseitig (CI), nicht
  nur im lokalen Hook.
- [ ] **AK2.6** GIVEN ein Update-PR WHEN das Änderungs-Gate läuft THEN lässt es genau diese
  Versionsanhebung zu (das Update selbst wird nicht als „lokale Änderung" abgelehnt).
- [ ] **AK2.7** GIVEN ein leeres neues Repo WHEN man es nach dokumentierter Anleitung aus dem
  Factory-Repo aufsetzt THEN hat es eine eingebundene Factory-Version, installierte Hooks,
  eine Vorlage für die Anpassungsstellen, und `start-work.sh` sowie die Gates laufen grün. Dieser
  Nachweis ist wiederholbar dokumentiert (Anleitung + Ergebnis).
- [ ] **AK2.8** GIVEN das Factory-Repo ist nicht erreichbar WHEN im Projekt-Repo gearbeitet, getestet
  oder die Pipeline gefahren wird THEN funktioniert alles wie gewohnt (nur Updates sind blockiert).

#### Factory-Funde aus Projekt-Arbeit (Entscheidung 2026-10-19: „direkt ins Factory-Repo")

- [ ] **AK2.9** GIVEN ein Skill (`/review`, `/security-review`, `/test`, `/refactor`, `/codify`)
  findet im Projekt-Repo einen Out-of-Scope-Fund, der übernommene Factory-Dateien betrifft, oberhalb
  der Issue-Schwelle (ADR-043) WHEN er ihn ablegt THEN entsteht das Issue im **Factory-Repo** (nicht
  im Projekt-Repo), mit Herkunftsprojekt und Verweis auf Task/PR; die Task-Datei im Projekt-Repo
  verweist auf das Factory-Issue.
- [ ] **AK2.10** GIVEN ein solcher Fund liegt **unterhalb** der Issue-Schwelle (heute Fall für
  `kleinfunde.md`) WHEN er abgelegt wird THEN landet er ebenfalls im Factory-Repo und nie in einer
  übernommenen Datei des Projekt-Repos (die Form legt `/architecture` fest).
- [ ] **AK2.11** GIVEN `/codify` extrahiert im Projekt-Repo ein Learning WHEN es die Factory selbst
  betrifft (Pipeline, Skills, Gates, generische Guidelines) THEN wird es im Factory-Repo vorgeschlagen;
  ein projektspezifisches Learning bleibt in den projekteigenen Lessons.
- [ ] **AK2.12** GIVEN ein Fund WHEN ein Skill entscheidet „Factory oder Projekt" THEN folgt er einer
  dokumentierten Zuordnungsregel; im Zweifel geht der Fund ins Factory-Repo (fail-safe wie #315).
- [ ] **AK2.13** GIVEN ein Fund wird ins Factory-Repo übertragen WHEN das Issue entsteht THEN enthält es
  keine Secrets, keine personenbezogenen Daten und keine Inhalte aus Projekt-Env-Dateien; es
  beschreibt den Factory-Defekt, nicht die Projekt-Fachlichkeit.

### T3 · Umziehen

- [ ] **AK3.1** GIVEN die offenen TCH-Issues mit Label `factory-pipeline` WHEN T3 abgeschlossen ist
  THEN ist jedes entweder ins Factory-Repo übertragen (mit Verweis im alten Issue) oder bewusst in
  TCH belassen (mit Begründung, z. B. TCH-spezifisch); die Liste der Entscheidungen ist dokumentiert.
- [ ] **AK3.2** GIVEN die Factory-ADRs in `docs/adr/` WHEN T3 abgeschlossen ist THEN liegen sie im
  Factory-Repo; in TCH bleiben die App-ADRs; jede bestehende ADR-Referenz in beiden Repos (Code,
  Doku, Lessons, Specs) zeigt auf ein existierendes Ziel.
- [ ] **AK3.3** GIVEN die Lessons und `PROJECT-CONTEXT.md`-Index WHEN T3 abgeschlossen ist THEN liegen
  generische Lessons im Factory-Repo, TCH-spezifische in TCH, und beide Indizes verweisen nur auf
  existierende Einträge.
- [ ] **AK3.4** GIVEN ein Entwickler will in TCH die Factory ändern WHEN er `CLAUDE.md`,
  `README.md` oder `git-workflow.md` liest THEN steht dort, dass Factory-Arbeit im Factory-Repo
  stattfindet und wie sie nach TCH gelangt.
- [ ] **AK3.5** GIVEN T3 ist abgeschlossen WHEN man in TCH einen neuen Factory-PR versucht (Änderung
  an übernommenen Dateien) THEN greift AK2.5.
- [ ] **AK3.6** GIVEN T3 ist abgeschlossen WHEN man die Labels der beiden Repos ansieht THEN existiert
  `factory-pipeline` im **Factory-Repo** (die übertragenen Issues tragen es dort weiter) und im
  **TCH-Repo nicht mehr**.
- [ ] **AK3.7** GIVEN T3 ist abgeschlossen WHEN in TCH ein Skript, Skill oder eine Doku ein Aspekt-Label
  anbietet oder setzt (u. a. `start-work.sh --labels`, Issue-Seam, Label-Tabelle) THEN wird
  `factory-pipeline` dort nicht mehr angeboten bzw. gesetzt, und kein Gate/Test in TCH erwartet es.
  (Entfernen erst **nach** dem Issue-Umzug aus AK3.1, damit die Filterung bis dahin funktioniert.)
- [ ] **AK3.8** GIVEN T3 ist abgeschlossen WHEN man die Labels des TCH-Repos ansieht THEN gibt es ein
  neues Aspekt-Label `build-pipeline` für Arbeit an der **projekteigenen** Build-/CI-/Deploy-Pipeline
  (z. B. projekteigene CI-Workflows, Deploy-Gate, Deploy-Freeze, INT-DB-Refresh, Vercel-Konfiguration)
  – in Abgrenzung zum Factory-Harness, der ins Factory-Repo gehört.
- [ ] **AK3.9** GIVEN das Label `build-pipeline` WHEN ein Entwickler oder Skill in TCH ein Issue
  klassifiziert THEN findet er Bedeutung und Zuordnungsregel (Pfad-/Subsystem-Anker, Zweifelsregel)
  an einer **projekteigenen** Stelle dokumentiert (Anpassungsstelle, nicht in einer übernommenen
  Factory-Datei), und `start-work.sh --labels` sowie der Issue-Seam können es setzen.
- [ ] **AK3.10** GIVEN die in TCH verbleibenden offenen Issues aus AK3.1 WHEN sie die projekteigene
  Build-/CI-/Deploy-Pipeline betreffen THEN tragen sie nach T3 das Label `build-pipeline`.

### Epic-weit

- [ ] **AKE.1** GIVEN jede Teil-Task ist gemergt WHEN TCH die Pipeline fährt (`run-pipeline.sh` bzw.
  Stage-2-Skills) THEN verhält sie sich wie vor dem Epic (kein Funktionsverlust; Self-Tests und
  App-Gates grün).
- [ ] **AKE.2** GIVEN die Teil-Tasks WHEN sie umgesetzt werden THEN läuft jede als eigener PR mit
  eigenem Issue (Task-ID = Issue-Nummer) und gilt erst nach grünen Gates in beiden Repos als fertig.

## Fehlerszenarien

- [ ] **F1** Neue Factory-Version macht die Gates im Projekt-Repo rot → Update-PR bleibt offen und
  rot; TCH-`main` bleibt unverändert und arbeitsfähig.
- [ ] **F2** Update-PR kollidiert mit einer (verbotenen) lokalen Änderung → das Änderungs-Gate meldet
  die Datei; kein stilles Überschreiben, kein stilles Behalten.
- [ ] **F3** Mehrere Factory-Versionen erscheinen, bevor ein Update-PR gemergt ist → es gibt
  höchstens **einen** offenen Update-PR, und er zeigt auf die neueste Version.
- [ ] **F4** Factory-Repo nicht erreichbar / Zugriff fehlt beim Update → klarer Fehler im
  Update-Lauf, keine halbe Aktualisierung im Projekt-Repo (siehe AK2.8).
- [ ] **F5** Beim Historien-Übertrag landen Secrets, App-Code oder PII im Factory-Repo → T1 gilt als
  nicht bestanden (AK1.4); das Factory-Repo wird vor der ersten Veröffentlichung geprüft.
- [ ] **F6** Eine TCH-Datei referenziert nach dem Umzug eine nicht mehr vorhandene ADR/Lesson →
  Verweisprüfung schlägt fehl (AK3.2/3.3).
- [ ] **F7** Eine übernommene Datei wird im Projekt-Repo gelöscht → wird wie eine lokale Änderung
  behandelt (AK2.5).
- [ ] **F8** Factory-Issue lässt sich nicht anlegen (Repo nicht erreichbar, keine Berechtigung, z. B.
  im Stage-3-Lauf) → der Fund geht nicht verloren: er steht mit klarer Warnung in der Task-Datei des
  Projekt-Repos und wird beim nächsten erfolgreichen Versuch bzw. manuell übertragen; der Lauf bricht
  daran nicht ab.

## Offene Fragen

> Für `/architecture` (ADR-Trigger: neues Repo, neue Verteilungsmechanik, Änderungs-Gate) bzw. die
> Detail-Specs der Teil-Tasks.

- [ ] **Q1** Wie gelangen die übernommenen Dateien technisch ins Projekt-Repo, und wie kommt die
  Factory-Version an ein privates Projekt-Repo heran (Cross-Repo-Berechtigung für den
  automatischen Update-PR)? → `/architecture`
- [ ] **Q2** Wie wird die Historie übertragen, ohne App-Code/PII mitzunehmen (AK1.4)? → `/architecture`
- [ ] **Q3** Versionsschema (z. B. SemVer) und Startversion – Bezug zur heutigen Angabe
  „v0.5.0" in `CLAUDE.md`? → `/architecture`
- [ ] **Q4** `CLAUDE.md` mischt heute Factory-Regeln und TCH-Einträge (z. B. Routen-Doku-Regel):
  wie wird sie in einen übernommenen und einen projekteigenen Teil getrennt? Gleiches für
  `.claude/settings.json`, `factory-ci.yml`, `.gitignore`. → `/architecture`
- [ ] **Q5** Wie werden ADRs im Factory-Repo nummeriert (neu ab 001 mit Altnummer-Verweis oder
  Nummern behalten)? Zusammenhang mit #321 (doppelte ADR-Nummern). → `/architecture` (T3)
- [x] **Q6** Soll das alte `factory-pipeline`-Label in TCH nach T3 bestehen bleiben oder entfallen?
  **Entschieden (2026-10-19, präzisiert):** `factory-pipeline` **wandert ins Factory-Repo** und
  entfällt in TCH; TCH bekommt stattdessen ein neues Label `build-pipeline` für die projekteigene
  Build-/CI-/Deploy-Pipeline → AK3.6–AK3.10. Bekannte Konsequenz: Beim Löschen eines GitHub-Labels
  verschwindet es auch von geschlossenen Issues/PRs; die historische Filterung nach Factory-Arbeit
  in TCH geht damit verloren (die übertragenen Issues sind im Factory-Repo auffindbar).
  Folgefrage für `/architecture`: Projekteigene Labels (wie `build-pipeline`) müssen neben der
  übernommenen Label-Tabelle (`git-workflow.md`) definierbar sein, ohne diese zu ändern (→ Q4).
- [ ] **Q8** Wie erhält ein Skill im Projekt-Repo (lokal und im Stage-3-/CI-Lauf) die Berechtigung,
  im Factory-Repo Issues anzulegen, und wie wird der Issue-Seam (ADR-018) dafür erweitert? Welche
  Form haben Kleinfunde im Factory-Repo (AK2.10)? → `/architecture`
- [x] **Q7** Bekannter Hinweis: dm-internes Template-Material liegt damit auf einem privaten
  GitHub-Account. **Entschieden (2026-10-19):** für dieses Epic akzeptiert; ein Umzug ist out of scope.
