# Review: Task 258

**Runde 2** (nach dem Rework aus Runde 1 – Historie am Ende der Datei).
Diff-Scope: `git diff origin/main...HEAD` (9 Dateien: `scripts/install-yq.sh` (neu),
`scripts/checks/tests/run-tests.sh`, `.github/workflows/factory-ci.yml`,
`.github/workflows/factory-poll.yml`, `CLAUDE.md`, `docs/factory/OPERATING.md`, Spec, Task-Datei,
Review-Datei).
Self-Test-Suite lokal ausgeführt: **861 grün / 0 rot** (die im Task-File genannte Zahl ist
damit reproduziert). Drei Runden: Backend/Logik · Code-Qualität · Architektur/Patterns.

Alle sechs wichtigen Findings aus Runde 1 sind **verifiziert behoben** – im Detail nachgeprüft
statt nur der Rework-Notiz geglaubt:

| Runde-1-Finding | Nachprüfung in Runde 2 |
|---|---|
| Erwartungswert nur aus dem Download-Kanal | `YQ_SHA256` gepinnt (`install-yq.sh:40`), eigener Fehlerpfad „Pin-Abweichung" (`:120-121`); Mutation `pinned=hex64 e` → AK7-Meldungs-Assertion diskriminiert (Pin-Check entfernt ⇒ Meldung wird „Checksum-Mismatch" ⇒ Test rot). Grenze der Zusage (TOFU) steht im Header **und** in der Spec. |
| Kein OS-/Arch-Guard | `require_linux_amd64` (`:134-146`) vor dem ersten `fetch`; Reihenfolge-Guard an den echten Aufruf-Zeilen (`run-tests.sh:4319-4322`). Guard entfernt ⇒ zwei Assertions rot (OS-Name fehlt, `NETZWERK-STUB` erscheint). |
| Fail-open Argument-Dispatch | `case "${1:-}"` (`:160-181`) mit `*)` → exit 2; drei Dispatch-Tests inkl. `! grep NETZWERK-STUB`. |
| Nicht-diskriminierender no-algo-Anker | jetzt `grep -qF "keine 'SHA-256'-Zeile"` (`run-tests.sh:4457`). |
| Dritte Kopie des awk-Extraktors | verifiziert: `grep -n 'f=1; next'` liefert **genau einen** Treffer (`:65`) – beide Bestandsstellen ziehen `ci_job_block`, Ausgabe identisch zur alten Inline-Form. |
| Single-Source-Regel nur im Skript-Header | `CLAUDE.md:153-159` + `OPERATING.md:434-439` (liegt korrekt in §5.4 „Invarianten laufend grün halten"), abgesichert durch zwei Doku-Checks mit Lesbarkeits-Vorbedingung. |

## Kritische Findings (müssen behoben werden)

_Keine._ Der Seam ist fachlich korrekt, fail-closed an jedem Pfad, in CI real belegt
(Run 30809613876 auf dem Stand nach dem Rework) und alle sieben Akzeptanzkriterien sind durch
Verhaltenstests gedeckt (Tabelle unten).

## Wichtige Findings (sollten behoben werden)

- [x] `scripts/install-yq.sh:194` + `scripts/checks/tests/run-tests.sh:4289-4290` — **Der in Runde 1 nachgerüstete Repo-Pin ist nicht an den Produktionspfad gekoppelt: kein Test prüft, dass `verify_sha256` dort mit `$YQ_SHA256` aufgerufen wird.** Der einzige Test zum Pin (`grep -qE '^YQ_SHA256="[0-9a-f]{64}"$'`) belegt nur, dass die *Konstante existiert und formal ein Hash ist*. Die AK7-Verhaltenstests fahren `--verify` mit einem **selbst mitgegebenen** Fixture-Pin (`run_verify … "$pinned"`), berühren also die Verdrahtung der Konstante nicht. **Mutation ausgeführt:** `YQ_SHA256` auf `000…0` gesetzt → Suite bleibt **861 grün / 0 rot**. Fehlerszenario (das gefährliche): ein „Vereinfachungs"-Refactor übergibt als viertes Argument den aus `checksums` gelesenen Wert statt der Konstante (oder eine daraus abgeleitete Variable) – dann ist `published = pinned` trivial wahr, der Supply-Chain-Anker aus Runde 1 ist lautlos weg, **und es gibt kein rotes Signal**: die Self-Test-Suite bleibt grün *und* CI bleibt grün (der ehrliche Download passt ja zu seinem eigenen Hash). Ein versehentliches *Löschen* des Arguments fällt dagegen durch `set -u` auf – abgedeckt ist also nur die harmlosere Hälfte. Genau die kodifizierte Klasse „Kopplungs-/Drift-Guard: je Seite ein eigener Negativtest" bzw. „deterministisches Gate braucht Verhaltenstest, nicht nur Wiring-Grep" (Lessons #214/#212). Fix: Kopplungs-Guard am echten Aufruf – das Idiom steht 30 Zeilen darüber schon (`grep -n '^verify_sha256 "'`): assertieren, dass genau diese Zeile `"$YQ_SHA256"` als letztes Argument führt. Zwei Zeilen. (Die *Korrektheit* des Pin-Werts ist lokal nicht prüfbar und über den CI-Lauf belegt – das ist in Ordnung und dokumentiert; hier geht es um die Verdrahtung.)
- [x] `tasks/task-258-yq-checksum-verifikation.md:47-49` — **Die technische Notiz beschreibt die CLI im Präsens falsch – sie ist beim Rework nicht mitgezogen worden.** Dort steht „**Zwei Modi**: ohne Argumente …; `--verify <binary> <checksums> <order>`". Tatsächlich hat der Dispatch nach dem Rework **vier** Zweige (`--verify`, `-h|--help`, Default-Install, `*)` → exit 2) und `--verify` nimmt **vier** Argumente – der gepinnte Hash ist als vierter Parameter dazugekommen (`install-yq.sh:9`, `usage()` `:59-60`, `case` `:160-181`, Aufruf `:166`). Fehlerszenario: wer der Task-Notiz folgt und `bash scripts/install-yq.sh --verify bin checksums order` aufruft, bekommt Usage + **exit 2** statt einer Verifikation; die Notiz ist der einzige Ort, der die Signatur außerhalb des Skripts beschreibt, und sie wandert mit dem Merge nach `main`. Der `§Rework`-Abschnitt darunter erklärt den Pin, korrigiert die Signatur aber nicht. Kodifiziert als Finding-Klasse: „Doku, die die geänderte Mechanik im Präsens beschreibt, im selben PR nachziehen" (#211/#176). Fix: Argumentliste + „Zwei Modi" → „Drei Modi" in einer Zeile korrigieren.

## Nitpicks (optional)

- [x] `docs/specs/spec-258-yq-checksum-verifikation.md:122` — Die offene Frage „genaue CLI-Signatur" steht noch auf `[ ]`, obwohl sie entschieden **und** umgesetzt ist (Task-File `:98-101` führt sie als `[x]`, `install-yq.sh` implementiert sie). Die erste offene Frage derselben Datei (`:120`) ist abgehakt – die Konvention ist innerhalb der Datei also gesetzt, die zweite Zeile ist Drift. (Die AK-Checkboxen der Spec sind durchgängig `[ ]`; das ist die Spec-Konvention dieses Repos und **kein** Finding – die Abhak-Spur liegt im Task-File.)
- [x] `scripts/checks/tests/run-tests.sh:4279-4283` + `scripts/install-yq.sh:188` — AK1 prüft „kein `releases/latest/download`" und „`YQ_VERSION` ist eine konkrete Version", koppelt aber nicht `BASE_URL` an `$YQ_VERSION`. Ein hartkodiertes Tag in der URL (`…/releases/download/v4.44.0`) würde beide Guards passieren, während `YQ_VERSION` etwas anderes behauptet. Praktisch fail-closed (in CI schlägt dann die Pin-Abweichung zu, Job rot), aber lokal unentdeckt. Ein `grep -qF 'releases/download/$YQ_VERSION"' "$INSTALL_YQ"` schließt es zum Preis einer Zeile. (Stand in Runde 1 als „Einschränkung" in der AK-Tabelle, ohne Fix-Vorschlag.)
- [x] `scripts/install-yq.sh:104-105` + `:119` — Der Funktionskommentar betont „Der Pin ist ein Parameter (**kein globaler Zugriff**), damit Produktionspfad und Test dieselbe Bahn nehmen" – `verify_sha256` liest `YQ_HASH_ALGO` dann aber doch aus dem globalen Scope und injiziert es in `published_sha256`, das den Algorithmus korrekt als Parameter nimmt. Asymmetrie zur eigenen Begründung; folgenlos (der Algorithmusname ist konstant, rotiert wird nur die *Position*, und die ist getestet), aber der Kommentar verspricht mehr Isolation als die Funktion hat.
- [x] `scripts/install-yq.sh:162-165` + `scripts/checks/tests/run-tests.sh:4505-4506` — Der `--verify`-Zweig mit falscher Argumentzahl ist der einzige Fehlerpfad **ohne** eigene Meldung: er ruft `usage >&2` + `exit 2`, nicht `fail`, trägt also kein `✗ install-yq:`-Präfix und benennt nicht, *was* fehlt. Passend dazu assertiert der Test nur den Exit-Code, keine Meldung – der einzige der zehn Negativfälle ohne Meldungs-Assertion. Die im Task-File formulierte Designregel „jeder Fehlerpfad trägt eine eigene, pfadspezifische Meldung" gilt hier nicht.
- [ ] `scripts/checks/tests/run-tests.sh:68-73` — `hex64` steht bei den generischen Helfern am Dateikopf, hat aber genau **einen** Nutzungsort ~4300 Zeilen weiter unten (den #258-Fixture-Block); `ci_job_block` daneben hat drei Nutzer und gehört dort hin. Kein Fehler, nur ein Platzierungs-Delta: ein Fixture-Detail eines Issue-Blocks im globalen Namensraum.
- [ ] Aus Runde 1 bewusst offen gelassen und weiterhin gültig eingeordnet (keine erneute Bewertung nötig): tautologisches `[ ! -x … ]`, Least-Privilege-Split des `sudo`-Umfangs, fehlender Idempotenz-Kurzschluss, Zusatzsatz in ADR-041. Die Begründungen im `§Rework`-Abschnitt sind tragfähig – insbesondere ist der `sudo`-Umfang nachweislich keine Verschlechterung gegenüber `main`.

## Akzeptanzkriterien

| AK | Status | Beleg (Runde 2 nachgeprüft) |
|----|--------|------|
| AK1 Versions-Pin, kein `releases/latest` | erfüllt | `YQ_VERSION="v4.53.3"` (`install-yq.sh:39`) → `BASE_URL` (`:188`); Guards `run-tests.sh:4279-4283` (mit Lesbarkeits-Vorbedingung `:4273`). Einschränkung: keine Kopplung URL↔Konstante (Nitpick). |
| AK2 SHA-256-Verifikation vor `chmod +x` | erfüllt | `verify_sha256` (`:194`) vor `chmod 0755` (`:198`); Reihenfolge-Guard an den echten Aufruf-Zeilen (`run-tests.sh:4312-4315`). Spaltenherleitung jetzt mit **zwei** Order-Positionen getestet (Zeile 3 und Zeile 1) → hartkodierte Spalte fällt auf. |
| AK3 Mismatch → Exit ≠ 0, kein `chmod` | erfüllt | Fixture-Test + Meldungs-Assertion `Checksum-Mismatch`; `chmod` liegt strukturell hinter der Verifikation, Guard siehe AK2. |
| AK4 alle drei Jobs rufen denselben Seam | erfüllt | Job-Block-isolierte Tests über `ci_job_block` für `config-validation`, `factory-self-test`, `factory-poll` – Aufruf vorhanden **und** `wget`+`chmod`-Block abwesend; zusätzlich YAML-Parse-Check (wo yq da ist). Repo-weit keine vierte yq-Installationsstelle (`grep mikefarah` → nur Seam + Doku/Spec/Task). |
| AK5 Positiv-Fixture, netzwerkfrei | erfüllt | Exit 0 + `verifiziert`-Meldung; Netzwerkfreiheit jetzt **deterministisch** über wget/curl-PATH-Stub belegt (`! grep NETZWERK-STUB`) statt über Proxy-Variablen. |
| AK6 eigener Negativ-Testfall | erfüllt | Genau ein Defekt in der Fixture (korrupte Binary), pfadspezifische Meldung assertiert. |
| AK7 Pin-Abweichung eigener Fehlerpfad | erfüllt **mit Lücke** | Verhalten + unterscheidbare Meldung `Pin-Abweichung` sind getestet und diskriminierend. Die **Verdrahtung** des Repo-Pins in den Produktionspfad ist ungetestet → erstes wichtiges Finding. |

Fehlerszenarien der Spec: (1) Download-/Teil-Download-Fehler – jetzt mit eigener Meldung inkl.
URL und `--timeout=30 --tries=3` (`fetch`, `:152-155`); der Netzwerkpfad selbst bleibt offline
nicht testbar, konsistent mit der Spec. (2) Fehlender `checksums`-Eintrag – eigener Pfad + Test.
(3) Fehlende `SHA-256`-Zeile – eigener Pfad + Test, Anker jetzt pfadspezifisch. Zusätzlich
abgedeckt: verkürzte Zielzeile (Format-Drift), nicht lesbare Datei, fehlendes Hash-Werkzeug,
fremde Plattform (OS **und** Architektur getrennt), unbekanntes Argument.

## Architektur / Patterns

- **Keine Schicht-/ADR-Verletzung.** Der Seam liegt richtig (`scripts/`, `bash`-aufgerufen,
  Modus 644, kein Executable-Bit – identisch zu `install-hooks.sh`), CI ruft ihn als einzigen
  Bereitstellungsweg. ADR-009 („yq ist Prerequisite ohne Fallback") bleibt gültig; ADR-042
  („Hook-Installation single source") bekommt mit #258 ein konsistentes Geschwister-Muster.
- **ADR-Frage bleibt beantwortet: kein ADR nötig** (Begründung aus Runde 1 unverändert
  tragfähig – kein konkurrierendes Verfahren, keine verworfene Technologie-Alternative,
  reversibel). Die dauerhafte Konvention ist jetzt in **geladener** Doku verankert, was das
  eigentliche Anliegen war.
- **Routen-Doku:** nicht betroffen – `git diff --name-only origin/main...HEAD` enthält keine
  `app/**`-Datei; `docs/routes.md` korrekt unverändert (#145).
- **Stil-Konsistenz:** `ci_job_block` ist die richtige Extraktions-Abstraktion und hat die
  Bestandsstellen mitgezogen (nachgeprüft: genau eine Kopie des awk-Programms im File).
  Die lokale `GREEN`/`RED`/`NC`+`fail()`-Definition bleibt das etablierte Repo-Muster
  (11 Skripte) – korrekt gewählt, kein Finding.

## Out-of-Scope-Findings (eigene Issues)

- **#283** (aus Runde 1, weiterhin offen) — `docs/adr/009-factory-configuration.md:68-69,187`
  beschreibt im Präsens ein `factory-selftest`-Image + `ci/factory-selftest.Dockerfile`
  (`git ls-files ci/` ist leer), und ADR-009:76 verlangt yq in den README-Voraussetzungen,
  wo es nicht steht. Vorbestehende Drift, nicht von diesem PR verursacht. Der neue
  Plattform-Guard verweist Entwickler auf den Paketmanager – der passende Ort für diesen
  Hinweis ist die README-Voraussetzungsliste aus #283, nicht dieser PR.

Keine neuen Out-of-Scope-Funde in Runde 2.

## Positives

- **Beide Anker sauber getrennt, inklusive der Grenze der Zusage.** Der Header sagt jetzt
  explizit, dass der Pin ein Trust-on-First-Use-Anker ist und **keine** Publisher-Identität
  prüft – die Kausalkette stimmt, und die Spec sagt dasselbe. Genau das war das
  substanzielle Finding aus Runde 1; die Lösung (Option a) ist die stärkere der beiden
  angebotenen.
- **Pin-Wert nicht aus der gekürzten Task-Notiz rekonstruiert**, sondern per
  `gh run view … --log` im Volltext geholt – und danach empirisch bestätigt: der Nachtest-Lauf
  wäre bei falschem Pin **fail-closed rot** („Pin-Abweichung"), nicht still grün. Damit ist der
  Wert belegt, nicht behauptet.
- **Nachtest nach dem Rework selbst erkannt und nachgeholt.** Der Download-Pfad hatte sich
  geändert (Guard + Pin-Vergleich vor der Hash-Berechnung), also war der alte CI-Nachweis
  (Run 30805947583) veraltet – das Task-File sagt das ausdrücklich und liefert den neuen Lauf
  (30809613876). Diese Selbst-Invalidierung eines eigenen Belegs ist die Ausnahme, nicht die
  Regel.
- **Plattform-Guard mit deterministischem Test.** `uname` per PATH-Shadowing zu stellen, macht
  den Guard auf jeder Maschine prüfbar (macOS *und* Linux-CI) – und der wget/curl-Stub bleibt
  daneben im PATH, sodass ein entfallener Guard nicht das lokale `/usr/local/bin/yq` clobbert,
  sondern laut am Stub abbricht. Testbarkeit **und** Schadensbegrenzung im Testaufbau.
- **Netzwerkfreiheit vom Versprechen zum Beweis.** Der Wechsel von Proxy-Variablen auf ein
  lautes, immer fehlschlagendes wget/curl-Stub ist genau der Unterschied zwischen „wirkt nur,
  wenn das Werkzeug die Variable beachtet" und „wird sichtbar, wenn doch geladen wird". Dasselbe
  Stub trägt die drei Dispatch-Tests: eine Regression zum fail-open-Dispatch endet am Stub
  statt in `/usr/local/bin`.
- **Spaltenrotation mit zweiter Fixture-Position abgesichert** (SHA-256 auf Order-Zeile 1
  *und* 3) – die release-fragilste Zeile des Seams hat jetzt eine echte
  Diskriminierungs-Kontrolle, nicht nur einen Happy-Path. Nachbarzeilen (`yq_linux_386`,
  `…​.tar.gz`) tragen weiterhin absichtlich falsche Hashes gegen Präfix-Matching.
- **Jeder Negativfall setzt genau EINEN Defekt** und assertiert die pfadspezifische Meldung –
  zehn Fehlerpfade, neun mit Meldungs-Anker. Der no-algo-Anker liegt jetzt auf
  `keine 'SHA-256'-Zeile` statt auf dem bloßen Algorithmusnamen; damit kann der Test „eigener
  Guard" von „irgendein Fallback" unterscheiden (Lesson #214 korrekt nachgezogen).
- **Regel dort, wo Agenten sie sehen.** CLAUDE.md §Guardrails + OPERATING.md §5.4 statt nur
  Skript-Header, mit Begründung („dieser Block lag dreifach kopiert und unverifiziert in CI")
  und Generalisierung auf weitere Fremd-Binaries – abgesichert durch zwei Doku-Checks *mit*
  Lesbarkeits-Vorbedingung. Das ist der Teil, der den nächsten kopierten `wget`-Block
  verhindert.
- **Der awk-Extraktor wurde zusammengeführt statt kopiert**, inklusive der zwei
  Bestandsstellen – Lesson #240/#251 diesmal ohne Rezidiv angewandt.
- **Runde-1-Nitpicks überwiegend mit erledigt** (Lesbarkeits-Vorbedingung, `command -v` für
  beide Hash-Werkzeuge, toter `${actual:-…}`-Fallback entfernt, `fetch`-Wrapper mit Timeout und
  URL in der Meldung, `hex64` + sprechende Fixture-Namen), und die vier offen gelassenen sind
  je mit Begründung dokumentiert statt stillschweigend fallen gelassen.

## Empfehlung

NEEDS_REWORK — zwei wichtige Findings, beide mechanisch und in Summe unter fünf Zeilen:
(1) Kopplungs-Guard, der belegt, dass der Produktionsaufruf `$YQ_SHA256` übergibt (Idiom
existiert im File), (2) die veraltete CLI-Signatur in der technischen Notiz der Task-Datei.
Keine kritischen Findings, keine Architektur-Änderung, kein neuer Test-Aufbau nötig – die
Substanz der Task ist fertig und in CI belegt.

> **Iterations-Hinweis (Circuit Breaker):** Dies ist Review-Iteration **2 von 3**. Beide
> Findings sind eng umrissen; falls die Pipeline die Iteration sparen soll, ist Finding 1
> inhaltlich eine Testabdeckungs-Lücke und damit auch im nachfolgenden `/test`-Schritt
> korrekt aufgehoben – Finding 2 ist eine Ein-Zeilen-Doku-Korrektur. Eine dritte
> Review-Runde nach dem Rework ist nicht nötig, wenn beide Punkte umgesetzt sind.

## Rework-Protokoll (Implement-Runde 3, 2026-08-03)

Beide wichtigen Findings behoben, dazu drei der fünf Nitpicks. Suite: **864 grün / 0 rot**
(vorher 861).

1. **Kopplungs-Guard** (`run-tests.sh`, direkt hinter dem `YQ_SHA256`-Existenz-Check): ankert an
   `^verify_sha256 "` und verlangt `"$YQ_SHA256"` als **letztes** Argument. Die vom Review
   benannte gefährliche Mutation (vierter Parameter = aus `checksums` gelesener Wert) ist damit
   rot, statt Self-Test **und** CI grün zu lassen.
2. **CLI-Signatur nachgezogen** in `tasks/task-258…md` §Umsetzung: „Zwei Modi" → drei Modi,
   `--verify` mit vier Argumenten, unbekanntes Argument → Exit 2. Gleiche Drift in der
   Spec-Frage „genaue CLI-Signatur" mit abgehakt (Nitpick 1).
3. **URL ↔ `YQ_VERSION` gekoppelt** (Nitpick 2): `grep -qF 'releases/download/$YQ_VERSION'`.
4. **Meldung im Argumentzahl-Fehlerpfad** (Nitpick 4): eigene Meldung „--verify braucht vier
   Argumente …" + Meldungs-Assertion – jetzt tragen 10 von 10 Negativfällen einen
   pfadspezifischen Anker.
5. **Kommentar entschärft** (Nitpick 3): `verify_sha256` sagt jetzt, *warum* der Pin Parameter
   und der Algorithmusname global ist (konstant; rotiert wird nur die Position, die aus der
   übergebenen Order-Datei kommt) – statt mehr Isolation zu versprechen, als die Funktion hat.

**Diskriminierung aller drei neuen Guards per Mutation belegt:** Aufruf auf
`published_sha256`-Wert umgestellt · Tag in `BASE_URL` hartkodiert · Meldungs-`echo` entfernt
→ genau die drei zugehörigen Assertions rot (861 grün / 3 rot), kein Kollateral-Rot; nach dem
Rückbau wieder 864 grün / 0 rot.

**Offen gelassen:** Nitpick 5 (`hex64` bei den generischen Helfern statt beim #258-Block) – eine
reine Platzierungsfrage ohne Verhaltensanteil, die im `/refactor`-Schritt besser aufgehoben ist
als in einem Review-Rework.

---

## Historie: Runde 1 (2026-08-03)

> Verdict damals: NEEDS_REWORK. Alle sechs damals wichtigen Punkte sind behoben und in Runde 2
> nachgeprüft (Tabelle oben). Der Volltext bleibt als Nachweis-Spur stehen.

### Runde 1 · kritische Punkte

_Keine._ Die zentrale Sorge „`fail()` ruft `exit 1` innerhalb einer Command-Substitution,
beendet also nur die Subshell" wurde empirisch entkräftet: `set -e` greift auf der
**Zuweisung** → Abbruch mit Exit 1, kein Weiterlaufen mit leerem Erwartungswert.

### Runde 1 · wichtige Punkte (alle behoben)

1. `install-yq.sh` — Der Erwartungswert stammte aus demselben ungeprüften Kanal wie das
   Artefakt; WHY-Kommentar und Spec versprachen mehr, als die Mechanik leistete. Nur die
   Versionsnummer war gepinnt, kein kryptografischer Anker. Fix-Optionen: (a) `YQ_SHA256`
   pinnen, (b) Kommentar + Spec auf das Abgedeckte korrigieren.
2. `install-yq.sh` — Kein OS-/Arch-Guard, dafür ein unbedingtes `mv` nach
   `/usr/local/bin/yq`: ein macOS-Aufruf hätte erfolgreich verifiziert und das funktionierende
   `yq` mit einem Linux-Binary überschrieben, auffällig erst nach dem Clobbern.
3. `install-yq.sh` — Unbekannte Argumente fielen fail-open in den privilegierten
   Installationspfad (`--verfiy`, `--help` installierten). Klasse aus #262.
4. `run-tests.sh` — Negativtest „fehlende SHA-256-Zeile" war nicht pfaddiskriminierend:
   `grep -qF 'SHA-256'` traf auch die Format-Drift- **und** die Erfolgsmeldung (Lesson #214).
5. `run-tests.sh` — Dritte Kopie des identischen awk-Job-Block-Extraktors in neuer
   Schreibweise (Lessons #240/#251/#224).
6. `CLAUDE.md` / `OPERATING.md` — Die „kanonische Quelle"-Regel fehlte für den neuen Seam;
   sie stand nur im Skript-Header, und Skript-Header landen nicht im Agenten-Kontext.

### Runde 1 · Nitpicks

Erledigt: fail-open AK1-Guard bei unlesbarer Quelle · Spaltenherleitung nur mit einer
Order-Position · asymmetrische Werkzeug-Prüfung in `sha256_of` · toter `${actual:-…}`-Fallback ·
`wget` ohne `--timeout`/`--tries` und ohne URL in der Meldung · unklare Fixture-Namen +
5× `printf 'x%.0s'` · Netzwerkfreiheit per Proxy-Variablen statt PATH-Shadowing · Algorithmus
als Parameter.
Bewusst offen gelassen (je mit Begründung): tautologisches `[ ! -x … ]` · `sudo`-Umfang
(keine Verschlechterung gegenüber `main`) · Idempotenz-Kurzschluss (YAGNI in CI) ·
Zusatzsatz in ADR-041 (keine Drift).

### Runde 1 · Rework-Protokoll (Implement-Runde 2)

1. **Zweiter Anker `YQ_SHA256`** (Option a) mit eigenem Fehlerpfad „Pin-Abweichung", neues
   AK7 in der Spec + zwei Testfälle; Pin-Wert per `gh run view … --log` im Volltext
   gegengeprüft; Header und Spec nennen jetzt die Grenze der Zusage.
2. **`require_linux_amd64`** vor dem ersten `fetch`, Tests stellen `uname` per PATH-Shadowing.
3. **`case "${1:-}"`-Dispatch** mit `--verify` / `-h|--help` / `""` / `*)` exit 2.
4. **Meldungs-Anker** auf `keine 'SHA-256'-Zeile`.
5. **Helper `ci_job_block <job> <file>`**, beide Bestandsstellen mitgezogen.
6. **Guardrail in CLAUDE.md + OPERATING.md**, abgesichert durch zwei Doku-Checks.

Mit erledigt: Lesbarkeits-Vorbedingungen, zweite Order-Position als
Diskriminierungs-Kontrolle, `command -v` für beide Hash-Werkzeuge, toter Fallback entfernt,
`fetch`-Wrapper mit Timeout + URL, `hex64`-Helper, PATH-Shadowing statt Proxy-Variablen,
Algorithmus als Parameter. Suite nach dem Rework: 861 grün / 0 rot (vorher 837).
