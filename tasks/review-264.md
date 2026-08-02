# Review: Task 264

> Review-Runde 1. Diff-Scope: `git diff origin/main...HEAD` →
> `scripts/checks/tests/run-tests.sh` (+39), `docs/specs/spec-264-…md` (neu),
> `tasks/task-264-…md` (neu).
>
> **Verifikations-Hinweis:** Ein eigener Lauf von `scripts/checks/tests/run-tests.sh`
> (sauber und env-kontaminiert) war in dieser Session nicht möglich – die Ausführung ist
> hier freigabepflichtig und wurde nicht erteilt. Alle Verhaltensaussagen unten sind daher
> statisch gegen `scripts/run-pipeline.sh` / `scripts/lib/verify-final-state.sh` belegt;
> der Red→Green-Beleg (786/4 rot → 794/0 rot, sowie 790/4 rot bei entferntem `env -u`)
> stammt aus der Implementierungsphase und wurde nicht reproduziert.

## Kritische Findings (müssen behoben werden)

- [ ] `docs/factory/lessons/factory-workflow.md:827` und `:849–852` (+ Index-Zeile in
      `docs/factory/PROJECT-CONTEXT.md`, Gruppe `lessons/factory-workflow.md`): Die Lesson
      benennt die Härtung im Präsens als **offenen, ausgelagerten Follow-up** – Überschrift
      „(aus #262, Task-Selbstfund; **Härtung ausgelagert: #264**)" und Schlusssatz „Die
      eigentliche Härtung (der E2E-Block sollte `PR_SHEPHERD`/`FACTORY_STAGE` selbst
      neutralisieren statt sie aus der Umgebung zu erben) **ist als eigenes Issue getrackt,
      nicht Teil der Task**". Genau dieser PR erledigt diesen Follow-up, die Prosa wird damit
      falsch: Ein künftiger Leser diagnostiziert nach dieser Anleitung weiter „die vier
      Aufrufstellen erben die Variablen" und sucht die Härtung im Backlog. **Begründung:**
      Verstoß gegen die kodifizierte Projektregel „Auch Lesson-/Kontext-Doku im Präsens
      beschreibt eine Mechanik / nennt einen offenen ‚Follow-up (#N)' – erledigt der PR die
      Mechanik/den Follow-up, dieselbe Prosa im selben PR nachziehen" (aus #176, erweitert
      #211; Index in `PROJECT-CONTEXT.md`). Die Diagnose-Regel („mit `unset` gegenprüfen")
      bleibt wertvoll und soll stehen bleiben – nachzuziehen ist der Erledigt-Stand
      (z. B. „Härtung umgesetzt in #264: die realen `run-pipeline.sh`-Aufrufe in
      `run-tests.sh` neutralisieren beide Variablen per `env -u`; die Regel gilt weiter für
      neue Testblöcke und für andere Skripte mit eigenen Env-Schaltern").

## Wichtige Findings (sollten behoben werden)

- [ ] `scripts/checks/tests/run-tests.sh:3398–3399` (`#212 AK8`) und `:2624–2625` (`#101`):
      Die WHY-Kommentare behaupten eine Kausalkette, die für **genau diese beiden Blöcke**
      nachweislich nicht gilt. `#101` bricht am Lint-Gate ab (`Gate fehlgeschlagen: Lint`),
      `#212 AK8` bereits in Phase 1 – der Mock-`claude` schreibt den Interrupt-Sentinel,
      `run_skill()` ruft `interrupt-check.sh … || exit $?` (`run-pipeline.sh:259`). Phase 7
      (`run-pipeline.sh:484–488`) wird in beiden Fällen nie erreicht, „bevor der geprüfte
      Pfad greift" ist bei AK8 sogar das Gegenteil des tatsächlichen Ablaufs. Die Spec sagt
      das für `#101` selbst so (`spec-264…md:46–49`: „bricht zwar bereits vorher am
      Lint-Gate ab … aus Konsistenzgründen einbezogen") – der Code-Kommentar widerspricht
      der eigenen Spec. Ein falscher WHY-Kommentar ist schlechter als keiner: Er wird beim
      nächsten Anfassen als belegte Tatsache gelesen. Formulierung an beiden Stellen auf den
      tatsächlichen Grund umstellen (Konsistenz/Prophylaxe: kein Testblock soll von der Env
      der aufrufenden Shell abhängen, auch wenn der aktuelle Ablauf vorher abbricht) und den
      real beobachteten Vektor weiterhin nur an den beiden `#212 W3`-Stellen behaupten.

- [ ] `scripts/checks/tests/run-tests.sh:3481–3494` (Abdeckung des Regressionsschutzes):
      Der neue Verhaltenstest hängt an **einer** von fünf gehärteten Aufrufstellen (der
      Positiv-Gegenprobe). Entfernt jemand `env -u` bei `#101`, `#212 AK8` oder `#212 W3`
      (Negativ-Fall), bleibt die Suite grün – genau die Klasse von stiller Regression, die
      zu #262/#264 geführt hat. Die Implementierungs-Notiz erklärt einen strukturellen
      Drift-Guard zum Gold-Plating und verweist auf „ein eigenes Issue" – **dieses Issue
      existiert nicht**. Zwei akzeptable Auflösungen: (a) billiger Präsenz-Guard in
      `run-tests.sh`, der jeden `bash …/run-pipeline.sh`-Aufruf ohne `--dry-run` auf ein
      vorangestelltes `env -u PR_SHEPHERD -u FACTORY_STAGE` prüft (Multi-Zeilen-Konstrukt →
      `awk`-Blockextraktion, nicht Fragment-Grep, Lesson aus #114/#261/#265), oder (b) Issue
      autonom anlegen und hier + in der Task-Notiz mit Nummer referenzieren. Reines
      „falls gewünscht" in der Task-Datei ist keine Nachverfolgung.

## Nitpicks (optional)

- [ ] `scripts/checks/tests/run-tests.sh:3489–3494`: Der Kommentar „**beides** beweist, dass
      das Kind `PR_SHEPHERD=false` sah" überzeichnet die zweite Assertion. Im ungehärteten
      Fall bricht die Pipeline bereits in Phase 7 ab und erreicht die
      Endzustands-Verifikation nie – `Endzustand verifiziert (sauber, gepusht)` fehlt dann
      als Folge des Abbruchs, nicht als Nachweis des git-Modus. Diskriminierend ist die
      Assertion trotzdem (bei `pr_shepherd=true` lautet der Text
      `(sauber, gepusht, PR merge-ready/gemergt)`, `run-pipeline.sh:512–514`) – nur ist sie
      ein zusätzlicher Positiv-Beleg, kein zweiter unabhängiger Beweis. Wording entschärfen.

- [ ] `scripts/checks/tests/run-tests.sh:3481`: Der `#264`-Lauf ist der dritte gegen
      `$TMP_E2E` und setzt implizit den von der Positiv-Gegenprobe hinterlassenen Endzustand
      voraus (sauber + gepusht, kein erneutes `git push` davor). Statisch ist das korrekt –
      `verify_final_state` bewertet nur getrackte Diffs (`git diff` / `--cached`) und
      `origin/<branch>..HEAD`, die Wegwerf-Läufe erzeugen nur untrackte Artefakte
      (`tasks/interrupt-log.jsonl`, Sentinel). Die Kopplung ist aber unausgesprochen: Ändert
      jemand die Gegenprobe so, dass sie den Baum verschmutzt, wird der `#264`-Block ohne
      eigene Ursache rot. Ein Halbsatz im Kommentar („nutzt den Endzustand der Gegenprobe
      weiter – idempotent, da nur untrackte Artefakte entstehen") oder ein idempotentes
      `git -C "$TMP_E2E" push -q origin "$E2E_BR"` davor macht sie explizit.

- [ ] `scripts/checks/tests/run-tests.sh:3481,3485`: `e2e_env` / `e2e_env_rc` benennen die
      Umgebung, nicht den Inhalt (Output des Laufs unter kontaminierter Env). Analog zu
      `e2e_out`/`e2e_ok` wäre `e2e_dirty_env`/`e2e_dirty_env_rc` sprechender. Rein kosmetisch.

## Positives

- **Verhaltensbeweis statt Struktur-Grep, mit echter divergenzerzeugender Aktion.** Der
  `export PR_SHEPHERD=true FACTORY_STAGE=3` **innerhalb** der Kommando-Substitutions-Subshell
  stellt exakt den in #262 beobachteten Zustand her; ohne ihn wäre der Block blind. Das setzt
  die Lessons „Positions-/Zustand-Freeze-Test braucht eine echte divergenzerzeugende Aktion"
  (#253) und „Deterministisches Gate im Orchestrator-Skript braucht E2E-Verhaltenstest, nicht
  nur Wiring-Grep" (#212) korrekt um. Der Red-Beleg (`env -u` entfernt → 4 rot) ist
  dokumentiert und zweimal durchgeführt.
- **Bewusste, gut begründete Abweichung von der Architektur-Notiz.** Statt `export …` /
  `unset …` um den Block herum lebt der Export in der Subshell – so wird eine vom Aufrufer
  geerbte Variable für nachfolgende Blöcke nicht maskiert und deren Detektierbarkeit bleibt
  erhalten. Die Begründung steht am Code und in der Task-Notiz.
- **Pfadspezifisches Negativ-Signal.** `grep -q 'Phase 7'` trifft ausschließlich die Ausgabe
  aus dem `PR_SHEPHERD`-Zweig (`run-pipeline.sh:486`, einzige Ausgabe mit diesem Text) – die
  Assertion kann nicht grün aus dem falschen Grund sein (Lesson #214).
- **Spec-Recherche gegengeprüft und korrekt:** `--dry-run` ist tatsächlich unbetroffen
  (`run_skill()` kehrt bei `DRY_RUN=true` **vor** dem `skill_file`-Existenz-Check zurück,
  `run-pipeline.sh:225–232`; die Verifikation wird bei `DRY_RUN` übersprungen, `:500–501`),
  und `FACTORY_STAGE` wird nur als überschreibendes Kommando-Präfix genutzt
  (`FACTORY_STAGE=3 claude --print …`, `:253`) – ein geerbter Wert kann dort nichts bewirken.
  Die Mit-Neutralisierung ist damit korrekt als bewusster No-op deklariert, nicht als Irrtum.
- **Vollständige Abdeckung der Aufrufstellen:** Ein Gegen-Grep über alle
  `run-pipeline.sh`-Aufrufe in `run-tests.sh` bestätigt, dass genau die vier realen
  (`:2629`, `:3403`, `:3451`, `:3465`) gehärtet sind; der einzige weitere echte Aufruf
  (`:169`) ist `--dry-run`, die übrigen Treffer sind Stub-Dateien oder Struktur-Greps.
- **Platzierung von `env -u` ist korrekt:** Die vorangestellten Zuweisungen (`PATH=…`,
  `FACTORY_*_COMMAND=…`) landen in der Umgebung von `env` und werden von dort an `bash`
  weitergereicht; kein Stub-`bin`-Verzeichnis enthält ein `env`, das die Auflösung
  überschatten könnte. `env -u` ist POSIX und auf BSD wie GNU verfügbar
  (`clean-code.md` → Portabilität).
- **`skip_yq`-Zweig mitgepflegt** (blockweise, konsistent mit der Konvention der Datei) und
  die `rm -rf`-Aufräumzeile korrekt hinter den neuen Block gezogen.
- **Kein ADR – sauber begründet:** Die Task-Notiz prüft explizit gegen die vier
  ADR-Trigger-Kategorien aus Spec-002/ADR-002. Nachvollziehbar (reine, lokal reversible
  Test-Infrastruktur-Härtung, kein Produktionscode, kein Schnittstellen-Vertrag).
- Keine Routen-Änderung → `docs/routes.md` zu Recht unberührt.

## Empfehlung

NEEDS_REWORK
