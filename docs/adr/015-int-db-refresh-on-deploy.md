# ADR 015: Automatischer INT-DB-Refresh an jeden INT-Deploy gekoppelt

## Status
Accepted

## Datum
2026-07-10

## Kontext
INT dient dazu, DB-Migrationen mit **produktionsnahen Daten** zu testen, bevor sie auf PRD
laufen. Die dafür nötigen Schritte – INT-Branch frisch von PRD abzweigen, anonymisieren
(DSGVO), Migrationen anwenden, bekannten INT-Admin anlegen – waren bisher **rein manuell**
(README + `pnpm db:*:int`-Scripts + Neon-UI). Damit gab es keine Garantie, dass INT vor einem
Test tatsächlich frische, anonymisierte, migrierte Daten enthält.

Gewünscht (mit dem Auftraggeber geklärt): Der Refresh soll **an jeden INT-Deploy** gekoppelt
laufen, damit jeder Gate-Lauf gegen einen definierten, frisch aufgesetzten Zustand testet.

Rahmenbedingungen:
- INT wird bereits bei **jedem `main`-Push** vom Deploy-Gate neu deployt (`git push HEAD:int`),
  danach laufen die E2E direkt gegen INT.
- Der INT-Neon-Branch behält bei „Reset from parent" (Restore-API) **Branch-ID und Endpoint**
  → `DATABASE_URL` bleibt gültig.
- INT ist durch **Vercel Deployment Protection (SSO)** geschützt; kein öffentlicher Zugriff.

## Decision
Der Refresh wird als zusätzliche Schritte **in `deploy-gate.yml`** ausgeführt, unmittelbar nach
`INT auf diesen Commit bringen` und **vor** dem Warten auf den Build und den E2E:

1. **Reset** des INT-Branches auf den PRD-Head via Neon-Restore-API
   (`scripts/neon-reset-int.sh`, pollt die Neon-Operationen bis `finished`).
2. **Anonymisieren** (`pnpm db:anonymize:int`, Guard `NEXT_PUBLIC_STAGE=int`).
3. **Migrieren** (`pnpm db:migrate:int`) – testet ausstehende Migrationen auf prod-nahen Daten.
4. **Seed** (`pnpm db:seed:int`) – setzt den bekannten INT-Admin (= E2E-Login).

**Reihenfolge Anonymisieren vor Migrieren:** Der Reset liefert das **PRD-Schema**; die
Anonymisierung fasst nur Auth.js-Basisspalten an (`name`, `email`, `passwordHash`, `image`,
`emailVerified`), die im PRD-Baseline-Schema existieren. Sie läuft daher **sofort nach dem
Reset**, um das Fenster mit echten personenbezogenen Daten zu minimieren; die Migrationen
laufen anschließend (Schema-Änderungen sind inhaltsunabhängig).
> Konsequenz: Führt eine künftige Migration eine **neue PII-Spalte** ein, muss sie in
> `db/anonymize.ts` ergänzt werden; existiert die Spalte erst nach der Migration, ist die
> Reihenfolge (Migrieren vor Anonymisieren) für diesen Fall neu zu bewerten.

**Fail-closed:** Reset und Refresh-Schritte brechen bei Fehler hart ab → kein Promote nach
`production`. So wird nie mit unklarem INT-Zustand deployt.

**Konditional (kein Bruch ohne Secrets):** Die Schritte sind an das Vorhandensein aller
Secrets (`NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_INT_BRANCH_ID`, `NEON_PRD_BRANCH_ID`,
`INT_DATABASE_URL`) gebunden. Fehlt eines, wird der Refresh mit **Warnung übersprungen** – es
findet **kein Reset** statt (also keine neue PII), und das Gate läuft normal weiter. Der
Refresh aktiviert sich automatisch, sobald alle Secrets gesetzt sind.

## Konsequenzen
**Positiv**
- Jeder Gate-Lauf testet Migrationen gegen frische, prod-nahe, anonymisierte Daten.
- Deterministischer INT-Admin (re-seed pro Lauf) → stabile E2E-Logins.
- Die manuellen `pnpm db:*:int`-Scripts bleiben als lokaler Weg unverändert nutzbar.

**Negativ / Risiken**
- **DSGVO-Restfenster:** Zwischen Reset und Anonymisierung (wenige CI-Sekunden) enthält der
  INT-Branch echte PII; die bereits laufende INT-Preview würde in diesem Fenster reale Daten
  ausliefern. Gemildert durch: SSO-Schutz, Anonymisierung direkt im Folgeschritt, kein
  öffentlicher Zugriff. Bricht der Job nach dem Reset vor der Anonymisierung ab, bleibt PII bis
  zum nächsten erfolgreichen Lauf auf INT – Grund für den unmittelbar folgenden Anonymisier-Schritt.
- **Latenz/Kosten:** Jeder `main`-Push führt einen vollständigen Reset+Migrate+Anonymize+Seed
  aus (~30–60 s zusätzlich) und setzt INT-Testdaten jedes Mal zurück.
- Bewusst gewählt trotz dieser Nachteile; Alternative (separater manueller/geplanter Refresh)
  wurde verworfen. Ein späterer Wechsel auf `workflow_dispatch`/Schedule ist reversibel.

## Alternativen
- **Separater `int-refresh.yml`** (manuell/Cron): kleineres DSGVO-Fenster, aber der Refresh ist
  vom getesteten Deploy entkoppelt – verworfen zugunsten der gewünschten Kopplung.
- **Branch löschen + neu erstellen** statt Reset: ändert Branch-ID/Endpoint → `DATABASE_URL`
  müsste in Vercel nachgezogen werden. Verworfen; Restore/Reset behält den Endpoint.
