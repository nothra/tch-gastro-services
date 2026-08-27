# Spec: `factory-pipeline` in die kanonische Label-Konvention aufnehmen

> Quelle: GitHub-Issue [#315](https://github.com/nothra/tch-gastro-services/issues/315)
> (`documentation` + `tech-debt` + `factory-pipeline`). Reine Doku-/Konventions-Änderung
> plus ein Label-Rename – kein neues Verhalten in der App.

## Kontext

Das Repo-Label **`factory_pipeline`** („Bug oder Erweiterung der Factory (nicht der
Applikation)", `#7583cf`) existiert auf GitHub und trägt bereits 13 Zuordnungen – ist aber in
**keiner** getrackten Datei dokumentiert (`grep -rn "factory_pipeline"` über `*.md`/`*.sh`/
`*.yml`/`*.json`: null Treffer, verifiziert am 2026-08-27).

Kanonische Quelle der Label-Konvention ist `docs/factory/guidelines/git-workflow.md` →
„GitHub-Labels". Der Seam `scripts/lib/create-issue.sh` validiert Labels bewusst **nicht**
gegen eine eigene Liste (ADR-018 §3), um Drift zu vermeiden – die Doku ist damit die einzige
Instanz, die ein Label überhaupt „anbietet". Steht ein Label nicht in dieser Tabelle, vergibt
es weder ein Mensch noch ein Skill zuverlässig. Genau das ist bei #314 passiert: das Label
musste in einem zweiten Schritt manuell nachgetragen werden.

Der Nutzen des Labels ist die **Backlog-Trennung** zwischen Arbeit am Factory-Harness und
Arbeit an der TCH-Gastro-Fachdomäne. Ohne diese Trennung ist der offene Backlog nicht danach
filterbar, was das Produkt und was das Werkzeug betrifft.

### Entschieden in Phase 1 (interaktiv, 2026-08-27)

| Frage | Entscheidung | Begründung |
|-------|--------------|------------|
| Aspekt-Label oder dritte Schema-Achse? | **Aspekt-Label** – eine Zeile in der bestehenden Tabelle | Das Label ist optional und nicht-exklusiv, verhält sich also mechanisch exakt wie ein Aspekt-Label. Eine dritte Achse für genau ein Label wäre Schema-Aufwand ohne Gegenwert (YAGNI) und müsste in jeder abgeleiteten Liste mitgeführt werden. Die semantische Besonderheit („welches Subsystem", nicht „welche Dimension") trägt der Zeilentext. |
| Namensform `factory_pipeline`? | **Rename auf `factory-pipeline`** | Konsistenz mit `tech-debt` (kebab-case) und Wegfall der optischen Nähe zum reservierten Maschinen-Präfix `factory::`. GitHub überträgt bestehende Zuordnungen beim Rename automatisch; der Guard `_cri_is_reserved_label` weist nur `factory::*` ab, `factory-pipeline` bleibt über den Seam vergebbar. |
| Rückwirkende Vergabe? | **Nicht Teil dieser Task** | Der Bestand ist bereits zu ~80 % gelabelt (13 Issues, u. a. #312, #290, #288, #275, #198, #178, #177, #131). Offen sind nur #285 und ggf. #166 – Datenpflege, die nicht in einen Doku-PR gehört. (#316 war zum Zeitpunkt dieser Entscheidung ebenfalls offen und ist inzwischen unabhängig von dieser Task gelabelt.) |
| Absicherung gegen künftige Drift? | **Grep-Guard in der Bash-Suite** | Deterministisch, offline, Präzedenz vorhanden. Ein generischer `gh label list`-gegen-Doku-Check wäre die Ursachenbehandlung, braucht aber Netz + Token und ist damit eine eigene Task. |

**Kein ADR-Trigger:** Keine Technologie-, Schnittstellen- oder irreversible Entscheidung. Die
Label-Konvention ist selbst kanonische Quelle in `git-workflow.md`; ADR-018 §3
(validierungsfreier Seam) bleibt unberührt. `/architecture` wird übersprungen.

## Scope

**Inbegriffen:**

- Rename des Repo-Labels `factory_pipeline` → `factory-pipeline` (GitHub-Settings).
- `docs/factory/guidelines/git-workflow.md` – kanonische Aspekt-Tabelle + die beiden
  abgeleiteten Aufzählungen derselben Datei (Faustregel-Absatz, `start-work.sh`-Absatz).
- `CONTRIBUTING.md` – Beitragsarten-Aufzählung.
- `docs/factory/OPERATING.md` §1.1 Schritt 3 – Label-Liste der Phase 1, inkl. Korrektur der
  dort vorbestehenden Drift („genau eins" über Art- **und** Aspekt-Labels).
- `scripts/start-work.sh` – Kopfkommentar zu `FACTORY_ASPECT_LABELS` (vollständige CSV-Menge).
- `.claude/commands/codify.md`, `review.md`, `security-review.md` – Aspekt-Label-Aufzählungen,
  geliefert über den Patch-Workflow für `.claude/**`.
- `scripts/checks/tests/run-tests.sh` – Drift-Guard über alle obigen Fundstellen.
- Titel und Body von Issue #315 auf den neuen Label-Namen ziehen.

**Nicht inbegriffen:**

- **Keine Änderung an `scripts/lib/create-issue.sh`.** Der Seam bleibt validierungsfrei
  (ADR-018 §3); es entsteht keine zweite kanonische Label-Liste im Code.
- **Kein Label anlegen oder löschen.** Nur Rename des vorhandenen Labels.
- **Kein nachträgliches Labeln** von #316, #285, #166 oder weiteren Bestands-Issues.
- **Keine Änderung an `docs/adr/018-central-issue-seam.md:30` und
  `docs/specs/spec-82-issue-seam.md:18,39`.** Diese nennen die Aspekt-Trias als
  **historische Problembeschreibung** des Zustands vor dem Seam („werden nirgends
  angeboten") – ein historisches Narrativ wird nicht auf den heutigen Stand umgeschrieben.
- **Kein generischer `gh label list`-gegen-Doku-CI-Check.** Netz-/Token-abhängig, eigene
  Fehleroberfläche, eigene Task.
- **Keine Änderung an Titeln/Bodies anderer Issues**, die den alten Namen im Klartext nennen.

## Akzeptanzkriterien

- [ ] **AK1 – Rename mit erhaltenen Zuordnungen.** GIVEN das Repo-Label `factory_pipeline`
      mit 13 Zuordnungen (Stand 2026-08-27), WHEN das Label auf `factory-pipeline` umbenannt
      ist, THEN führt `gh label list` genau ein Label `factory-pipeline` und kein
      `factory_pipeline` mehr, UND `gh issue list --label factory-pipeline --state all`
      liefert weiterhin dieselben 13 Issues.
- [ ] **AK2 – Kanonische Tabelle.** GIVEN die Aspekt-Label-Tabelle in
      `docs/factory/guidelines/git-workflow.md` → „GitHub-Labels", WHEN sie gelesen wird,
      THEN enthält sie eine Zeile `factory-pipeline` mit dem Abgrenzungskriterium
      Factory-Harness vs. TCH-Applikation.
- [ ] **AK3 – Abgrenzungskriterium ohne Rückfrage anwendbar.** GIVEN der neue Zeilen-/
      Begleittext in `git-workflow.md`, WHEN ein Leser ein Issue einordnen muss, THEN benennt
      der Text **beide** Seiten der Grenze mit konkreten Pfad-Ankern – Factory:
      `scripts/`, `.claude/`, `.github/workflows/`, `docs/factory/`; Applikation: `app/`,
      `db/`, `lib/` – sodass die Zuordnung ohne Rückfrage fällt. UND er löst den
      **Mischfall** einseitig fail-safe auf („Im Zweifel Label setzen") und benennt die von
      beiden Anker-Listen ungedeckten Pfade (Repo-Wurzel, `docs/adr/`, `tasks/`, `e2e/`,
      `docs/specs/` – Ablagekonvention statt Subsystem-Grenze) – ohne diese Auflösung bliebe
      die Zuordnung genau dort zirkulär, wo sie gebraucht wird.
      Die Pfad-Anker stehen **nur** in dieser kanonischen Quelle; abgeleitete Dokumente
      verweisen darauf, statt die Liste zu kopieren.
- [ ] **AK4 – Aufzählungen derselben Datei mitgezogen.** GIVEN die beiden abgeleiteten
      Aufzählungen in `git-workflow.md` (Faustregel-Absatz und `start-work.sh`-Absatz, die
      heute `security`/`tech-debt`/`test` als geschlossene Menge nennen), WHEN sie gelesen
      werden, THEN nennen beide `factory-pipeline` mit.
- [ ] **AK5 – CONTRIBUTING.md.** GIVEN die Beitragsarten-Aufzählung in `CONTRIBUTING.md`,
      WHEN sie gelesen wird, THEN nennt sie Factory-/Harness-Beiträge als Beitragsart mit
      Aspekt-Label `factory-pipeline`, UND der Verweis auf `git-workflow.md` als kanonische
      Quelle bleibt bestehen (keine zweite kanonische Liste).
- [ ] **AK6 – OPERATING.md Schritt 3.** GIVEN Schritt 3 in `docs/factory/OPERATING.md` §1.1,
      WHEN er gelesen wird, THEN nennt er `factory-pipeline`, UND er unterscheidet Art-Label
      (genau eines) von Aspekt-Labels (null bis mehrere) statt die heutige flache
      „genau eins"-Liste über beide Achsen zu führen.
- [ ] **AK7 – start-work.sh.** GIVEN der Kopfkommentar zu `FACTORY_ASPECT_LABELS`
      (`scripts/start-work.sh:29`), der die Aspekt-Menge als vollständige CSV aufzählt,
      WHEN er gelesen wird, THEN enthält er `factory-pipeline`; die `--labels`-Usage-Meldung
      (Zeile 64) bleibt als explizit gekennzeichnetes Beispiel („z. B. security,test")
      unverändert.
- [ ] **AK8 – Skill-Dokus.** GIVEN `.claude/commands/codify.md`, `.claude/commands/review.md`
      und `.claude/commands/security-review.md`, WHEN die jeweilige Aspekt-Label-Aufzählung
      gelesen wird, THEN nennt jede der drei `factory-pipeline`, UND die Änderung ist über den
      Patch-Workflow für `.claude/**` geliefert.
- [ ] **AK9 – Drift-Guard je Fundstelle.** GIVEN die Bash-Suite
      `scripts/checks/tests/run-tests.sh`, WHEN sie läuft, THEN prüft ein neuer Test das
      Vorkommen von `factory-pipeline` in jeder der sieben Fundstellen (git-workflow.md,
      CONTRIBUTING.md, OPERATING.md, start-work.sh, codify.md, review.md,
      security-review.md), UND je Fundstelle ist per Mutation belegt, dass ihr Entfernen den
      Test rot macht.
- [ ] **AK10 – Regressions-Guard gegen den alten Namen.** GIVEN dieselbe Suite, WHEN sie
      läuft, THEN schlägt sie fehl, sobald der alte Name `factory_pipeline` in einer
      **getrackten** Datei auftaucht; der Scan liest ausschließlich `git ls-files`, nicht das
      Verzeichnis, damit gitignorete Scratch-Artefakte ihn nicht rot färben.
      **Ausgenommen ist die Papierspur dieser Task selbst** (`docs/specs/spec-315-*` und
      `tasks/*315*`): sie hält den Rename fest und muss den alten Namen im Klartext nennen
      dürfen – ohne die Ausnahme blockierte der Guard die eigene Pipeline, sobald ein
      Folge-Skill seinen Report schreibt. Je Ausnahme-Pfadspec ist eine Kontrolle in **beide**
      Richtungen zu führen (Papierspur zulässig / fremde Spec bzw. fremder Task-Report rot),
      UND jede auf Leere prüfende Kontrolle ist fail-closed abgesichert: ein still
      gescheitertes Fixture-Scaffolding darf sie nicht grün werden lassen.
- [ ] **AK11 – Issue #315 ohne stale Referenz.** GIVEN Titel und Body von Issue #315 nennen
      den alten Namen `factory_pipeline`, WHEN der Rename erfolgt ist, THEN sind Titel und
      Body auf `factory-pipeline` gezogen – die Issue, die die Konvention festschreibt,
      verweist nicht auf ein nicht mehr existierendes Label.

## Fehlerszenarien

- [ ] **Rename schlägt fehl** (kein `gh`-Login, fehlende Repo-Rechte, Zielname bereits
      belegt): Abbruch **vor** jeder Doku-Änderung. Halb ausgeführt wäre der schlechteste
      Zustand – die Doku dokumentiert dann einen Namen, den es nicht gibt. Fail-closed:
      Blocker melden, nichts committen.
- [ ] **Reihenfolge Rename ↔ Doku:** Zwischen Rename und Merge existiert ein Fenster, in dem
      ein Skill über den Seam noch den alten Namen übergeben könnte. Der Seam degradiert dann
      fail-open (Issue entsteht ohne Aspekt-Label, Warnung auf stderr) – kein Datenverlust,
      aber ein Grund, Rename und Doku-Update im **selben** PR zu halten.
- [ ] **`grep -qF`-Guard gegen Markdown-Prosa** (Lesson #240/#249/#286): Jede im Test
      geprüfte Mehrwort-Phrase muss in der Zieldatei auf **einer** Zeile stehen, sonst wird
      der Guard lautlos rot. Gilt in beide Richtungen – auch beim Umbrechen der neuen Prosa.
- [ ] **Verzeichnisweiter Content-Scan** (Lesson #312): Bei unerwartetem Rot in AK10 zuerst
      `git status --ignored` prüfen, statt den Guard abzuschwächen.
- [ ] **`.claude/`-Test prüft den falschen Zustand** (Lesson #212): Der Guard für AK8 liest
      den Endzustand der committeten Live-Datei, nicht das transiente Patch-Artefakt.

## Offene Fragen

_Keine._ Alle vier Phase-1-Entscheidungen sind oben getroffen.

> Randnotiz für `/codify` (nicht Teil dieser Task): Die Factory-Issues **#285** sowie ggf.
> **#166** tragen das Label noch nicht (Stand 2026-08-27).
