# Task 134: navigationsmenue

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Rollenbewusstes, PWA-optimiertes Navigationsmenü + rollenbewusste Startseite `/`.
Bündelt die bestehenden Funktionsbereiche (Veranstaltungen, Katalog, Teilnehmer),
filtert Einträge serverseitig nach den Rollen (`verwalter`/`veranstalter`) und behandelt
den login-freien Theken-Self-Service-Kontext separat (kein Personal-Menü, dezenter
„Anmelden"-Einstieg). Details: [spec-134](../docs/specs/spec-134-navigationsmenue.md).

Baut auf RBAC (spec-48), Theken-Self-Service (spec-54) und Route-Schnitt (ADR-024) auf.

## Akzeptanzkriterien
Kanonische Quelle mit vollständigen GIVEN-WHEN-THEN: [spec-134](../docs/specs/spec-134-navigationsmenue.md).

Rollenbasierte Sichtbarkeit (Menü):
- [ ] `veranstalter` sieht „Veranstaltungen", nicht „Katalog"/„Teilnehmer"
- [ ] `verwalter` sieht „Katalog"+„Teilnehmer", nicht „Veranstaltungen"
- [ ] Nutzer mit beiden Rollen sieht alle Bereichs-Einträge
- [ ] Rollenprüfung erfolgt serverseitig (Session/`lib/authz.ts`), nicht nur clientseitig
- [ ] „Abmelden" ruft die bestehende `signOutAction` auf

Rollenbewusste Startseite `/`:
- [ ] Angemeldeter Nutzer sieht auf `/` seine verfügbaren Bereiche als Kacheln/Liste
- [ ] Startseiten-Kacheln folgen denselben Rollenregeln wie das Menü

Login-freier / öffentlicher Kontext:
- [ ] `/login` zeigt kein angemeldetes Navigationsmenü
- [ ] Theken-Self-Service (`theke/[token]`): kein Personal-Menü, keine `/login`-Umleitung, kein Link auf geschützte Bereiche
- [ ] Dezenter „Anmelden"-Einstieg im Theken-Kontext, ohne den Gast-Flow zu verdrängen

PWA / Mobile / A11y:
- [ ] Mobil auf-/zuklappbar, Desktop direkt sichtbar
- [ ] Touch-Ziele ≥ 44×44 px
- [ ] Safe-Area-Insets (`env(safe-area-inset-*)`) respektiert
- [ ] Aktiver Eintrag markiert (`aria-current="page"`)
- [ ] Tastatur-/A11y-Bedienung (öffnen/schließen via Escape, Fokus-Führung, ARIA-Rollen)
- [ ] Dark Mode unterstützt

Fehlerszenarien:
- [ ] Manipulierte/abgelaufene Session → keine geschützten Einträge (fail-closed)
- [ ] Angemeldeter Nutzer ohne jede Rolle → nur „Abmelden", kein Fehler

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Offene Fragen für /architecture (siehe spec-134):
- Mobil-Navigationsmuster (Drawer vs. Bottom-Nav) – ggf. ADR
- Schnitt Server-/Client-Component (Rollenfilterung server, Auf-/Zuklappen client)
- Robuste Erkennung des öffentlichen Theken-Kontexts (Routen-Segment vs. fehlende Session)

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/134-navigationsmenue`
Erstellt: 2026-07-17 17:07
