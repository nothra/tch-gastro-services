# Task 134: navigationsmenue-rbac-pwa

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->

Rollenbewusstes, PWA-optimiertes Navigationsmenü. Erweitert den bestehenden `AppHeader`
(keine zweite Kopfzeile) zu einer rollengefilterten Navigation, macht die Startseite `/`
zu einem rollengefilterten Dashboard-Hub und liefert eine wiederverwendbare Anonym-
Orientierungsleiste für den login-freien Theken-Kontext (Einhängen durch #54). Alle
Sichtbarkeit über **eine** kanonische Menü-Definition, serverseitig via `lib/authz.ts`
gefiltert; die eigentliche Durchsetzung bleibt in den Routen/Server Actions.

**Spec:** [docs/specs/spec-134-navigationsmenue-rbac-pwa.md](../docs/specs/spec-134-navigationsmenue-rbac-pwa.md)

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->

### Rollen-Sichtbarkeit (RBAC)
- [ ] `veranstalter` sieht „Veranstaltungen", nicht „Katalog"/„Teilnehmer".
- [ ] `verwalter` sieht „Katalog" + „Teilnehmer", nicht „Veranstaltungen".
- [ ] Nutzer mit beiden Rollen sieht alle drei Bereichs-Einträge.
- [ ] Session mit leerem Rollen-Array: kein Bereichs-Eintrag, „Abmelden" bleibt (fail-closed).
- [ ] Sichtbarkeit serverseitig über `hasRole`/`hasAnyRole` (Server-Component), nicht nur per Client/CSS.

### Anonymer / login-freier Kontext
- [ ] Kein angemeldetes Menü ohne Session (z. B. `/login` bleibt sauber).
- [ ] Anonym-Leiste: kein Personal-Menü, kein Link auf geschützte Bereiche, keine `/login`-Umleitung.
- [ ] Anonym-Leiste zeigt übergebenen Kontextnamen + höchstens dezenten „Anmelden"-Einstieg.

### Startseite als Dashboard-Hub
- [ ] Angemeldeter Nutzer sieht auf `/` seine Bereiche als Kacheln – aus derselben Menü-Definition.
- [ ] Nutzer mit nur einer Rolle sieht nur die zu seiner Rolle gehörenden Kacheln.

### PWA / Mobile / Bedienbarkeit
- [ ] Mobil auf-/zuklappbar über ein Bedienelement; Desktop direkt sichtbar.
- [ ] Touch-Ziele ≥ 44×44 px; Safe-Area-Insets (`env(safe-area-inset-*)`) respektiert.
- [ ] Aktiver Bereich via `aria-current="page"` markiert.
- [ ] „Abmelden" aus dem Menü heraus über bestehende `signOutAction`.
- [ ] Menü per Tastatur bedienbar (Enter/Space öffnen, Escape schließen, Tab navigieren); ARIA + Fokus-Management.
- [ ] Dark Mode analog `AppHeader`.

### Tests
- [ ] Rollen-Sichtbarkeit je Rolle + „kein Menü ohne Session".
- [ ] Auf-/Zuklappen des mobilen Menüs (Escape schließt, Fokus).
- [ ] Anonym-Leiste (Kontextname, kein geschützter Link).
- [ ] Header-Menü und Dashboard nutzen dieselbe rollengefilterte Definition.
- [ ] Ggf. E2E für den mobilen Menü-Flow.

### Fehlerszenarien
- [ ] Unbekannte/zukünftige Rolle → kein Eintrag (fail-closed, kein Absturz).
- [ ] Ohne JS: Desktop-Links + „Abmelden" nutzbar (mobiles Aufklappen darf JS voraussetzen).
- [ ] Navigation schließt das offene mobile Menü (kein hängendes Overlay).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Für `/architecture` (siehe Spec):
- [ ] Navigationsmuster mobil: Off-Canvas-Drawer vs. Bottom-Nav/Bottom-Sheet (ADR).
- [ ] UI-Baustein-Basis: shadcn/ui einführen (fehlt noch im Repo) vs. reines Tailwind (ggf. ADR).
- [ ] Schnittstellenform der Anonym-Orientierungsleiste (Props, opt-in statt global gemountet).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/134-navigationsmenue-rbac-pwa`
Erstellt: 2026-07-19 12:01
