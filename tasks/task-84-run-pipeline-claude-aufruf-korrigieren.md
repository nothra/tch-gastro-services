# Task 84: `run-pipeline.sh` – Claude-Aufruf in `run_skill` korrigieren

- **Issue:** #84
- **Art:** bug · **Aspekte:** –
- **Herkunft:** Beim Start von `PR_SHEPHERD=true bash scripts/run-pipeline.sh 66`
  bricht die Stage-3-Pipeline sofort in Phase 1 ab.

## Status
- [x] In Bearbeitung
- [x] Fix umgesetzt
- [x] Verifikation (Syntax, Substitution, CLI-Aufrufform)
- [x] Fertig / PR erstellt

## Beschreibung

`run_skill()` ruft den Agenten bisher so auf:

```bash
claude --print "$(cat "$skill_file")" --input-file "$TASK_FILE" --model … --max-turns …
```

Das enthält **zwei Fehler**, die Stage 3 seit dem Template-Import blockieren:

1. **`--input-file` existiert nicht** in der `claude`-CLI (verifiziert mit v2.1.205,
   `error: unknown option '--input-file'`). Jeder Skill-Aufruf scheitert an allen drei
   Retries → die Pipeline bricht in Phase 1 ab. Kein Lauf ist je durchgekommen.
2. **`$ARGUMENTS` wird nie ersetzt.** Die Slash-Command-Dateien (`.claude/commands/*.md`)
   nutzen `$ARGUMENTS` als Platzhalter für die Task-ID (z. B. `tasks/task-$ARGUMENTS.md`).
   Die interaktive Slash-Command-Mechanik ersetzt ihn – im `--print`-Modus jedoch nicht.
   Der Agent bekäme den literalen Text `$ARGUMENTS` und wüsste nicht, welche Task-Datei
   er laden soll.

## Fix

In `run_skill()` den Prompt vor dem Aufruf aufbereiten:
- `$ARGUMENTS` per `sed` durch die Task-ID ersetzen (Bug 2).
- Die konkrete Task-Datei als Kontextblock an den Prompt anhängen – ersetzt das
  nicht existierende `--input-file` (Bug 1).
- Aufruf: `claude --print "$prompt" --model … --max-turns …` (gültige Flags).

## Akzeptanzkriterien

- [x] `run-pipeline.sh` verwendet keinen `--input-file`-Flag mehr in der Agenten-Aufrufzeile
- [x] `$ARGUMENTS` wird vor dem Aufruf durch die Task-ID ersetzt (keine literalen
      `$ARGUMENTS` mehr im Prompt)
- [x] Der Prompt enthält die konkrete Task-Datei als Kontext
- [x] Aufruf nutzt nur von der installierten `claude`-CLI unterstützte Optionen

## Verifikation

- [x] `bash -n scripts/run-pipeline.sh` → Syntax gültig
- [x] `sed "s/\$ARGUMENTS/66/g" .claude/commands/implement.md` → `tasks/task-66.md`,
      0 verbleibende `ARGUMENTS`-Referenzen
- [x] `claude --print "…" --model … --max-turns 1` wird von der CLI akzeptiert
      (Aufrufform gültig; scheitert im automatisierten Kontext nur an fehlendem Login,
      nicht mehr an einer unbekannten Option)
- [x] `pnpm lint` / `pnpm test` grün (pre-commit/pre-push)

## Entscheidung: `--max-turns` bleibt (kein Wechsel auf `--settings`)

Erwogen wurde, das Turn-Limit über `--settings '{"maxTurns": N}'` statt über den Flag
`--max-turns` zu übergeben. **Verworfen nach Verifikation** (CLI v2.1.205):

- `maxTurns` ist **kein gültiger settings.json-Schlüssel** → in `--settings` wird er
  **still ignoriert** (kein Fehler, aber keine Wirkung). `--settings` validiert nur die
  JSON-Syntax, nicht die Schlüsselnamen – „kein Flag-Fehler" ≠ „Limit greift".
- `--max-turns` ist dagegen ein **gültiger, dokumentierter Flag** (CLI-Reference,
  `min-version: 2.1.205`, nur im `--print`-Modus; fehlt lediglich in `claude --help`).

Ein Wechsel auf `--settings maxTurns` hätte die Kostenbremse **lautlos deaktiviert**
(effektiv unbegrenzte Turns). Daher bleibt der funktionierende Flag `--max-turns`.

## Bekannte Einschränkung (kein Blocker dieses Fixes)

Ein vollständiger Stage-3-Lauf setzt voraus, dass die aufgerufene `claude`-CLI
**authentifiziert** ist (`claude /login` in einem interaktiven Terminal oder
`ANTHROPIC_API_KEY` gesetzt). In einer nicht-interaktiven Umgebung meldet die
Sub-CLI `Not logged in`. Dieser Fix behebt den Aufrufform-Fehler; die Authentifizierung
ist eine Umgebungsvoraussetzung, kein Skript-Bug.
