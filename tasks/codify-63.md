## Codify-Report: Task 63

Feature: Prod-DB-Migration + Post-Deploy-Healthcheck im Deploy-Gate. Review: 1 kritischer Bug +
2 wichtige Punkte (alle im Zyklus behoben). Security: PASSED. Die wertvollste Erkenntnis stammt
aus dem kritischen Review-Finding.

### Neue Regeln hinzugefügt

**`docs/factory/PROJECT-CONTEXT.md` → Bekannte Stolpersteine:**
- **Öffentliche API-Routen aus dem Auth-Proxy ausnehmen** – wegen: `/api/health` war vom
  `proxy.ts`-Matcher erfasst → 307-Redirect statt 200, DB-Read lief nie; der Healthcheck war
  funktionslos. **Doppelt tückisch:** der Unit-Test rief `GET()` direkt auf (umging den Proxy)
  und war grün → der Bug wäre erst live aufgefallen. Regel: jede unauth. Route explizit in den
  Matcher-Negativ-Lookahead; Nachweis auf Proxy-Ebene, nicht nur Handler.

### Bestätigte, bereits verankerte Muster (kein neuer Eintrag nötig)

- **Fail-closed & keine stillen Skips:** Der zweite wichtige Fund (PRD-Migration hing an einem
  optionalen INT-Refresh) ist eine Instanz der bereits gelebten „Gates statt Vertrauen"-Regel –
  in ADR-017 (Kopplung ADR-015→017) dokumentiert und über den Pflicht-Secrets-Check erzwungen.
- **Sekret-Dateien immer per `trap` aufräumen** (nicht nur Happy-Path) – als Härtung in INT- und
  PRD-Step umgesetzt; deckt sich mit dem Grundsatz „Secrets nie im Repo/liegen lassen".

### Kein neuer Check / keine Guideline-/CLAUDE.md-Änderung

- **Kein Check-Skript:** „Route fehlt im Proxy-Matcher" ist statisch kaum verlässlich greifbar
  (Matcher ist ein Regex-String) und der Fehler ist selten + laut (Healthcheck rot). Ein Gate
  wäre Über-Engineering (YAGNI). Die Regel + der Gate-Healthcheck als Live-Nachweis genügen.
- **Stack-spezifisch** (Next 16 proxy.ts) → PROJECT-CONTEXT, nicht die stack-agnostischen Guidelines.

### Empfehlung für nächste Features

- Prozess-Learning: Unit-Tests, die einen Handler direkt aufrufen, decken **Middleware/Proxy-
  Verhalten nicht ab**. Für alles, was hinter `proxy.ts` liegt, den Nachweis auf Gate-/e2e-Ebene führen.
- Offene, bewusst vertagte Nitpicks (Backlog): Secrets im „Secrets vorhanden?"-Check über `env:`
  statt inline; Rate-Limit/Caching für `/api/health`; Hinweis in `factory-ci.yml`,
  `FACTORY_HEALTHCHECK_URL` nicht auf `/api/health` zu zeigen (Timing vs. Promote).
