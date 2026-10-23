# Spec: Factory mit Historie nach `nothra/dev-factory` herauslösen (T1b)

> **Detail-Spec zu Teil-Task T1b** des Epics #424. Verfeinert
> [spec-424](spec-424-factory-in-eigenes-repo-auslagern.md) für **AK1.1–AK1.4, AK1.6–AK1.8** und
> **F5**; widerspricht ihr nicht. Technische Grundlage:
> [ADR-063](../factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D5 (Historie), D6
> (Versionen), D9 (Factory nutzt sich selbst). Vorgänger T1a (#426, #431, #432) ist gemergt; die
> Zuordnungstabelle `docs/factory/OWNERSHIP.md` und ihr Parser `scripts/checks/ownership-check.sh`
> liegen vor.

## Kontext

Nach T1a gehört im TCH-Repo jede Datei genau einer Seite (111 Factory-Dateien, Stand 2026-10-23).
T1b bringt die Factory-Seite **mit ihrer Historie** in ein eigenes, **öffentliches** Repo
`nothra/dev-factory`, macht es dort arbeitsfähig (eigene Gates, eigene Pipeline) und veröffentlicht
die erste Version `v0.6.0`. Erst danach kann T2 (#428) TCH auf diese Version umstellen.

Weil das Repo öffentlich ist, ist der erste Push **nicht rückholbar** (ADR-063 „Reversibilität"):
Was dann in der Historie steht, bleibt öffentlich. Deshalb kommen Prüfung und ausdrückliche
Freigabe **vor** dem Push.

**Bestandsaufnahme (2026-10-23):**

- 31 Factory-Dateien hatten früher einen anderen Pfad (Factory-ADRs unter `docs/adr/`,
  `FACTORY.md` ← `CLAUDE.md`, `settings.factory.json` ← `.claude/settings.json`). Ohne diese
  Altpfade bricht `git log --follow` an der Umbenennung ab (AK1.2).
- 15 Factory-Dateien enthalten TCH-Begriffe (u. a. ADR-063, `run-tests.sh`, Lesson
  `factory-workflow.md`, `OPERATING.md`, ADR-029).
- 75 Factory-Dateien verweisen insgesamt rund 2 700-mal mit `#<nr>` auf TCH-Issues; 183 von 184
  Commits auf `main` tragen solche Verweise in der Message. Im neuen Repo würden sie auf fremde
  Issues/PRs zeigen.
- `git-filter-repo`, `gitleaks` und `shellcheck` sind lokal nicht installiert.

**Entscheidungen mit dem Entwickler (2026-10-23):**

| Frage | Entscheidung |
|---|---|
| `#<nr>` in Commit-Messages | Werden beim Herauslösen zu `nothra/tch-gastro-services#<nr>` ausgeschrieben. **Konvention:** im Factory-Repo steht vor einer TCH-Nummer immer der Repo-Slug |
| `#<nr>` in Datei-Inhalten | Ebenfalls zu `nothra/tch-gastro-services#<nr>` ausgeschrieben; solche **qualifizierten Herkunftsverweise** sind die dokumentierte Ausnahme vom Begriffsverbot (AK1.3) |
| TCH-Begriffe im aktuellen Stand | **Alles bereinigen** – auch ADRs und Lessons werden generisch formuliert, nicht nur Skripte/Tests/Doku |
| Lint-Gate im Factory-Repo | **Vorerst nur Syntaxprüfung** (`bash -n` über alle Shell-Skripte) statt ShellCheck (weicht von ADR-063 D9 ab → Nachtrag, Q3) |
| Nachweis AK1.7 | **Wegwerf-Probe:** eine Probe-Task im Factory-Repo anlegen (Issue → Branch → Draft-PR) und danach schließen |

## Begriffe

- **Factory-Repo, Projekt-Repo, Factory-Version** – wie in spec-424.
- **Factory-Dateien** – die Ausgabe von `ownership-check.sh --list factory` auf dem TCH-Stand, aus
  dem herausgelöst wird.
- **Altpfade** – frühere Pfade genau dieser Dateien laut `git log --follow`.
- **Herauslösen** – Umschreiben eines frischen TCH-Klons, sodass nur Factory-Dateien und ihre
  Altpfade übrig bleiben (ADR-063 D5).
- **Bootstrap-Push** – der erste Push in das leere Factory-Repo.
- **Qualifizierter Herkunftsverweis** – `nothra/tch-gastro-services#<nr>`.

## Scope

**Inbegriffen:**
- Herauslösen der Factory-Dateien samt Altpfaden mit Historie; Ausschreiben der TCH-Nummern in
  Commit-Messages.
- Vorab-Scan der umgeschriebenen Historie (Secrets, E-Mail-Muster/PII, App-Code) und
  Scan-Bericht; Bootstrap-Push erst nach ausdrücklicher Freigabe des Entwicklers.
- Anlage des öffentlichen Repos `nothra/dev-factory`, Ruleset `protect-main`, CI.
- Bereinigung des aktuellen Stands im Factory-Repo: TCH-Begriffe raus, TCH-Nummern ausgeschrieben.
- Factory-Repo nutzt sich selbst: eigene `factory.config.yml`, `PROJECT-CONTEXT.md`, `CLAUDE.md`,
  `OWNERSHIP.md`, Labels, `docs/specs/`, `tasks/`; Self-Tests dort grün.
- Version `v0.6.0`: Tag, GitHub Release mit Release Notes und Release-Manifest-Asset,
  `CHANGELOG.md`.
- Im TCH-Repo: diese Spec, die Task-Datei mit Scan-Bericht und das Werkzeug fürs Herauslösen, soweit
  es in TCH liegt (Q2).

**Nicht inbegriffen:**
- TCH auf `factory.lock` umstellen, `factory-sync.sh` über `--compose` hinaus, Update-Workflow,
  Integritäts-Gate, `create_factory_issue` → **T2 (#428)**.
- Issues, Labels (`factory-pipeline`), Verweis-Check umziehen → **T3 (#429)**.
- **Änderungen an Factory-Dateien im TCH-Repo.** TCH behält seine Kopien bis T2; die bereinigten
  Fassungen kommen über das T2-Update. TCH verhält sich nach T1b exakt wie vorher (AKE.1).
- **Bereinigung von TCH-Begriffen in alten Ständen der Historie.** Alte Blob-Versionen dürfen
  TCH-Begriffe enthalten (sie waren über das öffentliche TCH-Repo ohnehin schon öffentlich);
  verboten sind in der Historie nur Secrets, App-Code und personenbezogene Daten (AK1.4).
- ShellCheck als Gate und das Beheben von ShellCheck-Funden (späteres Issue im Factory-Repo).
- Neue Factory-Funktionen; das Verhalten der Pipeline ändert sich nicht.

**Arbeitsweise:** T1b läuft **manuell in Stage 2**, nicht über `run-pipeline.sh`: Repo-Anlage,
Ruleset und der nicht rückholbare Bootstrap-Push brauchen eine Freigabe des Entwicklers im Chat.

## Akzeptanzkriterien

### A · Herauslösen und Historie (AK1.1, AK1.2, AK1.4)

- [ ] **A1** GIVEN der gemergte TCH-Stand WHEN die Pfadliste fürs Herauslösen erzeugt wird THEN
  besteht sie genau aus der Ausgabe von `ownership-check.sh --list factory` plus den Altpfaden dieser
  Dateien – erzeugt, nicht von Hand gepflegt (ADR-063 Implementierungs-Hinweise) – und ein zweiter
  Lauf auf demselben Stand liefert dieselbe Liste.
- [ ] **A2** GIVEN das herausgelöste Repo WHEN man alle Pfade aller Commits auflistet
  (`git log --all --name-only`) THEN kommt kein Pfad außerhalb der Liste aus A1 vor – insbesondere
  nichts unter `app/`, `db/`, `lib/`, `tasks/`, `docs/specs/`, `docs/project/`, `scripts/project/`,
  `e2e/`, und unter `docs/adr/` nur Altpfade von Factory-ADRs.
- [ ] **A3** GIVEN jede der Factory-Dateien mit Altpfad (heute 31) WHEN man im Factory-Repo
  `git log --follow -- <datei>` ausführt THEN erscheinen auch die Commits aus der Zeit vor der
  Umbenennung (Stichprobe dokumentiert: ADR-019, `FACTORY.md`, `.claude/settings.factory.json`).
- [ ] **A4** GIVEN die umgeschriebene Historie WHEN man alle Commit-Messages nach `#<nr>` durchsucht
  THEN steht vor jeder Nummer `nothra/tch-gastro-services`; ein unqualifiziertes `#<nr>` kommt nicht
  vor.
- [ ] **A5** GIVEN die umgeschriebene Historie WHEN man Autor/Datum der Commits mit TCH vergleicht
  THEN sind sie unverändert (ADR-063 D5).

### B · Vorab-Scan und Freigabe (AK1.4, F5)

- [ ] **B1** GIVEN die umgeschriebene Historie, noch nicht gepusht WHEN `gitleaks` über **alle**
  Commits läuft THEN gibt es keinen Fund – oder jeder Fund ist im Scan-Bericht einzeln als
  Falsch-Positiv mit Begründung belegt.
- [ ] **B2** GIVEN die umgeschriebene Historie WHEN man **alle** Blob-Inhalte nach E-Mail-Mustern
  durchsucht THEN treffen nur Adressen aus einer im Scan-Bericht aufgeführten Erlaubt-Liste
  (z. B. `noreply@anthropic.com`, `*@example.*`, Test-Identitäten wie `t@t.com`); Adressen
  realer Personen kommen in Datei-Inhalten nicht vor (Autoren-Metadaten zählen nicht, A5).
- [ ] **B3** GIVEN der Scan WHEN er abgeschlossen ist THEN liegt ein Scan-Bericht in der
  Task-Datei und im PR-Body von TCH-PR #435: Werkzeug-Versionen, Ziel-Commit von TCH, Anzahl
  Commits/Dateien, Ergebnis B1, B2 und A2.
- [ ] **B4** GIVEN der Scan-Bericht WHEN der Bootstrap-Push ansteht THEN erfolgt er erst nach
  ausdrücklicher Freigabe des Entwicklers im Chat; ohne Freigabe oder bei offenem Fund aus B1/B2
  wird nicht gepusht (F5).

### C · Bereinigung des aktuellen Stands (AK1.3)

- [ ] **C1** GIVEN `main` des Factory-Repos nach der Bereinigung WHEN man alle Dateien nach
  `Veranstaltung`, `Montagsrunde`, `Thekenwart`, `Heuchelheim`, `TCH`, `tch-gastro`, `Neon`,
  `Vercel` durchsucht (Groß-/Kleinschreibung egal, als ganzes Wort) THEN gibt es nur Treffer an
  dokumentierten erlaubten Stellen: qualifizierte Herkunftsverweise und der Herkunftshinweis
  (README/CHANGELOG). Die erlaubten Stellen stehen in der `PROJECT-CONTEXT.md` des Factory-Repos.
- [ ] **C2** GIVEN die Bereinigung WHEN sie ADRs, Lessons, Guidelines, Skills, Skripte und Tests
  umformuliert THEN ändert sie nur Wortlaut und Beispiele, keine Regel, Entscheidung oder
  Prüflogik: keine Lesson-Zeile und kein ADR-Abschnitt fällt weg, und die Self-Tests (D3) bleiben
  grün.
- [ ] **C3** GIVEN `main` des Factory-Repos WHEN man Datei-Inhalte nach `#<nr>`-Verweisen auf
  Issues/PRs durchsucht THEN ist jeder Verweis auf ein TCH-Issue qualifiziert
  (`nothra/tch-gastro-services#<nr>`); ein unqualifiziertes `#<nr>` bezeichnet nur Issues/PRs des
  Factory-Repos selbst.

### D · Das Factory-Repo betreibt sich selbst (AK1.1, AK1.6)

- [ ] **D1** GIVEN das Factory-Repo WHEN man es öffnet THEN ist es **öffentlich** unter
  `nothra/dev-factory` und enthält Pipeline-Skripte, Skills, Agent-Personas, Gates/Hooks,
  generische Guidelines und Factory-Doku (AK1.1), dazu eine README mit Zweck, Herkunftshinweis und
  Verweis auf `CHANGELOG.md`.
- [ ] **D2** GIVEN das Factory-Repo WHEN man seine eigenen Anpassungsstellen ansieht THEN gibt es
  eigene `factory.config.yml` (`commands.lint` = Syntaxprüfung `bash -n` über alle Shell-Skripte,
  `commands.test` = Factory-Self-Test-Suite, kein `commands.install`), eigene `CLAUDE.md`,
  `docs/factory/PROJECT-CONTEXT.md` und `docs/factory/OWNERSHIP.md`, die das Factory-Repo selbst
  beschreiben, nicht TCH (ADR-063 D9).
- [ ] **D3** GIVEN ein PR im Factory-Repo WHEN CI läuft THEN laufen die Factory-Jobs
  (mindestens `factory-self-test`, `config-validation`, `pr-closes-issue`) und das Lint-Gate aus D2
  und sind grün; Self-Tests, die TCH-spezifische Zustände prüften, sind auf das Factory-Repo
  angepasst, statt übersprungen zu werden.
- [ ] **D4** GIVEN das Ruleset `protect-main` im Factory-Repo WHEN jemand – auch ein Admin – direkt
  oder per Force-Push auf `main` pushen oder ohne grüne Required Checks mergen will THEN wird das
  serverseitig abgelehnt; Merge nur per PR und Squash (wie TCH, ADR-029). Das Ruleset steht
  unmittelbar nach dem Bootstrap-Push.
- [ ] **D5** GIVEN ein frischer Klon des Factory-Repos WHEN man `bash scripts/install-hooks.sh`
  und danach die lokalen Gates (`pre-commit.sh`, `pre-push.sh`) ausführt THEN laufen sie grün
  durch, ohne dass pnpm, Node oder eine Datenbank installiert ist.

### E · Gewohnter Arbeitsablauf im Factory-Repo (AK1.7)

- [ ] **E1** GIVEN das Factory-Repo WHEN man die Labels ansieht THEN existieren alle Art- und
  Aspekt-Labels, die `start-work.sh` und der Issue-Seam setzen (laut `factory.defaults.yml` und
  eigener `factory.config.yml`).
- [ ] **E2** GIVEN das Factory-Repo WHEN der Entwickler dort eine Wegwerf-Probe startet
  (`start-work.sh` im Beschreibungs-Modus) THEN entstehen Issue, Branch, eigener Worktree,
  Task-Datei `tasks/task-<nr>-*.md` mit derselben Nummer wie das Issue und ein Draft-PR mit
  `Closes #<nr>`; `/requirements` lässt sich darauf aufrufen. Danach werden PR und Issue
  geschlossen, Branch und Worktree entfernt; das Ergebnis steht im Scan-/Abschlussbericht der
  Task-Datei.

### F · Erste Version `v0.6.0` (AK1.8)

- [ ] **F1** GIVEN der bereinigte, gemergte Stand im Factory-Repo WHEN die Version veröffentlicht
  wird THEN gibt es den Tag `v0.6.0` und ein GitHub Release dazu mit Release Notes (was ist neu, was
  bricht – „Breaking" ausdrücklich, auch wenn leer).
- [ ] **F2** GIVEN das Release `v0.6.0` WHEN man seine Assets ansieht THEN enthält es ein
  Release-Manifest, das für jede ausgelieferte Datei Pfad und SHA-256 nennt, und die Hashes stimmen
  mit dem Inhalt des Tags überein (Format laut Q1; es ist der Vertrag für T2).
- [ ] **F3** GIVEN das Factory-Repo WHEN man `CHANGELOG.md` öffnet THEN gibt es einen Eintrag
  `v0.6.0`, und die Versionsangabe in `docs/factory/FACTORY.md` lautet `v0.6.0` und stimmt mit dem
  Tag überein (ADR-063 D6).

### X · TCH bleibt unverändert (AKE.1)

- [ ] **X1** GIVEN TCH-PR #435 WHEN man seinen Diff ansieht THEN ändert er keine Factory-Datei
  (laut `OWNERSHIP.md`), sondern nur projekteigene Dateien (Spec, Task-Datei, ggf. Werkzeug fürs
  Herauslösen, Q2); `run-tests.sh` und die App-Gates sind vor und nach grün.
- [ ] **X2** GIVEN das Herauslösen WHEN es läuft THEN arbeitet es auf einem **frischen Klon** von
  TCH; der Arbeitsklon, sein `origin` und das TCH-Repo auf GitHub werden nicht umgeschrieben.

## Fehlerszenarien

- [ ] **FS1** (F5) `gitleaks` oder der E-Mail-Scan findet einen echten Treffer → kein Push; Ursache
  (Datei/Commit) im Bericht, Entwickler entscheidet über Ausschluss bzw. Umschreiben, danach Scan
  komplett neu.
- [ ] **FS2** Pfadliste aus A1 enthält einen Pfad, der zu irgendeinem Zeitpunkt App-Code oder
  TCH-Doku war (z. B. ein Altpfad, unter dem früher etwas anderes lag) → A2 schlägt fehl; der Pfad
  wird gezielt ausgeschlossen und dokumentiert.
- [ ] **FS3** `git log --follow` reißt bei einer Datei trotz Altpfad ab (A3) → Ursache im Bericht;
  kein stilles Akzeptieren.
- [ ] **FS4** Bootstrap-Push gelingt, Ruleset-Anlage schlägt fehl → keine weiteren Pushes auf
  `main`, bis D4 erfüllt ist.
- [ ] **FS5** Self-Tests sind im Factory-Repo rot, weil sie TCH-Dateien voraussetzen → anpassen
  (D3), nicht skippen; kein Release vor grünem CI.
- [ ] **FS6** Bereinigung (C1) bräuchte eine inhaltliche Änderung einer Regel → nicht ändern,
  sondern als Issue im Factory-Repo festhalten und Stelle vorläufig als erlaubt dokumentieren.

## Offene Fragen

> Für `/architecture` (Nachtrag zu ADR-063 bzw. Detailentscheidungen innerhalb D5/D6/D9).

- [ ] **Q1** Format des Release-Manifests (Dateiname, Struktur, welche Dateien es führt) und wie
  die Versionsangabe in `FACTORY.md` aus dem Tag entsteht – das Format ist der Vertrag, den T2
  (`factory-sync.sh`, Integritäts-Gate) liest. → `/architecture`
- [ ] **Q2** Wo liegt das Werkzeug fürs Herauslösen (Pfadliste, `filter-repo`-Aufruf mit
  Message-/Inhalts-Umschreibung, Scans): projekteigen in TCH (`scripts/project/`), als
  Einmal-Anleitung oder im Factory-Repo? Welche Teile brauchen Tests (TDD)? → `/architecture`
- [ ] **Q3** Nachtrag ADR-063: Lint im Factory-Repo vorerst `bash -n` statt ShellCheck (D9);
  Konvention „TCH-Nummern immer mit Repo-Slug"; Bereinigung auch von ADRs/Lessons. → `/architecture`
- [ ] **Q4** Welche Dateien liefert das Factory-Repo aus (Release-Manifest) und welche gehören dem
  Factory-Repo selbst (`factory.config.yml`, `PROJECT-CONTEXT.md`, `CLAUDE.md`, `tasks/`,
  `docs/specs/`, `templates/`)? Wie sieht `OWNERSHIP.md` dort aus? → `/architecture`
- [ ] **Q5** Reihenfolge der Bereinigung: als Commits vor dem Bootstrap-Push (dann ist `main` von
  Anfang an sauber, aber ohne PR-Gates) oder als erster PR im Factory-Repo (CI und Ruleset greifen,
  dafür sind TCH-Begriffe kurz auf `main`)? → `/architecture`
- [ ] **Q6** Größe: T1b hat 24 AK. Bereinigung (C) und Self-Test-Anpassung (D3) berühren
  voraussichtlich mehr als 40 Dateien – reicht eine Task, oder wird T1b wie T1a geteilt
  (z. B. T1b-1 Herauslösen + Push, T1b-2 Bereinigung + Release)? → `/architecture`
