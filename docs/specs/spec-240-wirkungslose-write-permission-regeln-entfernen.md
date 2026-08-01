# Spec: Wirkungslose `Write(...)`-Permission-Regeln aus `.claude/settings.json` entfernen

## Kontext

Bei der Implementierung von Task 224 (`chore/224-top-level-yaml-edit-allow`) wurde per
`claude --print`-Verhaltensprobe (`FACTORY_STAGE=3`, Claude Code CLI 2.1.218) belegt: Jede
`Write(pfad)`-Regel in `.claude/settings.json` – sowohl in `permissions.allow` als auch in
`permissions.deny` – erzeugt auf stderr die Warnung

> „Permission allow/deny rule (.claude/settings.json): Write(<pfad>) is not matched by file
> permission checks — only Edit(path) rules are. Use Edit(<pfad>) instead (Edit rules cover all
> file-editing tools)."

Ein `Edit(pfad)`-Eintrag deckt also bereits sowohl das Edit- als auch das Write-Tool für diesen
Pfad ab. Die separate `Write(...)`-Liste – seit #88 im Repo, um #224 um die YAML-Symmetrie
ergänzt – ist **komplett wirkungslos**, in beide Richtungen (`allow` und `deny`).

Betroffen sind alle bereits vor #224 vorhandenen Einträge (`Write(app/**)`, `Write(*.ts)` usw.,
aus #88) sowie die in #224 ergänzten (`Write(/*.yml)`, `Write(/*.yaml)`, AK2-Symmetrie).
Funktional unkritisch (kein Sicherheitsrisiko, da die zugehörigen `Edit(...)`-Regeln bereits
greifen), aber jeder Stage-3-Lauf bekommt dadurch unnötige Warnzeilen auf stderr, und die
dead config widerspricht dem Clean-Code-Prinzip (keine wirkungslosen Regeln). Der Cleanup ist in
[`docs/factory/lessons/factory-workflow.md`](../factory/lessons/factory-workflow.md) (Abschnitt
„Permission-Regeln in `.claude/settings.json`", aus #224) bereits als offener Cleanup-Kandidat
(„Issue #240") vermerkt.

**Verifikation im Rahmen dieser Task:** Die installierte CLI-Version ist inzwischen 2.1.220
(vs. 2.1.218 zum Zeitpunkt der #224-Probe) – ein Patch-Level-Delta, kein „größeres Update" im
Sinne der Lesson-Regel. Eine schlanke Bestätigungs-Probe (statt einer vollständigen Neuaufnahme)
reicht, um zu belegen, dass sich das Verhalten nicht geändert hat, bevor die Regeln entfernt
werden.

## Scope

**Inbegriffen:**

- **Verhalten vorab bestätigen:** Kurze `claude --print`-Probe (`FACTORY_STAGE=3`) gegen den
  aktuellen Stand (CLI 2.1.220), die belegt, dass `Write(pfad)`-Regeln weiterhin ignoriert werden
  (gleiche Warnung wie in #224) – bevor sie entfernt werden.
- **`permissions.allow` bereinigen:** Alle 18 `Write(...)`-Einträge entfernen
  (`Write(app/**)`, `Write(lib/**)`, `Write(db/**)`, `Write(e2e/**)`, `Write(types/**)`,
  `Write(scripts/**)`, `Write(docs/**)`, `Write(tasks/**)`, `Write(config/**)`,
  `Write(public/**)`, `Write(.github/workflows/**)`, `Write(*.ts)`, `Write(*.tsx)`,
  `Write(*.mjs)`, `Write(*.json)`, `Write(*.md)`, `Write(/*.yml)`, `Write(/*.yaml)`). Für jeden
  betroffenen Pfad existiert bereits eine `Edit(...)`-Regel (1:1-Abgleich verifiziert) – die
  Schreibfläche ändert sich dadurch **nicht**, nur die dead config verschwindet.
- **`permissions.deny` bereinigen:** Die 3 `Write(...)`-Einträge entfernen
  (`Write(.claude/**)`, `Write(.env*)`, `Write(pnpm-lock.yaml)`) – die zugehörigen
  `Edit(...)`-Deny-Regeln bleiben unverändert und sperren weiterhin vollständig.
- **Lieferung über den Patch-Workflow.** `.claude/**` ist für den Agenten hard denied
  (`Edit(.claude/**)`/`Write(.claude/**)`, #88-Grenze). Die Änderung wird als
  `tasks/patch-240.diff` geliefert, **programmatisch** erzeugt (aus #94: nicht von Hand tippen),
  read-only per `git apply --check` verifiziert, Blocker in der Task-Datei protokolliert.
- **Regressionstest in `scripts/checks/tests/run-tests.sh` anpassen:** Die bestehenden
  Assertions im Abschnitt „#91 Permissions-Konsistenz" und „#224 Top-Level-YAML-Freigabe", die
  bislang das **Vorhandensein** von `Write(...)`-Einträgen fordern (jq-geparste Schleifen für
  `allow`/`deny` sowie der jq-unabhängige Grep-Fallback), werden durch Assertions ersetzt, die
  die **Abwesenheit** jedes `Write(...)`-Eintrags prüfen (Erfolgskriterium des Issues, Punkt 4).
- **Stale Prosa nachziehen:** Der #224-Lesson-Abschnitt in
  `docs/factory/lessons/factory-workflow.md` beschreibt im Präsens, dass die `Write(...)`-Liste
  „existiert" und nennt Issue #240 als offenen „Cleanup-Kandidat" – nach diesem PR ist beides
  überholt und wird im selben PR korrigiert (aus #211/#176: erledigter Follow-up wird in der
  Prosa nachgezogen, nicht stehen gelassen).

**Nicht inbegriffen:**

- **Die `Edit(...)`-Allow-/Deny-Liste selbst.** Sie bleibt unverändert – sie deckt bereits
  Edit- und Write-Tool-Aufrufe ab und ist die alleinige wirksame Regelquelle.
- **Die Root-Anker-Frage (`Edit(*.yml)` vs. `Edit(/*.yml)`).** In #224 entschieden, kein Teil
  dieses Scopes.
- **Weitere Permission-Klassen** (`Bash(...)`-Allow-Liste, Hooks) – nicht betroffen.
- **Ein vollständiges Neuaufsetzen der `claude --print`-Verhaltensdokumentation** über die
  schlanke Bestätigungsprobe hinaus – nur bei einem tatsächlich abweichenden Probe-Ergebnis nötig.

## Akzeptanzkriterien

- [ ] **AK1 – `Write(...)` ist aus `permissions.allow` entfernt:** GIVEN `.claude/settings.json`
      nach Anwenden des Patches WHEN die Liste `permissions.allow` gelesen wird THEN enthält sie
      **keinen** Eintrag, der mit `Write(` beginnt.
- [ ] **AK2 – `Write(...)` ist aus `permissions.deny` entfernt:** GIVEN dieselbe Datei WHEN
      `permissions.deny` gelesen wird THEN enthält sie ebenfalls **keinen** `Write(...)`-Eintrag.
- [ ] **AK3 – Kein Funktionsverlust (Edit-Pendant bleibt für jeden betroffenen Pfad):** GIVEN die
      bereinigte Datei WHEN für jeden entfernten `Write(pfad)`-Eintrag geprüft wird, ob ein
      äquivalenter `Edit(pfad)`-Eintrag in derselben Liste (`allow` bzw. `deny`) existiert THEN
      ist das für **alle** entfernten Einträge der Fall – kein Pfad verliert eine tatsächlich
      wirksame Regel.
- [ ] **AK4 – `settings.json` bleibt valides JSON mit unveränderter Grundstruktur:** GIVEN den
      angewendeten Patch WHEN die Datei geparst wird THEN ist sie syntaktisch valides JSON mit
      `hooks`, `permissions.allow`, `permissions.deny` unverändert vorhanden.
- [ ] **AK5 – Verhaltensprobe bestätigt Wirkungslosigkeit vor der Entfernung:** GIVEN die
      installierte Claude-Code-CLI (2.1.220) WHEN eine `claude --print`-Probe
      (`FACTORY_STAGE=3`) gegen den **Vor-Zustand** (mit `Write(...)`-Regeln) läuft THEN erscheint
      dieselbe „Write(<pfad>) is not matched" -Warnung wie in #224 dokumentiert – als Beleg, dass
      die Entfernung keine reale Schreibfläche verändert.
- [ ] **AK6 – Keine neuen Permission-Prompts nach der Entfernung:** GIVEN die bereinigte Datei
      WHEN derselbe Stage-3-Agent einen zuvor per `Write(pfad)` "erlaubten" Pfad per `Write`-Tool
      anlegt (z. B. eine neue Datei unter `docs/**` oder mit Extension `*.md`) THEN entsteht
      **kein** Permission-Prompt – die `Edit(...)`-Regel deckt den Fall weiterhin ab.
- [ ] **AK7 – Regressionstest prüft die Abwesenheit (geparst + Fallback):** GIVEN
      `bash scripts/checks/tests/run-tests.sh` WHEN die Permissions-Konsistenz-Tests laufen THEN
      wird sowohl per jq-geparster Liste als auch per Grep-Fallback verifiziert, dass **keine**
      `Write(...)`-Zeichenkette mehr in `permissions.allow`/`permissions.deny` vorkommt; die
      bisherigen Assertions, die deren Vorhandensein forderten, sind ersetzt (nicht nur ergänzt),
      sonst bleibt der Test dauerhaft rot.
- [ ] **AK8 – Stale Prosa ist korrigiert:** GIVEN der #224-Lesson-Abschnitt in
      `docs/factory/lessons/factory-workflow.md` nennt im Präsens eine „existierende"
      `Write(...)`-Liste und Issue #240 als offenen Cleanup-Kandidaten WHEN dieser PR die Liste
      entfernt THEN ist die Prosa im selben PR auf den erledigten Zustand aktualisiert (Historie
      bleibt als Vorfall-Narrativ erhalten, nur die Präsens-Behauptung wird korrigiert).

## Fehlerszenarien

- [ ] **Patch lässt sich nicht anwenden:** `git apply --check tasks/patch-240.diff` schlägt fehl
      (z. B. weil `main` zwischenzeitlich `settings.json` geändert hat). Der Agent liefert keinen
      unverifizierten Patch aus, sondern erzeugt ihn gegen den aktuellen Stand neu.
- [ ] **Ein Pfad hat kein `Edit(...)`-Pendant:** Der 1:1-Abgleich (AK3) findet einen
      `Write(pfad)`-Eintrag ohne zugehörige `Edit(pfad)`-Regel. In diesem Fall **nicht** einfach
      entfernen (das wäre ein echter Funktionsverlust, kein Cleanup) – stattdessen zuerst die
      fehlende `Edit(...)`-Regel ergänzen oder den Fall als Blocker eskalieren. (Nach aktuellem
      Stand ist das nicht der Fall – alle 18+3 Einträge haben ein Pendant – aber die Prüfung
      bleibt Teil der Umsetzung, nicht nur eine Annahme.)
- [ ] **Regressionstest wird nur ergänzt statt ersetzt:** Bleiben die alten
      „Write(...)-muss-vorhanden-sein"-Assertions neben den neuen „Write(...)-darf-nicht-vorhanden-
      sein"-Assertions stehen, widersprechen sie sich strukturell und der Testlauf bleibt dauerhaft
      rot. Die alten Assertions müssen entfernt/umgeschrieben werden, nicht nur ergänzt.
- [ ] **Task-Datei bleibt im Patch-Zustand nach dem Anwenden:** Checkboxen bleiben auf `[~]`, der
      Blocker fordert weiter `git apply`, `tasks/patch-240.diff` liegt als totes Artefakt herum.
      Muss vor dem Merge aufgelöst sein (aus #145/#212).

## Offene Fragen

- [ ] **Reicht die schlanke Bestätigungsprobe (AK5), oder erwartet der Entwickler eine vollständige
      Neuaufnahme der `claude --print`-Verhaltensdokumentation wie in #224?** Angenommen: Ja, die
      schlanke Probe reicht, da nur ein Patch-Level-CLI-Update (2.1.218 → 2.1.220) zwischen den
      beiden Tasks liegt. Bei Bedarf in `/implement` zu korrigieren.
