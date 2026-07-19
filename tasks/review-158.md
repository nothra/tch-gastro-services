# Review: Task 158

Drei unabhängige Review-Runden (Logik / Code-Qualität / Architektur), read-only.
Änderungsumfang: `.claude/commands/pr-shepherd.md` Schritt 6 (Direct-Merge-Fallback),
Konsistenz-Test in `scripts/checks/tests/run-tests.sh`, ADR-030, Spec, Stolperstein in
`PROJECT-CONTEXT.md`.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle drei Runden: keine kritischen Findings. Shell-Verzweigung korrekt und
fail-closed, `main`-Schutz (ADR-029) nicht geschwächt, alle Akzeptanzkriterien erfüllt,
303/303 Self-Tests grün, kein Fehl-Match des Direct-Merge-Greps.

## Wichtige Findings (sollten behoben werden)

- [x] **`.claude/commands/pr-shepherd.md:118` – Notiz-Template inkonsistent (Runde 2).** Die
  committete Abschlussnotiz sagte weiter `Auto-Merge freigegeben`, obwohl der neue
  Direct-Merge-Pfad (`CLEAN` → `gh pr merge --squash`) kein Auto-Merge ist. Die Notiz landet
  per Squash-Merge auf `main` und wäre dort nur per neuem PR korrigierbar → faktisch falscher
  Text auf `main`. **Behoben** (patch-158.diff): Template neutral → `Merge freigegeben`.
- [x] **`scripts/checks/tests/run-tests.sh` – Namensinkonsistenz + Doppelberechnung (Runde 2).**
  Neuer Block nutzte `_shep_commit_ln`/`_shep_direct_ln` (abweichend von `…_line`-Konvention
  darüber, `ln` keine erlaubte Abkürzung) und berechnete `factory-commit.sh` erneut, obwohl
  `_shep_commit_line` schon im Scope war. **Behoben:** `_shep_commit_line` wiederverwendet,
  neue Variable `_shep_direct_merge_line`.

## Nitpicks (optional)

- [x] **`run-tests.sh` – Tippfehler „VOR AUCH dem" → „AUCH VOR dem" (Runde 2).** Behoben.
- [x] **`.claude/commands/pr-shepherd.md:142,150,155` – `Kein Auto-Merge`/`Auto-Merge
  freigegeben` in Regel/Output/Stage-3 (Runde 2).** Nach der Header-Umbenennung inkonsistent
  bzw. für den Direct-Pfad ungenau. **Behoben** (patch-158.diff): auf `Merge` angeglichen
  (Skill-Titel „bis Auto-Merge" bleibt – beschreibt das Gesamtziel).
- [x] **`run-tests.sh` – Unabhängigkeits-Kommentar nannte nur AC1/AC2, nicht AC4 (Runde 2).**
  Behoben: AC4 ergänzt.
- [x] **`.claude/commands/pr-shepherd.md:125,132` – ASCII `waehlen`/`wuerde` in Inline-
  Kommentaren (Runde 3).** Artefakt der programmatischen Patch-Erzeugung. **Behoben**
  (patch-158.diff): `wählen`/`würde`.
- [x] **`docs/specs/spec-158…md` Scope – nannte `mergeStateStatus,mergeable` (Runde 3).**
  Implementierung nutzt nur `mergeStateStatus` (ADR-030 verwarf `mergeable`). **Behoben:**
  Scope an ADR-030 angeglichen.
- [ ] **`run-tests.sh` Order-Guard nutzt globales `first_match_line 'factory-commit.sh'`
  (Zeile 40, Schritt-2-Commit) statt der Schritt-6-Notiz (Runde 1 & 3).** Der Guard belegt
  streng nur „*irgendein* factory-commit steht vor dem Direct-Merge". **Bewusst nicht
  geändert:** exakt dasselbe Muster wie der bestehende #114-Guard – keine Regression, und
  semantisch getragen (in Schritt 6 selbst steht der Notiz-Commit vor beiden Merge-Zeilen).
  Eine section-begrenzte Präzisierung beträfe #114 mit → separater Refactor/Tech-Debt, nicht
  dieser PR.
- [ ] **`run-tests.sh` – dritte Wiederholung des Order-Check-Musters extrahierbar (Runde 2).**
  Ein Helper `assert_line_before <a> <b> <file> <msg>` (analog `section_contains`) wäre sauberer.
  **Deferiert an `/refactor`** (würde auch den bestehenden #114-Block umverdrahten – bewusst
  nicht im Review-Rework, um Scope zu halten).

## Positives

- Fail-closed by design: `CLEAN` → direkt, alles andere → `--auto`; die Merge-Modus-Wahl kann
  den Ruleset-Schutz (ADR-029) nicht umgehen (nur Auslöser, keine Autorisierung).
- Konsistenz-Test folgt exakt dem etablierten #114/#117-Muster (`section_contains`,
  `first_match_line`, POSIX-portabel, je AC eine Assertion, #94 Positiv+Negativ belegt).
- #114-Lehre „Kommando ≠ Teil-Match" befolgt: `gh pr merge --squash` ist kein Teilstring von
  `gh pr merge --auto --squash` (verifiziert – matcht nur die Direct-Zeile).
- Patch-Workflow (#88/#94) sauber: kein stale Artefakt, Task-Checkboxen `[x]`, Blocker als
  erledigt markiert (#145), ADR/Spec/Task kohärent.

## Empfehlung

APPROVED

> Alle kritischen/wichtigen Punkte sind adressiert. Die Fixes an editierbaren Dateien
> (`run-tests.sh`, Spec) sind angewandt; die `.claude/**`-Kosmetik (W1/N2/N7) liegt als
> `tasks/patch-158.diff` bereit (git apply --check grün) und wird vom Menschen appliziert –
> keine Verhaltensänderung, 303/303 Self-Tests bleiben grün. Zwei Nitpicks bewusst deferiert
> (Order-Guard-Präzision = pre-existing #114-Muster; Helper-Extraktion → `/refactor`).
