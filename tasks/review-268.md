# Review: Task 268

**Runde 3** (nach Rework zu Runde 2). Diff-Scope: `git diff origin/main...HEAD` (8 Dateien,
+575/−10, Commits `c039ad8`, `465ac54`, `29626fb`).
Test-Stand, in dieser Session selbst nachgeprüft: `bash scripts/checks/tests/run-tests.sh` →
**821 grün, 0 rot**. Zusätzlich der Check live gegen dieses Repo ausgeführt:
`bash scripts/checks/hooks-installed-check.sh` → exit 0, „Alle Factory-Git-Hooks … installiert
und ausführbar" (kein `core.hooksPath` gesetzt, das eigene Push-Gate bleibt grün).

Alle 3 wichtigen Findings aus Runde 2 (W1 Spec-„Offene Fragen", W2 Spec-Scope-Bullet,
W3 `git config`-Exit-Behandlung) sind verifiziert behoben – Details unter „Positives".

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine, die einen weiteren `/implement`-Durchlauf rechtfertigen._ Die zwei verbleibenden
inhaltlichen Punkte betreffen ausschließlich die **Test-Suite** und gehören damit in den
unmittelbar folgenden Pipeline-Schritt `/test` – sie stehen unten unter „Nitpicks" mit
`→ /test` markiert, statt eine vierte Review↔Implement-Iteration am Circuit-Breaker-Limit
auszulösen. Produktionsverhalten, Guard-Semantik und Fail-closed-Reihenfolge sind korrekt und
diskriminierend abgesichert.

## Nitpicks (optional)

- [ ] **→ /test** `scripts/checks/tests/run-tests.sh:4113` (`rc_hooks`), `:4119`, `:4160`,
  `:4274` — **Hermetik-Regression der Fixtures.** Vor diesem PR war
  `hooks-installed-check.sh` rein dateibasiert; die Wegwerf-Repos aus `hi_repo()` waren
  damit unabhängig von der Umgebung. Der neue Guard liest `git config --get core.hooksPath`,
  und `--get` liest **global/system** mit. Ein Entwickler mit
  `git config --global core.hooksPath ~/.githooks` (verbreitetes dotfiles-/husky-Muster) bekommt
  die drei Erfolgs-Assertions rot (`#265 AK1`, `#265 AK4`, `#268 Gegenprobe`), obwohl der Code
  korrekt ist. In `run-tests.sh` gibt es bislang **keinerlei** git-Config-Isolation
  (`grep GIT_CONFIG_GLOBAL|GIT_CONFIG_SYSTEM|HOME=` → 0 Treffer). Dieselbe Klasse wie die
  codifizierte Lesson „`PR_SHEPHERD`/`FACTORY_STAGE` in der aufrufenden Shell schlagen in jedes
  Wegwerf-Repo durch" (#262/#264): ambiente Umgebung leckt in die Fixture. **Fix (eine Zeile):**
  `rc_hooks() { GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null FACTORY_DIR="$1" bash "$HI_CHECK" 2>&1; }`
  (git ≥ 2.32) – analog für die beiden direkten `FACTORY_DIR=… bash "$HI_CHECK"`-Aufrufe in den
  Worktree-Tests (Z. 4159, 4247). **Einordnung als Nitpick:** Für genau diese Entwickler ist das
  Push-Gate ohnehin bewusst rot (das ist der Zweck des PRs, Escape-Hatch getrackt als **#278**),
  der Testfehlschlag ist also Symptom derselben, gewollten Entscheidung – kein verstecktes
  Fehlverhalten, aber eine Assertion, die auf ambienten Zustand statt auf die Fixture zielt.
- [ ] **→ /test** `scripts/checks/hooks-installed-check.sh:94-97` — der in Runde 2 neu ergänzte
  **dritte Zweig** (`HOOKS_PATH_RC` ∉ {0,1} → „core.hooksPath nicht auswertbar", fail-closed)
  ist durch **keinen** Testfall abgedeckt, während der Rest des Guards diskriminierend gepinnt
  ist. Projektregel `testing-standards.md`: „Neuer Code: 100 % coverage erwartet (wird im Review
  geprüft)"; Lesson #207: „Strict-mode-/Umgebungs-Kontrakt-Tests auf die Fehler-/No-Match-Zweige
  legen". **Verifikationsstand (ehrlich):** Ob der Zweig überhaupt erreichbar ist, konnte ich in
  dieser Session **nicht** klären – jede Probe (`git init` in Wegwerf-Repo, `git -c core.hooksPath= rev-parse
  --git-path hooks`, Schreiben eines Probe-Skripts) war permission-blockiert, exakt wie in Runde 1
  und 2. Analytisch: der naheliegende Kandidat „kaputte Config-Datei" (git-Doku ret=3) dürfte
  bereits das vorgelagerte `git rev-parse --git-common-dir` (Z. 52) zum Scheitern bringen und damit
  im „kein git-Repository"-Zweig landen; ein mehrfach gesetzter Key liefert bei `--get`
  vermutlich den letzten Wert mit exit 0. Der Zweig ist also möglicherweise defensiv-unerreichbar.
  **Empfehlung an `/test`:** genau das klären – ist ein Input reproduzierbar, Testfall ergänzen;
  ist keiner reproduzierbar, das im Code-Kommentar festhalten (dann ist der Zweig bewusste
  Defense-in-depth, kein Coverage-Loch, das man wegtestet). So oder so bleibt das Verhalten
  fail-closed und damit sicher.
- [ ] `docs/adr/042-hook-installation-single-source.md:161-162,167-169` — Runde-2-Nitpick
  **unverändert offen**: beide neuen Consequence-Bullets deferieren weiterhin ohne Nummer („bei
  Bedarf als eigenständiges Issue anzulegen", „außerhalb des Scopes von #268"), obwohl die Issues
  seit Runde 2 existieren: **#278** (Opt-out/Escape-Hatch bei gesetztem `core.hooksPath`) und
  **#279** (`install-hooks.sh`-Leerstring-Blindspot + Invarianten-Test der git-Verhaltensannahme).
  Ein Leser legt sonst ein Duplikat an. Genau die Lesson #176 („Doku, die einen offenen
  Follow-up (#N) nennt, im selben PR nachziehen"); der Nachbar-Bullet (Z. 172-174) macht es mit
  #265 vorbildlich. **Fix:** zwei Nummern eintragen.
- [ ] `docs/specs/spec-268-hooks-installed-check-hookspath.md:80-97,101,117` — die AK-Checkboxen
  der Spec stehen alle noch auf `- [ ]`, während `tasks/task-268-…md` sie auf `- [x]` führt; auch
  die entschiedene „Offene Frage" zum Exit-Code (Z. 117-121, Antwort steht in der Task-Datei:
  Exit 1) ist dort nicht abgehakt. Kein Gate wertet das aus, aber die beiden Dateien driften.
- [ ] Runde-1-Nitpicks weiterhin offen, weiterhin gültig, beim nächsten Anfassen mitnehmen:
  der #268-Testblock (`run-tests.sh:4197-4276`) spaltet den #265-Abschnitt auf (dessen
  CI-Absicherung folgt erst ab Z. 4278); Testfall 6 (Z. 4269-4274) ist rezept-identisch zu
  #265 Testfall 1 (Z. 4115-4119) – Lesson #240 („Duplikat-Schleife/-Fixture vor dem Anlegen
  gegen die vorhandene abgleichen"); Magic String `'file:'` (Z. 4233) ohne Herleitungs-Kommentar;
  Traceability-Lücke `#268 AK1` (Z. 4274 labelt AK1 als „Gegenprobe, spec-265 AK1"); die
  Exit-1-statt-2-Entscheidung ist nur in der Task-Datei begründet, nicht im Skript-Header;
  AK4-Fixture (Z. 4227-4230) ist die dritte identische `install_all_hooks` + `config
  core.hooksPath .husky`-Wiederholung und die einzige Stelle ohne `; rc=$?`.
  Der Runde-1-Nitpick „Guard-Meldung auf stdout statt stderr wie das Vorbild
  `install-hooks.sh:51-54`" ist **nachweislich folgenlos**: `pre-push.sh:118` fängt mit `2>&1`,
  die Detailmeldung erscheint unter dem Banner (`sed 's/^/     /'`, Z. 122) – rein kosmetisch.

## Positives

- **Alle drei Runde-2-Findings sind an der Ursache behoben, nicht kosmetisch:**
  - **W1** – `spec-268:122-129` („Offene Fragen", Leerstring) trägt jetzt Strikethrough +
    Korrektur („Diese Annahme war falsch und wurde empirisch (git 2.51) widerlegt … bewusst
    **abweichend** vom `install-hooks.sh`-Vorbild"). Die Spec kann einen Folge-Task nicht mehr
    dazu verleiten, den Guard auf `[ -n … ]` zurückzudrehen. Zusätzlich hat die Task-Datei
    (`task-268-…md:52-59`) ihre eigene Falschaussage zum Ort des Strikethroughs explizit
    richtiggestellt statt sie still zu überschreiben – vorbildlich nachvollziehbar.
  - **W2** – `spec-268:45-52` (Scope-Bullet) streicht die „ODER die Factory-Checks einbinden"-
    Vorgabe durch und verweist auf ADR-042 §Consequences. Spec, Code (`hooks-installed-check.sh:87-89`),
    ADR und `git-workflow.md:77-84` sagen jetzt **dasselbe**: bei diesem Check ist `--unset` der
    einzige Ausweg, weil er ausschließlich `$GIT_COMMON_DIR/hooks` liest. Die Drift-Klasse
    #253/#251 ist damit geschlossen.
  - **W3** – der Exit-Status von `git config --get` ist jetzt sauber dreigeteilt
    (`:72-97`): `0` → fail-closed, `1` → weiter, **jeder andere Code** → eigener
    „nicht auswertbar"-Fail-closed-Zweig mit Nennung des Codes in der Meldung. Der
    Kommentar (`:67-71`) behauptet nichts mehr über `git config` hinaus, was die Doku nicht
    hergibt, und begründet den dritten Zweig mit dem Fail-closed-Grundsatz aus `clean-code.md`.
    Die Fail-open-Lücke in einem Fail-closed-Gate ist damit unabhängig davon geschlossen, ob
    sie praktisch erreichbar war – die richtige Richtung für ein Gate.
  - **Runde-2-Nitpick gratis mitgenommen:** die Leerstring-Meldung (`:87-92`) sagt nicht mehr
    sinnfrei „… einbinden in '<leer>'", sondern lässt die Pfadnennung in diesem Zweig weg –
    saubere Verzweigung statt Textflicken.
- **Guard-Semantik und Reihenfolge unverändert korrekt:** „kein Git-Repo" (`:52-55`) →
  `core.hooksPath`-Guard (`:72-97`) → Präsenzprüfung (`:99-117`) – exakt die von spec-268
  „Fehlerszenarien" geforderte Vorrang-Ordnung, als Guard Clause umgesetzt (`clean-code.md`:
  frühzeitig zurückkehren).
- **Exit-Code-Handling unter `set -uo pipefail` (ohne `-e`) ist wasserdicht:** `HOOKS_PATH_RC=$?`
  steht unmittelbar nach der Zuweisung (keine dazwischenliegende Expansion), `HOOKS_PATH_CONFIG`
  ist danach in jedem Zweig definiert (keine `set -u`-Falle), `${…:-Herkunft unbekannt}`-Fallback
  und `|| true` fangen den `pipefail`-Pfad der `--show-origin | cut`-Pipe ab.
- **Der Leerstring-Test bleibt echt diskriminierend** (`run-tests.sh:4261-4267`):
  `install_all_hooks` erfüllt alle übrigen Bedingungen, nur der Guard kann rot machen – kein
  Zufallstreffer über die Präsenzprüfung. Gleiches gilt für AK3 (Abwesenheits-Assertion der
  alten Präsenzmeldung) und AK5 (`.husky`-Signal gegen den „`worktree add` gescheitert"-Fehlpfad).
- **Suite selbst nachgeprüft:** 821 grün, 0 rot – unverändert gegenüber Runde 2, wie in der
  Task-Datei angekündigt („Runde 2 hat keine Test-Assertions berührt"). Die Behauptung stimmt.
- **Kein Akutrisiko für dieses Repo, live verifiziert:** `bash scripts/checks/hooks-installed-check.sh`
  → exit 0. Der PR blockiert sein eigenes Push-Gate nicht.
- **Doku-Kette vollständig:** ADR-042 §Consequences, `git-workflow.md` (Hook-Tabelle **und**
  `core.hooksPath`-Absatz), `spec-265` (Strikethrough + „Korrektur (spec-268)") und der
  Skript-Header beschreiben durchgängig dieselbe Mechanik – Lesson #211/#176 erfüllt, inklusive
  der bewussten Asymmetrie Installer ↔ Push-Gate.
- `docs/routes.md` korrekt **nicht** betroffen (keine `app/**/page.tsx`, kein `app/api/**/route.ts`
  im Diff); kein neuer CI-Wiring-Test nötig (die `pre-push.sh`-Verdrahtung ist seit #265 gepinnt,
  `run-tests.sh:4194-4195`).

## Empfehlung

APPROVED

**Begründung:** Kein kritisches und kein rework-pflichtiges wichtiges Finding. Die drei
Runde-2-Findings sind an der Ursache behoben, das Kernverhalten (AK1–AK5) ist korrekt,
diskriminierend getestet und in Spec/ADR/Guidelines widerspruchsfrei beschrieben; die
Spec-Drift, die Runde 2 blockiert hatte, ist in beide Richtungen aufgelöst. Die verbleibenden
Punkte sind zwei **Test-Suite-Themen** (Fixture-Hermetik gegenüber globalem `core.hooksPath`;
Coverage bzw. Erreichbarkeits-Klärung des neuen dritten `git config`-Exit-Zweigs) und drei
Doku-Kleinigkeiten. Die beiden Test-Themen gehören dem unmittelbar folgenden Pipeline-Schritt
`/test` – sie dort zu erledigen ist der kürzere und sachlich richtige Weg gegenüber einer
vierten Review↔Implement-Iteration am Circuit-Breaker-Limit.

**Keine neuen Out-of-Scope-Issues in dieser Runde** – die aus Runde 2 (**#278** Escape-Hatch,
**#279** `install-hooks.sh`-Leerstring-Blindspot + Invarianten-Test) decken die einzigen
Out-of-Scope-Themen bereits ab; sie sind lediglich noch nicht in ADR-042 verlinkt (Nitpick 3).

**Circuit Breaker:** Dies war Review-Runde 3 von maximal 3 – mit `APPROVED` ist die Schleife
regulär beendet, keine Eskalation nötig. Sollte `/test` an den beiden markierten Punkten auf
einen echten Verhaltensfehler stoßen (statt nur auf fehlende Abdeckung), ist das an den
Menschen zu eskalieren statt eine vierte Implement-Runde zu starten.
