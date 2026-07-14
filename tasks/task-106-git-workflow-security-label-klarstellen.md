# Task 106: git-workflow-security-label-klarstellen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Reine Doku-Klarstellung in `docs/factory/guidelines/git-workflow.md` → Abschnitt
„GitHub-Labels". Anlass (aus #50): Issue #50 hatte zusätzlich zum Art-Label
`enhancement` das Aspekt-Label `security` bekommen, weil das Feature von zwei
Rollen (Verwalter/Abrechner) mit unterschiedlichen Rechten genutzt wird. Laut
Produktverantwortlichem ist reine RBAC-Rollentrennung als Feature-Eigenschaft
kein hinreichender Grund für das `security`-Label – das Label ist für tatsächliche
Findings (Schwachstelle, Auth-/Secret-/Payment-Risiko, Härtung) reserviert.

Kein Code betroffen – kein Implementierungs-/Test-/Security-Review-/Refactoring-
Schritt nötig; die entsprechenden Checkboxen sind hier nur der Vollständigkeit
halber gesetzt (Guardrail „keine offenen Checkboxen → kein Done").

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN die Aspekt-Label-Tabelle in `git-workflow.md` WHEN die `security`-Zeile
      gelesen wird THEN ist klar, dass RBAC/Rollentrennung als Feature-Eigenschaft
      allein nicht ausreicht, sondern ein tatsächliches Security-Finding nötig ist.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Hinweis-Absatz direkt unter der Aspekt-Label-Tabelle ergänzt (kanonische Quelle
laut Datei-Kopfzeile: „Die kanonische Label-Liste bleibt allein in diesem
Abschnitt" – keine weiteren Kopien zu synchronisieren).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->
Manuell durchgeführt (Doku-Only-Change, kein Code) – kein Agenten-Review nötig.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Keine neue Regel nötig – diese Task *ist* die Regel-Ergänzung.

---
Branch: `docs/106-git-workflow-security-label-klarstellen`
Erstellt: 2026-07-14 22:05
