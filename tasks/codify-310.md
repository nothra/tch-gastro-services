## Codify-Report: Task 310

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  (Nachtrag 6 zur Lesson „Reihenfolge-Guards: Kommando ≠ Prosa-Erwähnung") – **siebtes Rezidiv**,
  diesmal an einem Mutationsbeleg statt einem Präsenz-/Reihenfolge-Guard: Der erste Anlauf des
  Interrupt-Mutations-Guards ankerte auf dem Dateinamen `interrupt-check.sh` statt auf der
  vollständigen Aufrufzeile und löschte damit den eigenen, direkt darüberstehenden WHY-Kommentar
  statt der Aufrufzeile selbst – der Wirksamkeits-Guard blieb trotzdem grün, weil er dieselbe
  Fragment-Zeichenkette zählte. Vor dem Review als `/implement`-Selbstfund behoben. Neue Regel:
  Lösch-Anker eines Mutations-Guards und die begleitende Wirksamkeits-Zählung müssen dieselbe
  **vollständige Aufrufzeile** treffen, nie ein Dateinamen-/Kommando-Fragment.
  Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` ergänzt.

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) (5. Vorkommnis der
  Duplikat-Smell-Lesson aus #240/#267) – Review-Finding W3: eine neue, **parallele**
  Test-Scaffold-Funktion (`scaffold_310`) baute ein komplettes Wegwerf-Repo neu auf, obwohl
  `_mk_pipe_repo` bereits dasselbe Grundgerüst lieferte. Anders als die bisherigen vier
  Vorkommnisse (rumpfidentische Schleife/Assertion) trifft der Smell hier eine
  Scaffold-/Fixture-Funktion, die das Grundgerüst nicht wiederverwendet, statt eine exakte
  Kopie zu sein. In `/implement` per Review-Rework auf „`_mk_pipe_repo` aufrufen + Differenz
  ergänzen" korrigiert. Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` ergänzt.

### Keine Änderungen nötig

- Das vorbestehende Security-Finding (Verdict-Konsum in Phase 2/5 fail-open bei Exit-0 ohne
  Report-Neuschrieb) ist bereits als Issue **#312** getrackt (Aspekt-Label `security` in dieser
  Task ergänzt) – kein zusätzlicher Codify-Schritt, da der Fix außerhalb des Scopes von #310
  liegt und eine eigene Task/Spec braucht.
- Die drei kosmetischen Nitpicks aus Review-Runde 3 (Kommentar-Asymmetrie, dreifache Aufrufzeile,
  ADR-Doppelnennung) wurden bereits im `/refactor`-Schritt behoben – kein wiederkehrendes Muster,
  keine neue Regel nötig.
- Die bewusst offen gelassene doppelte Verneinung in `run-tests.sh:5799` ist eine Einzelfall-
  Entscheidung (Mutationsbeleg braucht denselben negierten Ausdruck, `lessons/testing.md`/#286)
  und keine neue Lesson.

### Empfehlung für nächste Features

- Bei jedem neuen Mutations-Guard (nicht nur Reihenfolge-/Präsenz-Guards) vor dem Commit explizit
  gegenprüfen, ob Lösch-Anker und Wirksamkeits-Zählung dieselbe vollständige Zeile statt eines
  Fragments treffen – besonders wenn im selben Commit ein erklärender Kommentar in der Nähe der
  geguardeten Zeile entsteht (Kollisionsquelle laut #284/#310 ist regelmäßig der eigene, frisch
  geschriebene Kommentar).
- Bei neuen Test-Scaffold-Funktionen in `run-tests.sh` immer zuerst nach einer bestehenden
  Grundgerüst-Funktion (`_mk_pipe_repo` u. Ä.) suchen, auch wenn der neue Testfall zusätzliche
  Fixtures (Stubs, Task-Dateien) braucht, die die bestehende Funktion nicht liefert – Aufruf +
  Differenz-Ergänzung statt Parallelstruktur.
