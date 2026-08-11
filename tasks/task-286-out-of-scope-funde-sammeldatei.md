# Task 286: out-of-scope-funde-sammeldatei

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

`/review`, `/security-review` und `/codify` legen Out-of-Scope-Funde heute **unbedingt** als
GitHub-Issue an (Seam `scripts/lib/create-issue.sh`, ADR-018 §5). Bei sieben Skills pro Task
entsteht daraus mehr als ein neues Factory-Issue pro Task – der Tracker wächst schneller als
die App (Juli 2026: 38 App- gegen 57 Factory-Commits).

Funde **unterhalb einer Schwelle** wandern künftig in die Sammeldatei
`docs/factory/kleinfunde.md`; nur der Mensch promoviert daraus Issues. Merge-Blocker, echte
Sicherheitsrisiken und reproduzierbare Defekte bleiben unverändert beim Seam.

Spec: [`docs/specs/spec-286-kleinfunde-sammeldatei.md`](../docs/specs/spec-286-kleinfunde-sammeldatei.md)

## Akzeptanzkriterien

### Schwelle und ihre Verortung
- [x] GIVEN jemand sucht die Regel „Issue oder Sammeldatei" WHEN er `git-workflow.md`
      §„Zentraler Anlage-Weg (ADR-018)" liest THEN findet er die vollständige
      Schwellen-Tabelle (4 Zeilen: Merge-Blocker / echtes Sicherheitsrisiko / reproduzierbarer
      Defekt / alles andere).
- [x] GIVEN die Tabelle steht in `git-workflow.md` WHEN man das Repo durchsucht THEN existiert
      sie genau einmal – Skills, ADR-018 und `kleinfunde.md` verweisen nur darauf.
- [x] GIVEN ein Fund ist nicht eindeutig zuzuordnen WHEN der Skill klassifiziert THEN gilt die
      dokumentierte Zweifelsregel „im Zweifel Issue".
- [x] GIVEN die Entscheidungshilfe „Ist der Auslöser in diesem Repo herstellbar?" WHEN die
      Schwellen-Doku gelesen wird THEN steht sie als Abgrenzungskriterium dabei.

### Verhalten der drei Skills
> Patch [`tasks/patch-286.diff`](patch-286.diff) angewendet (2026-08-11) – Durchsetzung ist
> prompt-Ebene (ADR-043 Decision 5), verifiziert über den Doku-Guard in `run-tests.sh`.
- [x] GIVEN `/review` findet ein Out-of-Scope-Nitpick unterhalb der Schwelle WHEN der Skill
      seiner Doku folgt THEN ergänzt er `kleinfunde.md` und ruft **nicht**
      `create_issue_idempotent` auf.
- [x] GIVEN `/security-review` findet ein echtes, ausnutzbares Sicherheitsrisiko WHEN der
      Skill seiner Doku folgt THEN legt er unverändert ein Issue mit Aspekt-Label `security`
      über den Seam an.
- [x] GIVEN `/review` oder `/codify` findet einen funktionalen Defekt mit reproduzierbarem
      Auslöser WHEN der Skill seiner Doku folgt THEN legt er unverändert ein Issue an.
- [x] GIVEN ein kritisches Finding **im** Scope des laufenden PR WHEN es gemeldet wird THEN
      bleibt es Merge-Blocker – weder Issue noch Sammeldatei-Eintrag.
- [x] GIVEN eine der drei Skill-Dokus WHEN man sie liest THEN steht die Klassifikations-
      Anweisung **vor** dem `create_issue_idempotent`-Aufrufblock.

### Sammeldatei
- [x] GIVEN der PR ist gemergt WHEN `git ls-files docs/factory/kleinfunde.md` läuft THEN ist
      die Datei im Repo, mit den vier Einträgen aus #279, #280, #282, #283 inhaltlich
      unverändert.
- [x] GIVEN ein Skill trägt einen Fund ein WHEN er dem Schema folgt THEN enthält der Eintrag
      eine Überschrift **ohne** laufende Nummer plus die Felder Wo (`Datei:Zeile` mit
      Verifikationsdatum), Was, Fix (mit Aufwandsschätzung), Herkunft.
- [x] GIVEN eine Fundstelle steht bereits in `kleinfunde.md` WHEN ein Skill sie eintragen will
      THEN prüft er das per Suche vorab und legt keinen zweiten Eintrag an.
- [x] GIVEN ein Eintrag wächst über „unter zehn Zeilen" WHEN das auffällt THEN ist die
      dokumentierte Regel, ihn zu einem Issue zu promovieren.
- [x] GIVEN ein erledigter Eintrag WHEN er abgearbeitet ist THEN wird er gelöscht, nicht
      abgehakt.

### Doku-Nachzug
- [x] GIVEN ADR-018 §5 beschreibt die unbedingte autonome Anlage WHEN der PR gemergt ist THEN
      nennt §5 die Schwelle und verweist für die Tabelle auf `git-workflow.md`.
- [x] GIVEN `git-workflow.md:157-158` beschreibt „ebenso legen die Skills … autonom darüber
      an" WHEN der PR gemergt ist THEN ist die Prosa auf den bedingten Stand nachgezogen.

### Test (Doku-Guard in `run-tests.sh`)
- [x] GIVEN die Suite läuft WHEN der Guard je Skill-Datei prüft THEN assertiert er
      **Präsenz**: Datei nennt `docs/factory/kleinfunde.md` und verweist auf die Schwelle in
      `git-workflow.md`.
- [x] GIVEN die Suite läuft WHEN der Guard je Skill-Datei prüft THEN assertiert er
      **Abwesenheit** der unbedingten Issue-Anweisung, verankert an der echten
      Anweisungszeile (kein Kommando-Fragment, keine nie feuernde Alternative).
- [x] GIVEN die Abwesenheits-Assertion WHEN sie geschrieben ist THEN ist per Mutation belegt,
      dass die alte, unbedingte Formulierung den Test rot macht.
- [x] GIVEN die Suite läuft WHEN der Guard `git-workflow.md` prüft THEN assertiert er, dass
      die Schwellen-Tabelle dort existiert (kein dangling reference).
- [x] GIVEN die Guards `run-tests.sh:1012` (#82) und `run-tests.sh:961` (#207) WHEN die Suite
      läuft THEN bleiben beide grün – der Seam-Aufruf verschwindet nicht, er wird bedingt.
- [x] GIVEN die vollständige Bash-Testsuite WHEN sie läuft THEN ist sie grün. (900 grün / 0 rot,
      verifiziert 2026-08-11 nach Patch-Anwendung; zusätzlich `pre-commit.sh` inkl. `pnpm lint`
      grün geprüft)

## Fehlerszenarien
- [x] `kleinfunde.md` fehlt/nicht schreibbar → Fund im jeweiligen Report vermerken, nicht
      still verlieren. (Nachtrag per zweitem Patch [`tasks/patch-286b.diff`](patch-286b.diff),
      2026-08-11 – Lücke beim ersten Review-Durchgang gegen die Spec-Fehlerszenarien selbst
      gefunden und sofort geschlossen, s. u.)
- [x] Fund nicht eindeutig klassifizierbar → „im Zweifel Issue".
- [x] Skill läuft mehrfach über denselben Code → Duplikat-Prüfung über die Fundstelle.
- [x] `.claude/**` ist per `settings.json:72` für Direkt-Edits gesperrt → Patch-Workflow
      (#91); Test prüft den Endzustand der committeten Live-Datei, nicht das Patch-Artefakt
      (#212).
- [x] `Write`-Permission-Regeln werden nicht ausgewertet (#224) → Sammeldatei muss im Repo
      existieren, damit Skills sie per `Edit` ergänzen können.

## Technische Notizen

ADR: [`docs/adr/043-schwelle-fuer-autonome-issue-anlage.md`](../docs/adr/043-schwelle-fuer-autonome-issue-anlage.md)
(Status `Proposed` → beim Implementieren auf `Accepted` flippen, Lesson `factory-workflow.md`
aus #197).

Entscheidungen aus `/architecture` (2026-08-11):

5. **Kein Seam für die Sammeldatei** – der Eintrag entsteht als direkter `Edit` des Agenten,
   **kein** `scripts/lib/add-kleinfund.sh` analog zu `create-issue.sh`. Grund: der
   Duplikat-Schlüssel (`Datei:Zeile`) ist nicht maschinenentscheidbar – Zeilennummern driften
   (sagt die Datei selbst), und ein Grep auf den bloßen Pfad über-matcht (Einträge 1 und 2
   betreffen beide `install-hooks.sh`, sind aber verschiedene Funde). Ein Seam wäre in seiner
   Kernfunktion schwächer als das Urteil eines lesenden Agenten.
6. **Eigene ADR statt Umschreiben von ADR-018 §5** – folgt dem Muster von ADR-040 (eigene ADR +
   Hinweis im Statusblock von ADR-018).
7. **Schema-Kontrakt lebt in `kleinfunde.md` selbst**, die Schwellen-Tabelle in
   `git-workflow.md`; die drei Skill-Dokus tragen nur je eine dünne Referenz – weder Schema
   noch Tabelle werden dreifach kopiert.
8. **Durchsetzungsebene ist der Prompt, nicht die Laufzeit** – bewusst so benannt. Der
   Doku-Guard sichert die Anweisung gegen Regression, nicht deren Befolgung.

Reihenfolge-Hinweis für `/implement`: `git-workflow.md` (Tabelle) zuerst, dann ADR-018-Statusblock
und §5, dann die drei Skill-Dokus (Patch-Workflow), zuletzt der Guard in `run-tests.sh` – so
existiert jedes Verweis-Ziel, bevor darauf verwiesen wird.

Entscheidungen aus `/requirements` (2026-08-11, mit dem Menschen abgestimmt):
1. **Ort der Schwellen-Tabelle:** `git-workflow.md` §„Zentraler Anlage-Weg (ADR-018)" – dort
   stehen Anlage-Weg und Label-Konvention bereits kanonisch, alle drei Skills verlinken schon
   dorthin.
2. **Eintrags-Schema:** ohne laufende Nummer, Felder Wo/Was/Fix/Herkunft, Duplikat-Prüfung per
   Suche auf die Fundstelle.
3. **Kein Mechanismus gegen „Datei, die niemand liest"** in diesem Task (kein Zähl-Check,
   keine Erinnerungszeile) – bewusst, um keinen neuen Apparat zu bauen.
4. **Testtiefe:** Doku-Guard mit Präsenz **und** Abwesenheit; kein zusätzlicher
   Seam-Verhaltenstest (der Seam ändert sich nicht).

## Offene Fragen
- [x] Exakter Anker der Abwesenheits-Assertion – festgelegt: `statt es nur zu vermerken`
      (review), `damit es auffindbar bleibt` (security-review), `statt es nur im Report zu
      vermerken` (codify) – je die echte, einmalig vorkommende Anweisungszeile aus dem
      Wortlaut vor #286. Mutationsbeleg: `scripts/checks/tests/run-tests.sh` Task-286-Block
      hängt die alte Zeile an eine Fixture-Kopie und belegt, dass dieselbe Erkennung darauf
      positiv feuert (Rotfärbung des Abwesenheits-Guards demonstriert).
- [x] Zeilennummern der vier bestehenden `kleinfunde.md`-Einträge gegen den aktuellen Stand
      geprüft (2026-08-11): `install-hooks.sh:46-47`/`:51`, `hooks-installed-check.sh:94`,
      `run-tests.sh` `hi_repo()` bei `:4101` / Fixture-Commit bei `:4170`, `ADR-009:69`/`:187`
      – keine Drift seit 05./06.08.2026, Verifikationsdaten unverändert korrekt.

## Blocker
- [x] Blocker [2026-08-11]: `.claude/commands/{review,security-review,codify}.md` sind per
      `settings.json` (`Edit(.claude/**)` in `deny`) für Direkt-Edits gesperrt (#91-Patch-
      Workflow). Die Klassifikations-Anweisung (Schwelle vor `create_issue_idempotent`-Block)
      liegt deshalb als geprüfter Patch in [`tasks/patch-286.diff`](patch-286.diff) vor
      (`git apply --check` erfolgreich gegen alle drei Dateien, einzeln und kombiniert). **Der
      Mensch muss** `git apply tasks/patch-286.diff` ausführen (oder dem Agenten einen
      expliziten Bash-Grant dafür erteilen); danach sind die neuen `#286`-Doku-Guards in
      `run-tests.sh` (Präsenz + Abwesenheit je Skill-Doku) grün. Bis dahin bleiben genau diese
      9 Assertions erwartungsgemäß rot – alle anderen Tests (inkl. Mutationsbeleg) sind grün.

## Review-Findings
Siehe [`tasks/review-286.md`](review-286.md) – Empfehlung **APPROVED**. Zwei Wichtige Findings
(Mutationsbeleg nicht beweiskräftig; Fehlerfall-Satz dreifach kopiert statt zentralisiert,
ADR-043 Decision 4) wurden noch in derselben Review-Sitzung gefixt (dritte Patch-Runde
`tasks/patch-286c.diff` für die Skill-Dokus, direkte Edits für `run-tests.sh`/`kleinfunde.md`).
Drei Nitpicks dokumentiert und bewusst nicht behoben (Begründung im Report). Suite danach
erneut grün: 900/900, `pre-commit.sh` + `pre-push.sh` grün.

## Test-Ergebnis
Siehe [`tasks/coverage-286.md`](coverage-286.md). Testing-Persona-Audit fand 7 AK ohne
direkte Assertion (Tabellenzeilen-Inhalt, Eindeutigkeit, Aspekt-Label `security`, Scope-
Blocker-Sätze, Bestandseinträge, Schema-Felder einzeln) – alle sieben ergänzt. Dabei ein
weiterer echter Bug im neuen Guard selbst gefunden und gefixt: ein `grep -qF`-Mehrwort-Check
brach an einem Markdown-Zeilenumbruch (bekannte Lesson-Falle) – gelöst über einen
zeilenumbruch-toleranten `flat_286()`-Helper statt Prosa umzuschreiben. Zusätzlich neu: Guard
für die zentrale Reihenfolge-Anforderung (Klassifikation steht vor `create_issue_idempotent`)
inkl. eigener Mutations-Negativkontrolle. Endstand: **925 grün, 0 rot**; `pre-commit.sh` +
`pre-push.sh` grün.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/286-out-of-scope-funde-sammeldatei`
Erstellt: 2026-08-11 19:31
