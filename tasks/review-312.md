# Review: Task 312

Grundlage: `git diff origin/main...HEAD` (10 Dateien, +1268/−65),
`docs/specs/spec-312-verdict-konsum-frische-pruefung.md`,
`tasks/task-312-verdict-konsum-frische-pruefung.md`, ADR-019 §4.

**Runde 3** – Anlass ist der Commit `fece557` (AK12-`NEEDS_FIXES`-Richtung am unmutierten Gate +
Doku-Entdopplung in ADR-019/OPERATING.md) aus dem Rework der Runde 2. Er ist reine Test- und
Doku-Änderung; Produktionscode ist seit `b2e211b` unverändert. Verlauf der Runden 1 und 2 steht
unten unter „Historie".

Gate-Nachlauf in dieser Session: `unset PR_SHEPHERD FACTORY_STAGE` + volle Bash-Suite
(`scripts/checks/tests/run-tests.sh`) → **1203 grün, 0 rot**, Exit 0 (Lesson #262/#264);
`git status` sauber (die Wegwerf-Skripte liegen unter `scripts/*.tmp.*` und sind gitignored).

> **Circuit Breaker:** Dies ist die **dritte und damit letzte** Review-Anwendung
> (CLAUDE.md: „max. 3 Review↔Implement-Iterationen, dann eskalieren"). Es liegt **kein**
> ungelöster Konflikt vor – die Findings der Runden 1 und 2 sind umgesetzt und in dieser Runde
> nachgeprüft. Der eine offene Punkt unten ist ein **neuer** Fund am nachgezogenen Stand, und
> zwar an einer Zeile, die der Rework der Runde 1 selbst geschrieben hat. Er ist textlich
> (Kommentar + ein Assertion-Label), ändert kein Verhalten und braucht keine vierte
> Implement-Runde im Sinne des Breakers – siehe „Empfehlung".

## Kritische Findings (müssen behoben werden)

_Keine._ Guard, Gate-Polarität und Retry-Semantik sind in dieser Runde erneut gegen den Code
geprüft, nicht gegen die Task-Notizen:

- **Symmetrie hält per Konstruktion.** `run-pipeline.sh:279-341`: Exit-Code wird `set -e`-sicher
  eingesammelt, **beide** Rückkehrpfade laufen durch denselben `report_is_fresh_and_valid`-Aufruf
  (`:310`) mit demselben Snapshot (`:273`, weiterhin genau einmal oberhalb der Retry-Schleife).
  `:318` ist der einzige `return 0` für report-erzeugende Skills und liegt hinter der Bedingung;
  `:340` gilt per `elif` nur für nicht report-erzeugende Skills.
- **AK5-Vorrang ist strukturell, nicht nur getestet:** `:295-297` liegt vor `:310`, und der
  Mutant belegt das per Positions-Assertion, nicht per Anzahl.
- **Gate fail-closed:** `:549-558` – Dry-Run-Ausnahme zuerst, danach passiert ausschließlich ein
  eindeutiges `PASSED`. Der `${SECURITY_VERDICT:-kein eindeutiger Verdict}`-Fallback ist trotz
  der `run_skill()`-Garantie richtig: die Spec verlangt das Gate ausdrücklich unabhängig von
  dieser Garantie (defense in depth), und der TMP_MC312-Mutant fährt genau diesen Zweig.
- **Neu in dieser Runde geprüft (Runde-2-Rework):** TMP_F312 fährt die `NEEDS_FIXES`-Richtung am
  **unmutierten** Gate mit gegenteiligem Vorbestand (Lesson #253), `assert_absent "failed after
  3 attempts"` trennt Gate-Abbruch von Retry-Abbruch, und TMP_MF312 dreht die Bedingung über den
  vorhandenen Anker auf `if false` (ersetzt statt gelöscht). Die ADR-019-Entdopplung hat die
  Information nicht verloren: der Halbsatz „nur die **Meldung** hängt noch am Exit-Code" steht
  jetzt im #312-Nachtrag Punkt 1, und beide AK13-Assertionsorte (§4-Körper, #312-Nachtrag) sind
  weiterhin gepinnt.

## Wichtige Findings (sollten behoben werden)

- [ ] **W1** `scripts/run-pipeline.sh:305-307` + `scripts/checks/tests/run-tests.sh:6256-6257` –
      Der WHY-Kommentar behauptet „Verdict **EINMAL** pro Versuch lesen … drei awk-Subprozesse
      pro Versuch sind für dieselbe Information zu viel". Das ist faktisch falsch:
      `report_is_fresh_and_valid` liest den Verdict selbst noch einmal
      (`run-pipeline.sh:233`), also **zwei** `report_verdict`-Aufrufe pro Versuch im
      report-erzeugenden Zweig. Auf dem **Exit-0-Erfolgspfad** war es vor dem Runde-1-Rework
      (`e88439f`) genau **einer** – dort hat die Änderung den Aufwand also verdoppelt und
      dokumentiert das Gegenteil; auf dem Stale-Pfad war und bleibt es zwei. Der Kommentar
      gehört damit in dieselbe Klasse wie die W-Findings der Runden 1/2 (falsche Kausalkette,
      Lesson `code-style.md` – „empirisch verifiziert ohne Prüfung").
      **Empirisch belegt** (nicht aus dem Code gelesen): die echte Hilfsfunktion per `awk` aus
      `run-pipeline.sh` extrahiert, `report_verdict` mit einem Zähler umwickelt, einen Versuch
      nachgebaut → `report_verdict`-Aufrufe pro Versuch: **2**.
      Zweite Hälfte des Findings: die pinnende Assertion
      „*run_skill() liest den Verdict genau einmal pro Versuch*" (`:6257`) zählt nur
      **textuelle** `report_verdict`-Vorkommen im per `awk` extrahierten **Rumpf von
      `run_skill()`** – die Hilfsfunktion steht außerhalb und ist für sie unsichtbar. Sie bliebe
      grün, wenn die Lib den Verdict fünfmal läse. Genau diese Blindheit hat dazu geführt, dass
      Runde 2 „der Verdict wird einmal pro Versuch gelesen" als *nachgeprüft* in die Positives
      geschrieben hat (und Runde 1 bereits „bis zu dreimal" – auch das waren drei Code**stellen**,
      von denen pro Versuch nie mehr als zwei liefen).
      **Zwei gleichwertige Fixes, beide klein:** (a) Aussage an die Realität anpassen – Kommentar
      und Assertion-Label auf das formulieren, was wirklich gilt und belegt wird („Verdict-String
      für die Meldungen **einmal materialisieren**, keine eingebettete Command Substitution im
      Meldungstext"); oder (b) die Aussage wahr machen – den bereits gelesenen `verdict` in die
      Hilfsfunktion durchreichen, sodass tatsächlich ein Aufruf pro Versuch bleibt (AK9 bleibt
      unberührt, die Bedingung behält ihren einen Ort). Variante (b) ist zusätzlich messbar
      abzusichern, sonst wiederholt sich die Blindheit der Assertion.
      **Kein Verhaltensfehler** – reine Aussage-/Beleg-Genauigkeit.

## Nitpicks (optional)

- [ ] **N1** `scripts/run-pipeline.sh:507-509` – Der Phase-2-Kommentar beschreibt
      „Fehlender/uneindeutiger Anker → nicht bestanden → Rework-Loop (fail-closed)" weiter als
      **lebende** Mechanik. Seit #312 kann `run_skill()` nicht mehr mit leerem Verdict
      zurückkehren; der Fall ist per Konstruktion unerreichbar (die Prüfung selbst bleibt zu
      Recht als defense in depth stehen). Es ist der vierte Ort derselben Prosa – ADR-019 §4,
      die Lesson, OPERATING.md und der Lib-Modul-Header sind nachgezogen, dieser In-Code-Satz
      nicht (#211/#176-Muster).
- [ ] **N2** `scripts/run-pipeline.sh:312` und `:339` – das Erfolgsmeldungs-Literal
      `✓ /${skill} abgeschlossen` steht jetzt zweimal (vor dem Fix einmal). Eine Änderung am
      Text muss an zwei Stellen erfolgen; kein Test ankert daran, der Drift bliebe also stumm.
- [ ] **N3** `scripts/checks/tests/run-tests.sh:6275-6283` (TMP_GATE_312) – zwei Punkte an
      derselben Stelle: (a) Die Mutation wird per `sed` mit **re-eskapiertem** Literal erzeugt
      (`\[ "\$SECURITY_VERDICT" != "PASSED" \]`), während der ganze übrige #312-Block dieselbe
      Zeile über `awk -v cmp="$GATE_CMP_312"` trifft – also eine zweite Schreibweise für
      denselben Anker, genau die Drift-Quelle, gegen die die gemeinsamen `*_PIPE`-Anker
      eingeführt wurden (Lesson `code-style.md`, „dritte Schreibweise"). (b) Die
      `cmp -s`-Assertion (`:6278-6280`) ist redundant: die folgende
      `! grep -qF -- "$GATE_CMP_312"`-Assertion (`:6281`) impliziert „Datei verändert" strikt –
      und es ist dasselbe schwache Idiom, das **dieser PR** beim #310-Mutanten (`:5980`) bewusst
      auf eine exakte Trefferzählung umgestellt hat.
- [ ] **N4** `scripts/run-pipeline.sh:231-235` – `report_is_fresh_and_valid` liegt im
      Pipeline-Skript, während alle drei Primitive (`report_file`/`is_report_skill`,
      `report_verdict`, `report_fingerprint`) in `scripts/lib/report-verdict.sh` stehen. Ein
      zweiter Konsument der Regel müsste sie neu komponieren. Bewusst so entschieden und in
      ADR-019 §4 (#312-Nachtrag Punkt 1) namentlich festgehalten – deshalb nur Nitpick, nicht
      Finding.
- [ ] **N5** `docs/specs/spec-312-…md:150-152` – Das Restrisiko „byte-identisch neu geschriebener
      Report gilt als stale" ist als „aus #310 übernommen" notiert. Mit #312 wandert es aber vom
      seltenen non-zero-Pfad auf **jeden** `review`/`security-review`-Aufruf: ein Skill, das
      einen inhaltsgleichen Report neu schreibt, kostet drei Heavy-Versuche und endet mit
      `exit 1`. Die Fehlrichtung bleibt fail-closed (richtig), aber die Amplifikation der
      Eintrittswahrscheinlichkeit steht nirgends – ein Halbsatz in der Spec bzw. im
      ADR-Nachtrag würde sie festhalten.

## Positives

- **Der Runde-2-Fund ist geschlossen, und zwar so, wie er gemeldet war:** TMP_F312 belegt die
  `NEEDS_FIXES`-Richtung am **unmutierten** Gate behavioral (nicht am Mutanten), mit
  divergenzerzeugendem Vorbestand (gegenteiliger Verdict, Lesson #253) und mit
  `assert_absent "failed after 3 attempts"`, das Gate-Abbruch von Retry-Abbruch trennt. Dass
  RED-vor-GREEN hier per Definition unmöglich ist (das Verhalten existierte, die Abdeckung
  fehlte), ist offen benannt und durch einen echten Mutanten ersetzt – keine stillschweigende
  Lücke.
- **N3 der Runde 2 ist die schwerere, richtige Lösung geworden:** statt den Abwesenheits-Guard
  auf ein Meldungs-/Code-Fragment umzuformulieren, zählt er jetzt Vorkommen im per `awk`
  extrahierten Funktionsrumpf, in beide Richtungen fail-closed, plus eine Assertion, die belegt,
  dass die Extraktion wirklich `run_skill()` trifft. Nachgeprüft: das `awk`-Fenster endet am
  ersten spaltenbündigen `}` – innerhalb von `run_skill()` gibt es keins. (Dass das *Label* dieser
  Assertion mehr behauptet als sie messen kann, ist W1 – die Konstruktion selbst ist gut.)
- **Die ADR-Entdopplung hat nichts verloren.** Der eingedampfte #310-Absatz verweist auf den
  #312-Nachtrag, und der zuvor nur dort stehende Halbsatz („nur die Meldung hängt am Exit-Code")
  ist mitgewandert statt zu verschwinden – der übliche Fehler bei Entdopplungen.
- **Mutationsbelege bleiben kausal:** jede Mutation trifft die **volle** echte Zeile über die
  gemeinsamen Anker (`FRESH_CMP_PIPE`/`VERDICT_CHK_PIPE`/`GUARD_CALL_PIPE`/`IC_CALL_PIPE`,
  `GATE_CMP_312`), jeder Beleg führt **dieselben** Assert-Ausdrücke aus wie der Positivtest
  (Lessons #114/#286), und die zwei Mutanten an Einzel-`if`-Rümpfen **ersetzen** statt zu löschen
  (AK5: `:`; AK12: `if false; then`) – sonst belegten sie nur einen Syntaxfehler.
- **Suite-Kosten im Blick behalten:** `bin/sleep` ist im #310-Harness gestubbt (`:5903`), die
  vier neuen Fehlversuch-Fixtures kosten deshalb keine 30 s Backoff. Nachgeprüft, nicht
  übernommen.
- **`--dry-run` mitgedacht und begründet** (`:549-551`): das umgedrehte Gate hätte jeden Dry-Run
  ab Phase 5 blockiert; die Ausnahme spiegelt ADR-040 statt das Gate zu verwässern, mit direktem
  Anker statt transitiver Absicherung.
- **Doku-Sweep vollständig:** ADR-019 §4 + #312-Nachtrag, Lesson (inkl. verschärfter Regel „auf
  allen Rückkehrpfaden"), OPERATING.md (Eigenschaften-Liste **und** §4.2, dort in der richtigen
  Leserichtung Spezialfall → Allgemeinregel), Lib-Modul-Header („VIER Funktionen" mitgepflegt),
  PROJECT-CONTEXT-Index. Eigener Gegen-Sweep in dieser Runde über `NEEDS_FIXES` /
  „Security-Gate" / „Report-Guard" in `docs/` und `.claude/`: die einzige verbleibende Fundstelle
  ist `.claude/commands/pipeline.md:39-40` – bewusst als **Issue #316** ausgelagert
  (Patch-Workflow). Historische Specs (#91/#211/#310) bleiben zu Recht unangetastet.
- Keine Routen/UI berührt → `docs/routes.md` zu Recht unverändert; keine `.claude/**`-Datei im
  Diff; kein neuer Interrupt-Typ → OPERATING.md-Interrupt-Tabelle zu Recht unberührt.

## Empfehlung

NEEDS_REWORK

Ein Punkt, textlich, ohne Verhaltensänderung: W1 (falsche Rationale im WHY-Kommentar
`run-pipeline.sh:305-307` **plus** das Label der Assertion `run-tests.sh:6257`, das eine
Laufzeit-Eigenschaft behauptet, die es nicht messen kann). Beides gehört in dieselbe
Finding-Klasse, die die Runden 1 und 2 als blockierend behandelt haben, und beides ist in
wenigen Zeilen erledigt – entweder die Aussage korrigieren oder sie wahr machen (Details im
Finding).

**Zum Circuit Breaker:** Dies ist die dritte Review-Runde, ein `NEEDS_REWORK` erreicht damit die
Grenze aus CLAUDE.md. Ein voller `/implement`-Durchlauf ist für diesen Fix nicht angemessen und
inhaltlich auch nicht nötig – kein Konflikt, keine offene Design-Frage, keine Code-Änderung.
Zwei vertretbare Wege für den Menschen:

1. **Direkt beheben** (empfohlen): Kommentar + Assertion-Label anpassen, Suite laufen lassen,
   dann ist der PR aus meiner Sicht merge-reif. Kein Review-Rundgang mehr nötig – der Fix ist
   verifizierbar ohne Urteil.
2. **Als Kleinfund merken und mergen:** W1 ist Doku-/Beleg-Drift unter zehn Zeilen und würde die
   Schwelle aus ADR-043 (`docs/factory/kleinfunde.md`) erfüllen. Dann sollte der Kommentar aber
   nicht in seiner heutigen, falschen Form stehen bleiben – mindestens der eine Satz „Verdict
   EINMAL pro Versuch lesen" ist zu streichen.

Die fünf Nitpicks sind optional; N4 ist eine bewusst dokumentierte Entscheidung, und die in
Runde 2 nach `/refactor` ausgelagerte Länge von `run_skill()` bleibt dort (ein Umbau würde die
gerade verifizierten Mutationsanker verschieben).

---

## Historie

### Runde 2 – `NEEDS_REWORK`, alle blockierenden Findings umgesetzt (Commit `fece557`)

Reviewt wurde der Stand nach `b2e211b` (Suite damals 1193 grün / 0 rot). Keine kritischen
Findings, ein wichtiges (Testlücke), fünf Nitpicks:

- **W1** AK12 verlangt beide erreichbaren Gate-Richtungen behavioral; belegt war nur `PASSED`
  und der leere Verdict am **mutierten** Skript. → Fixture TMP_F312 (Task-ID 335) auf dem
  #310-Harness + Mutant TMP_MF312 als Kausalitätsbeleg. **In dieser Runde nachgeprüft.**
- **N3** Abwesenheits-Guard auf `Verdict '$(report_verdict` koppelte Meldungstext und
  Code-Konstrukt (Fragment-Falle #114 in der Abwesenheits-Richtung). → Zählung der
  `report_verdict`-Vorkommen im `awk`-extrahierten Rumpf von `run_skill()` + Extraktions-Beleg.
  Umgesetzt; das **Label** der neuen Assertion ist jetzt Runde-3-W1.
- **N2** Dritte gleichlautende Kopie der Bedingung im #310-Nachtrag von ADR-019. → auf einen
  Verweis eingedampft, der zuvor exklusive Halbsatz in den #312-Nachtrag verschoben.
- **N5** OPERATING.md §4.2: Leserichtung Spezialfall vor Allgemeinregel wiederhergestellt.
- **Bewusst nicht umgesetzt:** `.claude/commands/pipeline.md` (Patch-Workflow, Umfang über „unter
  zehn Zeilen" → **Issue #316**) und die Länge von `run_skill()` (Kandidat für `/refactor`).

### Runde 1 – `NEEDS_REWORK`, alle Findings umgesetzt (Commit `b2e211b`)

Reviewt wurde `git diff origin/main...HEAD` (7 Dateien, +839/−56); Suite damals 1182 grün / 0 rot.
Keine kritischen Findings, zwei wichtige, fünf Nitpicks:

- **W1** `scripts/lib/report-verdict.sh:22-26` – Modul-Header beschrieb weiterhin die alte,
  einseitige Guard-Mechanik („ein non-zero Exit gilt als ERFOLG, wenn …"); dritte Kopie derselben
  Prosa, die AK13 in ADR-019 §4 und der Lesson schon nachgezogen hatte. → umgeschrieben +
  assertiert.
- **W2** `docs/factory/OPERATING.md:214` und §4.2 – kanonische Prozess-Doku nannte die alte
  Gate-Polarität („`NEEDS_FIXES` → Abbruch vor Merge"). → beide Stellen nachgezogen + assertiert.
- **N1** `report_verdict` wurde „bis zu dreimal pro Versuch" aufgerufen. → einmal in `verdict`
  gelesen, Bedingung bleibt an ihrem einen Ort (AK9 unberührt). **Nachtrag Runde 3:** sowohl die
  Ausgangsdiagnose („dreimal") als auch das Ergebnis („einmal") waren Zählungen von
  Code**stellen**, nicht von Aufrufen – tatsächlich zwei pro Versuch, siehe Runde-3-W1.
- **N2** Meldung „kein eindeutiger Verdict **im Report** dieses Aufrufs" unterstellte einen
  vorhandenen Report. → „aus diesem Aufruf".
- **N3** `[ -n "$(report_file …)" ]` als Skill-Prädikat las sich wie eine Datei-Existenz-Prüfung.
  → benanntes `is_report_skill()` in der Lib, Modul-Header „DREI" → „VIER Funktionen".
- **N4** Der #310-WHY-Satz zum bewusst fehlenden `stop_if_interrupted` im verdictlosen Zweig war
  beim Umbau verloren gegangen. → zurück.
- **N5** Kein direkter Anker für die Dry-Run-Ausnahme des Security-Gates (nur transitiv).
  → direkte Assertion.
