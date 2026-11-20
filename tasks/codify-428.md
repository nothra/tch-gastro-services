## Codify-Report: Task #428

### Neue Regeln hinzugefügt
- `docs/project/lessons/testing.md` (+ Index-Zeile in `docs/project/lessons/INDEX.md`, Gruppe testing): „Projekt-Test liest eine Datei, die ein Factory-Sync löscht oder ersetzt" – wegen: zwei Projekt-Tests (`#431 AK-F4`, `AK-D3`) lasen `OWNERSHIP.md`/`FACTORY.md`; der „grün"-Bericht stammte aus einem Lauf vor dem Löschen, erst CI und Review deckten es auf (Rezidiv der Familie #370 „Löschen → alle Treffer greppen", hier an Tests statt Doku).

### Keine Änderungen nötig
- CLAUDE.md/Guidelines: kein universelles Muster, das nicht schon durch Lessons (#370, #426 historienlesender Test, #264 SIGPIPE-Klasse) abgedeckt ist.
- Der `factory-self-test`-Flake (SIGPIPE in vendortem `run-tests.sh`) trat nach Neustart nicht wieder auf; Lesson existiert bereits auf Factory-Seite.

### Für die Factory (nicht in diesem PR änderbar, Freigabe für Issue nötig)
- Die vendorten Skills `/review`, `/security-review`, `/codify` verweisen noch auf `docs/factory/OWNERSHIP.md`, die es im Konsumenten nicht mehr gibt (Zuordnung steht in `factory.lock`).
- `/codify` nimmt den Projekt-Lessons-Index in `PROJECT-CONTEXT.md` an; mit dem Deckel 750/38.000 passt ein großer Projekt-Index dort nicht mehr (TCH-Lösung: `docs/project/lessons/INDEX.md`). Beides zusammen an dev-factory#60 bzw. als eigenes Issue.

### Empfehlung für nächste Features
- Nach jedem Factory-Sync: Projekt-Suite nach dem letzten Dateieingriff laufen lassen, Lauf im Bericht datieren.
- Vor dem Merge: Drift-Liste AK2.18c neu erzeugen, `FACTORY_SYNC_TOKEN` (Environment `factory-update`) anlegen, nach dem Merge `factory-integrity` als Required Check eintragen.
