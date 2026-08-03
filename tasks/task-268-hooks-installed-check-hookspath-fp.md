# Task 268: hooks-installed-check-hookspath-fp

## Status
- [x] In Bearbeitung
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
- [x] GIVEN `core.hooksPath` ist nicht gesetzt UND alle drei Hooks vorhanden+ausführbar WHEN der Check läuft THEN Exit 0 (unverändert, spec-265 AK1)
- [x] GIVEN `core.hooksPath` ist gesetzt UND im Standardpfad liegen noch ausführbare Hook-Reste WHEN der Check läuft THEN Exit ≠ 0 (statt fälschlich Exit 0)
- [x] GIVEN `core.hooksPath` ist gesetzt UND die Hooks fehlen im Standardpfad vollständig WHEN der Check läuft THEN ebenfalls Exit ≠ 0
- [x] GIVEN `core.hooksPath` ist gesetzt WHEN der Check deswegen fehlschlägt THEN nennt die Meldung Pfad + Scope/Herkunft + Remediation-Hinweis
- [x] GIVEN der Check läuft aus einem beliebigen Worktree WHEN er `core.hooksPath` prüft THEN liest er denselben effektiven Wert wie `install-hooks.sh`

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Vorbild: `core.hooksPath`-Guard in `scripts/install-hooks.sh` (`[ -n
"$HOOKS_PATH_CONFIG" ]`, `git config --show-origin --get core.hooksPath`).

Umgesetzt: Guard direkt nach der `git-common-dir`-Ermittlung (Vorrang vor Präsenzprüfung,
aber nach dem „kein Git-Repo"-Fail-closed – Fehlerszenario-Reihenfolge aus spec-268).
`git config` ohne `-C`/`-C "$REPO_DIR"` genügt, da das Skript bereits per `cd "$ROOT"`
in die Projektwurzel gewechselt ist – liest denselben effektiven Wert wie
`install-hooks.sh` (`git -C "$REPO_DIR" config …`).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Exit-Code bei core.hooksPath-Fail-closed: eigener Code (analog install-hooks.sh Exit 2) oder Exit 1 wie bestehende Präsenz-Fails? (`/implement`-Entscheidung, kein Verhaltensunterschied für pre-push.sh)
  → Entschieden: Exit 1, konsistent mit den bestehenden Fail-closed-Pfaden in
  diesem Skript (alle nutzen bereits Exit 1); `pre-push.sh` wertet ohnehin nur
  Exit 0 vs. ≠ 0 aus.
- [x] Leerer `core.hooksPath`-Wert: wie `install-hooks.sh` behandeln (Leerstring = „nicht gesetzt")
  → **Korrigiert nach Review-Runde 1** (siehe Review-Findings unten): Die ursprüngliche
  Annahme war falsch. Empirisch mit git 2.51 verifiziert: `core.hooksPath=""` löst den
  Hook-Pfad auf das Arbeitsverzeichnis auf (`git rev-parse --git-path hooks` → `./` statt
  `$GIT_COMMON_DIR/hooks`) – Git ruft `$GIT_COMMON_DIR/hooks` dann nicht mehr auf. Ein
  Leerstring zählt daher als „gesetzt" und wird fail-closed behandelt (bewusste Abweichung
  von `install-hooks.sh`, das denselben Blindspot außerhalb des Scopes von #268 behält).

## Review-Findings

**Runde 1 (NEEDS_REWORK, siehe `tasks/review-268.md`):** 1 kritisches + 6 wichtige Findings.
Alle behoben:
- Remediation-Meldung widersprach sich selbst (bot „Factory-Checks einbinden" als Ausweg
  an, obwohl der Check ausschließlich `$GIT_COMMON_DIR/hooks` liest) → Meldungstext korrigiert,
  ADR-042 §Consequences + `git-workflow.md` (Hook-Tabelle + core.hooksPath-Absatz) nachgezogen.
- AK3-Test war nicht auf den Guard isoliert (griff auch ohne core.hooksPath-Guard) →
  pfadspezifisches Signal + Abwesenheits-Assertion der alten Präsenzmeldung ergänzt.
- AK4-Remediationstest war tautologisch (`core.hooksPath`-String kam schon aus der
  Ursachenzeile) → auf den konkreten Befehl `git config --unset core.hooksPath` umgestellt.
- Hartkodierte Hook-Namen-Liste in der core.hooksPath-Meldung (Drift-Risiko zu `FACTORY_HOOKS`)
  → Meldung enumeriert keine Hook-Namen mehr, nennt nur noch den Pfad generisch.
- Header-Aufzählung der Fail-Gründe war nicht nachgezogen → core.hooksPath ergänzt.
- AK5-Worktree-Test konnte über den falschen Pfad grün werden (`worktree add`-Fehlschlag
  statt echtem Guard-Treffer) → `.husky`-Signal-Assertion ergänzt.
- Leerstring-Semantik war unverifiziert gegen die Analogie zu `install-hooks.sh` übernommen
  → empirisch mit git 2.51 verifiziert, Verhalten umgekehrt (fail-closed statt „nicht gesetzt"),
  spec-268 „Offene Fragen" per Strikethrough + Korrektur-Absatz nachgezogen.

Test-Stand nach Rework: `bash scripts/checks/tests/run-tests.sh` → 821 grün, 0 rot.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/268-hooks-installed-check-hookspath-fp`
Erstellt: 2026-08-03 06:41
