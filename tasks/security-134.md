# Security Review: Task 134

Scope: `git diff main...HEAD` – rollenbewusstes PWA-Navigationsmenü. Neuer/geänderter
Produktionscode: `lib/navigation.ts`, `app/components/AppHeader.tsx`,
`app/components/AppNav.tsx`, `app/components/PublicHeader.tsx`,
`app/components/useNavDrawerFocus.ts`, `app/page.tsx`, `app/layout.tsx`. Rest: Tests + Docs.

Threat Surface: Reine UI-/Navigations-Schicht. Keine neuen Routen, keine DB-Zugriffe, keine
neuen Server Actions, keine neuen Laufzeit-Abhängigkeiten. RBAC-Sichtbarkeit ist Komfort;
die Durchsetzung bleibt in den Routen/Server Actions (`requireRole`/`requireAnyRole`, ADR-016).

## Kritische Findings (Blocker)
- [ ] Keine.

## Wichtige Findings
- [ ] Keine.

## Hinweise
- [ ] **[AuthZ – bestätigt korrekt]** Sichtbarkeit wird serverseitig berechnet
  (`AppHeader`/`app/page.tsx` → `auth()` → `visibleNavItems(session.user.roles)`); die
  Client-Komponente `AppNav` erhält nur die bereits gefilterten Items und trifft keine
  Rollen-Entscheidung. `hasRole` ist fail-closed (`undefined`/`null`/leeres Rollen-Array →
  `false`). Kein IDOR/BOLA-Surface (kein Objektzugriff). Kein Handlungsbedarf – als
  Positiv-Beleg dokumentiert.
- [ ] **[XSS – Vorsorge für #54]** `PublicHeader.contextLabel` und die statischen
  `NavItem.label`/`href` werden über React (`{...}`, `next/link`) gerendert und damit
  automatisch escaped. Aktuell sind alle Werte feste Literale. Wenn #54 `contextLabel` mit
  einem **dynamischen** Veranstaltungs-/Thekennamen speist, bleibt der String durch das
  React-Escaping sicher – solange er als Textknoten gerendert wird (kein
  `dangerouslySetInnerHTML`, keine Interpolation in `href`/`style`). Kein Fix nötig; nur als
  Leitplanke für die anhängende Task festgehalten.
- [ ] **[Information Disclosure – unkritisch]** `AppHeader` zeigt `session.user.email` in der
  Kopfzeile. Das ist die eigene E-Mail des angemeldeten Nutzers (Selbstauskunft), keine
  Preisgabe fremder Daten; nur für authentifizierte Sessions gerendert (`if (!session?.user)
  return null`). Kein Handlungsbedarf.
- [ ] **[Config – geprüft]** `viewportFit: "cover"` in `app/layout.tsx` ist eine reine
  Viewport-/Safe-Area-Einstellung ohne Sicherheitsrelevanz.

## Ergebnis
PASSED
