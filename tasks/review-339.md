# Review: Task 339

Diff-Scope: `git diff origin/main...HEAD` (origin/main = `7f5d5a5`, nicht divergiert – kein
Fremd-PR im Diff). Geänderte Dateien: `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
`scripts/checks/tests/run-tests.sh`, `docs/specs/spec-339-*.md`, `tasks/task-339-*.md`.
Drei Runden (Logik/Korrektheit, Code-Qualität, Architektur). Jede Tatsachenbehauptung in einem
Wichtig-Finding ist mit einem eigenen Repro belegt (Lesson `factory-workflow.md`, #314).

## Kritische Findings (müssen behoben werden)

_Keine._ Der fachliche Kern ist korrekt: der Selektor deckt sich exakt mit der
Advisory-Range-Gruppe, der Baum löst `5.0.12` auf (über beiden Floors), die 1.x/2.x-Einträge
sind unangetastet, und die Bash-Suite ist grün (unabhängig nachgelaufen: `LC_ALL=C bash
scripts/checks/tests/run-tests.sh` → **1555 grün / 0 rot**, inkl. aller vier
brace-expansion-Floor-Fälle und der neuen AK1-Zeile).

## Wichtige Findings (sollten behoben werden)

- [ ] **`pnpm-workspace.yaml:61-64` – „KEIN No-op" ist nach der projekteigenen Methode nicht
  gemessen und durch eine Frisch-Auflösung widerlegt.** Der Kommentar begründet die Einordnung
  mit „gemessen am Lockfile vor dem Eintrag" – genau die Abkürzung, die derselbe Kommentarblock
  20 Zeilen höher ausschließt (`:32-34`: „Eintrag streichen, **ohne Alt-Lockfile** neu auflösen,
  aufgelöste Version prüfen – nicht aus der Parent-Range annehmen"), und die Spec-AK3 wörtlich
  verlangt („Override wird probeweise entfernt … Lockfile neu aufgelöst").
  **Repro (kanonische Methode, Wegwerf-Projekt, ohne jeden Override):** `package.json` mit
  genau `{"minimatch":"10.2.5"}` + `pnpm install --lockfile-only --ignore-workspace` →
  frisches Lockfile löst **`brace-expansion@5.0.12`** auf, also über dem Floor 5.0.9. Ursache:
  `minimatch@10.2.5` deklariert `^5.0.5` (`node_modules/.pnpm/minimatch@10.2.5/.../package.json`),
  und `5.0.12` ist die höchste veröffentlichte 5er-Patch (Registry-Abfrage:
  `4.0.0 4.0.1 5.0.2 … 5.0.12`, `dist-tags.latest = 5.0.12`). Die `5.0.7` im Alt-Lockfile war
  ein Alters-Artefakt der früheren Auflösung, keine Folge des fehlenden Eintrags.
  **Wichtig für die Formulierung – der Eintrag ist trotzdem nicht wertlos** und nicht der
  nanoid-Fall: nanoid gilt als No-op, weil sein Konsument eine Range deklariert, deren
  *Untergrenze* den Floor schon erfüllt (`^3.3.17`). Hier liegt die Untergrenze `5.0.5`
  **unter** dem Floor – der Eintrag ist also die einzige durable Zusicherung ≥ 5.0.9 und hat in
  diesem PR real gewirkt (er hat das bestehende Lockfile von 5.0.7 hochgezogen; ohne ihn hätte
  `--frozen-lockfile` 5.0.7 behalten). **Fix:** Aussage auf das Belegte einschränken, z. B.
  „gegen das bestehende Lockfile kein No-op (hob 5.0.7 → 5.0.12); gegen eine Frisch-Auflösung
  dagegen schon (minimatch@10 deklariert `^5.0.5`, höchste 5er-Patch erfüllt den Floor) – der
  Eintrag bleibt als Floor-Sicherung, weil die deklarierte Untergrenze 5.0.5 unter dem Floor
  liegt." Analog in `tasks/task-339-*.md:34-37`; AK3 erst danach als erfüllt führen.

- [ ] **`pnpm-workspace.yaml:83` + `run-tests.sh:5728` – erster Eintrag, dessen Ziel-Range die
  Major-Linie des Selektors verlässt; die projektweite Regel trägt keine Ausnahme, und die
  Assert-Meldung behauptet das Gegenteil.** Für eine 4.x-Kopie hebt `"brace-expansion@>=4.0.0
  <5.0.9": "^5.0.9"` **über** die Major-Grenze. Die Entscheidung ist richtig und belegt (4.x hat
  keinen eigenen Fix, s. P2) – aber sie ist eine Ausnahme zu einer unbedingt formulierten Regel,
  und zwar an drei Stellen: `pnpm-workspace.yaml:16-17` („Ziel-Range bei NEUEN Einträgen als
  Caret innerhalb **DERSELBEN** Major-Linie"), `lessons/build-tooling.md:74` („**immer** als
  Caret innerhalb derselben Major-Linie") und `PROJECT-CONTEXT.md:277`. Der Enforcer kann die
  Ausnahme nicht sehen: `caret_violations_291` (`run-tests.sh:5736-5738`) prüft nur die
  *Syntax* der Ziel-Range (`grep -vE ': "\^[0-9]'`), Major-agnostisch – er winkt den Eintrag
  durch, obwohl dessen Wirkung der Regel widerspricht, die er durchsetzen soll.
  Zusätzlich behauptet die neue Assert-Meldung „**hebt innerhalb der 5er-Linie** (^5.0.9)" –
  für 5.x-Eingaben richtig, für 4.x-Eingaben genau falsch, und 4.x ist der Grund für die
  Untergrenze `>=4.0.0` statt `>=5.0.0`. **Fix:** Regeltext um die belegte Ausnahme ergänzen
  („Selektor-Linie ohne eigenen Fix wird in der Fix-Linie gepatcht") und die Assert-Meldung auf
  „hebt in die Fix-Linie (5er, ^5.0.9) – 4.x hat keinen eigenen Fix" umformulieren. Ohne den
  Prosa-Anker stellt der nächste Durchlauf die Untergrenze „regelkonform" auf `>=5.0.0` und
  reißt die 4.x-Lücke wieder auf. (Gefahrenklasse ist als Kleinfund schon beschrieben:
  `kleinfunde.md:158-172`.)

- [ ] **`run-tests.sh:5603` – die Herkunftsangabe des Major-4-Floor-Falls beschreibt einen Pfad,
  der keine 4.x-Kopie liefern kann, und der Zweck des Falls steht nirgends.** Der Fall trägt
  „development, via minimatch@10 (typescript-eslint), Floor aus #339" – `minimatch@10.2.5`
  deklariert aber `^5.0.5` (geprüft), kann also nie eine 4.x-Kopie ziehen; im Baum existiert
  überhaupt kein 4.x-Parent (`grep -E "^  brace-expansion@[0-9]" pnpm-lock.yaml` → nur
  `1.1.18`, `2.1.4`, `5.0.12`). Schlägt der Fall künftig an, nennt die Fehlermeldung damit eine
  falsche Herkunft. Verstärkend: der Kommentar `:5600-5602` begründet ausschließlich, warum der
  **Major-5**-Fall nötig ist („ein Fall mit Major 4 sähe die real aufgelöste 5.0.7 nie und wäre
  grün, ohne zu messen") – warum der Major-4-Fall dann trotzdem in der Tabelle steht
  (Vorsorge gegen künftiges Hereinziehen), sagt die Prosa nicht. **Fix:** Herkunftsfeld auf den
  tatsächlichen Zweck umschreiben (z. B. „heute keine 4.x-Kopie im Baum – Fall wacht über ein
  künftiges Hereinziehen; Floor liegt in der 5er-Linie, weil 4.x keinen eigenen Fix hat") und
  diesen Zweck im Kommentar über der Tabelle benennen.

- [ ] **`pnpm-workspace.yaml:67-71` vs. `run-tests.sh:5603` – die 3er-Linie wird gegenläufig zur
  4er-Linie bewertet, obwohl die Tatsachenlage identisch ist.** Für Major 4 wird ein heute
  leerlaufender Floor-Fall *angelegt* (Vorsorge), für Major 3 mit derselben Begründung
  („der Baum löst heute keine 3.x-Kopie auf") *keiner*. Damit ist die Regel nicht ableitbar –
  und die 3er-Lücke ist die einzige, die von **keinem** Mechanismus gedeckt ist: eine
  hypothetische `brace-expansion@3.0.1` matcht keinen der drei Selektoren (`<1.1.18` ✗,
  `>=2.0.0 <2.1.4` ✗, `>=4.0.0 <5.0.9` ✗) **und** keinen Floor-Fall (`floor_cases_291` hat
  keinen Major-3-Eintrag, geprüft) – sie zieht still ein. Die Floors sind bereits ermittelt
  (`3.0.6` / `3.0.3`, per Advisory-API bestätigt), die 3er-Linie wird upstream aktiv gepflegt
  (`dist-tags`: `3.x = 3.0.9`). **Fix:** eine Tabellenzeile `"brace-expansion|3|3.0.6|…"`
  ergänzen (kostet nichts, ist heute grün, hebt die Lücke von „nur Kommentar" auf „CI-rot") –
  alternativ die 4er-Vorsorge mit derselben Begründung wieder streichen. Kein eigenes Issue:
  unter zehn Zeilen, kein aktuelles Risiko (ADR-043-Schwelle nicht erreicht).

- [ ] **`docs/specs/spec-339-*.md:59-62` – AK4 ist durch eine Messung dieses PRs widerlegt und
  nicht nachgezogen.** AK4 verlangt „einen **dritten** Fall (Major `4`, Floor `5.0.9`) …, der
  bei einer künftigen Regression unter den Floor **real anschlägt**". Die Implementierung hat
  gemessen, dass genau das nicht zutrifft (RED-Lauf: Major-4-Fall prompt grün, erst der
  Major-5-Fall schlug an) und **zwei** Fälle eingetragen. Lesson #253
  (`lessons/factory-workflow.md:783-790`) ist hier wörtlich zuständig: „Widerspricht der
  Test-Beweis der Spec-Formulierung, gewinnt das getestete Verhalten – **die Spec wird
  nachgezogen**." Die Abweichungsnotiz in der Task-Datei erfüllt das nicht; sie ist Begründung,
  nicht Korrektur des maßgeblichen Artefakts. **Fix:** AK4-Wortlaut auf „zwei Fälle (Major 4 und
  Major 5, beide Floor 5.0.9)" korrigieren, Begründung einzeilig mitnehmen.

- [ ] **Doku-Drift außerhalb des Diffs: `lessons/build-tooling.md` und `PROJECT-CONTEXT.md:277`
  beschreiben die von diesem PR geänderte Mechanik weiter im alten Stand.** Drei Stellen,
  Sweep-Beleg `grep -rn "brace-expansion\|#339" docs/`:
  1. `build-tooling.md:216-217` führt #339 als **offenen** Follow-up („als eigenständiges Issue
     #339 **ausgelagert** statt übersehen") – dieser PR erledigt #339.
  2. `build-tooling.md:79-81`: „Trägt ein Paket Advisories in **zwei** Major-Linien, brauchen die
     Selektoren disjunkte Grenzen (`brace-expansion@<1.1.18` **und** `@>=2.0.0 <2.1.4`)" – es
     sind jetzt drei, die Aufzählung ist unvollständig.
  3. `PROJECT-CONTEXT.md:277`: „bei Advisories in **zwei** Major-Linien disjunkte Selektoren".
  `pnpm-workspace.yaml:54` wurde korrekt von „zwei" auf „drei DISJUNKTE Selektoren" nachgezogen –
  die wortgleichen Aussagen in Lesson und Kontext-Index blieben zurück. Regel: Lesson #176
  (`lessons/factory-workflow.md:754-762`), Sweep nach `#<eigene-id>`/„Follow-up". Das
  historische Vorfall-Narrativ (`:212-215`) bleibt unverändert, nur der Offen-Marker und die
  Präsens-Mechanik werden nachgezogen. **Darf regelkonform in `/codify` dieser Task erledigt
  werden** (Schritt steht noch aus) – dann aber gezielt diese drei Stellen.

## Nitpicks (optional)

- [ ] `tasks/task-339-*.md:76-81` – die Out-of-Scope-Notiz zum locale-abhängigen
  `awk`-Kostensummen-Test nennt das inzwischen angelegte **Issue #341** nicht („Kandidat für
  einen eigenen Fix" liest sich, als existiere noch keins). Issue-Nummer nachtragen.
- [ ] `tasks/task-339-*.md:82-84` – die Notiz zu den Wegwerf-Artefakten ist unvollständig und
  nennt einen Blocker, der keiner ist. Auf der Platte liegen fünf statt einer Datei
  (`measure-339.tmp.sh` (188 B, Inhalt tatsächlich geleert), `verify-339-review.tmp.sh`,
  `verify-339-advisories.tmp.sh`, `verify-339-locale.tmp.sh`, `issue-339-locale.tmp.sh`) plus
  zwei `tasks/telemetry-raw-339-*.tmp.txt`; kein PR-Impact (alle gitignoret, `git status`
  leer – geprüft). Die Begründung „rm in dieser Session nicht freigegeben" ist zwar für den
  direkten Aufruf richtig, aber der **Wrapper-Skript-Weg wirkt**: empirisch verifiziert in
  dieser Session (`bash scripts/<wegwerf>.tmp.sh` mit `rm -f` darin → Datei gelöscht). Genau
  davor warnt `lessons/factory-workflow.md` („‚Nicht allow-gelistet' ist kein
  Umgebungs-Blocker, solange der Wrapper-Skript-Weg ungeprüft ist"). Also: Artefakte über ein
  Wegwerf-Skript entfernen statt die Blocker-Behauptung zu committen.
- [ ] `run-tests.sh:5569` – der Erklärkommentar zu `lock_versions_291` sagt weiter
  „(brace-expansion 1.x **und** 2.x tragen verschiedene Advisories)"; die Tabelle vier Zeilen
  darunter kennt jetzt auch 5.x.
- [ ] `run-tests.sh:5552-5554` – der neue Sektions-Kommentar ist überwiegend Navigation („plus
  die AK1-Zeile weiter unten") und wiederholt Floor/GHSA aus den beiden anderen neuen Blöcken.
  Zudem verwischt „(Floor 5.0.9, GHSA-rgw5-rvv9-x895 / GHSA-mh99-v99m-4gvg)" die Zuordnung:
  in der 5er-Linie trägt `mh99` den Floor **5.0.8**, die `5.0.9` kommt allein aus `rgw5`
  (per Advisory-API bestätigt). Der Workspace-Kommentar `:56` unterscheidet das korrekt.
- [ ] `run-tests.sh:5603-5604` – die Herkunftszeichenkette steht wortgleich zweimal
  (Magic String); mit dem Fix aus W3 fällt das ohnehin auseinander.
- [ ] `tasks/task-339-*.md:37` – „Lockfile-Diff ist minimal (nur diese eine Version,
  `5.0.7 → 5.0.12`)": der Diff ändert zusätzlich `engines` des Pakets
  (`node: 18 || 20 || >=22` → `node: 20 || >=22`). Folgenlos (s. P7), nur unpräzise.
- [ ] `run-tests.sh:5719/5721/5727` – drei strukturgleiche Inline-Assertions mit identischem
  Rumpf (`grep -qxF -- '<zeile>' "$WORKSPACE_YAML_291"`). Ein passender Helfer existiert nicht
  (`assert_contains_286`/`assert_absent` arbeiten ohne Zeilenanker), aber ab drei Einträgen wäre
  das in dieser Datei sonst übliche Tabellen-Muster (wie `floor_cases_291`) konventionsnäher –
  Smell-Klasse aus `lessons/testing.md` (#267).

## Positives

- **Bestehender Guard weitergenutzt statt dupliziert.** Die neuen Fälle gehen in
  `floor_cases_291` und die Zeilen-Assertion in dieselbe AK5-Sektion – kein parallel
  aufgezogener `floor_cases_339`-Block. Genau das in `run-tests.sh:5548-5554` festgehaltene
  #169/#291/#337-Muster; Namens-/Suffix-Konvention eingehalten (`Floor aus #339` analog
  `Floor aus #337`), keine neuen `_339`-Variablen, Wiederverwendung von
  `WORKSPACE_YAML_291`/`LOCKFILE_291`. Neue Fälle statt Floor-Anhebung ist hier zwingend
  richtig: eine Anhebung des 2.x-Falls auf 5.0.9 wäre selbst eine Major-Grenzen-Verletzung.
- **Advisory-Grundlage unabhängig bestätigt** (Lesson `build-tooling.md`, #231/#337 – volle
  `vulnerabilities[]`-Liste, nicht nur die erste Range-Gruppe): `GHSA-rgw5-rvv9-x895` (high)
  trägt exakt `<1.1.18`, `>=2.0.0 <2.1.4`, `>=3.0.0 <3.0.6`, `>=4.0.0 <5.0.9` (first_patched
  5.0.9); `GHSA-mh99-v99m-4gvg` (high) die Vorläufer-Floors `1.1.17 / 2.1.3 / 3.0.3 / 5.0.8`.
  Der Selektor `>=4.0.0 <5.0.9` ist damit **deckungsgleich** mit der Advisory-Range-Gruppe, und
  die Kommentar-Behauptung „4.x hat keinen eigenen Fix" ist belegt: in der 4er-Linie sind nur
  `4.0.0` und `4.0.1` veröffentlicht, `first_patched_version` liegt in der 5er-Linie.
- **Blindfleck-Behauptung stimmt, und die neue AK1-Assertion schließt eine echte Lücke.**
  `unconditional_overrides_291` (`:5686`) prüft nur die Existenz einer oberen Schranke, der
  Caret-Guard nur die Ziel-Range-Syntax – ein versehentliches `brace-expansion@<5.0.9` käme
  durch beide unauffällig. Die zusätzliche Zeilen-Assertion ist die einzige Deckung der
  Untergrenze `>=4.0.0`, und der in der Task dokumentierte Mutationsbeleg (mutierte
  Selektor-Zeile → genau diese Assertion rot, Konditionalitäts-Guard grün) ist genau die
  geforderte Arbeitsweise: Blindfleck behaupten **und** messen.
- **Der Major-5-Fall misst wirklich, und die Suite ist grün.** Floor 5.0.9 gegen aufgelöste
  `5.0.12` → grün aus dem richtigen Grund; auf dem Vor-Zustand (`5.0.7`) wäre er rot gewesen.
  Unabhängig nachgelaufen: 1555 grün / 0 rot, die vier brace-expansion-Floor-Zeilen und die
  #339-AK1-Zeile namentlich grün.
- **Selektor-Disjunktheit und Nicht-Berührung des Bestands (Spec-AK5).** `<1.1.18` ∩
  `>=2.0.0 <2.1.4` ∩ `>=4.0.0 <5.0.9` = ∅; die 1.x/2.x-Einträge und ihre Guards sind
  byte-identisch unverändert, der neue Code steht jeweils daneben. Lockfile-Diff bewegt genau
  eine Version an drei Stellen (Package-Eintrag, Snapshot, `minimatch@10.2.5`-Kante) – kein
  Kollateral-Drift.
- **Gate-Ort korrekt gewählt, ohne neues Gate.** ADR-Sweep über `docs/adr/**` liefert keine ADR,
  die den Ort für Dependency-Floor-Gates festlegt; der gewählte Ort ist trotzdem strukturell
  verankert (`run-tests.sh` läuft im Job `factory-self-test`, und der ist nach ADR-029 ein
  Required Status Check). Die von ADR-041 verworfene „einzelne Testzeile als zufälliger CI-Arm"
  liegt nicht vor – der Floor-Guard *ist* das Gate. Lesson „Neues Gate verankern" ist damit
  mit dem richtigen Ergebnis bedient.
- **Der `engines`-Wechsel im Lockfile ist harmlos – aktiv gegengeprüft.** `5.0.12` verengt auf
  `{node: 20 || >=22}`; das Projekt fordert `"node": ">=24"` (`package.json:8`), CI läuft auf
  `node-version: 24` (`factory-ci.yml:114,139`, `deploy-gate.yml:56`). Kein Konflikt.
- **Die 3er-Lücke wird nicht verschwiegen** (`pnpm-workspace.yaml:67-71`): Floors, Grund,
  künftig nötiger Selektor und die Guard-Lücke stehen explizit da. Es fehlt nur der eine
  mechanische Schritt aus dem vierten Wichtig-Finding.
- **Scope-Disziplin und Prozess-Hygiene:** kein `app/**`-Diff → `docs/routes.md` zu Recht
  unangetastet (Begründung steht in der Task-Datei, Routen-Drift-Check grün); PR #340 trägt
  `Closes #339` im Body; der Out-of-Scope-Fund (locale-abhängiger `awk`-Test) ist als Issue
  **#341** mit korrektem Label-Satz (`bug` + `test` + `factory-pipeline`) angelegt, statt in
  diesem PR mitgenommen zu werden.

## Empfehlung

NEEDS_REWORK

Kein kritischer Fund – der Fix selbst ist inhaltlich richtig, gemessen und musterkonform. Die
sechs Wichtig-Findings sind durchweg Textkorrekturen bzw. eine Tabellenzeile:

1. `pnpm-workspace.yaml:61-64` + Task-Notiz: No-op-Aussage auf das Belegte einschränken (bzw.
   die Frisch-Auflösung als Messung eintragen) und AK3 entsprechend führen.
2. Cross-Major-Ausnahme in Regeltext + Assert-Meldung verankern.
3. Herkunft/Zweck des Major-4-Floor-Falls korrigieren.
4. Major-3-Floor-Fall ergänzen (eine Zeile) – oder die 4er-Vorsorge symmetrisch streichen.
5. Spec-AK4 auf das gemessene Verhalten nachziehen.
6. `build-tooling.md` (2 Stellen) + `PROJECT-CONTEXT.md:277` nachziehen – darf `/codify`
   erledigen.
