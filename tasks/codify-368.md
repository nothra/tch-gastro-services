## Codify-Report: Task 368

### Neue Regeln hinzugefügt
- `docs/factory/lessons/testing.md` + Index-Zeile: **Regex-/Listen-Gate über ein externes
  Universum** – Enumeration per Drift-Test aus der Quelle ableiten, je Form ein `invalid`-Fall –
  wegen: Farb-Gate-Lücken (W1, N7), in zwei Review-Runden jeweils neue Formen gefunden.
- `docs/factory/lessons/testing.md` + Index-Zeile: **Playwright `reuseExistingServer` gegen
  fremden Dev-Server** – eigener Server auf freiem Port + `PLAYWRIGHT_BASE_URL` – wegen: erster
  E2E-Lauf war grün, traf aber einen anderen Checkout (alter Stand).
- `docs/factory/lessons/factory-workflow.md` + Index-Zeile: **AK mit Binär-Artefakt am PR** ist
  nicht agentenerfüllbar, als menschlichen Schritt markieren – wegen: W2 blieb drei Runden offen.

### Korrekturen
- `docs/factory/kleinfunde.md:40`: Anker `.gitignore:18-22` → `17-21` (Review-Nitpick N9; dritte
  Ausprägung der bestehenden Anker-Drift-Lesson #291/#351, daher keine neue Lesson).

### Keine Änderungen nötig
- Security-Review: keine Findings, nichts abzuleiten.
- Wegwerf-Artefakt `*.tmp.md` im Commit (W3) und `nextjs-agent-rules`-Block in `CLAUDE.md`: durch
  Kleinfund bzw. bestehende Lesson (#337) abgedeckt.

### Empfehlung für nächste Features
- **Vor dem Merge (Mensch):** die 12 PNGs aus `test-results/ux368/` an PR #378 hängen (W2);
  vorher prüfen, dass kein ausgefülltes Passwortfeld/keine echte E-Mail zu sehen ist.
- Folge-Issues #369–#374 (weitere Seiten umstellen) tragen ihre Pfade in
  `eslint/ui-token-files.mjs` ein; bei Gate-Erweiterungen die neue Drift-Test-Lesson laden.
