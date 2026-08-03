# Review: Task 264

> **Review-Runde 3** (Iteration 3 von max. 3 – **Circuit-Breaker-Grenze erreicht**, siehe
> „Empfehlung"). Diff-Scope: `git fetch origin` + `git diff origin/main...HEAD` →
> `scripts/checks/tests/run-tests.sh` (+180), `docs/factory/lessons/factory-workflow.md`,
> `docs/factory/PROJECT-CONTEXT.md`, `docs/specs/spec-264-…md` (neu),
> `tasks/task-264-…md` (neu).
>
> **Runde 1 (1 kritisch / 2 wichtig / 3 Nitpicks) und Runde 2 (2 wichtig / 3 Nitpicks) sind
> vollständig abgearbeitet** – nachgeprüft, siehe „Positives". Das einzige Finding unten ist
> **neu** und wurde in beiden Vorrunden übersehen.
>
> **Verifikations-Hinweis (Abweichung zu den Vorrunden – hier deutlich mehr belegt):** Ein
> Lauf von `run-tests.sh` war auch in dieser Session nicht freigegeben. Statt die Zahlen aus
> der Implementierungsphase zu übernehmen, wurde die **Kernbehauptung des Drift-Guards
> unabhängig nachgerechnet**: alle 63 `run-pipeline.sh`-Vorkommen in `run-tests.sh` wurden
> einzeln klassifiziert (s. „Positives" → Vollständigkeitsprobe), ebenso alle
> `PIPELINE`-Variablen-Vorkommen. Ergebnis: **genau 5 reale Aufrufstellen, alle gehärtet,
> keine sechste in einer vom Guard nicht erfassten Schreibweise.** Die Reichweiten-Aussagen
> des Guards wurden gegen `scripts/run-pipeline.sh` und `scripts/factory-poll.sh` geprüft.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] `scripts/checks/tests/run-tests.sh:3603–3604` (Negativ-Kontrolle C) **und**
      `docs/specs/spec-264-env-isolation-run-tests.md:34–35`: Die Begründung, mit der
      `--dry-run`-Aufrufe **dauerhaft** aus dem Drift-Guard ausgenommen werden, ist sachlich
      falsch. Beide Stellen behaupten, `run_skill()` kehre „**vor** der
      `PR_SHEPHERD`-Verzweigung (Phase 7)" zurück. Tatsächlich steht die Verzweigung in
      `run-pipeline.sh:483` **außerhalb** von `run_skill` und *ruft* `run_skill "pr-shepherd"`
      erst auf (`:486`). Ein geerbtes `PR_SHEPHERD=true` **betritt Phase 7 auch im Dry-Run**;
      `run_skill` kehrt lediglich in `:225–228` – korrekt: vor dem `skill_file`-Existenz-Check
      (`:230`) – ohne Abbruch zurück. **Beobachtbare Folge:** Ein Dry-Run-Aufruf gibt unter
      exportiertem `PR_SHEPHERD` drei zusätzliche Zeilen aus (`Phase 7: PR Shepherd …`,
      `→ Starte: /pr-shepherd …`, `[DRY-RUN] claude --print …`) und wechselt die Schlusszeile
      von „Nächster Schritt: Pull Request erstellen" auf „PR Shepherd wurde ausgeführt …"
      (`run-pipeline.sh:521–525`). Der Exit-Code bleibt 0.
      **Warum das mehr als ein Wortlaut-Fehler ist:** Der Guard nimmt auf Basis dieser
      Begründung **11 Aufrufstellen** unbefristet von der Härtung aus – und genau die
      Eigenschaft, die diese Task beseitigen soll („das Testergebnis hängt an der Env der
      aufrufenden Shell"), besteht dort in der **Ausgabe** fort. Heute bricht nichts: die
      Vollständigkeitsprobe zeigt, dass keine einzige Dry-Run-Assertion an diesen Zeilen
      hängt (kein Treffer auf `Phase 7` / `Nächster Schritt` / `PR Shepherd wurde ausgeführt`
      außerhalb des `#264`-Blocks selbst), und die beiden Abwesenheits-Assertions in
      `#261 AC2/AC3` (`:3161`, `:3172`) prüfen unbeteiligte Strings. Wer aber künftig eine
      Dry-Run-Assertion auf Ausgabe-Abwesenheit oder auf die Schlusszeile legt, baut sich
      einen unter exportiertem `PR_SHEPHERD` flakenden Test – und der Kommentar an der
      Ausnahme sagt ihm, das sei strukturell unmöglich. Das ist dieselbe Finding-Klasse wie
      W1 aus Runde 1 („WHY-Kommentar behauptet eine Kausalkette, die es nicht gibt"), nur an
      der Stelle, die als Einzige *nicht* nachgezogen wurde, und zugleich dieselbe Klasse wie
      W2 aus Runde 2 (im selben PR entstandene Spec-Prosa, die den Code falsch beschreibt →
      kodifizierte Regel aus #253).
      **Auflösung (2 Prosa-Stellen, keine Verhaltensänderung, keine Guard-Logik-Änderung):**
      Beide auf den tatsächlichen Grund umstellen – *„Der Dry-Run betritt Phase 7 zwar, bricht
      dort aber nicht ab (`run_skill` kehrt vor dem `skill_file`-Check zurück) und ändert nur
      die Ausgabe; keine Dry-Run-Assertion hängt an diesen Zeilen – deshalb bleibt die Ausnahme
      fail-open, statt 11 Aufrufstellen mitzuhärten."* Damit steht die **Bedingung** der
      Ausnahme am Code, und die nächste Person weiß, wann sie kippt. Optional (bewusst *nicht*
      gefordert – Scope/YAGNI): die Dry-Run-Ausnahme fallen lassen und alle 11 Stellen
      mithärten.

## Nitpicks (optional)

- [ ] `scripts/checks/tests/run-tests.sh:3564` (`audit_pipeline_calls`): Die Härtung wird per
      `cmd ~ /env -u PR_SHEPHERD -u FACTORY_STAGE/` **irgendwo** auf der logischen
      Kommandozeile gesucht, nicht in Präfix-Position vor dem Interpreter. Eine logische Zeile
      mit zwei Aufrufen (`x=$(env -u … bash "$P" 1); y=$(bash "$P" 2)`) meldet deshalb `OK`
      für beide. Rein theoretisch, weil die Datei durchgängig einen Aufruf je logischer Zeile
      schreibt – erwähnenswert nur, weil der Guard sonst konsequent fail-closed argumentiert.
      Kein Handlungsbedarf, solange die Ein-Aufruf-pro-Zeile-Konvention gilt.

- [ ] `scripts/checks/tests/run-tests.sh:3574–3600`: Die acht Guard-Kontrollen sind achtmal
      dasselbe Dreizeiler-Muster (`printf` → `audit_pipeline_calls` → `assert_exit`). Der
      Datei-Header nennt die Suite „tabellen-getrieben"; eine Tabelle
      `fixture|erwarteter_exit|label` mit einer Schleife wäre stilkonsistenter und macht eine
      neunte Kontrolle zu einer Datenzeile. **Bewusst nur Nitpick:** Lesson #240 warnt vor
      *zusätzlichen* Schleifen mit identischem Rumpf – hier wäre es eine Ersetzung, kein
      Nebeneinander; und der Umbau lohnt den Eingriff in dieser Iteration nicht.

- [ ] `scripts/checks/tests/run-tests.sh:3633–3638` (`#264 K1`-Doku-Regression): Abgesichert
      sind der **Fließtext** der Lesson (`Die Härtung ist in #264 umgesetzt`) und die
      Index-Zeile in `PROJECT-CONTEXT.md`. Die ebenfalls in Runde 1 korrigierte
      **Überschrift** der Lesson (`factory-workflow.md:827`, „… Härtung umgesetzt in #264")
      trägt keinen eigenen Guard – ein Edit könnte sie still auf „ausgelagert" zurückdrehen,
      während der Fließtext das Gegenteil sagt. Geringes Risiko (die widersprüchliche Prosa
      fiele beim Lesen auf), einzeilig zu schließen.

## Positives

- **Beide Findings aus Runde 2 sind sachlich geschlossen – nachgeprüft, nicht geglaubt.**
  - *W1 (Guard-Reichweite):* Die Erkennung ist tatsächlich von einem Literal auf eine
    Positions-Regel umgestellt (`:3550–3558`): `ref` fasst Dateiname **und** Pfad-Variable
    (`[$][{]?[A-Za-z_0-9]*PIPELINE…`), `interp` deckt `bash`/`sh` inkl. Flags, `direct` die
    Kommando-Position mit vorangestellten Env-Zuweisungen. Die Regexe wurden manuell gegen die
    kritischen Zeilen der Datei durchgespielt: `PIPELINE="$FACTORY_ROOT/scripts/run-pipeline.sh"`
    (`:181`), `sed -e 's/… || …/…/' "$PIPELINE" > "$MUT_PIPELINE"` (`:1122`, enthält `|` als
    potenziellen `direct`-Anker), `cp "$PIPELINE" …`, `grep -q … "$PIPELINE"`,
    `drift_guard … "$PIPELINE214"` und die `echo`-Überschrift `:3534` matchen **keines** der
    beiden Muster – die Lese-Kontexte fallen wie behauptet strukturell heraus, nicht über
    einen gepflegten Ausschluss-Katalog.
  - *W2 (Spec-Drift):* Die Spec nennt jetzt die fünfte Aufrufstelle („Ergänzt in der
    Umsetzung", `:44–48`), spricht im Scope von *jedem* realen Aufruf (`:57`), beschreibt den
    Drift-Guard als eigenes Artefakt inkl. Reichweiten-Grenze (`:71–80`) und trägt AK7
    (`:117–124`). Die Untergrenze `>= 5` ist damit gegen die Spec herleitbar; die Task-Datei
    spiegelt es.
  - *N1–N3:* `audit_pipeline_calls` (ehrlicher Name für die `OK`+`MISSING`-Ausgabe),
    Flag-Reihenfolge-Halbsatz (`:3546–3548`), eigene `echo`-Überschrift für `#264 K1` (`:3629`).
- **Vollständigkeitsprobe – die zentrale Behauptung des Guards hält.** Alle 63
  `run-pipeline.sh`-Vorkommen klassifiziert: Kommentare/Prosa, ~20 `grep`/`awk`-Lesezugriffe
  auf `$PIPELINE`, 2 Stub-Erzeugungen (`:491`, `:523`, `printf` → `factory-poll`-Tests),
  11 `--dry-run`-Aufrufe (`:169`, `:1153`, `:1166`, `:1218`, `:1224`, `:1242`, `:3151`,
  `:3158`, `:3165`, `:3175`, `:3184`) und **5 reale Aufrufe** (`:2631`, `:3407`, `:3455`,
  `:3469`, `:3492`) – jeder der fünf trägt `env -u PR_SHEPHERD -u FACTORY_STAGE`. Zusätzlich:
  **keine** der `PIPELINE`/`PIPELINE214`/`MUT_PIPELINE`-Verwendungen steht in
  Ausführungs-Position, d. h. die in Runde 2 befürchtete Schreibweise existiert real noch
  nicht – der erweiterte Guard ist Vorsorge, kein nachträglicher Flicken. Die Untergrenze
  `>= 5` ist damit exakt, nicht nur plausibel.
- **Die Reichweiten-Grenze im Guard-Kommentar (`:3529–3532`) stimmt.** Gegengeprüft:
  `scripts/factory-poll.sh` liest weder `PR_SHEPHERD` noch `FACTORY_STAGE` (kein einziger
  Treffer), und die realen `factory-poll.sh`-Aufrufe der Suite laufen gegen die
  `printf`-Stubs aus `:491`/`:523`. Der transitive Vektor ist also tatsächlich kein Leck, und
  die Bedingung, unter der er eines würde, steht am Code.
- **Fail-closed-Verhalten des Guards ist echt.** `audit_pipeline_calls` auf eine unlesbare
  Datei → `awk` Exit ≠ 0 → `assert_exit 0` rot; zusätzlich fängt die
  Nicht-Vakuitäts-Untergrenze (`:3620–3623`) den Leerlauf ab. `run-tests.sh` läuft mit
  `set -uo pipefail` **ohne** `-e` (`:16`) – das `cmd; assert_exit 0 "$?"`-Muster des Guards
  ist damit korrekt und bricht die Suite nicht vorzeitig ab.
- **Der Selbstreferenz-Fallstrick ist sauber gelöst.** `RP_NAME`/`PV_NAME` + `%s`
  (`:3540–3541`) sorgen dafür, dass keine Fixture-Zeile des Guards für ihn selbst wie eine
  Aufrufstelle aussieht; nachgeprüft, dass auch die `awk`-Programmzeile `:3550` ihr eigenes
  `pv`-Muster nicht matcht (`[$]` liefert kein `$`+`PIPELINE`-Paar).
- **Der Verhaltenstest bleibt der stärkere Beleg.** Der `export` innerhalb der
  Kommando-Substitutions-Subshell (`:3488`) erzeugt echte Divergenz (Lesson #253), ohne
  nachfolgende Blöcke zu maskieren – die bewusste Abweichung vom `unset`-Vorschlag der
  Task-Notizen ist begründet und richtig. Das diskriminierende Signal
  `Endzustand verifiziert (sauber, gepusht)` ist gegengeprüft: bei geerbtem `PR_SHEPHERD`
  schiebt `run-pipeline.sh:512–513` `, PR merge-ready/gemergt` vor die schließende Klammer,
  der Literal-String kann dann nicht matchen.
- **Der Guard steht außerhalb des `HAS_YQ`-Gates**, der Verhaltenstest innerhalb – mit
  `skip_yq`-Zweig (`:3506`). Der strukturelle Schutz hängt damit nicht an derselben
  Voraussetzung wie der Verhaltenstest. Richtige Aufteilung.
- **Prozess sauber:** kein ADR (gegen die vier Trigger aus Spec-002/ADR-002 geprüft), keine
  Routen-Änderung → `docs/routes.md` zu Recht unberührt, Lesson + Index + Spec + Task-Datei
  konsistent nachgezogen, `rm -rf`-Aufräumzeile hinter den neuen Block gezogen, CI setzt
  `PR_SHEPHERD`/`FACTORY_STAGE` nirgends (`factory-ci.yml:102` ruft die Suite blank auf).

## Empfehlung

APPROVED

> **Circuit Breaker (Iteration 3 von 3) – bewusste Einordnung, kein Durchwinken.**
> Alle sieben Akzeptanzkriterien sind erfüllt, und – anders als in den Vorrunden – die
> Kernbehauptung des Drift-Guards ist in diesem Review **unabhängig nachgerechnet** worden
> (5 reale Aufrufstellen, alle gehärtet, keine in einer nicht erfassten Schreibweise). Die
> Härtung selbst, ihr Verhaltensbeleg und ihr Regressionsschutz sind korrekt.
>
> Das verbleibende wichtige Finding ist **kein Verhaltens-, sondern ein Begründungsfehler**:
> zwei Prosa-Stellen erklären die Dry-Run-Ausnahme mit einer Kausalkette, die es so nicht
> gibt. Eine vierte `/implement`-Runde dafür wäre unverhältnismäßig und würde die
> Circuit-Breaker-Regel verletzen.
>
> **Auflage statt Rework-Runde:** Die Korrektur (2 Prosa-Stellen, keine Code-/Guard-Änderung)
> ist im laufenden PR mitzunehmen – im nächsten ohnehin anstehenden Schritt (`/test` oder
> `/refactor`), **vor** `/pr-shepherd`. Die Nitpicks sind optional und ausdrücklich nicht
> Teil der Auflage.
>
> Sollte sich bei der Umsetzung zeigen, dass die Korrektur doch eine Verhaltensänderung
> erfordert (z. B. weil man sich für das Mithärten der 11 Dry-Run-Stellen entscheidet), ist
> das ein eigener Task – dann eskalieren statt hier anhängen.
