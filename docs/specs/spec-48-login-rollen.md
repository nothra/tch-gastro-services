# Spec: Login & Rollen (Verwalter/Abrechner)

> Feature F1 · Issue #48 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Die App verwaltet Preise, Stammdaten, Abende und Bargeld. Diese Aktionen dürfen nur
berechtigte Personen ausführen. Es gibt zwei Verantwortlichkeiten: **Verwalter** (pflegt
Stammdaten & Preise) und **Abrechner** (führt Abende, kassiert). Teilnehmer der
Montagsrunde brauchen **kein** Konto (siehe F7 Selbstbedienung).

## Scope

**Inbegriffen:**
- Anmeldung für Login-pflichtige Personen (baut auf dem Auth.js-Gerüst aus Task #16 auf).
- Zwei Rollen: `verwalter` und `abrechner`.
- Serverseitige Durchsetzung der Rollenrechte (Middleware **und** in Server Actions).
- Abmelden.

**Nicht inbegriffen:**
- Selbstregistrierung / Passwort-Reset-Flows (Konten werden vom Verwalter angelegt).
- Konten für Teilnehmer (die identifizieren sich per Namenswahl, F7).
- Feingranulare Rechte über die zwei Rollen hinaus.

## Rollenrechte (Referenz für abhängige Features)

| Aktion | Verwalter | Abrechner |
|---|---|---|
| Getränke-Katalog & Preise pflegen (F2) | ✅ | ❌ |
| Teilnehmer-Stammdaten pflegen (F3) | ✅ | ❌ |
| Abend anlegen/führen/abschließen (F4, F8) | ✅ | ✅ |
| Verzehr erfassen (F5) | ✅ | ✅ |
| Kassieren (F8) | ✅ | ✅ |

> Eine Person kann beide Rollen haben (Dieter/Ralf sind faktisch beides).

## Akzeptanzkriterien

- [ ] GIVEN ein nicht angemeldeter Besucher WHEN er eine geschützte Seite (Stammdaten,
      Abend-Verwaltung) öffnet THEN wird er zur Anmeldung geleitet und sieht keine
      geschützten Daten.
- [ ] GIVEN gültige Zugangsdaten WHEN sich eine Person anmeldet THEN ist sie angemeldet
      und ihre Rolle(n) bestimmen die sichtbaren/erlaubten Aktionen.
- [ ] GIVEN ein angemeldeter **Abrechner** (ohne Verwalter-Rolle) WHEN er die
      Katalog- oder Stammdaten-Pflege aufruft THEN wird die Aktion serverseitig
      abgelehnt (nicht nur im UI ausgeblendet).
- [ ] GIVEN ein angemeldeter **Verwalter** WHEN er Katalog/Stammdaten öffnet THEN darf
      er lesen und schreiben.
- [ ] GIVEN ein angemeldeter Nutzer WHEN er sich abmeldet THEN ist die Sitzung beendet
      und geschützte Seiten sind wieder gesperrt.
- [ ] GIVEN ein manipulierter/abgelaufener Session-Zustand WHEN eine geschützte Server
      Action aufgerufen wird THEN wird sie abgelehnt.

## Fehlerszenarien

- [ ] Falsche Zugangsdaten → verständliche Fehlermeldung, kein Zugang, keine
      Preisgabe, ob der Benutzername existiert.
- [ ] Zugriff auf fremde Rolle → serverseitige Ablehnung (403-artig), protokolliert.

## Gesetzte Entscheidungen (2026-07-11)

- **Keine Selbstregistrierung.** Konten werden vom Verwalter angelegt.
- **Login im MVP über E-Mail+Passwort** (Credentials-Provider aus Task #16), **kein**
  zusätzlicher Login-Provider.

## Offene Fragen (für /architecture)

- [ ] Mechanik der initialen Konto-Anlage (Seed-Skript vs. manuell in der DB) →
      /architecture.
