# Spec: `.env.local` automatisch in neue Worktrees kopieren

> Issue: [#236](https://github.com/nothra/tch-gastro-services/issues/236) ·
> Branch: `chore/236-env-local-in-worktree-kopieren`

## Kontext

`start-work.sh` legt jede Task per Default in einem **eigenen git-Worktree** an
(Geschwister-Ordner `…​.worktrees/<branch>`, `git-workflow.md` → „Parallele Sessions").
`.env.local` ist gitignored (`.gitignore`: `.env*`) und wandert dabei **nicht** mit.

Alle DEV-Skripte laden ihre Konfiguration aber genau aus dieser Datei
(`package.json`: `test:e2e`, `db:migrate`, `db:seed`, `db:studio` → `dotenv -e .env.local`).
Im frischen Worktree fehlt sie – der erste `pnpm test:e2e`-Lauf scheitert dort mit einem
irreführenden `CredentialsSignin`, das wie eine echte Regression des gerade bearbeiteten
Diffs aussieht. In #228 wurde der Fehlschlag zunächst fälschlich dem next-auth-Bump
zugeschrieben; die Lesson dazu steht in
[`lessons/factory-workflow.md`](../factory/lessons/factory-workflow.md) („Neuer Worktree hat
kein `.env.local` …") und hielt bis zu diesem PR die **manuelle** Regel fest, mit dem
ausdrücklichen Vermerk, der Root-Cause-Fix (Automatisierung in `start-work.sh`) sei ein eigener,
vertagter Task. Diese Task ist dieser Root-Cause-Fix.

Der zweite Teil des #228-Problems – die geteilte lokale Postgres-DB kennt die
`SEED_ADMIN_*`-Zugangsdaten noch nicht – bleibt bewusst **manuell**: `start-work.sh` gibt nur
einen Hinweis auf `pnpm db:seed` aus (siehe Scope).

## Scope

**Inbegriffen:**

- Kopieren von **`.env.local`** aus dem Baum, in dem `start-work.sh` liegt (`$FACTORY_DIR` –
  üblicherweise, aber nicht zwingend der Haupt-Arbeitsbaum), in einen neu angelegten Worktree –
  als Teil der Worktree-Vorbereitung in `scripts/start-work.sh`.
- Opt-out über einen Env-Schalter analog zum bestehenden `FACTORY_WT_SKIP_INSTALL`.
- Hinweis im Abschluss-Output auf einen ggf. nötigen `pnpm db:seed`-Lauf.
- Nachziehen der Doku, die den bisherigen Zustand im Präsens beschreibt bzw. #236 als
  offenen Follow-up nennt (Lesson, PROJECT-CONTEXT-Index, Env-Schalter-Liste in
  `git-workflow.md`, Kopf-Kommentar von `start-work.sh`).
- Tests in `scripts/checks/tests/run-tests.sh` im bestehenden Block
  „start-work.sh (Worktree-Isolation, #74)".

**Nicht inbegriffen:**

- **Weitere Env-Dateien** (`.env.int`, `.env.prd`): enthalten INT-/Produktions-Secrets, werden
  in einem Feature-Worktree praktisch nie gebraucht und bleiben im Haupt-Baum
  (Least-Privilege-Entscheidung, bewusst getroffen).
- **Automatisches `pnpm db:seed`**: schriebe in die von allen Worktrees geteilte DEV-DB, setzte
  einen laufenden Docker-Container voraus und verrauschte den Startvorgang bei Fehlschlag.
  `start-work.sh` bleibt reine Arbeitsbaum-Vorbereitung.
- **In-Place-Modus** (`FACTORY_NO_WORKTREE=1`): dort ist der Arbeitsbaum der Haupt-Baum, die
  Datei liegt bereits da – keine Kopieraktion, kein neues Verhalten.
- Änderungen an `.gitignore` (die Kopie ist durch das bestehende `.env*`-Muster gedeckt),
  an `docs/routes.md` (keine Routen betroffen) und kein ADR (lokale Tooling-Ergonomie,
  reversibel, kein Architektur-Trigger).

## Akzeptanzkriterien

- [ ] **AK1 · Kopie im Worktree-Default:** GIVEN der **Quellbaum** – der Baum, in dem
      `start-work.sh` liegt (`$FACTORY_DIR`), üblicherweise der Haupt-Arbeitsbaum – enthält eine
      `.env.local` WHEN `start-work.sh` einen neuen Worktree anlegt THEN liegt im neuen Worktree
      eine `.env.local` mit **byte-identischem Inhalt**, und der Output nennt das Kopieren.
- [ ] **AK2 · Quelle fehlt → still überspringen:** GIVEN der Quellbaum (`$FACTORY_DIR`) enthält
      **keine** `.env.local` WHEN `start-work.sh` läuft THEN endet das Skript mit **exit 0**, im
      Worktree entsteht keine `.env.local`, und es wird kein Fehler gemeldet.
- [ ] **AK3 · Vorhandene Zieldatei wird nie überschrieben:** GIVEN der Ziel-Worktree existiert
      bereits und enthält eine **abweichende** `.env.local` WHEN `start-work.sh` für denselben
      Branch erneut läuft THEN bleibt der Inhalt der vorhandenen Datei **unverändert**
      (fail-safe: nie fremde lokale Konfiguration zerstören) und der Output weist auf das
      Überspringen hin.
- [ ] **AK4 · Opt-out:** GIVEN `FACTORY_WT_SKIP_ENV=1` ist gesetzt WHEN `start-work.sh` einen
      neuen Worktree anlegt THEN wird **nicht** kopiert (keine `.env.local` im Worktree),
      obwohl im Quellbaum eine existiert.
- [ ] **AK5 · Dateirechte bleiben erhalten:** GIVEN die `.env.local` im Quellbaum hat den Modus
      `600` WHEN sie kopiert wird THEN hat die Kopie im Worktree ebenfalls Modus `600`
      (Secrets werden durch das Kopieren nicht breiter lesbar).
- [ ] **AK6 · `db:seed`-Hinweis bei Kopie:** GIVEN eine `.env.local` wurde kopiert WHEN
      `start-work.sh` den Abschluss-Output schreibt THEN enthält dieser einen Hinweis auf
      `pnpm db:seed` (mit Begründung: geteilte lokale DB kennt die `SEED_ADMIN_*`-Daten evtl.
      noch nicht).
- [ ] **AK7 · Kein Hinweis ohne Kopie (Spiegel zu AK6):** GIVEN es wurde **keine** `.env.local`
      kopiert (Quelle fehlt) WHEN `start-work.sh` den Abschluss-Output schreibt THEN enthält
      dieser **keinen** `pnpm db:seed`-Hinweis.
- [ ] **AK8 · In-Place-Modus unverändert:** GIVEN `FACTORY_NO_WORKTREE=1` WHEN `start-work.sh`
      läuft THEN findet keine Kopieraktion statt und das bisherige Verhalten bleibt bis auf den
      Branch-Anlagepfad identisch.
- [ ] **AK9 · Doku-Drift nachgezogen:** GIVEN dieser PR automatisiert den in der Lesson als
      manuell beschriebenen Schritt WHEN der PR gemergt wird THEN sind im **selben PR**
      nachgezogen: (a) die Lesson-Regel in `docs/factory/lessons/factory-workflow.md` (der
      Kopier-Schritt ist automatisiert, „Root-Cause-Fix ausgelagert: #236" ist erledigt – das
      historische Vorfall-Narrativ bleibt), (b) die Index-Zeile in
      `docs/factory/PROJECT-CONTEXT.md`, (c) die Env-Schalter-Liste in
      `docs/factory/guidelines/git-workflow.md` und (d) der Kopf-Kommentar von
      `scripts/start-work.sh`.

## Fehlerszenarien

- [ ] **Kopieren schlägt fehl** (z. B. Leserecht auf der Quelle fehlt, Zielverzeichnis nicht
      beschreibbar): Warnung ausgeben, **kein Abbruch** von `start-work.sh` – analog zum
      bestehenden Umgang mit fehlgeschlagenem `pnpm install` (`start-work.sh:262`). Wichtig
      wegen `set -euo pipefail`: der Kopierbefehl muss abgesichert sein und darf das Skript
      nicht wortlos beenden. Scheitert `cp` erst **nach** dem Anlegen der Zieldatei, wird der
      eigene unvollständige Rest wieder entfernt – sonst konservierte ihn AK3 dauerhaft.
      Die Absicherung gilt für **jeden** Befehl des Blocks, auch für das Aufräumen selbst:
      scheitert das Entfernen des Rests (nicht beschreibbares Zielverzeichnis o. Ä.), bleibt
      es bei der Warnung.
- [ ] **Wiederverwendeter Worktree** (`start-work.sh` meldet „wird wiederverwendet"): der
      Kopier-Schritt läuft trotzdem, greift aber wegen AK3 nur, wenn dort noch keine
      `.env.local` liegt. Welche der beiden Wiederverwendungs-Meldungen dabei erscheint
      („Worktree existiert bereits" vs. „Pfad existiert bereits (kein Worktree)"), ist für
      dieses Szenario unerheblich und **nicht** normativ. **Ausnahme:** ist der
      wiederverwendete Pfad gar kein Verzeichnis (z. B. eine reguläre Datei), wird der
      Kopier-Block übersprungen – jeder Dateizugriff darunter scheiterte dort mit `ENOTDIR`
      und machte den Block zum neuen, früheren Abbruchpunkt des Skripts. Dass der Lauf
      anschließend an anderer Stelle scheitert (Schritt 3, `mkdir -p "$WORKDIR/tasks"`), ist
      vorbestehendes Verhalten aus #74 und **nicht** Gegenstand dieser Spec.
- [ ] **Quelle ist ein Verzeichnis oder defekter Symlink**: kein Sonderfall-Handling – es gilt
      AK1 (regulärer Datei-Test als Vorbedingung), beides wird wie „Quelle fehlt" (AK2)
      behandelt. Ein Symlink **auf eine vorhandene Datei** fällt dagegen nicht darunter: `-f`
      dereferenziert ihn und `cp -p` folgt ihm, im Worktree entsteht also eine vollwertige
      Datei-Kopie (gewolltes Verhalten, AK1).

## Technische Hinweise (nicht normativ)

- Platzierung: im Worktree-Zweig von `scripts/start-work.sh` nach dem `worktree add`
  (`:208-218`) und **vor** dem `pnpm install`-Block (`:249-257`) – so ist die Datei auch dann
  da, wenn die Installation scheitert.
- Schalter-Name analog zum Bestand: `FACTORY_WT_SKIP_ENV=1`.
- Rechte-Erhalt (AK5) über `cp -p` (portabel auf macOS/BSD und GNU).
- Tests: bestehender Block „start-work.sh (Worktree-Isolation, #74)" in
  `scripts/checks/tests/run-tests.sh:1823+` – die dortigen Fixtures (`gh`-Stub, Wegwerf-Repo,
  `FACTORY_WORKTREE_BASE`, `FACTORY_WT_SKIP_INSTALL=1`) sind wiederzuverwenden, **keine**
  parallele Fixture-Landschaft daneben aufbauen.
- Für AK6/AK7 und AK3 gilt: gegen die **Wirkung** assertieren (Dateiinhalt bzw. Output-Text),
  Positiv- **und** Negativfall je eigenständig – ein Präsenz-Guard ersetzt den Spiegelfall nicht.

## Offene Fragen

_Keine._ Die beiden Zuschnitt-Fragen (Umfang der kopierten Env-Dateien; automatisches
`db:seed` ja/nein) sind in dieser Session entschieden und oben unter „Nicht inbegriffen"
festgehalten.
