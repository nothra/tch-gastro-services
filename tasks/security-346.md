# Security Review: Task 346

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] `app/veranstaltung/actions.ts` `setVeranstaltungCatalogAction` – schmales TOCTOU-Fenster
  zwischen `assertKatalogWaehlbar` (Zielkatalog aktiv?) und dem guarded UPDATE. Sicherheitsrelevanz
  gering: keine Rechteausweitung, kein Datenverlust möglich (Kataloge tragen keine Berechtigungen,
  nur Preise); der guarded UPDATE (`WHERE status='offen'`) fängt zusätzlich eine parallel
  abgeschlossene Veranstaltung ab. Korrektheits-, kein Sicherheits-Thema (bereits im
  Review-Report als Nitpick erfasst).

## Ergebnis
PASSED

## Geprüft
- Input-Validierung (Zod + async DB-Existenz-/Aktiv-Check, keine SQL-Injection-Fläche –
  durchgängig parametrisierte Drizzle-Queries)
- Autorisierung: `requireRole("veranstalter")` als erste Zeile der Action, fail-closed vor
  jedem DB-Zugriff; kein BOLA/IDOR (Einzelmandanten-App, Fremdschlüssel wird gegen
  Existenz/Aktiv-Status geprüft, bevor geschrieben wird)
- Erreichbarkeit: Wechsel-Action ist vollständig vom Token-/QR-Pfad der Teilnehmer getrennt,
  kein Bypass-Weg ohne Session; RBAC sitzt in der Action, nicht nur im UI-Rendering
- Error Handling: keine Stack-Traces/DB-Fehlerdetails nach außen, nur generische Fehlercodes
- Dependencies: `package.json`/Lockfile unverändert
- Migration 0013: rein additiv, kein `ON DELETE CASCADE`, Default entspricht dem bisher
  einzigen Katalog (kein impliziter Preiswechsel für Bestandsveranstaltungen)
- Logging: keine sensiblen Werte in Logs
