# Review: Task 447

Diff-Basis: `git diff origin/main...HEAD` (6 Dateien, +226/−37). Geprüft gegen
`docs/specs/spec-447-undici-7-30-1-ghsa-xjj6.md` (AK1–AK12). Wegen des kleinen Diffs wurden die drei
Runden direkt im Orchestrator-Kontext gefahren (keine Fork-Delegation, Lesson #298/#267).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [Issue #447, Labels] Aspekt-Label `factory-pipeline` fehlt (Issue trägt nur `enhancement`,
  `security`). Der PR berührt `scripts/checks/tests/run-tests.sh` und `docs/factory/kleinfunde.md` –
  beide unter den Factory-Ankern (`scripts/`, `docs/factory/`); PROJECT-CONTEXT → „Projekt-Labels"
  verlangt bei beiden Seiten berührt das Label („im Zweifel setzen"). Die offene Frage in Task-Datei
  und Spec ist damit beantwortet. Kein Code-Rework – Label-Nachzug per `gh issue edit 447 --add-label
  factory-pipeline` vor `/pr-shepherd`, danach die offene Frage in Task-Datei und Spec abhaken.

## Nitpicks (optional)

- [ ] [scripts/checks/tests/run-tests.sh:5142-5145] Der Sammel-Kommentar über die Floor-Hebungen
  (#337 → #339 → #390) bekommt keine #447-Zeile; die #447-Notiz steht nur weiter unten am
  `floor_cases_291`-Block (5197-5199). Für Leser, die der Chronik folgen, eine Zeile „#447 hebt
  undici auf 6.29.1 / 7.30.1 / 8.12.2 (GHSA-xjj6-f33q-929c)" ergänzen.
- [ ] [scripts/checks/tests/run-tests.sh:5283] Der Major-6-Mutationsbeleg nutzt weiter Fixture
  `6.28.0`, die schon unter dem alten Floor 6.28.1 lag – er belegt daher nicht, dass der Floor-Bump
  6.28.1 → 6.29.1 wirkt (anders als der neue Major-7-Beleg mit 7.30.0 + Gegenprobe gegen 7.29.1).
  AK8 ist erfüllt („bleibt echter Beleg"); eine Fixture `6.29.0` mit Gegenprobe gegen 6.28.1 wäre
  symmetrisch zum Major-7-Fall.

## Positives

- AK1/AK3 belegt: Override-Zeile exakt `"undici@>=7.0.0 <7.30.1": "^7.30.1"`, Lockfile enthält nur
  noch `undici@7.30.1` (Importer jsdom), Overrides-Block im Lockfile synchron.
- Caret in der Fix-Linie, untere Schranke `>=7.0.0` bleibt – keine Major-Grenzüberschreitung für
  6.x (Lesson #291/#339).
- Mutationsbelege AK6/AK7 sauber nach dem bestehenden Muster: je Positivfall + Diskriminierungs-
  Kontrolle; Major-7-Gegenprobe gegen den alten Floor 7.29.1 beweist die Kausalität des Bumps;
  Major-8-Fixture trennt die 7.x-Nachbarzeile.
- Stale-Referenz-Grep (`7.29.1`, `6.28.1`, `<7.29`, `7.30.0`) außerhalb Lockfile/Tasks/Specs: alle
  Treffer sind historische Prosa (#390), bewusste Fixtures oder die neue Gegenprobe – kein Drift.
- YAML-Kommentar nennt die zwei zusätzlich gefundenen moderate-Advisories (GHSA-4qv8-2p9j-2685,
  GHSA-f72v-6w45-q472) mit gemessenen Floors – über den Spec-Wortlaut hinaus sorgfältig, ohne Scope
  zu erweitern (keine neuen Guard-Fälle nötig).
- AK4-Notiz benennt ehrlich, dass der Override frisch aufgelöst ein No-op ist, und begründet, warum er
  bleibt (jsdom deklariert `^7.25.0`) – Lesson #412 eingehalten.
- Kleinfund „undici-8.x-Linie" entfernt (AK9), Umsetzung mit den aktuellen Floors statt der
  veralteten 8.10.2 aus dem Kleinfund.
- Keine Routen-, ADR- oder App-Code-Änderung; `docs/routes.md` nicht betroffen.

## Empfehlung

APPROVED
