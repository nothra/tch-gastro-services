# Review: Task 134

> **Review-Runde 2 [2026-07-19]** – Re-Review nach Rework der beiden wichtigen Findings aus
> Runde 1 (Fokus-Trap W1, `resetAllMocks` W2). Beide sind im Branch verifiziert (siehe unten).
> Der Circuit Breaker (max. 3 Iterationen) ist nicht erreicht.

## Kritische Findings (müssen behoben werden)
- [ ] Keine.

## Wichtige Findings (sollten behoben werden)
- [ ] Keine offen.

**Verifikation der Runde-1-Findings (beide behoben):**

- **W1 – Fokus-Trap (`AppNav.tsx:33-49`, ehem. offen):** Der `keydown`-Effekt fängt Tab jetzt
  im Drawer: Vorwärts-Tab am letzten fokussierbaren Element → erstes; Shift+Tab am ersten
  Element bzw. auf dem Drawer-Container (`tabIndex=-1`) → letztes; entwichener Fokus
  (`!drawer.contains(active)`) → erstes. Die `focusable`-Abfrage ist auf `drawerRef.current`
  beschränkt (`a[href], button:not([disabled])`) und schließt damit die verdeckte Desktop-Nav
  sowie den Backdrop-Button korrekt aus. `aria-modal="true"` hält damit sein Versprechen
  (Fokus-Containment, WAI-ARIA APG). Belegt durch zwei neue Tests
  (`should_wrapFocusToCloseButton_when_tabAtLastDrawerLink`,
  `should_wrapFocusToLastLink_when_shiftTabAtFirstDrawerElement`). ✔
- **W2 – `vi.resetAllMocks()` (#51-Regel):** `AppHeader.test.tsx`, `page.test.tsx` und
  `nav-consistency.test.tsx` nutzen jetzt `vi.resetAllMocks()` (setzen eigene
  `mockResolvedValue`-Implementierungen). `AppNav.test.tsx` behält `clearAllMocks()` und
  re-seedet `pathnameMock` explizit im `beforeEach` – regel-konform (keine leakende
  `mockReturnValue`/`mockRejectedValue`). ✔

## Nitpicks (optional)
- [ ] `app/components/AppNav.tsx` (Padding) — Horizontales Padding nutzt nur
      `env(safe-area-inset-left)`; der rechte Inset (`safe-area-inset-right`) wird nicht separat
      berücksichtigt. Nur im Landscape-Modus relevant (Portrait korrekt). Bewusst offen gelassen.
- [ ] `app/components/AppNav.tsx` — Zwei Schließ-Bedienelemente mit unterschiedlichem
      `aria-label` (Overlay „Menü schließen" vs. ✕-Button „Navigation schließen"). Kosmetisch.
- [ ] `app/components/AppNav.tsx` — `aria-label="Navigation öffnen"` bleibt bei
      `aria-expanded={true}` „öffnen"; `aria-expanded` transportiert den Zustand korrekt.
- [ ] `app/components/AppNav.tsx` — Kein Body-Scroll-Lock bei offenem Drawer (Hintergrund bleibt
      mobil scrollbar). Für einen modalen Drawer üblich, aber optional.

> Alle vier Nitpicks wurden in Runde 1 aufgenommen und in der Task-Datei bewusst als
> „nicht umgesetzt (YAGNI, kein Merge-Blocker)" dokumentiert – hier nur zur Vollständigkeit
> aufgeführt, keine Änderung erwartet.

## Positives
- **Rework sauber und minimal umgesetzt:** Der Fokus-Trap ist auf den Drawer-Scope begrenzt,
  ohne die Server/Client-Trennung oder die kanonische Menü-Definition anzufassen; die
  `resetAllMocks`-Umstellung folgt exakt der kodifizierten #51-Regel (inkl. begründetem
  `clearAllMocks`-Verbleib, wo keine Implementierung leakt).
- Kanonische `lib/navigation.ts` bleibt ein pures, framework-freies Modul analog `lib/authz.ts`;
  `visibleNavItems` filtert serverseitig über `hasRole` (ADR-016/ADR-031). Fail-closed für
  leere/`undefined`/`null`/unbekannte + Legacy-Rolle (`abrechner`) implementiert **und** getestet.
- Verhaltensorientierte Testabdeckung durchgängig: Rollen-Matrix je Rolle, „kein Menü ohne
  Session", Drawer öffnen/Escape/Fokus-Rückgabe/Fokus-Trap/Navigation-schließt, Anonym-Leiste
  ohne geschützte Links, Konsistenz-Test (`nav-consistency.test.tsx`: identische Bereichsmenge
  Header ↔ Dashboard aus **einer** Definition).
- `AppHeader` erweitert statt ersetzt (`return null` ohne Session → `/login` sauber); keine neuen
  Laufzeit-Abhängigkeiten; Server/Client-Schnitt exakt wie in ADR-031. Progressive Enhancement
  gewahrt (SSR-Links + Form-Action ohne JS nutzbar; nur mobiles Aufklappen braucht JS).
- Kommentare erklären das WHY mit ADR-Verweis; `viewportFit: "cover"` korrekt ergänzt; kein
  Routen-Drift (`docs/routes.md` unverändert, `/` existiert bereits).

## Empfehlung
APPROVED

> Beide wichtigen Findings aus Runde 1 sind im Branch behoben und durch neue Tests belegt.
> Keine kritischen oder wichtigen Findings offen; die verbleibenden Nitpicks sind bewusst und
> dokumentiert außerhalb des Scopes. Interaktive Browser-Verifikation (kein lokaler Dev-Server
> in dieser Session) über `/verify` bzw. `/post-merge-verify`. Weiter zu `/test`.
