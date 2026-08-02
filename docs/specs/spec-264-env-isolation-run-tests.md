# Spec: Env-Isolation gegen `PR_SHEPHERD`/`FACTORY_STAGE`-Leck in `run-tests.sh`

## Kontext

Ist in der Shell, aus der `scripts/checks/tests/run-tests.sh` gestartet wird, `PR_SHEPHERD=true`
und/oder `FACTORY_STAGE=3` **exportiert** (z. B. weil zuvor `PR_SHEPHERD=true bash
scripts/run-pipeline.sh <id>` per `export` statt per Kommando-Präfix gestartet wurde, oder weil
eine Session diese Variablen aus einem Elternprozess erbt), schlägt `PR_SHEPHERD` in jedes
Wegwerf-Repo durch, das ein Testblock via `bash .../run-pipeline.sh <id>` **real** (nicht
`--dry-run`) startet. `run-pipeline.sh` prüft `PR_SHEPHERD` nur über `${PR_SHEPHERD:-false}`
(Zeilen 484/504/513/522) – eine geerbte Variable ist von einer bewusst gesetzten nicht zu
unterscheiden. Betroffen ist konkret Phase 7 (`pr-shepherd`): sie startet ungewollt, findet im
Wegwerf-Repo kein `.claude/commands/pr-shepherd.md` und bricht mit
„Skill-Datei nicht gefunden" ab, bevor die eigentlich geprüfte Endzustands-Verifikation greift.

**Beobachtet in #262** (Flag-Guard commit-message): dort wiederholt als vermeintlicher
Regressions-Fehlschlag aufgetreten (4 rote Assertions im `#212 W3`-Block), tatsächlich aber
umgebungsbedingt – belegt durch Reproduktion gegen unveränderten `origin/main` und einen
vollständig grünen Lauf nach `unset PR_SHEPHERD`. Bereits als Lesson dokumentiert in
`docs/factory/lessons/factory-workflow.md` (Abschnitt „`PR_SHEPHERD`/`FACTORY_STAGE` in der
aufrufenden Shell exportiert …") und `docs/factory/PROJECT-CONTEXT.md` (Index-Zeile). Diese Spec
trägt die dort als offen benannte Härtung nach.

**Rechercheergebnis dieser Requirements-Phase:** `FACTORY_STAGE` wird im gesamten Repo nirgends
außerhalb des lokalen Kommando-Präfixes `FACTORY_STAGE=3 claude --print …` (in `run_skill()`,
`scripts/run-pipeline.sh:253`) gelesen. Ein Kommando-Präfix setzt die Variable ausschließlich für
den einen Aufruf und überschreibt dabei jeden geerbten Wert – eine von außen exportierte
`FACTORY_STAGE` kann diesen Aufruf also nicht beeinflussen. Der real wirksame Leck-Vektor ist
`PR_SHEPHERD` (gelesen via `${PR_SHEPHERD:-false}`, kein überschreibender Kommando-Präfix davor).
`FACTORY_STAGE` wird dennoch in derselben Härtung mit-neutralisiert: die Lesson nennt beide
Variablen als beobachtetes Leck-Paar, und eine Neutralisierung ohne Wirkung ist hier no-op statt
Risiko – konsistent mit „fail-closed, im Zweifel ablehnen" aus den Bash-Gotchas-Guidelines.

Ebenfalls Ergebnis dieser Phase: **`--dry-run`-Aufrufe brechen nicht ab.** Die
`PR_SHEPHERD`-Verzweigung (Phase 7) liegt außerhalb von `run_skill()`, in `run-pipeline.sh`
selbst, und wird auch im Dry-Run betreten; `run_skill()` gibt bei `DRY_RUN=true` lediglich
**vor** dem `skill_file`-Existenz-Check zurück, ohne abzubrechen. Ein geerbtes `PR_SHEPHERD=true`
ändert im Dry-Run also nur die Ausgabe (drei zusätzliche Zeilen + andere Schlusszeile), ohne dass
etwas fehlschlägt – keine bestehende Dry-Run-Assertion hängt an diesen Zeilen. Die Ausnahme der
`--dry-run`-Aufrufe von der Härtung bleibt deshalb bewusst fail-open, statt zusätzlich elf
Aufrufstellen mitzuhärten (Review-Runde-3-Auflage, #264). Von den in `run-tests.sh` **vorgefundenen**
`run-pipeline.sh`-Aufrufen sind **vier real** (non-dry-run) und damit potenziell betroffen:

| Zeile(n)    | Block                                             |
|-------------|----------------------------------------------------|
| ~2624–2626  | `#101` Lint-Gate (non-dry-run, rotes Gate)          |
| ~3395–3397  | `#212 AK8` Interrupt-Sentinel end-to-end            |
| ~3440–3442  | `#212 W3` Verifikations-Interrupt (Negativ-Fall)    |
| ~3452–3454  | `#212 W3` Verifikations-Interrupt (Positiv-Gegenprobe) |
| _(neu)_     | `#264` Regressionstest – s. „Ergänzt in der Umsetzung" |

**Ergänzt in der Umsetzung:** Der unten geforderte Regressionstest ist selbst ein **fünfter
realer Aufruf** (dritter Lauf gegen dasselbe `#212 W3`-Scaffold) und wird identisch gehärtet.
Die Lieferung umfasst damit **fünf** gehärtete Aufrufstellen, nicht vier – überall dort, wo
diese Spec „die vier Aufrufstellen" sagt, ist „jede reale Aufrufstelle" gemeint.

Der `#101`-Block bricht zwar bereits vorher am Lint-Gate ab (vor Phase 7 erreichbar wäre), wird
aber aus Konsistenzgründen in dieselbe Härtung einbezogen – ein Testblock soll grundsätzlich
nicht von der Env der aufrufenden Shell abhängen, unabhängig davon, ob der aktuelle Ablauf die
Abhängigkeit gerade auslöst.

## Scope

**Inbegriffen:**
- **Jeder** reale `run-pipeline.sh`-Aufruf in `scripts/checks/tests/run-tests.sh` – die vier
  oben genannten **und** der in dieser Task neu hinzukommende – neutralisiert `PR_SHEPHERD`
  und `FACTORY_STAGE` explizit für den gestarteten Kindprozess (z. B.
  `env -u PR_SHEPHERD -u FACTORY_STAGE …`), unabhängig davon, ob diese Variablen in der
  aufrufenden Shell gesetzt sind.
- Ein neuer Regressionstest in `run-tests.sh`, der die Env-Isolation **verhaltensbasiert**
  beweist: exportiert `PR_SHEPHERD=true` und `FACTORY_STAGE=3` innerhalb des Testlaufs, führt
  einen der gehärteten Blöcke (Positiv-Fall, sauber+gepusht) real aus und prüft, dass das
  Ergebnis identisch zum unbelasteten Fall bleibt (Erfolgs-Banner, kein Phase-7-Fehlschlag) –
  nicht nur ein struktureller Grep auf `env -u`.
- Kurzer Code-Kommentar an jeder gehärteten Aufrufstelle, der auf den Leck-Vektor und
  dieses Issue verweist (WHY, nicht WHAT – analog zu bestehenden Kommentaren im selben Block).
- **Ergänzt in der Umsetzung – Drift-Guard in `run-tests.sh`:** ein struktureller Test, der
  `run-tests.sh` selbst liest und für **jede** reale (non-`--dry-run`) Aufrufstelle die
  Neutralisierung verlangt. Grund: Der Verhaltenstest oben hängt an genau **einer** der fünf
  Aufrufstellen – ohne den Guard bliebe die Suite grün, wenn `env -u` an einer der anderen
  entfernt oder eine neue ungehärtete Stelle hinzugefügt würde (genau die stille
  Regressionsklasse, die zu #262 geführt hat). Der Guard erkennt die Pipeline-Referenz in
  Ausführungs-Position – als Dateiname wie als Pfad-Variable (`$PIPELINE`), quotiert wie
  unquotiert, hinter `bash`/`sh` wie direkt ausgeführt – und deckt direkte Aufrufe aus
  `run-tests.sh` ab (nicht den transitiven Weg über `factory-poll.sh`, der aktuell gegen einen
  Stub läuft und die Variablen nicht liest).

**Nicht inbegriffen:**
- Keine Änderung an den `--dry-run`-Aufrufen von `run-pipeline.sh` in `run-tests.sh` – belegt
  unbetroffen (s. Kontext). Wird als Rechercheergebnis dokumentiert, keine Code-Änderung.
- Keine Änderung an `scripts/run-pipeline.sh` selbst (z. B. ein eigenständiges Neutralisieren
  von `PR_SHEPHERD`/`FACTORY_STAGE` beim Skript-Start) – das Skript soll die Variable weiterhin
  aus der Umgebung lesen können (bewusstes Feature für reale Pipeline-Läufe, ADR-Bezug: keiner,
  reines Testverhalten). Die Härtung betrifft ausschließlich die Test-Aufrufstellen.
- Keine Änderung an anderen Env-Variablen (`CLAUDE_MODEL`, `FACTORY_LINT_COMMAND` etc.) – nur
  `PR_SHEPHERD`/`FACTORY_STAGE`, wie im Issue benannt.
- Keine Suche nach direkten Skill-Aufrufen (`.claude/commands/*.md` ohne `run-pipeline.sh`) in
  `run-tests.sh` – es gibt aktuell keine; nur `run-pipeline.sh`-Aufrufe sind der Vektor.

## Akzeptanzkriterien

- [ ] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true` und `FACTORY_STAGE=3` exportiert WHEN
      der `#212 AK8`-Block (Interrupt-Sentinel end-to-end) läuft THEN bleiben alle Assertions
      dieses Blocks grün (Phase 7 wird nicht ungewollt ausgelöst).
- [ ] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true` und `FACTORY_STAGE=3` exportiert WHEN
      der `#212 W3`-Block (Negativ-Fall: ungepushter Commit) läuft THEN bleiben die vier
      zugehörigen Assertions identisch zum unbelasteten Fall (Non-Zero-Exit durch
      Endzustands-Verifikation, nicht durch Phase 7).
- [ ] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true` und `FACTORY_STAGE=3` exportiert WHEN
      der `#212 W3`-Block (Positiv-Gegenprobe: sauber+gepusht) läuft THEN erscheint weiterhin
      das Erfolgs-Banner (kein Fehlschlag durch Phase 7 im Wegwerf-Repo).
- [ ] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true` exportiert WHEN der `#101`-Lint-Gate-
      Block läuft THEN bleibt das Ergebnis unverändert (Lint-Gate-Fehlschlag bleibt der
      beobachtete Grund).
- [ ] GIVEN irgendein realer `run-pipeline.sh`-Aufruf in `run-tests.sh` WHEN der Code
      gelesen wird THEN neutralisiert er `PR_SHEPHERD` und `FACTORY_STAGE` explizit für den
      gestarteten Kindprozess (z. B. `env -u PR_SHEPHERD -u FACTORY_STAGE`), erkennbar am Code
      selbst – nicht nur implizit durch das Testergebnis.
- [ ] GIVEN der neue Regressionstest aus dem Scope-Abschnitt WHEN er ohne die Härtung liefe
      (Referenz: Verhalten vor dieser Task) THEN würde er rot ausschlagen – der Test beweist
      damit tatsächlich die Env-Isolation und ist keine Tautologie (Beleg in der
      Implementierungs-/Review-Phase, z. B. durch kurzzeitiges Rückgängigmachen der Härtung).
- [ ] _(ergänzt in der Umsetzung)_ GIVEN der Drift-Guard aus dem Scope-Abschnitt WHEN in
      `run-tests.sh` an **irgendeiner** realen Aufrufstelle `env -u` fehlt – an einer
      bestehenden entfernt oder als neue Aufrufstelle hinzugefügt, in beliebiger Schreibweise
      (Dateiname oder Pfad-Variable, quotiert oder nicht, mit oder ohne `bash`-Präfix) – THEN
      wird die Suite rot, während `--dry-run`-Aufrufe und Lese-Kontexte (`cp`/`grep`/
      Zuweisung) auf dieselbe Referenz sie grün lassen.

## Fehlerszenarien

- [ ] `env -u` ist auf der CI-Plattform nicht verfügbar oder verhält sich abweichend → als
      Teil der Implementierung gegen die tatsächliche CI-Umgebung (GNU/Linux) verifizieren;
      `env -u VAR` ist POSIX-Standardverhalten und in Bash/Coreutils auf macOS wie Linux
      identisch, daher kein erwartetes Risiko, aber Teil des Portabilitäts-Guidelines-Checks
      (`docs/factory/guidelines/clean-code.md` → Portabilität in Gate-/Shell-Skripten).

## Offene Fragen

- [ ] Implementierungsdetail (kann in `/implement` entschieden werden, keine ADR nötig): eigene
      kleine Helper-Funktion (z. B. `run_pipeline_env_clean`) für die vier Aufrufstellen vs.
      `env -u PR_SHEPHERD -u FACTORY_STAGE` direkt inline an jeder Stelle. Bei nur vier
      Aufrufstellen mit unterschiedlichem Umfeld (unterschiedliche zusätzliche Env-Vars, PATH-
      Präfixe) ist inline tendenziell einfacher zu lesen (kein Umweg über eine Funktion, die
      variable zusätzliche Env-Var-Zuweisungen weiterreichen müsste) – Empfehlung: inline.

---
Bezug: Issue #264 (aus #262, Review-Runde-1-Finding W5, out of scope für #262).
