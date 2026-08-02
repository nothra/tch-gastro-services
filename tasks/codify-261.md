## Codify-Report: Task 261

### Neue Regeln hinzugefügt
- `docs/factory/lessons/factory-workflow.md` (Abschnitt "Reihenfolge-Guards: Kommando ≠
  Prosa-Erwähnung") – **Nachtrag 2** ergänzt: Präsenz-/Idiom-Guards für Konstrukte, die
  sich über **mehrere Zeilen** erstrecken, dürfen nicht auf ein datei-weit matchendes
  Kommando-Fragment ausweichen (kein Single-Line-`grep -E` möglich) – stattdessen den
  bereits etablierten `awk`-Block-Extraktions-Ansatz nutzen (`cv_job_block`/
  `ci_selftest_block` aus #255), bei Bedarf mit bewusst *inklusiven* statt exklusiven
  Blockgrenzen (im Kommentar benannt). Wegen: Der erste `/implement`-Durchlauf dieser
  Task schrieb genau den kritisierten Fragment-Grep (`grep -qE 'done \|\| true'
  "$PIPELINE"`), obwohl die zugrundeliegende Lesson ("Anker ist die exakte Aufruf-Zeile,
  nie ein Kommando-Fragment", bereits mit einem Rezidiv aus #265 dokumentiert) zu diesem
  Zeitpunkt schon existierte – **drittes Rezidiv desselben Musters**, diesmal aber nicht
  als Reihenfolge-Guard, sondern als Präsenz-Guard auf ein Multi-Zeilen-Konstrukt. Die
  bestehende Lesson allein hat die Wiederholung nicht verhindert, weil sie implizit auf
  Reihenfolge-Checks gerahmt war und keine konkrete Technik für den Multi-Zeilen-Fall
  nannte. Von zwei der drei Review-Runden unabhängig gefunden.
- `docs/factory/PROJECT-CONTEXT.md` – Index-Zeile zum obigen Learning aktualisiert:
  Titel auf "Reihenfolge-/Präsenz-Guards" verbreitert, drittes Rezidiv (#261) samt
  Multi-Zeilen-Technik ergänzt, "Laden bei"-Trigger um "Bash-Wiring-Tests
  (`run-tests.sh`)" erweitert – damit künftige `/implement`/`/review`-Durchläufe an
  neuen Bash-Wiring-Tests diese Lesson gezielt laden, nicht nur bei Skill-Doc-/CI-Guards.

### Keine Änderungen nötig
- Der eigentliche Produktionscode-Fix (`|| true` nach `done` in `pipeline_summary()`) war
  in allen drei Review-Runden unstrittig korrekt – kein Fehler-Muster, keine neue Regel.
- Security-Review: PASSED ohne Findings – keine sicherheitsrelevante Regel abzuleiten.
- Die Test-Vollständigkeitslücke (AC2/AC3 nur strukturell, nicht empirisch belegt) wurde
  durch die bereits bestehende Lesson "AC mit Direktive + Begründung: je separierbaren
  Teil eine eigene Assertion (aus #117, /test-Selbstfund)" bereits abgedeckt – der
  `/test`-Schritt dieser Task ist eine erfolgreiche Anwendung dieser Regel, kein neuer
  Lernfall.
- Die übrigen drei Review-Nitpicks (Regex-Duplikation, Kommentar-Präzision, Naming)
  wurden im `/refactor`-Schritt behoben; keine davon war generalisierbar genug für eine
  eigene Lesson (reine Einzelfall-Cleanups).

### Empfehlung für nächste Features
Bei jedem neuen Guard/Test, der prüft, ob ein bestimmtes Code-Idiom **an einer bestimmten
Stelle** vorhanden ist (nicht nur "irgendwo in der Datei"): zuerst prüfen, ob das zu
prüfende Konstrukt in eine einzige Zeile passt. Wenn nicht, direkt mit der
`awk`-Block-Extraktion beginnen (Precedent: `cv_job_block`, `ci_selftest_block`,
`codify_block_awk`) statt mit einem schnellen Fragment-Grep zu starten, der später im
Review nachgebessert werden muss.
