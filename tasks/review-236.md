# Review: Task 236

> Drei Review-Runden (Backend/Logik · Code-Qualität · Architektur/Doku) gegen
> `git diff origin/main...HEAD`. Verifikationsbasis dieses Reports:
> `bash scripts/checks/tests/run-tests.sh` → **996 grün / 0 rot** (exit 0, unabhängig
> nachgefahren) sowie eine Verhaltensprobe zur Datei-Test-/`cp`-Semantik auf macOS/BSD
> (`-f`/`-e`/`-L` bei Symlink/Verzeichnis, `cp -p` bei unlesbarer Quelle, `ls -l | cut -c2-10`).

## Kritische Findings (müssen behoben werden)

_Keine._ Der Produktionscode ist funktional korrekt, fail-safe und unter `set -euo pipefail`
sauber abgesichert. Alle Findings unten betreffen Test-Aussagekraft und Doku-Konsistenz.

## Wichtige Findings (sollten behoben werden)

- [ ] **`scripts/start-work.sh:225` · Der `|| [ -L "$WORKDIR/.env.local" ]`-Zweig ist neuer
      Produktionscode ohne jeden Test.** Kein Testfall legt einen (defekten) Symlink als
      *Zieldatei* an. Streicht man die `-L`-Alternative, bleiben alle 24 neuen Assertions grün –
      obwohl sich das Verhalten ändert: empirisch verifiziert liefert ein defekter Symlink
      `-e=falsch, -L=wahr`, `cp` würde ihn also ersetzen und damit genau die „fremde lokale
      Konfiguration" zerstören, die der Guard schützen soll. Exakt das Muster „OR-Fragment mit
      nie feuernder Alternative" (Lesson aus #258); `testing-standards.md` verlangt für neuen
      Code 100 %. → Testfall ergänzen (defekter Symlink im Worktree → bleibt Symlink, Warnung
      erscheint) **oder** den Zweig weglassen.

- [ ] **`scripts/checks/tests/run-tests.sh:1976-1980` (AK4) und `2013-2019` (AK8) ·
      Abwesenheits-Assertions ohne „Lauf ist durchgelaufen"-Anker → vakuum-grün.** Beide Fälle
      prüfen ausschließlich, dass etwas *fehlt* (keine Datei, kein `db:seed`-Text), ohne
      Exit-Code oder Abschluss-Marker. Bricht `start-work.sh` vor dem Kopier-Schritt ab
      (künftiger Guard vor dem `worktree add`, `gh`-Stub-Änderung, im AK8-Zweig zusätzlich
      `git checkout main` / `git pull --rebase` gegen das Bare-Remote), sind alle drei
      Assertions grün, obwohl das getestete Verhalten nie lief. AK2 (`:1943 assert_exit 0`),
      der Verzeichnis-Fall (`:1987`) und der Fehlerfall-Block (`:2003 grep -q 'Bereit!'`) machen
      es im selben Block richtig. → `RC` mitfangen bzw. `grep -q 'Bereit!'` ergänzen
      (Lesson #214: „pfadspezifisches Signal assertieren – sonst grün aus dem falschen Grund").

- [ ] **`run-tests.sh:1944, 1977, 1988` · Abwesenheits-Assertion gegen hartkodierten
      Worktree-Pfad ohne Existenz-Anker.** `[ ! -e "$TMP_SW/wt-skipenv/feature-782-demo-skipenv/.env.local" ]`
      ist auch dann wahr, wenn das Verzeichnis gar nicht existiert. Ein Tippfehler im Testpfad
      oder eine Änderung des Slug-Schemas in `start-work.sh:201`
      (`WORKDIR="$WT_BASE/${BRANCH_NAME//\//-}"`) entwertet AK2, AK4 und den Verzeichnis-Fall
      lautlos. Nur AK1 verankert einen Pfad positiv – und zwar einen anderen.
      → Je Fall ein `[ -d "$WT" ]` (oder Task-Datei-Existenz) vorschalten.

- [ ] **`run-tests.sh:2031-2044` · Vier Mehrwort-`grep -qF`-Anker gegen Markdown-Prosa, obwohl
      der zeilenumbruch-tolerante Helper `flat_286()`/`assert_contains_286()` in derselben Datei
      existiert (`:4963`/`:4968`).** 2× gegen `lessons/factory-workflow.md`, 2× gegen
      `PROJECT-CONTEXT.md` – genau die Schwelle, die die viermal codifizierte Lesson
      (#240/#249/#286) nennt: „ab zwei Mehrwort-Checks gegen dieselbe Datei lohnt ein
      zeilenumbruch-toleranter Lese-Helper". Der Kommentar `:2021-2022` zeigt, dass die Lesson
      bekannt war; die Konsequenz wurde nicht gezogen. Fehlszenario in **beide** Richtungen: ein
      Doku-Reflow bricht `…erledigt das seit #236\nautomatisch…` um → Präsenz-Guard lautlos rot;
      der Abwesenheits-Guard wird durch einen Umbruch lautlos **grün**, obwohl der alte
      Follow-up-Text wieder dasteht. → Helper-Definition hochziehen (reines Verschieben) und
      nutzen.

- [ ] **`run-tests.sh:2033-2034` · Abwesenheits-Guard auf die generische Phrase
      `'als eigener Task ausgelagert'` läuft datei-weit über die gesamte Lesson-Sammlung.**
      Die Wendung ist die etablierte Repo-Formulierung für vertagte Arbeit und nicht
      #236-spezifisch. Legt der nächste `/codify`-Lauf ein völlig unabhängiges Learning mit
      derselben Wendung an, wird dieser Test rot und blockiert einen Fremd-PR; umgekehrt bindet
      der Guard nicht an den #228-Abschnitt. Das Gegenstück `:2041`
      (`'Root-Cause-Fix ausgelagert: #236'`) ist über die Issue-Nummer korrekt verankert.
      → Entweder `#236` in den Anker aufnehmen oder den `### …`-Abschnitt per `awk` isolieren
      (im File etabliertes Mittel, vgl. `ci_job_block` `:64`).

- [ ] **`docs/factory/lessons/factory-workflow.md:743` · Rest-Drift im selben Absatz, den der
      PR anfasst.** Zeile 738 wurde korrekt auf „wurde **damals** … nicht mitkopiert (heute
      automatisiert)" umgestellt, Zeile 743 behauptet im selben Präsens-Absatz weiter
      „für die (nach dem **manuellen** `.env.local`-Kopieren) geladenen `SEED_ADMIN_*`-…".
      AK9(a) verlangt genau diese Konsistenz; die beiden Anker-Assertions (`seit #236
      automatisch`, Abwesenheit von `als eigener Task ausgelagert`) können den Widerspruch nicht
      sehen. Fehlszenario: ein `/implement`-Agent lädt die Lesson beim ersten E2E-Lauf und liest
      weiterhin „manuelles Kopieren". Lesson #176: auch Lesson-Doku im Präsens im selben PR
      nachziehen.

- [ ] **`run-tests.sh:1962-1963` · AK6 hat Direktive *und* Begründung, getestet wird nur die
      Direktive.** Die AK fordert einen `pnpm db:seed`-Hinweis „**mit Begründung**: geteilte
      lokale DB kennt die `SEED_ADMIN_*`-Daten evtl. noch nicht". Der Test greppt nur `db:seed`;
      die Begründungszeile `start-work.sh:392` ist durch keine Assertion gedeckt und könnte
      ersatzlos gelöscht werden, ohne dass die Suite es merkt. Lesson aus #117: „AC mit
      Direktive + Begründung: je separierbaren Teil eine eigene Assertion".

- [ ] **`tasks/task-236-env-local-in-worktree-kopieren.md:55` (+ `docs/specs/spec-236-…md:103-105`,
      `scripts/start-work.sh:223`) · Symlink als *Quelle* wird kopiert, die Task-Notiz behauptet
      das Gegenteil – und kein Test deckt den Fall.** Empirisch verifiziert: `[ -f … ]`
      dereferenziert Symlinks und `cp -p` (ohne `-P`/`-d`) folgt ihnen, ein
      `.env.local -> ~/secrets/tch.env` wird also als vollwertige Datei-Kopie materialisiert;
      nur ein *defekter* Symlink fällt durch `-f`. Die Task-Datei hakt aber ab: „Quelle ist
      Verzeichnis/**Symlink** → wird wie ‚Quelle fehlt' (AK2) behandelt" – das gilt nur für die
      zweite Hälfte. Der Spec-Satz ist bei genauem Lesen vereinbar („es gilt AK1, regulärer
      Datei-Test als Vorbedingung"), aber mehrdeutig genug, um in der Task-Notiz falsch
      anzukommen. → Wortlaut in Task **und** Spec präzisieren („Verzeichnis / defekter Symlink")
      und den Symlink-auf-Datei-Fall als gewolltes Verhalten mit Testfall pinnen (Lesson #253:
      frisch im selben PR entstandene Spec braucht denselben Drift-Check wie eine ADR).

## Nitpicks (optional)

- [ ] `run-tests.sh:1959-1961` · AK5 belegt den Modus, aber **nicht** `cp -p`: bei Quellmodus
      600 liefert auch ein `cp` ohne `-p` 600 (die umask kann nur Bits entfernen). Ein
      Refactoring `cp -p` → `cp` bliebe grün, der Assertion-Text „(cp -p)" verspricht mehr.
      Diskriminierend wäre eine Quelle mit 664.
- [ ] `run-tests.sh:1946, 1962, 1979, 2005, 2018` · `grep -q 'db:seed'` statt des
      spezifischsten Strings `grep -qF 'pnpm db:seed'` – `db:seed` trifft auch `db:seed:reset`
      und jede künftige Prosa-Erwähnung.
- [ ] `run-tests.sh:2035-2036, 2043-2044` · Die „Positiv-Kontrollen" beziehen ihren Haystack aus
      einem handgeschriebenen `printf` statt aus dem echten Vorzustand
      (`git show origin/main:… | grep -qF …`). Sie belegen Quoting/Syntax, nicht, dass der Anker
      den alten Wortlaut *in der Datei* getroffen hätte. (Im konkreten Fall lagen beide
      Alt-Phrasen einzeilig vor – der Guard ist faktisch scharf, nur die Kontrolle zeigt es nicht.)
- [ ] `scripts/start-work.sh:119-121` · Der WHY-Kommentar zu `ENV_COPIED=false` nennt nur einen
      von vier Pfaden („weil der In-Place-Zweig den Kopier-Schritt nicht durchläuft"). Die
      Vorbelegung ist unter `set -u` genauso nötig bei `FACTORY_WT_SKIP_ENV=1`, fehlender Quelle
      und fehlgeschlagenem `cp`. Verengte Kausalkette → auf „kein Zweig setzt sie garantiert"
      verallgemeinern (Lessons #264/#268).
- [ ] `scripts/start-work.sh:388-391` · Der `db:seed`-Hinweis ist als Schritt „3." **nach**
      „2. Implementieren starten" nummeriert, muss aber zeitlich vor dem ersten `pnpm test:e2e`
      greifen, das innerhalb von Schritt 2 stattfindet. Als „2a"/unnummerierter Hinweis direkt
      unter Schritt 2 träfe es besser.
- [ ] `scripts/start-work.sh:229` · Meldung „aus dem Haupt-Baum kopiert" ist ungenau:
      `FACTORY_DIR` (`:34`) ist der Baum, in dem das Skript liegt. Beim (in dieser Factory
      üblichen) Aufruf aus einem bestehenden Worktree ist die Quelle eben dieser Worktree.
      Spec-konform, aber der Text behauptet mehr. Neutraler: „aus `${FACTORY_DIR}` kopiert".
      Ebenso steht der Opt-out-Hinweis in der *Erfolgs*meldung, während das Vorbild (pnpm-Block
      `:238`) ihn in der Ankündigungszeile führt.
- [ ] `run-tests.sh:1960` · `ls -l … | cut -c2-10` sind Magic Numbers; der Kommentar erklärt nur
      die Portabilität, nicht die Spaltenwahl. `awk '{print $1}'` gegen `-rw-------` wäre gleich
      portabel und ohne Zahlen-Anker. (Auf macOS empirisch korrekt geprüft.)
- [ ] `run-tests.sh:1953` vs. `:1910` · Fixture-Basis `"$TMP_SW/wt-env"` von zwei unabhängigen
      Testgruppen geteilt (#82-Aspekt-Labels vs. #236-Kopie). Heute kollisionsfrei
      (`feature-901-fff` vs. `feature-781-demo-env`), aber unnötige Kopplung – `wt-236-env`
      wäre isoliert.
- [ ] `run-tests.sh:1930-1938` · `start_work_env` dupliziert den Rumpf von `run_create_label`
      (`:1875-1882`) mit getauschter Argumentreihenfolge (`$2 $3` vs. `$2 $1`). Vertretbar
      (andere Rückgabesemantik), lädt aber beim Bearbeiten des einen zum Vertauschen im anderen
      ein. Der Name ist zudem doppeldeutig – die Funktion startet start-work generisch,
      `run_start_work` träfe es.
- [ ] `#236`-Block gesamt · Die vom Spec-Hinweis geforderte Reihenfolge „Kopie **vor**
      `pnpm install`" ist durch keinen Test gedeckt (alle Läufe setzen
      `FACTORY_WT_SKIP_INSTALL=1`). Ein Positionsvergleich der beiden Anker-Zeilen im Skript
      wäre hier das passende Mittel. Niedrige Priorität – der Hinweis ist in der Spec als
      „nicht normativ" markiert.
- [ ] `docs/factory/lessons/factory-workflow.md:738-739` · Nach der Umformulierung ist der
      Zeilenumbruch ausgefranst („… Die lokale Postgres-DB läuft dagegen meist" endet kurz).
      Kosmetisch, aber die Datei ist ein häufiges `grep -qF`-Ziel.
- [ ] `run-tests.sh:1968-1972` · AK3 unterscheidet die beiden Wiederverwendungs-Zweige aus
      `start-work.sh:206/208` nicht („Worktree existiert bereits" vs. „Pfad existiert bereits").
      Für AK3 unschädlich, aber das Spec-Fehlerszenario ist nicht pfadgenau belegt.
- [ ] `scripts/start-work.sh:218-234` · Kein Regressions-Guard, dass die kopierte Datei nie in
      einen Commit gerät. Strukturell sicher (`:320` macht gezielt `git add "$TASK_FILE"`,
      `.gitignore:50` deckt `.env*`), aber das Fixture-Repo hat keine `.gitignore` und prüft es
      damit auch nicht implizit. Hypothetischer Zustand – bewusst hier statt als Issue vermerkt.

## Positives

- **Fail-safe-Design sauber getroffen und unter `set -euo pipefail` korrekt abgesichert:**
  `cp -p` steht in der `elif`-*Bedingung* und ist damit von `set -e` ausgenommen – der Fehlerpfad
  bleibt eine Warnung ohne Abbruch (Fehlerszenario 1 erfüllt). `git worktree add` steht bewusst
  *nicht* in einer Bedingung, ein Fehlschlag bricht also weiterhin ab, bevor in ein nicht
  existierendes Ziel kopiert wird.
- **`ENV_COPIED=false` vor der Modus-Verzweigung** (`:121`) ist die richtige Stelle – unter
  `set -u` wäre `:388` sonst ein harter Abbruch.
- **Kopie vor `pnpm install`** wie in der Spec vorgesehen: die Datei liegt auch bei
  fehlgeschlagener Installation da.
- **Der zusätzliche `-L`-Ziel-Test ist inhaltlich richtig** (auch wenn ungetestet, s. o.):
  empirisch bestätigt ist ein defekter Ziel-Symlink für `-e` unsichtbar.
- **Kein Ziel-Rest bei fehlgeschlagenem `cp`** (empirisch geprüft) – eine 0-Byte-`.env.local`,
  die wegen AK3 dauerhaft stehen bliebe, kann nicht entstehen.
- **AK1/AK3/AK6 sind gegen die Wirkung getestet** (`cmp -s` auf Byte-Gleichheit, unveränderter
  Inhalt nach dem zweiten Lauf, Output-Text), nicht nur gegen Verdrahtung.
- **AK2/AK7 laufen bewusst vor dem Anlegen der Quelle** – „Quelle fehlt" ist echt und nicht
  Nebeneffekt der Testreihenfolge; der Kommentar sagt das auch.
- **AK3 erzeugt vor dem Zielfall eine echte Divergenz** (`LOKAL_ANGEPASST=1`) und unterscheidet
  damit „Guard wirkt" von „es war ohnehin nichts zu tun" – erfüllt Lesson #253.
- **Der Fehlerfall „unlesbare Quelle" ist der methodisch stärkste Block:** Exit-Code + Warntext
  + Positiv-Anker `Bereit!` + Abwesenheit des Hinweises, plus lautes root-Skip statt falsch-grün
  (analog `skip_yq`).
- **Fixture-Wiederverwendung wie von der Spec gefordert** (`gh`-Stub, `REPO_SW`/`REPO_IP`,
  `FACTORY_WORKTREE_BASE`), keine parallele Fixture-Landschaft; `awk`-Header-Isolation für
  AK9(d) statt file-weitem Grep.
- **`${FACTORY_WT_SKIP_ENV:-0}`, `!= "1"`-Semantik, Default aktiv, Namensschema
  `FACTORY_WT_SKIP_*`** – exakt konsistent zum Schwester-Schalter, dokumentiert an genau den
  zwei kanonischen Orten (Skript-Kopf + `git-workflow.md`), kein dritter.
- **AK9 ist inhaltlich vollständig umgesetzt und es driftet nichts weiter:** repo-weite Suche
  nach `236`, `.env.local`, `FACTORY_WT_`, `worktree` ergab keine weitere Stelle, die den alten
  Zustand im Präsens beschreibt (README/`OPERATING.md` betreffen das Frisch-Clone-Setup,
  `.claude/commands/implement.md` und `agents/coding-agent.md` nennen `.env.local` weiterhin
  korrekt als Voraussetzung, ältere Task-Protokolle sind historisch). **Keine ADR driftet** –
  kein ADR beschreibt den Worktree-Mechanismus; ADR-042 (Hooks) bleibt unberührt. Die Einordnung
  „kein ADR-Trigger" ist tragfähig.
- **Routen-Doku nicht betroffen** – der Diff berührt keine Datei unter `app/`.
- **Schichtung gewahrt:** `start-work.sh` bleibt reine Arbeitsbaum-Vorbereitung
  (Worktree → Env-Datei → `pnpm install`); `db:seed` bewusst nur als Hinweis, keine
  DB-Seiteneffekte.
- **Kommentare erklären durchweg das WHY** und sind belegbar (`dotenv -e .env.local` deckt sich
  mit `package.json`, das `.env*`-Ignore mit `.gitignore:50`).

## Out-of-Scope-Findings

_Keine._ Alle Findings liegen im Scope dieses PRs; kein Issue und kein
`kleinfunde.md`-Eintrag angelegt.

## Empfehlung

NEEDS_REWORK
