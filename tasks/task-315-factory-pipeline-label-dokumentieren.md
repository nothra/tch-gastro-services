# Task 315: factory-pipeline-label-dokumentieren

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Das Repo-Label `factory_pipeline` existiert auf GitHub (13 Zuordnungen), ist aber in keiner
getrackten Datei dokumentiert. Weil der Seam `scripts/lib/create-issue.sh` Labels bewusst
nicht validiert (ADR-018 §3), ist die Doku die einzige Instanz, die ein Label „anbietet" –
ein undokumentiertes Label wird weder von einem Menschen noch von einem Skill vergeben (siehe
#314: musste manuell nachgetragen werden).

Diese Task nimmt das Label in die kanonische Konvention auf (`docs/factory/guidelines/
git-workflow.md` → „GitHub-Labels") und zieht alle abgeleiteten Aufzählungen mit. Zugleich
wird das Label auf **kebab-case** umbenannt: `factory_pipeline` → `factory-pipeline`.

Spec mit Kontext, Scope-Grenzen und den vier Phase-1-Entscheidungen:
[`docs/specs/spec-315-factory-pipeline-label-dokumentieren.md`](../docs/specs/spec-315-factory-pipeline-label-dokumentieren.md)

## Akzeptanzkriterien

- [x] **AK1** GIVEN das Label `factory_pipeline` mit 13 Zuordnungen, WHEN es auf
      `factory-pipeline` umbenannt ist, THEN führt `gh label list` nur den neuen Namen und
      `gh issue list --label factory-pipeline --state all` liefert dieselben 13 Issues.
- [x] **AK2** GIVEN die Aspekt-Label-Tabelle in `git-workflow.md`, WHEN sie gelesen wird,
      THEN enthält sie eine Zeile `factory-pipeline` mit dem Abgrenzungskriterium
      Factory-Harness vs. TCH-Applikation.
- [x] **AK3** GIVEN der neue Zeilen-/Begleittext, WHEN ein Leser ein Issue einordnen muss,
      THEN benennt der Text beide Seiten der Grenze mit Pfad-Ankern (Factory: `scripts/`,
      `.claude/`, `.github/workflows/`, `docs/factory/` – App: `app/`, `db/`, `lib/`), löst
      den Mischfall einseitig fail-safe auf („Im Zweifel Label setzen", inkl. der ungedeckten
      Pfade – u. a. `docs/specs/`) und bleibt die einzige Stelle mit der Anker-Liste.
- [x] **AK4** GIVEN die zwei abgeleiteten Aufzählungen in `git-workflow.md` selbst
      (Faustregel-Absatz, `start-work.sh`-Absatz), WHEN sie gelesen werden, THEN nennen beide
      `factory-pipeline` mit.
- [x] **AK5** GIVEN die Beitragsarten-Aufzählung in `CONTRIBUTING.md`, WHEN sie gelesen wird,
      THEN nennt sie Factory-/Harness-Beiträge mit Aspekt-Label `factory-pipeline`, ohne den
      Verweis auf die kanonische Quelle zu verlieren.
- [x] **AK6** GIVEN Schritt 3 in `OPERATING.md` §1.1, WHEN er gelesen wird, THEN nennt er
      `factory-pipeline` UND trennt Art-Label (genau eines) von Aspekt-Labels (null bis
      mehrere) statt der heutigen flachen „genau eins"-Liste.
- [x] **AK7** GIVEN der `FACTORY_ASPECT_LABELS`-Kopfkommentar (`scripts/start-work.sh:29`),
      WHEN er gelesen wird, THEN enthält er `factory-pipeline`; die `--labels`-Usage-Meldung
      (Zeile 64) bleibt als Beispiel unverändert.
- [x] **AK8** GIVEN `codify.md`, `review.md`, `security-review.md`, WHEN die jeweilige
      Aspekt-Aufzählung gelesen wird, THEN nennt jede `factory-pipeline` – geliefert über den
      Patch-Workflow für `.claude/**`. *(Patch am 2026-08-27 durch den Menschen via `git apply`
      angewandt; alle vier zuvor roten Assertions grün.)*
- [x] **AK9** GIVEN `scripts/checks/tests/run-tests.sh`, WHEN sie läuft, THEN prüft ein neuer
      Test alle sieben Fundstellen auf `factory-pipeline`, je Fundstelle per Mutation als
      wirksam belegt.
- [x] **AK10** GIVEN dieselbe Suite, WHEN sie läuft, THEN schlägt sie fehl, sobald der alte
      Name `factory_pipeline` in einer **getrackten** Datei auftaucht (Scan über
      `git ls-files`, nicht über das Verzeichnis) – ausgenommen die Papierspur dieser Task
      (`docs/specs/spec-315-*`, `tasks/*315*`), je Ausnahme mit einer Kontrolle in beide
      Richtungen und fail-closed gegen still gescheitertes Fixture-Scaffolding.
- [x] **AK11** GIVEN Titel und Body von Issue #315 nennen den alten Namen, WHEN der Rename
      erfolgt ist, THEN sind beide auf `factory-pipeline` gezogen.

## Technische Notizen

**Kein ADR nötig** – keine Technologie-/Schnittstellen-/irreversible Entscheidung; die
Konvention ist selbst kanonische Quelle in `git-workflow.md`, ADR-018 §3 bleibt unberührt.
`/architecture` wird übersprungen, direkt `/implement`.

Fundstellen (verifiziert am 2026-08-27):

| Datei | Stelle | Art |
|-------|--------|-----|
| `docs/factory/guidelines/git-workflow.md` | 128–132 (Tabelle), 146, 151 | **kanonisch** + 2 abgeleitete |
| `CONTRIBUTING.md` | 85–89 | abgeleitet |
| `docs/factory/OPERATING.md` | 191–192 | abgeleitet (**+ vorbestehende Drift**) |
| `scripts/start-work.sh` | 29 (vollständige CSV), 64 (Beispiel – bleibt) | abgeleitet |
| `.claude/commands/codify.md` | 68–69 | abgeleitet, Patch-Workflow |
| `.claude/commands/review.md` | 82–83 | abgeleitet, Patch-Workflow |
| `.claude/commands/security-review.md` | 78–79 | abgeleitet, Patch-Workflow |

Zwei Fundstellen hat die Issue **nicht** genannt: `OPERATING.md:191-192` (dort zusätzlich die
falsche „genau eins"-Klammer über beide Achsen) und die zwei Inline-Aufzählungen in
`git-workflow.md` selbst.

Bewusst **nicht** angefasst: `docs/adr/018-central-issue-seam.md:30` und
`docs/specs/spec-82-issue-seam.md:18,39` – historische Problembeschreibung des Zustands vor
dem Seam, kein Present-Tense-Mechanik-Text.

Reihenfolge in `/implement`: Rename **zuerst** (fail-closed – schlägt er fehl, wird nichts
committet), dann Doku + Guard im selben PR.

### Nachweise (2026-08-27)

- **AK1:** `gh label list` führt `factory-pipeline` und kein `factory_pipeline` mehr;
  `gh issue list --label factory-pipeline --state all` liefert **13** Issues (Stichtag der
  Messung: 2026-08-27 vormittags) – die Zuordnungen hat GitHub beim Rename mitgezogen. Eine
  spätere Zählung kann höher liegen, weil unabhängig von dieser Task weiter gelabelt wird
  (#316 kam so hinzu).
- **AK9/AK10:** Suite-Lauf ohne exportierte `PR_SHEPHERD`/`FACTORY_STAGE` (Lesson #262) und
  nach dem Entfernen der Scratch-Artefakte (Lesson #312): **1242 grün, 4 rot** – die vier roten
  sind ausschließlich die `.claude/**`-Assertions, die auf das `git apply` warten (AK8). Alle
  übrigen #315-Assertions inkl. der Mutations-, Fail-closed- und Diskriminierungs-Kontrollen
  sind grün.
- **AK8-Vorarbeit:** `git apply --check tasks/patch-315.diff` grün; zusätzlich auf Temp-Kopien
  angewandt und die AK-Greps dagegen laufen lassen („Green nach Apply" belegt, ohne die
  hard-denied Live-Dateien anzufassen – Lesson #94). Der Patch wurde **programmatisch** über
  `difflib.unified_diff` erzeugt, nicht von Hand getippt.
- **AK11:** Titel und Body von #315 nennen den alten Namen 0×, den neuen 6×. Punkt 2 der
  Phase-1-Fragen wurde nicht blind ersetzt, sondern als *entschieden* umformuliert – ein
  Blind-Replace hätte daraus die falsche Aussage „kebab-case mit Unterstrich" gemacht.

- **Abschluss-Gate-Lauf (2026-08-27, nach dem `git apply`):** Bash-Self-Test-Suite **1246 grün,
  0 rot**; `scripts/checks/pre-push.sh` grün (Vitest 736 passed/59 skipped, Typecheck, Prettier,
  Routen-Doku-Drift, Hooks-Check, Branch-Guard). Scratch-Artefakte vor dem Lauf entfernt
  (Lesson #312), `PR_SHEPHERD`/`FACTORY_STAGE` unset (Lesson #262).

**Blocker 2026-08-27: erledigt.** `.claude/**` ist für den Agenten hard denied
(`Edit(.claude/**)`, #88-Grenze) – die drei Skill-Doku-Änderungen lagen deshalb als Patch
bereit. Der Mensch hat `git apply tasks/patch-315.diff` ausgeführt; die vier zuvor roten
Assertions sind grün (Suite-Ergebnis: 1246 grün, 0 rot), `tasks/patch-315.diff` wurde entfernt.

## Offene Fragen

_Keine._ Alle vier Phase-1-Fragen der Issue sind interaktiv entschieden (Tabelle in der Spec).

## Review-Findings

Runde 1 (`tasks/review-315.md`, Empfehlung **NEEDS_REWORK**) – Rework am 2026-08-27:

| # | Finding | Status |
|---|---------|--------|
| K1 | AK8 nicht angewandt → Suite/CI rot | behoben: Patch am 2026-08-27 durch den Menschen via `git apply` angewandt, Suite 1246/0 |
| K2 | Implementierung unkommittiert, Folge-Skills sähen leeren Diff | behoben: Rework-Commit `87bf67f` committet **und** nach `origin/docs/315-…` gepusht (2026-08-27); `git diff origin/main...HEAD` zeigt alle elf Dateien |
| K3 | AK10-Allowlist deckt nur zwei der #315-Papierspuren → Falle für die eigene Pipeline | behoben: Pfadspec auf `tasks/*315*` geweitet (deckt Review-/Security-/Coverage-/Codify-Report), Begründung im WHY-Kommentar; je Ausnahme-Pfadspec eine Kontrolle in beide Richtungen |
| W1 | AK10-Live-Scan fail-open (`2>/dev/null` + leerer Output = grün) | behoben: `2>/dev/null` entfernt, Positivkontrolle mit derselben Aufrufform auf den **neuen** Namen läuft **vor** der Abwesenheits-Assertion |
| W2 | Mutationsbeleg je Fundstelle tautologisch (`grep -v X` → `grep X`) | behoben: Mutations-Anker ist jetzt die **beschreibende** Zeile (ohne Label-Name), geprüft wird die Phrase, die Label **an** Beschreibung bindet – verschiedene Prädikate; „Mutation greift wirklich" misst die Zeilenzahl statt das Suchmuster |
| W3 | Tie-Break für den Mischfall zirkulär, Anker-Listen decken Repo-Wurzel/`docs/adr/`/`tasks/`/`e2e/` nicht | behoben: Zweifelsregel **„Im Zweifel Label setzen"** analog zu „im Zweifel Issue", ungedeckte Pfade explizit benannt; zwei neue AK3-Assertions |
| N1 | codify.md/review.md nur per Ganzdatei-Grep abgesichert | behoben: beide haben jetzt eine spezifische Kontext-Phrase (siehe W2) |
| N2 | Abschnitts-Header „welche Dimension zusätzlich?" widerspricht dem neuen Blockquote | behoben: „welche Dimension **bzw. welches Subsystem** zusätzlich?" |
| N3 | Falsche Kausalkette im WHY-Kommentar zu `hi_repo` | behoben: echter Grund ist die bereits abgeräumte Basis `$TMP_HI` |
| N4 | Kommentar sagt „gitignoret", der Fixture stellt nur „ungetrackt" her | behoben |
| N5 | Scratch-Artefakte `scripts/*315*.tmp.*` färben den #312-Guard lokal rot | behoben: entfernt; Suite jetzt 1242/4 statt 1241/5 |

Runde 3 (`tasks/review-315.md`, Empfehlung **NEEDS_REWORK** ohne kritisches Finding,
Circuit-Breaker-Hinweis) – Rework am 2026-08-27 nach Weg 1 der Review-Empfehlung:

| # | Finding | Status |
|---|---------|--------|
| K–  | keine kritischen Findings | – |
| W1 | Spec kennt weder die AK10-Allowlist noch die Zweifelsregel → Guard widerspricht dem eigenen Anforderungsdokument (Lesson #253/#211/#176) | behoben: AK3 um Zweifelsregel + „Anker nur in der kanonischen Quelle", AK10 um Allowlist-Ausnahme, Beidseitigkeits-Kontrolle und Fail-closed-Forderung ergänzt; dieselben zwei AKs in der Task-Datei mitgezogen |
| W2 | `CONTRIBUTING.md:88` kopiert die Factory-Pfad-Anker wörtlich, ungeschützt gegen Drift | behoben: Kopie durch Verweis auf `git-workflow.md` ersetzt; neue Assertion sichert die Abwesenheit ab, eine Positivkontrolle mit **derselben** Phrase gegen `git-workflow.md` belegt, dass der Ausdruck überhaupt findet (RED-vor-GREEN gemessen: genau diese eine Assertion war vor dem Fix rot) |
| W3 | Fail-closed-Härtung nur am Live-Scan, nicht an den vier auf Leere prüfenden Fixture-Assertions | behoben: neuer Helfer `assert_scan_clean_315` prüft je Aufruf zuerst, dass genau die Fixture-Datei getrackt ist; Mutationsbeleg über ein initialisiertes, aber uncommittetes Repo, in dem die Datei mit dem verbotenen Namen im Baum liegt – dort divergieren die beiden Prädikate nachweislich |
| N1–N5 | Nitpicks | N3 (stale `#316`-Randnotiz, Lesson #176) behoben – in Spec, Task-Datei und AK1-Nachweis, letzterer mit Stichtag. Ebenfalls behoben: der `/codify`-Hinweis nennt jetzt auch `kleinfunde.md` – ein Eintrag dort, der den alten Namen zitiert, kippt die Suite genauso, und `/codify` läuft in dieser Pipeline noch. Bewusst offen gelassen: Teilstring-Anker (4 von 7 tragen), Singular im Mutationslabel, `tasks/*315*` breiter als nötig – ohne Wirkung im aktuellen Repo-Zustand |

Runde 5 (`tasks/review-315.md`, Empfehlung **APPROVED**, Circuit Breaker gezogen –
kein weiterer `/implement`-Lauf) – Fixes am 2026-08-27 im `/test`-Schritt:

| # | Finding | Status |
|---|---------|--------|
| W1 | `run-tests.sh:6726-6728`: die Zweifelsregel-Assertion deckt nur bis `` `e2e/` ``, die neue `docs/specs/`-Phrase (Runde-4-W1-Fix) steht ungeguardet auf der nächsten Blockquote-Zeile – ein Rückfall bliebe grün | behoben (im `/test`-Scope, reiner Test-Fix): eigene Assertion auf die `docs/specs/`-Phrase ergänzt, bestehendes Assertion-Label auf die vier tatsächlich geprüften Pfade (Repo-Wurzel, ADR, tasks, e2e) verengt; Suite 1255/0, `pre-push.sh` grün |
| W2 | `git-workflow.md:155` „siehe z. B. diese Spec selbst" ist in der kanonischen Guideline ein Verweis ins Nichts (aus dem Spec-Text mitkopiert) | **offen** – Produktionsdoku-Änderung, außerhalb des `/test`-Scopes („kein Produktionscode ändern in diesem Schritt"); vor dem Merge zu entscheiden |
| W3 | AK3-Nachzug an der Task-Datei war uncommittet, Pipeline hatte bereits `INCOMPLETE_OUTCOME` interrupted | behoben: mit diesem Commit zusammen mit dem W1-Testfix committet |
| W4 | Pfad-Anker ohne „ab der Repo-Wurzel gelesen"-Zusatz, im Widerspruch zur neuen Codify-Lesson | **offen** – Produktionsdoku-Änderung, außerhalb des `/test`-Scopes |

Nitpicks aus Runde 5 unverändert offen (Details in `tasks/review-315.md`): stale W1-Stand in
`codify-315.md:39-44`, PR #317 trägt keine Labels, `CONTRIBUTING.md`-Anti-Duplikat-Guard nur
für die Factory-Anker.

## Codify-Notizen

**Ausgeführt am 2026-08-27** – vollständiger Report in [`tasks/codify-315.md`](codify-315.md).
Neue Lesson: „Anker-Liste einer Fail-safe-Klassifizierungsregel braucht einen Verteilungs-Check
gegen den echten Repo-Inhalt" (`docs/factory/lessons/factory-workflow.md`, Index-Zeile in
`PROJECT-CONTEXT.md`) – aus Review-Runde-4-Finding W1 (`docs/specs/`-Anker fälschlich der
App-Seite zugeordnet). Der Fund selbst (W1) ist damit **nicht** behoben, nur das
Erkenntnismuster festgehalten – die Entscheidung zwischen Sofort-Fix und Issue-als-Schuld
bleibt beim Menschen (siehe Review-Empfehlung, Runde 4).

**Entscheidung des Menschen (2026-08-27): Option 1 – sofort fixen.** `docs/specs/` aus dem
App-Anker in die „ungedeckt"-/Zweifelsregel-Liste verschoben (`git-workflow.md:148/153`),
`spec-315` AK3 mitgezogen, Assertion in `run-tests.sh` angepasst. Suite 1254/0,
`pre-push.sh` grün. W1 in `tasks/review-315.md` auf erledigt gesetzt.

**Nachzug 2026-08-27 (`/implement`):** Die Fundstellen-Liste der Review-Empfehlung (Weg 1)
nannte drei Dateien – die **Task-Datei selbst** stand nicht darauf, und ihr AK3 führte
`docs/specs/` weiter auf der App-Seite. Damit widersprach die Task-Datei der kanonischen
Quelle, der Spec und dem Guard. AK3 hier nachgezogen. Muster für künftige Sweeps: Eine
Fundstellen-Liste, die ein Review für einen Fix aufstellt, deckt die **eigene Papierspur**
(Task-/Review-/Spec-Datei) nicht automatisch mit ab – nach dem Fix denselben Grep über
`tasks/` laufen lassen (verwandt mit Lesson #211/#176/#253).

**Hinweis an `/codify` (Konsequenz aus Review-Finding K3):** Die AK10-Allowlist nimmt bewusst
nur `docs/specs/spec-315-*` und `tasks/*315*` aus. `docs/factory/lessons/*`,
`PROJECT-CONTEXT.md` und `docs/factory/kleinfunde.md` sind **nicht** ausgenommen – sie sind
lebende Konventions- bzw. Sammel-Dokumente. Eine Lesson oder ein Kleinfunde-Eintrag zu dieser
Task verweist deshalb auf Task/Spec, statt den alten Label-Namen selbst zu buchstabieren;
sonst wird die Suite rot.

Randnotiz (nicht Scope): #285 sowie ggf. #166 sind Factory-Arbeit ohne das Label (Stand
2026-08-27; #316 ist inzwischen unabhängig von dieser Task gelabelt).

---
Branch: `docs/315-factory-pipeline-label-dokumentieren`
Erstellt: 2026-08-27 13:49
