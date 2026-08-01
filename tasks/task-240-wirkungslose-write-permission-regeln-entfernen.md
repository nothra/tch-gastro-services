# Task 240: wirkungslose-write-permission-regeln-entfernen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Entferne alle wirkungslosen `Write(...)`-Permission-Regeln aus `permissions.allow` und
`permissions.deny` in `.claude/settings.json`. Laut #224-Verhaltensprobe (`claude --print`,
CLI 2.1.218) wertet die installierte Claude-Code-Version `Write(pfad)`-Regeln gar nicht aus –
nur `Edit(pfad)` deckt Edit- und Write-Tool-Aufrufe ab. Die separate `Write(...)`-Liste ist
komplett wirkungslos (dead config), erzeugt aber bei jedem Stage-3-Lauf unnötige
stderr-Warnungen. Details, Scope und Akzeptanzkriterien:
[`docs/specs/spec-240-wirkungslose-write-permission-regeln-entfernen.md`](../docs/specs/spec-240-wirkungslose-write-permission-regeln-entfernen.md).

Lieferung zwingend über den Patch-Workflow (`.claude/**` ist hard denied für den Agenten,
#88-Grenze): `tasks/patch-240.diff`, programmatisch erzeugt, `git apply --check` verifiziert.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 – `Write(...)` ist aus `permissions.allow` entfernt (alle 18 Einträge)
- [ ] AK2 – `Write(...)` ist aus `permissions.deny` entfernt (alle 3 Einträge)
- [ ] AK3 – Kein Funktionsverlust: jeder entfernte `Write(pfad)`-Eintrag hat ein
      `Edit(pfad)`-Pendant in derselben Liste (1:1-Abgleich verifiziert)
- [ ] AK4 – `settings.json` bleibt valides JSON mit unveränderter Grundstruktur
      (`hooks`/`permissions.allow`/`permissions.deny`)
- [ ] AK5 – Verhaltensprobe (`claude --print`, `FACTORY_STAGE=3`) bestätigt vor der Entfernung
      dieselbe „Write(<pfad>) is not matched"-Warnung wie in #224 (CLI jetzt 2.1.220)
- [ ] AK6 – Nach der Entfernung: kein neuer Permission-Prompt für zuvor per `Write(pfad)`
      "erlaubte" Pfade (Edit-Regel deckt weiterhin ab)
- [ ] AK7 – Regressionstest in `scripts/checks/tests/run-tests.sh` geändert (nicht nur ergänzt):
      prüft Abwesenheit von `Write(...)` (jq-geparst + Grep-Fallback), alte
      "Vorhandensein"-Assertions aus #91/#224 entfernt/ersetzt
- [ ] AK8 – Stale Prosa in `docs/factory/lessons/factory-workflow.md` (#224-Abschnitt)
      korrigiert: Präsens-Aussage zur "existierenden" Write-Liste + "Cleanup-Kandidat: Issue
      #240"-Verweis auf erledigt aktualisiert

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [ ] Reicht die schlanke Bestätigungsprobe (AK5) oder ist eine vollständige Neuaufnahme der
      `claude --print`-Verhaltensdokumentation wie in #224 erwartet? Angenommen: schlanke Probe
      reicht (nur Patch-Level-CLI-Delta 2.1.218 → 2.1.220). Bei Bedarf in `/implement` klären.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/240-wirkungslose-write-permission-regeln-entfernen`
Erstellt: 2026-08-01 14:55
