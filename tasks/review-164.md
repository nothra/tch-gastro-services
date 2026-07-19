# Review: Task 164

Diff: `app/components/AppNav.tsx`, `app/page.tsx` (Fix: `prefetch={false}`),
`app/nav-prefetch.test.tsx` (neu), `tasks/task-164-dashboard-force-dynamic.md` (Doku).
Kein `docs/specs/spec-164.md` (Bug ohne Spec). Keine Routen-Änderung → `docs/routes.md` korrekt unangetastet.

## Kritische Findings (müssen behoben werden)
- [ ] **Fix unvollständig für einen `security`-Bug – Logout-Race bleibt auf anderen Seiten offen.**
      Der belegte Root Cause ist generisch: *jede* authentifizierte Prefetch-Antwort rotiert das
      Auth.js-Session-Cookie und kann es nach `signOut` wiederbeleben. Der Fix setzt `prefetch={false}`
      aber nur an zwei Stellen (Header + Dashboard-Hub). Weitere geschützte `<Link>`s prefetchen
      unverändert und reproduzieren denselben Race beim Abmelden **von diesen Seiten**:
      - `app/veranstaltung/page.tsx:43` → `/veranstaltung/${v.id}`
      - `app/veranstaltung/[id]/page.tsx:45` → `/veranstaltung`
      - `app/veranstaltung/[id]/page.tsx:63` → `/veranstaltung/${id}/verzehr`
      - `app/veranstaltung/[id]/page.tsx:69` → `/veranstaltung/${id}/auslagen`
      Der **gemeldete** Pfad (`/`) ist geschlossen (AppNav rendert auf jeder Seite), aber die
      Schwachstelle „Logout hält nicht" ist nicht durchgängig behoben. **Empfehlung:** zentraler,
      zukunftssicherer Fix statt Whack-a-Mole – z. B. in `proxy.ts` das rotierende Session-`Set-Cookie`
      auf **Prefetch-Requests** (Header `Next-Router-Prefetch: 1`) unterdrücken (Prefetch soll die
      Session ohnehin nicht verlängern). Alternativ `prefetch={false}` **konsistent** auf allen
      geschützten Links + Guard/Konvention, damit künftige Links es nicht wieder vergessen (genau
      dieses Vergessen war die #134-Regression).

## Wichtige Findings (sollten behoben werden)
- [ ] **Test prüft den Prop, nicht das Verhalten.** `app/nav-prefetch.test.tsx` assertet
      `data-prefetch="false"` (Implementierungsdetail), nicht „kein Netzwerk-Prefetch". Das ist
      vertretbar, weil das echte Verhalten nur im Browser/e2e beobachtbar ist – aber wenn das
      Kritische Finding über einen **zentralen** Fix (proxy.ts) gelöst wird, testet dieser Prop-Test
      das Falsche und müsste durch einen Test der zentralen Logik (Set-Cookie-Unterdrückung bei
      Prefetch) ersetzt/ergänzt werden. Bei per-Link-Lösung sollte der Test alle betroffenen
      Call-Sites abdecken, nicht nur Header + Dashboard.
- [ ] **Keine zentrale Prefetch-Konvention (Architektur/Konsistenz).** Die Prefetch-Entscheidung
      liegt verstreut an einzelnen `<Link>`-Call-Sites. Ohne gemeinsames Muster (z. B. `AppLink`-
      Wrapper mit `prefetch={false}`-Default für interne/geschützte Routen) oder zentralen Mechanismus
      bleibt die Codebase anfällig für dieselbe Klasse Regression. Verstärkt das Kritische Finding.

## Nitpicks (optional)
- [ ] WHY-Kommentar in `app/components/AppNav.tsx` und `app/page.tsx` nahezu dupliziert
      (2–3 Zeilen). Akzeptabel über Dateigrenzen, könnte knapper auf `#164` verweisen.
- [ ] `areaLinks` + `AREA_HREFS` in `app/nav-prefetch.test.tsx` duplizieren die Bereichs-Href-Logik
      aus `app/nav-consistency.test.tsx` (`areaHrefsWithin`). Geringe Test-Helfer-Duplikation –
      ggf. in einen gemeinsamen Test-Helper ziehen.

## Positives
- Root Cause **empirisch** ermittelt (Playwright-Netzwerk-Trace, Set-Cookie-Reihenfolge), nicht geraten;
  die Issue-Vermutung (`force-dynamic`) korrekt als No-op widerlegt (`/` ist bereits dynamisch/no-store).
- Deterministischer RED→GREEN-Reproduktionstest trotz nicht-deterministischem Laufzeit-Race.
- Vorbildliche Root-Cause-/Fix-Dokumentation in der Task-Datei inkl. Trace-Beleg.
- Server-seitige Durchsetzung (proxy/authz) unangetastet; keine neue Abhängigkeit; korrekt keine
  `routes.md`-Änderung.

## Empfehlung
NEEDS_REWORK
