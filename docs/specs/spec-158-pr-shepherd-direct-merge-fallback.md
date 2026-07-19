# Spec: pr-shepherd – Direct-Merge-Fallback bei bereits mergebarem PR

## Kontext

`/pr-shepherd` Schritt 6 aktiviert den Merge ausschließlich über
`gh pr merge --auto --squash`. GitHub lehnt `--auto` jedoch ab, wenn der PR
**bereits mergebar** ist (alle required Checks grün, keine Konflikte):

```
GraphQL: Pull request is in clean status (enablePullRequestAutoMerge)
```

Auto-Merge ist per Design nur für PRs gedacht, die **noch auf etwas warten**
(laufende Checks). Bei schnellem CI – typisch für Docs-/ADR-PRs – sind die
required Checks oft schon grün, wenn pr-shepherd `--auto` aufruft. Der Schritt
schlägt dann fehl, obwohl der PR sauber mergebar ist.

**Beobachtet** bei PR #157 (Task #155): Nach dem Abschlussnotiz-Push liefen die
schnellen Docs-Checks durch, bevor `gh pr merge --auto` aufgerufen wurde →
`mergeStateStatus: CLEAN`, `--auto` abgelehnt, Schritt 6 gescheitert.

**Nebenbefund (bereits behoben):** Das Repo-Setting *Allow auto-merge* war
repo-weit deaktiviert → `--auto` scheiterte grundsätzlich. In Session #155 via
`gh api -X PATCH .../repo -F allow_auto_merge=true` aktiviert. Wird als
Stolperstein in `PROJECT-CONTEXT.md` festgehalten (hätte auch die Stage-3-
Pipeline blockiert).

## Scope

**Inbegriffen:**
- `.claude/commands/pr-shepherd.md` Schritt 6: Merge-Aufruf robust machen.
  Zustand prüfen (`gh pr view --json mergeStateStatus`); ist der PR bereits
  mergebar (`CLEAN`) → **direkter** `gh pr merge --squash`; sonst (Checks laufen
  noch) → `gh pr merge --auto --squash` wie bisher. (Feinschnitt der Bedingung in
  ADR-030 auf `CLEAN`-only entschieden; `mergeable` nicht benötigt.)
- Konsistenz-Test in `scripts/checks/tests/run-tests.sh` (analog zu den
  bestehenden #114-/#117-Guards): belegt, dass Schritt 6 den Zustand prüft und
  einen Direct-Merge-Fallback dokumentiert.
- `docs/factory/PROJECT-CONTEXT.md`: Stolperstein-Eintrag zum repo-weiten
  Setting *Allow auto-merge* (`allow_auto_merge`).

**Nicht inbegriffen:**
- Keine Änderung an der `.claude/settings.json`-Allow-Liste (`gh pr merge:*` ist
  bereits freigegeben, deckt `--squash` ohne `--auto` mit ab).
- Keine Änderung an Schritt 1–5 oder an der Reihenfolge-Guardrail (#114): Die
  Abschlussnotiz wird weiterhin **vor** jedem Merge-Aufruf committet+gepusht.
- Kein aktives Warten/Polling auf Checks in der Session.

## Akzeptanzkriterien

- [ ] **AC1 – Zustandsprüfung:** GIVEN pr-shepherd Schritt 6 ist erreicht (Schritt
  2–5 grün) WHEN der Merge freigegeben wird THEN wird zuvor der PR-Merge-Zustand
  über `gh pr view --json mergeStateStatus` (ggf. `,mergeable`) ausgelesen.

- [ ] **AC2 – Direct-Merge bei bereits mergebarem PR:** GIVEN der PR ist bereits
  mergebar (`mergeStateStatus: CLEAN`) WHEN Schritt 6 den Merge freigibt THEN
  wird ein **direkter** `gh pr merge --squash` (ohne `--auto`) verwendet, sodass
  GitHub den Merge nicht mit *„Pull request is in clean status"* ablehnt.

- [ ] **AC3 – Auto-Merge bei laufenden Checks:** GIVEN der PR ist noch nicht
  mergebar, weil required Checks laufen (`mergeStateStatus` ≠ `CLEAN`, kein
  Konflikt) WHEN Schritt 6 den Merge freigibt THEN wird wie bisher
  `gh pr merge --auto --squash` verwendet (wartet GitHub-seitig auf die Checks).

- [ ] **AC4 – Reihenfolge-Guardrail bleibt (#114):** GIVEN Schritt 6 wird
  ausgeführt WHEN die Abschlussnotiz geschrieben wird THEN wird sie über
  `scripts/factory-commit.sh` committet **und** gepusht, **bevor** einer der
  Merge-Aufrufe (`gh pr merge --squash` bzw. `--auto --squash`) erfolgt.

- [ ] **AC5 – Konsistenz-Test:** GIVEN `scripts/checks/tests/run-tests.sh` läuft
  WHEN die pr-shepherd-Guards geprüft werden THEN existiert ein Test, der (a) die
  Zustandsprüfung `mergeStateStatus` in Schritt 6 nachweist und (b) den
  Direct-Merge-Fallback (`gh pr merge --squash` ohne `--auto` im Schritt-6-
  Abschnitt) nachweist – jeweils mit Positiv- **und** Negativ-Beleg.

- [ ] **AC6 – Stolperstein dokumentiert:** GIVEN `docs/factory/PROJECT-CONTEXT.md`
  WHEN ein Entwickler die bekannten Stolpersteine liest THEN findet er den
  Hinweis, dass das repo-weite Setting *Allow auto-merge* (`allow_auto_merge`)
  aktiv sein muss, sonst scheitert `gh pr merge --auto` grundsätzlich (blockiert
  auch die Stage-3-Pipeline).

## Fehlerszenarien

- [ ] **Fail-closed bei rotem PR:** Schlägt der direkte `gh pr merge --squash`
  fehl, weil die required Checks doch rot sind, blockiert das GitHub-Ruleset
  `protect-main` den Merge weiterhin – kein Umgehen der Checks durch den direkten
  Merge.
- [ ] **Umsetzung über Patch-Workflow:** `.claude/commands/pr-shepherd.md` ist für
  den Agenten hard-denied (#88). Die Änderung wird als `tasks/patch-158.diff`
  programmatisch erzeugt (kein Handschreiben – #94), mit `git apply --check`
  read-only verifiziert und gegen eine Temp-Kopie auf die AC-Assertions geprüft
  (#91/#94). Blocker in der Task-Datei protokollieren, Mensch wendet den Patch an.
- [ ] **Kein Fehl-Match im Order-Guard:** Der neue Direct-Merge-Grep (`gh pr merge
  --squash`) darf nicht fälschlich die `--auto --squash`-Zeile matchen; die
  bestehende #114-Reihenfolge-Assertion darf durch den zweiten Merge-Zweig nicht
  brechen (Abschlussnotiz-Zeile bleibt vor **beiden** Merge-Zeilen).

## Offene Fragen

- [ ] Feinschnitt der Zustands-Bedingung (nur `CLEAN` → direkt, alles andere →
  `--auto`, oder zusätzliche States wie `UNSTABLE`/`BLOCKED` berücksichtigen) →
  wird in `/architecture` entschieden. Empfehlung: `mergeStateStatus == CLEAN`
  als präzises Signal für den `--auto`-Ablehnungsfall, sonst fail-closed `--auto`.
