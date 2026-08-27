# Task 315: factory-pipeline-label-dokumentieren

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
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
      `.claude/`, `.github/workflows/`, `docs/factory/` – App: `app/`, `db/`, `lib/`,
      `docs/specs/`).
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
      `git ls-files`, nicht über das Verzeichnis).
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
  `gh issue list --label factory-pipeline --state all` liefert **13** Issues – die Zuordnungen
  hat GitHub beim Rename mitgezogen.
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
| K2 | Implementierung unkommittiert, Folge-Skills sähen leeren Diff | wird mit dem Rework-Commit geschlossen (direkt nach K1) |
| K3 | AK10-Allowlist deckt nur zwei der #315-Papierspuren → Falle für die eigene Pipeline | behoben: Pfadspec auf `tasks/*315*` geweitet (deckt Review-/Security-/Coverage-/Codify-Report), Begründung im WHY-Kommentar; je Ausnahme-Pfadspec eine Kontrolle in beide Richtungen |
| W1 | AK10-Live-Scan fail-open (`2>/dev/null` + leerer Output = grün) | behoben: `2>/dev/null` entfernt, Positivkontrolle mit derselben Aufrufform auf den **neuen** Namen läuft **vor** der Abwesenheits-Assertion |
| W2 | Mutationsbeleg je Fundstelle tautologisch (`grep -v X` → `grep X`) | behoben: Mutations-Anker ist jetzt die **beschreibende** Zeile (ohne Label-Name), geprüft wird die Phrase, die Label **an** Beschreibung bindet – verschiedene Prädikate; „Mutation greift wirklich" misst die Zeilenzahl statt das Suchmuster |
| W3 | Tie-Break für den Mischfall zirkulär, Anker-Listen decken Repo-Wurzel/`docs/adr/`/`tasks/`/`e2e/` nicht | behoben: Zweifelsregel **„Im Zweifel Label setzen"** analog zu „im Zweifel Issue", ungedeckte Pfade explizit benannt; zwei neue AK3-Assertions |
| N1 | codify.md/review.md nur per Ganzdatei-Grep abgesichert | behoben: beide haben jetzt eine spezifische Kontext-Phrase (siehe W2) |
| N2 | Abschnitts-Header „welche Dimension zusätzlich?" widerspricht dem neuen Blockquote | behoben: „welche Dimension **bzw. welches Subsystem** zusätzlich?" |
| N3 | Falsche Kausalkette im WHY-Kommentar zu `hi_repo` | behoben: echter Grund ist die bereits abgeräumte Basis `$TMP_HI` |
| N4 | Kommentar sagt „gitignoret", der Fixture stellt nur „ungetrackt" her | behoben |
| N5 | Scratch-Artefakte `scripts/*315*.tmp.*` färben den #312-Guard lokal rot | behoben: entfernt; Suite jetzt 1242/4 statt 1241/5 |

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

**Hinweis an `/codify` (Konsequenz aus Review-Finding K3):** Die AK10-Allowlist nimmt bewusst
nur `docs/specs/spec-315-*` und `tasks/*315*` aus. `docs/factory/lessons/*` und
`PROJECT-CONTEXT.md` sind **nicht** ausgenommen – sie sind lebende Konventions-Dokumente. Eine
Lesson zu dieser Task verweist deshalb auf Task/Spec, statt den alten Label-Namen selbst zu
buchstabieren; sonst wird die Suite rot.

Randnotiz (nicht Scope): #316 und #285 sowie ggf. #166 sind Factory-Arbeit ohne das Label.

---
Branch: `docs/315-factory-pipeline-label-dokumentieren`
Erstellt: 2026-08-27 13:49
