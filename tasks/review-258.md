# Review: Task 258

**Runde 3** (nach dem Rework aus Runde 2 – Historie am Ende der Datei).
Diff-Scope: `git diff origin/main...HEAD` (9 Dateien: `scripts/install-yq.sh` (neu),
`scripts/checks/tests/run-tests.sh`, `.github/workflows/factory-ci.yml`,
`.github/workflows/factory-poll.yml`, `CLAUDE.md`, `docs/factory/OPERATING.md`, Spec, Task-Datei,
Review-Datei).
Self-Test-Suite lokal ausgeführt: **864 grün / 0 rot** – die im Task-File genannte Zahl ist damit
reproduziert. Drei Runden: Backend/Logik · Code-Qualität · Architektur/Patterns.

Beide wichtigen Findings aus Runde 2 sind **verifiziert behoben** – per Mutation nachgeprüft
statt der Rework-Notiz geglaubt:

| Runde-2-Finding | Nachprüfung in Runde 3 |
|---|---|
| Repo-Pin nicht am Produktionsaufruf gekoppelt | Guard `run-tests.sh:4289-4291` ankert an `^verify_sha256 "` und verlangt `"$YQ_SHA256"` als letztes Argument. **Mutation ausgeführt** (viertes Argument → Fremdvariable): **863 grün / 1 rot**, genau die zugehörige Assertion – kein Kollateral-Rot, kein stilles Grün. Die in Runde 2 benannte gefährliche Refactor-Klasse ist damit abgedeckt. |
| Veraltete CLI-Signatur in der technischen Notiz | `task-258…md:46-52` sagt jetzt „Drei Modi" und `--verify <binary> <checksums> <order> <sha256>` (vier Argumente), konsistent mit `usage()` (`install-yq.sh:56-62`) und dem `case`-Dispatch (`:163-187`). Die gleiche Drift in der Spec-Frage (`spec-258…md:122`) ist mit abgehakt. |

Ebenfalls nachgeprüft: URL↔`YQ_VERSION`-Kopplung (`run-tests.sh:4297`), Meldung im
Argumentzahl-Fehlerpfad (`install-yq.sh:167-171` + Assertion `run-tests.sh:4501`), entschärfter
`verify_sha256`-Kommentar (`:104-108`). Arbeitsbaum nach allen Mutationen wieder clean
(`git status --porcelain` leer).

## Kritische Findings (müssen behoben werden)

_Keine._ Der Seam ist fachlich korrekt, an jedem Pfad fail-closed, in CI real belegt
(Run 30811969232, 875 grün) und alle sieben Akzeptanzkriterien sind durch Verhaltenstests
gedeckt (Tabelle unten).

## Wichtige Findings (sollten behoben werden)

- [ ] `scripts/checks/tests/run-tests.sh:4320-4321` — **Der AK4-Regressions-Guard „Job hat keinen eigenen wget+chmod-yq-Block mehr" ist ein Ein-Zeilen-Fragment-Grep gegen ein Konstrukt, das in seiner echten Form über zwei Zeilen läuft – und hängt deshalb allein an einer literalen `chmod`-Schreibweise.** Das Muster ist `grep -qE 'wget.*yq_linux_amd64|chmod \+x /usr/local/bin/yq'`. Die erste Alternative kann **nie** feuern: in dem Block, den #258 entfernt hat, stehen `wget` und `yq_linux_amd64` auf *verschiedenen* Zeilen (`sudo wget -qO /usr/local/bin/yq \` + Zeilenumbruch + URL) – nachprüfbar im Diff von `factory-ci.yml`. Es trägt also einzig die zweite Alternative, und die verlangt exakt `chmod +x /usr/local/bin/yq`. **Mutation ausgeführt:** den entfernten Block wortgleich wieder in `config-validation` eingesetzt, nur mit **gepinnter** URL (`releases/download/v4.53.3/…`) und `chmod 0755` statt `chmod +x` – Suite bleibt **864 grün / 0 rot**. Dieselbe Mutation mit `chmod +x` → 1 rot; der Guard unterscheidet also nicht „kopierter Download-Block" von „`chmod`-Flag anders geschrieben". Fehlerszenario: genau der Fall, den die in diesem PR **neu geschriebene** Regel `CLAUDE.md:153-159` ausdrücklich verbietet („**kein** eigener `wget`/`curl`+`chmod`-Block, **auch nicht mit gepinnter URL**"), läuft ungehindert an allen 864 Assertions vorbei – der Seam bleibt daneben stehen und ist grün, das ungeprüfte Binary überschreibt ihn danach. Kodifizierte Klasse, dritter Rückfall: „Reihenfolge-/Präsenz-Guards: Anker ist die exakte Aufruf-Zeile, nie ein Kommando-Fragment; bei Multi-Zeilen-Konstrukten Block-Extraktion statt Fragment-Grep" (#114/#265/#261). Fix (eine Zeile, deckt zusätzlich einen künftigen **vierten** Job ab, den die `for`-Schleife oben nicht kennt): repo-weiter Präsenz-Guard statt Fragment-Grep – `! grep -rq 'mikefarah/yq/releases' .github/`. Der Download-URL-Bestand ist dafür geprüft: repo-weit existiert genau **eine** solche URL, in `install-yq.sh:194` (`grep -rn mikefarah` → sonst nur Doku/Spec/Task/Kommentar). Der Job-Block-Grep kann daneben stehen bleiben, sollte dann aber auf `wget|curl` im Block prüfen statt auf eine URL-Fragment-Kombination, die nie matcht.

## Nitpicks (optional)

- [ ] `scripts/install-yq.sh:64-75` vs. `:155-158` — Asymmetrische Werkzeug-Prüfung, gegen die eigene Begründung im File: `sha256_of` prüft **beide** Hash-Werkzeuge per `command -v` und begründet das ausdrücklich („damit auch das Fehlen eines Hash-Werkzeugs eine eigene Meldung trägt statt eines nackten `shasum: command not found`"). `fetch` prüft `wget` nicht – fehlt es, liefert der `||`-Zweig „Download fehlgeschlagen: `<url>`", also eine **falsche Ursache** (Netzwerk statt fehlendes Werkzeug) für einen Fall, den der Nachbar-Helper explizit besser behandeln wollte. Praktisch folgenlos (ubuntu-latest hat wget), aber genau die Klasse „neue Verfügbarkeitsprüfung gegen die schon vorhandene im selben File abgleichen" (#224). Zwei Zeilen.
- [ ] `scripts/install-yq.sh:74` — Der Pfad „kein SHA-256-Werkzeug gefunden" ist der einzige der elf Fehlerpfade **ohne** Test. Er ist mit dem etablierten PATH-Shadowing auch nicht erreichbar: Shadowing kann ein Kommando ersetzen, nicht entfernen – nötig wäre ein kuratierter `PATH`, der `awk`/`grep` behält und `sha256sum`/`shasum` verliert. Geringer Wert (der Zweig ist in CI wie auf macOS praktisch unerreichbar), aber die Notiz „10 von 10 Negativfällen mit pfadspezifischem Anker" im Task-File zählt Fehler**meldungen**, nicht Tests – die Meldung existiert, der Test nicht.
- [ ] `scripts/install-yq.sh:14-15` + `CLAUDE.md:153-159` + `docs/factory/OPERATING.md:434-436` + `scripts/checks/tests/run-tests.sh:4312` — Die drei betroffenen Jobs sind an **vier** Stellen namentlich aufgezählt (Skript-Header, beide Doku-Stellen, Test-Schleife). Braucht ein fünfter Job künftig `yq`, driftet die Prosa und die Test-Schleife prüft ihn nicht (Lesson #207 „Zähl-/Aufzählungs-nennender Header beim Hinzufügen einer Einheit mitpflegen"). Der repo-weite Guard aus dem wichtigen Finding oben nimmt der Aufzählung wenigstens die Gate-Verantwortung – die Prosa bleibt Pflege-Aufgabe.
- [ ] `scripts/checks/tests/run-tests.sh:68-73` — **Übernommen aus Runde 2, weiterhin offen** (bewusst dem `/refactor`-Schritt überlassen): `hex64` steht bei den generischen Helfern am Dateikopf, hat aber genau **einen** Nutzungsort ~4200 Zeilen weiter unten (den #258-Fixture-Block); `ci_job_block` daneben hat drei Nutzer und gehört dort hin. Kein Fehler, ein Platzierungs-Delta. Einordnung bestätigt.
- [ ] Aus Runde 1/2 bewusst offen gelassen und weiterhin gültig eingeordnet (keine erneute Bewertung): tautologisches `[ ! -x … ]` in den Positiv-Fixtures (die Fixture-Datei wird per `: >` erzeugt, war also nie ausführbar) · Least-Privilege-Split des `sudo`-Umfangs · fehlender Idempotenz-Kurzschluss · Zusatzsatz in ADR-041. Die Begründungen tragen; der `sudo`-Umfang ist gegenüber `main` nachweislich keine Verschlechterung (dort lief `wget` als root und schrieb direkt nach `/usr/local/bin`).

## Akzeptanzkriterien

| AK | Status | Beleg (Runde 3 nachgeprüft) |
|----|--------|------|
| AK1 Versions-Pin, kein `releases/latest` | erfüllt | `YQ_VERSION="v4.53.3"` (`install-yq.sh:39`) → `BASE_URL` (`:194`); Guards `run-tests.sh:4279-4297`, jetzt **inkl.** Kopplung URL↔Konstante (`grep -qF 'releases/download/$YQ_VERSION'`) – die Einschränkung aus Runde 2 ist geschlossen. Lesbarkeits-Vorbedingung für den negierten Grep vorhanden (`:4273-4277`). |
| AK2 SHA-256-Verifikation vor `chmod +x` | erfüllt | `verify_sha256` (`:200`) vor `chmod 0755` (`:204`); Reihenfolge-Guard an den echten Aufruf-Zeilen. Spaltenherleitung mit **zwei** Order-Positionen getestet (Zeile 3 und Zeile 1) → hartkodierte Spalte fällt auf. |
| AK3 Mismatch → Exit ≠ 0, kein `chmod` | erfüllt | Fixture-Test + Meldungs-Assertion `Checksum-Mismatch`; `chmod` liegt strukturell hinter der Verifikation, Guard siehe AK2. |
| AK4 alle drei Jobs rufen denselben Seam | **erfüllt, Regressions-Guard lückenhaft** | Positiv-Seite solide: job-block-isolierte Tests über `ci_job_block` für alle drei Jobs, plus YAML-Parse-Check (wo yq da ist). Die **Negativ**-Seite („kein eigener Block mehr") ist per Mutation als umgehbar belegt → wichtiges Finding oben. Der Ist-Zustand des PR erfüllt AK4. |
| AK5 Positiv-Fixture, netzwerkfrei | erfüllt | Exit 0 + `verifiziert`-Meldung; Netzwerkfreiheit deterministisch über wget/curl-PATH-Stub belegt (`! grep NETZWERK-STUB`). |
| AK6 eigener Negativ-Testfall | erfüllt | Genau ein Defekt in der Fixture (korrupte Binary), pfadspezifische Meldung assertiert. |
| AK7 Pin-Abweichung eigener Fehlerpfad | erfüllt | Verhalten + unterscheidbare Meldung `Pin-Abweichung` getestet **und** – neu in Runde 3 – die **Verdrahtung** der Konstante in den Produktionsaufruf (Mutation: 1 rot). Die Lücke aus Runde 2 ist geschlossen. |

Fehlerszenarien der Spec: (1) Download-/Teil-Download-Fehler – eigene Meldung inkl. URL,
`--timeout=30 --tries=3` (`fetch`, `:155-158`); der Netzwerkpfad selbst bleibt offline nicht
testbar, konsistent mit der Spec. (2) Fehlender `checksums`-Eintrag – eigener Pfad + Test.
(3) Fehlende `SHA-256`-Zeile – eigener Pfad + pfadspezifischer Test-Anker. Zusätzlich abgedeckt:
verkürzte Zielzeile (Format-Drift), nicht lesbare Datei, unvollständige `--verify`-Argumente,
unbekanntes Argument, `--help`, fremde Plattform (OS **und** Architektur getrennt).

## Architektur / Patterns

- **Keine Schicht-/ADR-Verletzung.** Der Seam liegt richtig (`scripts/`, `bash`-aufgerufen,
  Modus 644 ohne Executable-Bit – identisch zu `install-hooks.sh`, per `git ls-files -s`
  geprüft), CI ruft ihn als einzigen Bereitstellungsweg. ADR-009 („yq ist Prerequisite ohne
  Fallback") bleibt gültig; ADR-042 („Hook-Installation single source") bekommt mit #258 ein
  konsistentes Geschwister-Muster.
- **Kein ADR nötig** (Begründung aus Runde 1 unverändert tragfähig: kein konkurrierendes
  Verfahren, keine verworfene Technologie-Alternative, reversibel). Die dauerhafte Konvention
  ist in **geladener** Doku verankert (CLAUDE.md §Guardrails + OPERATING.md §5.4) – das war das
  eigentliche Anliegen.
- **Routen-Doku:** nicht betroffen – der Diff enthält keine `app/**`-Datei; `docs/routes.md`
  korrekt unverändert (#145).
- **Format-Gate:** `.prettierignore` deckt `scripts/` **und** `.github/` – die Behauptung im
  Task-File ist geprüft und stimmt.
- **Stil-Konsistenz:** `ci_job_block` bleibt die einzige Kopie des awk-Programms im File
  (`grep -c 'f=1; next'` → 1); `assert_true "$([[ $rc -ne 0 ]]; echo $?)"` ist das etablierte
  Suite-Idiom für Nicht-Null-Exits, korrekt übernommen. Die lokale
  `GREEN`/`RED`/`NC`+`fail()`-Definition ist das Repo-Muster (11 Skripte) – kein Finding.

## Out-of-Scope-Findings (eigene Issues)

- **#283** (aus Runde 1, weiterhin offen) — `docs/adr/009-factory-configuration.md:68-69,187`
  beschreibt im Präsens ein `factory-selftest`-Image + `ci/factory-selftest.Dockerfile`
  (`git ls-files ci/` ist leer), und ADR-009:76 verlangt yq in den README-Voraussetzungen, wo es
  nicht steht. Vorbestehende Drift, nicht von diesem PR verursacht. Der Plattform-Guard verweist
  Entwickler auf den Paketmanager – der passende Ort für diesen Hinweis ist die
  README-Voraussetzungsliste aus #283, nicht dieser PR.

Keine neuen Out-of-Scope-Funde in Runde 3. Das wichtige Finding und die Nitpicks liegen alle
**im** Scope dieses PR (Dateien, die er selbst anlegt bzw. ändert).

## Positives

- **Der Kopplungs-Guard aus Runde 2 ist nicht nur eingebaut, sondern diskriminierend.** Die
  Mutation, die Runde 2 als „gefährlich, weil Self-Test **und** CI grün bleiben" beschrieben
  hatte, ist jetzt reproduzierbar rot – und zwar mit genau einer Assertion, ohne Kollateral.
  Der Anker liegt an der echten Aufruf-Zeile (`^verify_sha256 "`) statt auf einer
  Prosa-Erwähnung, Lesson #114 korrekt angewandt.
- **Die Diskriminierung wurde vom Implement-Schritt selbst per Mutation belegt**, nicht behauptet
  („861 grün / 3 rot, kein Kollateral-Rot; nach dem Rückbau 864 / 0"). Das ist die
  Beweisführung, die das Review sonst erst erzwingen muss – hier stand sie schon im Protokoll
  und ließ sich unabhängig reproduzieren.
- **Der letzte Fehlerpfad ohne eigene Meldung ist geschlossen.** `--verify` mit falscher
  Argumentzahl benennt jetzt, *was* fehlt, inklusive der erhaltenen Anzahl – und der Test
  assertiert die Meldung statt nur `exit 2`. Damit gilt die selbst formulierte Designregel
  ausnahmslos, statt eine dokumentierte Ausnahme zu behalten.
- **Zwei Nitpicks wurden bewusst NICHT „behoben", sondern richtig eingeordnet.** Der
  `YQ_HASH_ALGO`-Kommentar sagt jetzt ehrlich, *warum* der Algorithmusname global bleibt
  (konstant; rotiert wird nur seine Position, und die kommt aus der Fixture) – statt die
  Asymmetrie durch einen Parameter zu kaschieren, der nichts prüft. Und `hex64` bleibt dem
  `/refactor`-Schritt überlassen. Beides ist die schwerere Entscheidung.
- **Beide Anker sauber getrennt, inklusive der Grenze der Zusage.** Der Header sagt explizit,
  dass der Pin ein Trust-on-First-Use-Anker ist und **keine** Publisher-Identität prüft; die
  Spec sagt dasselbe. Der Pin-Wert wurde per `gh run view … --log` im Volltext geholt (nicht aus
  der gekürzten Notiz rekonstruiert) und ist empirisch belegt: bei falschem Pin wäre der
  Nachtest fail-closed rot („Pin-Abweichung"), nicht still grün.
- **Der beobachtete CI-Flake ist als Umgebungsproblem eingeordnet – mit Beleg statt Behauptung.**
  Derselbe Lauf hatte den Download in einem anderen Job erfolgreich; die Fehlermeldung nannte die
  URL, deshalb war die Ursache sofort sichtbar. Der Seam hat sich fail-closed verhalten, und die
  offene Härtung (drei Netzwerk-Downloads pro Job) ist als eigener Scope benannt statt
  stillschweigend mitgenommen zu werden.
- **Plattform-Guard mit deterministischem Test.** `uname` per PATH-Shadowing macht den Guard auf
  jeder Maschine prüfbar; der wget/curl-Stub bleibt daneben im PATH, sodass ein entfallener Guard
  nicht das lokale `/usr/local/bin/yq` clobbert, sondern laut am Stub abbricht – Testbarkeit
  **und** Schadensbegrenzung im Testaufbau.
- **Netzwerkfreiheit vom Versprechen zum Beweis** (lautes wget/curl-Stub statt Proxy-Variablen),
  **Spaltenrotation mit zweiter Fixture-Position** als echte Diskriminierungs-Kontrolle,
  **jeder Negativfall mit genau EINEM Defekt** und pfadspezifischem Meldungs-Anker.
- **Regel dort, wo Agenten sie sehen** (CLAUDE.md + OPERATING.md statt nur Skript-Header), mit
  Begründung und Generalisierung auf weitere Fremd-Binaries – der Teil, der den nächsten
  kopierten `wget`-Block verhindert. Dass der *Test* dazu eine Lücke hat, ändert nichts am Wert
  der Regel selbst.

## Empfehlung

APPROVED — mit einer **verbindlichen Übergabe an `/test`** (siehe unten).

Begründung: keine kritischen Findings; alle sieben Akzeptanzkriterien sind im Ist-Zustand
erfüllt und durch Verhaltenstests gedeckt; beide Runde-2-Findings sind per Mutation als behoben
belegt; die Substanz ist in CI real bestätigt (Run 30811969232, 875 grün). Das eine wichtige
Finding ist **kein Defekt am gelieferten Verhalten**, sondern eine Lücke in einem
Regressions-Guard: der PR selbst enthält keinen kopierten Download-Block – der Guard würde nur
einen künftigen wieder eingeschleppten Block nicht bemerken.

> **Circuit Breaker:** Dies ist Review-Iteration **3 von 3**. Ein `NEEDS_REWORK` würde
> Implement-Runde 4 und Review-Runde 4 auslösen und damit die Grenze aus CLAUDE.md
> („max. 3 Review↔Implement-Iterationen") überschreiten. Runde 2 hatte eine dritte Runde
> ausdrücklich für unnötig erklärt, falls beide Findings umgesetzt sind – sie sind es. Das
> verbleibende Finding ist inhaltlich eine **Testabdeckungs-Lücke** und damit im
> nachfolgenden `/test`-Schritt korrekt aufgehoben.

**Übergabe an `/test` (nicht optional, nicht stillschweigend fallen lassen):** Den
AK4-Regressions-Guard (`run-tests.sh:4320-4321`) durch einen repo-weiten Präsenz-Guard ergänzen
(`! grep -rq 'mikefarah/yq/releases' .github/`) und mit **beiden** Mutationen belegen –
kopierter Block mit gepinnter URL + `chmod 0755` (muss rot werden; ist heute grün) und der
Ist-Zustand (muss grün bleiben). Fällt das im `/test`-Schritt aus, gehört es als eigenes Issue
angelegt, nicht abgehakt.

---

## Historie: Runde 2 (2026-08-03)

> Verdict damals: NEEDS_REWORK (zwei wichtige Findings, keine kritischen). Beide sind behoben und
> in Runde 3 per Mutation nachgeprüft (Tabelle oben). Suite damals: 861 grün / 0 rot.

### Runde 2 · wichtige Punkte (beide behoben)

1. `run-tests.sh` — Der in Runde 1 nachgerüstete Repo-Pin `YQ_SHA256` war **nicht an den
   Produktionspfad gekoppelt**: geprüft war nur die Existenz der Konstante (`grep -qE
   '^YQ_SHA256="[0-9a-f]{64}"$'`), nicht ihre Verdrahtung an `verify_sha256`. Mutation auf
   `000…0` ließ die Suite grün. Gefährlich war dabei nicht das Löschen des Arguments (`set -u`
   fängt das), sondern ein Refactor, der stattdessen den aus `checksums` gelesenen Wert
   übergibt: dann ist `published = pinned` trivial wahr, der Supply-Chain-Anker ist lautlos weg,
   und **beide** Signale bleiben grün (Self-Test wie CI, weil ein ehrlicher Download zu seinem
   eigenen Hash passt). Klasse #212/#214.
2. `task-258…md` — Die technische Notiz beschrieb die CLI im Präsens falsch („Zwei Modi",
   `--verify` mit drei Argumenten), obwohl der Dispatch vier Zweige hat und `--verify` vier
   Argumente nimmt. Wer der Notiz folgte, landete bei Usage + Exit 2. Klasse #211/#176.

### Runde 2 · Nitpicks

Erledigt: Spec-Checkbox-Drift bei der CLI-Frage · fehlende Kopplung URL↔`YQ_VERSION` ·
`--verify`-Argumentzahl-Pfad ohne eigene Meldung · Kommentar, der mehr Isolation versprach als
`verify_sha256` hat. Offen (bewusst, → `/refactor`): `hex64`-Platzierung.

### Runde 2 · Rework-Protokoll (Implement-Runde 3)

Kopplungs-Guard am echten Aufruf (`^verify_sha256 "` + `"$YQ_SHA256"` als letztes Argument) ·
CLI-Signatur in Task-Datei und Spec nachgezogen · `grep -qF 'releases/download/$YQ_VERSION'` ·
eigene Meldung „--verify braucht vier Argumente …" + Meldungs-Assertion · `verify_sha256`
-Kommentar entschärft. Diskriminierung aller drei neuen Guards per Mutation belegt
(861 grün / 3 rot, kein Kollateral; nach Rückbau 864 / 0).

---

## Historie: Runde 1 (2026-08-03)

> Verdict damals: NEEDS_REWORK. Alle sechs damals wichtigen Punkte sind behoben und in Runde 2
> nachgeprüft. Der Volltext bleibt als Nachweis-Spur stehen.

### Runde 1 · kritische Punkte

_Keine._ Die zentrale Sorge „`fail()` ruft `exit 1` innerhalb einer Command-Substitution,
beendet also nur die Subshell" wurde empirisch entkräftet: `set -e` greift auf der
**Zuweisung** → Abbruch mit Exit 1, kein Weiterlaufen mit leerem Erwartungswert.

### Runde 1 · wichtige Punkte (alle behoben)

1. `install-yq.sh` — Der Erwartungswert stammte aus demselben ungeprüften Kanal wie das
   Artefakt; WHY-Kommentar und Spec versprachen mehr, als die Mechanik leistete. Nur die
   Versionsnummer war gepinnt, kein kryptografischer Anker.
2. `install-yq.sh` — Kein OS-/Arch-Guard, dafür ein unbedingtes `mv` nach `/usr/local/bin/yq`:
   ein macOS-Aufruf hätte erfolgreich verifiziert und das funktionierende `yq` mit einem
   Linux-Binary überschrieben, auffällig erst nach dem Clobbern.
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
Zusatzsatz in ADR-041.

### Runde 1 · Rework-Protokoll (Implement-Runde 2)

Zweiter Anker `YQ_SHA256` mit eigenem Fehlerpfad „Pin-Abweichung" + neues AK7 ·
`require_linux_amd64` vor dem ersten `fetch` · `case "${1:-}"`-Dispatch · Meldungs-Anker auf
`keine 'SHA-256'-Zeile` · Helper `ci_job_block` (beide Bestandsstellen mitgezogen) · Guardrail in
CLAUDE.md + OPERATING.md. Suite nach dem Rework: 861 grün / 0 rot (vorher 837).
