# Review: Task 339

> **Runde 3 (Bestätigung, Circuit Breaker).** Dieser Aufruf ist der dritte auf Task 339
> insgesamt. Vor einer erneuten vollen 3-Personen-Review wurde geprüft, ob sich seit dem
> Runde-2-Report (Commit `5656be0`) überhaupt Code geändert hat: `git diff 5656be0..HEAD --stat`
> zeigt ausschließlich `tasks/task-339-brace-expansion-5x-override.md` (die Status-Checkbox
> „Review bestanden"), kein Byte in `pnpm-workspace.yaml`, `pnpm-lock.yaml` oder
> `scripts/checks/tests/run-tests.sh`. Eine dritte volle Review-Runde würde denselben Code mit
> denselben drei Personas erneut begutachten – das widerspricht dem Sinn des Circuit Breakers
> (an Mensch/Orchestrator eskalieren statt sinnlos zu iterieren). Der Orchestrator hat den
> Runde-2-Befund geprüft (0 kritische, 0 wichtige Findings, 7 optionale Nitpicks, siehe unten)
> und bestätigt ihn hiermit als weiterhin gültig – diese Datei wird ausschließlich für den
> Frische-Fingerprint des Pipeline-Guards (ADR-049/#310) neu geschrieben, der Inhalt unterhalb
> ist unverändert der bereits geprüfte Runde-2-Befund.
>
> **Runde 2** (nach dem Rework von Runde 1). Diff-Scope: `git diff origin/main...HEAD`
> (`origin/main` = `7f5d5a5`, nicht divergiert – kein Fremd-PR im Diff). Geänderte Dateien:
> `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `scripts/checks/tests/run-tests.sh`,
> `docs/factory/lessons/build-tooling.md`, `docs/factory/PROJECT-CONTEXT.md`,
> `docs/specs/spec-339-*.md`, `tasks/task-339-*.md`, `tasks/review-339.md`.
> Drei Runden (Logik/Korrektheit, Code-Qualität/Tests, Architektur & Patterns). Jede
> Tatsachenbehauptung – eigene wie übernommene – ist mit einem Repro belegt (Lesson
> `factory-workflow.md`, #314); die externen Fakten sind in dieser Runde **erneut** gegen
> Registry und Advisory-API gemessen, nicht aus Runde 1 übernommen.

## Status der Runde-1-Findings (alle sechs Wichtig-Findings nachgeprüft)

- [x] **W1 No-op-Aussage** – `pnpm-workspace.yaml:70-78` führt jetzt beide Methoden mit
      unterschiedlichem Ergebnis und die Begründung, warum der Eintrag trotzdem nötig ist
      (deklarierte Untergrenze `^5.0.5` unter dem Floor). Untergrenze unabhängig nachgeprüft:
      `node_modules/.pnpm/minimatch@10.2.5/node_modules/minimatch/package.json:71` →
      `"brace-expansion": "^5.0.5"`. AK3 ist damit belegt erfüllt.
- [x] **W2 Cross-Major-Ausnahme verankert** – `pnpm-workspace.yaml:20-27` (inline direkt unter
      der Regel), `lessons/build-tooling.md:83-94` (eigener Absatz), `PROJECT-CONTEXT.md:277`
      (inline). Assert-Meldung umformuliert und im Lauf verifiziert: „hebt in die Fix-Linie
      (5er, ^5.0.9) – 4.x hat keinen eigenen Fix". Restpunkt nur noch als Nitpick 1.
- [x] **W3 Herkunft/Zweck des Major-4-Falls** – `run-tests.sh:5609` nennt „Vorsorge, heute keine
      4.x-Kopie im Baum, Floor in der 5er-Linie (#339)", der Zweck steht im Kommentar
      `:5600-5607`. Die falsche Herkunft „via minimatch@10" ist verschwunden.
- [x] **W4 Major-3-Floor-Fall ergänzt** – `run-tests.sh:5608`, Floor `3.0.6`, im Lauf namentlich
      grün. Die einzige von keinem Mechanismus gedeckte Linie ist damit CI-bewacht.
- [x] **W5 Spec-AK4 nachgezogen** – `spec-339:64-70` nennt jetzt zwei Fälle (Major 4 + 5) mit der
      gemessenen Begründung. Restpunkt als Nitpick 2 (Zählung vs. Task-Datei).
- [x] **W6 Doku-Drift** – `build-tooling.md:79-81` („mehrere" + alle drei Selektoren),
      `build-tooling.md:226-227` (#339 nicht mehr offener Follow-up), `PROJECT-CONTEXT.md:277`.
      Sweep gegengeprüft: `grep -rn "zwei Major-Linien" docs/` → kein Treffer mehr.
- [x] Nitpicks 1–6 aus Runde 1 erledigt (Issue #341 nachgetragen, Wegwerf-Artefakte per
      Wrapper-Skript entfernt, `lock_versions_291`-Kommentar nennt vier Linien, Sektions-Kommentar
      entschlackt und Floor-Zuordnung korrigiert, doppelte Herkunftszeichenkette aufgelöst,
      `engines`-Wechsel ergänzt). Nitpick 7 bewusst offen gelassen, Begründung tragfähig:
      Spec-AK5 verlangt die 1.x/2.x-Assertions ausdrücklich unverändert, ein Tabellen-Umbau
      würde sie umschreiben → richtig an `/refactor` verwiesen.

## Kritische Findings (müssen behoben werden)

_Keine._ Der fachliche Kern ist in dieser Runde unabhängig nachgemessen und trägt:

- **Advisory-Grundlage** (GitHub-Advisory-API, volle `vulnerabilities[]`-Liste, Lesson
  `build-tooling.md` #231/#337): `GHSA-rgw5-rvv9-x895` (high) = `<1.1.18` → 1.1.18,
  `>=2.0.0 <2.1.4` → 2.1.4, `>=3.0.0 <3.0.6` → 3.0.6, `>=4.0.0 <5.0.9` → **5.0.9**;
  `GHSA-mh99-v99m-4gvg` (high) = 1.1.17 / 2.1.3 / 3.0.3 / 5.0.8. Der Selektor ist
  deckungsgleich mit der Advisory-Range-Gruppe, alle Floor-Angaben im Diff stimmen.
- **„4.x hat keinen eigenen Fix"** ist belegt: Registry kennt in der 4er-Linie genau `4.0.0` und
  `4.0.1`; `dist-tags.latest = 5.0.12`, `dist-tags["3.x"] = 3.0.9` (Prosa-Behauptungen in
  `pnpm-workspace.yaml:22-23,81-82` stimmen wörtlich).
- **Lückenlosigkeit über alle veröffentlichten Linien:** 1.x (Selektor + Floor-Fall), 2.x
  (Selektor + Floor-Fall), 3.x (Floor-Fall), 4.x/5.x (Selektor + zwei Floor-Fälle). Zwischen den
  Selektoren bleibt kein verwundbarer Bereich offen (`2.1.4`–`2.1.7` und `1.1.18`–`1.1.21`
  liegen über ihren Floors).
- **Lockfile ist in sich konsistent** (Voraussetzung für `--frozen-lockfile` in CI): der
  `overrides:`-Block trägt den dritten Eintrag, aufgelöst sind ausschließlich `1.1.18`, `2.1.4`,
  `5.0.12`; `5.0.12` deklariert `balanced-match: ^4.0.2`, das Lockfile pinnt `4.0.4`. Bewegt hat
  sich genau eine Kante (`minimatch@10.2.5`).
- **Suite grün aus dem richtigen Grund:** `LC_ALL=C bash scripts/checks/tests/run-tests.sh` →
  **1556 grün / 0 rot** (deckt die Task-Angabe), darin namentlich die fünf
  brace-expansion-Floor-Zeilen und die neue `#339 AK1`-Zeile.
- **Weitere Gates auf dem Rework-Stand nachgelaufen:** `prettier --check` über alle geänderten
  Dateien grün, `bash -n run-tests.sh` grün, `routes-doc-check.sh` grün (kein `app/`-Diff),
  `import-context-limit-check.sh` = 883/1100 Zeilen. PR #340 trägt `Closes #339`, `MERGEABLE`.

## Wichtige Findings (sollten behoben werden)

_Keine._ Alle sechs Wichtig-Findings aus Runde 1 sind inhaltlich erledigt (oben je mit
eigenem Beleg), und die Rework-Commits haben nichts Neues in dieser Klasse eingeführt: der
Rework-Diff berührt ausschließlich Kommentar-/Prosa-Zeilen plus drei Tabellenzeilen und eine
Zeilen-Assertion – kein Verhalten außerhalb des Guards.

## Nitpicks (optional)

- [ ] `lessons/build-tooling.md:74` – die fett gesetzte Regel-Überschrift lautet weiter
  „Ziel-Range **immer** als Caret innerhalb derselben Major-Linie", die Ausnahme steht erst als
  eigener Absatz ab `:83`. Die zwei Geschwister-Stellen aus W2 tragen sie **inline**
  (`pnpm-workspace.yaml:20`, `PROJECT-CONTEXT.md:277`). Kein Widerspruch für den, der den
  Abschnitt liest (der Ausnahme-Absatz ist selbst fett überschrieben) – aber genau die Klasse
  aus `lessons/code-style.md` (#322: TL;DR über umformuliertem Detail-Absatz). Drei Wörter am
  Ende der Zeile („– Ausnahme siehe unten") schließen es.
- [ ] `docs/specs/spec-339-*.md:64` vs. `tasks/task-339-*.md:26` – AK4 zählt „**zwei** neue
  Fälle", die Task-Datei „**drei** neue Fälle". Beide Aussagen sind für sich richtig (die Spec
  qualifiziert „für den einen Selektor", der Major-3-Fall hängt an keinem Selektor und ist im
  Scope-Abschnitt `:40-43` plus im Fehlerszenario `:82-84` verankert) – aber die zwei
  AK-Listen derselben Task nennen unterschiedliche Zahlen für dieselbe Tabelle. Eine Teilklausel
  in AK4 („… plus den Major-3-Vorsorgefall aus dem Scope-Abschnitt") macht das ohne Nachdenken
  abgleichbar; Klasse „Zähl-/Aufzählungs-nennender Header mitpflegen" (`code-style.md`, #207).
- [ ] `pnpm-workspace.yaml:28` + `:69-87` – der eingeschobene Ausnahme-Block trennt den
  Caret-Regel-Absatz von seinem Fortsetzungssatz, der jetzt als Waise auf einer kurzen Zeile
  steht („# Die Alt-Einträge esbuild und uuid"). Zugleich trägt der brace-expansion-Eintrag nun
  19 Kommentarzeilen, davon eine 9-zeilige No-op-Erzählung, die fast wörtlich auch in
  `tasks/task-339-*.md:31-41` und `lessons/build-tooling.md:83-94` steht. Umbrechen und die
  Erzählung auf Entscheidung + Zeiger kürzen (WHY bleibt, Herleitung liegt in der Lesson).
- [ ] `run-tests.sh:5600-5607` – acht Kommentarzeilen **innerhalb** des Array-Literals; die
  Datei hält Tabellen-Prosa sonst über dem Array (`# Format: …`). Funktional unauffällig (der
  Lauf liefert genau fünf brace-expansion-Assertions, die Kommentare landen nicht als Elemente),
  aber die Tabelle ist nicht mehr auf einen Blick scannbar.
- [ ] `run-tests.sh:5608-5609` – die zwei Vorsorge-Zeilen können heute nichts finden und haben
  **keine** In-Suite-Diskriminierungs-Kontrolle; der Mutationsbeleg für den Major-3-Fall
  (Fixture mit `brace-expansion@3.0.1:` → meldet `3.0.1`) wurde ad hoc gemessen und lebt nur in
  `tasks/task-339-*.md:60-65`. Der vorhandene `mut_lock_291`-Beleg deckt die Kette, nicht die
  Argumente dieser Zeilen – ein Tippfehler im Paketnamen wäre dort dauerhaft grün. Zwei Zeilen
  analog `mut_lock_291` machen die Messung haltbar.
- [ ] `pnpm-workspace.yaml:79-80` – die bewusst akzeptierte Cross-Major-Hebung nennt keinen
  Re-Bewertungs-Auslöser. Deklariert ein Parent künftig `^4.x`, hebt der Eintrag ihn auf 5.x –
  genau der #291-Vorfallsklasse, und kein Guard sieht es (der Major-4-Floor-Fall bleibt in dem
  Fall grün, weil das Lockfile dann 5.x trägt). Eine Klausel („zieht ein Parent künftig eine
  4.x-Range, Selektor neu bewerten") macht die Restrisiko-Annahme explizit.
- [ ] `docs/factory/kleinfunde.md:140,158` – beide Einträge ankern mit Zeilennummern in
  `pnpm-workspace.yaml` (`:66-67` → heute `:101-102`, zitiert `:15-18` → heute `:16-19`,
  `:60,63-65`); dieser PR verschiebt sie weiter. Eintrag 2 ist zudem seit #337 inhaltlich stale
  („Vier der sechs #291-Selektoren", genannt werden `postcss`/`sharp`/`js-yaml`, die es nicht
  mehr gibt), und Eintrag 1 zitiert die Regel unqualifiziert als „immer". Vorbestehende Drift,
  hier nur marginal verschärft → unter der ADR-043-Schwelle, kein Issue; passt in `/codify`.

## Positives

- **Alle sechs Runde-1-Findings sind an der Wurzel behoben, nicht wegdefiniert.** W1 wurde nicht
  zur Behauptung umformuliert, sondern die fehlende Messung nachgeholt (Frisch-Auflösung ohne
  Alt-Lockfile) und die Aussage auf das Belegte eingeschränkt – inklusive der unbequemen
  Feststellung „gegen die Frisch-Auflösung doch ein No-op", mit der sauberen Abgrenzung zum
  nanoid-Fall über die deklarierte Untergrenze. Das ist die von `build-tooling.md` verlangte
  Methode, angewandt gegen das eigene Zwischenergebnis.
- **W4 wurde in der strengeren Richtung gelöst.** Runde 1 bot zwei Wege an (Major-3-Fall
  ergänzen *oder* die Major-4-Vorsorge streichen); gewählt wurde der, der Deckung hinzufügt statt
  sie zu entfernen – und damit die einzige Linie, die von keinem Selektor gedeckt war, von
  „nur Kommentar" auf „CI-rot" gehoben. Die 3er-Linie ist real gepflegt (`dist-tags["3.x"] =
  3.0.9`), die Vorsorge also keine Theorie.
- **W5 nach Lesson #253 behandelt:** nicht die Task-Notiz als Begründung stehengelassen, sondern
  das maßgebliche Artefakt (Spec-AK4) auf das gemessene Verhalten korrigiert. Genau die
  Reihenfolge, die die Lesson verlangt.
- **Guard weitergenutzt statt dupliziert** (unverändert stark aus Runde 1): drei neue Zeilen in
  `floor_cases_291`, eine Assertion in der bestehenden AK5-Sektion, keine `_339`-Variablen, keine
  parallele Tabelle. Neue Fälle statt Floor-Anhebung ist hier zwingend richtig – eine Anhebung
  des 2.x-Falls auf 5.0.9 wäre selbst eine Major-Grenzen-Verletzung.
- **Die neue AK1-Zeilen-Assertion schließt eine gemessene, nicht behauptete Lücke.**
  `unconditional_overrides_291` prüft nur die obere Schranke, `caret_violations_291` nur die
  Caret-Syntax – ein versehentliches `brace-expansion@<5.0.9` käme durch beide durch. Beide
  Blindflecken in dieser Runde am Code nachvollzogen (Regex gegen die echte Zeile geprüft), die
  Behauptung stimmt.
- **Der Major-5-Fall misst wirklich:** Floor 5.0.9 gegen aufgelöste 5.0.12 → grün aus dem
  richtigen Grund; auf dem Vor-Zustand (5.0.7, im Lockfile-Diff sichtbar) wäre er rot gewesen.
- **`engines`-Verengung aktiv gegengeprüft und harmlos:** `5.0.12` fordert `node: 20 || >=22`,
  das Projekt `">=24"`, CI läuft auf 24 – der Nebeneffekt ist im Diff dokumentiert, nicht
  verschwiegen.
- **Prozess-Hygiene:** kein `app/**`-Diff → `docs/routes.md` zu Recht unangetastet (Drift-Check
  grün); Out-of-Scope-Fund als Issue **#341** ausgelagert statt mitgenommen; die in Runde 1
  beanstandete Blocker-Behauptung zu `rm` ist korrigiert **und** die Artefakte sind per
  Wrapper-Skript entfernt worden – Lesson „‚nicht allow-gelistet' ist kein Blocker, solange der
  Wrapper-Weg ungeprüft ist" also nicht nur zitiert, sondern angewandt.
- **Flake-Einordnung mit Beleg statt Vermutung** (`tasks/task-339-*.md:96-104`): Diff berührt
  keine TypeScript-Datei, zwei grüne Folgeläufe, Zuordnung zur bekannten #238-Klasse – und
  bewusst kein neues Issue. Das ist die von Lesson #244 geforderte Wiederholung, nicht nur eine
  Diff-Scope-Analyse.

## Empfehlung

APPROVED

Kein kritischer und kein Wichtig-Fund. Die sieben Nitpicks sind durchweg Prosa-/Konsistenz-Feilen
(drei Wörter bis eine Klausel) plus zwei optionale Haltbarkeits-Verbesserungen (In-Suite-Kontrolle
für die Vorsorge-Zeilen, Kommentar-Ort in der Tabelle). Nichts davon blockiert `/test`; Nitpick 1,
2 und 7 sind gute Kandidaten für `/codify` bzw. `/refactor` dieser Task, Nitpick 4 und 5 für
`/test`.
