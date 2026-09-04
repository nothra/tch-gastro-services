# Spec: ADR – Lademechanismus der 5 Guidelines im @import-Pfad entscheiden

> Issue: [#319](https://github.com/nothra/tch-gastro-services/issues/319) · Branch-Typ: `documentation`
> (reine Entscheidungs-/Doku-Task, kein Produktverhalten) · Aspekt: `factory-pipeline`

## Kontext

`CLAUDE.md` bindet fünf Guidelines-Dateien per `@import` ein – sie werden bei **jeder** Session
und **jedem** Pipeline-Agenten vollständig geladen, unabhängig davon, ob die konkrete Task sie
braucht:

| Datei | Zeilen (Issue-Messung) |
|-------|------------------------:|
| `guidelines/git-workflow.md` | 369 |
| `guidelines/testing-standards.md` | 181 |
| `guidelines/clean-code.md` | 131 |
| `guidelines/tdd-principles.md` | 84 |
| `guidelines/architecture-principles.md` | 79 |
| **Summe** | **844** |

[ADR-037](../adr/037-lessons-auslagern-aus-import-kontext.md) hat 2026 die 45 `/codify`-Learnings
aus dem @import-Pfad nach `docs/factory/lessons/` ausgelagert, aber unter „Konsequenzen"
ausdrücklich festgehalten: **„Guidelines-Dateien und ihre `@import`-Einbindung bleiben
unverändert."** Der Punkt ist damit nicht erledigt, sondern bewusst offen gelassen – Issue #319
löst ihn aus dem Nachtrag zu #314 heraus, weil er eine eigenständige Entscheidung ist.

**Zusatzbefund (Issue):** Auch der Lessons-**Index** in `PROJECT-CONTEXT.md` (Ersatz für den
ausgelagerten Volltext) ist mit jedem `/codify`-Lauf gewachsen und steht heute bei 335 Zeilen –
dieselbe Governance-Lücke wie bei ADR-037, nur eine Ebene höher. Gehört laut Issue in dieselbe
Entscheidung, nicht in eine dritte Runde.

**Zur Datenlage (im Requirements-Gespräch geklärt):** Das Issue ordnet die Entscheidung
bewusst „nach #314" ein, um sie mit Kosten-**Messwerten** statt Intuition zu treffen. #314
(gemerged) liefert jedoch nur Prozess-Metriken (Lead-Time, Autonomie-Rate, CI-Quote, Interrupts,
Durchsatz) – keine Token-/Kosten-Zahlen pro Skill; die kämen aus OTEL, das per Default aus ist
(`PROJECT-CONTEXT.md` → Telemetrie). Es existieren also keine echten Kosten-Messwerte pro Skill.
**Entscheidung für diese Spec:** Das ist kein Blocker. Der tragende Kern des Befunds ist nicht
„das kostet zu viele Token", sondern **Aufgaben-Relevanz**: „eine Server-Action-Task braucht
`git-workflow.md` nicht in Volltext, eine CI-Task nicht `tdd-principles.md`" (Zitat Issue). Das
ist ein inhaltliches, durch Lesen der Guidelines und der bestehenden Rollen-/Skill-Zuordnung
(`CLAUDE.md` → Agent-Rollen) prüfbares Argument, kein Kosten-Messproblem. Die ADR entscheidet
auf dieser Grundlage; die Zeilen-/Wortzahlen aus der Issue-Tabelle dienen als Skalen-Kontext,
nicht als harte Vorbedingung. Die fehlende OTEL-Kostenmessung wird im ADR als Kontext benannt,
aber nicht als offener Blocker behandelt.

## Scope

**Inbegriffen:**

- Eine ADR (`docs/adr/0XX-…`), die den **Lademechanismus** der 5 Guidelines-Dateien entscheidet –
  Kandidaten aus dem Issue (bewusst noch nicht bewertet, keine Vorfestlegung durch diese Spec):
  1. Bedarfsgesteuertes Laden analog ADR-037 (Guidelines raus aus `@import`, Kurzregeln +
     „Laden bei"-Trigger inline).
  2. Rollen-spezifische Zuschnitte (jede Agent-Persona lädt nur ihre Guidelines).
  3. Verdichten statt auslagern (v. a. `git-workflow.md`: Prosa/Vorfall-Narrative → Regel-Einzeiler
     + Verweis).
  4. Nichts ändern (Cache-Argument).
  5. Eine begründete Kombination der obigen.
- Explizite Behandlung des Risikos **„Gate-relevante Regel wird durch Nicht-Laden still
  verletzt"** (anders als bei Lessons, wo Nicht-Laden folgenlos ist – Clean Code/TDD/Testing
  gelten unbedingt und für jede Task).
- Mitentscheidung des Zusatzbefunds: ein Governance-Mechanismus, der das unbegrenzte Wachstum
  des Lessons-Index in `PROJECT-CONTEXT.md` künftig begrenzt (analog zur Guideline-Entscheidung,
  nicht zwingend identischer Mechanismus).
- Die ADR benennt die **Umsetzung** (tatsächliche Datei-Änderungen) explizit als **Folge-Task**
  (neues Issue) – dieser Task liefert die Entscheidung, nicht die Migration.

**Nicht inbegriffen:**

- Keine inhaltliche Änderung an den 5 Guidelines selbst (was fachlich/technisch gilt, bleibt
  unverändert) – ausschließlich der Lademechanismus steht zur Debatte.
- Keine tatsächliche Umsetzung der ADR-Entscheidung (kein Verschieben/Kürzen von Dateien, keine
  `.claude/**`-Patches) – das ist der Folge-Task.
- Kein Aktivieren von OTEL / keine neue Kosten-Messung als Vorbedingung für diese Entscheidung
  (siehe Kontext).
- Keine Änderung am bestehenden `docs/factory/lessons/`-Mechanismus aus ADR-037 selbst (nur der
  Index-Wachstum-Aspekt in `PROJECT-CONTEXT.md` wird mitentschieden).

## Akzeptanzkriterien

- [ ] **AC1 – Lademechanismus entschieden:** GIVEN die 4 Kandidaten aus Issue #319 WHEN die ADR
  verfasst wird THEN wählt sie einen davon (oder eine begründete Kombination) für alle 5
  Guidelines – mit Begründung je Datei, falls unterschiedliche Mechanismen gewählt werden.
- [ ] **AC2 – Relevanz-Argument, keine Kosten-Messung als Vorbedingung:** GIVEN die fehlende
  OTEL-Kostenmessung WHEN die ADR die Entscheidung begründet THEN stützt sie sich primär auf
  Aufgaben-/Rollen-Relevanz (welche Guideline braucht welcher Skill/welche Persona tatsächlich)
  und benennt die fehlende Kostenmessung nur als Kontext, nicht als offenen Punkt.
- [ ] **AC3 – Gate-Risiko adressiert:** GIVEN die gewählte Option WHEN ein Agent eine Guideline
  nicht lädt THEN stellt die ADR sicher, dass er die darin enthaltenen Gate-Regeln nicht still
  verletzen kann (z. B. durch inline verbleibende Kern-Kurzregeln analog ADR-037 §2, verpflichtende
  Trigger je Rolle, oder eine andere explizit begründete Absicherung).
- [ ] **AC4 – Index-Wachstum mitentschieden:** GIVEN der Zusatzbefund zum wachsenden
  Lessons-Index in `PROJECT-CONTEXT.md` (335 Zeilen) WHEN die ADR verfasst wird THEN enthält sie
  auch für diesen Punkt eine Entscheidung (Mechanismus oder bewusstes Zurückstellen mit
  Begründung) – nicht nur für die 5 Guidelines.
- [ ] **AC5 – Guideline-Inhalt unverändert:** GIVEN die Entscheidung WHEN sie umgesetzt wird
  THEN ändert sich nichts am fachlichen Inhalt der 5 Guidelines – nur am Lademechanismus.
- [ ] **AC6 – Umsetzung als Folge-Task benannt:** GIVEN die getroffene Entscheidung WHEN die ADR
  abgeschlossen ist THEN dokumentiert sie explizit, dass die Umsetzung (Datei-Änderungen,
  ggf. `.claude/**`-Patch) ein separates Issue ist, und nennt die nötigen Schritte grob (kein
  Umsetzungsdetail).

## Fehlerszenarien

- [ ] **Vorfestlegung ohne Begründung:** Die ADR wählt eine Option, ohne die anderen 3
  ernsthaft gegen das Gate-Risiko (AC3) abzuwägen. Prüfung: Alternativen-Abschnitt der ADR
  bewertet jede Option explizit gegen das Gate-Risiko, nicht nur gegen die Zeilenzahl.
- [ ] **Kosten-Datenlücke blockiert die Entscheidung:** Die ADR wird mit Verweis auf fehlende
  OTEL-Zahlen offen gelassen oder vertagt. Prüfung: ADR trifft eine Entscheidung; die fehlende
  Messung erscheint höchstens als Kontext-Satz, nicht als Bedingung für spätere Entscheidung.
- [ ] **Guideline-Inhalt verändert:** Ein Rework verändert im selben PR fachliche Aussagen einer
  Guideline (nicht nur deren Lademechanismus). Prüfung: Diff der 5 Guidelines-Dateien ist leer
  oder rein strukturell (z. B. neue „Laden bei"-Kopfzeile), keine inhaltliche Änderung.
- [ ] **Index-Wachstum unbehandelt:** Die ADR entscheidet nur über die 5 Guidelines und
  übergeht den Zusatzbefund zum Lessons-Index ersatzlos. Prüfung: ADR-Abschnitt „Entscheidung"
  enthält einen eigenen Punkt zum Index-Wachstum.

## Offene Fragen

- [ ] Falls Option 2 (rollen-spezifische Zuschnitte) gewählt wird: Wie granular ist die
  Zuordnung Persona ↔ Guideline, und wie wird verhindert, dass diese zweite Zuordnungsquelle
  gegenüber der Rollen-Tabelle in `CLAUDE.md` driftet? → in `/architecture` entscheiden.
- [ ] Governance-Mechanismus gegen erneutes Zurückwachsen (analog zur ADR-037-Lücke, die genau
  dazu führte, dass dieser Punkt jetzt erneut ansteht) → in `/architecture` festlegen.
