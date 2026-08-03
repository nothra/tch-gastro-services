# Task 268: hooks-installed-check-hookspath-fp

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/checks/hooks-installed-check.sh` meldet fälschlich Erfolg, wenn
`core.hooksPath` gesetzt ist, aber im gemeinsamen `.git/hooks`-Verzeichnis noch
ausführbare Datei-Reste der Factory-Hooks liegen (z. B. von einem Retrofit vor dem
Setzen von `core.hooksPath`). Git ruft diese Dateien wegen `core.hooksPath` nie auf
— der Check ist im Kernszenario, das er absichern soll, wirkungslos. Fix: analog zu
`install-hooks.sh` (ADR-042) fail-closed abbrechen, sobald `core.hooksPath` gesetzt
ist. Details: [spec-268](../docs/specs/spec-268-hooks-installed-check-hookspath.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN `core.hooksPath` ist nicht gesetzt UND alle drei Hooks vorhanden+ausführbar WHEN der Check läuft THEN Exit 0 (unverändert, spec-265 AK1)
- [ ] GIVEN `core.hooksPath` ist gesetzt UND im Standardpfad liegen noch ausführbare Hook-Reste WHEN der Check läuft THEN Exit ≠ 0 (statt fälschlich Exit 0)
- [ ] GIVEN `core.hooksPath` ist gesetzt UND die Hooks fehlen im Standardpfad vollständig WHEN der Check läuft THEN ebenfalls Exit ≠ 0
- [ ] GIVEN `core.hooksPath` ist gesetzt WHEN der Check deswegen fehlschlägt THEN nennt die Meldung Pfad + Scope/Herkunft + Remediation-Hinweis
- [ ] GIVEN der Check läuft aus einem beliebigen Worktree WHEN er `core.hooksPath` prüft THEN liest er denselben effektiven Wert wie `install-hooks.sh`

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Vorbild: `core.hooksPath`-Guard in `scripts/install-hooks.sh` (`[ -n
"$HOOKS_PATH_CONFIG" ]`, `git config --show-origin --get core.hooksPath`).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [ ] Exit-Code bei core.hooksPath-Fail-closed: eigener Code (analog install-hooks.sh Exit 2) oder Exit 1 wie bestehende Präsenz-Fails? (`/implement`-Entscheidung, kein Verhaltensunterschied für pre-push.sh)
- [ ] Leerer `core.hooksPath`-Wert: wie `install-hooks.sh` behandeln (Leerstring = „nicht gesetzt")

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/268-hooks-installed-check-hookspath-fp`
Erstellt: 2026-08-03 06:41
