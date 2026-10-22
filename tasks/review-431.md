# Review: Task 431

Umfang: Gesamt-Diff `origin/main...HEAD` (Etappen D–I, 27 Dateien). Drei Runden (Logik, Qualität,
Architektur) in einem Durchgang gelesen; Rand- und Fehlerfälle der Config-Validierung per
Standalone-Repro gegengeprüft (`[5]`, `[true]`, `kinds: 5`, `[[a]]`, `commands:`, `labels:` → je rot;
`commands: {}` → grün, gewollt).

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [x] `scripts/checks/tests/run-tests.sh` (Gruppe H, AK-H3/H4/F-6) – behoben im Rework (Iteration 1): neuer Testblock zu run-pipeline.sh mit Config-/Env-Vorrang und Abbruch vor /implement: `run-pipeline.sh` ist nur
  **strukturell** abgesichert (`gate_command lint required` per Grep, kein `pnpm`). Es fehlt der
  Verhaltenstest für beide Richtungen: (a) ohne `FACTORY_*_COMMAND` und mit `commands.lint|test|coverage`
  in der Config führt die Pipeline das Config-Kommando aus (Marker; Lesson #348 „gültig ≠ angewendet"),
  (b) fehlt ein Pflicht-Kommando in Config **und** Env, bricht der Lauf **vor** `/implement` mit dem
  Schlüsselnamen ab (Mock-`claude` darf nie aufgerufen werden). Für `pre-commit`/`pre-push` existieren
  beide Tests, für die dritte in AK-H3 genannte Stelle nicht.

## Nitpicks (optional)
- [ ] (bewusst offen, Nitpick) `scripts/lib/gate-config.sh:28` / `pre-push.sh`: fehlt `yq` im PATH (Hook aus einer GUI-Umgebung),
  meldet `factory_cfg` die Ursache auf stderr, das Gate danach aber „Kommando nicht konfiguriert
  (commands.test)". Beides steht in der Ausgabe, die zweite Zeile ist irreführend. Optional: bei
  `yq`-Fehler die Gate-Zeile auf „Config nicht lesbar" umstellen.
- [ ] (bewusst offen, Nitpick) `scripts/checks/tests/run-tests.sh` (Kopf, `export FACTORY_{LINT,TEST,COVERAGE}_COMMAND=true`):
  der globale Export gilt für alle Tests zwischen Kopf und Gruppe G. Er ist dokumentiert und per
  `unset` begrenzt, kann aber künftig einen Test grün machen, der „ohne Env" meint. Optional:
  stattdessen in `_mk_pipe_repo`/`cp_pipeline_libs`-Umfeld eine Fixture-`factory.config.yml` ergänzen.

## Positives
- Verhaltensneutralität belegt: Baseline-Vergleich gegen `bcba043` (Settings per `jq`, `.gitignore`
  byte-identisch, `CLAUDE.md`-Zeilenrekonstruktion), Required-Check-Namen gegen `protect-main` per
  `gh api` geprüft.
- `gate_command` ist klein, hat eine klare Semantik (Env vor Config, Pflicht vs. optional, Format-Opt-out
  bleibt) und kein stilles pnpm-Fallback; Fehlermeldungen nennen den Schlüssel.
- Config-Validierung bleibt fail-closed und erweitert nur die Oberfläche (`commands.*` als leere
  Defaults, Listen-Normalisierung mit `*`); Negativfälle für jeden Typ getestet.
- Mutationsbelege für den Label-Drift-Guard je Seite (Config, generische Tabelle, projekteigene Zeile).
- `OWNERSHIP.md`, `OPERATING.md` §5.6, `routes.md`, `CLAUDE.md`/`PROJECT-CONTEXT.md` im selben PR
  nachgezogen; `@import`-Kontext 1018/1100.
- Kein Routen-Eingriff: `docs/routes.md` nur im Verweis auf den verschobenen Check angepasst.

## Empfehlung
NEEDS_REWORK
