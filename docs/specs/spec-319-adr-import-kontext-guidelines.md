# Spec: @import-Umgang mit den 5 Guidelines entscheiden **und umsetzen**

> Issue: [#319](https://github.com/nothra/tch-gastro-services/issues/319) ·
> Aspekt: `factory-pipeline` · Ergebnis: ADR **plus** vollzogene Umstellung

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
| **Summe** | **844** (≈ 61 % des @import-Kontexts von 1.376 Zeilen) |

[ADR-037](../adr/037-lessons-auslagern-aus-import-kontext.md) hat 2026 die 45 `/codify`-Learnings
aus dem @import-Pfad nach `docs/factory/lessons/` ausgelagert, aber unter „Konsequenzen"
ausdrücklich festgehalten: **„Guidelines-Dateien und ihre `@import`-Einbindung bleiben
unverändert."** Der Punkt ist damit nicht erledigt, sondern bewusst offen gelassen – Issue #319
löst ihn aus dem Nachtrag zu #314 heraus, weil er eine eigenständige Entscheidung ist.

**Zusatzbefund (Issue):** Auch der Lessons-**Index** in `PROJECT-CONTEXT.md` (Ersatz für den
ausgelagerten Volltext) ist mit jedem `/codify`-Lauf gewachsen und steht heute bei 335 Zeilen –
dieselbe Governance-Lücke wie bei ADR-037, nur eine Ebene höher. Gehört laut Issue in dieselbe
Entscheidung, nicht in eine dritte Runde.

**Entscheidung des Auftraggebers (weicht bewusst von der Issue-Abgrenzung ab):** Das Issue
schreibt „Ergebnis ist eine ADR; die Umsetzung ist ein Folge-Task". Dieser Task liefert
stattdessen **Entscheidung und Umsetzung zusammen**. Begründung: Genau die Trennung
„entscheiden jetzt, umsetzen später" hat den Punkt bei ADR-037 zwei Runden liegen lassen, bis
er hier erneut anstand. Eine ADR ohne vollzogene Umstellung erzeugt denselben offenen Posten
ein drittes Mal.

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
- **Die vollzogene Umsetzung der Entscheidung in diesem Task** (siehe AC6–AC9): tatsächliche
  Änderung an `CLAUDE.md`/den betroffenen Dateien, neu gemessener @import-Stand, konsistente
  Verweise, und – falls Skills berührt sind – der `.claude/**`-Patch zur Human-Apply.
- Falls Kandidat 4 („nichts ändern") gewinnt, besteht die „Umsetzung" aus der dokumentierten
  Nicht-Änderung: die ADR ist dann das gesamte Ergebnis, AC6–AC8 gelten als erfüllt, wenn die
  ADR die Nicht-Änderung begründet und der Governance-Punkt (AC4) dennoch entschieden ist.

**Nicht inbegriffen:**

- Keine Änderung daran, **was** fachlich/technisch gilt (jede geltende Regel bleibt gültig und
  verbindlich – Issue-Abgrenzung „was gilt, bleibt gültig"). Zur Debatte steht, **wie** die
  Regeln in den Agentenkontext kommen: über welchen Mechanismus und in welchem Umfang. Eine
  Kürzung von Prosa/Vorfall-Narrativ unter Erhalt aller Regeln ist damit **nicht** ausgeschlossen
  (Kandidat 3), eine Streichung oder Abschwächung einer Regel schon.
- Kein Aktivieren von OTEL / keine neue Kosten-Messung als Vorbedingung für diese Entscheidung
  (siehe Kontext).
- Keine Änderung am bestehenden `docs/factory/lessons/`-Mechanismus aus ADR-037 selbst (nur der
  Index-Wachstum-Aspekt in `PROJECT-CONTEXT.md` wird mitentschieden).
- Kein Umbau der Skill-Pipeline oder der Rollen-Tabelle über das hinaus, was die gewählte Option
  zwingend erfordert (kein Gold-Plating).

## Akzeptanzkriterien

### Entscheidung

- [ ] **AC1 – @import-Umgang entschieden:** GIVEN die 4 Kandidaten aus Issue #319 WHEN die ADR
  verfasst wird THEN wählt sie einen davon (oder eine begründete Kombination) für alle 5
  Guidelines – mit Begründung je Datei, falls unterschiedliche Mechanismen gewählt werden.
- [ ] **AC2 – Keine Kosten-Messung als Vorbedingung:** GIVEN die fehlende OTEL-Kostenmessung
  WHEN die ADR die Entscheidung begründet THEN stützt sie sich auf inhaltliche/strukturelle
  Argumente, die **ohne** Kosten-Messwerte prüfbar sind – je Kandidat auf die ihm eigene
  Argumentationsart (siehe Tabelle im Kontext) – und benennt die fehlende Kostenmessung nur
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
  Umstellung WHEN sie vollzogen ist THEN bleibt jede **geltende Regel** der 5 Guidelines
  unverändert gültig und auffindbar („was gilt, bleibt gültig", Issue-Abgrenzung). Wird
  Kandidat 3 (Verdichten) ganz oder teilweise gewählt, ist die Reduktion von **Prosa,
  Vorfall-Narrativ und Redundanz** ausdrücklich erlaubt – verboten ist nur der Verlust einer
  Regel bzw. das stille Abschwächen ihrer Verbindlichkeit. Kein Kandidat wird durch dieses AC
  ausgeschlossen.

### Umsetzung (in diesem Task, nicht als Folge-Task)

- [ ] **AC6 – Entscheidung ist vollzogen, nicht nur beschrieben:** GIVEN die ADR-Entscheidung
  WHEN dieser PR abgeschlossen ist THEN ist der gewählte Mechanismus im Repo tatsächlich
  angewandt (`CLAUDE.md`-`@import`-Block, betroffene Dateien, ggf. „Laden bei"-Trigger) – die ADR
  beschreibt keinen Zustand, der erst später eintritt.
- [ ] **AC7 – Neuer @import-Stand gemessen und dokumentiert:** GIVEN die vollzogene Umstellung
  WHEN der PR beschrieben wird THEN nennt er den neuen Zeilen-/Wortstand des @import-Kontexts
  gegen den Ausgangswert (1.376 Zeilen / 9.812 Wörter, davon 844 Zeilen Guidelines) – analog
  spec-196 AC2, damit die Wirkung belegt statt behauptet ist.
- [ ] **AC8 – Verweise konsistent, keine toten Links:** GIVEN die verschobenen/verdichteten
  Inhalte WHEN im Repo nach Verweisen gesucht wird THEN sind Querverweise zwischen `CLAUDE.md`,
  `PROJECT-CONTEXT.md`, Guidelines, `lessons/`, ADRs und Skills konsistent, die kanonische Quelle
  je Regel ist eindeutig, und kein Verweis zeigt ins Leere (Regel „Kanonische Quellen immer
  referenzieren"; ADR-037 §Konsequenzen als Vorbild).
- [ ] **AC9 – `.claude/**`-Anteil als Patch geliefert:** GIVEN die Umsetzung berührt Skills unter
  `.claude/**` (agent-hard-denied) WHEN der Anteil nötig ist THEN liegt er als
  `tasks/patch-319.diff` zur Human-Apply bei, `git apply --check` läuft grün, und die Prüfung
  adressiert den **Endzustand der committeten Live-Datei**, nicht das transiente Patch-Artefakt
  (Lesson aus #212). Berührt die gewählte Option keine `.claude/**`-Datei, gilt AC9 mit
  ausdrücklichem Vermerk als nicht zutreffend.

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
- [ ] **ADR und Repo-Zustand driften:** Die ADR beschreibt Mechanismus X, umgesetzt ist Y (oder
  nichts) – der Fehler, den AC6 verhindert. Prüfung: `CLAUDE.md`-`@import`-Block und betroffene
  Dateien gegen den ADR-Abschnitt „Entscheidung" spiegeln (Lesson #211: PR ändert die von einer
  ADR beschriebene Mechanik → ADR im selben PR mitpflegen, hier in beide Richtungen).
- [ ] **Regel verliert sich beim Verdichten:** Wird Kandidat 3 gewählt, fällt eine geltende Regel
  der Kürzung zum Opfer oder wird zur unverbindlichen Empfehlung abgeschwächt. Prüfung:
  Regel-Inventar vorher/nachher (Count-Assertion analog spec-196 AC3), nicht nur „verdichten".
- [ ] **Gate-Regel nur noch in nicht geladener Datei:** Eine Clean-Code-/TDD-/Testing-Regel ist
  nach der Umstellung ausschließlich in einer Datei zu finden, die kein Agent verlässlich lädt,
  ohne inline verbleibende Kurzregel oder verpflichtenden Trigger. Prüfung: je Gate-Regel den
  Ladepfad benennen (welcher Skill lädt sie wann) – das ist die Umsetzungs-Seite von AC3.
- [ ] **Kontext wächst zurück:** Die Umstellung reduziert einmalig, ohne Mechanismus gegen das
  erneute Anwachsen – genau die ADR-037-Lücke, die diesen Task verursacht hat. Prüfung: der in
  AC4 entschiedene Governance-Mechanismus ist im Repo verankert (z. B. in `/codify` bzw. an der
  Stelle, die künftig anhängt), nicht nur in der ADR-Prosa beschrieben.
- [ ] **Patch bricht:** Der `.claude/**`-Diff lässt sich nicht anwenden. Prüfung:
  `git apply --check tasks/patch-319.diff` grün.

## Offene Fragen

- [x] Falls Kandidat 2 (rollen-spezifische Zuschnitte) gewählt wird: Wie granular ist die
  Zuordnung Persona ↔ Guideline, und wie wird verhindert, dass diese zweite Zuordnungsquelle
  gegenüber der Rollen-Tabelle in `CLAUDE.md` driftet? → **Entfällt:** ADR-047 verwirft Kandidat 2
  (Option C2), genau mit dem Drift-Argument dieser Frage.
- [x] Falls Kandidat 3 (Verdichten) ganz oder teilweise gewählt wird: Wo verläuft die Grenze
  zwischen „geltende Regel" (bleibt) und „Vorfall-Narrativ/Prosa" (darf weichen)? → **Beantwortet
  in ADR-047 §2:** geltende Regel bleibt wörtlich, Didaktik-Prosa und Illustration dürfen weichen,
  lessons-artige Einträge wandern in die Lesson (Begründung bleibt dort erhalten). Belegt über ein
  Regel-Inventar vorher/nachher (Task-Datei), nicht über „verdichten" als Zusicherung.
- [x] Governance-Mechanismus gegen erneutes Zurückwachsen → **Beantwortet in ADR-047 §4:** ein
  `pre-push`-Deckel über die Summe des gesamten @import-Kontexts, Grenze als hergeleitete
  Konstante. Restrisiko (Hook umgehbar, CI-Arm nur mittelbar) dort benannt; ein eigener
  CI-Required-Check ist als Issue #328 ausgelagert.
- [ ] Branch-Typ: Der Branch heißt `feature/319-…` (Default aus `start-work.sh`). Da der Task
  Factory-Harness-Doku/-Kontext ohne neues Produktverhalten ändert, wäre `improvement/` laut
  `git-workflow.md`-Tabelle passender (Lesson #120: Branch-Typ korrigieren, wenn der Scope über
  die initiale Annahme hinauswächst). Umbenennen zieht einen neuen PR nach sich → Entscheidung
  des Auftraggebers.
