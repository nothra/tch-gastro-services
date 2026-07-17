# Security Review: Task 135

Scope: `git diff main...HEAD` – Produktionscode `db/verzehr.ts`,
`app/veranstaltung/actions.ts`, `app/_verzehr/VerzehrErfassung.tsx`,
Konfig `factory.config.yml`. Kontext: ADR-025/026, spec-135.
Threat Surface: RBAC-geschützte Server Action (`veranstalter`), keine öffentliche
Angriffsfläche in diesem Diff (F7-Theke noch nicht geroutet).

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise

- [ ] **[Authorization / IDOR – kein Finding, dokumentiert]** `getPosition(zeileId, catalogItemId)`
  filtert bewusst **nicht** über `veranstaltungId`. Das ist korrekt: In `adjustVerzehrAction`
  wird die Zeile zuvor über `getZeile(zeileId, veranstaltungId)` an genau diese Veranstaltung
  gebunden (Zeile 168), bevor `getPosition` läuft (Zeile 177). Damit ist der Parent-Scope
  bereits validiert; `getPosition` ist ein reiner Lese-Check auf der schon gebundenen Zeile –
  kein zusätzlicher IDOR-Vektor. Die Codify-#51-Regel (Parent-Key in WHERE) zielt auf
  DELETE/UPDATE; hier greift sie über die vorgelagerte Bindung. Kein Handlungsbedarf.

- [ ] **[Business-Logic – Soft-Delete-Zweck bleibt gewahrt]** Der gelockerte Guard erlaubt
  Deltas auf einem inaktiven Artikel nur, wenn `getPosition` eine bestehende Position liefert.
  Neu-Erfassung bleibt blockiert (`!existing → ITEM_NOT_FOUND`). Eine auf `menge=0` reduzierte
  Position bleibt als Zeile in der DB bestehen (getPosition liefert sie weiter), wird aber in
  der UI ausgeblendet – konsistent mit ADR-026 D2 (Existenz-, nicht Mengen-basierter Guard).
  Akteur ist ausschließlich der `veranstalter` innerhalb seiner legitimen Korrektur-Rechte,
  nur bei Status `offen`. Keine Privilege-Escalation, kein Cross-Tenant-Zugriff, kein
  Under-Billing. Kein Handlungsbedarf.

- [ ] **[Information Disclosure – akzeptabel]** Der Abschnitt „Nicht mehr im Katalog" zeigt
  den Namen eines soft-gelöschten Artikels. Sichtbar nur für den verwaltenden `veranstalter`
  auf einer offenen Veranstaltung; keine PII, keine internen Systemdetails. Legitim.

## Prüfnachweis (Katalog)

- **Injection (SQL/Command/XSS):** Alle DB-Zugriffe über Drizzle (parametrisiert), keine rohen
  SQL-Strings. `name`/`priceCents` werden als React-Text-Kinder gerendert (Auto-Escaping),
  kein `dangerouslySetInnerHTML`. ✅
- **Input-Validierung:** `verzehrAdjustSchema` erzwingt `delta ∈ {+1,−1}` (Zod, int, refine);
  `zeileId`/`catalogItemId` als non-empty strings validiert. ✅
- **AuthN/AuthZ:** `requireRole("veranstalter")` als erster Guard (fail-closed); Status- und
  IDOR-Bindung vor dem Persist unverändert. ✅
- **Sensitive Data / Secrets:** Keine hartkodierten Credentials, keine Secrets im Diff;
  `factory.config.yml` ändert nur Modell-Tier/Tooling. ✅
- **Dependencies:** Keine neuen Dependencies (`and` stammt aus dem bereits genutzten
  `drizzle-orm`). ✅
- **Error Handling / Disclosure:** Rückgaben sind generische Domänen-Fehler
  (`ITEM_NOT_FOUND`, `ZEILE_NOT_FOUND`), keine Stack Traces oder internen Details. ✅
- **Sichere Zufallszahlen:** Nicht relevant (kein Krypto-/Token-Code im Diff). ✅

## Ergebnis
PASSED
