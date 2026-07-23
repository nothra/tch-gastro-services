# Spec: Idempotenz-Guard gegen Duplikat-Issues bei Pipeline-Retries

> Requirements-Session 2026-07-23 (Task #207). Betrifft den zentralen Issue-Seam
> `scripts/lib/create-issue.sh` (ADR-018) und dessen Nutzung durch die autonomen
> Pipeline-Skills `/codify`, `/review`, `/security-review`.

## Kontext

`scripts/run-pipeline.sh` → `run_skill()` startet jeden Skill bei Exit ≠ 0 bis zu **3×**
neu (z. B. nach `Reached max turns`). Jeder Retry ist eine **komplett neue** `claude --print`-
Session **ohne Gedächtnis** an vorherige Versuche – das ist beabsichtigtes Stage-3-Design
(deterministische Bash-Orchestrierung nicht-deterministischer Agenten-Schritte). Es setzt
aber voraus, dass jeder Skill-Schritt **idempotent** ist.

Die autonomen Skills `/codify`, `/review`, `/security-review` legen Out-of-Scope-Funde als
GitHub-Issue an – über den zentralen Seam `create_issue` (ADR-018). `create_issue` legt
**bedingungslos** an; es gibt keinen Vorab-Check auf ein bereits existierendes gleichnamiges
Issue. Trifft ein Retry auf denselben (deterministisch aus dem Report abgeleiteten) Fund,
entsteht ein **Duplikat**.

**Beobachtet (Task #187):** `/codify` legte über zwei Retries hinweg zweimal ein identisches
Folge-Issue an – **#204** und **#205** (#205 als Duplikat geschlossen).

Dies ist dieselbe Fehlerklasse wie das bereits codifizierte `/refactor`-Turn-Limit-Problem
(aus #185, „Retry ohne Gedächtnis baut auf halbfertigem Fremd-Stand auf"), hier aber mit
einem **GitHub-API-Seiteneffekt** statt einem Datei-Zustand – bisher nicht abgedeckt, weil
`create_issue` keinen lokalen Dateizustand hat, den ein Retry prüfen könnte.

## Ziel (aus Nutzersicht)

Ein wiederholter Pipeline-Lauf desselben Skills auf denselben Fund erzeugt **kein** zweites
GitHub-Issue mehr. Der wiederholte Aufruf verhält sich für den aufrufenden Skill wie ein
Erfolg (er erhält eine gültige Issue-Nummer), ohne den Backlog mit Duplikaten zu belasten.

## Scope

**Inbegriffen:**
- Ein Idempotenz-Guard, der vor der Anlage prüft, ob bereits ein **offenes** Issue mit
  **exakt gleichem Titel** existiert, und bei Treffer dessen Nummer zurückgibt, statt neu
  anzulegen.
- Wirksam für die drei autonomen Pipeline-Aufrufer: `/codify`, `/review`, `/security-review`
  (die einzige beobachtete Duplikatquelle).
- Fail-open-Verhalten: kann die Duplikat-Prüfung selbst nicht durchgeführt werden, wird
  regulär angelegt (konsistent mit der bestehenden Label-Degradation des Seams).
- Tests, die das Guard-Verhalten (Treffer / kein Treffer / Prüf-Fehler) abdecken – analog
  zur bestehenden Seam-Test-Suite in `scripts/checks/tests/run-tests.sh`.

**Nicht inbegriffen:**
- **Fuzzy-/Ähnlichkeits-Matching** von Titeln. Der Match ist ein exakter Titelvergleich.
  Erzeugt ein Retry (durch Nicht-Determinismus des Agenten) einen abweichenden Titel,
  greift der Guard bewusst nicht – akzeptierte Restlücke.
- **Verhaltensänderung für `start-work.sh` und `sync-issues.sh`.** `start-work.sh` legt
  bewusst je Task ein neues Issue an; `sync-issues.sh --create` dedupt bereits selbst
  (legt nur fehlende an). Beide bleiben unverändert.
- Match gegen **geschlossene** Issues. Ein erledigtes oder abgelehntes (wontfix/duplicate)
  Issue blockiert einen wiederkehrenden Fund nicht.
- Schutz gegen echte **gleichzeitige** Anlage (TOCTOU-Race). Die Pipeline läuft mit
  Concurrency = 1 (Label-Lock) und Retries sind sequenziell – ein Race ist praktisch
  ausgeschlossen und wird nicht adressiert.
- Nachträgliches Zusammenführen/Schließen bereits existierender Duplikate.

## Akzeptanzkriterien

- [ ] **AC1 – Treffer verhindert Duplikat:** GIVEN ein offenes GitHub-Issue mit Titel `T`
  existiert, WHEN ein Pipeline-Aufrufer versucht, ein Issue mit demselben Titel `T` anzulegen,
  THEN wird **kein** neues Issue angelegt und die Nummer des bestehenden offenen Issues auf
  stdout zurückgegeben (Exit 0).
- [ ] **AC2 – Kein Treffer legt regulär an:** GIVEN kein **offenes** Issue mit Titel `T`
  existiert, WHEN ein Pipeline-Aufrufer ein Issue mit Titel `T` anlegt, THEN wird das Issue
  regulär (inkl. Art- und Aspekt-Labels wie bisher) angelegt und dessen Nummer zurückgegeben.
- [ ] **AC3 – Geschlossene Issues blockieren nicht:** GIVEN ein **geschlossenes** Issue mit
  Titel `T` existiert und **kein** offenes mit Titel `T`, WHEN ein Aufrufer ein Issue mit
  Titel `T` anlegt, THEN wird ein **neues** Issue angelegt (der Guard ignoriert geschlossene
  Issues).
- [ ] **AC4 – Retry-Idempotenz (Regressionsschutz):** GIVEN derselbe Fund wird in zwei
  aufeinanderfolgenden Skill-Läufen mit identischem Titel angelegt, WHEN der zweite Lauf
  `create_issue` erreicht, THEN existiert danach **genau ein** offenes Issue zu diesem Titel.
- [ ] **AC5 – Exakter Titelvergleich:** GIVEN ein offenes Issue mit Titel `T` existiert,
  WHEN ein Aufrufer ein Issue mit einem Titel anlegt, der `T` nur als Teilstring enthält
  (oder umgekehrt), THEN wird dies **nicht** als Duplikat gewertet und regulär angelegt.
- [ ] **AC6 – Geltungsbereich begrenzt:** GIVEN der Guard ist aktiv, WHEN `start-work.sh`
  oder `sync-issues.sh` `create_issue` aufrufen, THEN bleibt deren bisheriges Verhalten
  unverändert (kein Guard-Effekt auf diese Aufrufer).

## Fehlerszenarien

- [ ] **F1 – Prüfung nicht durchführbar (fail-open):** GIVEN die Duplikat-Prüfung schlägt
  fehl (gh-Fehler, Auth, Netz, kein `gh`), WHEN ein Aufrufer `create_issue` nutzt, THEN wird
  das Issue **regulär angelegt** (nicht abgebrochen) und eine Warnung auf **stderr**
  ausgegeben. Ein seltenes Duplikat ist akzeptabler als ein verlorener Fund.
- [ ] **F2 – Anlage schlägt weiterhin fail-closed:** GIVEN die eigentliche Issue-Anlage
  scheitert, WHEN `create_issue` nach der Guard-Prüfung anlegt, THEN gilt die bestehende
  Semantik unverändert (Exit ≠ 0 nur, wenn gar kein Issue entsteht; Label-Degradation bleibt).
- [ ] **F3 – stdout-Hygiene:** GIVEN ein Guard-Treffer oder eine fail-open-Warnung, WHEN
  `num=$(create_issue …)` aufgerufen wird, THEN enthält **stdout ausschließlich** die reine
  Issue-Nummer; alle Diagnostik/Warnungen gehen auf stderr (ADR-018 §2 unverändert).

## Offene Fragen

- [ ] **Mechanismus (→ `/architecture`):** Wie wird der Guard auf **nur** die drei Pipeline-
  Aufrufer begrenzt, obwohl alle Aufrufer denselben Seam nutzen? Kandidaten (nicht
  entschieden): Opt-in-Flag/Env, das nur die drei Skill-Snippets setzen; separater
  Wrapper/zweite Funktion; Guard im Seam mit Default-aus. Diese Entscheidung ist in der
  Architektur-Phase zu treffen; ADR-018 ist ggf. zu ergänzen.
- [ ] **Match-Implementierung (→ `/architecture`/`/implement`):** Wie wird der **exakte**
  Titelvergleich robust umgesetzt? `gh issue list --search "in:title …"` ist ein
  Volltext-/Teilstring-Suchindex – der exakte Abgleich (AC5) muss clientseitig gegen den
  Titel der Kandidaten erfolgen, nicht allein über die Suche.

## Referenzen

- ADR-018 – zentraler Issue-Seam `create_issue`
- Auslöser: #204/#205 (Duplikate aus Task #187), verwandt: #185 (Retry-ohne-Gedächtnis-Klasse)
- `docs/factory/guidelines/git-workflow.md` → „GitHub-Labels" (kanonische Label-Liste)
