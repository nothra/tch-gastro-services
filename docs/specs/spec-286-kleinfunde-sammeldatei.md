# Spec: Out-of-Scope-Funde der Review-Skills in eine Sammeldatei statt autonom als Issue

## Kontext

`/review`, `/security-review` und `/codify` legen Out-of-Scope-Funde heute **unbedingt** als
GitHub-Issue an (Seam `scripts/lib/create-issue.sh`, ADR-018 §5). Die Skill-Dokus weisen das
ohne jede Schwelle an:

- [`.claude/commands/review.md:66`](../../.claude/commands/review.md) – „Lege es autonom über
  den zentralen Seam an – statt es nur zu vermerken"
- [`.claude/commands/security-review.md:62`](../../.claude/commands/security-review.md)
- [`.claude/commands/codify.md:53`](../../.claude/commands/codify.md)

Bei sieben Skills pro Task entsteht daraus im Schnitt mehr als ein neues Factory-Issue pro
Task. Messung aus Issue #286 (Stand 2026-08-06, `main`): Juli 2026 stehen 38 App-Commits
(`app/ db/ lib/ e2e/`) gegen 57 Factory-/CI-Commits (`scripts/ .github/ .claude/
docs/factory/`); über die letzten 20 Commits 3 gegen 17. Der Tracker wächst schneller als
die App.

Zwei belegte Kaskaden:

1. **Die #268-Kette** `#262 → #265 → #268 → #276 → #278, #279, #280, #281, #282` – fünf
   Folge-Issues über fünf Review-Runden zu **einem** Git-Hook. Bei der Aufarbeitung am
   2026-08-06 waren drei davon (#278, #279, #281) auf eine Prämisse gebaut, die in diesem Repo
   nicht existiert (`core.hooksPath` in keinem Scope gesetzt, kein husky, `isTemplate=false`,
   0 Forks, ein Collaborator). #281 vermerkte seine eigene Unbelegtheit im Text. Alle fünf
   wurden als *not planned* geschlossen.
2. **Der #258-Lauf** erzeugte am Merge-Tag drei neue Factory-Issues: #283 (`/review` Runde 3),
   #284 (`/security-review`), #285 (`/codify`).

Netto: 5 abgeräumt, 3 im selben Zeitraum nachgelegt. Abräumen kommt gegen die Erzeugungsrate
nicht an, solange die Rate nicht sinkt.

Die Sammelstelle [`docs/factory/kleinfunde.md`](../factory/kleinfunde.md) wurde bei der
#268-Aufarbeitung bereits angelegt und mit vier überführten Einträgen (aus #279, #280, #282,
#283) gefüllt; sie liegt lokal im Worktree, aber **noch nicht im Repo**.

## Scope

**Inbegriffen:**

- **Schwellen-Tabelle als kanonische Einzelquelle** in
  [`docs/factory/guidelines/git-workflow.md`](../factory/guidelines/git-workflow.md), als
  Unterabschnitt beim bestehenden §„Zentraler Anlage-Weg (ADR-018)". Dort stehen Anlage-Weg
  und Label-Konvention bereits kanonisch, und alle drei Skill-Dokus verweisen schon heute
  dorthin – es entsteht kein vierter Verweis-Ort.
- **Klassifikations-Anweisung in den drei Skill-Dokus** (`review`, `security-review`,
  `codify`): Fund gegen die Schwelle klassifizieren; unterhalb → Eintrag in
  `docs/factory/kleinfunde.md`, oberhalb → unverändert `create_issue_idempotent` über den
  Seam. Die Schwelle selbst wird **referenziert, nicht kopiert**.
- **`docs/factory/kleinfunde.md` committen** – mit den vier vorhandenen Einträgen, überführt
  in das unten festgelegte Eintrags-Schema.
- **Eintrags-Schema ohne laufende Nummer:** Überschrift = Kurztitel; darunter die Felder
  **Wo** (`Datei:Zeile` + Verifikationsdatum), **Was**, **Fix** (inkl. Aufwandsschätzung),
  **Herkunft** (Issue/Skill-Lauf). Vor dem Anhängen prüft der Skill per Suche auf die
  Fundstelle, ob der Eintrag schon existiert.
- **ADR-018 §5 nachziehen** – dort steht die unbedingte autonome Issue-Anlage als Mechanik
  beschrieben (Lesson `factory-workflow.md`: PR ändert die von einer ADR namentlich
  beschriebene Mechanik → ADR im selben PR mitpflegen, aus #211).
- **`git-workflow.md` §„Zentraler Anlage-Weg" Prosa nachziehen** – der Satz „ebenso legen die
  Skills `codify`/`review`/`security-review` Out-of-Scope-Funde autonom darüber an"
  (`git-workflow.md:157-158`) beschreibt den alten, unbedingten Stand.
- **Doku-Guard in `scripts/checks/tests/run-tests.sh`** mit Präsenz- **und** Abwesenheits-
  Assertions (Details unter „Akzeptanzkriterien").

**Nicht inbegriffen:**

- Keine Änderung an `scripts/lib/create-issue.sh` – der Seam bleibt kanonisch für alle Fälle
  oberhalb der Schwelle und ändert sein Verhalten nicht.
- Kein Deckel auf `/codify` bzw. den Lessons-Index (Verdichten statt Anhängen) – verwandtes
  Problem, eigener Scope.
- Keine Einordnung der bereits offenen Factory-Issues – Handarbeit, nicht Teil dieser Task.
- **Kein Mechanismus gegen „Datei, die niemand liest"** (kein Zähl-Check, keine
  Erinnerungszeile in `OPERATING.md`) – bewusste Entscheidung: Einträge werden mitgenommen,
  wenn die betroffene Datei ohnehin angefasst wird. Zusätzlicher Apparat wäre genau die
  Aufwandsklasse, die diese Task reduzieren soll.
- Keine laufende Nummerierung der Einträge und keine Referenzierbarkeit einzelner Einträge
  von außen.

## Akzeptanzkriterien

### Schwelle und ihre Verortung

- [ ] GIVEN ein Entwickler oder Agent sucht die Regel „welcher Fund wird Issue, welcher
      Sammeldatei-Eintrag" WHEN er `docs/factory/guidelines/git-workflow.md` §„Zentraler
      Anlage-Weg (ADR-018)" liest THEN findet er die vollständige Schwellen-Tabelle mit den
      vier Zeilen: Merge-Blocker im aktuellen PR → sofort beheben, kein Issue; echtes
      Sicherheitsrisiko (ausnutzbar, Secret-/Auth-/Zahlungs-Pfad) → Issue über den Seam;
      funktionaler Defekt mit reproduzierbarem Auslöser → Issue; alles andere (Nitpick,
      Doku-Drift, hypothetischer Zustand, „unter zehn Zeilen") → Sammeldatei.
- [ ] GIVEN die Schwellen-Tabelle steht in `git-workflow.md` WHEN man das Repo nach ihren
      Zeilen durchsucht THEN existiert sie **genau einmal** – die drei Skill-Dokus, ADR-018
      und `kleinfunde.md` verweisen darauf, ohne die Tabelle zu wiederholen.
- [ ] GIVEN ein Fund lässt sich nicht eindeutig zuordnen WHEN der Skill klassifiziert THEN
      gilt die dokumentierte Zweifelsregel „im Zweifel Issue" – die Schwelle ist einseitig
      fail-safe zugunsten des Trackers, damit kein echter Sicherheitsfund in einer Textdatei
      landet.
- [ ] GIVEN die Entscheidungshilfe aus der #268-Aufarbeitung („Ist der Auslöser in diesem
      Repo herstellbar?") WHEN die Schwellen-Doku gelesen wird THEN steht sie als
      Abgrenzungskriterium dabei: ein Fund, dessen Prämisse hier nicht existiert, ist
      Sammeldatei-Eintrag, kein Task.

### Verhalten der drei Skills

- [ ] GIVEN `/review` findet ein Out-of-Scope-Nitpick unterhalb der Schwelle WHEN der Skill
      seiner Doku folgt THEN ergänzt er `docs/factory/kleinfunde.md` und ruft **nicht**
      `create_issue_idempotent` auf.
- [ ] GIVEN `/security-review` findet ein echtes, ausnutzbares Sicherheitsrisiko WHEN der
      Skill seiner Doku folgt THEN legt er unverändert ein Issue über
      `create_issue_idempotent` mit Aspekt-Label `security` an – die Sammeldatei ist für
      diesen Fall ausdrücklich nicht vorgesehen.
- [ ] GIVEN `/review` oder `/codify` findet einen funktionalen Defekt mit reproduzierbarem
      Auslöser WHEN der Skill seiner Doku folgt THEN legt er unverändert ein Issue über den
      Seam an.
- [ ] GIVEN ein kritisches Finding **im** Scope des laufenden PR WHEN `/review` bzw.
      `/security-review` es meldet THEN bleibt es Merge-Blocker und wird sofort behoben –
      weder Issue noch Sammeldatei-Eintrag (unverändertes Verhalten).
- [ ] GIVEN eine der drei Skill-Dokus WHEN man sie liest THEN steht die Klassifikations-
      Anweisung **vor** dem `create_issue_idempotent`-Aufrufblock, sodass der Aufruf
      erkennbar an die Bedingung „oberhalb der Schwelle" geknüpft ist.

### Sammeldatei

- [ ] GIVEN der PR ist gemergt WHEN man `git ls-files docs/factory/kleinfunde.md` ausführt
      THEN ist die Datei im Repo und enthält die vier überführten Einträge aus #279, #280,
      #282 und #283 – inhaltlich unverändert (Fundstellen, Fix-Skizzen, Herkunftsangaben,
      Verifikationsdaten).
- [ ] GIVEN ein Skill trägt einen neuen Fund ein WHEN er dem in `kleinfunde.md` dokumentierten
      Schema folgt THEN enthält der Eintrag eine Überschrift ohne laufende Nummer sowie die
      Felder Wo (`Datei:Zeile` mit Verifikationsdatum), Was, Fix (mit Aufwandsschätzung) und
      Herkunft.
- [ ] GIVEN ein Fund an einer Fundstelle, die bereits in `kleinfunde.md` steht WHEN ein Skill
      ihn eintragen will THEN prüft er das vorab per Suche auf die Fundstelle und legt keinen
      zweiten Eintrag an.
- [ ] GIVEN ein Eintrag wächst über „unter zehn Zeilen" hinaus WHEN das beim Durchsehen
      auffällt THEN ist die dokumentierte Regel, ihn zu einem Issue zu promovieren – die
      Sammeldatei ist keine Endlagerstätte für Aufwand.
- [ ] GIVEN ein erledigter Eintrag WHEN er abgearbeitet ist THEN wird er gelöscht, nicht
      abgehakt (bestehende Regel im Dateikopf bleibt).

### Doku-Nachzug

- [ ] GIVEN ADR-018 §5 beschreibt heute die unbedingte autonome Issue-Anlage WHEN der PR
      gemergt ist THEN nennt §5 die Schwelle und verweist für die Tabelle auf
      `git-workflow.md`, ohne sie zu kopieren.
- [ ] GIVEN `git-workflow.md:157-158` beschreibt heute „ebenso legen die Skills … autonom
      darüber an" WHEN der PR gemergt ist THEN ist die Prosa auf den bedingten Stand
      nachgezogen.

### Test (Doku-Guard in `scripts/checks/tests/run-tests.sh`)

- [ ] GIVEN die Testsuite läuft WHEN der neue Guard je Skill-Datei (`review`,
      `security-review`, `codify`) prüft THEN assertiert er **Präsenz**: die Datei nennt
      `docs/factory/kleinfunde.md` und verweist auf die Schwelle in `git-workflow.md`.
- [ ] GIVEN die Testsuite läuft WHEN der Guard je Skill-Datei prüft THEN assertiert er
      **Abwesenheit**: keine unbedingte Anweisung mehr, jeden Out-of-Scope-Fund als Issue
      anzulegen. Der Guard ankert an der echten Anweisungszeile, nicht an einem
      Kommando-Fragment, und darf keine nie feuernde Alternative enthalten (Lesson
      `factory-workflow.md` „Reihenfolge-/Präsenz-Guards", zuletzt Rezidiv in #258 Runde 3).
- [ ] GIVEN die Abwesenheits-Assertion soll etwas beweisen WHEN sie geschrieben ist THEN ist
      per Mutation belegt, dass ein Zurückdrehen auf die alte, unbedingte Formulierung den
      Test rot macht.
- [ ] GIVEN die Testsuite läuft WHEN der Guard `git-workflow.md` prüft THEN assertiert er,
      dass die Schwellen-Tabelle dort vorhanden ist (Verweis-Ziel existiert – kein dangling
      reference, analog zum bestehenden ADR-029-Guard bei `run-tests.sh:~1020`).
- [ ] GIVEN die bestehenden Guards `#82: /$sk-Skill-Doku weist den create_issue-Aufruf an`
      (`run-tests.sh:1012`) und `#207: /$sk-Skill nutzt create_issue_idempotent`
      (`run-tests.sh:961`) WHEN die Suite nach der Änderung läuft THEN bleiben beide grün –
      der Seam-Aufruf verschwindet nicht, er wird nur bedingt.
- [ ] GIVEN die vollständige Bash-Testsuite WHEN sie nach der Änderung läuft THEN ist sie
      grün (keine Regression in den bestehenden ADR-018-Assertions).

## Fehlerszenarien

- [ ] `docs/factory/kleinfunde.md` fehlt oder ist nicht schreibbar → der Skill verliert den
      Fund **nicht** still: er vermerkt ihn im jeweiligen Report (`tasks/review-<id>.md`,
      Security-Report, `tasks/codify-<id>.md`) und weist auf die fehlgeschlagene Ablage hin.
- [ ] Ein Fund ist nicht eindeutig klassifizierbar → „im Zweifel Issue" (siehe AK oben), damit
      das Risiko aus dem Issue-Body (echte Sicherheitsfunde verschwinden in einer Textdatei)
      nicht eintritt.
- [ ] Ein Skill läuft mehrfach über denselben Code (Review-Iteration, Pipeline-Retry) → die
      Duplikat-Prüfung über die Fundstelle verhindert doppelte Einträge, analog zur
      Idempotenz-Absicht von `create_issue_idempotent`.
- [ ] `.claude/**` ist per `settings.json:72` (`Edit(.claude/**)` in `deny`) für Direkt-Edits
      gesperrt → die Skill-Doku-Änderungen laufen über den Patch-Workflow (Lesson
      `factory-workflow.md`, aus #91). Ein Test zu einer `.claude/**`-Patch-Lieferung prüft den
      Endzustand der committeten Live-Datei, nicht das transiente Patch-Artefakt (aus #212).
- [ ] `docs/**` ist per `settings.json:58` für `Edit` freigegeben, `Write`-Regeln werden von
      Claude Code aktuell nicht ausgewertet (Lesson `factory-workflow.md`, aus #224) → die
      Sammeldatei muss im Repo **existieren**, damit ein Skill sie per `Edit` ergänzen kann.
      Das ist ein weiterer Grund, sie in diesem PR zu committen und nicht erst beim ersten
      Fund anlegen zu lassen.

## Offene Fragen

- [ ] Exakte Formulierung der Abwesenheits-Assertion (welche Zeile ist der Anker): hängt vom
      finalen Wortlaut der drei Skill-Dokus ab und wird in `/implement` festgelegt. Die
      Anforderung „ankert an der echten Anweisungszeile + Mutation belegt Rotfärbung" ist
      oben als AK verbindlich.
- [ ] Ob die vier bestehenden Einträge beim Überführen ins nummernlose Schema inhaltlich
      angefasst werden müssen (Zeilennummern sind seit dem 05./06.08.2026 verifiziert, könnten
      aber gedriftet sein): beim Committen kurz gegenprüfen und das Verifikationsdatum
      entsprechend setzen.
