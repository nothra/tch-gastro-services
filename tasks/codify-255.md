## Codify-Report: Task 255

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  + [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) (Index-Zeile) –
  **`awk`-Job-Block-Isolation in CI-Wiring-Tests muss auch am Job-Trennkommentar (`# ───`)
  abbrechen, nicht nur am nächsten Job-Key** – wegen: Review-Runde-1-Finding. Der erste
  Extraktor-Entwurf brach nur am nächsten `wort:`-Muster ab; Kommentarzeilen vor dem
  nächsten Job matchen das nicht und „bluteten" mit in den extrahierten Block hinein.
  Aktuell folgenlos, aber strukturell brüchig für jeden künftigen Negativ-Test, der auf
  dieser Isolation aufbaut.

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) +
  [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) (Index-Zeile) –
  **YAML-Testfixture per `printf >>` an eine Kopie mit bereits vorhandenem Top-Level-Key
  anhängen erzeugt ein Duplicate-Key-Dokument (yq „last-key-wins") – Test besteht nur
  zufällig** – wegen: Review-Runde-3-Finding. Die AK4-Testfixture (`model_tiers.heavy`-
  Override) hängte einen zweiten Top-Level-`model_tiers:`-Block an, wodurch
  `model_tiers.light` beim yq-Merge spurlos verschwand – der Test bestand trotzdem, aber
  aus dem falschen Grund (Regel 6 greift auf jeden `heavy`-Wert, unabhängig vom
  Nebeneffekt). Fix: echter `yq -i eval`-Merge statt Text-Anhängen.

### Keine Änderungen nötig

- **ADR-Drift nach Review-Rework** (ADR-029-Prosa, ADR-041-Trade-off-Text,
  `factory-workflow.md`-Checks-Liste, Review-Runde 2): dieses Muster ist bereits durch die
  bestehende Lesson „ADR nach Review-Rework auf Drift prüfen – nicht nur `docs/routes.md`"
  (aus #55) und „PR ändert die von einer ADR namentlich beschriebene Mechanik → ADR-
  Beschreibung im selben PR mitpflegen" (aus #211) abgedeckt. Der Fall bestätigt lediglich,
  dass die bestehende Regel greift (sie wurde in Runde 2/3 korrekt angewendet) – keine neue
  Lesson nötig, eine zusätzliche Lesson wäre eine near-duplikative Regressions-Schleife
  gegen bereits vorhandenen Inhalt gewesen (vgl. Lesson aus #240 dazu).
- **Circuit-Breaker-Eskalation nach der 3. Review-Runde**: lief exakt wie in `/review`
  spezifiziert (keine automatische 4. Iteration, Eskalation an den Menschen mit den
  verbleibenden Findings + Fix-Vorschlag). Bestätigt bestehendes Verhalten, keine neue
  Regel nötig.
- **Ruleset-Update per `gh api -X PUT`**: die bereits in ADR-029/spec-255 verankerte
  Vorgabe „vor Ausführung explizit bestätigen lassen" wurde eingehalten (`AskUserQuestion`
  vor der Ausführung, Live-Verifikation danach). Bestätigt bestehendes Verhalten.

### Empfehlung für nächste Features

- Bei künftigen CI-Wiring-Tests, die per `awk`/`sed` einen einzelnen Job-Block aus einer
  YAML-Datei isolieren, den Extraktor **isoliert ausführen und lesen** (nicht nur den
  Negativ-Test grün laufen lassen) – der neue Lesson-Eintrag gibt das konkrete Muster vor.
- Bei Testfixtures, die eine reale YAML-Datei kopieren und einen Wert per Text-Anhängen
  statt echtem Merge setzen: kurz `yq eval '.<key>'` gegen die Kopie prüfen, ob
  Geschwister-Werte erhalten geblieben sind – besonders wenn der gesetzte Top-Level-Key in
  der kopierten Datei bereits existiert.
