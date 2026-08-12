# Spec: factory-poll-Schedule stilllegen, solange der Auto-Trigger nicht nutzbar ist

## Kontext

Aus dem `/security-review` zu #258 als angrenzendes, nicht durch den PR eingeführtes Risiko
gefunden; Issue #284 (umskopt am 2026-08-06 nach Prüfung der Faktenlage).

`.github/workflows/factory-poll.yml` läuft per `on.schedule` (`cron: "*/30 * * * *"`) **48×
pro Tag**. Jeder Lauf installiert die Runtime mit einem ungepinnten, nicht
integritätsgeprüften `npm install -g @anthropic-ai/claude-code` (`:55`) – der einzigen Stelle
im Repo, die das tut. Die `yq`-Hälfte desselben Schritts ist seit #258 gepinnt und
SHA-256-verifiziert.

Drei im Issue geprüfte Befunde verschieben die Maßnahme von „härten" auf „stilllegen":

1. **Der Job läuft wirklich** – letzte 40 Läufe: 38 `success`, 2 `cancelled`.
2. **`ANTHROPIC_API_KEY` existiert im Repo nicht** (`gh secret list` zeigt nur `E2E_*`,
   `INT_*`, `NEON_*`, `PRD_*`). Zeile 45 setzt eine **leere** Env-Var. Die Kernbegründung des
   Kommentars in `factory-poll.yml:52` („Dieser Job hält ANTHROPIC_API_KEY – ein manipuliertes
   Asset liefe hier mit Secret-Zugriff") trifft damit heute **nicht** zu. Es bleibt
   `contents: write` + `issues: write` auf dem `GITHUB_TOKEN` (`:28-30`), also Repo-Schreib­zugriff
   im selben Prozessraum wie die ungeprüfte Software.
3. **Es hat noch nie ein Issue mit `factory::run` gegeben** (`gh issue list --label factory::run
   --state all` → leer). Ohne API-Key könnte der Poll eine Pipeline ohnehin nicht starten.

Zusammengefasst: Ein Workflow installiert 48× täglich ungepinnte Software mit Repo-Schreibrechten,
um festzustellen, dass es nichts zu tun gibt – und könnte selbst dann nichts tun.

ADR-008 beschreibt den Async-Trigger ausdrücklich als „Default aus; Aktivierung = Schedule +
Labels + Auth-Variable". Ein aktiver Schedule ohne die anderen zwei Bausteine ist also auch
gegen die eigene ADR ein Zwischenzustand.

**Nutzersicht:** Betroffen ist der Betreiber der Factory (Rolle „Maintainer", nicht die
TCH-App-Endnutzer). Gewünschtes Verhalten: Der Poll passiert nicht mehr von selbst, bleibt aber
**auf Knopfdruck verfügbar** und **in einem Schritt reaktivierbar**, sobald der Auto-Trigger
scharfgeschaltet wird.

**Scope-Entscheidung (Nutzer, 2026-08-12):** Nur Maßnahme 1 (Stilllegen) inklusive
Doku-/Kommentar-Nachzug. Maßnahme 2 (Pin + verifizierter Seam für die claude-CLI) wird ein
**eigenes Folge-Issue**, verankert als Vorbedingung in der Scharfschalt-Checkliste.

## Scope

**Inbegriffen:**

- `.github/workflows/factory-poll.yml`: der `on.schedule`-Block (inkl. `cron`-Eintrag) wird
  **entfernt**; `workflow_dispatch` bleibt der einzige Trigger. Kein auskommentierter Block
  (Clean-Code: „Keine auskommentierten Code-Blöcke. Git hat eine History.") – die
  Reaktivierung wird in der Doku beschrieben, nicht als toter YAML-Kommentar konserviert.
- Job, `permissions`, `concurrency`, `env` und beide Steps bleiben **unverändert** – die
  Funktion soll erhalten bleiben, nur der automatische Auslöser verschwindet.
- Datei-Header (`:1-17`): Der Satz „Läuft als GitHub Actions Scheduled Workflow" ist nach der
  Änderung falsch und wird korrigiert; die Einrichtungs-Checkliste (`:10-17`) nennt zusätzlich
  „Schedule wieder aktivieren" als Aktivierungsschritt.
- Kommentar `:50-52`: Die Begründung des yq-Seams behauptet einen Secret-Zugriff, den es
  derzeit nicht gibt (Befund 2). Der Satz wird auf die tatsächlich vorhandene Berechtigungslage
  korrigiert (`contents: write` / `issues: write`), ohne die #258-Begründung als solche zu
  entwerten.
- `scripts/checks/tests/run-tests.sh:454`: Die bestehende Assertion
  `grep -q 'schedule:' "$POLL_YML"` mit dem Text „factory-poll nur als Scheduled Workflow"
  schreibt den alten Zustand fest und wird nach dieser Änderung rot. Sie wird durch einen
  Regressionsguard in der Gegenrichtung ersetzt (siehe AK4/AK5).
- `docs/adr/008-async-trigger-mechanism.md`: Update-Notiz im Kopf – Option A bleibt die
  Entscheidung, aber der Trigger ist bis zum Scharfschalten auf `workflow_dispatch` reduziert.
  Die ADR beschreibt die geänderte Mechanik namentlich, gehört also in denselben PR
  (Lesson `factory-workflow.md`, aus #211).
- `docs/factory/OPERATING.md` §0.4 („Async-Trigger scharfschalten"): Checkliste um die zwei
  jetzt fehlenden Aktivierungsschritte ergänzt – (a) `schedule`-Trigger in `factory-poll.yml`
  wieder eintragen, (b) claude-CLI vorher pinnen/verifizieren (Verweis auf das Folge-Issue).
  §1.3 nennt, dass der Poll derzeit nur manuell per `workflow_dispatch` läuft.
- `CLAUDE.md` (§Pipeline-Übersicht, „Async-Start (optional, ADR-008)"): Der Halbsatz „nur in
  Scheduled Pipelines" beschreibt die geänderte Mechanik und wird nachgezogen.
- **Folge-Issue für Maßnahme 2** anlegen (Art-Label `enhancement`, Aspekt-Label `security`):
  gepinnte, verifizierte claude-CLI-Installation über einen Seam
  `scripts/install-claude-cli.sh` analog `scripts/install-yq.sh`, inkl. Bump-Automatisierung.
  Die Issue-Nummer wird in OPERATING.md §0.4 referenziert.

**Nicht inbegriffen:**

- **Maßnahme 2 selbst** – kein Pin, kein `--ignore-scripts`, kein neuer Installations-Seam,
  keine Dependabot-/Renovate-Konfiguration in diesem PR. Begründung: Nach dem Stilllegen läuft
  der ungepinnte `npm install -g` nur noch bei bewusstem manuellem Dispatch (0 statt 48
  Läufe/Tag); die teurere Härtung wird fällig, wenn der Trigger wieder scharf gestellt wird.
- Löschen des Workflows, des Jobs oder von `scripts/factory-poll.sh` – die Funktion bleibt
  vollständig erhalten.
- Änderungen an der Poll-Logik: Budget-Guard, Label-State-Maschine, Stale-Reaper,
  Tageskappe, `FACTORY_MAX_RUNS_PER_DAY`/`FACTORY_RUN_TIMEOUT` bleiben unangetastet.
- Anlegen oder Entfernen von `factory::`-Labels; Anlegen des `ANTHROPIC_API_KEY`-Secrets.
- Änderungen an anderen Workflows (`factory-ci.yml`, `deploy-gate.yml`, …) oder an
  `scripts/install-yq.sh`.
- Die verwaiste Datei `.issue-npm-pin.md` im Repo-Wurzelverzeichnis (getrackter Entwurf des
  Issue-Bodys). Berechtigter, aber unabhängiger Fund – gehört nach ADR-043 in
  `docs/factory/kleinfunde.md`, nicht in diesen Scope.

## Akzeptanzkriterien

- [ ] **AK1** · GIVEN `.github/workflows/factory-poll.yml` im Zustand nach dem PR
      WHEN der `on:`-Block ausgewertet wird
      THEN enthält er **keinen** `schedule`-Trigger und **keinen** `cron`-Eintrag mehr.

- [ ] **AK2** · GIVEN dieselbe Datei
      WHEN der `on:`-Block ausgewertet wird
      THEN ist `workflow_dispatch` weiterhin vorhanden – der Workflow bleibt manuell auslösbar.

- [ ] **AK3** · GIVEN dieselbe Datei
      WHEN Job-Definition, `permissions`, `concurrency` und die beiden Steps mit dem Stand vor
      der Änderung verglichen werden
      THEN sind sie inhaltlich unverändert (`factory-poll:`-Job, `group: factory-runtime`,
      `contents: write` + `issues: write`, `bash scripts/install-yq.sh`,
      `bash scripts/factory-poll.sh`), und die Datei bleibt valides YAML (`yq`-Parse, wo `yq`
      verfügbar ist – ADR-009).

- [ ] **AK4** · GIVEN die Bash-Selbsttest-Suite `scripts/checks/tests/run-tests.sh`
      WHEN sie gegen den Zustand nach dem PR läuft
      THEN ist die alte Assertion „factory-poll nur als Scheduled Workflow" **nicht mehr**
      vorhanden, und die Suite ist grün (kein rot gebliebener Alt-Guard).

- [ ] **AK5** · GIVEN der neue Regressionsguard aus AK4
      WHEN in `factory-poll.yml` versuchsweise wieder ein `schedule:`-Trigger mit `cron`
      eingetragen wird (Mutationsbeleg)
      THEN wird der Guard rot; und WHEN stattdessen nur eine **Kommentarzeile** mit dem Wort
      `schedule` eingefügt wird, THEN bleibt er grün – der Guard ist an der YAML-Trigger-
      Struktur verankert, nicht an einer Prosa-/Kommentar-Erwähnung (Lesson #114).

- [ ] **AK6** · GIVEN derselbe Guard
      WHEN `factory-poll.yml` nicht lesbar ist (umbenannt/gelöscht)
      THEN schlägt der Guard fehl (fail-closed), statt still zu bestehen (Lesson #214).

- [ ] **AK7** · GIVEN `docs/adr/008-async-trigger-mechanism.md`
      WHEN der Kopf der ADR gelesen wird
      THEN nennt eine Update-Notiz mit Datum, dass der Schedule stillgelegt ist und der
      Trigger bis zum Scharfschalten nur `workflow_dispatch` ist; der Status der ADR bleibt
      **Accepted** und Option A bleibt die getroffene Entscheidung.

- [ ] **AK8** · GIVEN `docs/factory/OPERATING.md` §0.4
      WHEN die Scharfschalt-Checkliste gelesen wird
      THEN enthält sie als eigene Punkte (a) „`schedule`-Trigger in `factory-poll.yml` wieder
      eintragen" und (b) „claude-CLI vorher gepinnt/verifiziert installieren" mit Verweis auf
      das Folge-Issue (AK10).

- [ ] **AK9** · GIVEN `CLAUDE.md` und `docs/factory/OPERATING.md` §1.3
      WHEN die Beschreibung des Async-Starts gelesen wird
      THEN behauptet keine Stelle mehr einen laufenden Schedule („nur in Scheduled
      Pipelines"); beschrieben ist der aktuelle Zustand (manueller `workflow_dispatch`,
      Schedule als Aktivierungsschritt).

- [ ] **AK10** · GIVEN GitHub
      WHEN der PR fertig ist
      THEN existiert ein Folge-Issue für Maßnahme 2 (gepinnte + verifizierte
      claude-CLI-Installation über einen Seam analog `install-yq.sh`) mit Art-Label
      `enhancement` und Aspekt-Label `security`, ohne `factory::run`; seine Nummer ist in
      OPERATING.md §0.4 referenziert.

- [ ] **AK11** · GIVEN der PR-Body
      WHEN er gelesen wird
      THEN enthält er `Closes #284` – #284 gilt mit Maßnahme 1 als erledigt, Maßnahme 2 lebt
      im Folge-Issue weiter.

## Fehlerszenarien

- [ ] **F1 · Reaktivierung bleibt in einem Schritt möglich:** Der Job ist so vollständig
      erhalten, dass das Wiedereinsetzen des `schedule:`-Blocks (plus Secret + Label) den alten
      Zustand herstellt. Kein Umbau von Guard, Env oder Steps, der beim Scharfschalten erst
      rückgängig gemacht werden müsste.
- [ ] **F2 · Manueller Dispatch bleibt funktionsfähig:** Ein `workflow_dispatch` auf dem
      Default-Branch startet den Job unverändert (kein Trigger-Syntaxfehler, kein leerer
      `on:`-Block).
- [ ] **F3 · Guard ohne `yq`:** Läuft die Selbsttest-Suite in einer Umgebung ohne `yq`, wird der
      YAML-strukturelle Teil sauber übersprungen (`skip_yq`, etabliertes Muster) – der
      Kern-Guard aus AK5 muss auch ohne `yq` greifen und darf nicht still ausfallen.
- [ ] **F4 · Kein stiller Rückfall:** Wird der Schedule später ohne Doku-/Checklisten-Nachzug
      wieder eingetragen, macht AK5 den Selbsttest rot – das Wiederaktivieren ist damit eine
      bewusste, sichtbare Handlung.

## Offene Fragen

_Keine._ Die zwei Scope-Entscheidungen (nur Maßnahme 1; Folge-Issue + Doku-Anker für Maßnahme 2)
sind am 2026-08-12 mit dem Nutzer geklärt.

## Referenzen

- Issue #284 · Vorgänger #258, PR #277 · Abräum-Kontext #286
- [ADR-008](../adr/008-async-trigger-mechanism.md) – Async-Trigger (Option A, Scheduled-Poll)
- [ADR-043](../adr/043-schwelle-fuer-autonome-issue-anlage.md) – Schwelle Issue vs. Sammeldatei
- [spec-258](spec-258-yq-checksum-verifikation.md) – schließt andere Downloads explizit aus
- `docs/factory/lessons/factory-workflow.md` – ADR-Nachzug im selben PR (#211);
  Reihenfolge-/Präsenz-Guards ankern an der echten Struktur, nicht an Prosa (#114)
