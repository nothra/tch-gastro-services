## Codify-Report: Task 120

### Neue Regeln hinzugefügt

**[docs/factory/PROJECT-CONTEXT.md] ALTER TYPE RENAME VALUE: Deploy-Reihenfolge**
– wegen: Security-Hinweis aus review-120 / security-120: `ALTER TYPE … RENAME VALUE`
ist der korrekte verlustfreie Weg für reine Enum-Umbenennung, aber Reihenfolge
Migration → Code-Deploy ist zwingend. Deployed Code zuerst, verlieren alle Owner den
Zugriff (fail-closed, kein Escalation-Risiko, aber Lockout). Ergänzt den bestehenden
Drizzle-Migration-Stolperfalle-Abschnitt (aus #48).

**[docs/factory/PROJECT-CONTEXT.md] Branch-Typ und Label korrigieren wenn Scope wächst**
– wegen: Task startete als `docs/`-Branch mit Label `documentation` (ADR-Frage), aber
`/architecture` bundelte Code-Änderungen (Enum-Migration, Verzeichnis-Move, Tests).
Branch/Label wurden nie korrigiert – fiel erst im Review auf. Neue Regel: nach
`/architecture` prüfen ob Branch-Typ noch passt; falls Code in Scope → Branch + Label
vor `/implement` anpassen (inklusive konkretem Kommando-Rezept).

### Positives – bestätigte Muster (keine Regeländerung nötig)

- **Blocker-Dokumentation funktioniert:** Session-Permission-Gates (kein `git mv`,
  kein `pnpm db:up`) wurden korrekt nach dem Muster `Blocker [Datum]: … – was der
  Mensch tun muss` in der Task-Datei protokolliert. Kein stilles Warten.
- **Doku-Sync vorbildlich (Codify W-02/W-03):** spec-48, ADR-016, PROJECT-CONTEXT,
  Phasen-Specs 52–55 alle konsistent auf `veranstalter` aktualisiert; keine Alt-
  Formulierungen stehen geblieben.
- **Enum-Migration lehrbuchhaft:** `ALTER TYPE … RENAME VALUE` statt drop-and-recreate,
  Snapshot-Kette lückenlos. Grep `abrechner` = 0 im lebenden Code.
- **Guard-Branch-Tests vollständig:** `should_reject…when_userLacks…Role`-Tests
  mitgezogen – Codify-Regel aus #51 greift.

### Empfehlung für nächste Features

Beim Start einer Architektur-Task (`/architecture`) – besonders wenn die Spec-Phase noch
offene „Wie schneiden wir das?"-Fragen hat – realistisch einschätzen, ob die Entscheidung
Code-Arbeit nach sich zieht. Falls ja: Branch bereits als `feature/` oder `improvement/`
anlegen statt `docs/`, um den Umbenennung-Aufwand zu sparen. Im Zweifel lieber `feature/`
(kann auch nur ADR enthalten, ist aber keine falsche Einordnung).
