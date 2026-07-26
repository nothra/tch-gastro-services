# Security Review: Task 224

Geprüft: `git diff origin/main...HEAD` (Branch `fix/224-top-level-yaml-edit-allow`, PR #237).
Fokus: Der Diff ändert ausschließlich `.claude/settings.json` (Permissions-Konfiguration),
einen Bash-Testabschnitt (`scripts/checks/tests/run-tests.sh`), sowie Prosa
(`docs/factory/lessons/factory-workflow.md`, `docs/specs/spec-224-*.md`, Task-Dateien) – kein
App-/Server-Code, keine neuen Dependencies, kein User-Input-Handling. Der klassische OWASP-Top-10-
Katalog (Injection, AuthN/AuthZ, Krypto) ist daher größtenteils nicht anwendbar; der eigentliche
Threat-Surface dieser Änderung ist die **Selbst-Eskalations-/Selbst-Schwächungs-Grenze**, die
`.claude/settings.json` gegenüber einem nicht-interaktiven Stage-3-Agenten durchsetzt (ADR-019 §2/§3,
#88).

## Kritische Findings (Blocker)

Keine.

## Wichtige Findings

- [ ] **[Security Misconfiguration / Least Privilege]** `.claude/settings.json`:
  `Edit(*.yml)`/`Edit(*.yaml)` (und die neuen `Write`-Pendants) sind slash-freie Muster und
  matchen laut Claude-Code-Dokumentation auf **jeder** Verzeichnistiefe (gitignore-Semantik),
  nicht nur im Repo-Root – bereits im Task-File (`tasks/task-224-top-level-yaml-edit-allow.md`,
  Abschnitt „Offene Fragen") recherchiert und dort als „unkritisch" eingestuft. Die Spec adressiert
  aber ausdrücklich nur **„Top-Level-Konfigurationsdateien"** (Titel des Spec-Dokuments) – die
  tatsächlich implementierte Regel ist breiter als der dokumentierte Zweck. Ich habe alle 9
  getrackten `*.yml`/`*.yaml`-Dateien im Repo verifiziert (`git ls-files '*.yml' '*.yaml'`):
  `.github/workflows/*.yml` (bereits über `Edit(.github/workflows/**)` abgedeckt),
  `docker-compose.yml`, `factory.config.yml`, `factory.defaults.yml`, `pnpm-workspace.yaml`
  (alle vier tatsächliche Zieldateien, liegen im Root) und `pnpm-lock.yaml` (per `deny`
  gesperrt) – **aktuell existiert keine ausnutzbare Datei**, die durch die breitere Regel
  unbeabsichtigt neu freigegeben würde. Das Risiko ist damit vorausschauend, nicht akut: **jede
  künftig neu hinzukommende** `*.yml`/`*.yaml`-Datei außerhalb der bereits per Verzeichnis-Glob
  freigegebenen Pfade würde automatisch und unbemerkt editierbar, ohne dass jemand das beim
  Anlegen der neuen Datei bewusst entscheidet.
  **Empfehlung:** Muster auf das Repo-Root verankern (`Edit(/*.yml)`, `Edit(/*.yaml)`,
  `Write(/*.yml)`, `Write(/*.yaml)` – führender Slash). Liefert exakt dasselbe beabsichtigte
  Verhalten für alle vier realen Zieldateien (keine Regression), schließt aber die
  Least-Privilege-Lücke für die Zukunft. Da `.claude/settings.json` für den Agenten hard denied
  ist, müsste die Korrektur erneut über den etablierten Patch-Workflow laufen. **Nicht selbst
  behoben** (Security-Agent-Regel: kein Code schreiben, nur Findings dokumentieren) – Entscheidung
  liegt beim Menschen.

- [ ] **[Security Misconfiguration / Gate-Selbstschwächung, out of scope für diesen PR]**
  Diese Task macht `factory.config.yml`/`factory.defaults.yml` für einen Stage-3-Agenten
  erstmals per `Edit` erreichbar (vorher hart blockiert – exakt der in dieser Task behobene
  Vorfall #222). Das ist der **beabsichtigte Zweck** dieser Task (Spec-Tabelle nennt
  `factory.config.yml` explizit als Zieldatei „ja – Projekt-Overrides (ADR-009)"), aber in
  Kombination mit einer bereits bestehenden Lücke ergibt sich eine neue Angriffsfläche: Ich habe
  `scripts/checks/config-validation-check.sh` gelesen – es validiert die effektive Config nur
  strukturell (`schemaVersion`, `tier ∈ model_tiers`, `max_turns ∈ [1, MAX_TURNS_CEILING=50]`),
  erzwingt aber **keine Mindest-Tier-Schwelle** für sicherheitsrelevante Skills. Ein Agent könnte
  damit z. B. `skills.security-review: { tier: light, max_turns: 1 }` in `factory.config.yml`
  setzen und `config-validation-check.sh` besteht trotzdem – der eigene `/security-review`-Schritt
  (der genau das fangen sollte) wird dadurch **vor seinem eigenen Lauf** geschwächt. Die
  GitHub-Branch-Protection (`protect-main`, ADR-029) verlangt bewusst 0 Approvals (damit
  Auto-Merge funktioniert) – das automatisierte Review ist damit faktisch die letzte Instanz, die
  das noch fängt. Vor #224 war dieser Pfad für einen nicht-interaktiven Agenten technisch
  unerreichbar; nach #224 ist er real.
  **Nicht in diesem PR zu beheben** (separate Business-Logik in `config-validation-check.sh`,
  eigene Akzeptanzkriterien/Tests nötig) – als GitHub-Issue
  [#241](https://github.com/nothra/tch-gastro-services/issues/241) ausgelagert
  (`create_issue_idempotent`, `security`-Aspekt-Label, ADR-018).

## Hinweise

- [ ] `pnpm-lock.yaml` in `deny` ist bewusst **nicht** root-verankert (bare Dateiname, matcht auf
  jeder Tiefe) – für eine `deny`-Regel ist „breiter matcht" die sicherere Richtung (verhindert
  auch ein hypothetisches verschachteltes `pnpm-lock.yaml`, aktuell existiert keins). Keine
  Änderung nötig, nur zur Vollständigkeit dokumentiert (Gegenstück zum ersten Wichtigen Finding).
- [ ] Die bereits aus `/review` bekannten, funktionslosen `Write(...)`-Regeln (Claude Code wertet
  sie nicht aus) sind kein *neues* Sicherheitsrisiko – `Edit(pfad)` deckt Edit **und** Write ab,
  die Deny-Grenze für `.claude/**`/`.env*`/`pnpm-lock.yaml` bleibt über die jeweiligen
  `Edit(...)`-Deny-Einträge vollständig wirksam. Bereits als Issue #240 getrackt.
  Behavioral bestätigt (siehe `tasks/task-224-top-level-yaml-edit-allow.md`, Blocker-Abschnitt).
- [ ] Kein Injection-Risiko im neuen Testcode: alle `jq`-Filter nutzen `--arg` zur
  Parameterübergabe (kein String-Interpolieren von Werten in das jq-Programm), alle geprüften
  Permission-Strings sind feste Literale, kein externer/User-Input fließt ein.
- [ ] Keine Secrets, keine neuen Dependencies, keine Auth-/Krypto-relevanten Änderungen in diesem
  Diff – restlicher OWASP-Prüfkatalog nicht anwendbar (reine Permissions-Config + Doku +
  Bash-Testcode).

## Ergebnis

NEEDS_FIXES

**Begründung:** Kein Blocker. Das erste „Wichtige" Finding (Root-Anker für die neuen
`*.yml`/`*.yaml`-Muster) ist eine kostenlose, regressionsfreie Härtung genau der Regel, die dieser
PR einführt – aktuell nicht akut ausnutzbar (kein passendes Ziel-File existiert), aber leicht vor
dem Merge zu schließen und sollte behoben werden, bevor die #88-Selbst-Eskalations-Grenze durch
weitere Tasks in diesem Bereich weiterwächst. Das zweite Finding (Config-Gate-Tier-Floor) ist
bewusst als separates Issue [#241](https://github.com/nothra/tch-gastro-services/issues/241)
ausgelagert, da es eine eigenständige Änderung an `config-validation-check.sh` mit eigenen
Akzeptanzkriterien erfordert und nicht Teil des #224-Scopes ist.
