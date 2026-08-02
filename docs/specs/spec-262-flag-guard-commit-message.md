# Spec: Flag-Guard für Commit-Messages

## Kontext

Auf Branch `chore/252-factory-defaults-kalibrieren` entstand während einer
`/requirements`-Session ein lokaler Commit mit der wörtlichen Message `--help`
(Commit `2a27728`, Änderungen an `spec-252`/`task-252`). Recherche zur genauen
Entstehung:

- `/requirements` ruft an keiner Stelle `scripts/factory-commit.sh` auf (die
  Skill-Definition und die Requirements-Agent-Persona enthalten keinen
  Commit-Schritt) – der Commit kam also über einen **direkten**
  `git commit -m "--help"`-Aufruf zustande, nicht über `factory-commit.sh`.
- `scripts/factory-commit.sh` validiert nur Argumentanzahl/Nicht-Leerheit
  (`factory-commit.sh:34`), nicht die Form – ein Aufruf wie
  `factory-commit.sh "--help"` oder `"-h"` würde ebenfalls anstandslos
  committen und pushen.
- Ein `commit-msg`-Git-Hook fehlt bisher vollständig: `.git/hooks` enthält nur
  `pre-commit` und `pre-push` (installiert einmalig durch
  `scripts/init-factory.sh` am 2026-07-08). `init-factory.sh` ist ein
  Einmal-Bootstrap – ein späteres Ergänzen der Hook-Logik dort schützt dieses
  bereits initialisierte Repo **nicht** rückwirkend. Ein wiederholt
  ausführbarer Hook-Installer existiert aktuell nicht.
- Git-Worktrees teilen sich `.git/hooks` über das gemeinsame Git-Verzeichnis
  (`git rev-parse --git-common-dir`) – ein einmal installierter Hook gilt
  sofort für alle bestehenden und künftigen Worktrees. Es braucht also keine
  Pro-Worktree-Logik, sondern einen Weg, den Hook in diesem Repo *jetzt*
  scharf zu schalten.

## Scope

**Inbegriffen:**
- `scripts/checks/commit-msg-check.sh`: fail-closed Prüfskript, aufgerufen mit
  dem Pfad zur Commit-Message-Datei (wie vom `commit-msg`-Git-Hook übergeben).
  Lehnt die Message ab, wenn ihr (getrimmter) Inhalt exakt `--help` oder `-h`
  ist; alles andere lässt es unverändert durch.
- `commit-msg`-Hook-Installation, die `scripts/checks/commit-msg-check.sh`
  aufruft (analog zu den bestehenden `pre-commit`/`pre-push`-Hooks).
- `scripts/install-hooks.sh`: neues, **idempotentes** Skript, das
  `pre-commit`-, `pre-push`- und `commit-msg`-Hooks in `.git/hooks`
  installiert/aktualisiert. Beliebig oft ausführbar, ohne Nebenwirkungen bei
  wiederholtem Aufruf. Löst das Retrofit-Problem für dieses und andere bereits
  initialisierte Repos.
- `scripts/init-factory.sh`: installiert für neue Projekte zusätzlich den
  `commit-msg`-Hook (nicht mehr nur `pre-commit`/`pre-push`).
- `scripts/factory-commit.sh`: explizites `-h|--help`-Guard. Erkennt das
  Skript `-h` oder `--help` als (einziges) Argument, gibt nur eine
  Usage-Meldung aus und beendet sich mit Exit 0 – **ohne** `git add`/`commit`/
  `push` auszuführen.
- Tests je Positiv-Fall (reguläre Message committet/verhält sich wie bisher)
  und Negativ-Fall (`--help`/`-h` wird abgelehnt, nichts committet/gepusht).

**Nicht inbegriffen:**
- Allgemeine Commit-Message-Formatprüfung (z. B. Conventional-Commits-Präfix
  `feat:`/`fix:`/…) – nur der Flag-Aussehen-Guard.
- Ablehnung jeder mit `-` beginnenden Message (z. B. `-x`, `-refactor: ...`) –
  bewusst **nicht** in Scope; nur die bekannten Flags `--help`/`-h` werden
  erkannt. Alles andere verhält sich exakt wie bisher.
- Automatischer Aufruf von `scripts/install-hooks.sh` durch `start-work.sh`
  oder andere Skills – die Installation in diesem Repo ist eine einmalige,
  manuelle Aktion nach Merge dieser Task (Hooks gelten danach dank geteiltem
  `.git`-Verzeichnis automatisch für alle Worktrees).

## Akzeptanzkriterien

- [ ] GIVEN der `commit-msg`-Hook ist installiert WHEN `git commit -m "fix: foo"`
      (reguläre Message) ausgeführt wird THEN wird der Commit wie bisher
      angelegt (kein Abbruch, keine Fehlermeldung).
- [ ] GIVEN der `commit-msg`-Hook ist installiert WHEN `git commit -m "--help"`
      oder `git commit -m "-h"` ausgeführt wird THEN lehnt der Hook den Commit
      fail-closed ab (Exit ≠ 0, klare Fehlermeldung, **kein** Commit entsteht).
- [ ] GIVEN eine Commit-Message, die mit `-` beginnt, aber nicht `--help`/`-h`
      ist (z. B. `-x`) WHEN committet wird THEN bleibt das bisherige Verhalten
      erhalten (Hook lehnt **nicht** ab) – explizite Abgrenzungs-/
      Negativ-Kontrolle gegen zu breites Matching.
- [ ] GIVEN `scripts/factory-commit.sh -h` oder `scripts/factory-commit.sh --help`
      wird aufgerufen WHEN das Skript läuft THEN gibt es nur eine
      Usage-Meldung aus, Exit 0, **kein** `git add`/`commit`/`push`.
- [ ] GIVEN `scripts/factory-commit.sh` wird mit einer regulären, nicht-leeren
      Commit-Message aufgerufen (kein `-h`/`--help`) WHEN das Skript läuft
      THEN verhält es sich wie bisher (committet und pusht) – Regressionstest.
- [ ] GIVEN `scripts/factory-commit.sh` wird mit einem anderen, nicht-leeren
      `-`-präfigierten Argument aufgerufen (z. B. `-x`) WHEN das Skript läuft
      THEN wird es wie jede andere Commit-Message behandelt (kein
      Sonderverhalten außer für `-h`/`--help`) – Abgrenzungstest.
- [ ] GIVEN ein Repo (neu oder bereits initialisiert) WHEN
      `bash scripts/install-hooks.sh` ausgeführt wird THEN sind danach
      `pre-commit`, `pre-push` und `commit-msg` in `.git/hooks` installiert
      und ausführbar; ein wiederholter Aufruf verändert das Ergebnis nicht
      (idempotent).
- [ ] GIVEN `scripts/init-factory.sh` wird für ein neues Projekt ausgeführt
      WHEN die Hook-Installation läuft THEN ist der `commit-msg`-Hook Teil der
      installierten Hooks (nicht nur `pre-commit`/`pre-push`).

## Fehlerszenarien

- [ ] GIVEN die Commit-Message-Datei ist beim `commit-msg`-Hook-Aufruf nicht
      lesbar/kein Argument übergeben WHEN `commit-msg-check.sh` läuft THEN
      bricht es fail-closed mit Fehler ab (kein stilles Durchwinken).
- [ ] GIVEN eine leere Commit-Message WHEN committet wird THEN bleibt die
      bestehende Leer-Prüfung (Git selbst / `factory-commit.sh:34`) unverändert
      wirksam – kein Duplikat, keine Regression.

## Offene Fragen

- [ ] Code-Duplikation zwischen `scripts/install-hooks.sh` und dem
      Hook-Installationsblock in `scripts/init-factory.sh` – gemeinsame
      Quelle (z. B. `init-factory.sh` ruft `install-hooks.sh` auf) oder
      bewusst getrennt halten? → Architektur-Entscheidung in `/architecture`.
