# Task 286: out-of-scope-funde-sammeldatei

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
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
- [ ] GIVEN jemand sucht die Regel „Issue oder Sammeldatei" WHEN er `git-workflow.md`
      §„Zentraler Anlage-Weg (ADR-018)" liest THEN findet er die vollständige
      Schwellen-Tabelle (4 Zeilen: Merge-Blocker / echtes Sicherheitsrisiko / reproduzierbarer
      Defekt / alles andere).
- [ ] GIVEN die Tabelle steht in `git-workflow.md` WHEN man das Repo durchsucht THEN existiert
      sie genau einmal – Skills, ADR-018 und `kleinfunde.md` verweisen nur darauf.
- [ ] GIVEN ein Fund ist nicht eindeutig zuzuordnen WHEN der Skill klassifiziert THEN gilt die
      dokumentierte Zweifelsregel „im Zweifel Issue".
- [ ] GIVEN die Entscheidungshilfe „Ist der Auslöser in diesem Repo herstellbar?" WHEN die
      Schwellen-Doku gelesen wird THEN steht sie als Abgrenzungskriterium dabei.

### Verhalten der drei Skills
- [ ] GIVEN `/review` findet ein Out-of-Scope-Nitpick unterhalb der Schwelle WHEN der Skill
      seiner Doku folgt THEN ergänzt er `kleinfunde.md` und ruft **nicht**
      `create_issue_idempotent` auf.
- [ ] GIVEN `/security-review` findet ein echtes, ausnutzbares Sicherheitsrisiko WHEN der
      Skill seiner Doku folgt THEN legt er unverändert ein Issue mit Aspekt-Label `security`
      über den Seam an.
- [ ] GIVEN `/review` oder `/codify` findet einen funktionalen Defekt mit reproduzierbarem
      Auslöser WHEN der Skill seiner Doku folgt THEN legt er unverändert ein Issue an.
- [ ] GIVEN ein kritisches Finding **im** Scope des laufenden PR WHEN es gemeldet wird THEN
      bleibt es Merge-Blocker – weder Issue noch Sammeldatei-Eintrag.
- [ ] GIVEN eine der drei Skill-Dokus WHEN man sie liest THEN steht die Klassifikations-
      Anweisung **vor** dem `create_issue_idempotent`-Aufrufblock.

### Sammeldatei
- [ ] GIVEN der PR ist gemergt WHEN `git ls-files docs/factory/kleinfunde.md` läuft THEN ist
      die Datei im Repo, mit den vier Einträgen aus #279, #280, #282, #283 inhaltlich
      unverändert.
- [ ] GIVEN ein Skill trägt einen Fund ein WHEN er dem Schema folgt THEN enthält der Eintrag
      eine Überschrift **ohne** laufende Nummer plus die Felder Wo (`Datei:Zeile` mit
      Verifikationsdatum), Was, Fix (mit Aufwandsschätzung), Herkunft.
- [ ] GIVEN eine Fundstelle steht bereits in `kleinfunde.md` WHEN ein Skill sie eintragen will
      THEN prüft er das per Suche vorab und legt keinen zweiten Eintrag an.
- [ ] GIVEN ein Eintrag wächst über „unter zehn Zeilen" WHEN das auffällt THEN ist die
      dokumentierte Regel, ihn zu einem Issue zu promovieren.
- [ ] GIVEN ein erledigter Eintrag WHEN er abgearbeitet ist THEN wird er gelöscht, nicht
      abgehakt.

### Doku-Nachzug
- [ ] GIVEN ADR-018 §5 beschreibt die unbedingte autonome Anlage WHEN der PR gemergt ist THEN
      nennt §5 die Schwelle und verweist für die Tabelle auf `git-workflow.md`.
- [ ] GIVEN `git-workflow.md:157-158` beschreibt „ebenso legen die Skills … autonom darüber
      an" WHEN der PR gemergt ist THEN ist die Prosa auf den bedingten Stand nachgezogen.

### Test (Doku-Guard in `run-tests.sh`)
- [ ] GIVEN die Suite läuft WHEN der Guard je Skill-Datei prüft THEN assertiert er
      **Präsenz**: Datei nennt `docs/factory/kleinfunde.md` und verweist auf die Schwelle in
      `git-workflow.md`.
- [ ] GIVEN die Suite läuft WHEN der Guard je Skill-Datei prüft THEN assertiert er
      **Abwesenheit** der unbedingten Issue-Anweisung, verankert an der echten
      Anweisungszeile (kein Kommando-Fragment, keine nie feuernde Alternative).
- [ ] GIVEN die Abwesenheits-Assertion WHEN sie geschrieben ist THEN ist per Mutation belegt,
      dass die alte, unbedingte Formulierung den Test rot macht.
- [ ] GIVEN die Suite läuft WHEN der Guard `git-workflow.md` prüft THEN assertiert er, dass
      die Schwellen-Tabelle dort existiert (kein dangling reference).
- [ ] GIVEN die Guards `run-tests.sh:1012` (#82) und `run-tests.sh:961` (#207) WHEN die Suite
      läuft THEN bleiben beide grün – der Seam-Aufruf verschwindet nicht, er wird bedingt.
- [ ] GIVEN die vollständige Bash-Testsuite WHEN sie läuft THEN ist sie grün.

## Fehlerszenarien
- [ ] `kleinfunde.md` fehlt/nicht schreibbar → Fund im jeweiligen Report vermerken, nicht
      still verlieren.
- [ ] Fund nicht eindeutig klassifizierbar → „im Zweifel Issue".
- [ ] Skill läuft mehrfach über denselben Code → Duplikat-Prüfung über die Fundstelle.
- [ ] `.claude/**` ist per `settings.json:72` für Direkt-Edits gesperrt → Patch-Workflow
      (#91); Test prüft den Endzustand der committeten Live-Datei, nicht das Patch-Artefakt
      (#212).
- [ ] `Write`-Permission-Regeln werden nicht ausgewertet (#224) → Sammeldatei muss im Repo
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
- [ ] Exakter Anker der Abwesenheits-Assertion – hängt vom finalen Wortlaut der Skill-Dokus
      ab, wird in `/implement` festgelegt (Anforderung „echte Anweisungszeile + Mutation
      belegt Rotfärbung" ist als AK verbindlich).
- [ ] Beim Committen kurz gegenprüfen, ob die Zeilennummern der vier bestehenden Einträge seit
      dem 05./06.08.2026 gedriftet sind, und das Verifikationsdatum entsprechend setzen.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/286-out-of-scope-funde-sammeldatei`
Erstellt: 2026-08-11 19:31
