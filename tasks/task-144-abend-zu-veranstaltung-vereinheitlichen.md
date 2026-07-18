# Task 144: abend-zu-veranstaltung-vereinheitlichen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Rein **dokumentarische** Begriffs-Vereinheitlichung „Abend" → „Veranstaltung" in den lebenden
Docs (`docs/`, `tasks/`), mit korrekter Grammatik. **Kein Code betroffen.** Spec:
[spec-144](../docs/specs/spec-144-abend-zu-veranstaltung-vereinheitlichen.md).
Stand bei Start: 115 Vorkommen in 28 Dateien (ohne die in #53 bereits bereinigten).

## Akzeptanzkriterien
<!-- Von /requirements befüllt – Detail-GIVEN/WHEN/THEN in spec-144 -->
- [ ] `docs/factory/PROJECT-CONTEXT.md`: Synonym-Paar „Veranstaltung/Abend" aufgelöst, `git grep -w -i abend` → 0
- [ ] `README-montagsrunde.md` + aktive Specs (`spec-48/49/50/52/54/55`, `spec-116/127`, `spec-51`, `spec-120`): `git grep -w -i abend` → 0
- [ ] Grammatisch korrekte Ersetzung (Genus „die Veranstaltung", Komposita „Veranstaltungs-Ebene")
- [ ] ADRs (`021–024`) + abgeschlossene Task-Records inhaltlich unverzerrt; jede angefasste Historie-Datei mit Begründung dokumentiert
- [ ] Dateinamen `spec-51-abend-anlegen.md` / `task-51-abend-anlegen-fuehren.md` **nicht** umbenannt; alle 4 Referenzen intakt
- [ ] Diff berührt ausschließlich `docs/` und `tasks/` – keine Code-/UI-/Test-Änderungen

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/144-abend-zu-veranstaltung-vereinheitlichen`
Erstellt: 2026-07-18 06:38
