# Review: Task 315

> **Runde 3** (nach dem menschlichen `git apply` und dem Commit/Push des Rework-Stands).
> Gegenstand: `git diff origin/main...HEAD` = **11 Dateien**, Commits `9ac7466`, `2436a94`,
> `87bf67f`, `87432f5`. Spec: `docs/specs/spec-315-factory-pipeline-label-dokumentieren.md`.
> Drei Runden (Backend/Logik · Code-Qualität · Architektur/Patterns) im Orchestrator-Kontext
> gefahren – ohne Fork-Delegation (Lesson #298/#267).
>
> **Verifikationsbasis dieser Runde (alles selbst gemessen):**
> - Bash-Self-Test-Suite ohne exportierte `PR_SHEPHERD`/`FACTORY_STAGE` (Lesson #262):
>   **1246 grün, 0 rot**.
> - `scripts/checks/pre-push.sh` **grün**: Vitest 736 passed/59 skipped, Typecheck, Prettier
>   (`All matched files use Prettier code style!`), Routen-Doku-Drift, Hooks-Check, Branch-Guard.
> - `git status --ignored`: Arbeitsbaum sauber (nur `.env.local`, `node_modules/`,
>   `tsconfig.tsbuildinfo`) – kein Scratch-Artefakt aus früheren Runden mehr.
> - **AK1:** `gh label list` führt `factory-pipeline` (`#7583cf`), kein `factory_pipeline`.
>   `gh issue list --label factory-pipeline --state all` → 14 Issues, davon 13 = der Bestand
>   der Nachweis-Messung inkl. #315 selbst; das 14. ist #316 (nachträglich gelabelt, s. N3).
> - **AK11:** Titel + Body von #315 enthalten den alten Namen **0×**.
> - **Sweep-Vollständigkeit** unabhängig gegengeprüft: `git grep -F tech-debt` und
>   `git grep -Fi Aspekt` über alle `*.md`/`*.sh`/`*.yml` – außerhalb der #315-Papierspur
>   bleibt **keine** Present-Tense-Aufzählung ohne das Label. `ADR-018:30` und
>   `spec-82:18,39` beschreiben belegbar den Zustand *vor* dem Seam („werden nirgends
>   angeboten") – die Ausnahme ist begründet, nicht bequem.
>
> **Status der Runde-2-Findings:**
>
> | Runde-2-Finding | Status in Runde 3 |
> |---|---|
> | K1 – AK8-Patch nicht angewandt | **behoben** – alle drei `.claude/commands/*.md` sind im Diff, die vier zuvor roten Assertions grün |
> | K2 – Implementierung unkommittiert | **behoben** – `87bf67f`/`87432f5` committet und gepusht, `origin/main...HEAD` zeigt alle 11 Dateien |
> | W1 – Spec beim Rework nicht mitgezogen | **offen** (siehe W1 unten) |
> | W2 – `CONTRIBUTING.md` dupliziert die Pfad-Anker | **offen** (siehe W2 unten) |
> | W3 – `tracked_repo_315` ohne Fail-closed | **offen** (siehe W3 unten, Schweregrad korrigiert) |
> | N1–N5 (Runde 2) | N1/N2 unverändert gültig (siehe N1/N2 unten), N3 (`tasks/*315*` zu breit) und N4 (`kleinfunde.md`) unverändert, N5 (Aufräumen) **erledigt** |

## Kritische Findings (müssen behoben werden)

_Keine._ Alle elf Akzeptanzkriterien der Spec sind erfüllt und nachgemessen, alle Gates
(Self-Test-Suite, pre-push) sind grün, der Branch ist gepusht und der Diff vollständig. Es gibt
in Runde 3 kein Merge-Blocker-Finding.

## Wichtige Findings (sollten behoben werden)

- [ ] **`docs/specs/spec-315-…md:79-83` und `:111-114` – die Spec ist weiterhin nicht mit dem
      Rework mitgezogen; zwei im Code fest verankerte Mechaniken stehen in keinem
      Anforderungsdokument.** (Carry-over W1 aus Runde 2, unverändert.) Gemessen:
      1. **AK10 kennt die Allowlist nicht.** Die Spec formuliert unbedingt: „schlägt fehl,
         sobald der alte Name `factory_pipeline` in einer **getrackten** Datei auftaucht".
         `run-tests.sh:6783-6786` nimmt aber zwei Pfadspecs aus
         (`':(exclude)docs/specs/spec-315-*'`, `':(exclude)tasks/*315*'`). Wörtlich gelesen
         müsste die Suite rot sein – die Spec ist selbst getrackt und nennt den alten Namen 6×.
         Die Begründung existiert nur im WHY-Kommentar der Testdatei und in der Task-Datei.
      2. **Die Zweifelsregel steht in keinem AK.** AK3 fordert nur die Pfad-Anker beider Seiten.
         In `run-tests.sh:6723-6728` hängen daran inzwischen **zwei** Assertions
         (`#315 AK3: der Mischfall ist einseitig fail-safe aufgelöst` und
         `… benennt die von beiden Anker-Listen ungedeckten Pfade`) – Tests, die einen nirgends
         niedergeschriebenen Sollzustand festnageln.
      Das ist exakt das Muster aus Lesson #253 („frisch im selben PR erstellte Spec braucht
      denselben Drift-Check wie eine ADR") und #211/#176 („PR ändert die beschriebene Mechanik
      → dieselbe Prosa im selben PR nachziehen"). Beides ist im Index von `PROJECT-CONTEXT.md`
      als `/review`-Trigger geführt. Fix: je ein Satz an AK3 und AK10 – keine Umstrukturierung.

- [ ] **`CONTRIBUTING.md:88` – der neue Bullet dupliziert die Factory-Pfad-Anker aus der
      kanonischen Quelle, ungeschützt gegen Drift.** (Carry-over W2 aus Runde 2, unverändert.)
      Die Zeile führt `` (`scripts/`, `.claude/`, `.github/workflows/`, `docs/factory/`) ``
      wörtlich zum zweiten Mal – die einzige Kopie dieser Liste außerhalb von
      `git-workflow.md:145`. Der neue Guard deckt sie **nicht** ab: für `CONTRIBUTING.md` prüft
      er nur `**🏭 Factory / Harness**` und `` Aspekt-Label: `factory-pipeline`. ``
      (`run-tests.sh:6661`, `:6739-6743`). Ändert sich der Anker-Satz in der kanonischen Quelle
      (z. B. `config/` kommt hinzu), läuft `CONTRIBUTING.md` still auseinander – dieselbe
      Fehlerklasse, die diese Task für die Label-Aufzählungen gerade abschafft. Für die
      Label-*Menge* ist die Disziplin vorbildlich eingehalten (Verweis auf `git-workflow.md`
      statt Kopie, per AK5-Assertion gesichert) – nur für die Anker nicht.
      Fix (eines von beiden): die vier Pfade durch den Verweis ersetzen („Abgrenzung anhand der
      Pfad-Anker in `git-workflow.md`"), **oder** eine Assertion, die den Anker-Satz in beiden
      Dateien gegeneinander prüft.

- [ ] **`scripts/checks/tests/run-tests.sh:6805-6815` – die Fail-closed-Härtung ist asymmetrisch:
      sie schützt den Live-Scan, nicht die vier Fixture-Kontrollen, die auf *leeren* Output
      prüfen.** (Carry-over W3 aus Runde 2 – **Schweregrad hier korrigiert**, s. u.)
      Die Positivkontrolle in `:6792-6793` schützt den Live-Aufruf gegen `$FACTORY_ROOT`
      korrekt. Die vier grün-erwartenden Fixture-Assertions – `REPO_NEW_315` (Diskriminierung,
      `:6831`), `REPO_ALLOW_315` (`:6839`), `REPO_REPORT_315` (`:6847`) und die
      #312-Scratch-Kontrolle (`:6857`) – haben keine: `tracked_repo_315` schluckt in jedem
      `git`-Kommando stderr (`>/dev/null 2>&1`, u. a. `git init -b main` und `git commit`).
      Scheitert es still, liefert `name_hits_315` leeren Output und alle vier werden grün, ohne
      dass je eine Datei gelesen wurde. Verstößt gegen Lesson #197 („Fail-Safe/Guard symmetrisch
      auf alle Inputs") und #214 („Fail-closed bei unlesbarer Quelle") – letztere zitiert der
      Code an `:6792-6795` für den Live-Scan selbst.
      **Korrektur gegenüber Runde 2:** Runde 2 stellte das als unbemerkt-fail-open dar. Das ist
      zu scharf – die drei Mutations-Repos (`REPO_OLD_315`, `REPO_OTHER_315`,
      `REPO_OTHERTASK_315`) durchlaufen **denselben** Helper und erwarten *nicht-leeren* Output.
      Ein Totalausfall (kein `-b main`-Support, kein `git`) fiele dort sofort rot auf. Übrig
      bleibt das *partielle* Versagen (ein einzelnes `mkdir -p`/`add` scheitert). Real, aber
      schmaler als gemeldet. Billigster Fix bleibt eine Zeile in `tracked_repo_315`: den Pfad
      nur zurückgeben, wenn `git -C "$wt" ls-files` nicht leer ist – deckt alle Aufrufer ab.

## Nitpicks (optional)

- [ ] `scripts/checks/tests/run-tests.sh:6668-6676` – die Mutations-Härtung greift für **4 von 7**
      Fundstellen. Bei drei Einträgen ist der Anker ein echter Teilstring der geprüften Phrase,
      die Abwesenheits-Assertion kann dort strukturell nicht rot werden: `Aspekt-Label: `
      ⊂ `` Aspekt-Label: `factory-pipeline`. `` (CONTRIBUTING.md),
      `null bis mehrere Aspekt-Labels` ⊂ der OPERATING-Phrase, und bei `start-work.sh`
      unterscheiden sich Anker und Phrase nur in der Leerzeichenzahl (die `flat_286` ohnehin
      squeezt). Für die vier übrigen (git-workflow.md, codify.md, review.md, security-review.md)
      sind die Prädikate echt verschieden und der Beleg trägt. Die Zeilenzahl-Kontrolle
      „Mutation greift wirklich" (`:6699-6701`) ist in allen sieben Fällen aussagekräftig.
- [ ] `scripts/checks/tests/run-tests.sh:6701` – das Assertion-Label sagt „verliert **die**
      beschreibende Zeile" (Singular). Bei `CONTRIBUTING.md` matcht der Anker `Aspekt-Label: `
      **zwei** Zeilen (auch die `test`-Beitragsart) – das Label behauptet weniger, als die
      Mutation tut (Lesson #312: das Label darf nur behaupten, was die Mechanik deckt).
- [ ] **Neu:** `docs/specs/spec-315-…md:142-143` und
      `tasks/task-315-…md` („Randnotiz (nicht Scope)") nennen **#316** als Factory-Issue *ohne*
      das Label. Gemessen am 2026-08-27: #316 trägt inzwischen `documentation,tech-debt,`
      `factory-pipeline`. Damit ist die Randnotiz stale, und die AK1-Nachweiszeile „liefert
      **13** Issues" ist beim Nachrechnen heute 14. Muster aus Lesson #176 (Doku, die einen
      offenen Follow-up nennt, der erledigt wurde). Fix: `#316` in beiden Randnotizen streichen
      (#285/#166 bleiben ungelabelt) und der AK1-Zeile das Messdatum als Stichtag mitgeben.
- [ ] `scripts/checks/tests/run-tests.sh:6785` – die Allowlist `tasks/*315*` ist breiter als die
      Absicht: sie deckt auch künftige IDs mit „315" als Teilstring (`tasks/task-3150-*.md`,
      `tasks/review-1315.md`). Exakt wäre `tasks/*-315.md` + `tasks/task-315-*`. Wirkungslos,
      solange keine solche ID existiert.
- [ ] `docs/factory/kleinfunde.md` ist **nicht** in der AK10-Allowlist, und der Codify-Hinweis in
      der Task-Datei nennt nur `docs/factory/lessons/*` und `PROJECT-CONTEXT.md`. Ein
      Kleinfunde-Eintrag eines Folge-Skills, der den alten Namen zitiert, kippt die Suite
      genauso – die Warnung sollte die Sammeldatei mitnennen.
- [ ] Aufräumen: `scripts/revrun.tmp.sh` liegt noch im Worktree – ich habe es angelegt, um die
      Suite ohne `/tmp`-Redirection zu fahren, und konnte es nicht selbst entfernen (`rm` ist in
      dieser Session nicht freigegeben). Es ist gitignoret, also kein CI-Problem und kein
      Auslöser des #312-Guards (der AK10-Scan liest nur getrackte Dateien) – aber Lesson #312.

## Positives

- **Die zwei kritischen Findings aus Runde 2 sind sauber geschlossen.** Der `.claude/**`-Patch
  ist angewandt, `tasks/patch-315.diff` entfernt, der Stand committet **und gepusht** – die
  Folge-Skills sehen jetzt den vollständigen Diff und nicht den leeren aus Lesson #251.
- **Alle elf AKs sind unabhängig nachmessbar erfüllt**, inklusive der beiden, die außerhalb des
  Repos liegen: das Label ist umbenannt und hat seine Zuordnungen behalten (AK1), Titel und Body
  von #315 nennen den alten Namen 0× (AK11) – letzteres nicht durch Blind-Replace, sondern durch
  Umformulierung von Phase-1-Punkt 2, der sonst zur Falschaussage geworden wäre.
- **Der Fundstellen-Sweep ist nachweislich vollständig**, mit zwei unabhängigen Suchbegriffen
  gegengeprüft. Besonders gut: `scripts/lib/create-issue.sh:41` sagt selbst, dass die kanonische
  Liste allein in `git-workflow.md` lebt – der Seam bleibt validierungsfrei (ADR-018 §3), es
  entsteht **keine** zweite kanonische Label-Liste im Code. Genau das war die Scope-Grenze.
- **Die Selbstreferenz-Falle ist elegant gelöst:** `printf '\137'` setzt den alten Namen zur
  Laufzeit zusammen, damit der Regressions-Scan nicht ausgerechnet die Datei allowlisten muss,
  die ihn ausführt.
- **AK6 behandelt eine vorbestehende Drift, statt sie zu umgehen:** die flache „genau eins"-Liste
  in `OPERATING.md` führte die Zählung über Art- *und* Aspekt-Achse; sie ist jetzt zweiachsig –
  mit einer Assertion, die genau diesen Fehler festnagelt.
- **Die Mutations-Disziplin ist ernst genommen:** je Fundstelle Anker + Zeilenzahl-Positivkontrolle
  + Abwesenheits-Assertion, und bei AK10 je Ausnahme-Pfadspec eine Kontrolle **in beide
  Richtungen** (Papierspur zulässig / fremde Spec bzw. fremder Task-Report rot). Das ist mehr
  Beleg, als die meisten Guards dieser Suite mitbringen.
- **Kein ADR-Trigger korrekt erkannt**, `docs/routes.md` unberührt (keine Routen-Änderung),
  Schicht-/Pattern-Konsistenz gewahrt, Namens-/Kommentarstil deckungsgleich mit den
  Nachbarblöcken (#310/#312), und `tracked_repo_315` begründet ausdrücklich, warum es **nicht**
  auf `_mk_pipe_repo`/`hi_repo` aufsetzt – die Lehre aus #240/#267/#310 ist angekommen.

## Empfehlung

NEEDS_REWORK

**⚠️ Circuit Breaker: Das ist die dritte Review-Runde auf denselben Code.** Gemäß `/review`
→ „Circuit Breaker" wird **nicht weiter automatisch iteriert**; die Entscheidung liegt beim
Menschen. Das `NEEDS_REWORK` steht hier **nicht** für „zurück an `/implement`", sondern für
„drei Runde-2-Findings haben eine Rework-Runde überlebt und sind noch offen".

**Ungelöster Konflikt, den der Mensch entscheiden muss:** Es gibt **kein** kritisches Finding
mehr – alle AKs erfüllt, alle Gates grün, der PR ist technisch mergefähig. Offen sind
ausschließlich drei „sollte"-Punkte von zusammen **~10 Zeilen**, von denen einer (W1) eine im
Repo codifizierte Regel verletzt (Lesson #253/#211/#176: Spec-Drift im eigenen PR).

**Zwei zulässige Wege:**

1. **Empfohlen – einmalig nachziehen, dann durchlaufen lassen** (kein `/implement`-Lauf nötig,
   das sind reine Doku-/Test-Edits):
   1. Spec: je ein Satz an AK3 (Zweifelsregel) und AK10 (Allowlist-Ausnahme).
   2. `CONTRIBUTING.md:88`: Pfad-Anker durch den Verweis auf `git-workflow.md` ersetzen.
   3. `run-tests.sh`: eine Zeile Fail-closed in `tracked_repo_315`.
   4. Suite + `pre-push.sh` erneut fahren, committen, pushen → **direkt weiter zu `/test`**,
      **keine** vierte Review-Runde.
2. **Alternative – bewusst als Schuld akzeptieren:** W1–W3 als Kleinfunde-Einträge bzw. Issue
   festhalten und sofort zu `/test`. Vertretbar, weil kein Merge-Blocker vorliegt; W1 sollte
   dann aber ein Issue werden, nicht nur ein Kleinfund – eine Spec, die dem ausgelieferten Guard
   widerspricht, wird mit der Zeit teurer, nicht billiger.

**In beiden Fällen vorher:** `scripts/revrun.tmp.sh` entfernen (Lesson #312).
