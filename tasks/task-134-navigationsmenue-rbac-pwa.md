# Task 134: navigationsmenue-rbac-pwa

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
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
- [x] `veranstalter` sieht „Veranstaltungen", nicht „Katalog"/„Teilnehmer".
- [x] `verwalter` sieht „Katalog" + „Teilnehmer", nicht „Veranstaltungen".
- [x] Nutzer mit beiden Rollen sieht alle drei Bereichs-Einträge.
- [x] Session mit leerem Rollen-Array: kein Bereichs-Eintrag, „Abmelden" bleibt (fail-closed).
- [x] Sichtbarkeit serverseitig über `hasRole`/`hasAnyRole` (Server-Component), nicht nur per Client/CSS.

### Anonymer / login-freier Kontext
- [x] Kein angemeldetes Menü ohne Session (z. B. `/login` bleibt sauber).
- [x] Anonym-Leiste: kein Personal-Menü, kein Link auf geschützte Bereiche, keine `/login`-Umleitung.
- [x] Anonym-Leiste zeigt übergebenen Kontextnamen + höchstens dezenten „Anmelden"-Einstieg.

### Startseite als Dashboard-Hub
- [x] Angemeldeter Nutzer sieht auf `/` seine Bereiche als Kacheln – aus derselben Menü-Definition.
- [x] Nutzer mit nur einer Rolle sieht nur die zu seiner Rolle gehörenden Kacheln.

### PWA / Mobile / Bedienbarkeit
- [x] Mobil auf-/zuklappbar über ein Bedienelement; Desktop direkt sichtbar.
- [x] Touch-Ziele ≥ 44×44 px; Safe-Area-Insets (`env(safe-area-inset-*)`) respektiert.
- [x] Aktiver Bereich via `aria-current="page"` markiert.
- [x] „Abmelden" aus dem Menü heraus über bestehende `signOutAction`.
- [x] Menü per Tastatur bedienbar (Enter/Space öffnen, Escape schließen, Tab navigieren); ARIA + Fokus-Management.
- [x] Dark Mode analog `AppHeader`.

### Tests
- [x] Rollen-Sichtbarkeit je Rolle + „kein Menü ohne Session".
- [x] Auf-/Zuklappen des mobilen Menüs (Escape schließt, Fokus).
- [x] Anonym-Leiste (Kontextname, kein geschützter Link).
- [x] Header-Menü und Dashboard nutzen dieselbe rollengefilterte Definition.
- [x] Ggf. E2E für den mobilen Menü-Flow.

### Fehlerszenarien
- [x] Unbekannte/zukünftige Rolle → kein Eintrag (fail-closed, kein Absturz).
- [x] Ohne JS: Desktop-Links + „Abmelden" nutzbar (mobiles Aufklappen darf JS voraussetzen).
- [x] Navigation schließt das offene mobile Menü (kein hängendes Overlay).

**Implementierungs-Notiz [2026-07-19]:** Umgesetzt gemäß ADR-031. Neue Dateien:
`lib/navigation.ts` (kanonische Definition + `visibleNavItems`), `app/components/AppNav.tsx`
(Client-Drawer: Toggle/Escape/Fokus, `aria-current`), `app/components/PublicHeader.tsx`
(Anonym-Leiste), erweitert: `app/components/AppHeader.tsx` (Server-Filterung), `app/page.tsx`
(Dashboard-Hub), `app/layout.tsx` (`viewportFit: "cover"`). Tests: 33 neue Fälle über 6 Dateien
inkl. `nav-consistency.test.tsx` (Header↔Dashboard gleiche Bereichsmenge) und
`e2e/navigation.spec.ts` (mobiler Drawer-Flow; skippt ohne `SEED_ADMIN_*`).
Gates lokal grün: Lint, `pnpm test` (406 passed / 52 skipped), Typecheck, Format, Routen-Doku.
Interaktive Browser-Verifikation offen (kein lokaler Dev-Server/DB in dieser Session) →
Nachweis über `/verify` bzw. `/post-merge-verify`.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**ADR:** [docs/adr/031-navigationsmenue-architektur.md](../docs/adr/031-navigationsmenue-architektur.md)

**Entscheidungen:**
- **UI-Basis: reines Tailwind + eigene Primitive** – kein shadcn/ui (Over-Engineering für eine
  Komponente; kollidiert mit Tailwind-v4-CSS-first + `prefers-color-scheme`). Konsistent zu
  `AppHeader`/`StageBanner`.
- **Mobil: Off-Canvas-Drawer** über Hamburger im `AppHeader`; Desktop (`md:`+) horizontale
  Inline-Nav. Keine zweite Kopfzeile / kein Bottom-Nav.
- **Kanonische Menü-Definition** in einem puren Modul; Kopfzeile + Dashboard leiten daraus ab.

**Umsetzung (Implementierungs-Hinweise für `/implement`):**
- Neues Modul **`lib/navigation.ts`** (pur, framework-frei, analog `lib/authz.ts`):
  - `type NavItem = { label: string; href: string; requiredRole: UserRole }`
  - Liste: Veranstaltungen→`/veranstaltung` (`veranstalter`), Katalog→`/verwaltung/katalog`
    (`verwalter`), Teilnehmer→`/verwaltung/teilnehmer` (`verwalter`).
  - Reine Funktion `visibleNavItems(roles)` auf Basis `hasRole` (ADR-016).
  - „Abmelden" ist **keine** `NavItem` (Aktion) → separat im Header via `signOutAction`.
- **`AppHeader`** (Server Component) erweitern, nicht ersetzen: `auth()` lesen,
  `visibleNavItems(session.user.roles)` berechnen, Desktop-Inline-Links (SSR `<a>`, ohne JS
  nutzbar) + „Abmelden" (Form). Gefilterte Items an einen **Client-Teil** für Drawer
  (Toggle/Escape/Fokus) und aktive Markierung (`usePathname()` → `aria-current="page"`) geben.
  Ohne Session weiterhin `return null` (`/login` bleibt sauber).
- **`app/page.tsx`** → Dashboard-Hub (Server Component): dieselbe `visibleNavItems(roles)`,
  Bereiche als Kacheln (≥ 44×44 px). Kein neuer Routen-Eintrag → `docs/routes.md` unverändert.
- Neue **`app/components/PublicHeader.tsx`** (Anonym-Leiste): Props `{ contextLabel?: string }`,
  Kontextname + dezenter „Anmelden"-Link, kein geschützter Link. **Nicht** global gemountet
  (opt-in; #54 hängt sie auf `theke/[token]` ein).
- **PWA:** Touch-Ziele `min-h-[44px]`/`min-w-[44px]`; Safe-Area via `env(safe-area-inset-*)`.
  **`app/layout.tsx` `viewport`-Export um `viewportFit: "cover"` ergänzen** (sonst
  safe-area-inset = 0 auf iOS). Dark Mode über bestehende `dark:`-Utilities (keine Config-Änderung).
- **Keine** neuen Laufzeit-Abhängigkeiten; **kein** Umbau bestehender Routen-/Rollen-Guards.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Durch [ADR-031](../docs/adr/031-navigationsmenue-architektur.md) entschieden:
- [x] Navigationsmuster mobil → **Off-Canvas-Drawer** (kein Bottom-Nav).
- [x] UI-Baustein-Basis → **reines Tailwind + eigene Primitive** (kein shadcn/ui).
- [x] Schnittstellenform der Anonym-Leiste → **`PublicHeader`-Komponente**, Props
      `{ contextLabel? }`, opt-in (nicht global gemountet).

## Review-Findings
<!-- Wird durch /review befüllt -->

**Review-Runde 1 [2026-07-19]** (`tasks/review-134.md`, Verdict NEEDS_REWORK, keine kritischen Findings).
Beide wichtigen Findings behoben (Rework via `/implement`):

- **W1 – Fokus-Trap fehlt trotz `aria-modal="true"` (`AppNav.tsx`):** Der Drawer gibt der
  assistiven Technik `aria-modal="true"` an, hatte aber kein Fokus-Containment – Tab tabbte auf
  die verdeckten Header-Bedienelemente (Hamburger, Abmelden) hinter dem Overlay. **Fix:** Tab
  wird im `keydown`-Effekt gefangen (Vorwärts am letzten Element → erstes; Rückwärts am ersten
  Element bzw. auf dem Drawer-Container → letztes; entwichener Fokus → zurück auf erstes).
  Belegt durch zwei neue Tests (`should_wrapFocusToCloseButton_when_tabAtLastDrawerLink`,
  `should_wrapFocusToLastLink_when_shiftTabAtFirstDrawerElement`).
- **W2 – `vi.clearAllMocks()` entgegen #51-Regel:** In `AppHeader.test.tsx`, `page.test.tsx`,
  `nav-consistency.test.tsx` auf `vi.resetAllMocks()` umgestellt (Tests setzen eigene
  `mockResolvedValue`-Implementierungen → müssen zurückgesetzt werden). `AppNav.test.tsx` behält
  `clearAllMocks()` (nur `vi.fn()` ohne Implementierung – Regel-konform).

Nitpicks (safe-area-inset-right, uneinheitliche `aria-label`, zustandsabhängiges Toggle-Label,
Body-Scroll-Lock) bewusst nicht umgesetzt – optional, kein Merge-Blocker, außerhalb des
NEEDS_REWORK-Scopes (YAGNI). Gates nach Rework grün: Lint, `pnpm test` (408 passed / 52 skipped),
Typecheck, Format, Routen-Doku.

**Review-Runde 2 [2026-07-19]** (`tasks/review-134.md`): APPROVED. Beide Runde-1-Findings
verifiziert behoben, keine kritischen/wichtigen Findings offen; verbleibende Nitpicks bewusst
dokumentiert außerhalb des Scopes.

**Test-Vervollständigung [2026-07-19] (`/test`):** Coverage-Analyse (`pnpm test:coverage`) ergab
zwei ungetestete Branches im per Rework neu hinzugekommenen Fokus-Trap
(`app/components/AppNav.tsx`, Zeilen 52 und 58): (1) Shift+Tab, während der Fokus noch auf dem
Drawer-Container selbst liegt (Zustand direkt nach dem Öffnen, bevor ein Kind fokussiert wurde),
und (2) Tab, während der Fokus komplett aus dem Drawer entwichen ist (z. B. Screenreader-
Navigation auf ein verdecktes Header-Element). Beide sind reale Tastatur-Szenarien des AC
„Menü per Tastatur bedienbar" – zwei neue Tests ergänzt:
`should_wrapFocusToLastLink_when_shiftTabPressedRightAfterOpen`,
`should_returnFocusToFirstDrawerElement_when_tabPressedWhileFocusEscapedDrawer`
(`app/components/AppNav.test.tsx`). Verbleibende Branch-Lücken (`AppNav.tsx:45-47`, Ref-Null-Guard
und Leer-Fokusliste-Guard; `AppHeader.tsx:14`, vorbestehender E-Mail-Fallback aus #48/#62) sind
defensive Guards ohne praktisch erreichbaren Gegenfall bzw. außerhalb des Task-Scopes – bewusst
ungetestet (YAGNI, kein Over-Engineering). Gates grün: `pnpm test` (410 passed / 52 skipped),
`pnpm test:coverage` (85.41 % Stmts / 92.22 % Branches, über der 80 %-Schwelle), Typecheck,
Format, Routen-Doku (`bash scripts/checks/pre-push.sh`).

**Refactoring [2026-07-19] (`/refactor`):** Fokus-Trap-/Fokus-Management-Logik (Escape,
Tab-Containment, Fokus-Rückgabe an den Auslöser) aus `AppNav.tsx` in einen eigenen Hook
`app/components/useNavDrawerFocus.ts` extrahiert (SRP: Rendering vs. Fokus-Verhalten getrennt).
`AppNav.tsx` von 161 auf 106 Zeilen reduziert, keine Verhaltensänderung – bestehende Tests
(inkl. Fokus-Trap-Fälle aus Review-Runde 1 und Test-Vervollständigung) laufen unverändert gegen
die Komponente und blieben grün. Gates grün: Lint, `pnpm test` (410 passed / 52 skipped),
Typecheck, Format, Routen-Doku (`pre-commit.sh` + `pre-push.sh`).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

**Codify [2026-07-19]** (`tasks/codify-134.md`): Neuer Stolperstein in
`docs/factory/PROJECT-CONTEXT.md` – „`aria-modal="true"` ist ein Versprechen, kein
Automatismus – Fokus-Trap explizit bauen + alle Branches testen" (aus Review-Finding W1 +
dem Coverage-Nachfund in `/test`). Review-Finding W2 (`clearAllMocks` vs. `resetAllMocks`)
brauchte keine neue Regel – bestehende #51-Regel wurde im Rework korrekt angewendet. Die
Security-Review-Notiz zu `PublicHeader.contextLabel` (XSS-Vorsorge für #54) wurde als
Breadcrumb-Kommentar auf Issue #54 hinterlassen statt kodifiziert (Folge-Task-spezifisch,
kein wiederkehrendes Muster).

---
Branch: `feature/134-navigationsmenue-rbac-pwa`
Erstellt: 2026-07-19 12:01
