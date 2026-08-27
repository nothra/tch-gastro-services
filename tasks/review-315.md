# Review: Task 315

> **Runde 4** (nach dem Rework-Commit `3d0b512` zu den Runde-3-Findings).
> Gegenstand: `git diff origin/main...HEAD` = **11 Dateien**, Commits `9ac7466`, `2436a94`,
> `87bf67f`, `87432f5`, `3d0b512`. Spec:
> `docs/specs/spec-315-factory-pipeline-label-dokumentieren.md`. PR **#317** (Draft, Body
> enthält `Closes #315`). Drei Blickwinkel (Backend/Logik · Code-Qualität · Architektur/Patterns)
> im Orchestrator-Kontext gefahren – ohne Fork-Delegation (Lesson #298/#267).
>
> **Verifikationsbasis dieser Runde (alles selbst gemessen, nichts aus Runde 3 übernommen):**
> - Bash-Self-Test-Suite ohne exportierte `PR_SHEPHERD`/`FACTORY_STAGE` (Lesson #262):
>   **1254 grün, 0 rot** (53 davon `#315`-Assertions).
> - `scripts/checks/pre-push.sh` **grün**: Vitest 736 passed/59 skipped, Typecheck, Prettier
>   („All matched files use Prettier code style!"), Routen-Doku-Drift, Hooks-Check, Branch-Guard.
> - `git status --ignored`: vor dem Lauf sauber – das in Runde 3 gemeldete
>   `scripts/revrun.tmp.sh` ist weg (Lesson #312).
> - **AK1:** `gh label list` führt `factory-pipeline` (`#7583cf`); ein Label `factory_pipeline`
>   existiert nicht mehr (`gh issue list --label factory_pipeline` läuft ins Leere).
> - **AK11:** Titel und Body von #315 nennen den alten Namen **0×**, den neuen 6×.
> - **Unabhängiger Sweep** mit zwei anderen Begriffen als Runde 3 (`git grep -F 'Aspekt-Label'`
>   und `git grep -F tech-debt` über alle getrackten Dateien, plus Sichtung des `.github/`-Baums
>   auf Issue-Templates – es gibt keine): **keine weitere Present-Tense-Aufzählung** ohne das
>   Label. `ADR-018:30` und `spec-82:18,39` bleiben belegbar historisches Narrativ.
>
> **Status der Runde-3-Findings – alle drei geschlossen, einzeln nachgemessen:**
>
> | Runde-3-Finding | Status in Runde 4 |
> |---|---|
> | W1 – Spec kennt weder Allowlist noch Zweifelsregel | **behoben** – `spec-315:83-88` (AK3) und `:120-126` (AK10) tragen beides; Code und Spec sagen jetzt dasselbe |
> | W2 – `CONTRIBUTING.md` dupliziert die Pfad-Anker | **behoben** – `CONTRIBUTING.md:88-90` verweist statt zu kopieren; `assert_absent` + Positivkontrolle mit derselben Phrase gegen `git-workflow.md` (`run-tests.sh:6750-6754`) |
> | W3 – Fixture-Assertions ohne Fail-closed | **behoben und per eigener Mutation belegt**: `tracked_repo_315` ohne `git add` nachgestellt → `assert_scan_clean_315` wird rot (`✗ … trägt … wirklich getrackt`), während die Abwesenheits-Assertion allein grün bliebe. Genau die Divergenz, die W3 gefordert hat |
> | N3 – stale `#316`-Randnotiz | **behoben** in Spec, Task-Datei und AK1-Nachweis (letzterer mit Stichtag – heute stehen 16 Issues am Label, die Stichtags-Formulierung fängt das korrekt ab) |

## Kritische Findings (müssen behoben werden)

_Keine._ Alle elf Akzeptanzkriterien sind erfüllt und nachgemessen, alle Gates grün, der Branch
ist gepusht, der PR-Body trägt `Closes #315`. Kein Merge-Blocker.

## Wichtige Findings (sollten behoben werden)

- [x] **`docs/factory/guidelines/git-workflow.md:148` – `docs/specs/` ist als Pfad-Anker der
      *Applikations*-Seite gelistet, obwohl rund die Hälfte dieses Verzeichnisses
      Factory-Harness-Arbeit dokumentiert – die Spec dieses PRs eingeschlossen.** *(Behoben
      2026-08-27: `docs/specs/` aus dem App-Anker in die „ungedeckt"-/Zweifelsregel-Liste
      verschoben – `git-workflow.md:148/153`, `spec-315` AK3, `run-tests.sh` Assertion
      mitgezogen. Suite 1254/0, `pre-push.sh` grün.)* (Neu in
      Runde 4; die drei Vorrunden haben die Anker-Listen auf Vollständigkeit und
      Nicht-Duplizierung geprüft, aber nie gegen den realen Repo-Inhalt.)
      Gemessen am 2026-08-27:
      - `docs/specs/` enthält **78** Specs; **40** davon referenzieren Factory-Artefakte
        (`run-pipeline.sh`, `.claude/commands`, `scripts/checks`, `factory-poll.sh`,
        `pr-shepherd`). Kein anderes Verzeichnis der beiden Anker-Listen ist annähernd so
        gemischt – `app/`, `db/`, `lib/`, `docs/factory/`, `.github/workflows/` sind es nicht.
      - Von den **16** Issues, die das Label heute tragen, haben **4** ihre Spec dort
        (#267, #310, #312, **#315**). `/requirements` legt jede Spec unter `docs/specs/` ab,
        unabhängig davon, ob die Task Werkzeug oder Produkt betrifft – der Anker beschreibt
        also eine Ablagekonvention, keine Subsystem-Grenze.
      **Warum das nicht kritisch ist:** Die Zweifelsregel fängt jeden real vorkommenden Fall.
      Eine Factory-Task berührt praktisch immer zusätzlich `scripts/`, `.claude/` oder
      `docs/factory/` → „berührt beide Seiten" → Label wird gesetzt. Für #315 selbst greift
      genau das.
      **Warum es trotzdem zählt:** AK3 verlangt eine Zuordnung *ohne Rückfrage*, und der Text
      lehrt hier eine falsche Regel („Specs sind App"). Der Fall, in dem sie durchschlägt, ist
      konstruierbar und im Repo plausibel: ein Issue, das **nur** eine Factory-Spec anfasst
      (z. B. „spec-284 auf den Stand nach der Stilllegung ziehen"). Dort matcht ausschließlich
      der App-Anker, es entsteht **kein** Zweifel – und das Label fällt weg. Genau die
      Unsichtbarkeit im Backlog, die diese Task abschaffen soll.
      **Fix (klein, aber dreistellig verteilt):** `docs/specs/` aus der App-Liste nehmen und in
      die „von keiner Liste gedeckt"-Aufzählung in `:150-153` verschieben – dann fällt der
      Fall unter „Im Zweifel Label setzen", was die fachlich richtige Auflösung ist. Mitzuziehen
      sind `spec-315:82-83` (AK3 zählt den Anker wörtlich auf) und die Assertion
      `run-tests.sh:6717-6719`. Drei Stellen, je eine Zeile – **kein** `/implement`-Lauf nötig.

## Nitpicks (optional)

- [ ] `scripts/checks/tests/run-tests.sh:6788` – der WHY-Kommentar verweist auf „ADR-018 §30".
      Gemeint ist `docs/adr/018-central-issue-seam.md:**30**` (Zeilennummer), nicht ein
      Paragraf 30 – die ADR hat keinen. Spec und Task-Datei schreiben an derselben Stelle
      korrekt `docs/adr/018-central-issue-seam.md:30`.
- [ ] `git-workflow.md:147-148` – die Anker sind nicht als **Repo-Wurzel-Präfixe** ausgewiesen.
      Als freier Teilstring gelesen matcht `scripts/lib/create-issue.sh` sowohl den
      Factory-Anker `scripts/` als auch den App-Anker `lib/`. Ein Halbsatz („jeweils ab der
      Repo-Wurzel") räumt das ab.
- [ ] `git-workflow.md:153` – `e2e/` steht unter „von keiner der beiden Listen gedeckt", ist
      aber Playwright-Abdeckung der **App** und damit nicht wirklich zweifelhaft. Die
      Zweifelsregel labelt eine reine E2E-Task damit als Factory-Arbeit. Bewusst in Kauf
      genommene Kosten der Fail-safe-Richtung („kostet einen Filterklick") – erwähnenswert nur,
      weil `e2e/` neben echten Grenzfällen wie `docs/adr/` und der Repo-Wurzel steht.
- [ ] `scripts/checks/tests/run-tests.sh:6855` und `:6881` – `assert_scan_clean_315` läuft
      zweimal gegen dasselbe `REPO_NEW_315`, die Fail-closed-Zeile erscheint doppelt im
      Protokoll. Korrekt, aber die zweite Prüfung ist redundant (die Datei kann zwischen den
      beiden Aufrufen nicht ungetrackt werden).
- [ ] Unverändert offen aus Runde 3, dort bewusst so entschieden und hier bestätigt: der
      Mutations-Anker ist bei 3 der 7 Fundstellen ein Teilstring der geprüften Phrase
      (`CONTRIBUTING.md`, `OPERATING.md`, `start-work.sh`), das Mutations-Label steht im
      Singular, und `tasks/*315*` ist breiter als `tasks/*-315.md`. Alle drei ohne Wirkung im
      aktuellen Repo-Zustand.
- [ ] Aufräumen: `scripts/rev4run.tmp.sh`, `scripts/rev4mut.tmp.sh`, `scripts/rev4anchor.tmp.sh`
      und `scripts/rev4out.tmp.txt` stammen aus dieser Runde (Suite-Lauf ohne
      `/tmp`-Redirection, Mutationsprobe, Anker-Messung). Gitignoret, kein CI-Problem – werden
      am Ende dieser Runde entfernt (Lesson #312).

## Positives

- **Alle drei Runde-3-Findings sind wirklich geschlossen, nicht nur als geschlossen erklärt.**
  Bei W3 habe ich die behauptete Wirksamkeit nachgestellt statt sie zu glauben: `git add` aus
  `tracked_repo_315` entfernt → die neue Kontrolle wird rot, die Abwesenheits-Assertion allein
  bliebe grün. Genau die Divergenz, um die es ging (Lesson #286: derselbe Assert-Ausdruck,
  negiert).
- **Der W2-Fix behandelt die Ursache statt das Symptom.** `CONTRIBUTING.md` verweist jetzt auf
  die kanonische Quelle, statt die Anker zu kopieren – und die Absicherung ist symmetrisch
  gebaut: dieselbe Phrase als Positivkontrolle gegen `git-workflow.md`, als Abwesenheits-
  Assertion gegen `CONTRIBUTING.md`. Ein umformulierter Anker-Satz macht die Kontrolle rot,
  bevor die Abwesenheits-Assertion falsch-grün werden kann.
- **Spec und Implementierung sind wieder deckungsgleich** (Lesson #253/#211/#176). AK3 und AK10
  tragen jetzt Zweifelsregel, Allowlist-Ausnahme, Beidseitigkeits-Kontrolle und die
  Fail-closed-Forderung – die Guards nageln keinen Sollzustand mehr fest, der nirgends
  geschrieben steht.
- **Der Fundstellen-Sweep hält einer dritten, unabhängigen Suche stand.** Mit `Aspekt-Label` als
  Suchbegriff und einer Sichtung des `.github/`-Baums (keine Issue-Templates vorhanden) findet
  sich keine achte Fundstelle. Die drei `create_issue_idempotent`-Codebeispiele in den
  Skill-Dokus bleiben korrekt Beispiele – dieselbe Disziplin wie bei der `--labels`-Usage-Zeile
  in AK7.
- **Die Selbstreferenz-Falle bleibt elegant gelöst** (`printf '\137'`), und der AK10-Scan liest
  über `git grep` ausschließlich getrackte Dateien – meine vier Scratch-Artefakte in `scripts/`
  haben ihn nicht rot gefärbt, obwohl eines davon den alten Namen im Klartext enthält. Das ist
  Lesson #312 in Aktion, nicht nur zitiert.
- **Kein ADR-Trigger, `docs/routes.md` unberührt** (keine Routen-Änderung), keine
  Schicht-Verletzung, `scripts/lib/create-issue.sh` bleibt validierungsfrei (ADR-018 §3) – es
  ist keine zweite kanonische Label-Liste im Code entstanden. Die Scope-Grenze der Spec hält.

## Empfehlung

APPROVED

**Begründung der Einstufung – bewusst nicht `NEEDS_REWORK`:** Es gibt kein kritisches Finding,
alle elf AKs sind erfüllt, beide Gates sind grün und der PR ist mergefähig. Der
Circuit Breaker ist mit Runde 3 gezogen worden; ein weiteres `NEEDS_REWORK` würde die
Iterationsschleife nur formal weiterdrehen, obwohl der verbleibende Punkt eine
Drei-Zeilen-Doku-Korrektur ist. Runde 3 hat `NEEDS_REWORK` mit dem Zusatz „bedeutet hier nicht
zurück an `/implement`" vergeben – dieses maschinengelesene Feld so zu überschreiben ist
schlechter als eine ehrliche Freigabe mit offener Notiz.

**Entscheidung für den Menschen (W1):** zwei vertretbare Wege –

1. **Empfohlen: die drei Zeilen jetzt ziehen.** `docs/specs/` aus dem App-Anker in die
   „ungedeckt"-Liste verschieben, `spec-315` AK3 und die Assertion `run-tests.sh:6717-6719`
   mitziehen. Reine Doku-/Test-Edits, kein `/implement`. Danach Suite + `pre-push.sh`,
   committen, weiter zu `/test`.
2. **Als Schuld akzeptieren:** W1 als eigenes Issue führen (`documentation` + `tech-debt` +
   `factory-pipeline`) und sofort zu `/test`. Vertretbar – die Zweifelsregel deckt jeden heute
   existierenden Fall. Für `kleinfunde.md` ist der Fund zu wirksam: er betrifft die kanonische
   Quelle selbst.

**In beiden Fällen vorher:** die vier `scripts/rev4*.tmp.*`-Artefakte entfernen (Lesson #312).
