# Review: Task 236

> **Runde 3** (Backend/Logik · Code-Qualität · Architektur/Doku) gegen
> `git diff origin/main...HEAD`. Alle **fünf** wichtigen Findings aus Runde 2 sind einzeln
> gegengeprüft und substanziell behoben (Details unter „Positives"); Volltext der Runden 1 und 2
> steht in der Git-History dieser Datei.
>
> **Circuit Breaker: Iteration 3 von 3 erreicht** – siehe „Empfehlung". Der neue kritische Fund
> ist keine offene Meinungsdifferenz, sondern eine **Regression, die der Runde-2-Fix selbst
> eingeführt hat** (ein `rm -f` ohne `set -e`-Absicherung). Er ist mit einer Zeile plus einem
> Testfall geschlossen.
>
> Verifikationsbasis dieser Runde:
> - `bash scripts/checks/tests/run-tests.sh` eigenständig nachgefahren → **1020 grün / 0 rot**,
>   exit 0 (deckt sich mit der Rework-Notiz).
> - Ende-zu-Ende-Repro des kritischen Funds gegen das **echte** `start-work.sh` (Wegwerf-Repo +
>   `gh`-Stub, Fixture-Mechanik des #74-Blocks) – Ausgabe unten im Finding zitiert.
> - Zeilenanker der Doku gegen den HEAD-Stand nachgezählt (`start-work.sh:208-218`, `:249-257`,
>   `:255`, `kleinfunde.md` → `:208`) – **alle vier korrekt**.
> - Alt-Wortlaut über `git diff origin/main...HEAD` gegengelesen (Positiv-Kontrollen AK9).
> - Repo-Sweep auf verbliebene „`.env.local` manuell kopieren"-Prosa.

## Kritische Findings (müssen behoben werden)

- [x] **`scripts/start-work.sh:244` · Das neu eingefügte `rm -f "$WORKDIR/.env.local"` bricht
      `start-work.sh` unter `set -euo pipefail` **wortlos** ab, wenn `$WORKDIR` kein Verzeichnis
      ist – genau der Abbruch, den Fehlerszenario 1 der Spec ausdrücklich verbietet.**

      `rm -f` unterdrückt nur `ENOENT`, **nicht** `ENOTDIR`. Existiert am Worktree-Pfad eine
      reguläre Datei, läuft das Skript in den Wiederverwendungs-Zweig `:210` („Pfad existiert
      bereits (kein Worktree) – wird wiederverwendet"), `cp -p` scheitert mit `ENOTDIR` (harmlos,
      steht in der `elif`-Bedingung) – und dann scheitert auch `rm -f` mit `ENOTDIR`. Diese Zeile
      steht **nicht** in einer Bedingung, also greift `set -e`: Abbruch mit exit 1, **ohne** die
      Warnzeile, **ohne** Abschluss-Output, ohne Task-Datei, ohne Draft-PR.

      Ende-zu-Ende reproduziert gegen das echte Skript (Wegwerf-Repo, `gh`-Stub,
      `FACTORY_WORKTREE_BASE`; am Zielpfad eine reguläre Datei):

      ```
      === exit-code: 1 ===
      2/5  Lege Worktree an: …/wt/feature-799-demo-file
        ⚠  Pfad existiert bereits (kein Worktree) – wird wiederverwendet
        →  .env.local in den Worktree spiegeln (FACTORY_WT_SKIP_ENV=1 überspringt)...
      cp: …/wt/feature-799-demo-file/.env.local: Not a directory
      rm: …/wt/feature-799-demo-file/.env.local: Not a directory
      === Marker-Prüfungen ===
      WARNUNG-ZEILE: FEHLT
      ABSCHLUSS-OUTPUT: NICHT erreicht
      ```

      **Regression durch diesen PR, nicht vorbestehend:** vor dem Runde-2-Fix führte derselbe
      Zustand nur in den `else`-Zweig mit Warnung und lief weiter. Das `rm -f` war der Fix für
      Runde-2-Finding 5 – er hat den dort geschützten Fall geschlossen und einen neuen geöffnet.
      Die Spec ist an dieser Stelle unmissverständlich: „der Kopierbefehl muss abgesichert sein
      und darf das Skript nicht wortlos beenden" (`spec-236…md:100-101`).

      Der Zustand ist reproduzierbar herstellbar (`touch "$WT_BASE/<branch-slug>"`) und der
      Zweig `:210` behandelt ihn explizit als gültigen Ablauf – also kein hypothetischer Zustand,
      sondern ein funktionaler Defekt im Pfad, den dieser PR anlegt → Merge-Blocker (Schwellen-
      Tabelle `git-workflow.md`, Zeile 1), kein Sammeldatei-Eintrag.

      → Zwei sich ergänzende Wege, beide klein:
      (a) die Aufräumzeile `set -e`-fest machen: `rm -f "$WORKDIR/.env.local" 2>/dev/null || true`
      – konsistent mit dem Prinzip „jeder Pfad dieses Blocks warnt, keiner bricht ab";
      (b) zusätzlich `[ -d "$WORKDIR" ]` in die Eintritts-Bedingung `:225` aufnehmen – dann wird
      der Block bei einem Nicht-Verzeichnis gar nicht erst betreten und die rohe
      `cp:`-stderr-Zeile entfällt ebenfalls.
      **Test dazu ist Pflicht** (RED zuerst): reguläre Datei am Worktree-Pfad anlegen, dann
      `assert_exit 0` + `grep 'Bereit!'` + Warnzeile. Die vorhandenen Kopier-Fehlerfälle deckt
      das nicht ab – „unlesbare Quelle" scheitert am `open()` der Quelle und der `cp`-PATH-Stub
      (`run-tests.sh:2143-2160`) arbeitet in einem gültigen Zielverzeichnis; in beiden Fällen ist
      `rm -f` erfolgreich und die Lücke bleibt unsichtbar.

## Wichtige Findings (sollten behoben werden)

_Keine._ Die fünf wichtigen Findings aus Runde 2 sind alle behoben (siehe „Positives"); über den
kritischen Fund hinaus hat diese Runde in Logik, Testqualität, Doku-Drift und Architektur keinen
weiteren Handlungsbedarf oberhalb der Nitpick-Schwelle gefunden.

## Nitpicks (optional)

- [x] `scripts/start-work.sh:233` · `cp -p` leitet stderr nicht um, während der strukturell
      gleiche `pnpm install`-Block (`:252`) sein `>/dev/null 2>&1` mitbringt. Im Fehlerfall
      erscheint deshalb erst eine rohe `cp: …`-Zeile und danach die eigene, formatierte Warnung
      („konnte nicht kopiert werden"). Diagnostisch ist die Rohzeile eher nützlich als schädlich –
      deshalb Nitpick; bei Umsetzung von Weg (b) des kritischen Funds erledigt sich der
      auffälligste Fall ohnehin.
      → Erledigt über Weg (b): bei einem Nicht-Verzeichnis wird der Block nicht mehr betreten,
      die rohe `cp:`-Zeile entfällt (per Assertion gepinnt). Für die übrigen Fehlerfälle bleibt
      stderr bewusst sichtbar – die Rohzeile nennt die Ursache, die eigene Warnung nur die Folge.
- [x] `docs/factory/lessons/factory-workflow.md:744` · Die Zeile ist mit ~130 Zeichen nicht
      umbrochen und fällt aus dem ~100-Spalten-Stil der Datei (der Rest des Absatzes hält ihn).
      Entstanden beim Einziehen der Kausalbrücke in Runde 3. **Beim Umbrechen die Lesson-Regel
      beachten:** die Fixed-String-Anker dieses PRs laufen über `flat_286` und sind
      umbruch-tolerant, ein Reflow ist hier also gefahrlos – die Vorsicht gilt nur für
      zeilengebundene Anker.
- [x] `scripts/checks/tests/run-tests.sh:1984` (und der Kommentar `:1994`) · Die
      Assertion-Beschreibung sagt weiter „fehlende `.env.local` im **Haupt-Baum**", während
      Runde 2 die Terminologie repo-weit auf „**Quellbaum** (`$FACTORY_DIR`)" gezogen hat. In der
      Fixture stimmen beide (`FACTORY_DIR="$REPO_SW"` ist dort der Haupt-Baum), die Aussage ist
      also nicht falsch – aber sie ist die letzte Stelle im PR, die die alte Sprachregelung führt,
      und Testbeschreibungen sind das, was ein Nachfolger als Vertrag liest.
- [ ] **Übernommen aus Runde 2, bewusst offen** (Einordnung dort bestätigt – reine Test-Hygiene
      ohne Verhaltensbezug, Kandidaten für den `/refactor`-Pass, nicht für diesen PR):
      Rename `flat_286`/`assert_contains_286` (`:50-58`, 25 Aufrufstellen im Fremdblock #286);
      `set_env_source`-Setter für die siebenfach umgebaute Quell-Fixture (`:1980-2098`);
      Zusammenlegen der drei Env-Prologe (`:1899-1906` / `:1957-1962` / `:2120-2122`);
      Reihenfolge-Guard vergleicht Textpositionen (`:2181-2184`, vom Review selbst als
      „ausreichend und fail-closed" bewertet).

## Positives

- **Alle fünf wichtigen Findings aus Runde 2 sind einzeln nachgeprüft und substanziell behoben:**
  - *Quelle der Kopie*: `git-workflow.md:315-319`, die Lesson-Regel (`:756-758`), Spec-Scope
    (`:31-33`) und AK1/AK2/AK4/AK5 sowie die Task-AKs sagen jetzt geschlossen „der Baum, in dem
    `start-work.sh` liegt (`$FACTORY_DIR`) – üblicherweise, aber nicht zwingend der Haupt-Baum",
    inklusive der praktisch wichtigen Konsequenz („startet man aus einem Worktree ohne eigene
    `.env.local`, wird nichts kopiert"). Der Widerspruch zum Code ist damit aufgelöst – und zwar
    in der Richtung, die die Spec-Entscheidung nicht umschreibt.
  - *Falsche empirische Behauptung*: gegen den Alt-Stand gegengelesen – die Lesson-Stelle **war**
    über zwei Zeilen umbrochen (`ist als eigener Task ausgelagert:` / `[#236](…)`), die
    PROJECT-CONTEXT-Zeile stand **einzeilig**. Genau das steht jetzt im Kommentar
    (`run-tests.sh:2206-2210`), die Fixtures geben beide Wortlaute wortgetreu wieder, und die
    zweite Kontrolle ist ehrlich als reiner Quoting-/Fixed-String-Beleg deklariert statt als
    Umbruch-Beweis. Die Korrektur ist genau die von Lesson #268/#284 verlangte.
  - *AK9(d)-Fail-open*: der Zeilenzahl-Beleg (`:2194-2195`) plus der Anker auf die Kommentarform
    (`^#   FACTORY_WT_SKIP_ENV=1`) schließt das #255-Muster in Fail-open-Richtung – ein geänderter
    `awk`-Sentinel macht den Guard jetzt rot, statt still auf den Produktionscode durchzugreifen.
  - *Veraltete Task-Behauptungen*: alle vier nachgezogen – `:206` → `:208` (auch in
    `kleinfunde.md`), `cut -c2-10` → `ls_mode_matches`, Assertion-Zählung entfernt statt falsch
    fortgeschrieben, `ENV_COPIED`-Kausalkette auf „kein Zweig erreicht die Zuweisung garantiert"
    verallgemeinert. Der Out-of-Scope-Fund trägt jetzt die getroffene Klassifikation.
  - *`cp`-Teilabbruch*: Aufräumen implementiert **und** mit einem echten Verhaltenstest belegt –
    der `cp`-PATH-Stub stellt „Ziel angelegt, Inhalt unvollständig, exit 1" her, und die
    Diskriminierung über einen Folgelauf mit echtem `cp` beweist, dass der Zustand reparierbar
    bleibt statt vom AK3-Guard eingefroren zu werden. Methodisch die stärkste Änderung dieser
    Runde. (Dass genau diese Zeile den kritischen Fund oben mitbringt, ändert nichts an der
    Qualität des Ansatzes – nur die Absicherung der Aufräumzeile selbst fehlt.)
- **`assert_absent` ist die richtige Antwort auf den Runde-2-Nitpick:** neun kryptische
  `assert_true "$([ $? -ne 0 ]; echo $?)"`-Stellen sind auf einen sprechenden Aufruf verdichtet,
  die `$?`-Subtilität ist einmal am Helper dokumentiert statt an jeder Aufrufstelle neu zu
  entziffern – Spiegel-Symmetrie zu `assert_contains_286`, kein neues Idiom.
- **Die übrigen zehn umgesetzten Nitpicks halten der Nachprüfung stand:** `flat_286` squeezt jetzt
  Leerzeichen (Umbruch-Toleranz gilt auch für die 2-Space-Continuation, den dominanten Stil dieser
  Doku); die AK5-Diskriminierung läuft unter `umask 022` und ist damit umgebungsunabhängig; AK3
  belegt „unverändert" byte-genau per `cmp -s` gegen eine Referenzdatei; die beiden Symlink-Tests
  haben eigene Sentinel-Pfade (keine geteilte Fehlerquelle mehr); `env "${@:4}"` beseitigt die
  Pathname-Expansion; AK9(c) ankert über `flat_286` auf die Env-Schalter-**Liste** statt file-weit
  auf ein Einzelwort.
- **Zeilenanker sind diesmal alle korrekt** – nachgezählt: `start-work.sh:208-218` ist der
  `worktree add`-Block, `:249-257` der `pnpm install`-Block, `:255` die
  „pnpm install fehlgeschlagen"-Warnung (das Vorbild des Fehlerszenarios), `kleinfunde.md:164`
  zeigt auf den exakten String-Vergleich. Der #291-Drift-Check auf den eigenen
  `kleinfunde.md`-Eintrag ist damit erfüllt.
- **Doku-Sweep sauber:** repo-weit keine Prosa mehr, die das Kopieren im Präsens als manuellen
  Schritt vorschreibt; `tasks/codify-228.md` und `task-228…md` sind historische Protokolle
  (korrekt unangetastet), `README`/`CONTRIBUTING`/`OPERATING` betreffen das Frisch-Clone-Setup
  (`cp .env.example .env.local`), nicht den Worktree-Fall.
- **Suite eigenständig nachgefahren: 1020 grün / 0 rot, exit 0** – die Zahl in der Rework-Notiz
  ist belastbar, kein vorbestehender Fehlschlag, keine Reihenfolge-Abhängigkeit sichtbar.
- **Scope-Disziplin:** die drei bewusst nicht umgesetzten Nitpicks sind mit Begründung
  dokumentiert statt still abgehakt (CLAUDE.md Regel 5); der Out-of-Scope-Fund (#74-Symlink) ist
  klassifiziert, in `kleinfunde.md` abgelegt und **nicht** mitgefixt. Kein Gold-Plating.
- **Architektur unverändert tragfähig:** `start-work.sh` bleibt reine Arbeitsbaum-Vorbereitung
  (Worktree → Env-Datei → `pnpm install`), `db:seed` bleibt Hinweis ohne DB-Seiteneffekt; kein
  ADR beschreibt den Mechanismus (die Einordnung „kein ADR-Trigger" hält); keine Datei unter
  `app/` im Diff → `docs/routes.md` korrekt nicht betroffen (#145).

## Out-of-Scope-Findings

Unverändert gegenüber Runde 2, kein neuer Fund: der `#74`-Fund „`start-work.sh` erkennt einen
wiederverwendeten Worktree nicht hinter einem Pfad-Symlink" liegt als Eintrag in
[`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md) (Anker `:208`, in dieser Runde
nachgeprüft). Klassifikation bestätigt: vorbestehend, kein Sicherheitsrisiko, kein funktionaler
Defekt (beide Zweige sind reine `echo`-Zweige) → Sammeldatei, kein Issue.

> Randnotiz: der kritische Fund oben läuft **durch** genau diesen Zweig (`:210`), ist aber
> unabhängig davon – er greift bei jedem Nicht-Verzeichnis am Worktree-Pfad, egal welche der
> beiden Wiederverwendungs-Meldungen erscheint.

## Empfehlung

NEEDS_REWORK (Runde 3) – **Circuit Breaker erreicht: Iteration 3 von 3.**

Nach `CLAUDE.md` („max. 3 Review↔Implement-Iterationen, dann eskalieren") wird hier **nicht**
weiter automatisch iteriert. Die Eskalation geht an den Menschen mit folgendem Bild:

- **Kein ungelöster Konflikt, keine Findings-Spirale.** Die Findings konvergieren monoton:
  Runde 1 → 8 wichtige, Runde 2 → 5 wichtige, Runde 3 → **0 wichtige, 1 kritisches**. Das
  kritische Finding ist keine neue Meinung über alten Code, sondern eine `set -e`-Regression in
  der Zeile, die Runde 2 angefordert hat.
- **Restaufwand: eine Zeile plus ein Testfall** (`rm -f … 2>/dev/null || true`, optional
  zusätzlich `[ -d "$WORKDIR" ]` in der Eintritts-Bedingung; RED-Test mit einer regulären Datei
  am Worktree-Pfad).
- **Empfohlene Entscheidung:** diesen einen Fix noch zulassen (fachlich `/implement`-Rework
  Runde 4, formal per menschlicher Freigabe des Circuit Breakers), danach ohne weiteren
  Review-Durchlauf zu `/test`. Ein vierter Vollreview ist nach dem Befund dieser Runde nicht
  begründbar – wohl aber die gezielte Verifikation des einen Fixes durch `/test`.
- **Nicht empfohlen:** Merge ohne den Fix. Der Abbruchpfad hinterlässt einen halb angelegten
  Task-Zustand (Issue existiert, Worktree/Task-Datei/PR nicht) und ist damit schlechter als das
  Verhalten vor diesem PR.
