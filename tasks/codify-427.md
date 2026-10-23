## Codify-Report: Task 427

> Grundlage: `tasks/review-427.md` (3 Iterationen, 8 Wichtig-Findings, ~30 Nitpicks),
> `tasks/security-427.md` (Review + Re-Review, 6 Wichtig-Findings), `/test`- und `/refactor`-Notizen der
> Task-Datei. **Einschränkung:** X1 verbietet in diesem PR Änderungen an Factory-Dateien außer dem
> ADR-063-Nachtrag – Factory-Lessons, Guidelines und `docs/factory/kleinfunde.md` waren gesperrt.
> Projekt-Learnings stehen deshalb in `docs/project/lessons/`, die generischen in Issue #438.

### Muster

1. **Gate um einen fremden Scanner unvollständig gedacht (Security, 2 Runden).** Abschalt-Eingänge außerhalb
   des Aufrufs (Ziel-/Arbeitsverzeichnis-Dateien, Umgebung, Inline-Marker, globale Fingerprints) und
   ungeprüfte Datenflächen (Messages, Refs außerhalb von Branches/Tags). Der Fix für einen Fund führte zwei
   neue ein – geprüft war nur mit dem Stub, nicht mit dem echten Scanner.
2. **Umschreibregel nur gegen Fixtures getestet (Review 1).** Der echte Bestand hatte Formen, die die
   Fixtures nicht kannten (21 Sprunganker); der erste Gegenentwurf hätte echte Verweise (`#36-Gate`) verloren.
3. **Doku-Drift in frisch geschriebener ADR/Task-Datei (Review 1–3).** `.gitignore` als Altpfad, fehlende
   Falsch-Positiv-Liste im ADR, unmarkierte D5-Abweichung, Farbcode-Pauschalaussage – Rezidiv der
   bestehenden Lessons #253/#211; die Lessons griffen, die Funde kamen aber erst im Review.
4. **Testlücken trotz „erstem Lauf grün" (Implement, Rework, /test).** Mutationen fanden zweimal Lücken;
   ein Test war vakuös grün (Abwesenheit auf leerer Ausgabe) – Rezidiv der Mutations-Lesson.
5. **Rework erzeugt Regression (Review 3).** Prozess-Substitution verschluckte den Exit-Code von
   `git ls-files` → `qualify` fail-open.

Gut funktioniert: Messung gegen echte Werkzeuge im Wegwerf-Repo (Probelauf, Gegenproben), Mutationsbelege
je neuem Test, isolierte Negativtests mit „übrige Prüfungen ok", strikte Trennung Projekt/Factory (X1 hielt
über alle Reworks).

### Neue Regeln hinzugefügt

- `docs/project/lessons/repo-werkzeuge.md` (neu) – „Gate um einen fremden Scanner: alle Abschalt-Eingänge und
  alle Datenflächen vorab aufzählen, je Eintrag Test, Fix mit echtem Scanner gegenprüfen" – wegen: Muster 1.
- `docs/project/lessons/repo-werkzeuge.md` – „Umschreibregel über Repo-Inhalt: alte gegen neue Regel auf dem
  echten Bestand vergleichen" – wegen: Muster 2.
- `docs/factory/PROJECT-CONTEXT.md` – neue Index-Gruppe „repo-werkzeuge.md" mit „Laden bei"-Trigger
  (`/implement`, `/review`, `/security-review` an `scripts/project/factory-extract*` oder neuem Scanner-Gate).
  `@import`-Deckel: 1037 von 1100 Zeilen.

### Zurückgestellt (Factory-Dateien, X1) → Issue #438

- `bash-gotchas.md`: Prozess-Substitution verschluckt den Exit-Code (Muster 5).
- `lessons/factory-workflow.md`: `factory-commit.sh` macht `git add -A` – getrennte Commits nur bei sauberem
  Arbeitsbaum; Kleinfunde an Factory-Dateien während einer X1-Task.
- `lessons/testing.md`: Rezidiv Mutationsbeleg/vakuöse Abwesenheits-Assertion (Muster 4).

### Keine Änderungen nötig

- Muster 3 (Doku-Drift): bestehende Lessons #253/#211/#55 decken den Fall; die Funde kamen planmäßig im
  Review und sind dort behoben. Keine neue Regel.

### Empfehlung für nächste Features

- **T1b-2 (#436):** `scan` vor dem Bootstrap-Push mit den echten Werkzeugen laufen lassen und den Bericht
  in den PR-Body übernehmen; der Falsch-Positiv-Fingerprint hängt am Ziel-Hash. `qualify`-Grenzen und
  Hinweise stehen in der Task-Datei. Issue #437 (`ownership-check.sh` und Umlaut-Pfade) und #438
  (Factory-Lessons) im Factory-Repo mitnehmen.
- Bei jeder neuen Sicherheits-Absicherung den Gegenbeweis mit dem echten Werkzeug im selben Schritt führen,
  nicht erst im Re-Review.
