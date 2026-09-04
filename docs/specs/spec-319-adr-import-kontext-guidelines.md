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
**Entscheidung für diese Spec:** Das ist kein Blocker – aber daraus folgt **keine** Vorauswahl
einer Option. Begründung: Der tragende Kern des Befunds ist nicht „das kostet zu viele Token"
(was Messwerte bräuchte), sondern ein inhaltliches Argument, das durch Lesen der Guidelines und
der bestehenden Rollen-/Skill-Zuordnung (`CLAUDE.md` → Agent-Rollen) prüfbar ist. Jeder Kandidat
hat dabei seine **eigene** prüfbare Argumentationsart, und keine ist auf OTEL-Zahlen angewiesen:

| Kandidat | Prüfbares Argument (ohne Kosten-Messwerte) |
|----------|--------------------------------------------|
| 1 · Bedarfsgesteuert | Aufgaben-Relevanz: „eine Server-Action-Task braucht `git-workflow.md` nicht in Volltext, eine CI-Task nicht `tdd-principles.md`" (Zitat Issue) |
| 2 · Rollen-Zuschnitt | Rollen-Relevanz: Zuordnung Persona ↔ Guideline gegen die bestehende Rollen-Tabelle |
| 3 · Verdichten | Prosa-/Redundanz-Anteil: wie viel einer Datei ist Vorfall-Narrativ statt Regel – am Text messbar |
| 4 · Nichts ändern | Cache-Wiederverwendung: identischer Präfix über die ~7 Agenten, am Cache-Modell (1h-TTL) argumentierbar |

Die Zeilen-/Wortzahlen aus der Issue-Tabelle dienen als Skalen-Kontext, nicht als harte
Vorbedingung. Die fehlende OTEL-Kostenmessung wird im ADR als Kontext benannt, aber nicht als
offener Blocker behandelt.

## Scope

**Inbegriffen:**

- Eine ADR (`docs/adr/0XX-…`), die den **@import-Umgang** mit den 5 Guidelines-Dateien
  entscheidet – also **Lademechanismus und/oder Umfang** (Kandidat 3 ändert nicht den
  Mechanismus, sondern den geladenen Umfang; beides ist zulässiges Ergebnis) – Kandidaten aus dem
  Issue (bewusst noch nicht bewertet, keine Vorfestlegung durch diese Spec):
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

- Keine Änderung daran, **was** fachlich/technisch gilt (jede geltende Regel bleibt gültig und
  verbindlich – Issue-Abgrenzung „was gilt, bleibt gültig"). Zur Debatte steht, **wie** die
  Regeln in den Agentenkontext kommen: über welchen Mechanismus und in welchem Umfang. Eine
  Kürzung von Prosa/Vorfall-Narrativ unter Erhalt aller Regeln ist damit **nicht** ausgeschlossen
  (Kandidat 3), eine Streichung oder Abschwächung einer Regel schon.
- Keine tatsächliche Umsetzung der ADR-Entscheidung (kein Verschieben, Kürzen oder Verdichten von
  Dateien, keine `.claude/**`-Patches) – das ist der Folge-Task. In diesem PR bleiben die 5
  Guidelines-Dateien unangetastet.
- Kein Aktivieren von OTEL / keine neue Kosten-Messung als Vorbedingung für diese Entscheidung
  (siehe Kontext).
- Keine Änderung am bestehenden `docs/factory/lessons/`-Mechanismus aus ADR-037 selbst (nur der
  Index-Wachstum-Aspekt in `PROJECT-CONTEXT.md` wird mitentschieden).

## Akzeptanzkriterien

- [ ] **AC1 – Lademechanismus entschieden:** GIVEN die 4 Kandidaten aus Issue #319 WHEN die ADR
  verfasst wird THEN wählt sie einen davon (oder eine begründete Kombination) für alle 5
  Guidelines – mit Begründung je Datei, falls unterschiedliche Mechanismen gewählt werden.
- [ ] **AC2 – Keine Kosten-Messung als Vorbedingung:** GIVEN die fehlende OTEL-Kostenmessung
  WHEN die ADR die Entscheidung begründet THEN stützt sie sich auf inhaltliche/strukturelle
  Argumente, die **ohne** Kosten-Messwerte prüfbar sind – je Kandidat auf die ihm eigene
  Argumentationsart (siehe Tabelle im Kontext: Aufgaben-Relevanz, Rollen-Relevanz,
  Prosa-/Redundanz-Anteil, Cache-Wiederverwendung) – und benennt die fehlende Kostenmessung nur
  als Kontext, nicht als offenen Punkt. Die Wahl der Argumentationsart darf **keine** Option
  vorab ausschließen.
- [ ] **AC3 – Gate-Risiko adressiert:** GIVEN die gewählte Option WHEN ein Agent eine Guideline
  nicht lädt THEN stellt die ADR sicher, dass er die darin enthaltenen Gate-Regeln nicht still
  verletzen kann (z. B. durch inline verbleibende Kern-Kurzregeln analog ADR-037 §2, verpflichtende
  Trigger je Rolle, oder eine andere explizit begründete Absicherung).
- [ ] **AC4 – Index-Wachstum mitentschieden:** GIVEN der Zusatzbefund zum wachsenden
  Lessons-Index in `PROJECT-CONTEXT.md` (335 Zeilen) WHEN die ADR verfasst wird THEN enthält sie
  auch für diesen Punkt eine Entscheidung (Mechanismus oder bewusstes Zurückstellen mit
  Begründung) – nicht nur für die 5 Guidelines.
- [ ] **AC5 – Normativer Gehalt bleibt gültig (Prosa-Umfang darf sich ändern):** GIVEN die
  Entscheidung WHEN sie umgesetzt wird THEN bleibt jede **geltende Regel** der 5 Guidelines
  unverändert gültig und auffindbar („was gilt, bleibt gültig", Issue-Abgrenzung). Wird
  Kandidat 3 (Verdichten) ganz oder teilweise gewählt, ist die Reduktion von **Prosa,
  Vorfall-Narrativ und Redundanz** ausdrücklich erlaubt – verboten ist nur der Verlust einer
  Regel bzw. das stille Abschwächen ihrer Verbindlichkeit. Kein Kandidat wird durch dieses AC
  ausgeschlossen.
- [ ] **AC6 – Umsetzung als Folge-Task benannt:** GIVEN die getroffene Entscheidung WHEN die ADR
  abgeschlossen ist THEN dokumentiert sie explizit, dass die Umsetzung (Datei-Änderungen,
  ggf. `.claude/**`-Patch) ein separates Issue ist, und nennt die nötigen Schritte grob (kein
  Umsetzungsdetail).

## Fehlerszenarien

- [ ] **Vorfestlegung ohne Begründung:** Die ADR wählt eine Option, ohne die anderen drei
  ernsthaft abzuwägen. Prüfung: Der Alternativen-Abschnitt bewertet **jeden** der 4 Kandidaten
  gegen **beide** Achsen – (a) Gate-Risiko (still verletzbare Regel) und (b) Skalierung (wächst
  der @import-Kontext danach wieder zurück?) – nicht nur gegen die Zeilenzahl. Die Achsen
  treffen die Kandidaten gegenläufig: Kandidat 3 (Verdichten) hat **kein** Gate-Risiko (alles
  bleibt geladen), „löst das Skalierungsproblem aber nicht" (Zitat Issue); Kandidat 1/2 sind
  umgekehrt gelagert. Eine Bewertung, die nur eine der beiden Achsen anlegt, ist unvollständig.
- [ ] **Kosten-Datenlücke blockiert die Entscheidung:** Die ADR wird mit Verweis auf fehlende
  OTEL-Zahlen offen gelassen oder vertagt. Prüfung: ADR trifft eine Entscheidung; die fehlende
  Messung erscheint höchstens als Kontext-Satz, nicht als Bedingung für spätere Entscheidung.
- [ ] **Guideline-Datei in diesem Task verändert:** Dieser Task ist entscheidungs-only – ein
  Rework fängt schon hier mit dem Umsetzen an. Prüfung: Diff der 5 Guidelines-Dateien in **diesem**
  PR ist leer. (Das ist eine Aussage über diesen PR, **nicht** über die Entscheidung: im
  Folge-Task darf Kandidat 3 Prosa verdichten, siehe AC5.)
- [ ] **Regel verliert sich beim Verdichten:** Wird Kandidat 3 gewählt, fällt eine geltende Regel
  der Kürzung zum Opfer oder wird zur unverbindlichen Empfehlung abgeschwächt. Prüfung: Die ADR
  schreibt für den Folge-Task eine Verlustkontrolle fest (Regel-Inventar vorher/nachher, analog
  zur Count-Assertion aus spec-196 AC3), nicht nur „verdichten".
- [ ] **Index-Wachstum unbehandelt:** Die ADR entscheidet nur über die 5 Guidelines und
  übergeht den Zusatzbefund zum Lessons-Index ersatzlos. Prüfung: ADR-Abschnitt „Entscheidung"
  enthält einen eigenen Punkt zum Index-Wachstum.

## Offene Fragen

- [ ] Falls Kandidat 2 (rollen-spezifische Zuschnitte) gewählt wird: Wie granular ist die
  Zuordnung Persona ↔ Guideline, und wie wird verhindert, dass diese zweite Zuordnungsquelle
  gegenüber der Rollen-Tabelle in `CLAUDE.md` driftet? → in `/architecture` entscheiden.
- [ ] Falls Kandidat 3 (Verdichten) ganz oder teilweise gewählt wird: Wo verläuft die Grenze
  zwischen „geltende Regel" (bleibt) und „Vorfall-Narrativ/Prosa" (darf weichen)? Die
  Vorfall-Narrative sind teils die **Begründung** einer Regel – und `factory-workflow.md` zeigt,
  dass Agenten ohne das „Warum" Regeln erneut brechen (dokumentierte Rezidive). → in
  `/architecture` als Kriterium festlegen, nicht dem Folge-Task überlassen.
- [ ] Governance-Mechanismus gegen erneutes Zurückwachsen (analog zur ADR-037-Lücke, die genau
  dazu führte, dass dieser Punkt jetzt erneut ansteht) → in `/architecture` festlegen. Gilt für
  jeden Kandidaten: auch eine verdichtete oder ausgelagerte Datei wächst ohne Mechanismus zurück.
