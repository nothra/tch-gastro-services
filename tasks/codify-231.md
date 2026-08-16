## Codify-Report: Task 231

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/build-tooling.md`](../docs/factory/lessons/build-tooling.md) – Neuer
  Abschnitt „`pnpm audit` zeigt bei Paketen mit mehreren parallel gepflegten Major-Linien nur
  eine Range-Gruppe" – wegen: Im `/security-review` meldete `pnpm audit` 2 „High"-Findings für
  `brace-expansion` mit einer Vulnerable-Range (`>=4.0.0 <5.0.8/5.0.9`), die nicht zur per
  `pnpm why brace-expansion` aufgelösten Version (`1.1.18`) passte. Erst der Abgleich gegen die
  **volle** GHSA-Advisory-Liste (`curl https://api.github.com/advisories/<GHSA-ID>`, alle
  vier Major-Linien-Einträge je CVE) zeigte: `1.1.18` ist bereits gepatcht – reines
  Anzeige-Artefakt von `pnpm audit`, kein echtes Finding. Ohne diese Verifikation hätte der
  Security-Report fälschlich ein „NEEDS_FIXES" ausgelöst oder – schlimmer – wäre unkritisch als
  echtes Risiko protokolliert worden. Ergänzt (nicht ersetzt) die bestehende #228-Lesson zum
  Gzip-Decoding-Bug: unterschiedlicher Fehlermodus (Anzeige-Unvollständigkeit statt
  Transport-Fehler), gleiche Konsequenz (Rohdaten statt Terminal-Zusammenfassung prüfen).
- [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) – Index-Zeile für den
  neuen Lesson-Abschnitt ergänzt (Gruppe `lessons/build-tooling.md`, Trigger: `/security-review`
  bei jedem `pnpm audit`-Finding).

### Keine Änderungen nötig
- Review-Findings (drei Runden) enthielten außer zwei Nitpicks (fehlender CI-Run-Verweis,
  implizite Node-Engine-Anhebung durch Playwright) keine Muster – beide sind Einzelfälle ohne
  Wiederholungspotenzial für diesen Task-Typ, keine neue Regel gerechtfertigt.
- Der `/implement`-Schritt selbst folgte etablierten Mustern ohne neue Stolpersteine: der
  Playwright-Browser-Reinstall (`pnpm exec playwright install chromium`) nach einem
  `@playwright/test`-Bump ist bereits durch die Fehlerursache (fehlende Browser-Binary für neue
  Version) selbsterklärend und tritt nur bei einem Major-/Minor-Bump des Test-Runners selbst
  auf – kein wiederkehrendes Muster, das eine Lesson rechtfertigt.
- `/refactor` und die übrigen Gates (Lint, Typecheck, Format, Build, E2E) liefen ohne
  Überraschungen – kein Lernstoff.

### Empfehlung für nächste Features
Bei künftigen `/security-review`-Läufen, die `pnpm audit`-Findings zu Paketen mit
`maintenance-vN`-Dist-Tags (mehrere parallel gepflegte Major-Linien) aufwerfen, direkt die neue
Lesson-Regel anwenden, statt die Terminal-Ausgabe von `pnpm audit` unhinterfragt als
vollständig zu behandeln.
