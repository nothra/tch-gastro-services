# Review: Task 183

> **Runde 2** (2026-07-20). Runde 1 (NEEDS_REWORK, 1 wichtig + 3 Nitpicks) ist abgearbeitet;
> das wichtige Finding wurde behoben (Commit `50f85e3`). Diese Runde ist eine unabhängige
> Frisch-Prüfung über alle drei Perspektiven gegen `git diff origin/main...HEAD` (Codify #161).

## Kritische Findings (müssen behoben werden)
- _Keine._

## Wichtige Findings (sollten behoben werden)
- _Keine._

  **Verifiziert behoben (aus Runde 1):** `app/theke/[token]/FokusListe.tsx:53-56` – `toggle`
  delegiert nun an `waehleZiel` (`openId === id ? setOpenId(null) : waehleZiel(id)`). Der
  `setOpenId`-Updater ist rein; die Seiteneffekte (`writeZielId`, `scrollIntoView`) laufen im
  Event-Handler außerhalb des Updaters. Damit keine Doppelausführung unter StrictMode/Concurrent-
  Rendering und kein Cross-Component-State-Update während des Renders mehr. Nachgeprüft: `waehleZiel`
  (Z.41-48) kapselt die Effekte, `dispatchChange` feuert nur aus Event-Handlern, nicht aus der
  Render-Phase.

## Nitpicks (optional)
- [ ] **`app/theke/[token]/IdentityGate.tsx:136`** – `erfasser?.anzeigename ?? ""` ist ein
      faktisch unerreichbarer Null-Fall (`erfasserId` ist über `readErfasserId` bereits gegen
      `zeilen` validiert → `zeilen.find(...)` trifft immer). In den Implementierungs-Notizen bewusst
      als defensiver Fallback belassen – vertretbar. Optional: entfernen oder Inline-Kommentar.
- [ ] **`app/theke/[token]/IdentityGate.tsx:130,145`** – `const erfasser = zeilen.find((z) => z.id === erfasserId)`
      steht in zwei getrennten Branches identisch. Durch die Guard-Clause-Struktur (Early Returns)
      wird nie doppelt ausgeführt; die duplizierte Ausdrucksform ist minimal. Optional
      zusammenziehen, sobald beide Branches den Wert teilen könnten.
- [ ] **`app/_verzehr/VerzehrErfassung.tsx:118-124`** – Der collapsible Kopf-Button trägt
      `aria-expanded`, aber kein `aria-controls` auf den Körper (WAI-ARIA Disclosure-Pattern).
      Für einfache AT ausreichend; `aria-controls` + `id` am Körper würde die Zuordnung schärfen.
      Berührt die geteilte F5-Karte → bewusst als optionale A11y-Verbesserung offen (vgl. Codify #134).

## Positives
- **Runde-1-Fix punktgenau:** Reine Updater-Funktion wiederhergestellt, ohne die restliche
  Akkordeon-Logik anzufassen; keine neue Regression, Gates grün.
- **Saubere Wiederverwendung ohne F5-Regression:** `ZeileKarte` exportiert + optionale Akkordeon-
  Props; ohne Props unverändert flach (Regressions-Test `should_renderFullBody_when_noAccordionProps`).
  Import-Richtung `app/theke → app/_verzehr` regelkonform (Codify #52), ADR-035 D2 exakt umgesetzt.
- **Persistenz solide:** Zeilen-IDs statt Namen (robust gegen Namensgleichheit/Umbenennung),
  fail-open try/catch, Stale-ID → `null`, Legacy-Adoption (#54, D6) inkl. Keep-/No-Match-/
  Idempotenz-Tests – alle Fehlerszenarien abgedeckt.
- **`useSyncExternalStore` statt `useEffect`+setState** zum Lesen der Identität – vermeidet die
  codifizierte `set-state-in-effect`-Falle (#49); Legacy-Adoption im Effekt schreibt nur
  localStorage + Event, kein setState.
- **AC-Abdeckung vollständig und je Kriterium separiert** (Zweischritt, „Für mich" als erste Option
  + Reihenfolge-Assertion, Stale-Fallbacks je Schritt, Erfasser-Wechsel, Read-only ohne Gate,
  Leerliste). Read-only „geschenkt" über denselben `FokusListe`-Pfad, inkl. Test, dass Chips
  read-only aufklappen ohne zu persistieren.

## Empfehlung
APPROVED
