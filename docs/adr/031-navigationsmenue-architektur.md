# ADR 031: Architektur des rollenbewussten Navigationsmenüs

## Status

Accepted

## Kontext

Issue #134 (spec-134) fordert ein rollenbewusstes, PWA-taugliches Navigationsmenü. Der
bestehende `AppHeader` (`app/components/AppHeader.tsx`) zeigt heute nur E-Mail + „Abmelden";
Bereiche sind nur über direkte URLs erreichbar. Zu bauen sind: (a) eine rollengefilterte
Kopfzeilen-Navigation, (b) ein rollengefilterter Dashboard-Hub auf `/`, (c) eine
wiederverwendbare Anonym-Orientierungsleiste für den login-freien Theken-Kontext (Einhängen
durch #54).

Drei Architektur-Fragen sind zu entscheiden, bevor implementiert wird:

1. **UI-Baustein-Basis** – Das Issue erwähnt shadcn/ui. Im Repo existiert aber **kein**
   shadcn/ui, kein Radix, keine CVA; `components/ui/` fehlt. Der Stack ist **Tailwind v4**
   (CSS-first `@import "tailwindcss"`, **kein** `tailwind.config.js`), Dark Mode über
   `prefers-color-scheme`, und alle bestehenden Komponenten (`AppHeader`, `StageBanner`) sind
   schlanke, hand-rolled Server/Client-Components mit Tailwind-Utilities.
2. **Mobiles Navigationsmuster** – Off-Canvas-Drawer vs. Bottom-Nav/Bottom-Sheet (Issue nennt
   beides als Option).
3. **Wo lebt die Rollen-Filterung** und wie bleibt sie DRY über Kopfzeile **und** Dashboard,
   ohne verstreutes RBAC (spec-134: „eine kanonische Menü-Definition").

Relevante bestehende Entscheidungen: [ADR-016](016-rbac-rollen-login.md) (RBAC-Rollen,
`lib/authz.ts` mit `hasRole`/`hasAnyRole`), [ADR-024](024-route-schnitt-veranstaltung-lifecycle.md)
(Routen-Schnitt/Rollennamen), spec-54/ADR-024 (öffentlicher `theke/[token]`-Kontext).

## Entscheidung

**1. UI-Basis: reines Tailwind + eigene, kleine, zugängliche Primitive – kein shadcn/ui.**
Die Navigation wird konsistent zu `AppHeader`/`StageBanner` mit Tailwind-Utilities und
hand-rolled A11y (ARIA, Fokus-Management) gebaut. shadcn/ui wird **nicht** eingeführt. Die
Erwähnung im Issue ist ein Vorschlag, keine bindende Vorgabe (analog zur #105-Regel: ein im
Issue genannter Baustein-/Name ist Platzhalter, kein Freibrief).

**2. Mobiles Muster: Off-Canvas-Drawer, ausgelöst über einen Hamburger-Button im bestehenden
`AppHeader`.** Auf Desktop-Breite (Tailwind `md:`+) horizontale Inline-Navigation direkt im
Header; auf schmalen Viewports ein Toggle-Button, der einen von der Seite einfahrenden Drawer
öffnet. **Keine** zweite, separat fixierte Chrome-Leiste (kein Bottom-Nav) – die Navigation
bleibt Teil der **einen** Kopfzeile (spec-134: „keine parallele zweite Kopfzeile").

**3. Kanonische Menü-Definition in `lib/navigation.ts` (pures Modul).** Eine Liste der
navigierbaren Bereiche + eine reine Filterfunktion; Kopfzeile **und** Dashboard leiten ihre
sichtbaren Einträge daraus ab. Server/Client-Schnitt: die **Rollen-Filterung läuft
serverseitig** (Server Component liest `auth()`), der Client-Teil bekommt nur die bereits
gefilterten Einträge und erledigt Cosmetics (Drawer auf/zu, `aria-current`).

## Alternativen

### Frage 1 – UI-Basis

**Option A: shadcn/ui einführen (wie im Issue erwähnt).**
- Vorteile: fertige, getestete A11y-Primitive (Dialog/Sheet mit Fokus-Falle); langfristig
  weniger handgeschriebene Interaktions-Logik, wenn viele UI-Komponenten folgen.
- Nachteile: bringt Radix + CVA + `clsx` + `tailwind-merge` + `components.json` als neue
  Abhängigkeiten. shadcn/ui geht per Default von **class-basiertem** Dark Mode und einem
  `tailwind.config.js` aus – kollidiert mit dem hier genutzten Tailwind-v4-CSS-first-Setup und
  `prefers-color-scheme`. Für **eine** kleine Navigations-Komponente unverhältnismäßig
  (YAGNI/Over-Engineering laut `clean-code.md`); großer Setup- und Bundle-Aufwand für kaum
  wiederverwendeten Nutzen im aktuellen Umfang. Erhöht die PWA-Bundle-Größe.

**Option B: reines Tailwind + eigene Primitive (gewählt).**
- Vorteile: keine neuen Laufzeit-Abhängigkeiten; konsistent mit dem bestehenden Code; volle
  Kontrolle über A11y/Fokus; kleines Bundle (relevant für PWA/mobil); nichts am Tailwind-v4-/
  Dark-Mode-Setup zu ändern.
- Nachteile: Fokus-Management/ARIA für den mobilen Drawer selbst schreiben und testen. Bei
  künftig **vielen** komplexen Komponenten müsste die Bibliotheks-Frage neu gestellt werden.

### Frage 2 – mobiles Muster

**Option A: Off-Canvas-Drawer (gewählt).**
- Vorteile: eine Kopfzeile, ein Toggle; skaliert auf beliebig viele (auch 1–3) Einträge; hält
  den Inhaltsbereich frei; etabliertes, vertrautes Muster; Fokus-Management klar umrissen
  (Fokus in den Drawer, Escape schließt, Fokus zurück auf den Toggle).
- Nachteile: Öffnen erfordert einen Extra-Tap; Drawer-Interaktion braucht JS (Desktop-Links
  funktionieren ohne JS weiter → Progressive Enhancement bleibt gewahrt).

**Option B: Bottom-Nav / Bottom-Sheet.**
- Vorteile: sehr gute Daumen-Erreichbarkeit; „native App"-Gefühl in der installierten PWA.
- Nachteile: zweite, dauerhaft fixierte Leiste **neben** der Kopfzeile (widerspricht „keine
  zweite Kopfzeile"); zusätzlicher Safe-Area-Konflikt am unteren Rand (Home-Indicator);
  Bottom-Nav ist v. a. für eine **feste**, kleine Zahl gleichrangiger Ziele gedacht – hier
  variiert die Zahl rollenabhängig (1–3), was eine Bottom-Nav unruhig macht.

## Begründung

Der Umfang ist **eine** Navigations-Komponente auf einem betont schlanken Stack. Das
Einfachste, das die Anforderungen (RBAC-Sichtbarkeit, Mobile/PWA, A11y, Dark Mode) erfüllt,
ist reines Tailwind + eigene Primitive – shadcn/ui + Radix wäre Über-Architektur und
kollidierte mit dem Tailwind-v4-/`prefers-color-scheme`-Setup (YAGNI, `clean-code.md`). Der
Off-Canvas-Drawer respektiert „eine Kopfzeile", vermeidet den unteren Safe-Area-Konflikt und
hat ein klar testbares Fokus-Modell. Die kanonische `lib/navigation.ts` (pures Modul, analog zu
`lib/authz.ts`) verhindert verstreutes RBAC, ist mock-frei testbar und hält Kopfzeile +
Dashboard konsistent. Die serverseitige Filterung stellt sicher, dass Sichtbarkeit aus der
Session stammt (Komfort), während die echte Durchsetzung unverändert in den Routen/Actions
bleibt (ADR-016). Beide Entscheidungen sind **reversibel**: wächst die UI-Komplexität, kann
shadcn/ui später in einer eigenen ADR eingeführt werden, ohne die kanonische Menü-Definition
oder den Server/Client-Schnitt anzufassen.

## Konsequenzen

- **Neues Modul `lib/navigation.ts`** (pur, framework-frei): `NavItem`-Typ
  (`{ label; href; requiredRole: UserRole }`), Liste der drei Bereiche (Veranstaltungen →
  `/veranstaltung` `veranstalter`; Katalog → `/verwaltung/katalog` `verwalter`; Teilnehmer →
  `/verwaltung/teilnehmer` `verwalter`) und eine reine Funktion `visibleNavItems(roles)` auf
  Basis von `hasRole` (ADR-016). „Abmelden" ist **keine** `NavItem` (Aktion, keine Route) und
  wird separat im Header über die bestehende `signOutAction` gerendert.
- **`AppHeader` (Server Component) wird erweitert**, nicht ersetzt: liest `auth()`, berechnet
  `visibleNavItems(session.user.roles)`, rendert Desktop-Inline-Nav (serverseitige `<a>`-Links,
  ohne JS nutzbar) + „Abmelden" (Form-Action, ohne JS nutzbar) und übergibt die gefilterten
  Einträge an einen **Client-Teil** für den mobilen Drawer (Toggle, Fokus, Escape) und die
  aktive Markierung (`usePathname()` → `aria-current="page"`; cosmetic). Verhalten für
  **kein Session bleibt: `return null`** (`/login` bleibt sauber).
- **`app/page.tsx` wird Dashboard-Hub** (Server Component): nutzt dieselbe
  `visibleNavItems(roles)` und rendert die Bereiche als touch-taugliche Kacheln
  (≥ 44×44 px). Kein neuer Routen-Eintrag (`/` existiert bereits) → **kein**
  `docs/routes.md`-Drift, Routen-Doku-Check bleibt grün.
- **Neue Komponente `app/components/PublicHeader.tsx`** (Anonym-Orientierungsleiste): Props
  `{ contextLabel?: string }`, zeigt den Kontextnamen + höchstens einen dezenten
  „Anmelden"-Link (`/login`), **kein** Link auf geschützte Bereiche. **Nicht** im Root-Layout
  global gemountet (sonst erschiene sie auf `/login`); opt-in – #54 hängt sie auf
  `theke/[token]` ein. Importiert nichts Feature-spezifisches.
- **PWA/Mobile-Details:** Touch-Ziele über `min-h-[44px]`/`min-w-[44px]`; Safe-Area über
  `env(safe-area-inset-*)`-Utilities. Dafür muss der `viewport`-Export in `app/layout.tsx` um
  **`viewportFit: "cover"`** ergänzt werden, sonst liefern die `safe-area-inset`-Werte auf iOS
  0. Dark Mode über die bestehenden `dark:`-Utilities (`prefers-color-scheme`) – **keine**
  Config-Änderung nötig.
- **Keine neuen Laufzeit-Abhängigkeiten**; kein Umbau bestehender Routen-/Rollen-Guards
  (Scope-Grenze spec-134).
- **Testbarkeit:** `visibleNavItems` als reine Funktion (Rollen-Matrix inkl. leeres/unbekanntes
  Rollen-Array) mock-frei testbar; `AppHeader`/Dashboard über gemocktes `auth()`; der
  Client-Drawer über `@testing-library/user-event` (öffnen/Escape/Fokus); `PublicHeader`
  isoliert. Optionaler Playwright-E2E für den mobilen Flow.
