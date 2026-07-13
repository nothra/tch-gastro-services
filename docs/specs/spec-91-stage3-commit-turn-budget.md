# Spec: Stage-3 Commit/Push-Fähigkeit & Review/Security-Review-Turn-Budget

> Task/Issue: **#91** · Vorgänger: **#88** (Edit/Write-Rechte, gemergt) ·
> Kanonische Config: `factory.defaults.yml` (Skill-Tiers/`max_turns`),
> `.claude/settings.json` (Permissions), `scripts/run-pipeline.sh` (`run_skill()`).

## Kontext

Die Stage-3-Pipeline (`scripts/run-pipeline.sh`) ruft jeden Skill non-interaktiv über
`FACTORY_STAGE=3 claude --print … --max-turns N` auf. Permissions kommen dabei ausschließlich
aus `.claude/settings.json` – ein Prompt kann nicht beantwortet werden, jede nicht erlaubte
Aktion blockiert den Schritt.

Beim wiederholten Live-Lauf für #66 (nach #88) zeigten sich zwei Infrastruktur-Lücken:

1. **Kein Commit/Push möglich.** `/implement`, `/test`, `/refactor` schrieben dank #88 korrekte
   Änderungen, aber kein Schritt konnte sie committen: `git commit`/`git push` matcht keinen
   Allow-List-Eintrag (`Bash(bash scripts/*)`, `Bash(bash scripts/checks/*)`, `Edit(...)`,
   `Write(...)`). `/review` bewertete den **uncommitteten** Diff positiv, die Pipeline lief bis
   `/security-review` – am Ende wäre nichts gepusht/gemergt worden, obwohl sie „erfolgreich" durchlief.
2. **Turn-Budget zu knapp.** `review`/`security-review` haben `max_turns: 8`. `/security-review`
   schrieb im 1. Versuch bereits einen vollständigen, korrekten `tasks/security-66.md` (PASSED),
   riss aber **nach** dem Report das Turn-Limit → `run_skill()` wertete alle 3 Versuche als
   Fehlschlag → Pipeline-Exit 1, obwohl das Ergebnis inhaltlich fertig war. `/review` scheiterte
   im 1. Versuch ebenfalls an „Reached max turns" und gelang erst im 2.

Seit #88 schreiben diese Skills echte Dateien (Reports, Task-Checkboxen) – das kostet Turns
gegenüber der ursprünglich reinen Lese-Analyse, für die die 8 kalibriert waren.

Ziel: Stage-3-Sub-Agenten committen/pushen ihre Arbeit auf dem Feature-Branch selbstständig
(nie auf `main`/`master`, keine destruktiven Ops), und review/security-review scheitern nicht
mehr an einem Turn-Limit, das erst **nach** dem fertigen Report reißt.

## Scope

**Inbegriffen:**

### Lücke 1 – Commit/Push über ein Wrapper-Skript (Entscheidung 2026-07-12)
- Neues, sourcebares/aufrufbares Skript **`scripts/factory-commit.sh`**, das eine sichere
  „commit + push aktueller Feature-Branch"-Operation kapselt und **fail-closed** absichert:
  - Verweigert Ausführung, wenn der aktuelle Branch `main` oder `master` ist (Exit ≠ 0,
    klare Meldung) – doppelt gesichert zum bestehenden `scripts/checks/pre-push.sh`.
  - Verweigert `--force`/Force-Push und destruktive Operationen (`reset --hard` o. Ä. sind
    nicht Teil des Skripts).
  - Führt aus: `git add` der Arbeit → `git commit -m "<message>"` → `git push` des aktuellen
    Branches auf sein Remote-Tracking-Ref (Neuanlage via `-u origin HEAD` erlaubt).
  - Ist idempotent-freundlich: „nichts zu committen" ist kein harter Fehler (klare Meldung,
    definierter Exit), damit ein Skill-Schritt ohne Änderungen die Pipeline nicht abbricht.
- Läuft über die **bestehende** `Bash(bash scripts/*)`-Erlaubnis – **keine** neue
  git-Permission-Fläche in `.claude/settings.json`.
- **Read-only-git in die Allow-List** aufnehmen, damit Diagnose-Kommandos der Agenten keinen
  Prompt/Interrupt auslösen: `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)`,
  `Bash(git branch:*)`, `Bash(git rev-parse:*)`. (Rein lesend, risikoarm.)
- **Skill-Doku angepasst:** die Code-erzeugenden Skills (`implement`, `test`, `refactor`,
  `bug-fix`) committen/pushen ihre Arbeit über `scripts/factory-commit.sh` statt über rohes
  `git commit`/`git push`.
- **`pr-shepherd`-Freigabe (für AC3):** die vom PR-Lifecycle genutzten `gh`-Verben granular in
  die Allow-List aufnehmen (nur die tatsächlich genutzten, kein pauschales `Bash(gh *)`):
  `gh pr view`, `gh pr checks`, `gh pr update-branch`, `gh pr merge`, `gh run list`,
  `gh run rerun`. Merge bleibt server-seitig durch CI **und** menschliches Approval gated
  (`gh pr merge --auto` merged erst bei grünen Gates).

### Lücke 2 – Report-Guard + moderat höheres Budget (Entscheidung 2026-07-12)
- **`run_skill()` in `scripts/run-pipeline.sh`:** Ein Skill-Abbruch (non-zero Exit, inkl.
  „Reached max turns") gilt als **Erfolg**, wenn der zugehörige Report bereits vollständig
  mit gültigem Verdict geschrieben wurde:
  - `review` → `tasks/review-<id>.md` enthält `APPROVED` **oder** `NEEDS_REWORK`.
  - `security-review` → `tasks/security-<id>.md` enthält `PASSED` **oder** `NEEDS_FIXES`.
  - Der Guard greift **nur** für diese beiden report-erzeugenden Skills; für alle anderen
    bleibt das Verhalten unverändert (non-zero = Fehlversuch → Retry/Exit).
  - Nach dem als-Erfolg-gewerteten Abbruch läuft weiterhin die `interrupt-check.sh` (kein
    stiller Übergang, falls der Agent einen Interrupt signalisiert hat).
- **`factory.defaults.yml`:** `max_turns` für `review` und `security-review` moderat von `8`
  auf **14** anheben (mit `@reason`-Begründung am Knopf), als Puffer zusätzlich zum Guard.

**Nicht inbegriffen:**
- Änderung der Retry-/Backoff-Logik oder des Circuit Breakers (`MAX_REVIEW_ITERATIONS`).
- `max_turns`-Anpassung anderer Skills (nur `review`/`security-review`).
- Automatisches Konflikt-Auflösen beim Rebase (bleibt Interrupt in `pr-shepherd`).
- Rebase-/Force-Push-Logik im Wrapper (bewusst nicht; Rebase/`gh pr update-branch` ist
  `pr-shepherd`-Sache).
- Nachrüsten der Commit-Granularität einzelner Skills („kleine, fokussierte Commits" bleibt
  unverändert Skill-Verantwortung).

## Akzeptanzkriterien

### Lücke 1 – Commit/Push
- [ ] GIVEN ein Feature-Branch mit uncommitteten Änderungen, WHEN
      `bash scripts/factory-commit.sh "<message>"` läuft, THEN werden die Änderungen committet
      und der Branch auf sein Remote gepusht (Exit 0), ohne Permission-Prompt (deckt sich mit
      `Bash(bash scripts/*)`).
- [ ] GIVEN der aktuelle Branch ist `main` **oder** `master`, WHEN `factory-commit.sh` aufgerufen
      wird, THEN bricht es **fail-closed** ab (Exit ≠ 0, klare Meldung) und committet/pusht nichts.
- [ ] GIVEN es gibt nichts zu committen, WHEN `factory-commit.sh` läuft, THEN endet es mit klarer
      Meldung und definiertem Exit-Code, **ohne** die Pipeline abzubrechen.
- [ ] GIVEN ein Stage-3-Sub-Agent (`FACTORY_STAGE=3`, `claude --print`), WHEN `/implement`,
      `/test`, `/refactor` oder `/bug-fix` seine Arbeit sichert, THEN geschieht das über
      `scripts/factory-commit.sh` (Skill-Doku weist das an) – nicht über rohes `git commit`/`git push`.
- [ ] GIVEN ein Agent führt read-only-git aus (`git status`/`diff`/`log`/`branch`/`rev-parse`),
      WHEN im Stage-3-Modus, THEN ohne Prompt/Interrupt (Allow-List greift).
- [ ] GIVEN `PR_SHEPHERD=true bash scripts/run-pipeline.sh <task-id>`, WHEN die Pipeline durchläuft,
      THEN committet und pusht sie die erarbeiteten Änderungen und der offene PR wird ohne
      manuelles Nachziehen aktualisiert/mergefähig (die genutzten `gh`-Verben sind freigegeben).

### Lücke 2 – Turn-Budget
- [ ] GIVEN `/security-review` schreibt `tasks/security-<id>.md` mit `PASSED` (oder `NEEDS_FIXES`)
      und reißt **danach** das Turn-Limit, WHEN `run_skill()` das auswertet, THEN gilt der Lauf als
      **Erfolg** (kein Fehlversuch, kein Pipeline-Exit-1).
- [ ] GIVEN `/review` schreibt `tasks/review-<id>.md` mit `APPROVED` (oder `NEEDS_REWORK`) und
      reißt danach das Turn-Limit, WHEN `run_skill()` das auswertet, THEN gilt der Lauf als Erfolg.
- [ ] GIVEN irgendein anderer Skill bricht mit non-zero ab (kein Report-Skill), WHEN `run_skill()`
      das auswertet, THEN bleibt das Verhalten **unverändert** (Retry, dann Exit 1).
- [ ] GIVEN kein/kein gültiger Verdict-Report existiert, WHEN `review`/`security-review` mit
      non-zero abbricht, THEN gilt der Versuch weiterhin als Fehlschlag (Guard greift fail-closed).
- [ ] GIVEN `factory.defaults.yml`, WHEN gelesen, THEN steht `max_turns: 14` für `review` und
      `security-review` mit begründetem `@reason`.
- [ ] GIVEN `bash scripts/run-pipeline.sh <task-id> --dry-run`, WHEN ausgeführt, THEN zeigt es die
      neuen Turn-Werte, ohne Regression an der bestehenden Ausgabe.

### Querschnitt
- [ ] Self-Test-Abdeckung in `scripts/checks/tests/run-tests.sh`: (a) `factory-commit.sh`
      (Happy-Path via git-Stub, main/master-Verweigerung, „nichts zu committen"), (b) der
      `run_skill()`-Report-Guard (Report mit Verdict → Erfolg; ohne Verdict → Fehlschlag) – bleibt grün.
- [ ] `.claude/settings.json` bleibt konsistent: `.claude/**` und `.env*` weiterhin in `deny`;
      keine pauschale `Bash(git *)`- oder `Bash(gh *)`-Freigabe.

## Fehlerszenarien
- [ ] `factory-commit.sh` ohne git-Repo / detached HEAD → klare Meldung, fail-closed (Exit ≠ 0).
- [ ] `git push` scheitert (Netz/pre-push-Hook rot) → Exit ≠ 0 mit weitergereichter Fehlerursache;
      der aufrufende Skill/Pipeline-Schritt scheitert sichtbar (kein stiller „committed, aber nicht
      gepusht"-Zustand).
- [ ] Report-Datei existiert, enthält aber **keinen** gültigen Verdict-String → Guard greift nicht
      (Versuch = Fehlschlag), damit ein halbfertiger Report nicht fälschlich als Erfolg zählt.
- [ ] Verdict-Erkennung robust gegen Groß-/Kleinschreibung und Vorkommen im Fließtext? →
      Muster an die verbindlichen Report-Überschriften/-Werte aus `review.md`/`security-review.md`
      koppeln (wie schon `pipeline_summary`), nicht frei raten.
- [ ] Portabilität (macOS/BSD **und** CI/GNU/Alpine): nur POSIX-Shell/-Regex, kein PCRE –
      vgl. `docs/factory/guidelines/clean-code.md` „Portabilität in Gate-Skripten" + `bash-gotchas.md`.
- [ ] Config-/variable Werte in Shell als Daten behandeln (`grep -F -- "$wert"`, Integer-Guards) –
      ADR-010.

## Offene Fragen
- [x] **Architektur-Entscheidung als ADR festhalten?** → **ENTSCHIEDEN: `docs/adr/019-stage3-commit-seam-report-guard.md`** (Accepted, 2026-07-12).
      Hält Wrapper-Seam, read-only-git/`gh`-Freigabe, Report-Guard und Budget-Puffer mit
      Alternativen fest.
- [ ] **`gh`-Verb-Liste vollständig?** Die freigegebenen `gh pr …`/`gh run …`-Verben stammen aus
      `pr-shepherd.md` (Stand origin/main). Vor `/implement` gegen die aktuelle `pr-shepherd.md`
      gegenprüfen; nur tatsächlich genutzte Verben freigeben (kein Wildcard).
- [ ] **Commit-Message-Konvention im Wrapper:** Message als Pflicht-Argument (Aufrufer setzt
      Conventional-Commit-Präfix) oder optionaler Default? Empfehlung: Pflicht-Argument, damit die
      Message-Verantwortung beim Skill bleibt.

---

## Hinweise für die Umsetzung (nicht Teil der Spec)

- **Lokaler `main` ist veraltet** (`c9fab26`), `origin/main` (`5e2440e`) enthält #88. Vor
  `/implement`: `git fetch && git pull --rebase origin main` bzw. `start-work.sh 91` (legt
  Worktree/Branch/Draft-PR an) – diese Spec wurde gegen `origin/main` verfasst.
- Task-Datei `tasks/task-91-*.md` existiert noch nicht; sie wird durch `scripts/start-work.sh 91`
  aus dem Template erzeugt. Diese Akzeptanzkriterien dann als Checkboxen dorthin übernehmen.
