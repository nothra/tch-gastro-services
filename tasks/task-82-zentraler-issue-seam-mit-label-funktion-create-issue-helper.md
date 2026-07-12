# Task 82: zentraler-issue-seam-mit-label-funktion-create-issue-helper

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Issues werden an mehreren Stellen erzeugt (`start-work.sh`, `sync-issues.sh --create`, künftig
auch aus Skills wie `codify`/`review`/`security-review`, die einen Fund klassifizieren). Jede
Stelle wiederholt `gh issue create` mit leicht abweichender Logik, und die Label-Setzung ist
uneinheitlich: Das Art-Label wird erst seit #80 in `start-work.sh` gesetzt; **Aspekt-Labels**
(`security`/`tech-debt`/`test`) werden nirgends angeboten – obwohl gerade `codify`/`review`/
`security-review` eine begründete Aspekt-Empfehlung treffen.

Ziel: **ein einziger Seam** für die Issue-Anlage, durch den *jeder* Erzeugungszeitpunkt läuft
und der Label-Vergabe (Art-Label + optionale Aspekt-Labels) einheitlich anbietet.

## Akzeptanzkriterien
- [ ] GIVEN eine neue Bibliotheksfunktion `scripts/lib/create-issue.sh`
      (`create_issue <title> <body> <art-label> [aspekt-csv]`), WHEN sie aufgerufen wird,
      THEN legt sie das Issue an, setzt Art- + Aspekt-Labels und gibt die Issue-Nummer auf
      stdout zurück.
- [ ] GIVEN ein Label existiert im Repo nicht, WHEN das Issue angelegt wird, THEN wird es
      trotzdem angelegt (fail-open aufs Label, Warnung), aber die Anlage selbst scheitert
      fail-closed, wenn gar kein Issue entsteht.
- [ ] GIVEN `start-work.sh`, WHEN es ein Issue anlegt, THEN nutzt es `create_issue`
      (Art-Label wie bisher aus Branch-Typ) und akzeptiert **optional** `--labels a,b`
      für Aspekt-Labels.
- [ ] GIVEN `sync-issues.sh --create`, WHEN es fehlende Issues anlegt, THEN nutzt es
      denselben Seam (kein eigenes `gh issue create` mehr).
- [ ] GIVEN die Skills `codify`/`review`/`security-review` empfehlen ein Aspekt-Label,
      WHEN daraus ein Issue entsteht, THEN geben sie die Empfehlung an den Seam weiter
      (Skill-Doku entsprechend anweisen).
- [ ] GIVEN der Self-Test, WHEN er läuft, THEN deckt er den Seam ab (Art-Label, Aspekt-CSV,
      fehlendes Label, stdout-Nummer) und bleibt grün.
- [ ] GIVEN die Entscheidung „zentraler Issue-Seam + Label-Konvention", THEN ist sie als
      ADR unter `docs/adr/` dokumentiert (inkl. Frage: welche Skills dürfen autonom Issues
      anlegen vs. nur Empfehlung in Datei).

## Technische Notizen
- **Seam extrahieren, nicht neu erfinden:** Die fail-open-Label-Logik existiert bereits in
  `start-work.sh` (aus #80) – von dort in `scripts/lib/create-issue.sh` herausziehen und beide
  bisherigen Aufrufer (`start-work.sh`, `sync-issues.sh`) darauf umstellen (DRY).
- **Art vs. Aspekt sauber trennen:** genau ein Art-Label (`bug`/`enhancement`/`documentation`),
  null..n Aspekt-Labels (`security`/`tech-debt`/`test`) – siehe `git-workflow.md` „GitHub-Labels".
  Der Seam validiert das nicht hart (fail-open), aber die aufrufenden Skills sollen die
  Konvention einhalten.
- **Skills legen heute keine Issues an** (nur Empfehlungen in Dateien). Die ADR muss klären,
  ob `codify`/`review`/`security-review` künftig autonom `create_issue` aufrufen dürfen oder
  weiterhin nur eine Empfehlung schreiben, die ein Mensch via `start-work.sh` übernimmt.
- **Portabilität** beachten (`bash-gotchas.md`, clean-code.md „Portabilität in Gate-Skripten“):
  POSIX-taugliche Shell, `gh`-Aufrufe stubbar für den Self-Test (Muster: `GH_LOG` aus
  run-tests.sh, siehe #80).
- **Scope-Abgrenzung:** baut auf PR #81 (#80) auf – erst mergen lassen, dann hier rebasen,
  damit die Art-Label-Logik in `start-work.sh` schon vorhanden ist.

## Offene Fragen
- Dürfen Skills Issues **autonom** anlegen, oder bleibt es bei „Empfehlung in Datei → Mensch
  entscheidet"? (→ ADR)
- Soll der Seam Aspekt-Labels gegen eine erlaubte Menge prüfen (fail-closed) oder frei
  durchreichen (fail-open)? Vorschlag: frei durchreichen, Konvention in der Skill-Doku.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/82-zentraler-issue-seam-mit-label-funktion-create-issue-helper`
Erstellt: 2026-07-12 14:32
