# Review: Task 315

> **Runde 2** (nach dem Rework zu Runde 1). Gegenstand: Arbeitsbaum-Stand vom 2026-08-27
> (5 geänderte Dateien, **weiter unkommittiert**) + `tasks/patch-315.diff`. Spec:
> `docs/specs/spec-315-factory-pipeline-label-dokumentieren.md`.
> Drei Runden (Backend/Logik · Code-Qualität · Architektur/Patterns) im Orchestrator-Kontext
> gefahren – ohne Fork-Delegation (Lesson #298/#267).
>
> Verifikationsbasis dieser Runde:
> - Vollständiger Suite-Lauf ohne exportierte `PR_SHEPHERD`/`FACTORY_STAGE` (Lesson #262):
>   **1242 grün, 4 rot** – die vier roten sind ausschließlich die `.claude/**`-Assertions.
> - `grep -c factory-pipeline` auf allen drei `.claude/commands/*.md` → **0** (Patch nicht angewandt).
> - Repo-weiter Scan nach dem alten Namen: nur `tasks/task-315-*` und `docs/specs/spec-315-*`.
> - Vollständigkeits-Gegenprobe des Sweeps: `grep -rn 'Aspekt'` + `grep -rn 'tech-debt'` über
>   alle `*.md`/`*.sh`/`*.yml` – keine unbehandelte Present-Tense-Aufzählung mehr (Details unten).
> - `origin/docs/315-…` steht auf `2436a94` (Spec-Commit), CI-Wiring bestätigt
>   (`.github/workflows/factory-ci.yml:96`).
>
> **Status der Runde-1-Findings:** K3, W1, W2, W3, N1–N5 sind behoben und nachgeprüft.
> K1 und K2 sind unverändert offen; alle übrigen Findings unten sind **neu**.

## Kritische Findings (müssen behoben werden)

- [ ] **`.claude/commands/{codify,review,security-review}.md` (AK8) – unverändert: der Patch ist
      nicht angewandt, Suite und CI sind rot.** (Carry-over K1 aus Runde 1.) Gemessen:
      `factory-pipeline` kommt in allen drei Dateien 0× vor; die Suite meldet genau vier rote
      Assertions (`#315 AK9` ×3 Bindungs-Checks + `#315 AK9` Mutations-Grip für
      `security-review.md`, dessen Anker erst durch den Patch entsteht). CI führt die Suite
      direkt aus → PR nicht mergefähig.
      **Wichtig für die Pipeline-Steuerung: das ist kein `/implement`-Rework.** `.claude/**` ist
      für den Agenten hard denied (#88-Grenze) – eine weitere Iteration von `/implement` kann
      dieses Finding strukturell nicht schließen. Erforderlich ist die **menschliche** Aktion:
      ```bash
      git apply tasks/patch-315.diff
      ```
      Der Patch ist inhaltlich gegengelesen: die drei erzeugten Phrasen entsprechen exakt
      `LABEL_DOC_PHRASES_315[4..6]`, der neue `security-review.md`-Satz enthält den Anker
      `LABEL_DOC_ANCHORS_315[6]`. Nach dem Apply werden die vier Assertions grün. Danach: AK8
      auf `[x]`, Blocker-Absatz als erledigt markieren, `tasks/patch-315.diff` löschen – alles
      **auf dem Branch vor** `/pr-shepherd` (Lesson #63/#145).

- [ ] **Die Implementierung liegt weiterhin unkommittiert im Worktree.** (Carry-over K2.)
      `git diff origin/main...HEAD` enthält nur Spec + Task-Datei; der Remote-Branch steht
      unverändert auf dem Spec-Commit. Alle Folge-Skills (`/test`, `/refactor`,
      `/security-review`) beziehen ihren Diff-Scope aus `origin/main...HEAD` und würden einen
      **leeren Diff** sehen – exakt der in Lesson #251 codifizierte Fehler. Vor `/test`
      committen und pushen (sinnvollerweise gemeinsam mit dem Apply aus dem Finding oben,
      damit der erste gepushte Stand grün ist).

## Wichtige Findings (sollten behoben werden)

- [ ] **`docs/specs/spec-315-…md:78-114` (AK3, AK10) – die Spec ist beim Rework nicht mitgezogen worden;
      zwei im Code fest verankerte Mechaniken stehen in keinem Anforderungsdokument.**
      Der Rework hat zwei Entscheidungen ergänzt, die die Spec nicht kennt:
      1. **AK10-Allowlist.** Die Spec sagt unbedingt „schlägt fehl, sobald der alte Name in
         einer **getrackten** Datei auftaucht". Der Guard nimmt aber zwei Pfadspecs aus
         (`docs/specs/spec-315-*`, `tasks/*315*`) – wörtlich gelesen müsste die Suite rot sein,
         denn die Spec selbst ist getrackt und nennt den alten Namen. Die Begründung existiert
         nur im WHY-Kommentar von `run-tests.sh` und in der Task-Datei.
      2. **Zweifelsregel „Im Zweifel Label setzen"** samt der Liste der ungedeckten Pfade
         (Repo-Wurzel, `docs/adr/`, `tasks/`, `e2e/`). AK3 der Spec fordert nur die Pfad-Anker
         beider Seiten. In `run-tests.sh` hängen daran inzwischen **zwei** Assertions
         (`#315 AK3: der Mischfall ist einseitig fail-safe aufgelöst` und
         `… benennt die von beiden Anker-Listen ungedeckten Pfade`) – Tests, die einen nirgends
         niedergeschriebenen Sollzustand pinnen.
      Das ist genau das Muster aus Lesson #253 (im selben PR entstandene Spec braucht denselben
      Drift-Check wie eine ADR) und #211/#176 (der PR ändert die Mechanik → dieselbe Prosa im
      selben PR nachziehen). Fix: AK3 um die Zweifelsregel und AK10 um den Allowlist-Satz
      ergänzen – zwei Sätze, keine Umstrukturierung.

- [ ] **`CONTRIBUTING.md:88-89` – der neue Bullet dupliziert die Factory-Pfad-Anker aus der
      kanonischen Quelle, ungeschützt gegen Drift.** Die Zeile führt
      `` (`scripts/`, `.claude/`, `.github/workflows/`, `docs/factory/`) `` wörtlich zum
      zweiten Mal – die einzige Kopie dieser Liste außerhalb von `git-workflow.md`. Der neue
      Guard deckt sie **nicht** ab: für `CONTRIBUTING.md` prüft er nur
      `**🏭 Factory / Harness**` und `` Aspekt-Label: `factory-pipeline`. ``. Ändert sich der
      Anker-Satz in der kanonischen Quelle (z. B. `.claude/` fällt weg, `config/` kommt hinzu),
      läuft `CONTRIBUTING.md` still auseinander – dieselbe Fehlerklasse, die diese Task für die
      Label-Aufzählungen gerade abschafft. Für die Label-Menge selbst ist die Disziplin
      vorbildlich eingehalten (Verweis statt Kopie, AK5-Assertion) – nur für die Anker nicht.
      Fix (eines von beiden): die vier Pfade in `CONTRIBUTING.md` durch den Verweis ersetzen
      („Abgrenzung anhand der Pfad-Anker in `git-workflow.md`"), **oder** eine Assertion
      ergänzen, die den Anker-Satz in beiden Dateien gegeneinander prüft.

- [ ] **`scripts/checks/tests/run-tests.sh:6783-6858` – die Fail-closed-Härtung aus Runde 1 (W1)
      ist nur auf den Live-Scan angewandt, nicht auf die vier Fixture-Kontrollen, die auf
      *leeren* Output prüfen.** Die Positivkontrolle „der Scan liest wirklich getrackte Dateien"
      schützt korrekt den Live-Aufruf gegen `$FACTORY_ROOT`. Die vier grün-erwartenden
      Fixture-Assertions – `REPO_NEW_315` (Diskriminierung), `REPO_ALLOW_315`,
      `REPO_REPORT_315` und die #312-Scratch-Kontrolle – haben keine solche Kontrolle: schlägt
      `tracked_repo_315` still fehl (jedes `git`-Kommando darin schluckt stderr per
      `>/dev/null 2>&1`, u. a. `git init` und `git commit`), liefert `name_hits_315` leeren
      Output und **alle vier werden grün, ohne dass je eine Datei gelesen wurde**. Dass die
      Mutations-Richtung (`REPO_OLD_315`, `REPO_OTHER_315`, `REPO_OTHERTASK_315`) funktioniert,
      belegt nur diese drei Repos, nicht die anderen vier. Verstößt gegen „Fail-Safe/Guard
      symmetrisch auf alle Inputs" (Lesson #197) und gegen #214 „Fail-closed bei unlesbarer
      Quelle". Billigster Fix: `tracked_repo_315` gibt den Pfad nur zurück, wenn
      `git -C "$wt" ls-files` nicht leer ist – eine Zeile, deckt alle Aufrufer auf einmal ab.

## Nitpicks (optional)

- [ ] `scripts/checks/tests/run-tests.sh:6693-6702` – die W2-Härtung greift für **4 von 7**
      Fundstellen. Bei drei Einträgen ist der Mutations-Anker ein echter Teilstring der
      geprüften Phrase, die Abwesenheits-Assertion kann dort strukturell nicht rot werden:
      `Aspekt-Label: ` ⊂ `` Aspekt-Label: `factory-pipeline`. `` (CONTRIBUTING.md),
      `null bis mehrere Aspekt-Labels` ⊂ der OPERATING-Phrase, und bei `start-work.sh`
      unterscheiden sich Anker und Phrase nur in der Leerzeichenzahl (die `flat_286` ohnehin
      squeezt). Für die vier übrigen (git-workflow.md, codify.md, review.md,
      security-review.md) sind die Prädikate echt verschieden und der Beleg trägt. Die
      Zeilenzahl-Kontrolle „Mutation greift wirklich" ist in allen sieben Fällen aussagekräftig.
- [ ] `scripts/checks/tests/run-tests.sh:6701` – das Assertion-Label sagt „verliert **die**
      beschreibende Zeile" (Singular). Bei `CONTRIBUTING.md` matcht der Anker `Aspekt-Label: `
      **zwei** Zeilen (auch die `test`-Beitragsart) – das Label behauptet weniger, als die
      Mutation tut. Muster aus Lesson #312 (Label darf nur behaupten, was die Mechanik deckt).
- [ ] `scripts/checks/tests/run-tests.sh:6785` – die Allowlist `tasks/*315*` ist breiter als die
      Absicht: sie deckt auch künftige IDs, die „315" als Teilstring tragen
      (`tasks/task-3150-*.md`, `tasks/review-1315.md`). Exakt wäre `tasks/*-315.md` +
      `tasks/task-315-*`. Wirkungslos, solange keine solche ID existiert.
- [ ] `docs/factory/kleinfunde.md` ist **nicht** in der Allowlist, und der Codify-Hinweis in der
      Task-Datei nennt nur `docs/factory/lessons/*` und `PROJECT-CONTEXT.md`. Ein
      Kleinfunde-Eintrag eines Folge-Skills, der den alten Namen zitiert, kippt die Suite
      genauso – die Warnung sollte die Sammeldatei mitnennen.
- [ ] Aufräumen vor `/pr-shepherd`: `tasks/patch-315.diff` (nach dem Apply stale) und das
      gitignorete `scripts/run315.tmp.sh` liegen noch im Worktree. Dazu die Artefakte **dieser
      Review-Runde**: `scripts/rev315.tmp.sh` und `.coverage-tmp315/` – ich habe sie angelegt,
      um die Suite ohne `/tmp`-Redirection zu fahren, und konnte sie nicht selbst entfernen
      (`rm` ist in dieser Session nicht freigegeben). Kein CI-Problem (frischer Checkout),
      aber Lesson #312.

## Positives

- **Alle neun Rework-Punkte aus Runde 1 sind belegbar umgesetzt** – und zwar an der Ursache,
  nicht am Symptom: der Mutations-Anker ist jetzt die *beschreibende* Zeile (statt der
  Negation des eigenen Suchbegriffs), der Live-Scan hat eine echte Positivkontrolle **vor**
  der Abwesenheits-Assertion, die Allowlist deckt die ganze Papierspur mit **je Pfadspec einer
  Kontrolle in beide Richtungen**, und der zirkuläre Tie-Break ist durch eine einseitig
  fail-safe Zweifelsregel ersetzt, die sich sprachlich an die schon etablierte „im Zweifel
  Issue"-Regel derselben Datei anlehnt.
- **Der Fundstellen-Sweep ist nachweislich vollständig.** Gegenprobe über zwei unabhängige
  Suchbegriffe (`Aspekt`, `tech-debt`) über alle `*.md`/`*.sh`/`*.yml`: außerhalb der
  #315-Papierspur bleibt keine Present-Tense-Aufzählung ohne das Label. `ADR-018:30` und
  `spec-82:18` beschreiben tatsächlich den Zustand *vor* dem Seam („werden nirgends
  angeboten") – die Ausnahme ist korrekt begründet, nicht bequem. Besonders gut:
  `scripts/lib/create-issue.sh:41` sagt selbst, dass die kanonische Liste allein in
  `git-workflow.md` lebt – der Code enthält deshalb keine zu pflegende Kopie.
- **Der alte Name ist repo-weit weg**, außer in genau den beiden Dokumenten, die den Rename
  festhalten – und der Guard bestätigt das aus eigener Kraft (1242 grün).
- **Die Selbstreferenz-Falle bleibt elegant gelöst:** `printf '\137'` setzt den alten Namen zur
  Laufzeit zusammen, damit der Scan nicht gerade die Datei allowlisten muss, die ihn ausführt.
- **AK6 behandelt eine vorbestehende Drift statt sie zu umgehen:** die flache
  „genau eins"-Liste in `OPERATING.md` führte die Zählung über Art- *und* Aspekt-Achse; sie ist
  jetzt zweiachsig – mit einer Assertion, die den Fehler festnagelt (`„genau eines" nur noch
  über die Art-Achse`).
- **Kein ADR-Trigger korrekt erkannt**, `docs/routes.md` unberührt (keine Routen-Änderung),
  Schicht-/Pattern-Konsistenz gewahrt, und das AK7-Detail (Usage-Beispiel bleibt Beispiel,
  Kopfkommentar trägt die Vollmenge) ist in beide Richtungen abgesichert.

## Empfehlung

NEEDS_REWORK

**Aber: der blockierende Teil ist keine `/implement`-Iteration.** Runde 2 hat keine neuen
kritischen Findings gefunden – die zwei kritischen sind unverändert K1/K2, und K1 liegt hinter
einer Berechtigungsgrenze, die ein Agent nicht überschreiten kann. Eine dritte automatische
`/implement`-Runde wäre verbrannter Lauf (Circuit Breaker greift danach ohnehin).

**Reihenfolge:**
1. **Mensch:** `git apply tasks/patch-315.diff`
2. Die drei Wichtig-Findings nachziehen (Spec-Sätze, `CONTRIBUTING.md`-Anker,
   `tracked_repo_315`-Fail-closed) – zusammen ca. 10 Zeilen
3. Suite erneut fahren (Erwartung: 1246+ grün, 0 rot), AK8 auf `[x]`, Blocker als erledigt
4. Scratch-Artefakte + `tasks/patch-315.diff` entfernen
5. Committen **und pushen** – erst danach `/test`
