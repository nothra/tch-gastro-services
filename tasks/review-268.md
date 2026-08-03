# Review: Task 268

**Runde 2** (nach Rework zu Runde 1). Diff-Scope: `git diff origin/main...HEAD` (8 Dateien, +407/−10,
Commits `c039ad8`, `465ac54`).
Test-Stand, in dieser Session selbst nachgeprüft: `bash scripts/checks/tests/run-tests.sh` →
**821 grün, 0 rot**.

Alle 7 Findings aus Runde 1 (1 kritisch + 6 wichtig) sind verifiziert behoben – Details unter
„Positives". Die Runde-1-Nitpicks sind bewusst offen geblieben und unten kompakt zusammengefasst.

## Kritische Findings (müssen behoben werden)

_Keine._ Das Kernverhalten (AK2, Kernszenario des Issues) ist korrekt implementiert und
diskriminierend abgesichert; das kritische Runde-1-Finding (in sich widersprüchliche
Remediation-Meldung) ist behoben.

## Wichtige Findings (sollten behoben werden)

- [ ] **`docs/specs/spec-268-hooks-installed-check-hookspath.md:117-120`** — **Die Spec widerspricht
  sich selbst und der Implementierung.** Der zweite „Offene Fragen"-Bullet nennt weiterhin die in
  Runde 1 falsifizierte Auflösung als Vorgabe: „Vorbild ist der `[ -n "$HOOKS_PATH_CONFIG" ]`-Guard
  in `install-hooks.sh`, der einen Leerstring bereits als ‚nicht gesetzt' behandelt — **dieselbe
  Guard-Logik in `hooks-installed-check.sh` übernehmen**." Implementiert ist das Gegenteil
  (`hooks-installed-check.sh:70`, Leerstring = gesetzt = fail-closed), und derselbe Spec-Abschnitt
  „Fehlerszenarien" (Z. 99-108) trägt die Korrektur bereits per Strikethrough. **Fehlszenario:** Der
  nächste Leser (Folge-Task, `/refactor`, Adopter-Projekt) nimmt den unkorrigierten
  „Offene Fragen"-Bullet als kanonische Vorgabe, „harmonisiert" den Guard zurück auf `[ -n … ]`, passt
  den dann roten Leerstring-Test (`run-tests.sh:4258-4267`) als „spec-konform" an — und die
  Fail-open-Klasse, die dieser PR schließt, ist mit anderem Config-Wert zurück. Genau die codifizierte
  Lesson `lessons/factory-workflow.md` (#253: „frisch im selben PR geänderte Spec braucht denselben
  Drift-Check wie ADRs/Lessons") und #251 („bei Widerspruch zwischen Spec und Lesson/Realität gilt
  nicht die Spec-Formulierung, die die falsche Alternative als gleichwertig anbietet").
  **Zusatz:** `tasks/task-268-hooks-installed-check-hookspath-fp.md:52-59` behauptet, genau diese
  Stelle sei nachgezogen worden („spec-268 ‚Offene Fragen' per Strikethrough + Korrektur-Absatz
  nachgezogen") – der Strikethrough sitzt aber in „Fehlerszenarien", nicht dort. **Fix:** Bullet
  analog Z. 99-108 durchstreichen + auf die verifizierte Korrektur verweisen; die Aussage in der
  Task-Datei entsprechend richtigstellen.
- [ ] **`docs/specs/spec-268-hooks-installed-check-hookspath.md:43-47`** — Der Scope-Bullet schreibt
  die Meldung vor, die Runde 1 als falsch nachgewiesen hat: „Remediation-Hinweis (`core.hooksPath`
  entfernen **ODER die Factory-Checks in das genannte Verzeichnis einbinden**) — konsistent zur
  bestehenden Meldung in `install-hooks.sh`". Die Implementierung verneint diese Option seit dem
  Rework ausdrücklich (`hooks-installed-check.sh:77-79`: „kann bei gesetztem core.hooksPath nicht grün
  werden – auch nicht durch Einbinden der Factory-Checks in …"). **Fehlszenario:** AK4 ist in Task-Datei
  und Spec abgehakt, obwohl Code und Scope-Vorgabe gegenläufig sind; ein Review/Refactor, das die Spec
  als Maßstab nimmt (regulärer Weg in dieser Factory), meldet die *korrigierte* Meldung als Regression
  und dreht sie zurück. Dieselbe Drift-Klasse wie oben – und dieselbe Behandlung, die `spec-265:44-52`
  in diesem PR schon vorbildlich bekommen hat (Strikethrough + benannter Korrektur-Absatz). **Fix:**
  Scope-Bullet korrigieren/durchstreichen und auf ADR-042 §Consequences (Z. 156-162) verweisen, wo die
  Divergenz zwischen Installer- und Push-Gate-Meldung jetzt dokumentiert ist.
- [ ] **`scripts/checks/hooks-installed-check.sh:67-69` + `:70`** — Der WHY-Kommentar über-behauptet und
  begründet damit einen Fail-open-Pfad in einem Fail-closed-Gate: „`git config --get` liefert exit 1
  **nur**, wenn der Key völlig fehlt". `git config` dokumentiert weitere Nicht-Null-Exits (u. a. exit 3
  für eine ungültige Config-Datei, eigene Codes für mehrfach passende Zeilen). Die Bedingung hängt
  ausschließlich am Exit-Status, stderr wird per `2>/dev/null` verworfen — **jeder** unerwartete
  `git config`-Fehler nimmt daher den „nicht gesetzt"-Zweig und führt weiter in die Präsenzprüfung, die
  bei vorhandenen Datei-Resten grün meldet. Das ist die Falsch-Positiv-Klasse dieses Issues, nur mit
  anderer Ursache, und widerspricht der Faustregel aus `clean-code.md` („Validierungs-Gates fail-closed
  – im Zweifel ablehnen, nie still durchwinken"). `install-hooks.sh:46-47` ist hier robuster, weil es
  zusätzlich den *Wert* auswertet. **Fix (klein):** Exit-Status explizit dreiteilen –
  `HOOKS_PATH_CONFIG="$(git config --get core.hooksPath 2>/dev/null)"; rc=$?; case $rc in 0) fail-closed;;
  1) weiter;; *) fail-closed mit „core.hooksPath nicht auswertbar";; esac` – oder mindestens die
  Kommentarbehauptung wahrheitsgemäß formulieren. **Verifikationsstand:** Die konkrete Erreichbarkeit
  (mehrfach gesetzter Key, kaputte Config-Datei) war in dieser Session nicht empirisch prüfbar –
  `git`-Aufrufe in Wegwerf-Repos und Schreibzugriffe außerhalb des Worktrees waren permission-blockiert.
  Einordnung: durch Codelesen belegt, Reichweite plausibel, nicht empirisch verifiziert.

## Nitpicks (optional)

- [ ] `scripts/checks/hooks-installed-check.sh:74,78-79` — im Leerstring-Zweig ist die Meldung sinnfrei:
  `HOOKS_PATH_DISPLAY` ist dann `<leer>`, ausgegeben wird „auch nicht durch Einbinden der Factory-Checks
  in '<leer>'". Zeile im Leerstring-Fall auslassen oder neutral formulieren.
- [ ] `scripts/checks/hooks-installed-check.sh:25-31`, `docs/adr/042-…:163-169`,
  `docs/specs/spec-268-…:101-108` — die tragende Git-Verhaltensannahme („`core.hooksPath=""` löst auf das
  Arbeitsverzeichnis auf, empirisch mit git 2.51 verifiziert") ist durch **keinen** Test gepinnt, obwohl
  sie eine bewusste Abweichung vom Geschwisterskript rechtfertigt. Ändert eine künftige git-Version das
  Verhalten, wird das nicht erkannt (Verhalten bleibt fail-closed, aber die Begründung in drei Dokumenten
  wäre falsch). Getrackt als **#279** Punkt 2; ein Invarianten-Test (`git -c core.hooksPath= rev-parse
  --git-path hooks` ≠ `$GIT_COMMON_DIR/hooks`) wäre auch hier billig. In dieser Session war die Probe
  erneut nicht möglich (wie in Runde 1) – die Annahme ist also weiterhin nur durch die
  Implementierungs-Session belegt.
- [ ] `docs/adr/042-hook-installation-single-source.md:162,167-169` — beide neuen Consequence-Bullets
  deferieren („bei Bedarf als eigenständiges Issue anzulegen", „außerhalb des Scopes von #268"), nennen
  aber keine Issue-Nummer, während der Nachbar-Bullet (Z. 172-174) vorbildlich auf #265 verweist. Die
  Issues existieren jetzt: **#278** (Opt-out/Escape-Hatch für Repos mit gesetztem `core.hooksPath`) und
  **#279** (`install-hooks.sh`-Leerstring-Blindspot) – Nummern im selben PR eintragen, dann ist die
  Deferral auffindbar.
- [ ] Runde-1-Nitpicks unverändert offen, weiterhin gültig, beim nächsten Anfassen mitnehmen:
  Testblock (`run-tests.sh:4197-4276`) spaltet den #265-Abschnitt (dessen CI-Absicherung folgt erst
  ab Z. 4279); Testfall 6 (Z. 4269-4274) ist rezept-identisch zu #265 Testfall 1; Magic String `'file:'`
  (Z. 4233) ohne Herleitungs-Kommentar; Traceability-Lücke `#268 AK1` (Z. 4274 labelt AK1 als
  „Gegenprobe, spec-265 AK1"); Exit-1-statt-2-Entscheidung nur in der Task-Datei begründet, nicht im
  Skript-Header; Guard-Meldung auf stdout, das benannte Vorbild `install-hooks.sh:51-54` auf stderr.
- [ ] `run-tests.sh:4229-4236` (AK4-Fixture) — dritte identische Arrange-Wiederholung des
  `install_all_hooks` + `config core.hooksPath .husky`-Rezepts und die einzige Stelle im Block ohne
  `; rc=$?`; der `$out` aus Z. 4207 wäre wiederverwendbar (Runde-1-Nitpick, unverändert).

## Positives

- **Alle sieben Runde-1-Findings sind verifiziert behoben**, jeweils an der Ursache statt symptomatisch:
  - Kritisch: die Meldung (Z. 75-79) bietet die „einbinden"-Option nicht mehr an, sondern benennt
    ausdrücklich, dass der Check ausschließlich `$GIT_COMMON_DIR/hooks` liest und deshalb nur durch
    `git config --unset core.hooksPath` grün wird — inklusive Scope-Hinweis `--global/--system`.
    ADR-042 §Consequences (Z. 156-162) und `git-workflow.md:77-84` benennen die Asymmetrie
    Installer ↔ Push-Gate jetzt beide, statt die Mechanik weiter nur für den Installer zu beschreiben
    (Lesson #211/#176 erfüllt).
  - AK3-Test (Z. 4218-4224): pfadspezifisches Signal **plus** Abwesenheits-Assertion der alten
    Präsenzmeldung — der Test wird rot, wenn der Guard entfernt wird (Lesson #214 erfüllt).
  - AK4-Test (Z. 4235-4236): matcht jetzt auf `git config --unset core.hooksPath`, also auf die
    Remediation und nicht mehr tautologisch auf die Ursachenzeile.
  - AK5-Worktree-Test (Z. 4253-4254): `.husky`-Signal-Assertion schließt das „grün, weil `worktree add`
    scheiterte"-Loch, samt Kommentar, der den Fehlpfad benennt.
  - Hartkodierte Hook-Liste aus der Guard-Meldung entfernt → kein zweiter Pflegeort neben
    `FACTORY_HOOKS` (Z. 87).
  - Header-Aufzählung (Z. 5-8) und die „nur Präsenz + Ausführbarkeit"-Zeile (Z. 10-11) sind auf die
    neue Fail-Menge nachgezogen — genau in der von spec-268 vorgegebenen Formulierung.
  - Leerstring-Semantik nicht per Analogie festgeschrieben, sondern umgedreht und begründet
    (fail-closed) — die schärfere, richtige Richtung.
- **Der Leerstring-Test ist echt diskriminierend** (Z. 4258-4267): `install_all_hooks` erfüllt alle
  übrigen Bedingungen, nur der Guard kann rot machen — kein Zufallstreffer über die Präsenzprüfung.
- **Fail-closed-Reihenfolge unverändert korrekt:** „kein Git-Repo" (Z. 52-55) → `core.hooksPath`-Guard
  (Z. 70-81) → Präsenzprüfung (Z. 90-101), exakt die von spec-268 „Fehlerszenarien" geforderte
  Vorrang-Ordnung, als Guard Clause umgesetzt.
- **Exit-Code-Semantik unter `set -uo pipefail` (ohne `-e`) bleibt sauber:** Zuweisungsstatus als
  Bedingung, `HOOKS_PATH_CONFIG` danach immer definiert (keine `set -u`-Falle),
  `${…:-Herkunft unbekannt}`-Fallback und `|| true` gegen `pipefail`.
- **Spec-/Doku-Drift dort, wo sie nachgezogen wurde, methodisch vorbildlich:** `spec-265:44-52` per
  Strikethrough + benanntem „Korrektur (spec-268)"-Absatz falsifiziert statt still überschrieben; die
  Fehlannahme bleibt historisch nachvollziehbar (Lesson #253).
- **Rework wurde zwischen den Runden committet** (`465ac54`), nicht am Ende gebündelt — Lesson #251
  eingehalten; ein Review, das seinen Kontext per `git diff origin/main...HEAD` bezieht, sieht den
  aktuellen Stand.
- **Suite selbst nachgeprüft:** 821 grün, 0 rot (Runde 1: 817) — die vier neuen Assertions sind
  tatsächlich zusätzlich und nicht Ersatz.
- `docs/routes.md` korrekt **nicht** betroffen (keine `app/**/page.tsx`, kein `app/api/**/route.ts` im
  Diff); kein neuer CI-Wiring-Test nötig (Begründung aus Runde 1 gilt unverändert).
- **Kein Akutrisiko für dieses Repo:** kein husky, `core.hooksPath` nirgends gesetzt — der PR kann das
  eigene Push-Gate nicht blockieren.

## Empfehlung

NEEDS_REWORK

**Begründung:** Kein kritisches Finding mehr; das Verhalten ist korrekt, diskriminierend getestet und
die Runde-1-Kritik ist vollständig aufgelöst. Offen sind drei wichtige Findings, davon zwei derselben
Klasse: **die im selben PR entstandene `spec-268` widerspricht nach dem Rework der Implementierung** —
einmal im Scope („einbinden" als gleichwertige Remediation, Z. 43-47), einmal in „Offene Fragen"
(Leerstring = „nicht gesetzt", Z. 117-120, unkorrigiert, während „Fehlerszenarien" die Korrektur
schon trägt). Beides ist die codifizierte Rezidiv-Falle #253/#251: die Spec ist in dieser Factory der
Maßstab für Folge-Skills, und in ihrer aktuellen Form würde sie den gerade eingebauten Fail-closed
zurückdrehen. Dazu W3 (Kommentar-Über-Behauptung + Fail-open bei unerwartetem `git config`-Exit).
**Umfang des Reworks: drei Absätze Doku/Kommentar plus optional vier Zeilen `case`-Verzweigung** —
kein Testverhalten und keine Guard-Semantik betroffen.

**Out-of-Scope-Issues (ADR-018) – in dieser Runde autonom angelegt:**
- **#278** `hooks-installed-check.sh`: Opt-out für Repos mit bewusst gesetztem `core.hooksPath`
  (`enhancement`, `tech-debt`) — der in ADR-042 §Consequences selbst angekündigte, bisher nicht
  getrackte Escape-Hatch; ohne ihn kann ein Adopter-Repo mit korrekt in `.husky/` eingebundenen
  Factory-Checks dauerhaft nicht pushen.
- **#279** `install-hooks.sh`: leerer `core.hooksPath` wird fälschlich als „nicht gesetzt" behandelt
  (`bug`, `tech-debt`) — der in ADR-042 neu dokumentierte Blindspot, inkl. Invarianten-Test für die
  git-Verhaltensannahme und Rück-Referenz/Paritätstest zwischen den beiden Guard-Kopien.
  spec-268 schließt Änderungen an `install-hooks.sh` ausdrücklich aus, daher eigener Task.

**Circuit Breaker:** Dies ist Review-Runde 2 von maximal 3. Bleibt nach dem nächsten `/implement`
etwas offen, das nicht Doku ist, an den Menschen eskalieren.
