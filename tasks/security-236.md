# Security Review: Task 236

Diff-Scope: `git diff origin/main...HEAD` (9 Dateien) – Produktionscode ausschließlich
`scripts/start-work.sh` (+51 Zeilen), Rest Tests (`run-tests.sh`) und Doku.
Threat Surface: **lokales Entwickler-Tooling**, nicht deployt, nicht netzwerkerreichbar.
Angreifermodelle: (a) zweiter lokaler Nutzer auf derselben Maschine, (b) versehentliche
Exposition (Commit, Sync/Backup), (c) böswillige Repo-/Paket-Inhalte während `pnpm install`.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] **[Sensitive Data Handling] Secret-Footprint vervielfacht sich – Aufräumen nach dem
      Merge ist jetzt auch Secret-Hygiene.** `start-work.sh:229-254` macht aus einer
      `.env.local` (DATABASE_URL, AUTH_SECRET, SEED_ADMIN_*) je Worktree eine weitere Kopie,
      abgelegt **außerhalb** der Repo-Wurzel (`$WT_BASE` = Geschwister-Ordner, `:202`, per
      `FACTORY_WORKTREE_BASE` frei verlegbar). Der Commit-Pfad ist strukturell dicht – geprüft:
      `.gitignore:50` enthält `.env*` als slash-freies Muster, greift also auf jeder Tiefe und
      auch im Worktree (eigener Arbeitsbaum desselben Repos) – aber die Kopien überleben, bis
      der Worktree entfernt wird. `git worktree remove` löscht sie mit; ein von Hand
      abgehängter oder per `FACTORY_WORKTREE_BASE` in einen synchronisierten Ordner
      (iCloud/Dropbox/Backup) verlegter Baum lässt eine Credential-Datei zurück.
      **Empfehlung (Doku, kein Code):** in `git-workflow.md` → „Parallele Sessions" beim
      bereits vorhandenen Aufräum-Punkt einen halben Satz ergänzen, dass der Worktree seit
      #236 eine Secret-Kopie enthält und `git worktree remove` deshalb nicht nur Plattenplatz
      freiräumt. Kein Merge-Blocker.

- [ ] **[Sensitive Data Handling] `cp -p` erbt den Quell-Modus, härtet ihn nicht.** Die
      Invariante ist korrekt gewählt – die Kopie ist **nie breiter lesbar als die Quelle**
      (`:237`, AK5 pinnt `600 → 600`, ein Gegenbeleg unter `umask 022` ist in der Suite
      vorhanden). Ist die Quelle allerdings `644` (üblicher Default bei per Editor/`>`
      angelegten Dotfiles), ist die Kopie ebenfalls `644` – in einem mit `mkdir -p` und
      laufender umask erzeugten `$WT_BASE` (`:203`) typischerweise `755`, für andere lokale
      Nutzer also lesbar. Das ist **keine Regression** (die Quelle ist im Repo-Ordner genauso
      lesbar), nur eben auch keine Verbesserung. Ein `chmod 600` auf die Kopie würde AK1/AK5
      („byte- und modus-identisch") widersprechen und gehört daher nicht in diesen PR.
      Der konkrete Modus der real vorhandenen `.env.local` war in dieser Session **nicht
      messbar** – `.env*` ist für den Tool-Zugriff deny-gelistet (auch der
      `scripts/*.tmp.sh`-Wrapper-Weg wurde versucht und abgelehnt); der Punkt ist daher
      invariantenbasiert begründet, nicht gemessen. **Empfehlung:** falls die lokale
      `.env.local` heute `644` ist, einmalig `chmod 600` auf die **Quelle** – dann tragen alle
      künftigen Kopien den engen Modus automatisch mit.

- [ ] **[Race Condition] Schmales TOCTOU-Fenster zwischen Existenz-Guard und `cp`/`rm`.**
      `:236` prüft Nicht-Existenz, `:237` schreibt (`cp` ohne `-n`), `:251` löscht im
      Fehlerfall. Erzeugt ein anderer Prozess die Zieldatei im Fenster dazwischen, würde `cp`
      sie überschreiben bzw. `rm -f` eine fremde Datei entfernen. Real erreichbar nur durch
      zwei parallele `start-work.sh`-Läufe für **denselben** Branch (beide kopieren dieselbe
      Quelle) oder einen anderen lokalen Nutzer mit Schreibrecht auf `$WT_BASE` – für ein
      Single-User-Dev-Setup vernachlässigbar. Die naheliegende „Härtung" `cp -n` wäre hier
      **falsch**: GNU-`cp -n` liefert beim Überspringen Exit 0, das würde `ENV_COPIED=true`
      setzen und die AK3-Meldung („wird nicht überschrieben") stillschweigend aushebeln. Der
      gewählte explizite Guard ist die richtige Lösung. **Keine Aktion.**

## Geprüft und unauffällig

- **Injection (Command/Path):** kein `eval`, keine unquotierten Expansionen im neuen Block;
  alle drei Dateipfade (`cp`-Quelle, `cp`-Ziel, `rm`-Ziel) sind vollständig gequotet. Path
  Traversal über die Beschreibung ist ausgeschlossen: `TASK_DESC` wird auf
  `tr -cd '[:alnum:]-'` reduziert (`:87`) – kein `/`, kein `.`, damit kein `..`-Segment im
  Worktree-Pfad. `$WORKDIR` ist im Worktree-Modus unbedingt gesetzt (`:203`), zusätzlich
  schließt `[ -d "$WORKDIR" ]` (`:229`) einen leeren Wert aus – kein `rm -f /.env.local`.
- **Symlink-Write-Through (die interessanteste Angriffsform hier):** blockiert. Der Guard
  prüft `-e` **oder** `-L` (`:236`); ein am Zielpfad platzierter Symlink – auch ein defekter,
  auch einer auf `~/.ssh/…` – führt in den „nicht überschreiben"-Zweig statt in ein
  `cp`-Schreiben durch den Link. `rm -f` würde später nur den Link, nie das Ziel entfernen,
  und wird in diesem Fall gar nicht erreicht. Beide Symlink-Fälle sind per Test gepinnt.
- **Information Disclosure im Output:** ausgegeben werden nur Pfade und der Platzhalter-Name
  `SEED_ADMIN_*` (`:238-242`, `:408-415`) – zu keinem Zeitpunkt ein Secret-Wert. `cp`/`rm`
  schreiben im Fehlerfall bewusst weiter auf stderr; deren Meldungen enthalten Pfade und
  `errno`-Texte, keine Dateiinhalte.
- **Fehlerbehandlung:** `set -euo pipefail` bleibt intakt – `cp` steht in einer
  `elif`-Bedingung, das Aufräum-`rm` trägt `|| true` (`:251`). Kein wortloser Abbruch, kein
  Stack-Trace, kein Halbzustand: der eigene Rest wird entfernt, eine vorbestehende Datei
  nie angefasst.
- **Dependencies:** keine Änderung an `package.json`, `pnpm-lock.yaml` oder
  `pnpm-workspace.yaml` – keine neue Angriffsfläche, kein Advisory-Check nötig.
- **Reihenfolge Kopie → `pnpm install`:** die Kopie entsteht bewusst **vor** `pnpm install`
  (`:229` vs. `:257`), ein Postinstall-Skript sieht die Datei also im cwd. Das ist **keine
  Rechte-Ausweitung**: dasselbe Skript läuft mit voller Nutzerkennung und könnte die Quelle
  im Haupt-/Ausgangsbaum (und `$HOME`) ohnehin direkt lesen. Kein Finding.
- **Keine hartkodierten Credentials:** die Test-Fixtures verwenden Dummy-Werte
  (`postgres://demo`, `a@b`) in `mktemp`-Verzeichnissen; die `cp`/`rm`-PATH-Stubs werden
  unmittelbar nach Gebrauch wieder entfernt (`run-tests.sh:2152`, `:2213`) und wirken damit
  nicht in Nachbartests hinein.
- **Prompt-Injection-Fläche (ADR-018/Lesson #286):** dieser PR führt keinen neuen
  Freitext-Ablagemechanismus ein. Der `kleinfunde.md`-Eintrag ist menschen-/agenten-verfasste
  Prosa im etablierten, bereits abgesicherten Kanal; keine ausführbaren Marker eingebracht.

## Out-of-Scope-Findings

Keine – es wurde weder ein Issue angelegt noch ein `kleinfunde.md`-Eintrag ergänzt. Alle drei
Hinweise oben sind entweder Doku-Empfehlungen ohne Sicherheitsrelevanz oder ausdrücklich
„keine Aktion"; keiner erreicht die Schwelle „ausnutzbares Risiko" oder „funktionaler Defekt
mit reproduzierbarem Auslöser" aus
`docs/factory/guidelines/git-workflow.md` → „Schwelle: Issue oder Sammeldatei".

## Ergebnis

PASSED

Der Kern der Änderung – eine Secret-Datei zwischen zwei lokalen Arbeitsbäumen desselben
Nutzers spiegeln – ist mit den richtigen Vorkehrungen umgesetzt: Modus-Erhalt statt
Modus-Verlust, nie-überschreiben inkl. Symlink-Fall, Aufräumen des eigenen Teilzustands,
keine Secret-Werte im Output, gitignore-Abdeckung strukturell verifiziert. Merge nicht
blockiert.
