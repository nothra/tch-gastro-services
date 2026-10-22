# Review: Task 431

Iteration 2 (Gesamt-Diff `origin/main...HEAD`; seit Iteration 1 geändert: neuer Testblock zu
`run-pipeline.sh`, Report- und Task-Notizen). Alle drei Runden (Logik, Qualität, Architektur)
erneut über den Gesamt-Stand gelesen; Randfälle der Config-Validierung bereits in Iteration 1 per
Standalone-Repro gegengeprüft.

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
_Keine._ Das Wichtig-Finding aus Iteration 1 (fehlender Verhaltenstest für `run-pipeline.sh`) ist
behoben: der neue Block prüft Config-Kommando angewendet (Marker), Env-Vorrang, Abbruch mit
Schlüsselname und dass `claude` bei fehlendem Pflicht-Kommando nie aufgerufen wird; Suite 1884 grün.

## Nitpicks (optional)
- [ ] `scripts/lib/gate-config.sh:28` / `pre-push.sh`: fehlt `yq` im PATH, meldet `factory_cfg` die
  Ursache auf stderr, das Gate danach aber zusätzlich „Kommando nicht konfiguriert (commands.test)".
  Beides steht in der Ausgabe, die zweite Zeile ist irreführend (aus Iteration 1, bewusst offen).
- [ ] `scripts/checks/tests/run-tests.sh` (Kopf, `export FACTORY_{LINT,TEST,COVERAGE}_COMMAND=true`):
  der globale Export kann künftig einen Test grün machen, der „ohne Env" meint; dokumentiert und
  per `unset` vor Gruppe G begrenzt (aus Iteration 1, bewusst offen).
- [ ] `scripts/checks/tests/run-tests.sh` (Block „#431 AK-H3/H4: run-pipeline.sh"): `run_pipe_h431`
  schluckt den Exit-Code (`|| true`); die Abbruch-Fälle belegen den Abbruch über Meldung + „claude nie
  aufgerufen", nicht über `exit 1`. Optional: Exit-Code mitschreiben und assertieren.

## Positives
- Verhaltensneutralität belegt: Baseline-Vergleich gegen `bcba043` (Settings per `jq`, `.gitignore`
  byte-identisch, `CLAUDE.md`-Zeilenrekonstruktion), Required-Check-Namen gegen `protect-main` per
  `gh api` geprüft.
- `gate_command` ist klein, mit klarer Semantik (Env vor Config, Pflicht vs. optional, Format-Opt-out
  bleibt) und ohne stillen pnpm-Fallback; Fehlermeldungen nennen den Schlüssel.
- Config-Validierung bleibt fail-closed und erweitert nur die Oberfläche; Negativfälle je Typ getestet.
- Mutationsbelege für den Label-Drift-Guard je Seite; Pipeline-Gate-Tests jetzt in beide Richtungen.
- Zuordnungstabelle, `OPERATING.md` §5.6, `routes.md`, `CLAUDE.md`/`PROJECT-CONTEXT.md` im selben PR
  nachgezogen; `@import`-Kontext 1018/1100. Keine Routen-Änderung.

## Empfehlung
APPROVED
