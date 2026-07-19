# Spec: CONTRIBUTING/Projektbeschreibung auf die TCH-App ausrichten (Factory als Werkzeug)

Issue: #160 · Branch: `docs/160-contributing-tch-app-ausrichten` · Art: `documentation`

## Kontext

Teile der Projektbeschreibung – vor allem **`CONTRIBUTING.md`** – behandeln das Repository
noch als **Weiterentwicklung der dm Development Factory (Template)**. Titel („Contributing to
dm Development Factory Template"), Beitragsarten („New skills / guideline extensions"),
Template-Versionierung und die Leitlinie „universal over specific" richten sich an jemanden,
der am *Template* mitarbeitet – nicht an einen TCH-Entwickler, der an **dieser Anwendung**
mitwirken will.

`README.md` ist bereits korrekt: Der Abschnitt „Entwicklung mit der dm-Factory (Werkzeug)"
(Zeile 207 ff.) stellt heraus, dass die Factory reines **Werkzeug/Harness** ist und **nicht**
Teil der ausgelieferten Anwendung. Diese Sichtweise soll konsistent auch in `CONTRIBUTING.md`
gelten. Rein dokumentarische Terminologie-Anpassung – kein Produktionscode.

## Scope

**Inbegriffen:**
- Vollständige Neufassung von `CONTRIBUTING.md` **auf Deutsch** (konsistent mit README/CLAUDE.md/
  Specs/ADRs) – Mitarbeit an der **TCH-Gastro-Services-App**, Factory als genutztes Werkzeug.
- Setup/Einstieg verweist auf den DEV-Ablauf aus `README.md` (`pnpm install`, DB, `pnpm dev`).
- Factory-Workflow als *Arbeitsweise in diesem Projekt*: Issue-first via `scripts/start-work.sh`,
  eine Task = eine Session/Worktree, Pipeline-Skills, PR-Workflow mit grünen CI-Gates, Rebase,
  geschützte `main`.
- Beitragsarten auf die App bezogen (Features/Bugfixes/Docs/Tests am TCH-Produkt).
- Verweise auf `CLAUDE.md`, `docs/adr/`, `docs/factory/guidelines/` als verbindliche Konventionen.
- Entfernen der template-spezifischen Passagen (Template-Versionierung/Release, „universal over
  specific", „New skills / guideline extensions").
- Sweep über die übrigen `*.md` auf verbleibende „Repo = Weiterentwicklung des Templates"-Stellen.

**Nicht inbegriffen:**
- Produktionscode, Skripte, CI (reine Doku-Änderung).
- `docs/factory/**` – die eingebettete Factory-Doku selbst (bewusst unberührt).
- Historische Task-Dateien unter `tasks/` (nicht rückwirkend ändern).
- Historische Records, die einen *vergangenen* Zustand dokumentieren (ADRs, `docs/CHANGELOG.md`):
  Own-Voice-Aussagen über die App angleichen, aber keine Falschbehauptung über die dokumentierte
  Vergangenheit erzeugen (z. B. ADR-012 „GitHub-Plattform-Migration" beschreibt legitim die
  Herkunft aus dem Template – Historie bleibt erhalten, jede angefasste Stelle wird begründet).

## Akzeptanzkriterien

- [ ] **AC1 – Ausrichtung auf die App.** GIVEN ein TCH-Entwickler öffnet `CONTRIBUTING.md`
      WHEN er Titel und Einleitung liest THEN beschreiben sie die Mitarbeit an der
      **TCH-Gastro-Services-App** (nicht am Factory-Template); der Titel enthält nicht mehr
      „dm Development Factory Template".
- [ ] **AC2 – Factory eindeutig als Werkzeug.** GIVEN `CONTRIBUTING.md` erwähnt die dm-Factory
      WHEN die betreffende Stelle gelesen wird THEN wird die Factory als **genutztes
      Entwicklungswerkzeug/Harness** dargestellt, konsistent zur README-Aussage „… nicht Teil
      der ausgelieferten Anwendung".
- [ ] **AC3 – Konsistenter Setup-/Beitrags-Workflow.** GIVEN der in `CONTRIBUTING.md`
      beschriebene Ablauf WHEN er gegen `README.md`, `CLAUDE.md` und
      `docs/factory/guidelines/git-workflow.md` geprüft wird THEN ist er konsistent: Issue-first
      via `scripts/start-work.sh`, eine Task = eine Session/eigener Worktree, PR mit grünen
      CI-Gates, Rebase statt Merge, geschützte `main`.
- [ ] **AC4 – App-bezogene Beitragsarten.** GIVEN der Abschnitt „Beitragsarten" WHEN er gelesen
      wird THEN nennt er Beiträge am TCH-Produkt (Features/Bugfixes/Docs/Tests) – **nicht** „neue
      Skills / universelle Guideline-Erweiterungen fürs Template"; die Template-Versionierungs-
      Tabelle und die Leitlinie „universal over specific" sind entfernt bzw. projektbezogen ersetzt.
- [ ] **AC5 – Verbindliche Konventionen verlinkt.** GIVEN `CONTRIBUTING.md` WHEN nach Querverweisen
      gesucht wird THEN verweist es auf `CLAUDE.md`, `docs/adr/` und `docs/factory/guidelines/`
      als verbindliche Konventionen dieses Projekts.
- [ ] **AC6 – Keine Template-als-Produkt-Reste im Sweep.** GIVEN ein Sweep über die versionierten
      `*.md` (ausgenommen `docs/factory/**` und `tasks/**`) WHEN nach Stellen gesucht wird, die
      das Repo als **Weiterentwicklung des Templates** darstellen THEN bleibt keine solche Stelle;
      historische Records (ADRs, CHANGELOG) bleiben als Historie korrekt und werden nicht verfälscht.
- [ ] **AC7 – Alle Links gültig.** GIVEN alle Links in `CONTRIBUTING.md` WHEN sie aufgelöst werden
      THEN zeigen sie auf existierende Ziele (Dateien/Verzeichnisse im Repo bzw. gültige URLs).

## Fehlerszenarien / Fallstricke

- [ ] **Sweep-Grep gegen Ausgabe prüfen, nicht Exit-Code** (aus #144-Codify): `git grep`/
      `git diff --name-only` liefern Exit 0 unabhängig vom Treffer – auf Zeilenzahl/Ausgabe
      testen, nicht per `&&`/`||`.
- [ ] **Own-Voice vs. Historie trennen** (aus #144): In ADRs/CHANGELOG die technische Aussage
      erhalten, nur die Terminologie angleichen; keine Falschaussage über den alten Wortlaut.
- [ ] **Link-Prüfung nicht nur Datei-relativ:** interne Anker (`#…`) und externe URLs
      (dm-Factory-GitLab, semver.org) mitprüfen.

## Offene Fragen

- Keine offenen Fragen. Sprache = **Deutsch** (mit dem Entwickler bestätigt); Scope durch das
  Issue eindeutig; keine ADR nötig (reine Doku, kein Architektur-Entscheid).
