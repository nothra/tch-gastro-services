# Review: Task 315

> **Runde 5** (nach dem W1-Fix + den `/security-review`-/`/codify`-Artefakten, Commit `7b4d288`).
> Gegenstand: `git diff origin/main...HEAD` = **16 Dateien**, Commits `9ac7466`, `2436a94`,
> `87bf67f`, `87432f5`, `3d0b512`, `7b4d288`, **plus eine uncommittete Änderung an der
> Task-Datei**. Spec: `docs/specs/spec-315-factory-pipeline-label-dokumentieren.md`.
> PR **#317** (Draft, Body enthält `Closes #315`). Drei Blickwinkel (Backend/Logik ·
> Code-Qualität · Architektur/Patterns) im Orchestrator-Kontext gefahren – ohne
> Fork-Delegation (Lesson #298/#267).
>
> **Verifikationsbasis dieser Runde (alles selbst gemessen, nichts aus Runde 4 übernommen):**
> - Bash-Self-Test-Suite ohne exportierte `PR_SHEPHERD`/`FACTORY_STAGE` (Lesson #262):
>   **1254 grün, 0 rot**.
> - `scripts/checks/pre-push.sh` **grün**: Vitest 736 passed/59 skipped, Typecheck, Prettier
>   („All matched files use Prettier code style!"), Routen-Doku-Drift, Hooks-Check, Branch-Guard.
> - `git status --ignored`: keine Scratch-Artefakte im Baum (Lesson #312); die vier
>   `scripts/rev4*.tmp.*` aus Runde 4 sind entfernt. Einzige Abweichung: die uncommittete
>   Task-Datei (→ W3).
> - **AK1 live:** `gh label list` führt `factory-pipeline` (`#7583cf`); ein Label mit
>   Unterstrich existiert nicht mehr.
> - **AK11 live:** Issue #315 heißt „factory-pipeline in die kanonische Label-Konvention
>   aufnehmen …" und trägt `documentation` + `tech-debt` + `factory-pipeline`.
> - **AK10 live:** Der alte Name (mit Unterstrich) steht nur noch in `docs/specs/spec-315-*`
>   und `tasks/*315*` – vollständig von der Allowlist gedeckt.
> - **Vierter unabhängiger Sweep**, diesmal über `tech-debt` als Suchbegriff über alle
>   getrackten Dateien außerhalb der Papierspur: **keine achte Fundstelle**. `ADR-018:30`
>   bleibt historisches Narrativ, die `create_issue_idempotent`-Codebeispiele in den
>   Skill-Dokus bleiben Beispiele.
>
> **Status des Runde-4-Findings W1** (`docs/specs/` als App-Anker): **geschlossen und
> nachgeprüft.** `git-workflow.md:148` führt die App-Seite jetzt nur mit `app/`, `db/`, `lib/`;
> `:154` listet `docs/specs/` unter den ungedeckten Pfaden mit der Begründung
> „Ablagekonvention statt Subsystem-Grenze". Spec (`AK3`) und Task-Datei sind mitgezogen. Die
> App-Anker-Assertion (`run-tests.sh:6717-6719`) endet auf einem terminierenden Punkt – ein
> Rückfall (`docs/specs/` wieder in der App-Liste) macht sie rot. Nachgemessen, nicht geglaubt.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle elf Akzeptanzkriterien sind erfüllt, beide Gates sind grün, der PR-Body trägt
`Closes #315`. Kein Merge-Blocker.

## Wichtige Findings (sollten behoben werden)

- [x] **`scripts/checks/tests/run-tests.sh:6726-6728` – genau der Eintrag, den Runde 4 erkämpft
      hat, ist der einzige der Zweifelsregel-Liste ohne Guard.** Die Assertion prüft die Phrase
      `Repo-Wurzel (…), `docs/adr/`, `tasks/`, `e2e/`` und endet dort; `docs/specs/` steht in
      `git-workflow.md:154` auf der **nächsten** Blockquote-Zeile und ist damit von keiner
      Assertion gedeckt. Das Assertion-Label behauptet aber „die Zweifelsregel benennt die von
      beiden Anker-Listen ungedeckten Pfade" – es deckt 4 von 5. Das ist wörtlich das Muster
      aus der eigenen #312-Lesson („das Label darf nur behaupten, was das Prüffenster
      abdeckt"), und es trifft die Stelle, deren Fehlen vier Runden gekostet hat: Wer den
      Halbsatz streicht, fällt lautlos auf den Zustand vor dem W1-Fix zurück, während die
      Suite grün bleibt. Der ganze Zweck dieser Task ist Drift-Schutz für genau solche
      Aufzählungen.
      **Fix (zwei Zeilen):** zweite Assertion auf
      ``'`docs/specs/` (Ablagekonvention statt Subsystem-Grenze'`` – diese Phrase steht
      vollständig auf `git-workflow.md:154`, ist also `flat_286`-tauglich – und das Label der
      bestehenden Assertion auf „…ungedeckten Pfade (Repo-Wurzel, ADR, tasks, e2e)" verengen.
      *(Behoben 2026-08-27 im `/test`-Schritt: genau dieser Fix angewandt, `run-tests.sh:6726-
      6733`. Suite 1255/0, `pre-push.sh` grün. W2/W4 bleiben offen – Produktionsdoku-Änderungen
      außerhalb des `/test`-Scopes.)*
- [ ] **`docs/factory/guidelines/git-workflow.md:155` – „siehe z. B. diese Spec selbst" ist in
      der kanonischen Guideline ein Verweis ins Nichts.** Der Halbsatz ist beim W1-Fix aus dem
      Spec-/Review-Text mitkopiert worden; dort war „diese Spec" `spec-315`. In
      `git-workflow.md` liest ein Mensch eine Guideline, keine Spec – der Verweis hat kein
      Antezedens. Einzige Fundstelle im Repo (`grep -rn "diese Spec selbst"`). Der Satz steht
      ausgerechnet in der Begründung, die der Leser für die Zuordnung braucht.
      **Fix:** „siehe z. B. `docs/specs/spec-315-factory-pipeline-label-dokumentieren.md`" oder
      den Halbsatz streichen.
- [ ] **Der AK3-Nachzug an der Task-Datei ist uncommittet – die Pipeline hat dafür schon einen
      Interrupt geschrieben** (`tasks/interrupt-log.jsonl:5`,
      `INCOMPLETE_OUTCOME · Working Tree nicht sauber`). Betroffen ist genau das AK3, das
      `docs/specs/` von der App-Seite in die Zweifelsregel-Liste zieht. Wird der Branch so
      gemergt, liegt auf `main` eine Task-Datei, deren AK3 der kanonischen Quelle, der Spec und
      dem Guard widerspricht – und laut Guardrail („Task-Datei final auf dem Feature-Branch
      abschließen") ließe sich das danach nur über einen neuen PR korrigieren.
      **Fix:** committen (Lesson #251: Fix zwischen zwei Runden sofort committen, nicht am Ende
      bündeln).
- [ ] **`docs/factory/lessons/factory-workflow.md:1303-1305` – die neue Lesson schreibt eine
      Regel vor, die die kanonische Quelle desselben PR nicht erfüllt.** Die Lesson verlangt,
      Anker „als **Repo-Wurzel-Präfix** ausweisen (z. B. ‚ab Repo-Wurzel gelesen'), sonst
      matcht ein freier Teilstring wie `lib/` auch innerhalb eines Pfads der anderen Seite
      (`scripts/lib/create-issue.sh`)" – `git-workflow.md:147-148` listet die Anker weiterhin
      ohne diesen Zusatz. Damit codifiziert der PR eine Regel und liefert im selben Commit das
      Gegenbeispiel; `scripts/lib/create-issue.sh` matcht real beide Seiten (Factory `scripts/`
      **und** App `lib/`) und ist eindeutig Factory. Runde 4 hatte das als Nitpick geführt und
      bewusst offen gelassen – mit der Erhebung zur Lesson ist das nicht mehr konsistent
      (Muster aus Lesson #176/#211: Präsens-Prosa im selben PR nachziehen).
      **Fix:** ein Halbsatz in `git-workflow.md` („Pfad-Anker, jeweils ab der Repo-Wurzel
      gelesen:") – und dann greift auch die neue Lesson auf ihr eigenes Beispiel.

## Nitpicks (optional)

- [ ] `tasks/codify-315.md:39-44` behauptet, W1 sei offen und die Entscheidung liege „beim
      Menschen vor dem Merge" – der **gleiche** Commit `7b4d288` enthält den W1-Fix.
      `tasks/review-315.md` und die Task-Datei sind nachgezogen, der Codify-Report nicht
      (Lesson #176). Ein Nachtrag-Satz genügt; Report-Artefakte sind Snapshots, deshalb nur
      Nitpick.
- [ ] `scripts/checks/tests/run-tests.sh:6788` – „ADR-018 §30" meint die **Zeilennummer** 30,
      nicht einen Paragrafen (die ADR hat keinen). Unverändert offen aus Runde 4, von `/codify`
      bewusst als nicht-codify-würdig eingestuft.
- [ ] `scripts/checks/tests/run-tests.sh:6750-6754` – die Anti-Duplikat-Absicherung für
      `CONTRIBUTING.md` deckt nur die **Factory**-Anker. Eine wörtliche Kopie der App-Anker
      (`app/`, `db/`, `lib/`) nach `CONTRIBUTING.md` bliebe unbemerkt – asymmetrischer Guard
      (Lesson #197: Guard symmetrisch auf alle Inputs).
- [ ] PR **#317** trägt **keine** Labels, obwohl `git-workflow.md` „Issues **und** PRs"
      klassifiziert – ausgerechnet der PR, der das Label dokumentiert, trägt es nicht.
      `gh pr edit 317 --add-label documentation,tech-debt,factory-pipeline`. (Repo-weite
      Praxis-Lücke, nicht von dieser Task verursacht.)
- [ ] Offene Checkboxen der Task-Datei: „Review bestanden", „Tests vollständig",
      „Refactoring abgeschlossen", „Fertig / PR erstellt". `/test` und `/refactor` sind noch
      nicht gelaufen, `/codify` lief vorgezogen – vor dem Merge nachziehen (Guardrail „keine
      offenen Checkboxen → kein Done").
- [ ] Unverändert offen aus Runde 4 und dort bewusst akzeptiert, hier bestätigt: `e2e/` in der
      Zweifelsliste (labelt eine reine E2E-Task als Factory-Arbeit – Kosten der Fail-safe-
      Richtung), die doppelte `assert_scan_clean_315`-Prüfung gegen dasselbe `REPO_NEW_315`
      (`:6855`/`:6881`), der Teilstring-Mutations-Anker bei 3 von 7 Fundstellen, der Singular
      im Mutationslabel und `tasks/*315*` als breiterer Pfadspec als nötig. Alle ohne Wirkung
      im aktuellen Repo-Zustand.

## Positives

- **Der W1-Fix behandelt die Ursache, nicht das Symptom.** `docs/specs/` ist nicht in eine
  Sonderregel gewandert, sondern in die Zweifelsregel – dort, wo eine Ablagekonvention ohne
  Vorhersagekraft hingehört. Die drei Fundstellen (kanonische Quelle, Spec-AK3,
  App-Anker-Assertion) sagen dasselbe; die Assertion terminiert die App-Liste mit einem Punkt
  und macht damit den Rückfall rot. Der Nachzug an der Task-Datei (vierte Fundstelle, die die
  Review-Empfehlung nicht genannt hatte) ist selbst gefunden und in der Task-Datei als Muster
  festgehalten – genau die Papierspur-Blindheit aus Lesson #211/#176/#253.
- **Beide Gates diese Runde selbst gemessen, nicht übernommen:** Suite 1254/0, `pre-push.sh`
  vollständig grün. Die 53 `#315`-Assertions laufen inkl. aller Mutations-, Fail-closed- und
  Diskriminierungs-Kontrollen.
- **Der Fundstellen-Sweep hält einer vierten, unabhängigen Suche stand** (Suchbegriff
  `tech-debt` über den getrackten Baum ohne Papierspur): keine achte Aufzählung. Die
  Abgrenzung „Aufzählung vs. Beispiel" ist konsistent durchgehalten – Kopfkommentar in
  `start-work.sh` = Vollmenge, `--labels`-Usage und die Seam-Codebeispiele = Beispiele, per
  `assert_absent` festgenagelt.
- **Der Rename ist live sauber:** kein Label mit Unterstrich mehr, Zuordnungen und
  Beschreibung erhalten, Issue-Titel und -Labels gezogen. Der Live-Scan findet den alten Namen
  ausschließlich in der Papierspur.
- **`/codify` hat das richtige Abstraktionsniveau gewählt:** die neue Lesson beschreibt das
  *Erkenntnismuster* (Anker-Liste ohne Verteilungs-Check), nicht den Einzelfall, und der
  Bericht trennt sauber zwischen codify-würdigem Muster und Einzel-Nitpick. Sie zitiert den
  alten Label-Namen bewusst nicht – sonst würde der eigene AK10-Guard rot (die Allowlist deckt
  `lessons/` absichtlich nicht).
- **Keine Schicht-/Scope-Verletzung:** `scripts/lib/create-issue.sh` bleibt validierungsfrei
  (ADR-018 §3), es entsteht keine zweite kanonische Label-Liste im Code, kein ADR-Trigger,
  `docs/routes.md` unberührt (keine Routen-Änderung), Working Tree bis auf die Task-Datei
  sauber.

## Empfehlung

APPROVED

**Einstufung und Eskalation (Circuit Breaker).** Dies ist die **fünfte** Review-Runde auf
denselben Code; der Circuit Breaker („max. 3 Iterationen") ist längst gezogen. Es gibt kein
kritisches Finding, alle elf AKs sind erfüllt, beide Gates sind grün – deshalb `APPROVED`
statt eines formalen `NEEDS_REWORK`, das nur die Schleife weiterdrehen würde. **Ein weiterer
`/implement`-Lauf ist nicht angebracht.** Die vier offenen Punkte sind zusammen fünf Zeilen und
gehören dem Menschen zur Entscheidung:

1. **W3 zwingend vor dem Merge:** die Task-Datei committen. Alles andere ist optional, das
   nicht – ohne Commit landet ein widersprüchliches AK3 auf `main`.
2. **W1 empfohlen** (zwei Zeilen in `run-tests.sh`): Der ungeguardete `docs/specs/`-Eintrag ist
   die Wiederholungsgefahr dieser Task in Reinform. Danach Suite + `pre-push.sh`.
3. **W2 empfohlen** (ein Halbsatz in `git-workflow.md:155`): Dangling-Verweis in der
   kanonischen Quelle.
4. **W4 zur Wahl:** Halbsatz „ab der Repo-Wurzel gelesen" in `git-workflow.md:147` – oder die
   entsprechende Forderung aus der neuen Lesson streichen. Beides ist konsistent; der jetzige
   Zustand (Lesson fordert, Quelle liefert nicht) ist es nicht.

Als Schuld akzeptierbar sind W1, W2 und W4 gemeinsam über ein Issue
(`documentation` + `tech-debt` + `factory-pipeline`) – für `kleinfunde.md` sind sie zu wirksam,
sie betreffen die kanonische Quelle und ihren Guard.
