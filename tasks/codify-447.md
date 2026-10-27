## Codify-Report: Task 447

### Neue Regeln hinzugefügt
- `docs/factory/lessons/testing.md` (+ Index-Zeile, Gruppe Factory-Lessons) – Mutationsbeleg für einen Floor-Bump:
  Fixture direkt unter den neuen Floor + Gegenprobe gegen den alten – wegen: Major-6-Fixture 6.28.0 lag schon
  unter dem alten Floor und belegte den Bump nicht (Review-Nitpick).
- `docs/factory/lessons/build-tooling.md` (+ Index-Erweiterung) – Wegwerf-Dateien, fünftes Vorkommnis, Regel
  verschärft: nicht im Repo-Baum anlegen, wenn `rm` nicht freigegeben ist, oder im selben Aufruf löschen – wegen:
  sechs `scripts/*447.tmp.*` blieben bis `/security-review` liegen.
- `docs/factory/PROJECT-CONTEXT.md` – Index-Zeile „Content-Scan-Guard blind für Tracked-Status" um das vierte
  Vorkommnis (#447: `runtests447.tmp.log` machte den `grep -c`-Guard rot) ergänzt.

### Keine Änderungen nötig
- Aspekt-Label `factory-pipeline` fehlte am Issue (Review, wichtig): bestehende Regel in PROJECT-CONTEXT
  („im Zweifel setzen") deckt es bereits; Nachzug per `gh issue edit 447 --add-label factory-pipeline`.
- Dreifach-Advisory-Befund (alle drei undici-GHSAs haben dieselben Floors) und No-op-Ehrlichkeit des Overrides:
  bereits durch Lessons #291/#339/#412 abgedeckt und eingehalten.

### Empfehlung für nächste Features
- Vor `/pr-shepherd`: Label `factory-pipeline` nachziehen, offene Frage in Task-Datei/Spec abhaken.
- Vor dem Merge von Hand löschen: sechs gitignorte `scripts/*447.tmp.*` (danach run-tests.sh 1846 grün erwartet).
- Nach dem Merge: AK12 prüfen (Dependabot-Alert #100 geschlossen).
