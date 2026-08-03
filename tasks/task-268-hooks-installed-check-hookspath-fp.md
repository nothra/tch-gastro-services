# Task 268: hooks-installed-check-hookspath-fp

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/checks/hooks-installed-check.sh` meldet fälschlich Erfolg, wenn
`core.hooksPath` gesetzt ist, aber im gemeinsamen `.git/hooks`-Verzeichnis noch
ausführbare Datei-Reste der Factory-Hooks liegen (z. B. von einem Retrofit vor dem
Setzen von `core.hooksPath`). Git ruft diese Dateien wegen `core.hooksPath` nie auf
— der Check ist im Kernszenario, das er absichern soll, wirkungslos. Fix: analog zu
`install-hooks.sh` (ADR-042) fail-closed abbrechen, sobald `core.hooksPath` gesetzt
ist. Details: [spec-268](../docs/specs/spec-268-hooks-installed-check-hookspath.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN `core.hooksPath` ist nicht gesetzt UND alle drei Hooks vorhanden+ausführbar WHEN der Check läuft THEN Exit 0 (unverändert, spec-265 AK1)
- [x] GIVEN `core.hooksPath` ist gesetzt UND im Standardpfad liegen noch ausführbare Hook-Reste WHEN der Check läuft THEN Exit ≠ 0 (statt fälschlich Exit 0)
- [x] GIVEN `core.hooksPath` ist gesetzt UND die Hooks fehlen im Standardpfad vollständig WHEN der Check läuft THEN ebenfalls Exit ≠ 0
- [x] GIVEN `core.hooksPath` ist gesetzt WHEN der Check deswegen fehlschlägt THEN nennt die Meldung Pfad + Scope/Herkunft + Remediation-Hinweis
- [x] GIVEN der Check läuft aus einem beliebigen Worktree WHEN er `core.hooksPath` prüft THEN liest er denselben effektiven Wert wie `install-hooks.sh`

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Vorbild: `core.hooksPath`-Guard in `scripts/install-hooks.sh` (`[ -n
"$HOOKS_PATH_CONFIG" ]`, `git config --show-origin --get core.hooksPath`).

Umgesetzt: Guard direkt nach der `git-common-dir`-Ermittlung (Vorrang vor Präsenzprüfung,
aber nach dem „kein Git-Repo"-Fail-closed – Fehlerszenario-Reihenfolge aus spec-268).
`git config` ohne `-C`/`-C "$REPO_DIR"` genügt, da das Skript bereits per `cd "$ROOT"`
in die Projektwurzel gewechselt ist – liest denselben effektiven Wert wie
`install-hooks.sh` (`git -C "$REPO_DIR" config …`).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Exit-Code bei core.hooksPath-Fail-closed: eigener Code (analog install-hooks.sh Exit 2) oder Exit 1 wie bestehende Präsenz-Fails? (`/implement`-Entscheidung, kein Verhaltensunterschied für pre-push.sh)
  → Entschieden: Exit 1, konsistent mit den bestehenden Fail-closed-Pfaden in
  diesem Skript (alle nutzen bereits Exit 1); `pre-push.sh` wertet ohnehin nur
  Exit 0 vs. ≠ 0 aus.
- [x] Leerer `core.hooksPath`-Wert: wie `install-hooks.sh` behandeln (Leerstring = „nicht gesetzt")
  → **Korrigiert nach Review-Runde 1** (siehe Review-Findings unten): Die ursprüngliche
  Annahme war falsch. Empirisch mit git 2.50 verifiziert: `core.hooksPath=""` löst den
  Hook-Pfad auf das Arbeitsverzeichnis auf (`git rev-parse --git-path hooks` → `./` statt
  `$GIT_COMMON_DIR/hooks`) – Git ruft `$GIT_COMMON_DIR/hooks` dann nicht mehr auf. Ein
  Leerstring zählt daher als „gesetzt" und wird fail-closed behandelt (bewusste Abweichung
  von `install-hooks.sh`, das denselben Blindspot außerhalb des Scopes von #268 behält).

## Review-Findings

**Runde 1 (NEEDS_REWORK, siehe `tasks/review-268.md`):** 1 kritisches + 6 wichtige Findings.
Alle behoben:
- Remediation-Meldung widersprach sich selbst (bot „Factory-Checks einbinden" als Ausweg
  an, obwohl der Check ausschließlich `$GIT_COMMON_DIR/hooks` liest) → Meldungstext korrigiert,
  ADR-042 §Consequences + `git-workflow.md` (Hook-Tabelle + core.hooksPath-Absatz) nachgezogen.
- AK3-Test war nicht auf den Guard isoliert (griff auch ohne core.hooksPath-Guard) →
  pfadspezifisches Signal + Abwesenheits-Assertion der alten Präsenzmeldung ergänzt.
- AK4-Remediationstest war tautologisch (`core.hooksPath`-String kam schon aus der
  Ursachenzeile) → auf den konkreten Befehl `git config --unset core.hooksPath` umgestellt.
- Hartkodierte Hook-Namen-Liste in der core.hooksPath-Meldung (Drift-Risiko zu `FACTORY_HOOKS`)
  → Meldung enumeriert keine Hook-Namen mehr, nennt nur noch den Pfad generisch.
- Header-Aufzählung der Fail-Gründe war nicht nachgezogen → core.hooksPath ergänzt.
- AK5-Worktree-Test konnte über den falschen Pfad grün werden (`worktree add`-Fehlschlag
  statt echtem Guard-Treffer) → `.husky`-Signal-Assertion ergänzt.
- Leerstring-Semantik war unverifiziert gegen die Analogie zu `install-hooks.sh` übernommen
  → empirisch mit git 2.50 verifiziert, Verhalten umgekehrt (fail-closed statt „nicht gesetzt"),
  spec-268 „Fehlerszenarien" per Strikethrough + Korrektur-Absatz nachgezogen.
  (Korrektur zur eigenen Aussage weiter oben: der Strikethrough saß nach Runde 1 nur in
  „Fehlerszenarien", **nicht** zusätzlich in „Offene Fragen" – dort blieb die falsifizierte
  Annahme unkorrigiert stehen, siehe Runde-2-Finding W1 unten.)

Test-Stand nach Rework: `bash scripts/checks/tests/run-tests.sh` → 821 grün, 0 rot.

**Runde 2 (NEEDS_REWORK, siehe `tasks/review-268.md`):** 0 kritische, 3 wichtige Findings
(alle Doku-/Kommentar-Drift, kein Testverhalten/keine Guard-Semantik-Lücke). Alle behoben:
- **W1** – spec-268 „Offene Fragen" (Leerstring-Bullet) widersprach nach dem Runde-1-Rework
  weiterhin der Implementierung (nannte die bereits falsifizierte `[ -n … ]`-Analogie als
  Vorgabe) → per Strikethrough + Korrektur-Verweis auf „Fehlerszenarien" nachgezogen; obige
  Falschaussage in diesem Abschnitt richtiggestellt.
- **W2** – spec-268 Scope-Bullet (Remediation-Hinweis) schrieb weiterhin „core.hooksPath
  entfernen ODER Factory-Checks einbinden" vor, obwohl die Implementierung seit Runde 1
  ausdrücklich nur noch `--unset` als Ausweg nennt → Scope-Bullet per Strikethrough +
  Korrektur-Absatz (Verweis ADR-042 §Consequences) nachgezogen.
- **W3** – WHY-Kommentar über `git config --get` behauptete, es liefere „exit 1 nur, wenn
  der Key völlig fehlt" – tatsächlich hat `git config` weitere Nicht-Null-Exit-Codes (z. B.
  kaputte Config-Datei), die über den bloßen Truthy-Check still in den „nicht gesetzt"-Zweig
  gefallen wären (Fail-open-Lücke in einem Fail-closed-Gate) → `git config --get`-Exit-Status
  jetzt explizit dreigeteilt (`0` = gesetzt/fail-closed, `1` = nicht gesetzt/weiter, jeder
  andere Code = „nicht auswertbar"/fail-closed). Kommentar entsprechend korrigiert.
  Empirische Reproduktion des dritten Zweigs (mehrfach gesetzter Key, kaputte Config-Datei)
  war in dieser Session wie schon in der Review-Session selbst nicht möglich – `git`-Aufrufe
  in Wegwerf-Repos sind hier durchgehend permission-blockiert (Sandbox-Genehmigung fehlt).
  Verhalten ist daher durch Codelesen + git-Dokumentation begründet, nicht per Test gepinnt;
  kein neuer Testfall ergänzt.
- Nitpick (kostenlos mitgenommen, da derselbe Codeblock ohnehin bearbeitet wurde): die
  Leerstring-Fallmeldung nannte zuvor sinnfrei „... einbinden in '<leer>'" – jetzt ohne
  Pfadnennung, wenn `HOOKS_PATH_CONFIG` leer ist.

Test-Stand nach Runde-2-Rework: `bash scripts/checks/tests/run-tests.sh` → 821 grün, 0 rot
(unverändert – Runde 2 hat keine Test-Assertions berührt, nur Doku/Kommentar/Guard-Robustheit).

**Runde 3 (APPROVED, siehe `tasks/review-268.md`):** 0 kritische, 0 rework-pflichtige wichtige
Findings. Zwei Nitpicks explizit an `/test` delegiert (Circuit Breaker bei 3 Review-Runden
erreicht, daher keine vierte Implement-Runde) – in diesem `/test`-Durchlauf behoben:
- **Fixture-Hermetik:** `rc_hooks()` (`run-tests.sh:4120`) liest `core.hooksPath` über
  `git config --get`, das auch globale/System-Config einliest. Ohne Isolation würde ein
  Entwickler-Rechner mit `git config --global core.hooksPath …` (verbreitetes husky-Muster)
  die Erfolgs-Assertions (`#265 AK1`, `#265 AK4`, `#268` Gegenprobe) fälschlich rot machen →
  `rc_hooks()` isoliert jetzt mit `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null`;
  die zwei direkten `FACTORY_DIR=… bash "$HI_CHECK"`-Aufrufe in den Worktree-Tests
  (`#265 AK4`, `#268 AK5`) wurden auf `rc_hooks(...)` umgestellt, statt die Isolation zu
  duplizieren.
- **Dritter `git config`-Exit-Zweig (Erreichbarkeit geklärt statt nur behauptet):** Wie in
  Runde 2 bereits vermerkt, war der Zweig (`HOOKS_PATH_RC` ∉ {0,1}) in dieser Sandbox nicht
  reproduzierbar (git-Aufrufe in Wegwerf-Repos permission-blockiert, erneut geprüft in diesem
  `/test`-Durchlauf – derselbe Block wie in der Review-Session). Analytisch bestätigt: eine
  kaputte/unlesbare Config-Datei lässt bereits das vorgelagerte `git rev-parse
  --git-common-dir` mit demselben Nicht-Null-Exit scheitern, der Check landet dort schon im
  „kein Git-Repository"-Zweig, bevor die `core.hooksPath`-Zeile überhaupt läuft; ein mehrfach
  gesetzter Schlüssel liefert bei `--get` exit 0 (letzter Wert gewinnt). Der dritte Zweig ist
  damit **defensiv-unerreichbar, kein Coverage-Loch** – Skript-Kommentar entsprechend
  präzisiert (nennt keine unbelegte Fehlercode-Zahl mehr, sondern die Nichterreichbarkeits-
  Begründung), kein Testfall ergänzt (es gibt keinen Input, der ihn triggert).

Test-Stand nach Runde-3-Fixes: `bash scripts/checks/tests/run-tests.sh` → 821 grün, 0 rot
(Fixture-Hermetik-Fix ändert keine Assertion-Anzahl, nur deren Isolation gegen ambiente
Umgebung).

## Refactoring-Notizen

Clean-Code-Pass über `scripts/checks/hooks-installed-check.sh` (nach 3 APPROVED-Review-Runden
kaum noch Spielraum, ein Punkt gefunden): Im `core.hooksPath`-gesetzt-Zweig wurde dieselbe
Bedingung (`[ -n "$HOOKS_PATH_CONFIG" ]`) zweimal hintereinander geprüft – einmal für
`HOOKS_PATH_DISPLAY`, einmal für die zwei alternativen Remediation-Textblöcke, wobei der
Satz „Beheben: git config --unset core.hooksPath (ggf. mit --global/--system)." wortgleich in
beiden Zweigen stand. Zusammengeführt zu einer einzigen `if`/`else`, die `HOOKS_PATH_DISPLAY`
und einen `HOOKS_PATH_HINT`-Text in einem Rutsch setzt; die Ausgabe ist byte-identisch
(gegen die bestehenden `#268`-Testfälle AK2–AK5 + Leerstring-Fall + Gegenprobe geprüft).
Sonst keine weiteren Refactoring-Kandidaten gefunden (Struktur/Naming/Duplikation im übrigen
Skript sowie in den `run-tests.sh`-Ergänzungen bereits sauber, letztere folgen dem
projektweit etablierten `assert_true "$([ $rc -ne 0 ]; echo $?)"`-Idiom).

Test-Stand nach Refactoring: `bash scripts/checks/tests/run-tests.sh` → 821 grün, 0 rot
(unverändert – keine neue/entfernte Assertion, nur interne Struktur verbessert).

**Runde 4 (APPROVED, siehe `tasks/review-268.md`):** Re-Review nach `/test` (`8c2fa9d`) und
`/refactor` (`ebef830`) – kein weiterer Umlauf im Review↔Implement-Circuit-Breaker (der war
mit Runde 3 bereits erschöpft), sondern eine reine Nachprüfung der beiden danach entstandenen
Commits. 0 kritische, 2 wichtige Findings – beide reine Textkorrekturen ohne Verhaltens- oder
Teständerung, in diesem `/test`-Durchlauf behoben:
- **W1** – Kommentar `hooks-installed-check.sh:70-73` behauptete „empirisch verifiziert",
  dass eine kaputte Config-Datei bereits das vorgelagerte `git rev-parse --git-common-dir`
  scheitern lässt – tatsächlich blieb das (wie in Runde 2/3 dokumentiert) in dieser Sandbox
  durchgehend permission-blockiert und ist nur analytisch begründet, nicht empirisch belegt.
  Rezidiv der Runde-2-Finding-W3-Klasse (Kommentar behauptet mehr Evidenz, als vorliegt) an
  derselben Stelle → Formulierung auf „analytisch begründet (in dieser Umgebung nicht
  reproduzierbar: `git`-Aufrufe in Wegwerf-Repos sind permission-blockiert)" korrigiert.
- **W2** – die Versionsangabe „empirisch mit git 2.51 verifiziert" für den Leerstring-Befund
  war an fünf Stellen falsch (`hooks-installed-check.sh:25`, `run-tests.sh:4263`,
  `spec-268.md:106,127`, `ADR-042.md:163`) plus zwei weitere in der Task-Datei selbst
  (`:48,:71`) – auf dieser Maschine läuft ausschließlich git **2.50.1** (`git --version`),
  deckungsgleich mit allen übrigen empirischen Notizen des Repos (`ADR-042:77`,
  `run-tests.sh:3728`,`:3964`). Alle sieben Stellen auf `2.50` korrigiert.

Test-Stand nach Runde-4-Fixes: `bash scripts/checks/tests/run-tests.sh` → 821 grün, 0 rot
(reine Kommentar-/Doku-Korrektur, keine Assertion berührt).

**Runde 5 (APPROVED, siehe `tasks/review-268.md`):** Re-Review nach dem Runde-4-Fix
(`b756cb8`) und dem Security-Review (`c0f999a`). 0 kritische Findings, 2 wichtige Findings –
wieder reine Textkorrekturen ohne Verhaltens- oder Teständerung, in diesem `/refactor`-Durchlauf
behoben:
- **W1** – der WHY-Kommentar `hooks-installed-check.sh:17-19` behauptete kategorisch, es gebe
  „keinen Zustand, in dem Reste im Standardpfad tatsächlich greifen, solange `core.hooksPath`
  gesetzt bleibt" – das ist falsch für den Sonderfall, dass `core.hooksPath` selbst auf
  `$GIT_COMMON_DIR/hooks` zeigt (dort laufen die Reste dann doch, der Guard lehnt aber
  wertunabhängig jeden gesetzten Wert ab). Kommentar relativiert auf „… solange
  `core.hooksPath` auf ein anderes Verzeichnis zeigt" + Verweis auf das dafür neu angelegte
  Out-of-Scope-Issue **#281**. Die Verhaltensänderung selbst (effektiven Hookpfad statt reiner
  Gesetzt-Prüfung vergleichen) ist eine Spec-Entscheidung gegen ADR-042 §Consequences und
  bleibt außerhalb dieses PRs.
- **W2** – `docs/adr/042-hook-installation-single-source.md` nannte die beiden
  Escape-Hatch-/Leerstring-Consequence-Bullets weiter ohne Issue-Nummer, obwohl der in
  demselben PR committete Security-Report (`c0f999a`) bereits **#278** (Opt-out) und **#279**
  (Leerstring-Blindspot) referenziert – zwei Artefakte desselben PRs widersprachen sich über
  denselben Sachverhalt. Beide Bullets tragen jetzt die Issue-Nummer.
- Nitpick (kostenlos mitgenommen): die Security-Review-Notiz oben behauptete, alle drei
  getrackten Hinweise hätten das `security`-Aspekt-Label erhalten – `gh issue view 278/279/280`
  zeigt, dass nur #279/#280 es tragen, #278 nicht. Notiz auf den tatsächlichen Label-Stand
  korrigiert, kein Label nachträglich gesetzt (Genauigkeitsfix, keine neue Entscheidung).

Test-Stand nach Runde-5-Fixes: `bash scripts/checks/tests/run-tests.sh` → 821 grün, 0 rot
(reine Kommentar-/Doku-Korrektur, keine Assertion berührt).

## Security-Review-Notizen

`/security-review` → **PASSED** (0 kritische, 0 wichtige Findings, 4 Hinweise; Report:
`tasks/security-268.md`). Angriffsfläche ist ausschließlich lokale Shell-Ausführung
(Gate-Skript + Tests + Doku, kein Anwendungscode, keine Dependency-Änderung). Kein
Command-Injection-Pfad (alle Verwendungen des config-kontrollierten Werts sind quotierte
Expansions, kein `eval`), kein Fail-open (alle drei `git config --get`-Exit-Klassen
abgedeckt), keine Secrets. Die drei substanziellen Hinweise waren bereits aus `/review`
getrackt – kein neues Issue angelegt:
- **#280** (`security`-Aspekt-Label) – `echo -e` interpretiert Backslash-Escapes im
  config-kontrollierten `core.hooksPath`-Wert (Output-Integrität; kein Gate-Bypass,
  Exit-Code unberührt).
- **#279** (`security`-Aspekt-Label) – `install-hooks.sh` behandelt Leerstring weiter als
  „nicht gesetzt" (Fail-open in der Geschwister-Stelle, außerhalb des #268-Scopes).
- **#278** (ohne `security`-Aspekt-Label) – fehlendes Opt-out kann bei global gesetztem
  `core.hooksPath` zur Gewöhnung an `git push --no-verify` führen (umgeht dann alle
  pre-push-Gates; server-seitige Grenze bleibt ADR-029).

Security-Positiv: der PR schließt eine Fail-open-Lücke in einem sicherheitsrelevanten Gate –
bisher meldete der Check grün, während Git keinen Factory-Hook aufrief (u. a. der
Credential-Scan des `pre-commit`-Hooks war still inaktiv).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/268-hooks-installed-check-hookspath-fp`
Erstellt: 2026-08-03 06:41
