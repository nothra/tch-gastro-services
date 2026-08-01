## Codify-Report: Task 254

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) — Neuer Eintrag:
  „Kein Argument übergeben"-Test simuliert nicht automatisch Abwesenheit, wenn das Skript
  einen echten Repo-Datei-Default hat" – wegen: Der erste Entwurf von Gate #254 AK6 rief
  `bash "$GATE" "$DEFAULTS"` ohne zweites Argument auf, in der Annahme, das simuliere „kein
  Override vorhanden". `config-validation-check.sh` defaultet `$OVERRIDE` bei fehlendem `$2`
  aber auf den **echten** `$REPO_ROOT/factory.config.yml` (der real existiert und selbst ein
  gültiger Override ist) statt auf einen leeren/fehlenden Pfad. Der Test war grün, bewies aber
  nicht den behaupteten Skip-Pfad — nur im Review (nicht in `/implement` oder `/test` selbst)
  aufgefallen. Fix im selben Zyklus: `$GTMP/does-not-exist.yml` als garantiert fehlender Pfad.
  Index-Zeile ergänzt in [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md)
  (Gruppe `lessons/testing.md`, Trigger: `/implement`, `/test` beim Testschreiben für Bash-Gates
  mit `${N:-$REPO_ROOT/...}`-Default-Argumenten — nicht nur für `config-validation-check.sh`).

### Keine Änderungen nötig
- Die im Review dokumentierten Nitpicks (Case-Statement-Polarität als Allow-List statt
  Deny-List, redundantes `sort -u`, fehlende Zahl `1b` im Header-Regelkatalog) waren
  Einzelfälle mit bereits ausreichender Abdeckung durch die generischen Prinzipien in
  `clean-code.md` ("keine unnötige Komplexität", WHY- statt WHAT-Kommentare) — keine neue,
  eigenständige Regel nötig, im Refactoring-Schritt direkt behoben.
- Die Sicherheits-Bypass-Analyse (Regel 5/241 und 6/249 gegen die neuen Guards) verlief ohne
  Findings — kein neues Härtungs-Learning, da die Reihenfolge bereits in den
  Implementierungs-Hinweisen der Task-Datei korrekt vorgegeben war und im Code eingehalten
  wurde. Kein Out-of-Scope-Issue nötig — alle Findings wurden im Zyklus selbst behoben.
- Kein neuer automatisierbarer Check (`scripts/checks/`) nötig — das gefundene Muster
  (Default-Argument-Fallback maskiert "Abwesenheit"-Test) ist zu spezifisch für einen
  generischen Gate-Check und wird durch die neue Lesson (gezielt geladen bei `/test` für
  Bash-Gates) abgedeckt.

### Empfehlung für nächste Features
- Bei künftigen Erweiterungen von `config-validation-check.sh` (oder anderen Bash-Gates mit
  `${N:-$REPO_ROOT/...}`-Default-Argumenten) vor dem Schreiben eines "Argument X fehlt"-Tests
  die Default-Zeile des Skripts gegenprüfen (`grep -n '\${.*:-'`) — siehe neue Lesson.
- Der dreistufige Review-Prozess (drei unabhängige Sub-Agenten für Logik/Code-Qualität/
  Architektur, dann ein adversarialer Security-Agent) hat sich in diesem Zyklus bewährt: Der
  Logik-Reviewer fand die AK6-Testlücke, die weder `/implement` noch `/test` selbst bemerkt
  hatten — Fortführung dieses Musters für künftige Gate-Erweiterungen empfohlen.
