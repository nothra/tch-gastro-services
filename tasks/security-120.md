# Security Review: Task 120

Scope: Rollen-Rename `abrechner` → `veranstalter` (pgEnum-Migration `0007` +
Code + Tests), Bereichs-/Pfad-Rename `/abrechnung/veranstaltung` → `/veranstaltung`,
sowie ADR-024 + Doku-Sync. Reviewt gegen `git diff main...HEAD`.

Kein neues Verhalten, keine neue Angriffsfläche: keine neuen Inputs/Endpunkte, kein
`proxy.ts`-Change, keine `package.json`-/Dependency-Änderung, kein neuer öffentlicher
Route-Zugang (F7 ist bewusst nicht in #120, YAGNI).

## Kritische Findings (Blocker)
- Keine.

## Wichtige Findings
- Keine.

## Hinweise
- [x] [Authz/fail-closed] Der Rename ist in der **sicheren Richtung** umgesetzt: Ein
      stehen gebliebener Rollen-Wert `abrechner` (Stale-Session/JWT vor Token-Refresh oder
      DB vor Migration) matcht **nicht** mehr `veranstalter` → Zugriff wird verweigert, keine
      Privilege-Escalation. Belegt durch den Regressionstest
      `should_returnFalse_when_roleIsLegacyAbrechner` (`lib/authz.test.ts:34`). Betroffene
      Nutzer müssen sich nach Deploy neu anmelden – Lockout, kein Escalation-Risiko. Keine Aktion.
- [x] [Migration/ Availability] `ALTER TYPE ... RENAME VALUE` (`0007`) ist datenerhaltend
      (bestehende `roles`-Arrays bleiben gültig) und der richtige Weg (kein #48-drop-and-recreate).
      Sicherheitsrelevanter Betriebshinweis: Die Migration **muss vor/mit dem Code-Deploy laufen** –
      läuft der Code mit Enum-Wert `veranstalter`, während die DB noch `abrechner` führt, verlieren
      Owner ihren Zugriff (fail-closed, keine Öffnung). Reihenfolge Migration → Deploy einhalten;
      lokaler Wegwerf-DB-Nachtest ist noch offen (Implement-Blocker der Task – Ops, kein Security-Blocker).
- [x] [Injection] Kein neuer Injection-Vektor: DB-Zugriff weiterhin ausschließlich über die
      Drizzle-Data-Layer (parametrisiert), keine rohen SQL-Strings in Actions/UI. Die einzige rohe
      SQL ist die statische Migration `0007` ohne Nutzer-Input.
- [x] [Secrets] Keine hartkodierten Credentials. `db/seed.ts` liest weiterhin
      `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` aus der Umgebung (nur Klartext-Konstante geändert:
      `"Verwalter/Abrechner"` → `"Verwalter/Veranstalter"`, ein Anzeigename, kein Geheimnis).
- [x] [Auth-Coverage] Alle sechs Server Actions behalten ihren RBAC-Guard
      (`requireRole("veranstalter")` bzw. `requireAnyRole(["verwalter","veranstalter"])`,
      `app/abrechnung/veranstaltung/actions.ts`); reine String-Ersetzung, TypeScript erzwingt den
      gültigen `UserRole`-Wert. Keine Action verlor ihren Guard.
- [ ] [Info-Disclosure] Keine neuen Stack-Traces/sensitiven Fehlermeldungen nach außen; die
      Access-Denied-Protokollierung (`should_logRejection_when_accessDenied`) bleibt serverseitig.

## Ergebnis
PASSED
