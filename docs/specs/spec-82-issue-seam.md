# Spec: Zentraler Issue-Seam mit Label-Funktion (`create-issue` Helper)

> Task/Issue: **#82** · Kanonische Label-Konvention: `docs/factory/guidelines/git-workflow.md`
> → „GitHub-Labels" (genau ein Art-Label + null..n Aspekt-Labels).

## Kontext

Issues entstehen heute an mehreren Stellen, jede mit eigener `gh issue create`-Logik:

- `scripts/start-work.sh` (Beschreibungs-Modus) – legt seit **#80** ein aus dem Branch-Typ
  abgeleitetes **Art-Label** an, mit fail-open-Fallback (Retry ohne Label + Warnung, falls das
  Label im Repo fehlt).
- `scripts/sync-issues.sh --create` – legt fehlende Issues **ohne jedes Label** an
  (`scripts/sync-issues.sh:108`). Damit verletzt jedes sync-erzeugte Issue still die
  „genau ein Art-Label"-Konvention.

Zwei Probleme: (1) **Duplikation** der Anlage-Logik, (2) **uneinheitliche Label-Vergabe** –
**Aspekt-Labels** (`security`/`tech-debt`/`test`) werden nirgends angeboten, obwohl gerade
`codify`/`review`/`security-review` eine begründete Aspekt-Empfehlung treffen.

Ziel: **ein einziger Seam** (`scripts/lib/create-issue.sh`), durch den jede Issue-Anlage läuft
und der Art- + optionale Aspekt-Labels einheitlich vergibt.

## Scope

**Inbegriffen:**
- Neue sourcebare Bibliothek `scripts/lib/create-issue.sh` mit
  `create_issue <title> <body> <art-label> [aspekt-csv]`.
- Extraktion der bestehenden fail-open-Label-Logik aus `start-work.sh` (aus #80) in den Seam (DRY).
- Umstellung beider Aufrufer (`start-work.sh`, `sync-issues.sh --create`) auf den Seam –
  kein eigenständiges `gh issue create` mehr.
- `start-work.sh` akzeptiert **optional** Aspekt-Labels (`--labels a,b` / `FACTORY_ASPECT_LABELS`)
  und reicht sie an den Seam durch.
- `sync-issues.sh --create` setzt über den Seam mindestens das Art-Label `enhancement`
  (Default; Override via `FACTORY_ISSUE_LABEL`) – behebt die stille Schema-Verletzung.
- **Skills `codify`/`review`/`security-review` dürfen Issues autonom über den Seam anlegen**
  (Entscheidung Offene Frage 1): Ein Fund mit begründeter Art-/Aspekt-Empfehlung führt direkt
  zu `create_issue …`. Die Skill-Doku wird entsprechend angewiesen (Art-Label setzen,
  passende Aspekt-Labels wie `security`/`tech-debt`/`test` mitgeben).
- Self-Test-Abdeckung in `scripts/checks/tests/run-tests.sh` (gh-Stub-Muster aus #80).
- **ADR** unter `docs/adr/` zur Entscheidung „zentraler Issue-Seam + Label-Konvention",
  inkl. der beiden offenen Fragen unten.

**Nicht inbegriffen:**
- Konsolidierung der (ebenfalls duplizierten) **Repo-Slug-Ableitung** – eigener Task, nicht
  vom Issue-Titel gedeckt (YAGNI).
- Harte Validierung der Aspekt-Labels gegen eine erlaubte Menge (fail-open, siehe Offene Frage 2).
- Änderung des `exists-check` (`gh issue view`) in `start-work.sh`/`sync-issues.sh` (unberührt).

## Akzeptanzkriterien

- [ ] GIVEN `scripts/lib/create-issue.sh` ist gesourct, WHEN
      `create_issue "<title>" "<body>" "enhancement"` aufgerufen wird, THEN wird ein Issue mit
      Art-Label `enhancement` angelegt und die **Issue-Nummer auf stdout** zurückgegeben
      (Exit 0).
- [ ] GIVEN ein Aspekt-CSV, WHEN `create_issue "<t>" "<b>" "enhancement" "security,tech-debt"`
      aufgerufen wird, THEN trägt das Issue `enhancement` **und** beide Aspekt-Labels.
- [ ] GIVEN ein übergebenes Label existiert im Repo nicht, WHEN das Issue angelegt wird, THEN
      wird es **trotzdem** angelegt (fail-open aufs Label) und der Seam gibt eine Warnung auf
      stderr aus, ohne die Nummer auf stdout zu verunreinigen.
- [ ] GIVEN `gh issue create` liefert gar keine Issue-Nummer, WHEN der Seam das erkennt, THEN
      scheitert er **fail-closed** (Exit ≠ 0, keine Nummer auf stdout).
- [ ] GIVEN `start-work.sh` legt im Beschreibungs-Modus ein Issue an, WHEN kein Aspekt-Label
      übergeben ist, THEN verhält es sich **wie bisher** (Art-Label aus Branch-Typ, Override
      `FACTORY_ISSUE_LABEL`) – jetzt über `create_issue`.
- [ ] GIVEN `start-work.sh` mit `--labels security,test` (bzw. `FACTORY_ASPECT_LABELS`), WHEN
      das Issue angelegt wird, THEN trägt es zusätzlich zum Art-Label die Aspekt-Labels.
- [ ] GIVEN `sync-issues.sh --create` legt ein fehlendes Issue an, WHEN es den Seam nutzt, THEN
      trägt das neue Issue mindestens das Art-Label `enhancement` (kein label-loses Issue mehr)
      und enthält **kein** eigenes `gh issue create` mehr.
- [ ] GIVEN ein Skill (`codify`/`review`/`security-review`) hat einen Fund mit Art-/Aspekt-
      Empfehlung, WHEN er ein Issue anlegt, THEN ruft er `create_issue` autonom auf und gibt
      Art- + Aspekt-Labels mit; die jeweilige Skill-Doku weist dieses Verhalten an.
- [ ] GIVEN der Self-Test (`run-tests.sh`), WHEN er läuft, THEN deckt er den Seam ab
      (Art-Label, Aspekt-CSV, fehlendes Label → Warnung + trotzdem angelegt, stdout = reine
      Nummer) und bleibt grün.
- [ ] GIVEN die Entscheidung „zentraler Issue-Seam + Label-Konvention", WHEN sie getroffen ist,
      THEN ist sie als ADR unter `docs/adr/` dokumentiert (inkl. der beiden offenen Fragen).

## Fehlerszenarien

- [ ] `gh` nicht installiert → Seam meldet den Fehler klar und scheitert fail-closed (Exit ≠ 0);
      Aufrufer verhalten sich wie heute (start-work bricht ab, sync-issues Exit 2).
- [ ] Ungültiges/leeres Art-Label → wie „Label existiert nicht": fail-open (Issue entsteht,
      Warnung), solange ein Issue angelegt wird.
- [ ] Titel oder Body leer → Aufrufer stellen valide Werte sicher (bestehende Fallbacks in
      `sync-issues.sh`: Titel aus H1/Dateiname); der Seam macht keine eigene Titel-Politik.
- [ ] stdout-Hygiene: Warnungen/Diagnostik gehen auf **stderr**, damit
      `num=$(create_issue …)` ausschließlich die Nummer erhält.
- [ ] Portabilität (macOS/BSD **und** CI/GNU/Alpine): nur POSIX-taugliche Shell, keine
      PCRE-Konstrukte – vgl. `clean-code.md` „Portabilität in Gate-Skripten" und `bash-gotchas.md`.

## Offene Fragen

- [x] **Dürfen Skills Issues autonom anlegen?** → **ENTSCHIEDEN (2026-07-12): Ja.**
      `codify`/`review`/`security-review` dürfen bei einem Fund autonom `create_issue` aufrufen
      (statt nur eine Empfehlung in eine Datei zu schreiben). In der ADR als Entscheidung
      festhalten; die Skill-Doku entsprechend anweisen.
- [x] **Aspekt-Labels validieren?** → **ENTSCHIEDEN (ADR-018): fail-open pass-through.**
      Keine harte Allowlist im Seam (würde die kanonische Label-Liste aus `git-workflow.md`
      duplizieren); gestufte Degradation Art+Aspekt → nur Art → ohne Label, Warnung auf stderr.
      Konvention lebt in Guideline-/Skill-Doku.
