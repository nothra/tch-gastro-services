## Codify-Report: Task 312

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  „Content-scannender Anti-Regressions-Guard in run-tests.sh ist blind für Tracked-Status" +
  Index-Zeile in `PROJECT-CONTEXT.md` – wegen: Der Gotcha-Guard „kein `grep -c … || echo`" in
  `run-tests.sh` scannt `$SCRIPTS_DIR` inhaltlich per `grep -r`, nicht nur getrackte Dateien.
  Liegengebliebene, gitignorete `scripts/*.tmp.*`-Scratch-Dateien aus vorherigen Review-Sessions
  lösten dadurch **zweimal in derselben Task** (Runde 2 und Runde 3) einen falschen roten
  Testlauf aus, obwohl `git status` (ohne `--ignored`) sauber war. Ein Rezidiv desselben
  Musters innerhalb einer einzigen Task rechtfertigt eine eigene Regel: bei unerwartetem Rot
  eines verzeichnisweiten Content-Scan-Guards zuerst `git status --ignored` prüfen, bevor der
  Fund als Code-Regression behandelt wird.
- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) „Zähl-Assertion in
  einem per awk extrahierten Funktionsrumpf: Label behauptet mehr, als das Fenster messen kann"
  + Index-Zeile – wegen: Review-Runde-3-Finding W1. Eine Zähl-Assertion war auf ihr bewusst
  begrenztes Extraktionsfenster korrekt gepinnt, ihr Label behauptete aber eine Eigenschaft des
  gesamten Aufruf-Pfads („genau einmal pro Versuch"), die eine außerhalb des Fensters liegende
  Hilfsfunktion (`report_is_fresh_and_valid()`) faktisch widerlegte. Zwei vorherige
  Review-Runden hatten die falsche Zusammenfassung unwidersprochen übernommen – erst eine
  dritte, nachbauende Prüfung deckte die Diskrepanz auf. Neue Regel: das Label einer
  Zähl-Assertion darf nur behaupten, was das Extraktionsfenster tatsächlich abdeckt.

### Keine Änderungen nötig

- Kritische/wichtige Code-Findings aus Review und Security-Review: keine offen (die drei
  Review-Runden fanden ausschließlich Doku-Drift und Testabdeckungslücken, alle behoben; die
  Security-Review fand keine Findings – reine CI-Tooling-Änderung ohne Anwendungscode-Berührung).
- Circuit-Breaker-Auslösung selbst ist kein Codify-Kandidat: Der Mechanismus hat exakt wie
  spezifiziert funktioniert (3 Iterationen ohne vollständige Konvergenz → Stopp, manuelle
  Entscheidung). Der verbleibende Punkt war trivial (Kommentar-/Label-Text) und ist durch das
  bestehende Verfahren (menschliche Entscheidung: direkt beheben statt vierter
  `/implement`-Durchlauf) korrekt aufgelöst worden – keine neue Regel nötig.

### Empfehlung für nächste Features

- Bei einem manuellen Fix eines von `/review` gemeldeten Kommentar-/Label-Textes: sofort per
  Grep prüfen, ob der neue Wortlaut selbst ein Fragment enthält, das eine benachbarte
  Zähl-Assertion mitzählt (hier: das Wort `report_verdict` im neu geschriebenen Kommentar
  innerhalb von `run_skill()`). Trat in dieser Task direkt beim ersten Korrekturversuch auf.
