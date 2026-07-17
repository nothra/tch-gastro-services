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
Architektur-Entscheidung: [ADR-025](../docs/adr/025-navigation-rollenbewusst-pwa.md).
Die drei offenen Fragen aus spec-134 sind dort beantwortet:
- Mobil-Muster → **Off-Canvas-Drawer** (mobil) + **Inline-Leiste** ab `sm:` (ADR-025 D5)
- Schnitt → **Server filtert, Client bedient** (ADR-025 D2)
- Theken-Kontext → **Session-Präsenz + `usePathname()`**, kein Verzeichnis-Move (ADR-025 D4)

**Wichtig:** shadcn/ui ist NICHT installiert → mit Tailwind v4 + React 19 selbst bauen,
keine neuen Runtime-Deps (ADR-025 D1).

Implementierungs-Reihenfolge (TDD):
1. `lib/navigation.ts` – reine Funktion `navItemsForRoles(roles)` → gefilterte Einträge
   (Label, href, Rolle). Einzige Quelle für Nav + Startseite (ADR-025 D3). Rollen-Prädikate
   aus `lib/authz.ts` wiederverwenden. Unit-Tests: je Rolle / beide / keine Rolle.
2. `NavBar` (Client Component) – erhält gefilterte Einträge als Daten; responsive Drawer
   (Hamburger mobil, Inline ab `sm:`), `aria-current` via `usePathname()`, Tastatur
   (Escape schließt, Fokus-Führung), Touch-Ziele ≥ 44 px, `env(safe-area-inset-*)`, Dark Mode.
   Tests: Toggle auf/zu, aktiver Eintrag, Tastatur.
3. `AppNav` (Server Component) – ersetzt/erweitert `AppHeader`: `auth()`; angemeldet →
   `navItemsForRoles(roles)` + `<NavBar>` + „Abmelden" (`signOutAction`); nicht angemeldet →
   minimale öffentliche Leiste mit dezentem „Anmelden"-Link, auf `/login` unterdrückt.
   Bestehende `AppHeader`-Tests migrieren/erweitern. In `app/layout.tsx` einbinden.
4. `app/page.tsx` – Server Component, rollenbewusste Startseite: `navItemsForRoles(roles)`
   als Kacheln/Liste. Tests je Rolle.

Nicht anfassen: `proxy.ts`, `auth.config.ts`, DB/Schema. Kein `theke/[token]`-Seitenbau (#54).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/134-navigationsmenue`
Erstellt: 2026-07-17 17:07
