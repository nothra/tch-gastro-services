# Review: Task 258

Diff-Scope: `git diff origin/main...HEAD` (6 Dateien: `scripts/install-yq.sh` (neu),
`scripts/checks/tests/run-tests.sh`, `.github/workflows/factory-ci.yml`,
`.github/workflows/factory-poll.yml`, Spec, Task-Datei).
Self-Test-Suite lokal ausgeführt: **837 grün / 0 rot**.
Drei Runden: Backend/Logik · Code-Qualität · Architektur/Patterns.

## Kritische Findings (müssen behoben werden)

_Keine._ Der Seam funktioniert, ist in CI real belegt (Run 30805947583) und alle sechs
Akzeptanzkriterien der Spec sind durch Tests abgedeckt (Tabelle unten). Die zentrale
Sorge „`fail()` ruft `exit 1` innerhalb einer Command-Substitution, beendet also nur die
Subshell" wurde empirisch entkräftet: `set -e` greift auf der **Zuweisung**
(`expected="$(expected_sha256 …)"`, `install-yq.sh:88`) → Abbruch mit Exit 1, kein
Weiterlaufen mit leerem Erwartungswert.

## Wichtige Findings (sollten behoben werden)

- [ ] `scripts/install-yq.sh:15-19` + `:110-112` (und `docs/specs/spec-258-yq-checksum-verifikation.md:18-22`) — **Der Erwartungswert stammt aus demselben ungeprüften Kanal wie das Artefakt; WHY-Kommentar und Spec versprechen mehr, als die Mechanik leistet.** `checksums` und `checksums_hashes_order` werden zur Laufzeit von derselben `$BASE_URL` geladen wie `yq_linux_amd64`. Wer das Release-Asset ersetzen kann (kompromittierter Publisher, Re-Upload auf ein bestehendes Tag), ersetzt die Hash-Dateien mit — im Repo ist **kein** kryptografischer Anker gepinnt, nur die Versionsnummer. Der Skript-Header behauptet aber genau den Gegenschutz („ein manipuliertes Release-Asset wird unbemerkt ausgeführt"), die Spec nennt explizit „Supply-Chain-Angriff auf mikefarah/yq". Realer Gewinn dieses PRs ist der **Versions-Pin** + Erkennung von Korruption/Teil-Download/Asset-Drift. Trifft die kodifizierten Lessons „falscher WHY-Kommentar / falsche Kausalkette" (#264) und „frisch im selben PR entstandene Spec nicht unhinterfragt als Maßstab nehmen" (#253). Fix (eine von zwei Optionen): (a) `YQ_SHA256="…"` als zweite Konstante neben `YQ_VERSION` pinnen und den aus `checksums` gelesenen Wert dagegen prüfen — hält „eine Änderungsstelle pro Bump", macht die Aussage wahr; der Wert steht im CI-Log von Run 30805947583. Oder (b) WHY-Kommentar + Spec-Kontext auf das korrigieren, was tatsächlich abgedeckt ist. Nicht reproduzierbar (kein Netzwerk) — Designeigenschaft, aus dem Code belegt.
- [ ] `scripts/install-yq.sh:27` + `:119` — **Kein OS-/Arch-Guard, dafür ein unbedingtes `mv` nach `/usr/local/bin/yq`.** `YQ_BINARY="yq_linux_amd64"` ist hart verdrahtet, der Usage-Block (`:4-7`) nennt `bash scripts/install-yq.sh` ohne Plattform-Einschränkung, und das Skript liegt namentlich neben `install-hooks.sh`, auf das CLAUDE.md und README als „lokal einmalig ausführen" verweisen. Fehlerszenario: Entwickler auf macOS führt `sudo bash scripts/install-yq.sh` aus → Download und Verifikation melden **Erfolg** (der Hash passt ja), `mv` überschreibt das funktionierende `yq` mit einem Linux-amd64-Binary, der Fehler fällt erst bei `"$YQ_INSTALL_PATH" --version` (`:120`) auf — nach dem Clobbern, ohne Rollback. Danach ist `run-pipeline.sh` lokal kaputt (yq ist Prerequisite ohne Fallback, ADR-009). Vor diesem PR war das strukturell unmöglich (Block lag in Linux-CI-YAML). Zusätzlich asymmetrisch: `sha256_of` (`:42-50`) pflegt einen BSD/macOS-Zweig, verspricht also Portabilität, die der Download-Pfad nicht hat (`lessons/code-style.md` „Fail-Safe/Guard symmetrisch"). Fix: `uname -s`/`uname -m`-Guard mit `fail`-Meldung **vor** dem Download.
- [ ] `scripts/install-yq.sh:96` — **Unbekannte Argumente fallen fail-open in den privilegierten Installationspfad.** `if [ "${1:-}" = "--verify" ]` ist die einzige Dispatch-Bedingung; jedes andere Argument (`--verfiy`, `--help`, `-h`, Positionsargumente) läuft in Download + `mv` nach `/usr/local/bin/yq`, ohne Usage und ohne Exit ≠ 0. `sudo bash scripts/install-yq.sh --verfiy <pfade>` tut damit etwas völlig anderes als beabsichtigt; `--help` installiert. Kein Security-Loch (die Verifikation läuft weiterhin vor `chmod`), aber genau die Klasse, die dieses Repo in #262 bereits kodifiziert hat (`commit-msg-check.sh`-Flag-Guard, CLAUDE.md-Guardrail) und die `clean-code.md` mit „fail-closed – im Zweifel ablehnen" adressiert. Fix: `case "${1:-}"` mit `--verify` / `-h|--help` (Usage, exit 0) / `""` (install) / `*)` → exit 2. Die Usage-Zeile existiert bereits (`:98`).
- [ ] `scripts/checks/tests/run-tests.sh:4377` — **Negativtest „fehlende SHA-256-Zeile" ist nicht pfaddiskriminierend (Lesson #214).** `grep -qF 'SHA-256'` trifft jede Meldung, die den Algorithmusnamen nennt — **verifiziert**: der Literal `SHA-256` steht auch in der generischen Format-Drift-Meldung (`install-yq.sh:72`) **und in der Erfolgsmeldung** (`install-yq.sh:93`). Fehlerszenario: entfernt man den dedizierten Guard (`install-yq.sh:59-60`), ist `algo_line` leer, `$((algo_line + 1))` ergibt 1, `awk '{print $1}'` liefert `yq_linux_amd64`, der 64-Hex-Guard schlägt an → Exit ≠ 0 **und** Meldung enthält „SHA-256" → beide Assertions des Testfalls bleiben grün. Der Test kann nicht zwischen „eigener Guard greift" und „Fallback greift" unterscheiden, obwohl `tasks/task-258-yq-checksum-verifikation.md:50-53` ausdrücklich das Gegenteil zusichert. Fix: auf das pfadspezifische Fragment ankern, z. B. `grep -qF "keine 'SHA-256'-Zeile"`. Die anderen vier Negativfälle (`Checksum-Mismatch`, `keinen Eintrag`, `Format-Drift`, `nicht lesbar`) sind sauber isoliert.
- [ ] `scripts/checks/tests/run-tests.sh:4270` — **Dritte Kopie des identischen awk-Job-Block-Extraktors, in neuer Schreibweise (Lessons #240/#251/#224).** Verifiziert: dasselbe awk-Programm steht bereits in `:1471` (`cv_job_block`) und — 60 Zeilen über dem neuen Code — in `:4207` (`ci_selftest_block`). Der `#258`-Block kopiert es ein drittes Mal und wechselt dabei auf dynamisches Matching (`$0 ~ "^  " j ":"` statt `/^  name:/`). Auch der Rumpf (Block extrahieren → `grep -qF 'bash scripts/install-…​.sh'` → Reihenfolge-Guard per `grep -n … | cut -d: -f1`) ist strukturell identisch mit dem `#265`-Block direkt darüber. Genau das Muster, das Lesson #240 verbietet („neue Schleife gegen vorhandene mit identischem Rumpf abgleichen, bevor eine parallele angelegt wird") und #251 als Rezidiv dokumentiert. Fix: Helper `ci_job_block <job> <file>` und die zwei Bestandsstellen mitziehen — die neue, parametrisierte Form ist die bessere und kann beide ersetzen.
- [ ] `CLAUDE.md` (Guardrails, analog Zeile 147) + `docs/factory/OPERATING.md` — **Die „kanonische Quelle"-Regel fehlt für den neuen Seam.** Verifiziert: `install-yq` kommt in keiner geladenen Doku vor (grep über `CLAUDE.md`, `docs/factory/OPERATING.md`, `docs/factory/guidelines/`, `README.md` → 0 Treffer) — die Single-Source-Aussage steht nur im Skript-Header, und Skript-Header werden nicht in den Agenten-Kontext geladen. Für das ausdrücklich als Vorbild genannte `install-hooks.sh` steht dieselbe Regel an drei Stellen geladener Doku (CLAUDE.md-Guardrail, `git-workflow.md`, OPERATING.md). Der Self-Test schützt nur teilweise gegen Rückfall: der AK4-Loop (`run-tests.sh:4266-4278`) iteriert über eine hartkodierte Dreier-Liste, und die Sperre auf `releases/latest/download` (`:4259`) gilt nur für `factory-ci.yml` + `factory-poll.yml`. Ein vierter Job mit *gepinntem* `wget`-Block oder ein neues Workflow-File wäre ungeguarded — also genau der Zustand, der zu diesem Issue geführt hat. Fix: eine Guardrail-Zeile in CLAUDE.md + Verweis in OPERATING.md. **Das ist auch die Antwort auf die ADR-Frage** (siehe unten): kein ADR nötig, aber die Konvention muss in geladene Doku.

## Nitpicks (optional)

- [ ] `scripts/checks/tests/run-tests.sh:4259` — AK1-Guard ist fail-open bei unlesbarer Quelle: `! grep -q … "$CI_FILE" "$POLL_YML" "$INSTALL_YQ"` — fehlt eine Datei, gibt `grep` Exit 2 zurück (POSIX), `!` macht daraus PASS. Wird `factory-poll.yml` umbenannt, bleibt der Test grün, obwohl er nichts mehr prüft (Lesson #214 „Fail-closed bei unlesbarer Quelle"). Das Muster steht 20 Zeilen darüber schon richtig: der `#262`-Block (`:4230-4239`) setzt `[ -r "$doc_file" ]` als eigene Vorbedingungs-Assertion in die Schleife. `$INSTALL_YQ` hat sie (`:4253`), `$CI_FILE`/`$POLL_YML` nicht.
- [ ] `scripts/checks/tests/run-tests.sh:4312-4330` — Spaltenherleitung nur mit **einer** Order-Position getestet: die Fixture legt `SHA-256` fix auf Zeile 3 (= Feld 4). Ein hartkodiertes `$4` statt `$((algo_line + 1))` würde die Suite vollständig grün lassen. Da yq die Reihenfolge laut Spec-Fehlerszenario **pro Release rotiert**, ist genau das die release-fragilste Zeile des Seams. Zweite Fixture mit `SHA-256` auf einer anderen Zeile wäre die Diskriminierungs-Kontrolle (Lesson #172). Off-by-one in die andere Richtung ist abgedeckt (Feld 3 trägt bewusst einen falschen Wert).
- [ ] `scripts/install-yq.sh:45-49` — Asymmetrische Werkzeug-Prüfung in `sha256_of`: nur `sha256sum` wird per `command -v` geprüft, `shasum` blind aufgerufen. Fehlen beide, ist das Verhalten dank `pipefail` fail-closed, die Diagnose lautet aber `shasum: command not found` statt einer pfadspezifischen Meldung — entgegen der in `tasks/task-258-yq-checksum-verifikation.md:50-53` selbst formulierten Designregel „jeder Fehlerpfad trägt eine eigene Meldung" und `lessons/code-style.md` (#224).
- [ ] `scripts/install-yq.sh:91` — Toter Fallback `${actual:-<leer>}`: schlägt `sha256_of` fehl, bricht `set -e` bereits an Zeile 89 ab; gelingt es, ist die Ausgabe nichtleer. Der Zweig ist unerreichbar und täuscht eine Fehlerbehandlung vor — `clean-code.md` §„Keine Fallbacks für bereits ausgeschlossene Fälle".
- [ ] `scripts/install-yq.sh:110-112` — `wget` ohne `--timeout`/`--tries`: ein hängender Download blockiert den Job bis zum Job-Timeout, und `-q` unterdrückt, **welche** der drei URLs gescheitert ist → Job rot ohne Diagnose. Vorbestehendes Muster, aber der Seam ist jetzt der einzige Ort, an dem es zu fixen wäre.
- [ ] `scripts/checks/tests/run-tests.sh:4347` + `:4360` — `[ ! -x "$dir/yq_linux_amd64" ]` ist praktisch tautologisch: `: > …` (`:4320`) erzeugt Mode 644, und der `--verify`-Zweig enthält konstruktiv kein `chmod` — die Assertion kann durch den Code-under-Test nie rot werden. Der tatsächliche AK3-Beleg ist der Reihenfolge-Guard (`:4293-4296`).
- [ ] `scripts/checks/tests/run-tests.sh:4315-4318` + `:4384` — Fixture-Namen `other_a/other_b/other_c/wrong` sagen nicht, was sie sind (Füllhashes der Nicht-SHA-256-Spalten bzw. Decoy-SHA-256 der Nachbarzeilen); `printf 'x%.0s' {1..64}` steht 5× — ein `hex64 <zeichen>`-Helper wäre knapper.
- [ ] `scripts/checks/tests/run-tests.sh:4334` — „ohne Netzwerkzugriff" per `http_proxy`/`https_proxy` ist eine neue Schreibweise; für „externes Werkzeug unerreichbar" existiert im File schon ein deterministisches Idiom (PATH-Shadowing auf ein leeres bin, `:2885/:2887`). Proxy-Variablen wirken nur auf Werkzeuge, die sie beachten — der Kommentar „nicht nur behauptet, sondern mitgeprüft" verspricht etwas mehr, als das Konstrukt hält.
- [ ] `scripts/install-yq.sh:54-58` — `expected_sha256` nimmt drei Parameter, liest `YQ_HASH_ALGO` aber aus dem globalen Scope; als vierter Parameter wäre die Funktion isoliert testbar.
- [ ] `scripts/install-yq.sh:105-120` vs. `.github/workflows/factory-ci.yml:67,87` / `factory-poll.yml:57` — `sudo` umfasst mehr als nötig: unter `sudo bash …` laufen Download **und** das Parsing frisch geladener, noch unverifizierter Fremddaten als root. **Keine Verschlechterung** — auf `main` lief `sudo wget -qO /usr/local/bin/yq` ebenfalls als root (3 `sudo`-Zeilen vorher, 3 nachher) — aber der neue Seam wäre die natürliche Stelle für Least Privilege (unprivilegiert laden + verifizieren, nur `install -m 0755` privilegiert). Nebenwirkungen geprüft und unkritisch: das Skript berührt weder `$HOME` noch den Checkout, es entstehen keine root-owned Dateien, die Folgeschritte stören; `sudo` selbst bleibt nötig (`/usr/local/bin` ist auf `ubuntu-latest` root-owned).
- [ ] `scripts/install-yq.sh:1-22` — Idempotenz-Aussage fehlt gegenüber dem Vorbild (`install-hooks.sh:10-11` dokumentiert sie explizit); `install-yq.sh` lädt bei jedem Aufruf neu, ohne Kurzschluss, wenn `/usr/local/bin/yq` schon `YQ_VERSION` ist. In CI (frischer Runner) irrelevant und YAGNI-konform — nur ein Muster-Delta zum genannten Vorbild.
- [ ] `docs/adr/041-config-validation-ci-required-check.md` — optional ein Satz in *Konsequenzen* („Redundanz beim yq-Setup seit #258 auf einen Seam-Aufruf reduziert"). Keine Drift: „nur `checkout` + yq-Download" (`:67`) und „yq-Download, in der Praxis wenige Sekunden" (`:99`) bleiben sachlich korrekt, und der Nachteil-Satz (`:68`) steht im Abschnitt *Alternativen* — historisches Narrativ, das nach Lesson #211/#176 bleibt.

## Akzeptanzkriterien

| AK | Status | Beleg |
|----|--------|-------|
| AK1 Versions-Pin, kein `releases/latest` | erfüllt | `YQ_VERSION="v4.53.3"` (`install-yq.sh:26`), von `BASE_URL` interpoliert (`:108`); grep-Guards `run-tests.sh:4259/4262`. Einschränkung: kein Test koppelt `BASE_URL` an `YQ_VERSION` — ein hartkodiertes Tag in der URL bliebe unentdeckt. |
| AK2 SHA-256-Verifikation vor `chmod +x` | erfüllt | `verify_sha256` (`:114`) vor `chmod 0755` (`:118`), plus Reihenfolge-Guard an den echten Aufruf-Zeilen (`run-tests.sh:4293-4296`). Einschränkung: siehe erstes wichtiges Finding. |
| AK3 Mismatch → Exit ≠ 0, kein `chmod` | erfüllt | Fixture-Test grün, `[ ! -x … ]` nach dem Mismatch (Aussagekraft siehe Nitpick). |
| AK4 alle drei Jobs rufen denselben Seam | erfüllt | Job-Block-isolierte Tests für `config-validation`, `factory-self-test`, `factory-poll` (Aufruf vorhanden **und** `wget`+`chmod`-Block abwesend). Keine vierte yq-Installationsstelle im Repo. |
| AK5 Positiv-Fixture, netzwerkfrei | erfüllt | Exit 0 + `verifiziert`-Meldung; Netzwerkfreiheit best-effort über unerreichbaren Proxy. |
| AK6 eigener Negativ-Testfall | erfüllt | Genau ein Defekt in der Fixture, pfadspezifische Meldung `Checksum-Mismatch` assertiert. |

Fehlerszenarien der Spec: (1) Download-/Teil-Download-Fehler — analytisch abgedeckt (`set -e` +
`pipefail`, `mktemp -d` + `trap`, `mv` erst nach der Verifikation; offline nicht testbar,
konsistent mit der Spec). (2) Fehlender `checksums`-Eintrag — eigener Pfad + Test.
(3) Fehlende `SHA-256`-Zeile — eigener Pfad + Test, Meldungs-Anker aber unscharf (Finding oben).

## ADR-Frage

Die Task hat `/architecture` bewusst übersprungen. **Das ist haltbar — kein ADR nötig.**
ADR-042 entstand, weil *zwei konkurrierende Quellen* für Hook-Inhalte existierten (echter
Konflikt + Retrofit-Problem). Hier gab es nie ein konkurrierendes Verfahren, keine verworfene
Technologie-Alternative (Checksum-Verifikation gegen Publisher-Hashes ist Standardpraxis,
Alternativen sind in `spec-258` §Nicht inbegriffen sauber abgehandelt), keine neue Abhängigkeit,
und die Entscheidung ist jederzeit reversibel. Die dauerhafte Konvention (zentraler,
versions-gepinnter Tool-Seam + manuelle Bump-Pflicht) gehört aber in **geladene** Doku —
siehe das letzte wichtige Finding.

## Routen-Doku

Nicht betroffen: `git diff --name-only origin/main...HEAD` enthält keine `app/**`-Datei
(nur Workflows, Spec, Task, `run-tests.sh`, `install-yq.sh`) — `docs/routes.md` korrekt
unverändert (#145).

## Out-of-Scope-Findings (eigene Issues)

- **#283** — `docs/adr/009-factory-configuration.md:68-69,187`: §2 beschreibt im Präsens ein
  „`factory-selftest`-Image", in das yq gebacken wird, und listet `ci/factory-selftest.Dockerfile`
  als Umsetzungsschritt. Verifiziert: `git ls-files ci/` ist leer. **Vorbestehende Drift** aus der
  Plattform-Migration (ADR-012:36), nicht von diesem PR verursacht — nach Lesson #211 triggert
  sie hier keine Mitpflege-Pflicht. Im selben Issue mitgenommen: ADR-009:76 verlangt yq „in die
  README-Voraussetzungen", `README.md` nennt es nicht.

Beobachtung ohne Issue: **11 Skripte** definieren `GREEN`/`RED`/`NC` lokal, `fail()` existiert
in drei Formaten (`config-validation-check.sh:61`, `post-merge-verify.sh:45`, neu
`install-yq.sh:37`) — es gibt kein `scripts/lib/`-Modul dafür. Die lokale Definition ist damit
das *etablierte* Repo-Muster, und `install-yq.sh` wählt korrekt die Variante des vorgeschriebenen
Vorbilds. Eine Extraktion wäre ein repo-weiter Refactor ohne Bezug zu dieser Task; kein Finding.

## Positives

- **Verifikation strukturell vor `chmod`** (`:114` vs. `:118`) und zusätzlich per
  Reihenfolge-Guard abgesichert, der an den **echten Aufruf-Zeilen** ankert
  (`^verify_sha256 "`, `^chmod 0755 "`) statt an einer Prosa-Erwähnung — Lesson #114 sauber
  angewandt, und fail-closed: verschwindet eine Ankerzeile, geht der Test rot.
- **Spaltenermittlung über `checksums_hashes_order`** statt fester Spalte trifft genau den
  eigentlichen Fallstrick (yq rotiert die Reihenfolge pro Release). Zeilenauswahl per
  **exaktem** Feldvergleich (`$1 == t`), nicht Präfix-Match — und die Fixture führt
  `yq_linux_amd64.tar.gz` und `yq_linux_386` mit absichtlich falschen Hashes als echte
  Diskriminierungs-Kontrolle mit.
- **`^[0-9a-f]{64}$`-Guard auf den extrahierten Wert** schließt den „leerer/falscher
  Erwartungswert → leise verifiziert"-Pfad wirklich zu. Jeder Fehlerpfad trägt eine eigene
  Meldung, und die Tests prüfen die Meldung statt nur „Exit ≠ 0" (Lesson #214 angewandt —
  mit der einen Ausnahme oben).
- **Positiv-Fixture nutzt den öffentlichen SHA-256-Testvektor der leeren Eingabe** → der
  Soll-Wert ist ein Literal, nicht aus dem Objekt-under-Test abgeleitet (testing-standards),
  und die WHY-Begründung steht dabei.
- **`--verify`-Seam** macht den Kern netzwerkfrei testbar, ohne den Produktionspfad zu
  verbiegen; die Proxy-Sabotage im Test ist ein Unerreichbarkeits-*Beweis* statt einer
  Behauptung.
- **Download in ein `mktemp -d` mit `trap`-Cleanup** statt direkt nach `/usr/local/bin` —
  strukturell besser als der alte `wget -qO /usr/local/bin/yq`, der schon eine HTTP-Fehlerseite
  ins Zielverzeichnis geschrieben hätte. `"$YQ_INSTALL_PATH" --version` statt `yq --version`
  vermeidet PATH-Ambiguität nach `sudo`.
- **Job-Block-Extraktion bricht auch am Trennkommentar `# ───` ab** (Lesson #255 eingearbeitet),
  nicht nur am nächsten Job-Key.
- **Stil-Konsistenz mit `install-hooks.sh`**: identischer Header-Aufbau, `set -euo pipefail`,
  Fehler-Präfix `✗ install-yq: …` in Rot auf stderr, Erfolgs-`✓` in Grün, Skriptname im Präfix,
  gleicher Dateimodus (644, Aufruf via `bash`).
- **Der CI-Nachweis der Asset-Formatannahme ist im Task-File belegt** (Run 30805947583) statt
  nur behauptet — die einzige lokal unprüfbare Annahme ist damit geschlossen.

## Empfehlung

NEEDS_REWORK — sechs wichtige Findings, alle klein und lokal; keine Architektur-Umbauten
nötig. Reihenfolge: (1) Aussage-Wahrheit des Checksum-Schutzes (Hash pinnen **oder**
WHY-Kommentar + Spec korrigieren), (2) OS-/Arch-Guard, (3) fail-closed Argument-Dispatch,
(4) pfadspezifischer Meldungs-Anker im no-algo-Negativtest, (5) awk-Extraktor als Helper
(Bestandsstellen mitziehen), (6) Single-Source-Regel in CLAUDE.md + OPERATING.md.
