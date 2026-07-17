# ADR 025: Rollenbewusste, PWA-taugliche Navigation

## Status
Accepted

## Date
2026-07-17

## Kontext

[Spec-134](../specs/spec-134-navigationsmenue.md) verlangt ein zentrales, rollengefiltertes
Navigationsmenü + eine rollenbewusste Startseite `/`, optimiert für PWA/Touch, und die saubere
Behandlung des login-freien Theken-Kontexts (spec-54). Die Spec lässt drei Fragen offen:

1. **Mobil-Navigationsmuster** (Drawer vs. Bottom-Nav).
2. **Schnitt Server-/Client-Component** (Rollenfilterung serverseitig, Auf-/Zuklappen clientseitig).
3. **Robuste Erkennung des öffentlichen Theken-Kontexts.**

Ausgangslage im Code:
- Nur **Tailwind v4 + React 19**. **Kein** shadcn/ui (`components.json` fehlt), keine
  `lucide-react`/`clsx`/`class-variance-authority` – die PROJECT-CONTEXT-Nennung von shadcn/ui
  ist bislang unerfüllt.
- Das Root-Layout (`app/layout.tsx`) rendert global `AppHeader` (Server Component; `auth()`,
  liefert `null` ohne Session) unter `StageBanner`.
- Rollen liegen serverseitig in der Session (`session.user.roles`), Prädikate in
  [`lib/authz.ts`](../../lib/authz.ts) (`hasRole`/`hasAnyRole`).
- Der Theken-Pfad `theke/[token]` ist im `proxy.ts`-Matcher **ausgenommen** → der
  `authorized`-Callback läuft dort **nicht**; ein unangemeldeter Gast erreicht ihn. Alle anderen
  Seiten leiten unangemeldete Nutzer auf `/login` um. Faktisch sind die **einzigen** von
  Unangemeldeten sichtbaren Seiten `/login` und `theke/[token]`.

## Entscheidung

**D1 – Kein neues UI-Framework.** Die Navigation wird als kleine, projekteigene Komponente mit
Tailwind v4 gebaut. **Kein** shadcn/ui, keine Icon-/util-Bibliothek für dieses Feature (≈4
Einträge + Toggle). YAGNI; die Einführung eines UI-Frameworks wäre eine eigene, separat zu
begründende ADR.

**D2 – Server filtert, Client bedient.** Zwei-Schichten-Schnitt:
- Eine **Server Component** (Weiterentwicklung von `AppHeader` → `AppNav`) ruft `auth()` auf und
  berechnet die **rollengefilterte** Eintragsliste serverseitig. Nur erlaubte Einträge werden als
  reine Daten an den Client übergeben – verbotene Einträge erreichen den Client gar nicht (erfüllt
  „nicht nur clientseitig ausgeblendet", spec-134/spec-48).
- Eine **Client Component** (`NavBar`) rendert die responsive Darstellung, das Auf-/Zuklappen, den
  aktiven Zustand (`aria-current` via `usePathname()`) und die Tastatur-/Fokus-Bedienung.

**D3 – Eine Quelle für das Navigationsmodell.** Die Bereichs-Einträge (Label, Route, erforderliche
Rolle(n)) leben in **einem** Modul `lib/navigation.ts` mit einer reinen Funktion
`navItemsForRoles(roles)`. Sowohl `AppNav` als auch die Startseite `/` konsumieren dieselbe
Funktion → keine doppelte Rollenlogik (DRY). Domänenname statt generischem `utils`
(Codify-Regel #105).

**D4 – Kontext über Session-Präsenz + Pfad, nicht über Verzeichnis-Move.** `AppNav` bleibt global
im Root-Layout und unterscheidet:
- **angemeldet** → volle rollengefilterte Navigation + „Abmelden" (`signOutAction`);
- **nicht angemeldet** → eine minimale öffentliche Leiste mit **dezentem „Anmelden"-Link**, die per
  `usePathname()` auf `/login` unterdrückt wird (Login-Seite bleibt sauber). Für Unangemeldete ist
  der einzige verbleibende öffentliche Kontext `theke/[token]` → dort erscheint der dezente
  „Anmelden"-Einstieg, **kein** Personal-Menü, keine `/login`-Umleitung.

**D5 – Mobil: Off-Canvas-Drawer, Desktop: Inline-Leiste.** Auf schmalen Viewports ein per
Hamburger auf-/zuklappbarer Drawer; ab `sm:` eine sichtbare horizontale Leiste. Touch-Ziele
≥ 44 px, `env(safe-area-inset-*)` respektiert, Dark Mode wie bisher.

## Alternativen

### Zu D1: shadcn/ui einführen
**Pro:** fertige, barrierearme Sheet/NavigationMenu-Primitives; konsistent mit PROJECT-CONTEXT-Plan.
**Contra:** neues Framework + Radix-/Icon-Abhängigkeiten für 4 Einträge; Setup (components.json,
CSS-Vars) ist Eigenaufwand; verstößt gegen YAGNI. → Verworfen für dieses Feature (später separat
möglich).

### Zu D4: Route-Groups mit getrennten Layouts (`app/(app)/…` vs. öffentlich)
**Pro:** Kontext strukturell über Layout-Grenzen kodiert, keine Laufzeit-Erkennung; sehr sauber.
**Contra:** erfordert das Verschieben von `page.tsx`, `veranstaltung/`, `verwaltung/` in eine
Gruppe – ein breiter Umbau kurz nach dem Route-Schnitt aus ADR-024; höheres Regressionsrisiko,
größerer Diff. → Verworfen zugunsten der reversiblen, lokal begrenzten D4. Die Layout-Grenze kann
`theke/[token]` bei Bedarf in #54 nachgezogen werden (eigenes Theken-Layout).

### Zu D5: Bottom-Navigation
**Pro:** daumenfreundlich, „native" PWA-Anmutung.
**Contra:** eignet sich für einen festen 3–5-Ziele-Satz; unsere Einträge sind rollenabhängig
(1–3) und „Abmelden"/„Anmelden" passen schlecht in eine Bottom-Bar; kollidiert optisch mit dem
Gast-Erfassungs-Flow. → Verworfen; Drawer skaliert flexibler.

## Begründung

D1/D2/D3 folgen den Projekt-Prinzipien: kleinste Lösung die trägt (YAGNI), serverseitige
Durchsetzung als Sicherheitsgrenze (fail-closed, spec-48/ADR-016), eine Verantwortung pro Modul
(SRP/DRY). D4 vermeidet einen breiten Verzeichnis-Umbau direkt nach ADR-024 und nutzt, dass der
Theken-Pfad ohnehin proxy-frei ist – die Unterscheidung „angemeldet/öffentlich" ist mit
Session-Präsenz + Pfad testbar und reversibel. D5 ist komponenten-lokal und jederzeit änderbar.

## Konsequenzen

- **Neu:** `lib/navigation.ts` (`navItemsForRoles`), `AppNav` (Server, ersetzt/erweitert
  `AppHeader`), `NavBar` (Client, responsive + a11y), rollenbewusste Startseite `app/page.tsx`.
- `AppHeader` geht in `AppNav` auf; die bestehenden `AppHeader`-Tests werden migriert/erweitert
  (Session-Fälle bleiben abgedeckt).
- **Keine** neuen Runtime-Dependencies, keine DB-/Schema-Änderung, keine Änderung an
  `proxy.ts`/`auth.config.ts`.
- **Testbarkeit:** `navItemsForRoles` rein/mockfrei unit-testbar; `AppNav` über gemockte `auth()`
  (bestehendes Muster); `NavBar` als Client-Component mit Testing Library (Toggle/Fokus/`aria-current`).
- **Bekannte Grenze:** Öffnet **angemeldetes** Personal `theke/[token]`, sieht es die volle
  Navigation (Session vorhanden). Der Guest-Schutz zielt auf **Unangemeldete**; eine feinere
  Trennung kann #54 über ein eigenes Theken-Layout nachziehen (D4-Alternative).
- **Superseded-Hinweis:** Eine spätere shadcn/ui-Einführung würde D1 ablösen (neue ADR), nicht D2–D4.
