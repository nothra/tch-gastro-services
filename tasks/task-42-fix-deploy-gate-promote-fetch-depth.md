# Task 42: fix-deploy-gate-promote-fetch-depth

## Status
- [x] In Bearbeitung
- [x] Fertig / PR erstellt

## Beschreibung
Bugfix am Deploy-Gate (`.github/workflows/deploy-gate.yml`), gefunden bei der Live-Verifikation
in Task #40: Der Promote-Schritt `git push origin HEAD:production` scheiterte mit
`! [rejected] HEAD -> production (fetch first)`, obwohl die E2E grün waren und `production`
(bf48f31) echter Vorfahr von `main` ist. Ursache: `actions/checkout@v4` klont per Default
shallow (`fetch-depth: 1`); der erste Gate-Lauf legte `production` nur deshalb an, weil eine
Branch-Neuanlage keinen Fast-Forward-Check erfordert. Bei existierendem `production` kann ein
Shallow-Clone den Fast-Forward serverseitig nicht belegen → Ablehnung.

## Akzeptanzkriterien
- [x] Checkout im Deploy-Gate holt vollen Verlauf (`fetch-depth: 0`)
- [ ] Merge auf `main` triggert das (gefixte) Gate; Promote-Push nach `production` erfolgreich
- [ ] `main` und `production` stehen danach auf demselben neuen SHA
- [ ] Prod `/api/version` liefert `sha` = neuer Commit und `stage` = `prd`

## Technische Notizen
- Nur Checkout-Option ergänzt (`with: fetch-depth: 0`); Promote bleibt ein normaler Push
  (echter Fast-Forward-Guard = fail-closed). INT-Sync nutzt weiterhin `--force`.
- Der Merge dieses Fixes holt zugleich `production` nach (aktuell auf bf48f31 hängend).

## Offene Fragen
<!-- keine -->

Blocker: keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/42-fix-deploy-gate-promote-fetch-depth`
Erstellt: 2026-07-10 22:32
