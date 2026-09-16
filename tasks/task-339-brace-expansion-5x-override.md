# Task 339: brace-expansion-5x-override

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Dritter, konditionaler `brace-expansion`-Override (4.x/5.x-Linie, Selektor
`>=4.0.0 <5.0.9`, Ziel-Range als Caret innerhalb der 5er-Linie) gegen zwei neue
High-Advisories (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895), gefunden in der Security-Review
von Task 337. Betroffen: `brace-expansion@5.0.7` im Lockfile (dev-only, via
`minimatch@10.2.5` → `@typescript-eslint/typescript-estree`). Details: Spec-339.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
Siehe [`docs/specs/spec-339-brace-expansion-5x-override.md`](../docs/specs/spec-339-brace-expansion-5x-override.md).
- [x] Dritter Override-Eintrag in `pnpm-workspace.yaml` (`brace-expansion@>=4.0.0 <5.0.9` → Caret-Range)
- [x] Keine aufgelöste `brace-expansion`-4.x/5.x-Kopie unter 5.0.9 im Lockfile
- [x] No-op-Kriterium gemessen (Override entfernen, neu auflösen, tatsächliche Version dokumentieren)
- [x] Floor-Guard in `scripts/checks/tests/run-tests.sh` (`floor_cases_291`) erweitert – drei neue
      Fälle (Major 5 messend, Major 4 und Major 3 als Vorsorge; Begründung unten)
- [x] Bestehende 1.x/2.x-Overrides und -Guards unverändert
- [x] Pre-Push-Checks (Lint, Tests, Typecheck, Format) grün

## Technische Notizen

**Messungen (nicht vermutet):**
- Registry-Stand zum Implementierungszeitpunkt: höchste 5er-Patch = `5.0.12`, Floor der beiden
  Advisories = `5.0.9` → Ziel-Range `^5.0.9`.
- **No-op-Kriterium, beide Methoden gemessen – mit unterschiedlichem Ergebnis** (korrigiert in
  der Review-Rework-Runde; zuvor stand hier pauschal „kein No-op", gestützt nur auf das
  Alt-Lockfile):
  - *Gegen das bestehende Lockfile: kein No-op.* Dort war `brace-expansion@5.0.7`
    festgeschrieben (zwei Snapshot-Schlüssel, Kante an `minimatch@10.2.5`) – unter beiden
    Floors. Der Eintrag hat sie auf `5.0.12` gehoben; ohne ihn hätte `--frozen-lockfile` die
    `5.0.7` behalten.
  - *Gegen eine Frisch-Auflösung ohne Alt-Lockfile: doch ein No-op.* Kanonische Methode aus
    `lessons/build-tooling.md` nachgeholt – Wegwerf-Projekt mit genau
    `{"minimatch":"10.2.5"}` + `pnpm install --lockfile-only --ignore-workspace`, ohne jeden
    Override: aufgelöst `5.0.12` (zwei Schlüssel), also über dem Floor.
  - *Trotzdem nötig, und nicht der nanoid-Fall:* nanoid gilt als No-op, weil sein Konsument eine
    Range deklariert, deren **Untergrenze** den Floor schon erfüllt (`^3.3.17`). Hier liegt die
    von `minimatch@10.2.5` deklarierte Untergrenze `^5.0.5` **unter** dem Floor `5.0.9` (in
    `node_modules/.pnpm/minimatch@10.2.5/.../package.json` geprüft) – der Eintrag ist damit die
    einzige durable Zusicherung `>= 5.0.9`.
  - Lockfile-Diff bewegt genau eine Version (`5.0.7 → 5.0.12`, drei Stellen); mit ihr ändert
    sich zusätzlich das `engines`-Feld des Pakets (`node: 18 || 20 || >=22` → `20 || >=22`) –
    folgenlos, weil das Projekt `">=24"` fordert und CI auf Node 24 läuft.
- Volle Advisory-Liste per GitHub-Advisory-API gegengeprüft (Lesson `build-tooling.md`, #231/#337):
  `GHSA-rgw5-rvv9-x895` trägt vier Range-Gruppen (`<1.1.18`, `>=2.0.0 <2.1.4`,
  `>=3.0.0 <3.0.6`, `>=4.0.0 <5.0.9`), `GHSA-mh99-v99m-4gvg` deren Vorläufer-Floors.
  Die untere Schranke `>=4.0.0` (statt `>=5.0.0`) folgt daraus, dass die 4er-Linie keinen
  eigenen Fix hat, sondern in der 5er-Linie gepatcht wird.

**Spec-AK4 auf das gemessene Verhalten nachgezogen:** Die Spec nannte „einen dritten
`brace-expansion`-Fall (Major `4`, Floor `5.0.9`), der … real anschlägt". Ein solcher Einzelfall
hätte die real aufgelöste `5.0.7` **nie gesehen** – `lock_versions_291` filtert je Major-Linie
(`grep "^  <paket>@<major>\."`). Im RED-Lauf war der Major-4-Fall prompt grün, während erst der
Major-5-Fall anschlug (`gefunden: 5.0.7`). Eingetragen sind daher **zwei** Fälle (Major 4 und
Major 5, beide Floor `5.0.9`) für den einen Selektor. In der Rework-Runde ist nicht nur die
Begründung notiert, sondern **AK4 selbst korrigiert** – Lesson #253: widerspricht der
Test-Beweis der Spec-Formulierung, gewinnt das getestete Verhalten und die Spec wird nachgezogen
(eine Task-Notiz erfüllt das nicht, sie begründet nur).

**Zweck der nicht-messenden Fälle explizit gemacht:** Der Major-4-Fall (und der neue Major-3-Fall)
kann heute nichts finden – `minimatch@10.2.5` deklariert `^5.0.5` und zieht damit nie eine
4.x-Kopie, und im Lockfile existiert überhaupt kein 4.x-/3.x-Parent (geprüft: nur `1.1.18`,
`2.1.4`, `5.0.12`). Beide sind **Vorsorge** gegen ein künftiges Hereinziehen; das steht jetzt im
Herkunftsfeld und im Kommentar über der Tabelle, damit eine Fehlermeldung nicht eine falsche
Herkunft („via minimatch@10") behauptet.

**Zusätzliche Assertion für AK1:** Der projektweite Konditionalitäts-Guard prüft nur die
**obere** Schranke, der Caret-Guard nur die Ziel-Range – ein versehentliches
`brace-expansion@<5.0.9` (das auch 1.x/2.x über die Major-Grenze höbe) käme dort unauffällig
durch. Deshalb eine exakte Zeilen-Assertion analog zu den 1.x/2.x-Pendants, plus Mutationsbeleg:
mit der mutierten Selektor-Zeile war genau diese eine Assertion rot, der Konditionalitäts-Guard
blieb grün – die behauptete Blindheit ist gemessen, nicht angenommen.

**3.x-Linie: kein Selektor, aber jetzt ein Floor-Fall.** `brace-expansion` pflegt parallel eine
3er-Linie mit eigenen Floors (`3.0.6` / `3.0.3`, per Advisory-API bestätigt) und veröffentlicht
dort weiter (dist-tag `3.x = 3.0.9`). Der Baum löst heute keine 3.x-Kopie auf, deshalb weiterhin
**kein** vierter Override-Selektor. Die 3er-Linie war damit aber die einzige Lücke, die von
*keinem* Mechanismus gedeckt war: eine hypothetische `3.0.1` matcht keinen der drei Selektoren
(`<1.1.18` ✗, `>=2.0.0 <2.1.4` ✗, `>=4.0.0 <5.0.9` ✗) und hätte auch keinen Floor-Fall
angeschlagen. In der Rework-Runde ergänzt: eine Tabellenzeile
`brace-expansion|3|3.0.6|…` – symmetrisch zur Major-4-Vorsorge und heute grün. Damit ist die
Bewertung beider Linien wieder ableitbar (vorher: für Major 4 Vorsorge angelegt, für Major 3 mit
identischer Tatsachenlage nicht).

**Mutationsbeleg für den neuen Major-3-Fall:** dieselbe Extraktions-/Vergleichskette
(`lock_versions_291` → `version_below_291` → `versions_below_floor_291`, per `awk` aus
`run-tests.sh` extrahiert und gesourct) gegen eine Fixture mit `brace-expansion@3.0.1:` meldet
genau `3.0.1`; gegen das echte Lockfile bleibt sie leer. Der Fall ist also grün aus dem richtigen
Grund und würde bei einem Hereinziehen rot – nicht bloß dekorativ.

**Keine UI-Berührung:** reine Dependency-/Gate-Änderung, kein `app/`-Diff → keine
Oberflächentests und keine Routen-Doku-Pflege nötig (Routen-Drift-Check lief grün).

**Gates:** `bash scripts/checks/pre-push.sh` vollständig grün (Lint, 803 Vitest-Tests,
Typecheck, Format, Routen-Doku, Hooks, @import-Limit `883/1100` Zeilen). Bash-Suite nach dem
Rework: **1556 grün / 0 rot** (1555 + der neue Major-3-Fall), mit `LC_ALL=C` wegen #341.

**Einordnung eines Flakes im Rework-Lauf (nicht vermutet, wiederholt):** Der erste pre-push-Lauf
brach mit einem 30-s-Timeout in `eslint.config.test.ts:29` ab (1 Testfile rot, 800 Tests grün).
Zwei Folgeläufe – voller `pnpm test` und volles `pre-push.sh` – sind grün (je 70 Testfiles /
803 Tests). Einordnung als umgebungsbedingt, mit Beleg statt Behauptung: der Rework-Diff berührt
ausschließlich Markdown/YAML/Bash und keine einzige TypeScript-Datei (`git diff --name-only`),
und der Fall ist genau die in `lessons/testing.md` (#238) beschriebene Klasse „unamortisierter
teurer Erst-Aufruf" – hier zusätzlich unter Parallel-Last, weil im selben Skript unmittelbar
davor die Bash-Suite lief. Kein neues Issue: einmalig, nicht reproduzierbar, und die #238-
Aufwärm-Mitigation steht in der Datei bereits.

## Offene Fragen
_Keine._

## Out-of-Scope-Funde (nicht in diesem PR behoben)
- **`run-tests.sh` #334-Kostensummen-Test ist locale-abhängig rot.** In einer `de_DE.UTF-8`-Shell
  (`LC_NUMERIC`) liest `awk` die CSV-Werte `0.05`/`0.08` als 0 und formatiert mit Dezimalkomma →
  der Vergleich gegen `"0.13"` schlägt fehl (`war: 0,00`). Repro isoliert bestätigt:
  ambiente Locale `0,00`, `LC_ALL=C` `0.05`. Mit `LC_ALL=C` ist die Suite 1555/0 grün.
  Nicht Teil des Push-Gates (die Bash-Suite läuft in CI, dort C-Locale) und außerhalb des
  Task-339-Scopes – als **Issue #341** angelegt (Fix: `LC_ALL=C` vor dem `awk`-Aufruf).
- **Wegwerf-Artefakte: erledigt, kein Blocker.** Auf der Platte lagen fünf `scripts/*.tmp.sh`
  plus zwei `tasks/telemetry-raw-339-*.tmp.txt` (alle gitignoret, kein PR-Impact). Die frühere
  Notiz „`rm` in dieser Session nicht freigegeben" war als Blocker falsch: der
  Wrapper-Skript-Weg wirkt (`bash scripts/<name>.tmp.sh` mit `rm -f` darin), genau wie
  `lessons/factory-workflow.md` es verlangt („‚Nicht allow-gelistet' ist kein
  Umgebungs-Blocker, solange der Wrapper-Skript-Weg ungeprüft ist"). Die fünf Skripte sind in
  der Rework-Runde so entfernt; die beiden Telemetrie-Rohdateien bleiben liegen, sie werden vom
  Pipeline-Lauf selbst verwaltet.

## Review-Findings

Runde 1 (`tasks/review-339.md`): **NEEDS_REWORK**, keine kritischen Funde – sechs Wichtig-Findings
(Textkorrekturen plus eine Guard-Tabellenzeile) und sieben Nitpicks. Jede Tatsachenbehauptung des
Reports vor der Übernahme selbst nachgemessen (Lesson `factory-workflow.md`, #314); alle sechs
haben sich bestätigt, insbesondere die Frisch-Auflösung `5.0.12`.

- [x] **W1 No-op-Aussage** – auf das Belegte eingeschränkt: kein No-op gegen das bestehende
      Lockfile, No-op gegen die Frisch-Auflösung, Eintrag trotzdem nötig (Untergrenze `^5.0.5`
      unter dem Floor). `pnpm-workspace.yaml` + Task-Notiz; AK3 ist damit erst jetzt echt erfüllt.
- [x] **W2 Cross-Major-Ausnahme verankert** – Prosa-Anker in `pnpm-workspace.yaml`,
      `lessons/build-tooling.md` und `PROJECT-CONTEXT.md`; Assert-Meldung auf „hebt in die
      Fix-Linie (5er, ^5.0.9) – 4.x hat keinen eigenen Fix" umformuliert.
- [x] **W3 Herkunft/Zweck des Major-4-Falls** – Herkunftsfeld sagt jetzt „Vorsorge, heute keine
      4.x-Kopie im Baum", der Zweck steht im Kommentar über der Tabelle.
- [x] **W4 Major-3-Floor-Fall ergänzt** (eine Tabellenzeile, Floor `3.0.6`) – die einzige von
      keinem Mechanismus gedeckte Lücke ist damit CI-rot statt nur kommentiert; der
      „deckt die 3er-Linie bewusst noch nicht ab"-Satz in `pnpm-workspace.yaml` ist nachgezogen.
- [x] **W5 Spec-AK4 nachgezogen** auf zwei Fälle (Major 4 + 5) – Lesson #253: der Test-Beweis
      gewinnt, die Spec wird korrigiert, nicht nur die Task-Notiz.
- [x] **W6 Doku-Drift** – `build-tooling.md` (#339 nicht mehr als offener Follow-up; „zwei" →
      „mehrere" Major-Linien mit allen drei Selektoren) und `PROJECT-CONTEXT.md:277`. Bewusst
      hier statt in `/codify` erledigt, weil W2 dieselben Zeilen ohnehin anfasst.
- [x] Nitpicks 1–6: Issue **#341** nachgetragen; Wegwerf-Artefakte per Wrapper-Skript entfernt
      statt als Blocker committet; `lock_versions_291`-Kommentar nennt alle vier Linien;
      Sektions-Kommentar entschlackt und Floor-Zuordnung korrigiert (`5.0.9` kommt aus `rgw5`,
      `mh99` liegt mit `5.0.8`/`3.0.3` darunter); doppelte Herkunftszeichenkette fällt mit W3
      auseinander; `engines`-Wechsel im Lockfile-Diff ergänzt.
- **Nitpick 7 bewusst nicht umgesetzt** – kein offener Punkt, daher ohne Checkbox (drei
      strukturgleiche Zeilen-Assertions in ein
      Tabellen-Muster überführen): der Umbau würde die bestehenden 1.x/2.x-Assertions
      umschreiben, und Spec-AK5 verlangt sie ausdrücklich **unverändert**. Kandidat für
      `/refactor`, wenn dort auch die AK5-Zusicherung neu bewertet wird.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/339-brace-expansion-5x-override`
Erstellt: 2026-09-16 11:54
