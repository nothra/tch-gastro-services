# Review: Task 427

> Iteration 1 · 2026-10-23 · Scope `git diff origin/main...HEAD` (9 Dateien) · drei Runden
> (Logik, Code-Qualität, Architektur) als getrennte Sub-Agenten. Verhaltensbehauptungen der
> Wichtig-Findings W1 (Regel) und A3 (ADR-D5-Wortlaut, `ADR-009 #7`) im Orchestrator per Repro
> nachgeprüft.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] [scripts/project/factory-extract.rules:1 · factory-extract.sh (Python `rewrite`, `qualify md`)] **Umschreibregel zerstört Markdown-Sprunganker, Ziffern-Farbcodes und HTML-Entities.** Der Lookbehind schließt `(` und `&` nicht aus, `\b` greift vor `-`: `[0. Setup](#0-einmal-setup)` → `](nothra/tch-gastro-services#0-einmal-setup)`, `&#8212;` → `&nothra/…#8212;`, `#333333` → `nothra/…#333333` (Repro bestätigt). `docs/factory/OPERATING.md` hat 21 solcher Anker – `qualify` würde sie in T1b-2 still brechen. Tests decken nur `#1e40af` ab. Fix: Anker (`(#` gefolgt von Ziffern und `-`), `&#…;` und reine Ziffern-Farbcodes (6 Ziffern) ausschließen; Gegenbeispiele in die Tests. Commit-Messages auf `origin/main` sind nicht betroffen (A4 bleibt gültig). _(Runde 1, W1)_
- [x] [scripts/project/tests/factory-extract-tests.sh:202-208] **A2-Negativtest nicht isoliert:** `app/x.tsx` trifft auch `FORBIDDEN_ERE`; ohne den `comm -23`-Zweig bliebe der Test grün (Mutationsbeleg Runde 1). Fix: Pfad außerhalb der Liste **und** außerhalb der verbotenen Bereiche (z. B. `docs/factory/fremd.md`) testen. _(Runde 1, W2)_
- [x] [scripts/project/tests/factory-extract-tests.sh:223, 234, 247, 270-271] **Labels „nur Ax schlägt an (Negativtest isoliert)" behaupten mehr als geprüft:** je Test ist nur **ein** anderes Präfix abwesend. Fix: in jedem verify-Negativtest die übrigen drei Prüfungen positiv auf `Ax ok` prüfen (Lessons #214/#322). _(Runde 2, W1)_
- [x] [scripts/project/tests/factory-extract-tests.sh:175-193 vs. 34-46] **Zweites Scaffold `fx_verify_pair` neben `fx_source`** (gleicher Rumpf, nur ohne App-Dateien und mit qualifizierten Messages); Pfadliste dreifach als Literal. Fix: `fx_source` parametrisieren, Metadaten aus einer gemeinsamen Konstante (Lesson #310). _(Runde 2, W2)_
- [x] [docs/factory/adr/063-…md, Nachtrag Q2 `scan` · tasks/task-427-…md „Neue Dateien" · factory-extract.sh B1-Berichtszeile] **Falsch-Positiv-Liste `factory-extract.gitleaksignore` fehlt in ADR und Task**, und der erzeugte Bericht nennt nur die Anzahl, während Spec B1 jeden Fund „einzeln als Falsch-Positiv mit Begründung" im Bericht verlangt. Fix: Nachtrag um die Liste ergänzen (Format Fingerprint + Begründungskommentar, `--gitleaks-ignore-path`); `scan` gibt die ausgenommenen Fingerprints samt Begründung im Bericht aus; Task-Datei „Neue Dateien" ergänzen (Lessons #211/#55). _(Runde 3, W1)_
- [x] [docs/factory/adr/063-…md, Nachtrag „Altpfade, die in TCH noch leben"] **Widerlegte Tatsachenbehauptung:** `.gitignore` ist laut Probelauf kein `--follow`-Altpfad und kommt nicht mit. Fix: aus der Aufzählung nehmen; Bootstrap-PR setzt `.gitignore` neu zusammen (Lesson #253). _(Runde 3, W2)_
- [x] [docs/factory/adr/063-…md, Nachtrag Einleitung vs. D5] **Dritte, unmarkierte Abweichung:** D5 verlangt vor dem ersten Push einen Grep auf TCH-Domänenbegriffe; Q5 verschiebt die Begriffs-Bereinigung hinter den Push, `scan` prüft keine Begriffe. Fix: als Abweichung von D5 kennzeichnen und begründen („nichts, was nicht schon über TCH öffentlich ist"). _(Runde 3, W3)_

## Nitpicks (optional)

- [x] [factory-extract.sh `cmd_qualify`] Ohne Git-Repo Exit 128 statt 2 (`git ls-files` außerhalb des `|| exit 2`). _(R1 N1)_
- [x] [factory-extract.sh Python `md`/`sh`] `qualify` schreibt durch Symlinks hindurch (auch außerhalb des Ziels); heute keine Symlinks im Bestand – Symlinks überspringen. _(R1 N2)_
- [x] [factory-extract.sh `follow_names`/`list_paths`/`check_a2`] `core.quotePath` quotet Nicht-ASCII-Pfade; `-c core.quotePath=false` setzen. _(R1 N3)_
- [x] [factory-extract.sh `assert_main_current`] Kein `fetch` – veraltetes `origin/main` gilt als „gemergt"; Hinweis oder `ls-remote`-Abgleich. _(R1 N4)_ — **teilweise:** Hinweis im Skript-Kopf und in den T1b-2-Hinweisen der Task-Datei; kein automatischer `ls-remote`-Abgleich (Netzzugriff im Werkzeug bewusst vermieden).
- [x] [factory-extract.sh `cmd_scan`] gitleaks-Fehler (Exit ≥ 2) → Exit 1 statt 2; Header und Test angleichen. _(R1 N5)_ — Header angeglichen (Exit 1 bei jedem gitleaks-Exit ≠ 0, Fund oder Fehler); Verhalten bleibt fail-closed.
- [x] [factory-extract.sh `check_a4`] A4 nutzt dieselbe Regex wie die Umschreibung – im Kommentar sagen, was „A4 ok" belegt (und was nicht). _(R1 N6)_
- [x] [factory-extract.sh `check_a3`] `$(printf '%s ' $src_names)` ungequotet (nur Ausgabe). _(R1 N7)_
- [x] [factory-extract.sh `cmd_run`] Nach Abbruch bleibt ein halbes Ziel; `die`-Text soll aufs Löschen hinweisen. _(R1 N8)_
- [x] [factory-extract.sh Kopf, `paths`] Klarstellen, dass `paths` den Arbeitsstand von `FACTORY_DIR` liest, `run` den Klon von `main`. _(R1 N9)_
- [x] [factory-extract.sh Python `load`] Parser `split` vs. filter-repo `rsplit` am `==>`; Whitespace-Zeilen fail-closed ablehnen – dann stimmt „dieselbe Regel" auch für künftige Regeln. _(R2 N1)_
- [x] [factory-extract.gitleaksignore:5-9] Determinismus-Kommentar: Fingerprint hängt an Pfadliste/Regel/filter-repo-Version, nicht nur am TCH-Stand; Tippfehler „geplantete". _(R2 N2)_
- [x] [factory-extract.sh] `list_paths` baut `follow_names` nach; `grep -v '^$' | LC_ALL=C sort -u` sechsfach – Helfer. _(R2 N3)_
- [x] [factory-extract.sh `cmd_scan`] Rechnen und Berichtsausgabe trennen (`print_scan_report`). _(R2 N4)_
- [x] [factory-extract.sh `ignored=…`] Regex unkommentiert; Kommentar-Erkennung in `is_allowed` uneinheitlich. _(R2 N5)_
- [x] [factory-extract.sh Python] unbekannter Modus läuft still als `sh` – Exit 2. _(R2 N6)_
- [x] [factory-extract.sh `check_a2…a5`] sprechende Namen oder Reihenfolge A2, A3, A4, A5. _(R2 N7)_ — **teilweise:** Reihenfolge jetzt A2, A3, A4, A5; Namen bleiben bei den AK-Kürzeln (Spec-Bezug, Ausgabe-Präfixe `A2:`…`A5:` gleich benannt).
- [x] [factory-extract-tests.sh:226, 321, 324, 349] Testhelfer `fx_git`/`fx_scan` statt Inline-Nachbau. _(R2 N8)_
- [x] [factory-extract-tests.sh:347, 151-152, 309] B2-Abwesenheit je erlaubter Adresse prüfen; „übergebene Pfadliste" auch am Argument prüfen; Herleitung `| Commits | 3 |` kommentieren. _(R2 N9)_
- [x] [ADR-Nachtrag Q2 `verify`] „A3 (`--follow`-Stichprobe)" – geprüft werden alle Factory-Dateien. _(R3 N1)_
- [x] [spec-427 B3] B3 nennt fest PR #435, gilt laut Teilungstabelle aber auch für T1b-2. _(R3 N2)_
- [x] [Task-Datei, Hinweise für T1b-2] `qualify`-Grenzen festhalten: Falschtreffer bei Abschnittsnummern wie `ADR-009 #7`, `bash-gotchas #3` (9 Stellen in `*.md`/`*.sh`); YAML-Kommentare in `factory-ci.yml`, `factory-poll.yml`, `factory.defaults.yml`, `factory.config.yml.example` (~21 Treffer) werden nicht angefasst; Fixture `lessons-split-426.tsv` (173 Treffer) muss Fixture bleiben; Aufruf `qualify <factory-klon>` aus dem TCH-Klon. _(R3 N3/N5)_ — N3 als T1b-2-Hinweise in der Task-Datei; N5 (Slug-Präfix für TCH-Pfade im Nachtrag) bleibt Entscheidung der Bereinigung in T1b-2.

## Out-of-Scope

- **`docs/factory/OWNERSHIP.md:130-131` – Begründung zu `scripts/project/**`** nennt nur Gate-Erweiterungspunkte bzw. Deploy-/Neon-Skripte; `factory-extract.*` passt nicht zur Begründung (Zuordnung `project` selbst ist korrekt). Unter der Schwelle (Doku-Drift, < 10 Zeilen). **Nicht** in `docs/factory/kleinfunde.md` eingetragen: das ist eine Factory-Datei, und X1 verbietet in diesem PR jede Factory-Änderung außer dem ADR-Nachtrag (Kleinfunde-Regel „nicht schreibbar → im eigenen Report vermerken"). Mitnehmen beim Anlegen der eigenen `OWNERSHIP.md` des Factory-Repos (T1b-2, Q4) bzw. in T2/T3. _(R3 N4)_

## Positives

- Konsequent fail-closed mit klarer Exit-Semantik 0/1/2: fehlende Werkzeuge, Metadaten, commit-map, leere commit-map, ungültige Regel, unlesbare Listen → Exit 2, nie „sauber".
- `die` in `$(...)`-Kontexten korrekt behandelt (Exit-2-Erkennung in `cmd_scan`, Schleifen per Umleitung statt Pipe in `check_a3`/`check_a5`, `|| exit 2` + `pipefail` in `list_paths`).
- X2 sauber: `clone --no-local --single-branch --branch main` aus `--git-common-dir` (worktree-fest), main==origin/main-Abgleich, Test belegt unberührte HEAD/Refs/Arbeitsbaum.
- Eine Regeldatei für Messages und Inhalte, Python `re` auf Bytes wie filter-repo; Parser aus dem Klon (Pfadliste und Zuordnungstabelle vom selben Stand); `RULES_FILE` relativ zum Skript (Lesson #431).
- Tests brechen die Messung (Stubs: fehlt, meldet Fund, Exit 3), feste Git-Identität (Lesson #265), echter `ownership-check.sh` im Fixture; läuft ohne globale Git-Konfiguration grün; A3 doppelt abgedeckt.
- X1 erfüllt (einzige Factory-Datei im Diff: ADR-063-Nachtrag); `docs/routes.md` zu Recht unberührt; Probelauf-Bericht gründlich und ehrlich (Falsch-Positive, `.gitignore`).

## Rework (Iteration 1, 2026-10-23)

Alle sieben Wichtig-Findings behoben, Nitpicks wie vermerkt. Regel-Änderung gegen den echten Bestand gemessen: alle 184 Commit-Messages von `origin/main` unverändert gegenüber dem Probelauf, im Factory-Inhalt ändern sich genau die 21 Sprunganker in `OPERATING.md`. Neue Tests per Mutation belegt (alte Regel, quotePath, Symlink-Schutz, `comm` in A2, Begründungspflicht, `ls-files`-Fehler in `qualify` – je mindestens ein Test rot). Probelauf mit dem überarbeiteten Werkzeug wiederholt: A2–A5, B1, B2 grün, Falsch-Positiv mit Begründung im Bericht.

## Empfehlung

NEEDS_REWORK
