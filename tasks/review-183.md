# Review: Task 183

## Kritische Findings (müssen behoben werden)
- _Keine._

## Wichtige Findings (sollten behoben werden)
- [x] **BEHOBEN (/implement, 2026-07-20):** `toggle` delegiert jetzt an `waehleZiel`
      (`openId === id ? setOpenId(null) : waehleZiel(id)`); die Seiteneffekte (`writeZielId`,
      `scrollIntoView`) laufen dadurch außerhalb der `setOpenId`-Updater-Funktion. Der Updater ist
      rein → keine Doppelausführung unter StrictMode/Concurrent-Rendering, kein Cross-Component-
      State-Update während des Renders. Gates grün (558 Tests, Typecheck, Format, Routen-Doku).
- [ ] **`app/theke/[token]/FokusListe.tsx:51-61`** – `toggle` ruft Seiteneffekte
      (`writeZielId(...)` und `scrollIntoView(...)`) **innerhalb der `setOpenId`-Updater-Funktion**
      auf. Updater-Funktionen müssen rein sein (React-Regel) – sie laufen in der Render-Phase und
      unter StrictMode/Concurrent-Rendering **zweimal**. Zwei konkrete Folgen:
      (1) doppeltes `writeZielId` + doppeltes `scrollIntoView`;
      (2) das synchrone `dispatchChange()` in `writeZielId` benachrichtigt **während des Renderns
      von `FokusListe`** die `useSyncExternalStore`-Subscription des Elternteils `IdentityGate`
      (dessen `useIdentitaet` das Event abonniert und beim Kartenwechsel eine geänderte `zielId`
      liest) → Cross-Component-State-Update während des Renders (die Fehlerklasse „Cannot update a
      component while rendering a different component"). Funktional bleibt es unauffällig, weil
      `writeZielId` idempotent denselben Wert schreibt und die Tests ohne StrictMode grün sind – es
      ist aber genau die React-Reinheitsverletzung, die dieses Projekt wiederholt codifiziert hat
      (`set-state-in-effect`, Purity-Regeln). `waehleZiel` (Zeile 41-48) macht es bereits **richtig**
      (Effekte außerhalb des Updaters). Empfehlung: `toggle` an `waehleZiel` delegieren, z. B.
      `const toggle = useCallback((id) => (openId === id ? setOpenId(null) : waehleZiel(id)), [openId, waehleZiel])`,
      oder Seiteneffekte aus dem Updater herausziehen und `setOpenId` rein lassen.

## Nitpicks (optional)
- [ ] **`app/theke/[token]/IdentityGate.tsx:136`** – `erfasser?.anzeigename ?? ""` ist ein
      faktisch unerreichbarer Null-Fall: `erfasserId` stammt aus `readErfasserId`, das die ID bereits
      gegen `zeilen` validiert (Stale → `null`), daher findet `zeilen.find(...)` hier immer einen
      Treffer. Defensiv, aber toter Fallback – kann entfallen oder als bewusst-defensiv kommentiert
      werden.
- [ ] **`app/_verzehr/VerzehrErfassung.tsx:118-124`** – Der collapsible Kopf-Button trägt
      `aria-expanded`, aber keine Verknüpfung (`aria-controls`) zum Körper-Bereich (WAI-ARIA
      Disclosure-Pattern). Für einfache AT ausreichend; `aria-controls` + `id` am Körper würde die
      Zuordnung für Screenreader schärfen (vgl. Codify #134 zu ARIA-Versprechen).
- [ ] **`app/theke/[token]/FokusListe.test.tsx:68-75`** –
      `should_switchZielCloseOthersAndPersist_when_chipTapped` prüft nach dem Chip-Tipp nur
      `getAllByTestId("menge").toHaveLength(1)` (genau eine offen) + `localStorage`-Ziel, aber nicht
      **welche** Karte offen ist. Ein zusätzliches `expect(cardHead("Bernd")).toHaveAttribute("aria-expanded","true")`
      würde belegen, dass wirklich die Ziel-Karte (nicht Anna) offen ist. Der Kopf-Tipp-Test deckt
      das indirekt bereits ab.

## Positives
- **Saubere Wiederverwendung ohne F5-Regression:** `ZeileKarte` exportiert + optionale Akkordeon-Props;
  ohne die Props unverändert (F5-Pfad), mit Regressions-Test `should_renderFullBody_when_noAccordionProps`.
  Import-Richtung `app/theke → app/_verzehr` regelkonform (Codify #52), ADR-035 D2 exakt umgesetzt.
- **Persistenz solide:** IDs statt Namen (robust gegen Namensgleichheit/Umbenennung), fail-open
  try/catch bei fehlendem localStorage, Stale-ID → `null`, Legacy-Adoption (#54, D6) inkl.
  Keep-/No-Match-/Idempotenz-Tests – alle Fehlerszenarien abgedeckt.
- **`useSyncExternalStore` statt `useEffect`+setState** zum Lesen der Identität – vermeidet die
  codifizierte `set-state-in-effect`-Falle (#49); Legacy-Adoption im Effekt schreibt nur
  localStorage + Event, kein setState.
- **AC-Abdeckung vollständig und je Kriterium separiert** (Zweischritt, „Für mich" als erste Option +
  Reihenfolge-Assertion, Stale-Fallbacks je Schritt, Erfasser-Wechsel, Read-only ohne Gate, Leerliste).
- Read-only „geschenkt" über denselben `FokusListe`-Pfad (`editable=false`, kein Gate), inkl. Test,
  dass Chips read-only aufklappen ohne zu persistieren.

## Empfehlung
NEEDS_REWORK
