# Task 173: deploy-freeze-bei-rotem-gate

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Struktureller Schutz gegen falsch-grüne Deploy-Gates: Sobald ein Gate-Lauf über
verifikationsrelevante Schritte rot wird, wird ein **Freeze** gesetzt. Der Promote-Schritt
verweigert **fail-closed** jeden weiteren Promote (inkl. PRD-DB-Migration), solange der Freeze
steht. `main` läuft normal weiter – nur **deployt** wird nichts, bis ein Maintainer den Freeze
nach Fix + Verifikation aufhebt. Verhindert, dass ein einmal rotes Gate durch einen späteren,
evtl. flaky-grünen Lauf still überholt wird (Vorfall 19.07.2026: #134-rot → #167-flaky-grün →
fehlerhafter Code auf Produktion).

Spec: [`docs/specs/spec-173-deploy-freeze-bei-rotem-gate.md`](../docs/specs/spec-173-deploy-freeze-bei-rotem-gate.md)

**Requirements-Entscheidungen:** (1) Trigger eingegrenzt – nur E2E/Migrations-Fehler frieren,
nicht Infra-Flakes. (2) Freeze-Check **vor** der PRD-Migration (kein Prod-DB-Seiteneffekt).
(3) Aktive Benachrichtigung zusätzlich zum Log.

## Akzeptanzkriterien
- [ ] AC1 – Rotes Gate (E2E gegen INT / `db:migrate:int` / `db:migrate:prd`) setzt persistenten Freeze-Marker (Grund + blockierender SHA).
- [ ] AC2 – Reine Infra-/Vorbereitungsfehler (Secret-Check, Install, INT-Deploy-Timeout, Neon-Reset, Anonymisierung) setzen **keinen** Freeze.
- [ ] AC3 – Promote fail-closed: Marker gesetzt **oder** unlesbar → weder PRD-Migration+Seed noch Promote-Push.
- [ ] AC4 – Freeze-Check läuft **vor** der PRD-DB-Migration (kein Seiteneffekt auf die Prod-DB).
- [ ] AC5 – Wegen Freeze zurückgehaltener Promote endet **ohne Fehler** (nicht rot), mit klarer Meldung (SHA + Grund).
- [ ] AC6 – Automatisierter Test simuliert #134-rot → #167-grün und belegt: grüner Folgelauf promotet **nicht**.
- [ ] AC7 – Dokumentierter, manueller Freigabe-Weg (Maintainer); nach Freigabe promotet der nächste Lauf wieder.
- [ ] AC8 – Aktive Benachrichtigung bei Freeze-Setzen **und** bei blockiertem Promote (SHA + Grund).
- [ ] AC9 – ADR ergänzt (Marker-Variante, Trigger, Check-Position, Freigabe, Benachrichtigung, Zusammenspiel ADR-007/017/`concurrency`) + README/Runbook-Doku.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Betroffen: `.github/workflows/deploy-gate.yml` (Schritte „E2E gegen INT", „PRD-DB migrieren + Login seeden",
„Promote main → production"). Freeze-Logik testbar extrahieren (AC6). Marker-Variante & Benachrichtigungs-Kanal
entscheidet `/architecture`.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Siehe Spec „Offene Fragen (für /architecture)": Marker-Speicher (Sentinel-Ref vs. Label vs. Repo-Variable),
Benachrichtigungs-Kanal, Freigabe-Mechanik (workflow_dispatch vs. Skript vs. Ref-Delete), exakte
Step→Trigger-Zuordnung, Extraktion in ein testbares Skript.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/173-deploy-freeze-bei-rotem-gate`
Erstellt: 2026-07-19 17:51
