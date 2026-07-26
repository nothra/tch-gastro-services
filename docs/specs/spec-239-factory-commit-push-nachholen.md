# Spec: factory-commit.sh holt den Push nicht nach, wenn nichts zu committen ist

## Kontext

`scripts/factory-commit.sh` ist laut [ADR-019](../adr/019-stage3-commit-seam-report-guard.md)
die mandatierte Commit/Push-Seam für Stage-3-Agenten. Ihr Skript-Header verspricht: „`git push`
scheitert → der non-zero Exit wird weitergereicht (kein stiller ‚committed, aber nicht
gepusht‘-Zustand)". Der „nichts zu committen"-Zweig (aktuell Zeile 63–66) prüft das aber nicht:
er steigt bei leerem `git diff --cached` sofort mit Exit 0 aus, egal ob der aktuelle Branch noch
ungepushte Commits hat.

Beobachteter Ablauf (2026-07-26, Branch `fix/224-top-level-yaml-edit-allow`): Commit wird
erstellt, `git push` scheitert am pre-push-Gate (flakiger Test) → Exit ≠ 0. Beim nächsten Aufruf
(gleiche Message, keine neuen Änderungen) meldet das Skript „nichts zu committen – übersprungen"
und beendet sich mit Exit 0, **ohne** den Push nachzuholen. Der Commit bleibt lokal.

Das ist für Stage 3 blockierend: ein Sub-Agent hat **keinen** anderen Weg, den Push
nachzuholen – rohes `git push` matcht keine Allow-Regel in `.claude/settings.json` (ADR-019 §1
gibt bewusst keine git-Schreib-Permission frei), und die Endzustands-Verifikation
([ADR-040](../adr/040-pipeline-endzustands-verifikation.md)) wertet ungepushte Commits als
Fehlschlag. Ein transienter Gate-Fehlschlag (flaky Test, kurzes rotes Netz) eskaliert so zu
einem Pipeline-Abbruch, der einen Menschen braucht.

## Scope

**Inbegriffen:**
- Der „nichts zu committen"-Zweig prüft zusätzlich, ob der aktuelle Branch ungepushte Commits
  hat (Commits gegenüber `@{u}` voraus) **oder** noch gar keinen Upstream hat.
- Liegt einer der beiden Fälle vor, holt das Skript den Push nach (gleiche Push-Logik wie im
  bestehenden Commit-Pfad: `git push -u origin HEAD` ohne Upstream, sonst `git push`) statt
  kommentarlos auszusteigen.
- Schlägt dieser nachgeholte Push fehl, wird der Fehlschlag wie beim regulären Push-Pfad
  weitergereicht (Exit ≠ 0) – kein stiller „nichts zu tun"-Erfolg.
- Bleibt wirklich nichts zu tun (kein Diff **und** Branch deckungsgleich mit seinem Upstream),
  unverändertes Verhalten: Meldung „nichts zu committen", Exit 0, keine Aktion.

**Nicht inbegriffen:**
- Keine Änderung an den bestehenden Fail-closed-Guards (kein Arbeitsbaum, detached HEAD,
  main/master, Argumentanzahl) – die laufen unverändert **vor** `git add -A` und damit vor der
  neuen Prüfung.
- Kein `--force`/Force-Push – weiterhin genau ein Argument (die Commit-Message), keine
  destruktiven Operationen.
- Keine Änderung am Commit-Pfad (wenn es etwas zu committen gibt) – nur der leere Zweig wird
  erweitert.

## Akzeptanzkriterien

- [ ] GIVEN nichts zu committen (Arbeitsbaum nach `git add -A` sauber) UND der Branch hat
      Commits, die gegenüber seinem Upstream voraus sind (`git rev-list @{u}..HEAD` liefert
      mindestens einen Commit) WHEN `factory-commit.sh "<msg>"` läuft THEN pusht das Skript den
      aktuellen Branch und beendet sich mit Exit 0 (kein Commit wird erzeugt, da nichts
      Neues vorliegt).
- [ ] GIVEN nichts zu committen UND der Branch hat noch keinen Upstream (z. B. lokal committet,
      aber der vorherige Push ist nie durchgelaufen) WHEN `factory-commit.sh "<msg>"` läuft THEN
      pusht das Skript mit `-u origin HEAD` (legt das Tracking-Ref an) und beendet sich mit
      Exit 0.
- [ ] GIVEN nichts zu committen UND der Branch ist deckungsgleich mit seinem Upstream (keine
      ungepushten Commits) WHEN `factory-commit.sh "<msg>"` läuft THEN erfolgt keine Push-Aktion,
      die bestehende „nichts zu committen"-Meldung erscheint, Exit 0 (unverändertes Verhalten).
- [ ] GIVEN nichts zu committen UND ungepushte Commits liegen vor, aber der nachgeholte
      `git push` scheitert (z. B. kaputtes Remote, Netzwerkfehler, Gate-Ablehnung) WHEN
      `factory-commit.sh "<msg>"` läuft THEN beendet sich das Skript mit Exit ≠ 0 – der
      Fehlschlag wird weitergereicht, kein stiller „erfolgreich übersprungen"-Zustand.
- [ ] GIVEN der Nachhol-Fall (ungepushte Commits vorhanden, kein neuer Commit in diesem Lauf)
      WHEN der nachgeholte Push erfolgreich läuft THEN unterscheidet sich die stderr-Meldung
      erkennbar von der Happy-Path-Meldung „committet und gepusht auf '<branch>'." – sie macht
      im Log explizit sichtbar, dass kein neuer Commit entstanden ist, sondern nur ein
      vorheriger Push nachgeholt wurde (Klärung während `/requirements`, 2026-07-26).

## Fehlerszenarien

- [ ] Die bestehenden Fail-closed-Guards (main/master-Branch, kein Arbeitsbaum, detached HEAD,
      mehr als ein Argument bzw. leere Commit-Message) bleiben unverändert wirksam – sie greifen
      vor der neuen Prüfung und werden von ihr nicht umgangen.
- [ ] Ein diverged Branch (lokale UND entfernte Commits, die auseinanderlaufen) führt beim
      nachgeholten Push zu einem normalen Non-Fast-Forward-Fehlschlag von `git push` – das wird
      wie jeder andere Push-Fehlschlag behandelt (Exit ≠ 0, weitergereicht), kein Force-Push als
      automatische Reaktion.

## Offene Fragen

_Keine – Problem, Ursache und Fix-Ansatz sind im Ursprungs-Issue (#239) bereits vollständig
beschrieben (inkl. Testkatalog, s. u.). `/architecture` entscheidet, ob dafür eine eigene ADR
nötig ist oder eine Ergänzung von ADR-019 genügt._

## Hinweis für /test

Neue Testfälle in `scripts/checks/tests/run-tests.sh` (Abschnitt „#91 factory-commit.sh"),
gleiches Repo-Fixture-Muster (`fc_repo`, echtes Bare-Remote + Klon) wie die bestehenden Fälle:
- „nichts zu committen **mit** ungepushten Commits (kein Upstream)" → Push mit `-u` läuft,
  Exit 0.
- „nichts zu committen **mit** ungepushten Commits (Upstream vorhanden, Branch voraus)" → Push
  läuft, Exit 0.
- „nichts zu committen **ohne** ungepushte Commits" → keine Aktion, Exit 0 (Regressionstest für
  das bestehende Verhalten).
- „nichts zu committen, nachgeholter Push scheitert" → Exit ≠ 0.
