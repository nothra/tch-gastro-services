# Task 264: env-isolation-run-tests

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die vier realen (non-dry-run) `run-pipeline.sh`-Aufrufe in
`scripts/checks/tests/run-tests.sh` (`#101` Lint-Gate, `#212 AK8`, `#212 W3` × 2) erben
`PR_SHEPHERD`/`FACTORY_STAGE` aus der aufrufenden Shell, statt deterministisch aus ihrem
eigenen Setup zu entscheiden. Ist `PR_SHEPHERD=true` in der Shell exportiert, löst das
ungewollt Phase 7 (`pr-shepherd`) im Wegwerf-Testrepo aus, die dort abbricht (kein
`.claude/commands/pr-shepherd.md`) – 4 Assertionen schlagen fehl, ohne dass der aktuelle
Diff sie berührt (beobachtet in #262). Siehe `docs/specs/spec-264-env-isolation-run-tests.md`
für Recherche-Details (u. a.: `--dry-run`-Aufrufe sind nachweislich nicht betroffen).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true`/`FACTORY_STAGE=3` exportiert WHEN
      der `#212 AK8`-Block läuft THEN bleiben alle Assertions grün (Phase 7 wird nicht
      ungewollt ausgelöst).
- [x] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true`/`FACTORY_STAGE=3` exportiert WHEN
      der `#212 W3`-Block (Negativ-Fall) läuft THEN bleiben die vier zugehörigen Assertions
      identisch zum unbelasteten Fall.
- [x] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true`/`FACTORY_STAGE=3` exportiert WHEN
      der `#212 W3`-Block (Positiv-Gegenprobe) läuft THEN erscheint weiterhin das
      Erfolgs-Banner.
- [x] GIVEN die aufrufende Shell hat `PR_SHEPHERD=true` exportiert WHEN der
      `#101`-Lint-Gate-Block läuft THEN bleibt das Ergebnis unverändert.
- [x] GIVEN irgendein realer `run-pipeline.sh`-Aufruf WHEN der Code gelesen wird THEN
      neutralisiert er `PR_SHEPHERD`/`FACTORY_STAGE` explizit für den Kindprozess (z. B.
      `env -u PR_SHEPHERD -u FACTORY_STAGE`).
- [x] GIVEN ein neuer Regressionstest, der die Env-Isolation verhaltensbasiert beweist WHEN
      er ohne die Härtung liefe THEN würde er rot ausschlagen (keine Tautologie).
- [x] _(ergänzt in der Umsetzung)_ GIVEN der Drift-Guard WHEN an irgendeiner realen
      Aufrufstelle `env -u` fehlt (beliebige Schreibweise) THEN wird die Suite rot, während
      `--dry-run`-Aufrufe und Lese-Kontexte sie grün lassen.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**Nicht-ADR 2026-08-03:** Env-Isolation der vier `run-pipeline.sh`-Testaufrufe gegen
`PR_SHEPHERD`/`FACTORY_STAGE` – bewusst kein ADR (Begründung: geprüft gegen die vier
ADR-Trigger-Kategorien aus Spec-002/ADR-002 – keine Technologiewahl, kein
Architekturmuster-Wechsel, kein neuer/geänderter Schnittstellen-Vertrag, keine
irreversible Konsequenz. Reine, lokal reversible Test-Infrastruktur-Härtung innerhalb
einer bestehenden Datei, kein Produktionscode betroffen).

**Implementierungs-Hinweise für `/implement`:**

1. **Muster je Aufrufstelle:** An jeder der vier realen `run-pipeline.sh`-Aufrufstellen in
   `scripts/checks/tests/run-tests.sh` das aufgerufene Kommando um
   `env -u PR_SHEPHERD -u FACTORY_STAGE` ergänzen – die bestehenden Env-Var-Zuweisungen
   (z. B. `FACTORY_LINT_COMMAND=...`, `PATH=...`) bleiben unverändert davor stehen, `env`
   übernimmt sie automatisch mit in den Kindprozess:
   ```bash
   # vorher:
   g101_out=$(cd "$TMP_G101" && PATH="$TMP_G101/bin:$PATH" \
     FACTORY_LINT_COMMAND="touch '$MARKER_G101'; false" \
     bash "$TMP_G101/scripts/run-pipeline.sh" 101 2>&1 || true)
   # nachher:
   g101_out=$(cd "$TMP_G101" && PATH="$TMP_G101/bin:$PATH" \
     FACTORY_LINT_COMMAND="touch '$MARKER_G101'; false" \
     env -u PR_SHEPHERD -u FACTORY_STAGE \
     bash "$TMP_G101/scripts/run-pipeline.sh" 101 2>&1 || true)
   ```
   Betroffene Zeilen (Stand Requirements-Phase, siehe Spec-Tabelle): ~2624–2626 (`#101`),
   ~3395–3397 (`#212 AK8`), ~3440–3442 und ~3452–3454 (`#212 W3`, Negativ- und Positiv-Fall).
   Kurzer WHY-Kommentar an jeder Stelle (Verweis auf #264), kein Duplikat des Spec-Texts.
2. **Kein Helper nötig** (s. offene Frage unten, jetzt entschieden): vier Stellen mit je
   unterschiedlichem Env-Var-Umfeld – eine Funktion müsste variable Zusatz-Zuweisungen
   durchreichen und würde die Aufrufstelle nicht lesbarer machen. Inline ist hier weniger
   Indirektion, nicht mehr Duplikation (nur ein wiederholtes Flag-Paar).
3. **Regressionstest (AC „keine Tautologie"):** Neuer Abschnitt direkt nach dem `#212 W3`-
   Block (nach Zeile ~3461, vor der `#212 AK9`-Überschrift), der die Positiv-Gegenprobe aus
   `#212 W3` **erneut** ausführt – diesmal mit `PR_SHEPHERD=true` und `FACTORY_STAGE=3` in der
   Shell des Testrunners **exportiert** (`export PR_SHEPHERD=true FACTORY_STAGE=3` direkt vor
   dem Aufruf, `unset PR_SHEPHERD FACTORY_STAGE` direkt danach, damit nachfolgende Blöcke in
   `run-tests.sh` nicht kontaminiert werden). Assertion: weiterhin Exit 0 +
   „Pipeline erfolgreich abgeschlossen". Das ist die divergenzerzeugende Aktion, die vor der
   Härtung tatsächlich rot ausschlägt (`lessons/testing.md` „Positions-/Zustand-Freeze-Test
   braucht eine echte divergenzerzeugende Aktion" – ohne `export` vorher wäre der Test blind).
   Kann das bestehende `$TMP_E2E`-Scaffold aus dem Positiv-Fall wiederverwenden (neuer
   `git push`, kein neuer Setup-Block nötig), oder ein eigenes kleines Scaffold aufsetzen,
   falls das Original-Scaffold in der vorherigen Assertion bereits final committet/aufgeräumt
   wurde – Detail für `/implement`.
4. **Verifikation der Härtung selbst:** Vor dem finalen Commit einmal manuell
   `PR_SHEPHERD=true FACTORY_STAGE=3 bash scripts/checks/tests/run-tests.sh` laufen lassen
   (oder gezielt die vier betroffenen Blöcke), um zu bestätigen, dass keine der vier
   Aufrufstellen mehr auf die exportierten Variablen reagiert.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine offenen Fragen mehr – Inline-Ansatz entschieden (s. Technische Notizen)._

## Implementierungs-Notizen (`/implement`, 2026-08-03)

**Umgesetzt:** Alle vier realen `run-pipeline.sh`-Aufrufe in `scripts/checks/tests/run-tests.sh`
tragen jetzt `env -u PR_SHEPHERD -u FACTORY_STAGE` samt kurzem WHY-Kommentar (`#101`,
`#212 AK8`, `#212 W3` Negativ- und Positiv-Fall) – inline, wie in den technischen Notizen
entschieden. Der neue `#264`-Block hängt als fünfte, ebenfalls gehärtete Aufrufstelle direkt an
der Positiv-Gegenprobe und nutzt deren `$TMP_E2E`-Scaffold weiter (dritter Lauf ist idempotent:
`verify_final_state` wertet nur getrackte Änderungen aus, die Wegwerf-Läufe schreiben nur
untrackte Dateien).

**Abweichung vom Notiz-Vorschlag (bewusst):** Statt `export …` vor und `unset …` nach dem Aufruf
im Runner-Kontext steht der Export **innerhalb der Kommando-Substitutions-Subshell**
(`$(cd … && export PR_SHEPHERD=true FACTORY_STAGE=3 && … )`). Semantisch identisch (die Shell,
die `run-pipeline.sh` aufruft, hat die Variablen exportiert), aber ohne die Nebenwirkung des
`unset`: Ein pauschales `unset` hätte auch eine **vom Aufrufer geerbte** Variable verschluckt und
damit für alle nachfolgenden Blöcke maskiert, ob dort ein künftig hinzugefügter, ungehärteter
Aufruf auf sie reagiert – also genau die Detektierbarkeit zerstört, deren Fehlen zu #262 führte.

**Verifikation (Red → Green, in einer real kontaminierten Shell):**
- Ausgangslage: `PR_SHEPHERD=true` war in der Session-Shell exportiert → Baseline
  `786 grün / 4 rot`, exakt die vier `#212 W3`-Assertionen aus #262 (Symptom live reproduziert).
- Nach der Härtung: `794 grün / 0 rot` in derselben Shell → AC1–AC4 verhaltensbasiert erfüllt.
- Nicht-Tautologie (AC6): `env -u` am `#264`-Aufruf kurzzeitig entfernt → `790 grün / 4 rot`
  (alle vier neuen Assertionen), danach wiederhergestellt → wieder `794 grün / 0 rot`. Zweimal
  durchgeführt (vor und nach dem Subshell-Umbau).
- Portabilität: `env -u` ist POSIX und lief hier real unter macOS/BSD; GNU-coreutils in CI
  unterstützt dasselbe Flag (Fehlerszenario der Spec damit adressiert).

## Rework nach Review-Runde 1 (`/implement`, 2026-08-03)

Alle Findings aus `tasks/review-264.md` abgearbeitet:

- **K1 (Lesson-Drift):** `docs/factory/lessons/factory-workflow.md` – Überschrift von „Härtung
  ausgelagert: #264" auf „Härtung umgesetzt in #264" umgestellt und den Schlusssatz („ist als
  eigenes Issue getrackt, nicht Teil der Task") durch einen **Stand**-Absatz ersetzt: Härtung
  umgesetzt, Diagnose-Regel gilt weiter für andere Skripte mit eigenen Env-Schaltern. Index-Zeile
  in `docs/factory/PROJECT-CONTEXT.md` analog nachgezogen. Beide Korrekturen sind gegen ein
  stilles Zurückdrehen abgesichert (Negativ- + Positiv-`grep -qF`, Muster wie #224 AK7 / #240 AK8;
  Testphrasen bewusst je auf einer Zeile, Lesson #240/#249).
- **W1 (falsche WHY-Kommentare):** Die Kommentare an `#101` und `#212 AK8` behaupteten einen
  Phase-7-Abbruch, der dort nachweislich nie erreicht wird (`#101` stoppt am Lint-Gate, `#212 AK8`
  in Phase 1 am Interrupt-Sentinel). Beide nennen jetzt den tatsächlichen Grund
  (Konsistenz-Härtung/Prophylaxe) und verweisen für den real beobachteten Vektor auf den
  `#212 W3`-Block. Die Kommentare an den beiden W3-Stellen bleiben unverändert – dort stimmt die
  Kausalkette.
- **W2 (Abdeckung nur einer von fünf Aufrufstellen):** Auflösung (a) aus dem Review – neuer
  Drift-Guard-Abschnitt `#264 Drift-Guard` in `run-tests.sh`. Er liest `run-tests.sh` selbst,
  fügt per `awk` zuerst die `\`-Fortsetzungszeilen zur logischen Kommandozeile zusammen
  (Multi-Zeilen-Konstrukt → Blockextraktion statt Fragment-Grep, Lesson #114/#255/#261/#265) und
  verlangt für jeden realen (non-`--dry-run`) `run-pipeline.sh`-Aufruf ein
  `env -u PR_SHEPHERD -u FACTORY_STAGE`. Abgesichert durch Positiv-Kontrolle (ungehärteter
  Aufruf → erkannt), zwei Negativ-Kontrollen (gehärteter Multi-Zeilen-Aufruf; `--dry-run`-Aufruf
  ohne `env -u` bleibt erlaubt) und eine Nicht-Vakuitäts-Untergrenze (≥5 reale Aufrufstellen
  gefunden). Untergrenze statt exakter Zahl, damit eine künftige **gehärtete** sechste Stelle den
  Guard nicht rot macht. Kein neues Issue nötig – die Lücke ist geschlossen statt verschoben.
- **N1–N3 (Nitpicks):** „beides beweist" auf „zusätzlicher Positiv-Beleg (kein zweiter
  unabhängiger Beweis)" entschärft; die Idempotenz-Kopplung des dritten `$TMP_E2E`-Laufs an den
  Endzustand der Gegenprobe im Kommentar explizit gemacht; `e2e_env`/`e2e_env_rc` →
  `e2e_dirty_env`/`e2e_dirty_env_rc` umbenannt.

**Verifikation dieser Runde:**
- Volle Suite: `803 grün / 0 rot` (vorher 794 Assertionen; +9 aus Drift-Guard und
  Lesson-Regressionsschutz).
- Rot-Beleg für den Drift-Guard am **realen** Ziel (nicht nur gegen Fixtures): `env -u` an der
  `#101`-Aufrufstelle entfernt → `802 grün / 1 rot`, genau die Guard-Assertion
  „ALLE realen run-pipeline.sh-Aufrufe … tragen env -u". Danach zurückgebaut → wieder
  `803 grün / 0 rot`. Damit ist belegt, dass der Guard die vom Verhaltenstest **nicht** gedeckten
  vier Aufrufstellen tatsächlich absichert.

## Rework nach Review-Runde 2 (`/implement`, 2026-08-03)

Beide wichtigen Findings und alle drei Nitpicks aus `tasks/review-264.md` (Runde 2) abgearbeitet.

- **W1 (Guard-Reichweite):** Auflösung (b) aus dem Review – die Erkennung ist von einem Literal
  auf eine **Positions-Regel** umgestellt. Der Guard sucht die Pipeline-Referenz in
  Ausführungs-Position: als Dateiname **oder** als Pfad-Variable (`$PIPELINE`, `$PIPELINE214`,
  `$MUT_PIPELINE` – Muster `[$][{]?[A-Za-z_0-9]*PIPELINE…`), quotiert wie unquotiert, hinter
  `bash`/`sh` (inkl. Flags) wie direkt ausgeführt (Referenz in Kommando-Position, nur
  Env-Zuweisungen davor). Lese-Kontexte (`cp "$PIPELINE" …`, `grep … "$PIPELINE"`, Zuweisung,
  Kommentar) fallen **strukturell** heraus, weil die Referenz dort nicht in Kommando-Position
  steht – bewusst kein gepflegter Ausschluss-Katalog, der beim nächsten `sed`-Aufruf veraltet.
  Kontrollen von 3 auf 8 erweitert: vier Positiv-Kontrollen (literal / Pfad-Variable /
  unquotiert / ohne `bash`-Präfix) und vier Negativ-Kontrollen (gehärtet mehrzeilig / gehärtet
  über Pfad-Variable / `--dry-run` / `cp`+`grep`+Zuweisung). Die Reichweiten-Grenze steht jetzt
  im Kommentar: der Guard deckt nur **direkte** Aufrufe ab; der transitive Weg über
  `factory-poll.sh` ist derzeit kein Leck (Stub + `factory-poll.sh` liest die Variablen nicht).
- **W2 (Spec-Drift):** `docs/specs/spec-264-…md` nachgezogen – Kontext-Tabelle nennt die durch
  den Regressionstest entstandene **fünfte** Aufrufstelle („ergänzt in der Umsetzung"), Scope
  spricht von *jedem* realen Aufruf statt von „den vier" und beschreibt den Drift-Guard als
  eigenständiges Artefakt inkl. Reichweiten-Grenze; ein siebtes AK trägt die Guard-Invariante
  nach (spiegelbildlich auch in dieser Task-Datei). Damit ist die Untergrenze `>= 5` im Guard
  gegen die Spec herleitbar.
- **N1:** `unhardened_pipeline_calls` → `audit_pipeline_calls` (die Funktion gibt `OK` *und*
  `MISSING` aus, der Nicht-Vakuitäts-Zähler liest beides – der alte Name log).
- **N2:** Kommentar nennt jetzt explizit, dass die kanonische **Flag-Reihenfolge** erzwungen
  wird und die semantisch gleichwertige Umkehrung bewusst als MISSING gilt (Fehlalarm statt Leck).
- **N3:** Der `#264 K1`-Doku-Regressionsblock hat eine eigene `echo`-Überschrift und erscheint
  nicht mehr unter der Drift-Guard-Überschrift.

**Verifikation dieser Runde:**
- Volle Suite: `808 grün / 0 rot` (vorher 803; +5 aus den neuen Guard-Kontrollen).
- **Rot-Beleg für die neue Reichweite am realen Ziel** (nicht nur gegen Fixtures): ein toter,
  nie ausgeführter `bash "$PIPELINE" 1`-Aufruf (`if false; then …`) temporär in `run-tests.sh`
  eingefügt → `807 grün / 1 rot`, genau die Guard-Assertion „ALLE realen run-pipeline.sh-Aufrufe
  … tragen env -u". Damit ist belegt, dass die vom alten Literal-Muster übersehene
  Pfad-Variablen-Form jetzt erkannt wird. Danach zurückgebaut.
- **Exakte Zählprobe** im selben Lauf: Untergrenze temporär auf `-eq 6` gezogen → grün, d. h.
  der Guard erkennt im sauberen Stand genau **5** reale Aufrufstellen (keine Über- oder
  Untererkennung durch das breitere Muster). Danach zurück auf `>= 5`.
- **Literale Form gegengeprüft:** `env -u` an der `#101`-Aufrufstelle entfernt →
  `807 grün / 1 rot` (dieselbe Guard-Assertion), danach wiederhergestellt → wieder
  `808 grün / 0 rot`.
- **Nicht wiederholt:** der Gesamtlauf aus einer real kontaminierten Shell
  (`PR_SHEPHERD=true FACTORY_STAGE=3 bash …/run-tests.sh`) – die Env-Var-Präfix-Form ist in
  dieser Session nicht freigegeben. Kein Verlust: diese Runde ändert nur das Erkennungsmuster
  des Guards, keine der fünf Aufrufstellen und kein Laufzeitverhalten; der Beleg aus Runde 1
  gilt unverändert, und der `#264`-Verhaltenstest exportiert beide Variablen ohnehin in jedem
  Lauf innerhalb seiner eigenen Subshell (in beiden grünen Läufen oben enthalten).

## Review-Findings
<!-- Wird durch /review befüllt -->

**Runde 1 (`tasks/review-264.md`, NEEDS_REWORK):** 1 kritisches, 2 wichtige, 3 Nitpick-Findings –
alle behoben, siehe „Rework nach Review-Runde 1".

**Runde 2 (`tasks/review-264.md`, NEEDS_REWORK):** 0 kritische, 2 wichtige, 3 Nitpick-Findings –
alle behoben, siehe „Rework nach Review-Runde 2".

**Runde 3 (`tasks/review-264.md`, APPROVED mit Auflage):** 0 kritische, 1 wichtiges,
3 Nitpick-Findings. Alle sieben AK erfüllt; die Kernbehauptung des Drift-Guards wurde in dieser
Runde unabhängig nachgerechnet (alle 63 `run-pipeline.sh`-Vorkommen klassifiziert → genau
5 reale Aufrufstellen, alle gehärtet, keine in einer nicht erfassten Schreibweise).

**Offene Auflage (vor `/pr-shepherd` mitzunehmen, kein Rework-Zyklus – Circuit Breaker
Iteration 3/3):** Die Begründung der Dry-Run-Ausnahme ist an zwei Stellen sachlich falsch
(`run-tests.sh:3603–3604`, `spec-264-…md:34–35`): `run_skill()` kehrt **nicht** vor der
`PR_SHEPHERD`-Verzweigung zurück – die Verzweigung liegt außerhalb (`run-pipeline.sh:483`) und
wird auch im Dry-Run betreten; `run_skill` bricht dort nur nicht ab (Rückkehr vor dem
`skill_file`-Check). Folge: Dry-Run-Ausgabe hängt weiterhin an der Env der aufrufenden Shell
(3 Zusatzzeilen + andere Schlusszeile), heute ohne Assertion daran. Korrektur = 2 Prosa-Stellen,
keine Verhaltens-/Guard-Änderung.

**Auflage erledigt (`/test`, 2026-08-03):** Beide Prosa-Stellen auf den tatsächlichen Grund
umgestellt (Phase 7 wird auch im Dry-Run betreten, `run_skill` kehrt lediglich vor dem
`skill_file`-Check ohne Abbruch zurück; Ausnahme bleibt bewusst fail-open, da keine
Dry-Run-Assertion an den betroffenen Zeilen hängt) – keine Code-/Guard-Änderung, wie vom Review
gefordert. Finding in `tasks/review-264.md` abgehakt. Volle Suite danach erneut grün:
**808 grün / 0 rot** (unverändert zur Implementierungsphase – reiner Prosa-Fix ohne
Verhaltensänderung, kein neuer Testfall nötig). `scripts/checks/pre-commit.sh` (Lint) grün.

## Refactoring-Notizen (`/refactor`, 2026-08-03)

**Ergebnis: keine Code-Änderung.** Geprüft gegen die Refactoring-Checkliste (Naming, SRP,
Funktionslänge, Verschachtelung, Duplikation, Magic Numbers, Kommentar-Qualität) – ausschließlich
`scripts/checks/tests/run-tests.sh` ist der einzige geänderte Code (restliche Diff-Dateien sind
Doku/Task/Spec/Review-Artefakte, kein Refactoring-Ziel):

- Naming konsistent mit bestehenden Helpern im selben File (`drift_guard`,
  `extract_verdict_header`, `extract_section_headers`); `audit_pipeline_calls` wurde bereits in
  Review-Runde 2 von `unhardened_pipeline_calls` umbenannt.
- Die sieben Positiv-/Negativ-Kontrollblöcke um `audit_pipeline_calls` wirken auf den ersten Blick
  wie Duplikation, folgen aber demselben Ein-Assertion-pro-Fall-Idiom, das im restlichen File
  durchgängig verwendet wird (z. B. die `#224`/`#240`-Kontrollen weiter oben) – eine Extraktion
  würde hier Indirektion statt Klarheit bringen und der Testing-Standard verlangt ohnehin je
  separierbaren Teil eine eigene Assertion.
- Keine Magic Numbers/Strings ohne Erklärung, keine tiefe Verschachtelung, keine
  auskommentierten Code-Blöcke; alle Kommentare erklären WHY (Herkunfts-Issue + Begründung), nicht
  WHAT.
- Der bereits mehrfach reviewte Stand (3 Review-Runden + 1 Auflage) zeigte keine offenen
  Struktur-Findings mehr – zusätzliches Refactoring hätte nur Risiko ohne Nutzen eingebracht
  (Persona-Regel „bei Zweifel: lieber nicht refactoren als riskieren").

**Verifikation:** Volle Suite unverändert grün, `808 grün / 0 rot` (identisch zum Stand nach der
Auflagen-Erledigung in `/test`) – keine Datei geändert, keine Regression möglich.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `test/264-env-isolation-run-tests`
Erstellt: 2026-08-03 00:02
