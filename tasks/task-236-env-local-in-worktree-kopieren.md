# Task 236: env-local-in-worktree-kopieren

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

`start-work.sh` legt jede Task in einem eigenen Worktree an; die gitignorete `.env.local`
wandert dabei nicht mit. Da alle DEV-Skripte (`test:e2e`, `db:migrate`, `db:seed`, `db:studio`)
ihre Konfiguration per `dotenv -e .env.local` laden, scheitert der erste E2E-Lauf im frischen
Worktree mit einem irreführenden `CredentialsSignin` – in #228 zunächst fälschlich als echte
Regression gedeutet. Diese Task ist der dort ausgelagerte Root-Cause-Fix: `start-work.sh`
kopiert `.env.local` beim Anlegen des Worktrees automatisch mit und weist auf einen ggf.
nötigen `pnpm db:seed`-Lauf hin.

Spec: [`docs/specs/spec-236-env-local-in-worktree-kopieren.md`](../docs/specs/spec-236-env-local-in-worktree-kopieren.md)

**Zuschnitt-Entscheidungen (in /requirements getroffen):** nur `.env.local` kopieren (nicht
`.env.int`/`.env.prd` – Least Privilege); `db:seed` nur als Hinweis, nicht automatisch
ausführen (keine Seiteneffekte auf die geteilte DEV-DB).

## Akzeptanzkriterien

- [x] AK1 · GIVEN der Quellbaum – der Baum, in dem `start-work.sh` liegt (`$FACTORY_DIR`),
      üblicherweise der Haupt-Baum – hat `.env.local` WHEN `start-work.sh` einen Worktree anlegt
      THEN liegt dort eine byte-identische `.env.local`, und der Output nennt das Kopieren
- [x] AK2 · GIVEN der Quellbaum (`$FACTORY_DIR`) hat keine `.env.local` WHEN `start-work.sh`
      läuft THEN exit 0, keine `.env.local` im Worktree, kein Fehler
- [x] AK3 · GIVEN Ziel-Worktree hat bereits eine abweichende `.env.local` WHEN `start-work.sh`
      erneut läuft THEN bleibt sie unverändert (nie überschreiben) und der Output nennt das
      Überspringen
- [x] AK4 · GIVEN `FACTORY_WT_SKIP_ENV=1` WHEN `start-work.sh` einen Worktree anlegt THEN wird
      nicht kopiert
- [x] AK5 · GIVEN Quelle hat Modus `600` WHEN kopiert wird THEN hat die Kopie ebenfalls `600`
- [x] AK6 · GIVEN `.env.local` wurde kopiert WHEN der Abschluss-Output entsteht THEN enthält er
      einen `pnpm db:seed`-Hinweis
- [x] AK7 · GIVEN nichts wurde kopiert WHEN der Abschluss-Output entsteht THEN enthält er
      **keinen** `pnpm db:seed`-Hinweis (Spiegel zu AK6)
- [x] AK8 · GIVEN `FACTORY_NO_WORKTREE=1` WHEN `start-work.sh` läuft THEN keine Kopieraktion,
      Verhalten unverändert
- [x] AK9 · Doku-Drift im selben PR nachgezogen: Lesson (`factory-workflow.md`),
      Index-Zeile (`PROJECT-CONTEXT.md`), Env-Schalter-Liste (`git-workflow.md`),
      Kopf-Kommentar (`start-work.sh`)

## Fehlerszenarien

- [x] Kopieren schlägt fehl → Warnung, kein Abbruch (analog `pnpm install`, `start-work.sh:255`;
      `set -euo pipefail` beachten). Scheitert `cp` erst **nach** dem Anlegen des Ziels, wird der
      eigene unvollständige Rest entfernt (sonst friert ihn AK3 dauerhaft ein)
- [x] Wiederverwendeter Worktree → Kopier-Schritt läuft, greift aber nur bei fehlender Zieldatei
- [x] Quelle ist Verzeichnis / **defekter** Symlink → wird wie „Quelle fehlt" (AK2) behandelt;
      ein Symlink auf eine vorhandene Datei wird dagegen als echte Datei-Kopie materialisiert
      (gewollt, per Test gepinnt)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Kein ADR-Trigger (lokale Tooling-Ergonomie, reversibel, keine Architektur-Entscheidung) →
nach diesem Schritt direkt `/implement 236`.

- Einbau im Worktree-Zweig von `scripts/start-work.sh` nach `worktree add` (`:208-218`),
  **vor** dem `pnpm install`-Block (`:249-257`)
- Rechte-Erhalt via `cp -p` (portabel macOS/BSD + GNU)
- Tests in den bestehenden Block `scripts/checks/tests/run-tests.sh:1823+` einhängen
  (vorhandene Fixtures wiederverwenden, keine parallele Fixture-Landschaft)

### Umsetzungs-Notizen (/implement, 2026-08-14)

- Kopier-Schritt sitzt wie geplant zwischen `worktree add` und `pnpm install`
  (`scripts/start-work.sh`), Flag `ENV_COPIED` steuert den `db:seed`-Hinweis im Abschluss.
  Vorbelegung `ENV_COPIED=false` **vor** der Modus-Verzweigung, weil kein Zweig die Zuweisung
  garantiert erreicht (In-Place-Modus, Opt-out, fehlende Quelle, vorhandene Zieldatei,
  `cp`-Fehler) – `set -u` würde sonst beim Abschluss-Output brechen.
- Zieldatei-Guard prüft `-e` **oder** `-L`: ein defekter Symlink ist für `-e` unsichtbar, wäre
  aber vorhandene lokale Konfiguration – `cp` würde ihn überschreiben (AK3 fail-safe).
- `cp -p` steht in der `elif`-Bedingung: dort ist es von `set -e` ausgenommen, der Fehlerpfad
  bleibt eine Warnung ohne Abbruch (Fehlerszenario 1).
- Tests im Block „start-work.sh (Worktree-Isolation, #74)", Fixtures `REPO_SW`/`REPO_IP`/gh-Stub
  wiederverwendet. Rechte-Prüfung (AK5) über den Helper `ls_mode_matches` (Präfix-Match auf
  `ls -l`), weil `stat`-Flags zwischen BSD und GNU unvereinbar sind.
- Der Fehlerfall „unlesbare Quelle" (`chmod 000`) wird als root übersprungen (lautes Skip
  statt falsch-grün, analog `skip_yq`).
- AK4/AK8 sind Abwesenheits-Assertions; ihre Diskriminierung liegt in AK1/AK6, die mit
  **derselben** Quelldatei das Kopieren positiv belegen.
- Verifikation: `bash scripts/checks/tests/run-tests.sh` → 996 grün / 0 rot (RED-Lauf vorher:
  10 rot). Keine UI-/Routen-Berührung → keine Oberflächentests nötig.

### Rework-Notizen (/implement, Runde 2, 2026-08-14)

Abarbeitung von [`tasks/review-236.md`](review-236.md) (Empfehlung NEEDS_REWORK). Die Runde
davor war durch ein Pipeline-Timeout unterbrochen worden – Tests waren nachgezogen,
`start-work.sh` selbst noch nicht.

- **Meldungstext (`start-work.sh`)**: „aus dem Haupt-Baum kopiert" → `.env.local kopiert
  (Quelle: ${FACTORY_DIR})`. `FACTORY_DIR` ist der Baum, in dem das Skript liegt – beim
  üblichen Aufruf aus einem Worktree eben dieser, nicht der Haupt-Baum. Der Opt-out-Hinweis
  wanderte in eine Ankündigungszeile (Vorbild: pnpm-Block).
- **`db:seed`-Hinweis** steht jetzt als Zusatz unter Schritt 2 statt als Schritt „3." – er muss
  vor dem ersten `pnpm test:e2e` greifen, und das passiert innerhalb von Schritt 2.
- **`ENV_COPIED=false`-Kommentar** von „In-Place-Zweig" auf „kein Zweig erreicht die Zuweisung
  garantiert" verallgemeinert (Opt-out, fehlende Quelle, vorhandene Zieldatei, `cp`-Fehler
  laufen ebenfalls daran vorbei).
- **AK3-Zweig-Anker ersetzt** (siehe Out-of-Scope-Fund unten): geprüft wird jetzt das
  Spec-Szenario („wird wiederverwendet" + keine Neuanlage) statt einer der beiden
  benachbarten Meldungen, dazu zwei Diskriminierungs-Assertions gegen den ersten Lauf.
- **Doku-Drift**: Lesson `factory-workflow.md` – „nach dem **manuellen** `.env.local`-Kopieren"
  im selben Präsens-Absatz entfernt (der Absatz war oben schon auf „heute automatisiert"
  umgestellt), Umbruch geglättet. Spec + Task-Datei präzisiert auf „Verzeichnis / **defekter**
  Symlink"; der Symlink-auf-Datei-Fall ist als gewolltes Verhalten benannt und per Test gepinnt.
- Verifikation: `bash scripts/checks/tests/run-tests.sh` → **1014 grün / 0 rot**.

### Out-of-Scope-Fund (nicht behoben – vorbestehend, klassifiziert)

`scripts/start-work.sh:208` erkennt einen wiederverwendeten Worktree über einen **exakten**
String-Vergleich gegen `git worktree list --porcelain`. Git meldet dort den **aufgelösten**
Pfad, `$WORKDIR` ist der unaufgelöste – enthält der Pfad irgendwo einen Symlink (empirisch
belegt: macOS `mktemp -d` unter `/var/folders` → `/private/var/folders`), greift der Vergleich
nie und es feuert der Nachbar-Zweig `:210` („Pfad existiert bereits (kein Worktree)"). Folge im
Normalfall nur eine irreführende Meldung (beide Zweige verwenden wieder, beide sind reine
`echo`-Zweige ohne Folgeaktion). Der Fund stammt aus #74, nicht aus diesem PR, und ist hier
bewusst **nicht** mitgefixt (Scope). Klassifikation in `/review` Runde 2 getroffen: kein
funktionaler Defekt, kein Sicherheitsrisiko → Eintrag in
[`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md), kein Issue.

### Rework-Notizen (/implement, Runde 3, 2026-08-14)

Abarbeitung der fünf wichtigen Findings aus [`tasks/review-236.md`](review-236.md) (Runde 2)
plus der umsetzbaren Nitpicks.

- **Quelle der Kopie ist `$FACTORY_DIR`, nicht „der Haupt-Baum"** – der Widerspruch lag in der
  Doku, nicht im Code (die Erfolgsmeldung nennt `$FACTORY_DIR` seit Runde 2). Nachgezogen in
  `git-workflow.md`, Lesson, Spec (Scope + AK1/AK2/AK4/AK5) und Task-AKs: „Quellbaum = der Baum,
  in dem `start-work.sh` liegt, üblicherweise, aber nicht zwingend der Haupt-Baum", inkl. der
  Konsequenz, dass aus einem Worktree ohne eigene `.env.local` nichts kopiert wird.
- **`cp`-Teilabbruch räumt jetzt auf** (`rm -f "$WORKDIR/.env.local"` im Fehlerzweig): scheitert
  `cp` erst nach dem Anlegen des Ziels (ENOSPC/EIO) oder nur am `-p` (exFAT/SMB), bliebe sonst
  ein Rest liegen, den der AK3-Guard bei jedem Folgelauf konserviert – dauerhaft kaputt, Symptom
  wieder `CredentialsSignin`. Test über einen `cp`-PATH-Stub (Mechanik des vorhandenen gh-Stubs),
  der genau diesen Zustand herstellt; Diskriminierung über einen Folgelauf mit echtem `cp`.
- **AK9(d)-Header-Isolation war fail-open**: ändert sich der `awk`-Sentinel, lieferte die
  Extraktion die ganze Datei und der Guard griffe auf den Produktionscode durch (#255-Muster).
  Jetzt zusätzlich Zeilenzahl-Beleg für den Abbruch + Anker auf die Kommentarform
  (`^#   FACTORY_WT_SKIP_ENV=1`). AK9(c) greppt nicht mehr file-weit nach dem Einzelwort, sondern
  über `flat_286` auf die Env-Schalter-Liste.
- **Falsche empirische Behauptung im Test-Kommentar korrigiert** (Lessons #268/#264/#284): gegen
  `git show origin/main:…` gegengelesen – nur die **Lesson**-Stelle stand umbrochen, die
  PROJECT-CONTEXT-Zeile stand **einzeilig**. Die zweite Positiv-Kontrolle nutzt jetzt den echten
  einzeiligen Alt-Wortlaut und ist ehrlich als Quoting-/Fixed-String-Beleg deklariert.
- **Nitpicks umgesetzt:** `flat_286` squeezt Leerzeichen (Umbruch-Toleranz galt bisher nur für
  unindentierte Fortsetzungen); AK5-Diskriminierung unter `umask 022` gestellt; AK3-„unverändert"
  byte-genau über `cmp -s` statt Command Substitution; eigene Sentinel-Pfade je Symlink-Test;
  `env "${@:4}"` statt unquotiertem `${4:-}`; neuer Helper `assert_absent` ersetzt 9× das
  kryptische `assert_true "$([ $? -ne 0 ]; echo $?)"`; Lesson-Kausalbrücke und Ordinalzahl
  repariert; „hält bis heute" in der Spec auf „hielt bis zu diesem PR" gezogen; stale
  Zeilenanker in Spec und Task-Datei nachgezogen.
- **Bewusst nicht umgesetzt** (Scope, CLAUDE.md Regel 5): Rename von `flat_286`/
  `assert_contains_286` (25 Aufrufstellen im Fremdblock #286), `set_env_source`-Setter für die
  Quell-Fixture-Kette, Zusammenlegen der drei Env-Prologe. Alle drei sind reine
  Test-Hygiene ohne Verhaltensbezug – Kandidaten für den `/refactor`-Pass.
- Verifikation: `bash scripts/checks/tests/run-tests.sh` → **1020 grün / 0 rot**
  (RED-Lauf des neuen `cp`-Teilabbruch-Tests vorher: 2 rot – „Rest wird entfernt" und
  „Folgelauf kopiert vollständig").

## Offene Fragen

_Keine offenen Fragen._

## Review-Findings

Runde 1 und Runde 2: siehe [`tasks/review-236.md`](review-236.md) – in beiden Runden keine
kritischen Findings; alle wichtigen Findings und die umsetzbaren Nitpicks sind abgearbeitet
(Checkboxen dort gesetzt, Runde-1-Volltext in der Git-History der Datei).

Bewusst **nicht** umgesetzt:
- Runde 1: der Regressions-Guard „kopierte Datei gerät nie in einen Commit" (vom Review selbst
  als hypothetischer Zustand eingestuft; strukturell durch `.gitignore:50` und das gezielte
  `git add "$TASK_FILE"` abgedeckt).
- Runde 2: die drei Test-Hygiene-Nitpicks ohne Verhaltensbezug (Helper-Rename `flat_286`,
  `set_env_source`-Setter, Zusammenlegen der drei Env-Prologe) – Begründung in den
  Rework-Notizen Runde 3.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/236-env-local-in-worktree-kopieren`
Erstellt: 2026-08-14 19:44
