# Review: Task 249

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- Keine.

## Nitpicks (optional)
- [ ] [scripts/checks/config-validation-check.sh:70,161] Die Guard-Bedingung `[ -n "$OVERRIDE" ] && [ -f "$OVERRIDE" ]` steht identisch zweimal im Skript (Regel-2-Block und Regel 6). Funktional korrekt (kein Bug, `override_paths` wird nur einmal berechnet und in Regel 6 wiederverwendet), aber Regel 6 öffnet dafür einen zweiten, redundanten Guard-Block statt in den bestehenden Block (Zeilen 70–95) integriert zu werden, in dem `override_paths` ohnehin schon gesetzt wird. Für einen künftigen `/refactor`-Pass, kein Blocker.
- [ ] [scripts/checks/tests/run-tests.sh:1300-1303] Der AK2-Test liest `default_heavy` dynamisch per `yq eval '.model_tiers.heavy' "$DEFAULTS"` statt eines Literals (wie AK1 mit `claude-sonnet-5`). Das ist bewusst robuster gegen künftige Default-Wert-Änderungen und keine Tautologie (die Assertion prüft nur den Exit-Code, nicht Gleichheit mit dem gelesenen Wert). Ein Kurzkommentar, warum hier dynamisch statt literal gelesen wird, würde einen künftigen Refactor davor bewahren, das versehentlich zu "vereinheitlichen".
- [ ] [factory.defaults.yml:37-42, factory.config.yml.example:27-34, scripts/checks/config-validation-check.sh:43-49] Die Begründung "nicht override-bar, unabhängig vom Wert, Pflege nur über factory.defaults.yml" wird sinngemäß an drei Stellen wiederholt. Funktional begründet (Leser betreten den Kontext an unterschiedlichen Einstiegspunkten), aber am Rand der ADR-011-Konvention "Begründung lebt nur in factory.defaults.yml, andere Stellen verweisen nur". Keine Handlung nötig, nur zur Kenntnis.
- [ ] [Dokumentation, kein Code-Finding] Ein manueller Gate-Test per Prozess-Substitution (`bash GATE defaults <(printf ...)`) liefert auf macOS irreführend exit 0, weil `[ -f /dev/fd/N ]` für eine FIFO `false` ist und der Override-Guard die Prüfung dann stillschweigend überspringt. Kein Bug im Skript (mit echten Dateien verhält sich das Gate korrekt), aber ein Stolperstein für künftige manuelle Verifikationen dieses Gates — ggf. als Hinweis in `docs/factory/lessons/bash-gotchas.md` wert, falls das wiederholt vorkommt.

## Positives
- Regel 6 ist exakt auf den Blatt-Pfad `model_tiers.heavy` fokussiert (`grep -qxF`), trifft weder `model_tiers.light` noch das Präfix `model_tiers.*` — verifiziert per Testlauf und manuellen Gate-Aufrufen.
- Bewusste und korrekt begründete Abweichung von Regel 4/5: Regel 6 prüft den **rohen** Override statt der **effektiven** Config, weil AK2 (Ablehnung auch bei wertgleicher Bestätigung) über die gemergte Config gar nicht entscheidbar wäre.
- Policy-Konstante `LOCKED_MODEL_TIER_PATH` konsistent mit dem etablierten Muster (`MAX_TURNS_CEILING`, `MIN_TIER_REQUIRED`) am Skriptkopf, nicht Teil der merge-baren Config — AK6 dadurch strukturell abgesichert.
- Alle 8 Akzeptanzkriterien (AK1–AK8) durch Tests bzw. Doku-Änderungen belegt, nicht nur behauptet; 571 Gate-Tests + volle Vitest-Suite grün, keine Regression bei den bestehenden Task-241-Tests.
- ADR-010-Drift korrekt verneint: der ADR-Text behauptet an keiner Stelle, dass bestehende `model_tiers`-Pfade frei override-bar bleiben müssen — nur, dass *neue* Pfade über Regel 2 abgelehnt werden. Keine ADR-Prosa-Zeile wird durch den Fix falsch.
- `run-pipeline.sh` bleibt zu Recht unverändert — das Gate wird dort bereits fail-closed vor `CLAUDE_MODEL_HEAVY`-Ableitung aufgerufen, die neue Regel wirkt automatisch.
- Keine Routen betroffen (reines Bash/YAML/Doku-Tooling), `docs/routes.md` korrekt nicht angefasst.

## Empfehlung
APPROVED
