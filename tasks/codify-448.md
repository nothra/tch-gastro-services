## Codify-Report: Task 448

### Neue Regeln hinzugefügt
- `docs/project/lessons/build-tooling.md` + Index-Zeile in `PROJECT-CONTEXT.md` – `pnpm update <paket>@^X` setzt den neuesten Specifier; Spec/AK nennen die Untergrenze, geschriebener Specifier gehört in die Task-Notiz – wegen: Review-Nitpick (Notiz `^4.6.6` vs. tatsächlich `^4.6.7`).

### Keine Änderungen nötig
Review APPROVED und Security PASSED ohne kritische/wichtige Findings; kein Code-Diff, keine Folge-Issues oder Kleinfunde.

### Empfehlung für nächste Features
Für #444 (vitest/vite) dieselbe Untergrenzen-Formulierung verwenden und `pnpm why` je betroffenem Paket als Beleg in die Task-Notiz übernehmen.
