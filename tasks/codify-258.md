## Codify-Report: Task 258

### Neue Regeln hinzugefügt

- **`docs/factory/lessons/factory-workflow.md`** (Nachtrag 3 zur bestehenden Lesson
  „Reihenfolge-Guards: Kommando ≠ Prosa-Erwähnung") – wegen: Review-Runde-3-Finding. Der
  AK4-Regressions-Guard (`run-tests.sh`, „kein Job hat mehr seinen eigenen `wget`+`chmod`-Block")
  war ein OR-Fragment-Grep, dessen erste Alternative nie feuern konnte (die geprüften Tokens
  standen im entfernten Konstrukt auf getrennten Zeilen) und dessen zweite Alternative nur eine
  einzige `chmod`-Schreibweise erkannte. Per Mutation belegt: der entfernte Block ließ sich mit
  gepinnter URL + `chmod 0755` wortgleich wieder einsetzen, ohne dass die Suite rot wurde – genau
  der Fall, den die in diesem PR neu geschriebene CLAUDE.md-Regel verbieten sollte. Vierter
  Rückfall in dieselbe Fehlerklasse (#114/#265/#261), diesmal als **Abwesenheits**- statt
  Präsenz-Guard: die Lesson bekommt einen neuen Nachtrag, der die Regel auf Anti-Muster-Guards
  erweitert (defining-feature-Treffer statt Fragment-OR-Liste + Gegenprobe mit plausibler
  Variation).
  → Index-Zeile in `PROJECT-CONTEXT.md` ergänzt.

- **`docs/factory/lessons/factory-workflow.md`** (neue Lesson „Existenz-Guard auf eine
  Security-Pin-Konstante beweist nicht ihre Verdrahtung an den Vergleichsaufruf") – wegen:
  Review-Runde-2-Finding. Der neu eingeführte Repo-Pin `YQ_SHA256` (zweiter Anker gegen einen
  kompromittierten Publisher) wurde zunächst nur auf Existenz/Format geprüft, nicht auf seine
  tatsächliche Verwendung als Argument im Vergleichsaufruf `verify_sha256`. Der gefährliche Fall
  wäre ein Refactor gewesen, der den Vergleich mit dem gerade erst extern gelesenen Wert statt
  mit dem Pin füttert – dann wird die Prüfung trivial wahr und bleibt in Self-Test **und** CI
  grün. Das ist eine eigene Variante von „Existenz beweist nicht Verhalten" (#212) und „Floor auf
  einen Lookup-Key ist kein Floor auf die Zielseite" (#241), bisher nicht für den Fall
  „Argumentidentität am Vergleichsaufruf einer Sicherheitskonstante" dokumentiert.
  → Index-Zeile in `PROJECT-CONTEXT.md` ergänzt.

### Als Issue angelegt (Out-of-Scope-Follow-up)

- **[#285](https://github.com/nothra/tch-gastro-services/issues/285)** (`enhancement` +
  `tech-debt`) – Der während der Implementierung beobachtete CI-Flake (Run 30809774637: Download
  von `checksums_hashes_order` schlug fehl, Folgelauf grün) deutet darauf hin, dass
  `wget --tries=3` in `install-yq.sh` transiente HTTP-Fehlerantworten nicht zuverlässig
  wiederholt; mit drei Downloads pro Aufruf steigt die Flake-Wahrscheinlichkeit. Der
  Security-Review hatte das bereits als „kein Finding, eigener Scope" markiert – hier als Issue
  festgehalten, damit es nicht nur in der Task-Notiz verloren geht.
  (Verwandtes, bereits vom Security-Review anders begründetes Issue
  [#284](https://github.com/nothra/tch-gastro-services/issues/284) betrifft den unversionierten
  `npm install -g @anthropic-ai/claude-code` im selben `factory-poll`-Job – nicht Teil dieses
  Codify-Laufs, da schon vom Security-Review angelegt.)

### Keine Änderungen nötig

- Die Mutationstest-Disziplin (jeder neue Guard per Mutation als diskriminierend belegt, nicht
  behauptet) ist bereits durch mehrere bestehende Lessons abgedeckt (#212, #214) – kein neuer
  Eintrag nötig, die Task hat sie nur wiederholt korrekt angewendet.
- Die `hex64`-Platzierung (Review-Nitpick über zwei Runden, im `/refactor`-Schritt sauber gelöst)
  ist ein normaler Platzierungs-Fund, kein wiederkehrendes Fehlermuster – keine Lesson wert.
- Das Zwei-Anker-Sicherheitsdesign selbst (Pin gegen Publisher-Kanal statt nur gegen dessen
  eigene Checksums) ist ein Architektur-Pattern, kein Prozessfehler der Factory – gehört in eine
  künftige Security-Guideline, falls das Muster wiederkehrt, nicht in die Stolperstein-Lessons.

### Empfehlung für nächste Features

- Bei jedem neuen sicherheitsrelevanten Pin/Anker (Checksum, Secret-Referenz, erlaubte
  Domain-Liste): sofort mitdenken, ob ein Guard nur die Existenz der Konstante oder auch ihre
  Verdrahtung an den tatsächlichen Vergleichs-/Enforcement-Punkt prüft – und das per Mutation
  (Vertauschen der Vergleichsseiten) verifizieren, nicht nur behaupten.
- Bei jedem neuen Abwesenheits-/Regressions-Guard („Muster X darf nicht mehr vorkommen"): die
  Gegenprobe nicht nur mit dem exakt entfernten Wortlaut fahren, sondern mit einer plausiblen
  Variation (andere Zeilenteilung, andere Flag-Schreibweise) – sonst bleibt eine zu enge
  Fragment-Liste unbemerkt.
