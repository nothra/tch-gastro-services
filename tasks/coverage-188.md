# Coverage: Task 188

## Ergebnis

Geänderte Quelldateien (`app/theke/[token]/FokusListe.tsx`, `app/_verzehr/VerzehrErfassung.tsx`):

| Metrik      | Wert          |
|-------------|---------------|
| Statements  | 100 % (49/49) |
| Branches    | 100 % (35/35) |
| Functions   | 100 % (23/23) |
| Lines       | 100 % (45/45) |

Schwelle laut `PROJECT-CONTEXT.md`: 80 % (neuer Code: 100 % erwartet) → **erfüllt**.
Gesamt-Suite: 88,83 % Stmts / 94,18 % Branch (über Schwelle).

Volle Suite: **608 passed | 59 skipped** – keine Regression.

## Abdeckung der neuen Codepfade

- `VerzehrErfassung.tsx` – Ternary `collapsible ? " scroll-mt-16" : ""`: **beide** Zweige getestet
  (`should_reserveScrollMarginTop_when_collapsible` = true-Zweig;
  `should_notReserveScrollMargin_when_notCollapsible` + alle F5-Tests = false-Zweig).
- `FokusListe.tsx` – `if (editable)` beide Wege (editable-Tests + `…_when_readOnly`).
- `FokusListe.tsx` – rAF-Callback wird über `flushRaf()` ausgeführt
  (`should_deferScrollUntilAfterLayoutExpansion`): belegt sowohl die Nicht-synchron-Auslösung als
  auch den `scrollIntoView({block:"start"})`-Aufruf nach dem Reflow.

## Bewertung Test-Qualität

- **Verhalten statt Implementierung:** Tests prüfen sichtbare Effekte (Klasse am `<li>`,
  Scroll-Timing über rAF-Deferral), nicht interne Struktur.
- **Isolation/Determinismus:** kein `sleep`, kein echtes `requestAnimationFrame`-Timing –
  rAF capture-only gestubbt, `restoreAllMocks` in `afterEach`; `scrollIntoView` deterministisch
  gemockt (jsdom-Grenze). Kein Flaky-Risiko.
- **Namen:** `should_…_when_…`-Konvention eingehalten.

## Keine neuen Tests nötig

Coverage der geänderten Dateien 100 %, alle ACs (#188 AC1/AC2) durch je eine separierbare
Assertion abgedeckt, inkl. Negativ-Nachweis für den Scope (F5 ohne Margin). Kein Produktionscode
in diesem Schritt geändert.
