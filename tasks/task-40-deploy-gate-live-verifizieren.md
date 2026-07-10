# Task 40: deploy-gate-live-verifizieren

## Status
- [x] In Bearbeitung
- [x] Fertig / PR erstellt

## Beschreibung
Live-Verifikation des scharfgeschalteten Deploy-Gates (Issue #38): Nutzer hat in Vercel
**Production Branch = `production`** gesetzt. Ein kleiner, echter Change (CHANGELOG-Eintrag
zur Gate-Aktivierung) läuft durch den Factory-Fluss (Issue → Branch → PR → Squash-Merge auf
`main`) und beweist end-to-end, dass Prod erst nach grünem INT-E2E über den `production`-Branch
deployt – nicht mehr direkt vom `main`-Push.

## Akzeptanzkriterien
- [x] CHANGELOG-Eintrag „Deploy-Gate aktiviert (Production Branch = production)" ergänzt
- [ ] Merge auf `main` triggert `deploy-gate.yml`; Lauf grün inkl. „Promote … nach production"
- [ ] `main` und `production` stehen danach auf demselben **neuen** SHA (nicht mehr bf48f31)
- [ ] Prod `/api/version` liefert `sha` = neuer Commit und `stage` = `prd`

## Technische Notizen
- Reiner Doku-Change → kein funktionales Prod-Risiko; deployt Prod nur bei grünem INT-E2E.
- Verifikation deterministisch über den öffentlichen `/api/version`-Endpunkt (kein Dashboard nötig).
- Gate-Latenz: INT-Build + E2E dauern einige Minuten (Timeout ~12 min gesetzt).

## Offene Fragen
<!-- keine -->

## Verifikations-Befund (Bug gefunden)
Blocker 2026-07-10: Gate-Lauf für 8e10a1e lief E2E-grün, aber Promote scheiterte
(`! [rejected] HEAD -> production (fetch first)`). Ursache: `actions/checkout@v4` klont shallow
(`fetch-depth: 1`); der erste Lauf legte `production` neu an (kein FF-Check), jetzt kann ein
Shallow-Push den Fast-Forward nicht belegen. Ancestry ist sauber (production=bf48f31 ist Vorfahr
von main). Fix in Folge-Task: `fetch-depth: 0` im Checkout. Prod hängt bis dahin auf bf48f31.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/40-deploy-gate-live-verifizieren`
Erstellt: 2026-07-10 22:26
