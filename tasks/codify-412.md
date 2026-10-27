## Codify-Report: Task 412

### Neue Regeln hinzugefügt
- `docs/project/lessons/build-tooling.md` + Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` (Gruppe build-tooling, Trigger bleibt „bei Build/CI/Dependencies") – wegen: AK „Neuauflösung ohne Alt-Lockfile" wurde nach `pnpm install` gegen das bestehende Lockfile abgehakt und als „gemessen" notiert; `/review` Runde 1 fand die Lücke. Regel: `pnpm install --lockfile-only` ohne Lockfile, je mit/ohne Override.

### Keine Änderungen nötig
- Override-Form, Floor-Guard-Fall, Mutationsbeleg und Diskriminierungs-Kontrolle folgten den vorhandenen Lessons (#291/#339/#390) ohne Abweichung; Security-Review ohne Findings.
- Kein Issue/Kleinfund: Out-of-Scope-Funde gab es nicht (die neun weiteren Dependabot-Alerts auf `main` sind bekannt und eigene Tasks).

### Empfehlung für nächste Features
- Bei Dependency-Bumps die Frisch-Auflösungs-Messung (mit/ohne Override) schon in `/implement` einplanen, nicht erst im Rework.
- Nach dem Merge: Dependabot-Alert #82 auf „geschlossen" prüfen.
