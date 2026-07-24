## Codify-Report: Task 172

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/testing.md`] **ESLint-Ignore-Config verhaltensbasiert testen – mit
  Diskriminierungs-Kontrolle** – wegen: `/test`-Selbstfund. In `/implement` wurde die
  Ignore-Wirkung nur mit `toBe(true)`-Assertions belegt; das wäre auch unter einer versehentlich
  zu breiten Regel (`"**"`) grün geblieben (Fehlgrün). Erst `/test` ergänzte den Positiv-Kontroll-
  test (`app/layout.tsx` → `isPathIgnored === false`). Festgehalten als konkretes boolesches
  Prädikat-Analogon zu #211 (beide Richtungen) und #212 (Positiv-Gegenprobe), plus die
  wiederkehrende Technik „Verhalten via `ESLint#isPathIgnored`, nicht String-Match aufs Config-Array".
- [`docs/factory/PROJECT-CONTEXT.md`] Index-Zeile mit „Laden bei"-Trigger (`/implement`, `/test`)
  ergänzt.

### Keine Änderungen nötig
- Review (`review-172.md`): **APPROVED**, 0 Findings. Security (`security-172.md`): **PASSED**,
  0 Blocker/wichtige Findings. Kein Fehler-Muster, keine neue CLAUDE.md-/Guideline-/Check-Regel nötig.
- Das allgemeine „nur eine Richtung getestet"-Prinzip war bereits durch #211/#212 abgedeckt; der
  neue Eintrag ist die konkrete, bislang nirgends festgehaltene ESLint-Config-Test-Technik.

### Was gut funktionierte
- TDD sauber durchgezogen: RED (beide Tests aus dem richtigen Grund rot) → GREEN → reale
  Verifikation (Artefakte mit Lint-Verstößen angelegt → `pnpm lint` grün).
- Die Pipeline hat den Test-Gap selbst gefangen (`/test`-Selbstfund), bevor er in Review/Security
  eskalierte – genau der beabsichtigte Self-Improvement-Loop.

### Empfehlung für nächste Features
- Beim Testen jeder Ignore-/Allow-Liste oder eines booleschen Mitgliedschafts-Prädikats von Anfang
  an eine Gegenrichtungs-Kontrolle mitschreiben – nicht erst in `/test` nachrüsten.
