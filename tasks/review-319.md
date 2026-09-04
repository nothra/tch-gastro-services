# Review: Task 319

> Stand: `ea73b33` · Diff-Scope `origin/main...HEAD` · drei Runden (Logik, Code-Qualität,
> Architektur) sequenziell, je eigener Sub-Agent mit Lesezugriff.
>
> **Verifikation der Runden:** Jede Kritisch-/Wichtig-Einstufung mit einer überprüfbaren
> Verhaltensbehauptung wurde im Orchestrator-Kontext **eigenständig nachvollzogen** (Lesson
> #314) – nicht dem Agenten-Report vertraut. Wie, steht je Finding unter „Verifiziert".

## Kritische Findings (müssen behoben werden)

- [x] **[`scripts/checks/import-context-limit-check.sh:70`] Der Deckel ist per Inline-`@import`
  in Prosa lautlos umgehbar – und ADR-047 §4 verspricht das Gegenteil.** Der `sed`-Ausdruck
  erkennt nur Zeilen, die **ausschließlich** aus `@<pfad>` bestehen. Ein `@pfad` mitten in einem
  Satz wird von Claude Code trotzdem geladen, vom Deckel aber nicht gezählt; ein Pfad mit
  Leerzeichen ebenfalls nicht.
  *Begründung:* ADR-047 §4 macht Fail-closed zur ausdrücklichen Anforderung („Ist eine
  `@`-referenzierte Datei nicht lesbar, ist der Check rot – sonst umgeht eine Umbenennung den
  Deckel lautlos") und behauptet, „den **gesamten** `@import`-Kontext" zu begrenzen; der PR-Body
  wiederholt das. Ein Governance-Gate, das gegen eine Prosa-Konvention („Imports stehen auf
  eigener Zeile") gebaut ist, reproduziert genau den Fehlermodus, gegen den es gebaut wurde –
  ADR-037 wollte den Kontext ebenfalls per Konvention schlank halten und lief auf 341 Zeilen.
  Die Auslassung war beim Implementieren eine bewusste YAGNI-Entscheidung (Task-Notiz „Bekannte
  Grenze"); sie ist es nicht, weil sie den Unterschied zwischen fail-closed und fail-open macht.
  *Fix (eine von zwei Richtungen, bewusst entscheiden):* (a) Muster auf jedes `@`-Token
  ausweiten, das auf eine **lesbare Datei auflöst** – npm-Scopes wie `@serwist/next`,
  `@neondatabase/serverless`, `@types/node` (die real in `PROJECT-CONTEXT.md` stehen) und Prosa
  wie „@importiert" fallen durch dieses Sieb, weil sie auf keine Datei zeigen; plus Test für
  beide Formen. Oder (b) die Wirkungsbehauptung in ADR §4 **und** PR-Body auf „Zeilen-Imports"
  einschränken und die Lücke unter §Konsequenzen als Restrisiko führen. Nicht bleiben darf die
  Kombination „starke Behauptung + belegte Umgehung".
  *Verifiziert:* Fixture `CLAUDE.md` = „Siehe @docs/geheim.md fuer das Codewort.",
  `docs/geheim.md` = Marker `XYLOPHON-4711`; `claude --print --disallowedTools Read,Bash,…`
  antwortete `XYLOPHON-4711`. Negativkontrolle mit derselben Zeile **ohne** `@` → `NICHT_GELADEN`.
  Zweite Probe: `@docs/mit datei.md` (5 Zeilen) → Check meldet „✓ 1 von 1100 Zeilen", exit 0.

- [x] **[`CLAUDE.md:134`, `docs/adr/047-…md:67`] Zwei falsche Erzwingungs-Behauptungen – im
  immer geladenen Kontext und im tragenden ADR-Kriterium.** (a) Kurzregel 1 schreibt
  „(pre-push-Hook lokal, Ruleset `protect-main` serverseitig, **beide fail-closed**)". Die
  kanonische Quelle sagt das Gegenteil: `git-workflow.md` → „Dieser Hook ist jedoch nur
  **lokales** Feedback und umgehbar (`--no-verify`, zweiter Clone, CI-Token)" und „Hook =
  schnelles lokales Feedback, Ruleset = verbindliche Grenze"; `CLAUDE.md:176-178` sagt es
  40 Zeilen weiter unten selbst richtig. (b) ADR-047 §2 führt in der Spalte „Erzwungen durch"
  den `commit-msg`-Hook auf – der prüft **kein** Commit-Format: `commit-msg-check.sh:11-12`
  („Eine allgemeine Formatprüfung (Conventional Commits) … bewusst NICHT Teil dieses Hooks"),
  `:78` vergleicht ausschließlich gegen `--help`/`-h`.
  *Begründung:* Beides ist dieselbe Fehlerklasse (falsche Kausal-/Erzwingungs-Kette), und genau
  diese ist als Lesson codifiziert – inkl. der Regel, den Fix per Grep auf die
  Geschwister-Stellen im selben PR auszuweiten, statt nur die gemeldete Zeile zu fixen
  (`lessons/code-style.md`, aus #264, Rezidiv in Runde 3). Inhaltlich schwerer wiegt (a): eine
  Kurzregel, die den Hook zur verbindlichen Grenze erklärt, macht `--no-verify` harmlos
  aussehen – der Verdichtungs-Auftrag war, Regeln **nicht** in ihrer Verbindlichkeit zu
  verändern (AC5), hier ist sie überzeichnet statt abgeschwächt. Zusätzlich ist (b) der
  Prüfstein des ADR-Kriteriums selbst: fällt die Zelle weg, trägt „erzwungen" für
  `git-workflow.md` eine Zeile weniger.
  *Verifiziert:* beide Quelltexte gelesen (`git-workflow.md` zeilenumbruch-tolerant über
  `tr '\n' ' '`), `commit-msg-check.sh:11-12,78` gelesen.

- [x] **[`docs/adr/047-…md:84-90` ↔ `CLAUDE.md:128-143`, `docs/adr/018-…md`,
  `docs/adr/043-…md`] ADR/Repo-Drift in beide Richtungen: §3 nennt fünf Kern-Kurzregeln,
  umgesetzt sind zehn – und vier davon verletzen ein „ein Ort je Regel", das zwei andere ADRs
  ausdrücklich entschieden haben.** §3 enumeriert „nie direkt auf `main`, Rebase statt Merge,
  Commit-Message-Format, Branch-Typ-Konvention, `Closes #<id>`". Zusätzlich implementiert sind
  Task-ID=Issue (6), die **vollständige** Label-Konvention inkl. `factory-pipeline`-Pfad-Anker
  (7), der Issue-Seam (8) und die Schwellen-Tabelle Issue-vs-Sammeldatei (9). Kollisionen:
  `git-workflow.md` sagt „Die kanonische Label-Liste bleibt allein in diesem Abschnitt",
  ADR-018 wiederholt es, ADR-043 entscheidet „Ein Ort je Regel: Schwelle in `git-workflow.md`,
  Schema in `kleinfunde.md`, Begründung hier" und hat `OPERATING.md` als „dritten Verweis-Ort"
  bewusst verworfen. Keine dieser drei Prosa-Stellen ist im PR nachgezogen.
  Verschärfend: #315 hat für die Label-Aufzählung einen **Registry-Guard** gebaut
  (`run-tests.sh:7004-7022`, `LABEL_DOC_FILES_315` mit sieben Fundstellen, je Präsenz +
  Mutationsbeleg) – `CLAUDE.md` steht nicht darin. Die neue achte Kopie ist damit die einzige,
  die jeder Agent immer im Kontext hat, und die einzige, die kein Guard bewacht. Der
  Eindeutigkeits-Guard für die Schwellen-Regel (`run-tests.sh:5502-5504`) greift ebenfalls
  nicht: er zählt `grep -rn 'Fund-Art' docs/ .claude/` – die Repo-Wurzel ist nicht im Scope.
  *Begründung:* Genau dieses Fehlerszenario steht in spec-319 („ADR und Repo-Zustand driften …
  Prüfung: `CLAUDE.md`-`@import`-Block und betroffene Dateien gegen den ADR-Abschnitt
  ‚Entscheidung' spiegeln … hier in beide Richtungen"). Der PR schafft neue, unbewachte
  Normativ-Kopien – während sein eigener Zweck ist, die kanonische Quelle je Regel eindeutig zu
  halten (AC8).
  *Fix:* Entweder Kurzregeln 7 und 9 auf einen **Verweis** zurückschneiden (Regel-Inhalt bleibt
  in `git-workflow.md`, Kurzregel nennt nur „Labels/Schwelle: kanonisch dort, vor Issue-Anlage
  lesen") – oder die Kopien bewusst behalten, dann aber `CLAUDE.md` in `LABEL_DOC_FILES_315`
  aufnehmen (Echo „sieben" → „acht"), die „bleibt allein"-Sätze in `git-workflow.md`/ADR-018 und
  die „ein Ort je Regel"-Sätze in ADR-043 präzisieren und ADR-047 §3 auf die tatsächlichen zehn
  Kurzregeln erweitern (mit Begründung, warum Label/Schwelle doppelt stehen).
  *Verifiziert:* `LABEL_DOC_FILES_315` gelesen (7 Einträge, `grep -c 'CLAUDE.md'` = 0);
  „Die kanonische Label-Liste bleibt allein in diesem Abschnitt." zeilenumbruch-tolerant
  gefunden; ADR-043:59 + :156 gelesen; ADR-047 §3 gegen `CLAUDE.md:128-143` gezählt (5 vs. 10).

## Wichtige Findings (sollten behoben werden)

- [x] [`CLAUDE.md:106-108` ↔ `:116`; `docs/adr/047-…md` §1] Der neu formulierte TL;DR-Satz
  („Eine Guideline verlässt den Dauerkontext, wenn ein Gate/Hook/Ruleset ihre Regeln fail-closed
  erzwingt") trägt die eigene Entscheidung nicht: `architecture-principles.md` wird ausgelagert,
  obwohl ADR-047 §2 in derselben Zeile „– (nicht erzwungen)" einträgt und mit einem **zweiten**
  Kriterium begründet (enger Adressatenkreis + existierender Trigger), das in §1, §Begründung
  und §Konsequenzen nirgends deklariert ist. Wer die ADR beim nächsten Zuwachs anwendet, kann
  diese Entscheidung aus dem genannten Kriterium nicht reproduzieren (Lesson #315: Anker einer
  Klassifizierungsregel ohne Vorhersagekraft; Lesson #322: TL;DR widerspricht dem Detail-Absatz
  im selben, im PR neu verfassten Text). Fix ohne Entscheidungswechsel: §1 und den
  `CLAUDE.md`-Satz auf zwei Bedingungen erweitern.
- [x] [`scripts/checks/tests/run-tests.sh:7399`] Die „Laden bei"-Assertion des Referenz-Guards
  ist **vakuös**: sie steht in der Schleife über beide Dateien, prüft aber einen
  dateiunabhängigen Ausdruck (`grep -qF "Laden bei"` über ganz `CLAUDE.md`) und läuft zweimal
  mit identischem Label. ADR-047 §3 verlangt einen Trigger **je** ausgelagerter Datei und nennt
  diesen Guard als die Absicherung dagegen, dass eine ausgelagerte Datei zur toten Datei wird.
  *Verifiziert (Mutation):* im `architecture-principles.md`-Bullet `**Laden bei:**` entfernt →
  Vorkommen 5 → 4, dieselbe Assertion bleibt **grün**. Fix: Phrase an den zusammenhängenden
  Bullet binden (`guidelines/$g.md` … `Laden bei:` als **eine** Phrase über den geflachten
  Text) + Mutationsbeleg je Datei.
- [x] [`scripts/checks/tests/run-tests.sh:7286`] Test-Label überclaimt: „Konstante trägt eine
  Herleitung im Kommentar" prüft nur, ob das Wort „Herleitung" irgendwo im geflachten Skript
  steht – es steht auch in der Remediation-Ausgabe (`import-context-limit-check.sh:85`).
  *Verifiziert (Mutation):* kompletten Herleitungs-Kommentar gelöscht (`sed '24,28d'`) →
  Assertion bleibt grün, während „849"/„25 %" rot gehen. Lesson #312 (das Label darf nur
  behaupten, was der Prüfausdruck abdeckt). Fix: Anker wählen, der nur im Kommentarblock
  existiert.
- [x] [`scripts/checks/tests/run-tests.sh` #319-Block] Es fehlt der **E2E-Verhaltenstest**, dass
  ein rotes Check-Ergebnis den Push wirklich blockiert. Test 9 prüft die Aufrufzeile (inkl.
  saubere Mutation), aber `FAILED=1` in `pre-push.sh:143` könnte wegfallen, ohne dass die Suite
  rot wird. Lesson „deterministisches Gate braucht E2E-Verhaltenstest, nicht nur Wiring-Grep"
  (#212); Vorbild existiert im selben File (`run_prepush_149`, `run-tests.sh:3311-3324`).
  *Verifiziert:* Probe extern nachgestellt (Kopie von `pre-push.sh` + Check in ein Temp-Root,
  `CLAUDE.md` mit 1200 Zeilen, Test-/Typecheck-/Format-Kommandos auf `true`) → exit 1 mit
  korrekter Meldung. Das Verhalten ist richtig; nur der Test fehlt (~10 Zeilen).
- [x] [`scripts/checks/import-context-limit-check.sh:60-64`, `:77`] Kein eigener Guard für
  Einstiegsdatei und Projektwurzel: fehlt `CLAUDE.md` oder existiert `FACTORY_DIR` nicht, fällt
  der Fall in den *Referenz*-Zweig und die Remediation lautet „Referenz in CLAUDE.md …
  korrigieren" – für eine fehlende `CLAUDE.md` unbrauchbar, und „Projektwurzel nicht erreichbar"
  ist nicht unterscheidbar. Beide Nachbar-Checks lösen das identisch
  (`routes-doc-check.sh:23-31`, `hooks-installed-check.sh:48-51`) – hier entsteht eine dritte
  Schreibweise (Lesson aus #224). Der Test `:7360` prüft nur `exit 1` und würde die Verbesserung
  nicht bemerken; er sollte die Meldung mitprüfen.
- [x] [`scripts/checks/pre-push.sh`] Unbeabsichtigte Modus-Änderung **100755 → 100644**
  (Nebenwirkung des Datei-Rewrites im Implement-Schritt). Kein AC verlangt das; `pre-push.sh`
  ist damit neben `commit-msg-check.sh` das einzige nicht ausführbare Gate-Skript, ein
  Direktaufruf `./scripts/checks/pre-push.sh` schlägt fehl. Bricht aktuell nichts
  (`install-hooks.sh` ruft `bash scripts/checks/pre-push.sh`).
  *Verifiziert:* `git diff --summary origin/main...HEAD` zeigt die Mode-Change-Zeile; `ls -l`
  bestätigt `-rw-r--r--`. Fix: `git update-index --chmod=+x scripts/checks/pre-push.sh`.
- [x] [`docs/factory/guidelines/git-workflow.md:69`] Die kanonische `pre-push`-Check-Liste in der
  Hook-Tabelle ist nicht mitgepflegt – Check 6 (Deckel) fehlt. Genau diese Zeile wurde bei
  #265/#268 beim Hinzufügen eines Checks mitgezogen, sie ist die etablierte Enumeration
  (Lesson #211/#176). Pikanterweise hat der Sweep sie übersehen, weil dieser PR die Datei selbst
  aus dem Dauerkontext genommen hat.
- [x] [`docs/factory/lessons/testing.md:712`] Der byte-identisch übernommene Satz „Coverage-Ziele
  (100 % bei neuem Code, **siehe unten**) werden verfehlt" verliert sein Antezedens: in
  `testing-standards.md` zeigte „unten" auf „Coverage-Anforderungen", in der Lesson steht darunter
  nur noch der ADR-040-Abschnitt. Deixis-Falle aus Lesson #315 – verlustfreie Byte-Migration ist
  genau dort **nicht** verlustfrei, wo der Text auf seinen alten Kontext zeigt. Fix: „siehe
  `testing-standards.md` → Coverage-Anforderungen".
- [x] [`scripts/checks/tests/run-tests.sh:7303,7307,7322,7354,7387,7372`] Vorhandene Helfer
  inline reimplementiert – **6. Vorkommnis** eines mehrfach codifizierten Smells (#240/#267/#310):
  vier Stellen schreiben den Rumpf von `assert_contains_286` (`:66-69`) aus, `:7387` den von
  `assert_absent` (`:76-79`, dessen Doc-Kommentar genau diese ausgeschriebene Form als Grund für
  die Kapselung nennt), `:7372` den von `assert_exit` (`:27`). Ausnahme mit Berechtigung:
  `:7403` braucht `grep -qE` mit `^…$`-Ankern – das gehört als einzeiliger WHY dazu.
- [x] [`scripts/checks/tests/run-tests.sh:7372`] Unbegründete Toleranz auf deterministischem
  Output: `[ "$ic_rc" -le 1 ]` im Zyklus-Test. *Verifiziert:* dasselbe Fixture liefert
  deterministisch „✓ 52 von 1100 Zeilen", exit **0**. `-le 1` bliebe auch grün, wenn der
  Zyklus-Schutz bräche und die Doppelzählung die Grenze reißt – der Test verschenkt genau die
  Aussage, die sein Label behauptet. Lesson #322 (`PROJECT-CONTEXT.md:254`). Fix:
  `assert_exit 0 "$ic_rc" "… terminiert und zählt CLAUDE.md nur einmal (52 Zeilen)"`.
- [x] [`docs/factory/guidelines/testing-standards.md:23-29`] Das verdichtete „Gut"-Beispiel hat
  seinen Beleg verloren: die gelöschte Zeile `const result = z.object({ name: z.string({ error:
  "Name fehlt" }) })…` war die Quelle des Literals „Name fehlt"; der Kommentar „hier via
  deterministische Custom-Message" verweist jetzt auf etwas, das im Snippet nicht mehr steht, und
  `result` ist in beiden Snippets undefiniert. Die Regel steht, ihr Beleg fehlt – in einer
  **dauerhaft geladenen** Datei. Fix: die Zeile wieder aufnehmen (eine Zeile) oder den Kommentar
  anpassen.
- [x] [`CLAUDE.md:174` ff. (Guardrails)] Das neue Push-Gate ist im immer geladenen Kontext nicht
  dokumentiert: der Deckel steht in aktiver Doku nur in `token-efficiency.md:58` – also in der
  Datei, die `CLAUDE.md:117-119` ausdrücklich als „bewusst nie automatisch" geladen ausweist. Für
  den Routen-Doku-Drift-Check steht „blockiert einen Push fail-closed" direkt in den Guardrails
  (#145). Ein `/codify`-Lauf erfährt vom Deckel sonst erst, wenn der Push rot wird – und der
  Remediation-Hinweis des Checks („Volltext → `lessons/`") passt auf Guidelines, nicht auf
  Index-Zeilen-Wachstum. Fix: Guardrail-Einzeiler analog #145 (+ ggf. ein Satz in
  `.claude/commands/codify.md`, dann als `.claude/**`-Patch, AC9 wäre neu zu bewerten).

## Nitpicks (optional)

- [x] [`CLAUDE.md:137`] Kurzregel 4 sagt „vor dem Start **und** vor dem Push `git fetch origin` +
  `git rebase origin/main`". Kanonisch ist vor dem Start `git checkout main && git pull --rebase
  origin main` (auf `main`, nicht als Rebase eines noch nicht existierenden Branches). Außerdem
  fehlt der #249-Vorbehalt (auf einem bereits gepushten Branch rebast kein Zwischenschritt
  eigenständig – das bleibt bei `/pr-shepherd`), der in einer immer geladenen Kurzregel besonders
  relevant ist.
- [x] [`CLAUDE.md:143`] Kurzregel 10 lässt `git worktree prune` weg (kanonisch: „`git worktree
  remove <pfad>` (dann `git worktree prune`)").
- [x] [`CLAUDE.md:135`] Kurzregel 2 behauptet „(erzwungen von `branch-name-check.sh`)", der
  Enforcer erlaubt aber einen neunten Präfix (`claude/`), den die Liste nicht nennt. Die
  vorbestehende Doku-Drift ist als Out-of-Scope-Fund in `docs/factory/kleinfunde.md` erfasst; in
  diesem PR bleibt zu entscheiden, ob die Kurzregel die Deckungs-Behauptung so tragen soll.
- [x] [`docs/adr/047-…md` §Alternativen] Spec-Fehlerszenario 1 verlangt alle **vier** Kandidaten
  × **beide** Achsen (Gate-Risiko, Skalierung). Kandidat 2 (Rollen-Zuschnitt) steht nur in
  §Begründung und nur auf der Gate-Achse; Optionen C und D sind auf der Skalierungs-Achse nicht
  bewertet. Inhaltlich ist die Abwägung vorhanden, formal fehlt sie an zwei Stellen.
- [x] [`scripts/checks/tests/run-tests.sh:7276-7280`] Die Herleitungs-Tests prüfen nur, dass
  „849" und „25 %" im Kommentar stehen. Ein Bump von `MAX_IMPORT_LINES` auf 5000 bliebe grün,
  obwohl die Herleitung dann falsch ist. Eine Konsistenz-Assertion (`849*125/100`, auf 50
  aufgerundet, `== $IC_LIMIT`) wäre eine Zeile.
- [ ] [`docs/adr/047-…md` §4] Der Puffer beträgt 251 Zeilen; das Zurückwachsen, das diesen Task
  ausgelöst hat, war +261 Zeilen (Index ~80 → 341). Der Deckel feuert also erst nach etwa
  demselben Wildwuchs – „ohne den nächsten Wildwuchs zu decken" ist optimistisch formuliert.
- [x] [`scripts/checks/import-context-limit-check.sh:70`] Eine `@pfad`-Zeile in einem Code-Fence
  oder ein absoluter/`~`-Pfad macht den Check **rot** (fail-closed, also unkritisch), obwohl
  Claude Code Fence-Imports ignoriert bzw. absolute Pfade auflöst. Ein Doku-Beispiel in
  `CLAUDE.md` würde damit den Push mit irreführender Meldung blockieren.
- [x] [`scripts/checks/import-context-limit-check.sh:66`] `wc -l` zählt Newlines: eine Datei ohne
  Schluss-Newline wird um 1 unterzählt (Undercount-Richtung). Praktisch vom Prettier-Gate für
  `*.md` abgedeckt, aber der Header verspricht „Summiert die Zeilen".
- [x] [`scripts/checks/import-context-limit-check.sh:59`] Geschachtelte `@`-Pfade werden gegen
  die Projektwurzel aufgelöst, nicht gegen die importierende Datei. Heute latent (keine
  geschachtelten Imports im Repo) und fail-closed – gehört als Header-Zeile dokumentiert.
- [x] [`scripts/checks/import-context-limit-check.sh:85`] `MAX_IMPORT_LINES in $0` gibt beim
  Aufruf aus `pre-push.sh` einen absoluten Worktree-Pfad aus; die Nachbar-Checks nennen stabile
  relative Pfade. Literal `scripts/checks/import-context-limit-check.sh` verwenden.
- [x] [`scripts/checks/pre-push.sh:142`] Die Headline „@import-Dauerkontext über der Grenze –
  push blockiert" ist im Fail-closed-Zweig (nicht lesbare Referenz) unwahr; die echte Ursache
  steht erst in der eingerückten Rohausgabe. Analog Check 5 neutral formulieren.
- [x] [`scripts/checks/tests/run-tests.sh:7275`] Die Kopplungs-Assertion an den realen Repo-Stand
  verwirft die Ausgabe (`>/dev/null 2>&1`). Schlägt sie fehl, fehlt genau die
  `breakdown`-Liste, die sagt, welche Datei zu groß wurde – bei Fehlschlag durchreichen.
- [x] [`scripts/checks/tests/run-tests.sh:7390-7404`] Der Referenz-Guard existiert jetzt in zwei
  Schreibweisen (alt `:1261-1264` direkt auf der Datei, neu `flat_286` + Schleife), und für
  `token-efficiency.md` – ebenfalls nur referenziert, nie importiert – existiert **gar kein**
  Guard. Die neue Schleife auf `git-workflow architecture-principles bash-gotchas
  token-efficiency` erweitern und den Altguard darauf zurückführen.
- [x] [`scripts/checks/tests/run-tests.sh:7293-7295`] Namen ohne Issue-Suffix (`ic()`,
  `mklines()`, `IC_CALL`) in einem Flachskript, dessen Konvention Suffixe nutzt (`flat_286`,
  `scaffold_310`, `name_hits_315`); `IC_CALL` kollidiert semantisch mit `IC_CALL_PIPE` (`:6016`,
  dort „Interrupt-Check"). Zudem begründet der Kommentar „awk statt Bash-Loop (Laufzeit)", während
  die Suite für denselben Zweck bereits `seq 1 N` nutzt (`:3721`, `:3776`).
- [x] [`docs/factory/guidelines/testing-standards.md:5-8`] Die Auslagerungs-Notiz nennt alle drei
  Abschnitte als „ausgelagert"; die ADR-040-Regel bleibt aber (absichtlich) als Bullet unter
  „Coverage-Anforderungen" im File. Das sollte die Notiz sagen, sonst sucht der Leser am falschen
  Ort.
- [x] [`docs/factory/guidelines/testing-standards.md:8` ↔ `PROJECT-CONTEXT.md:224`] Zwei
  divergierende „Laden bei"-Trigger für dieselbe Datei (neu: `/implement`, `/test`, `/review`;
  Index: `/implement`, `/test`). Zweite Quelle für denselben Trigger = Drift-Kandidat.
- [x] [`docs/adr/009-factory-configuration.md:33`, `:185`] „Welche Guidelines gelten | `@import`
  in `CLAUDE.md`" ist nach der Umstellung nur halb richtig, und der dort vorgesehene Punkt
  „`@import`-Block aus der Config speisen" bekommt durch handkuratierte Kurzregeln eine neue
  Wechselwirkung. Ein Satz in ADR-047 §Konsequenzen genügt.
- [x] [`docs/adr/047-…md` §2] Zielgrößen „865 → ~250" / „1.410 → ~800" gegen tatsächlich
  275 / 849 – §2 verweist für die exakte Zahl korrekt auf AC7, die Richtwerte lesen sich nur
  ~6 % optimistisch.

## Positives

- **Der Kern der Entscheidung ist tragfähig und belegt.** Die Drei-Netz-Prüfung über **alle**
  Regelbereiche der ausgelagerten `git-workflow.md` (technisch erzwungen / Kern-Kurzregel /
  Skill lädt sie) ergab: **kein Regelbereich fällt durch alle drei Netze.** Die schwächsten
  Stellen sind folgenarm (der `security`-Label-Vorbehalt aus #50 und „`factory::`-Status-Labels
  nicht von Hand setzen").
- **Kein Regelverlust – unabhängig nachgeprüft.** Runde 1 hat die drei verschobenen Abschnitte
  selbst extrahiert und gegen `origin/main` gediffed (Rümpfe identisch, ≈1198/1532/920 Bytes) und
  den `git diff -U0` beider verdichteter Dateien Zeile für Zeile klassifiziert: keine Regel
  entfallen, keine abgeschwächt. Entfallen ist nur Rationale/Illustration.
- **AC7 vollständig nachgerechnet:** 204+341+131+84+181+390+79 = 1.410 → 230+344+131+54+90 = 849;
  −561 Zeilen (−39,8 %), −2.958 Wörter (−28,4 %); Guidelines-Block 865 → 275 (−68 %).
  Deckel-Herleitung 849 × 1,25 = 1.061 → 1.100 stimmt.
- **Der Deckel ist faktisch serverseitig durchgesetzt – besser als bei den Vergleichs-Checks.**
  `run-tests.sh:7275-7276` ruft ihn **echt gegen den realen Repo-Stand** und assertiert exit 0;
  `factory-self-test` ist required Check (ADR-029). `routes-doc-check`/`hooks-installed-check`
  haben in CI nur einen Verdrahtungs-Grep. Ein eigener CI-Job wäre Benennung, kein
  Wirksamkeitsgewinn.
- **Herleitung driftfest formuliert:** „849" ist explizit auf „Ist-Stand direkt nach der
  Umstellung aus #319" datiert – der Kommentar bleibt wahr, auch wenn der Ist-Stand wächst. Genau
  die Gegenmaßnahme zum codifizierten „Kommentar nennt einen driftenden Wert"-Muster.
- **Testqualität überwiegend hoch:** Summen-Beweis (2 × 733 Zeilen, je allein zulässig),
  Rekursionsbeweis als echter Kausalitäts-Flip, Drift-Guard in beide Richtungen, Referenz-Guard
  auch in der Gegenrichtung („darf nicht mehr importiert sein" / „muss importiert bleiben"),
  Watchdog gegen einen hängenden Suite-Lauf, Grenze aus dem Skript gelesen statt dupliziert – mit
  Fallback-Literal gegen Vakuum-Grün. Kein Vakuum-Grün in Test 12 (gegen `origin/main` geprüft).
- **Skript-Handwerk:** Zyklus-Schutz per `seen`-Liste (Fixture terminiert), keine Doppelzählung,
  Verzeichnis/fehlende Datei fail-closed, String-Worklist mit echtem WHY (bash 3.2 + `set -u`),
  POSIX-BRE ohne `\s`/`\d`/PCRE – konform zu `clean-code.md` §Portabilität, verifiziert unter
  `bash 3.2.57`.
- **Der #211/#176-Sweep ist der Teil, der hier sonst regelmäßig liegen bleibt, und er ist
  gemacht:** ADR-037 durchgestrichen + Verweis (kein `Superseded`), ADR-033 Quellenangabe,
  `token-efficiency.md` §5 auf „drei von fünf" korrigiert, `lessons/frontend-react.md` umgehängt.
  Alle `Datei:Zeile`-Anker der ADR halten (stichprobenartig geprüft).
- **Suite unabhängig nachgelaufen:** 1358 grün, 0 rot (exit 0) – deckt sich mit dem PR-Body.

## Out-of-Scope-Funde (nicht in diesem PR)

- **Unterhalb der Schwelle (ADR-043) → `docs/factory/kleinfunde.md`:** „Branch-Präfix-Tabelle
  nennt `claude/` nicht, der Enforcer erlaubt es" (`branch-name-check.sh:25` gegen
  `git-workflow.md:22-32`, vorbestehende Doku-Drift, Fix eine Tabellenzeile). Eintrag ergänzt.
- Kein Fund oberhalb der Schwelle – kein neues Issue angelegt.

## Empfehlung

NEEDS_REWORK

---

## Rework-Stand (Runde 1, nach dem Report)

Alle 3 Kritisch- und alle 12 Wichtig-Findings behoben, 17 von 18 Nitpicks. Details und die zwei
bewusst getroffenen Weichenstellungen (K1: Muster erweitern statt Behauptung einschränken; K3:
Kurzregeln zurückschneiden statt achte Kopie registrieren) stehen in
[`tasks/task-319-adr-import-kontext-guidelines.md`](task-319-adr-import-kontext-guidelines.md)
unter „Rework-Notizen". Suite danach: **1390 grün, 0 rot**.

**Bewusst offen** (einziger nicht abgehakter Punkt): die Formulierung „ohne den nächsten
Wildwuchs zu decken" für den 240-Zeilen-Puffer in ADR-047 §4. Ein engerer Puffer würde legitime
Regel-Ergänzungen blockieren; der Deckel soll den nächsten Wildwuchs **melden**, nicht jede
Zeile verhandeln. Der Punkt ist eine Kalibrierungs-Einschätzung, kein Defekt.

Beim Rework selbst gefunden und behoben: der erste Mutationsbeleg der Trigger-Assertion
scheiterte still, weil BSD-`sed` das Muster `**Laden bei:**` als Repetition-Operator ablehnt –
ersetzt durch literales `awk index()`. Genau die Fehlerklasse, die Wichtig-Finding 2 adressiert.
