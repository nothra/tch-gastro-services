# Review: Task 427

> **Iteration 2** · 2026-10-23 · Scope `git diff origin/main...HEAD` (10 Dateien), Schwerpunkt
> Rework-Commit `9f4d091` · drei Runden (Logik, Code-Qualität, Architektur) als getrennte
> Sub-Agenten. Iteration 1 (NEEDS_REWORK, 7 Wichtig-Findings) steht in der Git-Historie dieser
> Datei (Commit `efce6a8`, abgehakt in `9f4d091`).
>
> **Status Iteration 1:** alle sieben Wichtig-Findings per Repro als behoben bestätigt – W1 Regel
> (echter `git filter-repo --replace-message`-Lauf: Anker, Entities, `#333333` bleiben; alle 184
> Commit-Messages von `origin/main` byte-identisch zur Probelauf-Regel; die 21 Anker in
> `OPERATING.md` bleiben), W2 A2-Isolation und W3 Labels (Mutation), W4 ein Scaffold, W5
> Falsch-Positiv-Liste in ADR/Task/Bericht, W7 D5-Abweichung markiert. **W6 (`.gitignore`) nur
> teilweise** – siehe unten. Logik- und Qualitäts-Nitpicks aus Iteration 1 per Mutation bzw.
> Durchsicht als behoben bestätigt.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] [tasks/task-427-factory-split-t1b-historie-nach-dev-factory.md:50] **Rest von W6:** Die Technischen Notizen nennen `.gitignore` weiter als mitkommenden Altpfad – im Widerspruch zum korrigierten ADR-Nachtrag, zur Probelauf-Tabelle (113 = 111 + `CLAUDE.md`, `.claude/settings.json`) und zum T1b-2-Hinweis in derselben Datei. T1b-2 arbeitet aus dieser Datei (Lesson #253). Fix: `.gitignore` aus der Aufzählung nehmen. _(Runde 3, W1; im Orchestrator per Grep bestätigt)_

## Nitpicks (optional)

- [x] [scripts/project/factory-extract.sh:44] `export GIT_CONFIG_COUNT=1 …` überschreibt eine bereits gesetzte `GIT_CONFIG_*`-Konfiguration der Umgebung statt anzuhängen. _(R1)_ — **bewusst offen:** ohne beobachtbaren Effekt im Werkzeug nicht testbar; das Werkzeug läuft einmalig lokal, keine CI setzt `GIT_CONFIG_*`.
- [x] [scripts/project/factory-extract.sh `cmd_qualify`] Dateinamen, die Git trotz `quotePath=false` quotet (`"`, `\`, Tab, Zeilenumbruch), überspringt `qualify` still (fail-open); heute 0 Fälle. `git ls-files -z` + `read -d ''`. _(R1)_
- [x] [scripts/project/factory-extract.sh Python `load`] Syntaktisch ungültige Regex → `re.error` → Exit 1 statt 2 (in `check_a4` als Treffer gelesen); `re.compile` in `try` + `fail()`. _(R1)_ — **bewusst offen:** die Regeldatei ist nicht per Umgebung austauschbar, ein Test bräuchte einen neuen Eingriffspunkt nur dafür; bleibt fail-closed (Exit 1, nie „sauber“).
- [x] [scripts/project/factory-extract.sh `list_entries` vs. `ignored_with_reasons`] Kommentar-/Leerzeilen-Erkennung weiter uneinheitlich (eingerücktes `#`, Leerzeichen-Zeilen, reines `#` → doppelter Leerraum); fail-closed. _(R1)_
- [x] [scripts/project/factory-extract.allow / `is_allowed`] Leerzeichen am Zeilenende macht ein Muster wirkungslos; trimmen. _(R1)_
- [x] [scripts/project/factory-extract.sh `print_scan_report`] Bei leerer Falsch-Positiv-Liste „0 Falsch-Positive ausgenommen, Liste unten" ohne Liste. _(R1)_
- [x] [scripts/project/factory-extract.sh `check_a2`] `git log --name-only` zeigt bei Merge-Commits keine Pfade; `origin/main` hat 0 Merges (folgenlos), optional `--diff-merges=first-parent`. Vorbestehend. _(R1)_ — **bewusst offen:** `origin/main` hat 0 Merge-Commits (Squash-Ruleset).
- [x] [scripts/project/tests/factory-extract-tests.sh:224] `fx_assert_only "(keiner)" …` erzeugt im Positivfall Labels „(keiner)-Negativtest isoliert" – eigenes Label für den Positivfall. _(R2 N1)_
- [x] [scripts/project/factory-extract.sh `print_scan_report`] liest neun undeklarierte Globals (`IGNORED`, `LEAKS_RC`, …); im Kopfkommentar aufzählen, `IGNORED` sprechender benennen. _(R2 N2)_
- [x] [scripts/project/tests/factory-extract-tests.sh `fx_scan`] `GITLEAKS_CMD` hartkodiert → „gitleaks fehlt"-Test baut den Aufruf inline nach; `${FX_GITLEAKS_CMD:-…}`. _(R2 N3)_
- [x] [scripts/project/factory-extract.gitleaksignore:9-11 + tasks/task-427-…md T1b-2-Hinweis] „Kommt eine Factory-Datei oder ein Altpfad hinzu, ändern sich auch alte Hashes" zu pauschal – nur wenn der Pfad dort schon existierte; beide Stellen. _(R2 N4)_
- [x] [scripts/project/factory-extract.sh `is_allowed`] liest die Erlaubt-Liste je Adresse neu; einmal laden. _(R2 N5)_
- [x] [docs/factory/adr/063-…md, Nachtrag „Umschreibregel"] „Farbcodes wie `#1e40af` oder `#333333` … bleiben" verallgemeinert: drei- bis fünfstellige Ziffern-Farbcodes (`#000`) werden umgeschrieben; heute 0 Fälle im Bestand. Präzisieren oder als `qualify`-Grenze in die T1b-2-Hinweise. _(R3 N1)_
- [x] [tasks/task-427-…md:89] Tippfehler „geplantete" in der Task-Datei (in `.gitleaksignore` behoben). _(R3 N2)_
- [x] [docs/factory/adr/063-…md D5/D6/D9] Originalabschnitte ohne Rückverweis auf die Abweichungen im Nachtrag – Repo-Konvention hängt nur an; optional in der T1b-2-Bereinigung. _(R3 N3)_ — **bewusst offen:** optional, Repo-Konvention hängt Nachträge an; Kandidat für die ADR-Bereinigung in T1b-2.
- [x] [tasks/task-427-…md T1b-2-Hinweis] „173 Treffer" im Fixture sind 173 Zeilen (187 Regel-Treffer). _(R3)_

## Out-of-Scope

- **`scripts/checks/ownership-check.sh:48` liest Nicht-ASCII-Pfade gequotet** (`ls-files` ohne `core.quotePath=false`/`-z`) → Datei gilt als nicht zugeordnet, `--list factory` gibt gequotete Namen aus. Funktionaler Defekt mit herstellbarem Auslöser (Datei mit Umlaut unter einem Factory-Muster), heute latent; Factory-Datei, in diesem PR wegen X1 nicht änderbar. → **Issue #437** (`bug`, `factory-pipeline`) über den Seam angelegt. _(R3)_
- Aus Iteration 1 unverändert: Begründung zu `scripts/project/**` in `docs/factory/OWNERSHIP.md:130-131` passt nicht zu `factory-extract.*` – im Report vermerkt (X1 verbietet den Kleinfunde-Eintrag in der Factory-Datei), mitzunehmen in T1b-2/T2.

## Positives

- Alle Rework-Aussagen sind nachgemessen statt behauptet: echter filter-repo-Lauf mit der Regeldatei, 184 Messages identisch, 21 Anker, 9 Abschnittsnummern-Falschtreffer, 21 YAML-Treffer – die Zahlen in Task-Datei und Report stimmen.
- Die B1-Pflicht „jeder Falsch-Positiv einzeln begründet" ist fail-closed durchgesetzt (Exit 2 ohne Begründung), steht im Bericht und ist inkl. Dateikopf-Abgrenzung getestet.
- Neue Absicherungen (quotePath, Symlink, Begründungspflicht, `qualify` ohne Repo, A2-Teilmenge) haben je einen Test, der per Mutation rot wird.
- Ein Scaffold mit Modus, Konstanten für Datei-/Pfadliste, vollständig isolierte verify-Negativtests (A2 und A3 je zweifach).
- Der Python-Parser ist bewusst strenger als filter-repo (eine `#`-Zeile wäre dort eine Literal-Ersetzung durch `***REMOVED***`) – die Kommentar-Behauptungen dazu stimmen gegen den filter-repo-Quelltext.
- ADR-Nachtrag in sich konsistent (drei Abweichungen gezählt und markiert); X1 erfüllt (einzige Factory-Datei: ADR-063, nur Hinzufügungen im Nachtrag); `docs/routes.md` zu Recht unberührt.

## Rework (Iteration 2, 2026-10-23)

W1 behoben (Task-Datei Technische Notizen). Nitpicks umgesetzt außer den vier als „bewusst offen“ markierten. Neue Tests vor der Umsetzung rot (6 rot → 202 grün): `qualify` mit von Git gequotetem Dateinamen (`ls-files -z`), eingerückte Begründung + Leerzeichen-Zeile + reines `#` in der Falsch-Positiv-Liste, Bericht ohne Falsch-Positive ohne „Liste unten“, Leerzeichen am Musterende in `.allow`. Probelauf wiederholt: A2–A5, B1, B2 grün.

## Empfehlung

NEEDS_REWORK
