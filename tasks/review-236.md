# Review: Task 236

> **Runde 4** (Backend/Logik · Code-Qualität · Architektur/Doku) gegen
> `git diff origin/main...HEAD` (HEAD = `52a1d11`). Volltext der Runden 1–3 steht in der
> Git-History dieser Datei.
>
> **Circuit-Breaker-Einordnung:** Runde 3 hatte mit „Iteration 3 von 3" an den Menschen
> eskaliert und ausdrücklich empfohlen, den **einen** verbliebenen Fix noch zuzulassen und
> danach **ohne vierten Vollreview** zu `/test` zu gehen. Dieser Durchlauf ist die vom Menschen
> angeforderte **gezielte Verifikation genau dieses Fixes** plus ein Regressions-Sweep über den
> Gesamtdiff – keine Neu-Eröffnung der Diskussion über bereits abgeschlossene Punkte. Es wurde
> kein Finding aus einer früheren Runde neu aufgerollt.
>
> Verifikationsbasis dieser Runde:
> - `bash scripts/checks/tests/run-tests.sh` eigenständig nachgefahren → **1029 grün / 0 rot**
>   (deckt sich mit der Rework-Notiz Runde 4).
> - `rm`/`cp`-Aufrufe in `start-work.sh` per Grep gezählt: `cp` genau 1× (`:237`), `rm` genau 1×
>   (`:251`) – die Prämisse des `rm`-PATH-Stub-Tests („trifft präzise die Aufräumzeile") ist
>   damit belegt, nicht nur behauptet.
> - Alle vier Zeilenanker gegen den HEAD-Stand nachgezählt: `worktree add`-Block `:208-218` ✓,
>   `pnpm install`-Block `:257-264` ✓, Warnzeile `:262` ✓, `kleinfunde.md` → `:208` ✓.
> - `.gitignore`/`git add`-Scope gegengeprüft (`start-work.sh:340` addet ausschließlich
>   `"$TASK_FILE"`) – die dismissed Runde-1-Sorge „kopierte Datei gerät in einen Commit" ist
>   strukturell ausgeschlossen, die Einordnung hält.
> - Repo-Sweep auf verbliebene „Haupt-Baum"-Sprachregelung und auf Prosa, die das Kopieren im
>   Präsens als manuellen Schritt beschreibt.
> - Zeilenlängen der geänderten Doku-Absätze geprüft (Nitpick Runde 3).

## Kritische Findings (müssen behoben werden)

_Keine._

Das einzige kritische Finding aus Runde 3 (`set -e`-Regression in der Aufräumzeile) ist behoben –
und zwar über **beide** dort vorgeschlagenen Wege, die unterschiedliche Fälle decken:

- **(a) `rm -f "$WORKDIR/.env.local" 2>/dev/null || true`** (`start-work.sh:251`). Die Zeile steht
  in keiner Bedingung; `rm -f` unterdrückt nur `ENOENT`, nicht `ENOTDIR`/`EACCES`. Das `|| true`
  ist damit die einzige Absicherung gegen den wortlosen Abbruch, den Fehlerszenario 1 der Spec
  verbietet.
- **(b) `[ -d "$WORKDIR" ]` in der Eintritts-Bedingung** (`:229`). Liegt am Worktree-Pfad eine
  reguläre Datei, wird der Block gar nicht erst betreten – der Kopier-Schritt kann den
  Abbruchpunkt des Skripts nicht nach vorne ziehen.

Nachgeprüft, dass der Block danach **keinen** unabgesicherten Befehl mehr enthält: alle vier
Nicht-`echo`-Kommandos stehen entweder in einer `if`/`elif`-Bedingung (`[ -e ]`/`[ -L ]`,
`cp -p`) oder sind explizit abgesichert (`rm … || true`); `ENV_COPIED=true` kann nicht fehlschlagen.

Die Spec-Behauptung zum Restverhalten ist korrekt: dass der Lauf bei einer regulären Datei am
Worktree-Pfad später in Schritt 3 (`mkdir -p "$WORKDIR/tasks"`, `:299`) scheitert, ist
vorbestehendes #74-Verhalten – der Zweig `:210` kennt keinen Nicht-Verzeichnis-Pfad, und
`[[ -f "$TASK_FILE" ]]` liefert dort `false`. Der PR verschlechtert diesen Pfad nicht, er stellt
den Vor-PR-Zustand wieder her.

## Wichtige Findings (sollten behoben werden)

_Keine._

Die sieben neuen Assertions der Runde 4 sind Verhaltenstests, keine Wiring-Greps, und beide
Szenarien diskriminieren gegen genau einen der beiden Fix-Wege:

- **Reguläre Datei am Worktree-Pfad** – ohne Weg (b) erschienen die rohen `cp: `/`rm: `-Zeilen und
  die Ankündigungszeile; ohne Weg (a) endete der Lauf vor `3/5`. Der Referenzpunkt ist bewusst
  „Schritt 3 wird erreicht" statt `Bereit!`, weil Schritt 3 aus vorbestehenden Gründen scheitert –
  gemessen wird nur, dass der Kopier-Block den Abbruchpunkt nicht vorzieht. Die
  Abwesenheits-Anker liegen auf den Kommando-Präfixen `cp: `/`rm: ` statt auf `Not a directory`,
  das auch das vorbestehende `mkdir -p` erzeugt – die Assertion wäre sonst aus dem falschen Grund
  rot (Lesson #214).
- **`cp`-Stub + `rm`-Stub kombiniert** – ohne den `cp`-Stub würde die Aufräumzeile nie erreicht;
  die Kombination ist also nicht redundant, sondern notwendig. Der RED-Beleg der Rework-Notiz
  (1022 grün / 7 rot, Aufräum-Fall mit „erwartet exit=0, war 1") passt exakt zum Fehlerbild des
  Findings.
- Beide Szenarien tragen einen **Existenz-Anker** vor den Abwesenheits-Assertions
  (`[ -f "$WT_NOTDIR_BASE/feature-791-demo-notdir" ]`, `assert_exit 0`), so dass ein geändertes
  Slug-Schema oder ein vorzeitiger Abbruch den Testfall nicht lautlos entwertet.

## Nitpicks (optional)

- [ ] `scripts/start-work.sh:251` · Das `2>/dev/null` auf der Aufräumzeile ist durch keinen Test
      gepinnt. Der `rm`-Stub schreibt nichts nach stderr, und im Nicht-Verzeichnis-Fall wird die
      Zeile dank Weg (b) gar nicht erreicht – ein Entfernen der Umleitung bliebe grün. Zugleich
      steht sie in leichter Spannung zur in Runde 3 festgehaltenen Begründung für das `cp`
      daneben („die Rohzeile nennt die Ursache, die eigene Warnung nur die Folge"): beim
      Aufräumen wird genau diese Ursache verworfen. Beides ist rein diagnostisch, kein
      Verhaltensunterschied – deshalb Nitpick, nicht mehr. Wer es angleichen will: entweder
      `2>/dev/null` streichen (Symmetrie zum `cp`) oder eine Assertion auf die Abwesenheit von
      `rm: ` im `rm`-Stub-Szenario ergänzen (Stub müsste dann nach stderr schreiben).
- [ ] **Übernommen aus Runde 2/3, bewusst offen** (Einordnung unverändert bestätigt – reine
      Test-Hygiene ohne Verhaltensbezug, Kandidaten für den `/refactor`-Pass, nicht für diesen PR):
      Rename `flat_286`/`assert_contains_286` (`run-tests.sh:50-73`, Aufrufstellen überwiegend im
      Fremdblock #286); `set_env_source`-Setter für die mehrfach umgebaute Quell-Fixture;
      Zusammenlegen der drei Env-Prologe.

## Positives

- **Der kritische Fix ist minimal und trifft die Ursache.** Zwei Zeilen Code, keine Umstrukturierung
  des Blocks, kein neues Verhalten in den bereits abgenommenen Pfaden. Dass beide vom Review
  vorgeschlagenen Wege umgesetzt wurden, ist hier kein Gold-Plating: (a) deckt jeden künftigen
  `rm`-Fehlerfall (`EACCES` auf einem schreibgeschützten Zielverzeichnis), (b) deckt den konkret
  reproduzierten `ENOTDIR`-Fall **und** erledigt den Runde-3-Nitpick zur rohen `cp:`-Zeile für
  dessen auffälligste Ausprägung.
- **Die WHY-Kommentare sind ehrlich und prüfbar.** Beide neuen Blöcke benennen die Kausalkette
  („`rm -f` unterdrückt nur `ENOENT`", „ohne diesen Guard wäre der Kopier-Block der neue,
  frühere Abbruchpunkt") statt das WAS zu wiederholen – und keine Aussage darin ist eine
  unbelegte „empirisch verifiziert"-Behauptung (Lessons #268/#264/#284 eingehalten).
- **Die `rm`-Stub-Prämisse ist belastbar:** `start-work.sh` ruft `rm` an genau einer Stelle auf.
  Der Stub trifft damit präzise die Aufräumzeile – und bleibt fail-closed, falls später an
  anderer Stelle ein `rm` hinzukommt.
- **Fehlerszenario-Abdeckung ist jetzt vollständig gegen die Spec:** unlesbare Quelle,
  `cp`-Teilabbruch (mit Reparierbarkeits-Diskriminierung über einen Folgelauf), fehlgeschlagenes
  Aufräumen, Nicht-Verzeichnis am Worktree-Pfad, Quelle als Verzeichnis, Quelle als defekter
  Symlink, Quelle als Symlink-auf-Datei. Jeder Fall endet mit `exit 0` und einer Warnung –
  Fehlerszenario 1 („Warnung, kein Abbruch") ist damit über alle bekannten Auslöser assertiert,
  nicht nur über den erstgenannten.
- **Spec und Task-Datei sind mit dem Code mitgewandert**, nicht nachträglich zurechtgebogen: die
  Nicht-Verzeichnis-Ausnahme und „die Absicherung gilt für **jeden** Befehl des Blocks, auch für
  das Aufräumen selbst" stehen jetzt normativ in der Spec (`:103-115`) und gespiegelt in den
  Task-Fehlerszenarien. Der #253-Drift-Check auf die im selben PR entstandene Spec ist damit
  erfüllt.
- **Zeilenanker nach dem Verschieben nachgezählt statt fortgeschrieben:** `pnpm install`-Block
  `:249-257` → `:257-264` und die Warnzeile `:255` → `:262` sind in Spec **und** Task-Datei
  korrigiert; `:208-218` und der `kleinfunde.md`-Anker `:208` sind unverändert korrekt. Alle vier
  in dieser Runde unabhängig gegengezählt.
- **Der Runde-3-Nitpick zur Sprachregelung ist vollständig abgeräumt:** der Repo-Sweep findet
  „Haupt-Baum" nur noch dort, wo es sachlich stimmt (In-Place-Modus; `.env.int`/`.env.prd`
  bleiben im Haupt-Baum; „in dieser Fixture zugleich der Haupt-Baum"; das historische
  #74-Narrativ). Keine Stelle behauptet mehr, die Kopier-**Quelle** sei per se der Haupt-Baum.
- **Lesson-Reflow ist regelkonform ausgeführt:** die Zeile ist auf ~100 Spalten umbrochen, und der
  Umbruch ist gefahrlos, weil die Fixed-String-Anker dieses PRs über `flat_286` laufen –
  genau die Abwägung, die Lesson #240/#249/#286 verlangt. Im geänderten Absatz
  (`factory-workflow.md:736-759`) liegt keine Zeile mehr über 105 Zeichen.
- **Architektur unverändert tragfähig:** `start-work.sh` bleibt reine Arbeitsbaum-Vorbereitung
  (Worktree → Env-Datei → `pnpm install`); `db:seed` bleibt Hinweis ohne DB-Seiteneffekt; kein
  ADR beschreibt den Mechanismus; keine Datei unter `app/` im Diff → `docs/routes.md` korrekt
  nicht betroffen (#145). Least Privilege gehalten: nur `.env.local`, Modus über `cp -p`
  erhalten, `git add` weiterhin ausschließlich auf der Task-Datei.

## Out-of-Scope-Findings

Unverändert gegenüber Runde 2/3, **kein neuer Fund**: der `#74`-Fund „`start-work.sh` erkennt
einen wiederverwendeten Worktree nicht hinter einem Pfad-Symlink" liegt als Eintrag in
[`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md) (Anker `:208`, in dieser Runde
erneut gegengezählt; die dortigen Verweise auf `:209`/`:210`/`:211` stimmen mit dem HEAD-Stand
überein). Klassifikation bestätigt: vorbestehend, kein Sicherheitsrisiko, kein funktionaler
Defekt (beide Zweige sind reine `echo`-Zweige) → Sammeldatei, kein Issue. Der #291-Drift-Check
auf den im selben PR angelegten `kleinfunde.md`-Eintrag ist damit auch nach Runde 4 erfüllt.

## Empfehlung

APPROVED

Begründung: Das einzige kritische Finding der Runde 3 ist behoben, der Fix ist gegen beide
Fehlerpfade getestet (RED-Beleg dokumentiert und plausibel), und der Regressions-Sweep über den
Gesamtdiff findet weder in Logik noch in Testqualität, Doku-Drift oder Architektur einen
Handlungsbedarf oberhalb der Nitpick-Schwelle. Die Findings-Kurve über vier Runden ist monoton:
**8 → 5 → 0 wichtige (1 kritisch) → 0/0**. Suite eigenständig nachgefahren: **1029 grün / 0 rot**.

Nächster Schritt: `/test 236`. Die beiden offenen Nitpicks sind nicht merge-blockierend – der
erste ist rein diagnostisch, der zweite ist bewusst dem `/refactor`-Pass zugeordnet.
