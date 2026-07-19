# Review: Task 134

## Kritische Findings (müssen behoben werden)
- [ ] Keine.

## Wichtige Findings (sollten behoben werden)
- [ ] `app/components/AppNav.tsx:96` (Drawer-`<div>`) — Der Drawer trägt `role="dialog"`
      **und `aria-modal="true"`**, aber es gibt **keinen Fokus-Trap**. Bei geöffnetem Drawer
      bleiben der Hamburger-Toggle und der „Abmelden"-Button (beide **außerhalb** des Drawers,
      hinter dem `z-40`-Overlay) weiterhin tabbar. Ein Tastatur-/Screenreader-Nutzer tabbt aus
      dem Drawer heraus auf verdeckte Header-Bedienelemente – genau das, was `aria-modal="true"`
      der assistiven Technik als *nicht möglich* zusagt. Die WAI-ARIA APG verlangt für einen
      modalen Dialog Fokus-Containment. Damit ist das AC „ARIA + Fokus-Management … Tab
      navigieren" nur teilweise erfüllt. Fix: Fokus auf die fokussierbaren Elemente im Drawer
      einschränken (Tab/Shift+Tab am Rand umlenken) **oder** `aria-modal` weglassen und die
      Zusage nicht geben. Pflicht-Begleitung: Test, der belegt, dass Tab am letzten Drawer-Link
      wieder zum ersten (bzw. zur Schließen-Schaltfläche) springt und nicht zum Header.
- [ ] `app/components/AppHeader.test.tsx:22`, `app/page.test.tsx:19`,
      `app/nav-consistency.test.tsx:44` — `beforeEach(() => vi.clearAllMocks())`, obwohl die
      Tests eigene Mock-Implementierungen setzen (`authMock.mockResolvedValue(...)`). Das
      verstößt gegen die kodifizierte Regel aus #51 (CLAUDE.md / „Vitest ohne globals"):
      `clearAllMocks()` löscht nur die Call-History, **nicht** die Implementierung → eine
      `mockResolvedValue` kann zwischen Blöcken/Dateien leaken (Reihenfolge-Abhängigkeit).
      Aktuell latent, weil **jeder** Test seine `mockResolvedValue` neu setzt – aber die Regel
      verlangt hier explizit `vi.resetAllMocks()`. `app/components/AppNav.test.tsx` (nur
      `pathnameMock`/`signOutAction` als `vi.fn()`) darf `clearAllMocks()` behalten.

## Nitpicks (optional)
- [ ] `app/components/AppNav.tsx:79,96` & `app/components/PublicHeader.tsx:13` — Horizontales
      Padding nutzt nur `env(safe-area-inset-left)` (`px-[max(1rem,env(safe-area-inset-left))]`);
      der **rechte** Inset (`safe-area-inset-right`) wird für die rechte Kante mitverwendet, nicht
      der tatsächliche rechte Inset. Im Landscape-Modus (Notch/Home-Indicator rechts) kann rechts
      liegender Inhalt (Abmelden) knapp unter den Ausschnitt geraten. Portrait (primärer Mobil-Fall)
      ist korrekt. Erwägen: `pr-[max(...,env(safe-area-inset-right))]` ergänzen.
- [ ] `app/components/AppNav.tsx:106,116` — Zwei Schließ-Bedienelemente mit **unterschiedlichem**
      `aria-label`: Overlay „Menü schließen" vs. ✕-Button „Navigation schließen". Einheitlich
      formulieren (beide „Navigation schließen").
- [ ] `app/components/AppNav.tsx:70` — `aria-label="Navigation öffnen"` bleibt auch bei
      `aria-expanded={true}` „öffnen". `aria-expanded` transportiert den Zustand zwar korrekt;
      ein zustandsabhängiges Label (öffnen/schließen) wäre präziser. Geringe Auswirkung.
- [ ] `app/components/AppNav.tsx` — Kein Body-Scroll-Lock bei offenem Drawer; der Hintergrund
      bleibt auf Mobil scrollbar. Für einen modalen Off-Canvas-Drawer üblich zu sperren
      (`overflow-hidden` am `body` solange offen). Optional.

## Positives
- Kanonische `lib/navigation.ts` ist ein pures, framework-freies Modul analog `lib/authz.ts`;
  `visibleNavItems` filtert serverseitig über `hasRole` (ADR-016/ADR-031 sauber eingehalten).
  Fail-closed für leere/`undefined`/`null`/unbekannte Rollen ist implementiert **und** getestet
  (inkl. Legacy-Rolle `abrechner`).
- Sehr gute, verhaltensorientierte Testabdeckung: Rollen-Matrix je Rolle, „kein Menü ohne
  Session", Drawer öffnen/Escape/Fokus-Rückgabe/Navigation schließt, Anonym-Leiste ohne
  geschützte Links, und der Konsistenz-Test (`nav-consistency.test.tsx`) belegt identische
  Bereichsmenge zwischen Header und Dashboard aus **einer** Definition.
- `AppHeader` wird erweitert statt ersetzt (`return null` ohne Session bleibt → `/login` sauber);
  keine neuen Laufzeit-Abhängigkeiten; Server/Client-Schnitt exakt wie in ADR-031 beschrieben
  (Client bekommt nur bereits gefilterte Items, entscheidet keine Rollen).
- Kommentare erklären durchgängig das WHY mit ADR-Verweis; `viewportFit: "cover"` korrekt in
  `app/layout.tsx` ergänzt (Grundlage der Safe-Area-Insets). Kein Routen-Drift → `docs/routes.md`
  bleibt unverändert (korrekt, `/` existiert bereits).
- Progressive Enhancement gewahrt: Desktop-Links und „Abmelden" sind SSR-gerendert und ohne JS
  nutzbar; nur das mobile Aufklappen setzt JS voraus (spec-134 erlaubt das explizit).

## Empfehlung
NEEDS_REWORK

> Keine kritischen Findings. Zwei wichtige Punkte sollten vor dem Merge behoben werden:
> der fehlende Fokus-Trap trotz `aria-modal="true"` (A11y-AC nur teilweise erfüllt) und die
> `vi.clearAllMocks()`-Verwendung entgegen der kodifizierten #51-Regel. Beide Fixes sind klein.
