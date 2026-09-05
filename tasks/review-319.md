# Review: Task 319

> **Iteration 2** (Circuit Breaker: 2 von 3 verbraucht) · Stand `0a370f6` ·
> Diff-Scope `origin/main...HEAD`, Rework-Delta `81db827..HEAD` · drei Runden sequenziell,
> je eigener Sub-Agent mit Lesezugriff.
>
> **Iteration 1** fand 3 Kritisch + 12 Wichtig + 18 Nitpicks (Empfehlung damals: Rework). Alle
> Kritisch und Wichtig sind behoben – unabhängig nachgeprüft, nicht anhand der Behauptung:
> der Deckel zählt Inline-Imports, die Erzwingungs-Behauptungen zu Hook/Ruleset und
> `commit-msg` sind korrekt, ADR-047 §3 und die acht Kurzregeln in `CLAUDE.md` sind eins zu eins
> deckungsgleich, und die Drei-Netz-Prüfung ergab erneut: keine Regel fällt durch alle Netze
> (die entfallene `factory::run`-Kurzregel ist am Issue-Seam sogar technisch erzwungen). Der
> Volltext jener Findings steht in der Git-History dieser Datei (Commit `0a370f6`).
>
> **Verifikation:** Jede Kritisch-/Wichtig-Einstufung mit einer überprüfbaren
> Verhaltensbehauptung wurde im Orchestrator-Kontext **eigenständig** nachvollzogen (Lesson
> #314). Wie, steht je Finding unter „Verifiziert".

## Kritische Findings (müssen behoben werden)

- [x] **[`scripts/checks/import-context-limit-check.sh:84`] Markdown-dekorierte
  Inline-`@import`s werden geladen, aber nicht gezählt – und drei Stellen behaupten
  Vollständigkeit.** Der Token-Scan filtert mit `grep '^@.'`; angehängte Satzzeichen werden
  abgeschnitten, **vorangestellte** Markdown-Dekoration nicht. `**@docs/x.md**` (fett),
  `_@docs/x.md_` (kursiv) und `>@docs/x.md` (Blockquote ohne Leerzeichen) lädt Claude Code,
  der Deckel zählt sie nicht.
  *Begründung:* Dies ist derselbe Defekt, den Iteration 1 als K1 gemeldet hat – der Rework hat
  ihn verengt, nicht geschlossen, während die Behauptungen **breiter** geworden sind: ADR-047 §4
  sagt jetzt „**Beide Referenz-Formen zählen**" und nennt als **einzige** Restgrenze die
  Resolve-Filterung; der Skript-Header sagt dasselbe; und der neu eingefügte Guardrail in
  `CLAUDE.md` – also im **immer geladenen** Kontext – spricht von „alle `@`-eingebundenen
  Dateien". Damit steht wieder genau die Kombination „starke Behauptung + belegte Umgehung", die
  Iteration 1 ausdrücklich als nicht-bleibend markiert hat. Fettdruck auf einem Pfad ist in
  dieser Doku eine gängige Form.
  *Verifiziert (eigenes Repro, beide Seiten):* Fixture `CLAUDE.md` = „Die kanonische Quelle ist
  `**@docs/bold.md**` – dort nachlesen.", `docs/bold.md` = Marker `BOLDONLY777`;
  `claude --print --disallowedTools Read,Bash,Grep,Glob,Task,WebFetch` antwortete `BOLDONLY777`.
  **Negativkontrolle** mit derselben Zeile ohne `@` (Fettdruck erhalten) → `NICHT_GELADEN`.
  Check-Seite: `CLAUDE.md` 20 Zeilen + `**@docs/gross.md**` (1.500 Zeilen) → „✓ 21 von 1100",
  exit 0; dieselbe Zeile ohne Fettdruck → „✗ 1521 Zeilen", exit 1.
  *Fix – eine von zwei Richtungen, bewusst entscheiden:* (a) den Kandidaten vor dem Resolve auch
  **links** um Dekoration trimmen (`*_>` und ggf. `("„[`) und je Form einen Test ergänzen; oder
  (b) die Restgrenze in Skript-Header, ADR §4 **und** `CLAUDE.md`-Guardrail auf „undekoriertes
  Inline-Token" einschränken. Nicht bleiben darf die unqualifizierte Behauptung.

## Wichtige Findings (sollten behoben werden)

- [x] [`scripts/checks/tests/run-tests.sh:7380-7392`] Zyklus-Test: das Label behauptet „…
  **und zählt CLAUDE.md nur einmal**", der Ausdruck ist `assert_exit 0` bei verworfener Ausgabe –
  die Summe wird nirgends beobachtet. *Verifiziert:* ein Mutant ohne `seen`-Dedup meldet auf
  einem Fixture mit zweimal `@docs/a.md` „82 von 1100" statt 52 – **exit 0 in beiden Fällen**,
  der Test bleibt grün. Rezidiv des #312-Learnings, das derselbe Block an anderer Stelle korrekt
  zitiert. Fix: Ausgabe erfassen und `assert_contains_286 "$ic_out" "52 von"` ergänzen (Muster
  wie Test 1 und 12).
- [x] [`scripts/checks/import-context-limit-check.sh:20-23`, `run-tests.sh:7411-7420`,
  Task-Datei] Der Resolve-Filter ist mit der **falschen Kausalkette** begründet, und die
  zugehörige Assertion ist vakuum-grün. Header, Test-Kommentar und Rework-Notiz nennen
  `@serwist/next`, `@neondatabase/serverless` und `@types/node` als Grund – diese Token erreichen
  den Filter nie, weil sie geklammert/gebacktickt sind und nach dem Whitespace-Split nicht mit
  `@` beginnen. *Verifiziert:* vollständiger Token-Scan über das reale @import-Set liefert genau
  fünf Kandidaten: die vier echten Imports **plus `@importiert`** (`CLAUDE.md:128`) – das ist der
  real wirksame Fall. Folge: `assert_absent "$ic_out" "serwist"` kann per Konstruktion nie rot
  werden. Fix: Begründung an allen drei Stellen auf `@importiert`/unklammerte Prosa-Token
  umstellen, und im Fixture ein **unklammertes** `@serwist/next` verwenden.
- [x] [`scripts/checks/import-context-limit-check.sh:33-34`] Header behauptet „weil
  Prettier/`format:check` sie mit Schluss-Newline erzwingt". *Verifiziert:* `.prettierignore`
  deckt `docs/` **und** `CLAUDE.md` – kein Gate erzwingt die Schluss-Newline (im selben Task
  bereits selbst festgestellt, als es um das Format-Risiko der Änderung ging). Falsche
  Kausalkette in einem WHY-Kommentar, codifizierte Klasse (#264/#268). Fix: `awk 'END{print NR}'`
  statt `wc -l` – dann entfällt der Absatz –, oder den echten Grund nennen.
- [x] [`scripts/checks/import-context-limit-check.sh:12-15` vs. `:75-82`] Header-Bedingung ≠
  implementierte Bedingung: dokumentiert ist „die Zeile besteht (bis auf Leerzeichen) aus
  `@<pfad>`", implementiert ist „beginnt mit `@` und enthält kein weiteres `@`" → der ganze Rest
  gilt als Pfad. *Verifiziert:* `@importiert werden die Lessons bewusst nicht.` als Zeilenanfang
  → exit 1 mit „referenzierte Datei nicht lesbar: importiert werden die Lessons bewusst nicht."
  Fail-closed, aber irreführend; ein Absatz-Umbruch genügt als Auslöser. Fix: Form 1 auf
  whitespace-freies `rest` einschränken und ein `rest` mit Leerzeichen nur zählen, wenn es
  auflöst (Test 12 bleibt grün, die Fail-closedness für den Umbenennungsfall bleibt erhalten).
- [x] [`scripts/checks/import-context-limit-check.sh:140`, `run-tests.sh:7311-7344`] Die
  Grenzwert-Semantik ist ungetestet: alle Fixtures liegen bei `LIMIT+10` oder deutlich darunter,
  `total == MAX_IMPORT_LINES` kommt nicht vor. *Verifiziert:* Mutation `-gt` → `-ge` lässt den
  gesamten Block grün. Das ist die **einzige** Vergleichsoperation des Skripts, und
  `testing-standards.md` führt Boundary Values unter „Testen: immer". Fix: zwei Assertions
  (genau `IC_LIMIT_319` Zeilen → exit 0, `+1` → exit 1).
- [x] [`CLAUDE.md:106-112`] Das verdichtete Kriterium wird von seinem eigenen Hauptfall verletzt:
  `git-workflow.md` ist nach diesem Wortlaut in **keiner** der beiden Bedingungen (nicht
  vollständig erzwungen – ADR §2 vermerkt es selbst für das Commit-Format – und Adressatenkreis
  „jeder Schritt"). Der ADR löst das über einen dritten Mechanismus (Spiegelung als
  Kern-Kurzregel, §3), den die verdichtete Fassung nicht nennt. Widerspruch innerhalb der im
  selben PR neu verfassten Prosa (#322). Fix: dritte Alternative ergänzen („… oder wenn ihre
  schritt-relevanten, nicht erzwungenen Regeln als Kern-Kurzregeln inline gespiegelt werden").
- [x] [`docs/adr/047-…md:77`, `CLAUDE.md:140`] Dritte nicht tragende Erzwingungs-Behauptung
  (gleiche Klasse wie K2 aus Iteration 1, deren Sweep sie hätte mitnehmen müssen – Lesson #264):
  `branch-name-check.sh` steht in der Spalte „Erzwungen durch", ist aber ein
  Claude-Code-**PreToolUse**-Hook auf den Bash-Tool-Input. *Verifiziert:* einzige Verdrahtung ist
  `scripts/checks/check.sh` (pre-tool) – **keine** Einbindung in `pre-push.sh`, `pre-commit.sh`
  oder `.github/workflows/`; das Skript `exit 0`, wenn kein `checkout -b`/`switch -c` im Kommando
  steht, greift also nicht bei `git branch && git checkout`, nicht bei `git worktree add -b`
  (genau der Pfad von `start-work.sh`), nicht außerhalb von Claude Code und nicht beim Push.
  Fix: Zelle und Kurzregel-Klammer präzisieren.
- [x] [`docs/adr/047-…md:123`] Falsche kanonische Quelle zitiert: §4 begründet „Warum jetzt und
  nicht bei #196" mit „(„Kein Check-Skript aus Reflex", `token-efficiency.md`)". *Verifiziert:*
  Die Phrase steht in `docs/factory/OPERATING.md:419` (§5.1, `/codify`-Faustregeln), nicht in
  `token-efficiency.md` – `git log -S` zeigt, dass sie dort nie stand. Verstoß gegen „Kanonische
  Quellen immer referenzieren" an genau der Stelle, an der die ADR eine bestehende Regel für
  überholt erklärt – mit der Folge, dass die Regel am **richtigen** Ort unverändert stehen bleibt.
- [x] [`docs/factory/OPERATING.md:410-419`, `:461-479`] Der von `CLAUDE.md` als „kanonische Quelle
  des prozeduralen Ablaufs" benannte Ort ist der einzige nicht mitgepflegte: (a) `/codify`
  schreibt Regeln laut `:410` nach `CLAUDE.md`/Guidelines – beide stehen jetzt unter einem harten
  Deckel; (b) die YAGNI-Gate-Regel `:419` (siehe voriges Finding); (c) die Registry „Invarianten
  laufend grün halten" `:461-479` listet genau diese Sorte Invariante (Task=Issue, nie auf `main`,
  Worktrees, Hooks installiert, yq-Seam) – „@import-Kontext unter dem Deckel halten" fehlt.
  Lesson #176 plus die Faustregel zwei Zeilen darüber („taucht eine Regel mehrfach auf, beim
  Update **alle** synchronisieren").
- [x] [`scripts/checks/tests/run-tests.sh:1055`, `docs/factory/lessons/code-style.md:57`] Der
  Sweep der nach `lessons/testing.md` verschobenen Exhaustiveness-Regel ist zwei Treffer kurz
  (ADR-033 und `lessons/frontend-react.md` wurden korrigiert). `run-tests.sh:1055` nennt den
  Abschnittstitel wörtlich als in `testing-standards.md` liegend – in einer Datei, die dieser PR
  um über 300 Zeilen erweitert. *Verifiziert:* `testing-standards.md` komplett gelesen, der
  Abschnitt ist bis auf die Auslagerungs-Notiz weg.
- [x] [`docs/adr/047-…md` §4/§Konsequenzen, `CLAUDE.md:197-201`] Governance-Ort: der Deckel ist
  nur als `pre-push`-Gate dokumentiert, hat faktisch aber ein zweites, server-seitiges Bein –
  eine einzelne Assertion in `run-tests.sh` (Test 1), die über den required Check
  `factory-self-test` läuft. *Verifiziert:* das ist genau das Muster, das
  [ADR-041](../docs/adr/041-config-validation-ci-required-check.md) für `config-validation-check.sh`
  als fragil verworfen hat („eine einzelne Testzeile …, die *zufällig* das reale
  `factory.config.yml` gegen das Gate laufen lässt"); ADR-047 erwähnt ADR-041 nicht. Zweite
  Hälfte: `CLAUDE.md:198` sagt „blockiert einen Push fail-closed" – für einen umgehbaren Hook
  (`--no-verify`) dieselbe Überclaim-Klasse, die K2 zwei Bildschirmzeilen darüber beseitigt hat.
  **In diesem PR zu tun:** beides dokumentieren (CI-Bein + ADR-041-Spannung + Hook umgehbar). Der
  eigene Required-Check ist out-of-scope und als Issue #328 angelegt.
- [x] [`scripts/checks/tests/run-tests.sh:7574`] Der Gegen-Guard zu K3 ankert auf dem
  inhaltsleeren Fragment `"kanonisch in"` – es trägt keine der bewachten Semantiken (nicht
  Labels, nicht Schwelle, nicht `git-workflow.md`). *Verifiziert (Mutation):* Kurzregel 7 durch
  „Irgendetwas anderes, kanonisch in einer Datei." ersetzt → Guard bleibt **grün**, obwohl der
  Verweis weg ist. Siebtes Vorkommnis des Fragment-Anker-Rezidivs. Fix: auf `nie aus dem
  Gedächtnis` + `„GitHub-Labels"` ankern.
- [x] [`tasks/task-319-…md:165-171`, `:99`, `:176`] Die Task-Datei widerspricht sich selbst: der
  Abschnitt „Bekannte Grenze des Deckel-Checks" behauptet weiter „Erkannt wird nur … eine Zeile
  besteht ausschließlich aus `@<pfad>`" und begründet den Token-Scanner als YAGNI – 60 Zeilen
  weiter unten beschreiben die Rework-Notizen genau diesen Scanner als umgesetzt. Zusätzlich
  steht zweimal „1358 grün" (Vor-Rework-Stand, aktuell 1390). Die Datei muss **vor** dem Merge
  stimmen, danach ist sie nur über einen neuen PR änderbar (CLAUDE.md-Guardrail).
- [x] [PR #327, Abschnitt „Entscheidung"] Der PR-Body trägt weiter die Ein-Kriterien-Formulierung
  („wenn ein Gate/Hook/Ruleset sie fail-closed erzwingt. Wo sie **nur** durch Gelesenwerden
  wirkt, bleibt sie geladen") und listet in derselben Tabelle `architecture-principles.md` als
  „raus", obwohl ADR §2 dort „nicht erzwungen" einträgt. Dritte Fundstelle desselben Fixes aus
  Iteration 1 (Lesson #264); der Body ist laut AC7 selbst ein Liefergegenstand und wird von
  keinem Commit-Schritt nachgezogen (Lesson #233).
- [x] [`docs/factory/kleinfunde.md:224-227`] Der im selben PR angelegte Eintrag trägt einen
  falschen Zeilen-Anker und behauptet, er sei verifiziert: die Branch-Tabelle liegt bei **28-37**,
  nicht bei 22-32 (22-24 ist der `Closes`-Absatz). *Verifiziert:* Zeilen 20-38 mit Nummern
  gelesen. Genau die codifizierte Regel #291 (`kleinfunde.md`-Eintrag mit `Datei:Zeile`-Ankern
  braucht denselben Drift-Check) plus #268 („verifiziert" ohne Prüfung). Der Anker war wörtlich
  aus dem Iteration-1-Report übernommen – Lesson #315.
- [x] [`scripts/checks/tests/run-tests.sh:7297`] WHY-Kommentar nennt die alte Herleitungs-Basis:
  „849 + 25 %, aufgerundet auf 50" über einer Zeile, die mit 860 rechnet. Der Rework hat Skript,
  Grep-Assertion und Arithmetik auf 860 gehoben, den Kommentar nicht.
- [x] [`scripts/checks/import-context-limit-check.sh:70-96`] `refs_of()` ist prozess-teuer und
  unnötig verschachtelt: pro Zeile `printf | tr | grep`, pro Token zusätzlich ein `sed` – bei 860
  Zeilen ≈ 2.580 Prozesse, obwohl nur 13 Zeilen überhaupt ein `@` enthalten. *Gemessen* (drei
  Läufe): 2,9 s, davon 2,5 s `sys`; ein awk-Prototyp mit einem Lauf je Datei liefert dasselbe
  Ergebnis (860) in 0,03 s. Dieselbe Umstellung beseitigt zugleich die unquotierte
  Command-Substitution (`for token in $(…)` unterliegt Pathname-Expansion – heute folgenlos, aber
  der Smell aus `clean-code.md` §Portabilität) und macht die drei Fälle zu drei expliziten Regeln
  statt `case`-in-`case`.

## Nitpicks (optional)

- [x] [`import-context-limit-check.sh:28`] Header-Absatz beginnt mit „**Nicht erkannt:**" und
  erklärt dann, dass der Fall **doch** gezählt wird – die Überschrift widerspricht dem Absatz.
  „Nicht unterschieden:" träfe es.
- [x] [`import-context-limit-check.sh:31`] Die Asymmetrie der Pfad-Auflösung ist nicht benannt:
  für Form 1 ist sie fail-closed (rot), für Form 2 fail-open (still ungezählt).
- [x] [`import-context-limit-check.sh:75-82`] Eine `@`-Annotation am Zeilenanfang in einer
  importierten Datei (`@media (prefers-color-scheme: dark)`, `@param …`) macht den Push rot mit
  irreführender Meldung – und `clean-code.md`/`testing-standards.md` sind Dateien mit
  Code-Beispielen. Fail-closed, also unkritisch; entfällt mit dem Form-1-Fix oben.
- [x] [`import-context-limit-check.sh:90`] Die Satzzeichen-Abschneidung zählt eine Form, die
  Claude Code **nicht** lädt (`@docs/x.md.` mit Satzpunkt → geprüft: `NICHT_GELADEN`). Overcount
  in fail-closed-Richtung, aber der Header liest sich, als spiegele er das Ladeverhalten.
- [x] [`run-tests.sh:7299`] Die Herleitungs-Basis `860` und `125/100`/`50` stehen numerisch im
  Test, zwölf Zeilen unter einem Kommentar, der genau das verbietet („Grenze aus dem Skript lesen,
  statt sie im Test zu duplizieren"). Basis aus dem Kommentar lesen → eine numerische Pflegestelle.
- [x] [`run-tests.sh:7335`] Label „Ausgabe nennt die **größten** Beiträger namentlich" prüft nur
  Präsenz eines Namens; das `sort -rn` ist unassertiert (im Fixture gibt es nur einen Beiträger).
- [x] [`run-tests.sh:7422-7427`] Test 11 legt `docs/gross.md` nicht selbst an, sondern lebt vom
  Rest aus Test 9 – Reihenfolge-Abhängigkeit gegen `testing-standards.md` → Test-Isolation. Eine
  Zeile behebt es.
- [x] [`run-tests.sh:7480-7484`] Die awk-Blockisolation der Mutation endet an
  `/^# ─── Check 7:/`. Wird der Deckel später der letzte Check, läuft sie still bis EOF
  (Klasse #255) – zusätzlich auf einen generischen `# ─── `-Trenner abbrechen.
- [x] [`run-tests.sh:7518-7523`] Die Trigger-Assertionen ankern die vollständige
  Beschreibungsprosa; eine reine Umformulierung macht sie rot unter einem Label, das nur die
  Existenz des Triggers behauptet. Ein Satz zum Fehlalarm-Modus spart der nächsten Runde die
  Fehlspur.
- [x] [`run-tests.sh:7580`] Der letzte K2-Guard ist ein `assert_absent` auf **eine** exakte alte
  Wortfolge – er verhindert das Rezidiv dieser Formulierung, nicht die Fehlerklasse.
- [ ] [`run-tests.sh:7463-7472`] Die drei git-Zeilen und der Runner des E2E-Scaffolds sind
  zeilengleich zu `:3310-3316` (`run_prepush_149`). Ein eigenes Scaffold ist hier **berechtigt**
  (die vorhandenen `_mk_pipe_repo`/`commit_310` liegen im yq-Zweig und hätten eine
  yq-Abhängigkeit in den Deckel-Test getragen) – ein gemeinsamer `mk_prepush_repo <dir> <branch>`
  wäre trotzdem der nächste Schritt.
- [x] [`run-tests.sh:7541-7550`] „Verlustfreie Migration" ist nur über die Präsenz dreier
  Titel-Phrasen belegt, ohne Byte-Rekonstruktion (Lesson #196) – die Byte-Summe steht nur in der
  Task-Datei, nicht im Test.
- [x] [`CLAUDE.md:146`] Kurzregel 8 behauptet unbedingt „der Worktree enthält eine Kopie von
  `.env.local`"; der Volltext kennt zwei Einschränkungen (`FACTORY_WT_SKIP_ENV=1`; Quelle ist
  `$FACTORY_DIR`, das selbst keine Datei haben muss). Verkürzung in fail-safe-Richtung, „in der
  Regel" wäre korrekt.
- [x] [`docs/specs/spec-319-…md:186-196`, `tasks/task-319-…md:283-286`] Alle drei „Offenen Fragen"
  stehen weiter offen („→ in `/architecture` entscheiden"), obwohl ADR-047 sie beantwortet und in
  §Begründung selbst schreibt „(offene Frage der Spec, damit beantwortet)". Direkter Widerspruch
  innerhalb des PRs (#253).
- [x] [`CONTRIBUTING.md:71`] „Typecheck und Format laufen als lokale pre-push-Gates" nennt zwei
  von sechs Checks – vorbestehend unvollständig, dieser PR ist der dritte Zuwachs seit der
  Formulierung. Ein „u. a." oder ein Verweis auf die Hook-Tabelle entschärft es.
- [ ] [`.claude/commands/review.md`] ADR §2 gibt `architecture-principles.md` den Trigger
  „`/architecture`, `/review`"; im Skill selbst steht er nur für `/architecture`
  (`architecture.md:26`). Kein Falschanspruch, aber `refactor.md:8` zeigt das stärkere Muster –
  bräuchte den `.claude/**`-Patch-Workflow.

## Positives

- **Die drei Kritisch-Findings der Iteration 1 sind in der Substanz behoben** – jedes einzeln
  gegengeprüft, nicht anhand der Behauptung: Inline-Imports werden gezählt, die
  Hook-vs-Ruleset- und `commit-msg`-Behauptungen stimmen jetzt, und ADR-047 §3 ist mit den acht
  Kurzregeln in `CLAUDE.md` eins zu eins deckungsgleich (Inhalt **und** Reihenfolge).
- **K3 ist architektonisch die richtige Wahl, und die Folgekosten sind gedeckt.** Alle drei
  issue-anlegenden Skills tragen die Label-Literale und den Seam-Aufruf inline und verweisen mit
  Datei + Abschnittsnamen auf die kanonische Quelle – für einen Agenten ohne Vorwissen
  ausführbar. Der schärfste Teil ist sogar technisch erzwungen: `create-issue.sh` verwirft
  `factory::`-Labels fail-closed. Keine Regel fällt durch alle drei Netze.
- **Der E2E-Verhaltenstest ist vorbildlich gebaut:** Blockade **und** Durchlass, Mutation über
  denselben Pfad, plus eine eigene Assertion, die belegt, dass die Mutation überhaupt gegriffen
  hat (macht den awk-Block nicht-still-wirkungslos). Lokale Git-Identität explizit gesetzt
  (Lesson #265) – läuft damit auch identitätslos in CI.
- **Mutationsbelege sind echte Kausalitätsbelege:** fünf unabhängige Mutationen des Skripts gegen
  eine Standalone-Extraktion des Blocks (Sieb entfernt → 2 rot; Satzzeichen-Strip entfernt →
  1 rot; Form-1-Zweig entfernt → 3 rot; `seen`-Dedup entfernt → 1 rot) röteten jeweils genau die
  zuständigen Assertions, ohne Kollateral.
- **Der `sed`→`awk index()`-Wechsel beim Trigger-Mutationsbeleg** ist die Selbstanwendung des
  eigenen Findings: BSD-`sed` lehnt `**Laden bei:**` ab, der „Beleg" hätte still nichts geprüft.
- **Alle Messzahlen belegt:** Baseline-Tabelle der ADR gegen `git show origin/main:<datei>`
  geprüft (1.410, Guidelines-Block 865, „469 von 865 = 54 %"), Ist-Stand 860 =
  238+344+131+54+93, identisch zur Gate-Ausgabe und zur Herleitungsbasis; AC7-Zahlen in
  Task-Datei und PR-Body stimmen.
- **AC5 unabhängig bestätigt:** beide verdichteten Guidelines vollständig gelesen – jede Regel
  (Zyklus, Granularität, Faustregel >3 Klassen, „Was TDD nicht bedeutet", AAA, Test-Namen,
  Mocking, Isolation, Flaky, Coverage, ADR-040) ist vorhanden; entfallen ist nur
  Rationale/Illustration.
- **Gate-Ökosystem konsistent:** Check 6 ist strukturell identisch zu den Nachbarn 4 und 5
  (Existenz-Guard, `FACTORY_DIR`-Durchgabe, Output-Capture, Skip-mit-Warnung); die einzige
  bewusste Abweichung trägt ihren WHY. Die kanonische Check-Liste in der Hook-Tabelle ist
  mitgepflegt und per Test bewacht.
- **Die #212-AK10-Kopplung wurde beim Verschieben gesehen:** ein bestehender Test grept
  `.coverage-tmp` in `testing-standards.md` – deshalb bleibt die ADR-040-Regel dort als Kurzregel,
  nur Begründung und Vorfall wandern. In der Auslagerungs-Notiz erklärt.
- **`refs_of` ist portabel und robust:** läuft unter bash 3.2.57 und GNU-bash identisch; leere
  Datei, Datei ohne Schluss-Newline (`|| [ -n "$line" ]`), CRLF, Verzeichnis-Token, `@~/pfad` –
  alle korrekt behandelt. `pre-push.sh` hat sein exec-Bit zurück.
- Link-Check über alle geänderten `*.md`: **kein toter relativer Link**.

## Out-of-Scope-Funde (nicht in diesem PR)

- **Oberhalb der Schwelle → Issue [#328](https://github.com/nothra/tch-gastro-services/issues/328)**
  („@import-Kontext-Deckel als eigenen CI-Required-Check verankern", `enhancement` +
  `tech-debt` + `factory-pipeline`, über den Seam `scripts/lib/create-issue.sh` angelegt): Der
  Deckel schreibt die Sichtbarkeits-Lücke fort, die ADR-041 für `config-validation` geschlossen
  hat. Braucht einen eigenen CI-Job **und** eine Ruleset-Änderung nach ADR-029 (Adminrechte,
  menschlicher Schritt) – daher eigener Task.
- **Unterhalb der Schwelle → `docs/factory/kleinfunde.md`:** der `claude/`-Präfix-Eintrag aus
  Iteration 1 bleibt (Zeilen-Anker wird im Rework korrigiert, siehe Wichtig-Findings).

## Empfehlung

NEEDS_REWORK

---

## Rework-Stand (Runde 2, nach dem Report)

Das Kritisch und alle 17 Wichtig behoben, 14 von 16 Nitpicks. Offen bleiben bewusst zwei: ein
gemeinsamer `mk_prepush_repo`-Helfer für die zwei pre-push-E2E-Scaffolds (das eigene Scaffold ist
berechtigt – die vorhandenen Repo-Helfer liegen im yq-Zweig und hätten eine yq-Abhängigkeit in den
Deckel-Test getragen) und der `/review`-Trigger für `architecture-principles.md` im Skill selbst
(braucht den `.claude/**`-Patch-Workflow, und die `CLAUDE.md`-Trigger-Liste trägt ihn bereits).
Begründungen je in den Rework-Notizen der Task-Datei.

Der Follow-up zum eigenen CI-Required-Check ist Issue
[#328](https://github.com/nothra/tch-gastro-services/issues/328). Suite danach: **1421 grün,
0 rot** (vor den `/test`-Ergänzungen, die neun weitere Assertions hinzugefügt haben). @import-Kontext: **863 von 1100 Zeilen** (Deckel-Lauf 0,08 s statt 2,9 s).

Zwei Defekte in den **eigenen neuen Guards** fielen erst im GREEN-Lauf auf und sind behoben: ein
selbstreferenzieller Content-Scan (die Suchphrase stand als Literal in der gescannten Datei, der
Guard war damit immer rot) und ein Anker, der mit `-` begann und von `grep` als Option gelesen
wurde. Letzteres ist ein Defekt der geteilten Helfer `assert_contains_286`/`assert_absent` (kein
`--` vor dem Pattern) und als Kleinfund erfasst – dritter Fall derselben Regel aus `clean-code.md`
in dieser Task.
