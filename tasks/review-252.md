# Review: Task 252

## Kritische Findings (müssen behoben werden)
- _Keine._

## Wichtige Findings (sollten behoben werden)
- _Keine._

## Nitpicks (optional)
- [ ] `scripts/run-pipeline.sh:209-210` – Die yq-Fallback-Literale
      (`.model_tiers.heavy // "claude-opus-5"`) sind streng genommen totes Verhalten:
      `$FACTORY_CFG` ist die gemergte Config und trägt `model_tiers.*` immer aus
      `factory.defaults.yml`, der `//`-Zweig wird also nie ausgelöst (kein Test deckt ihn ab,
      AK10 ist reine Literal-Synchronisation). Bewusst so gescoped (Spec „Kein Verhaltens-
      Unterschied in bestehenden Tests"; SSOT-Konsistenz statt Entfernen) – kein Handlungsbedarf
      in diesem PR, nur als Beobachtung notiert. Ein späteres Aufräumen des Fallbacks wäre eine
      eigene tech-debt-Task, kein Scope hier.

## Positives
- **Sauberer, exakt spec-konformer Scope.** Alle 12 AK erfüllt und unabhängig verifiziert:
  `config-validation-check.sh` grün (AK9, exit 0); `factory.config.yml` ohne verwaiste
  Kommentar-/Override-Verweise auf entfernte Knöpfe (grep auf `review`/`model_tiers`/
  `security-review` leer); alle vier weiterhin nötigen Overrides (`implement:50`,
  `pr-shepherd:20`, `codify:30`, `test:40`) unverändert erhalten (AK8-Nichtregression).
- **AK11 vollständig, inklusive der nicht in der Spec gelisteten Stelle.** Der direkte
  Default-Wert-Assert (`#91: … max_turns=…`) wurde korrekt auf `30` gezogen; die Suite enthält
  keine `max 14 turns`-Reste mehr. Die zwei bewusst NICHT geänderten Fundstellen
  (`run-tests.sh:1551` Regex-Positivkontrolle, `run-tests.sh:1265` synthetisches Rule-5-Fixture
  mit `m-heavy`/`m-light`) sind modellstring-agnostisch und wurden zu Recht ausgelassen –
  die Implementierungs-Notizen belegen die Abgrenzung nachvollziehbar.
- **Begründungs-Konvention (ADR-011) eingehalten:** `@reason` an den vier Knöpfen inhaltlich
  aktualisiert (Verweis auf validierten Task-241-Wert), nicht dupliziert; `factory.config.yml`
  zitiert weiterhin nur, statt zu erklären.
- **ADR-Drift sauber adressiert:** ADR-019 §5 bleibt als historischer Schnappschuss stehen,
  neuer „Nachtrag (2026-08-02, #252)" hält die zweite Kalibrierung (14→30) fest und verweist auf
  `factory.defaults.yml` als kanonischen Wert (SSOT, ADR-009). Konsistent mit dem Lesson
  „ADR nach Rework auf Drift prüfen" (#55/#211).
- **Vorbestehende Testfehler transparent und belegt eingeordnet:** Die 4 roten `#212 W3`-Tests
  sind unabhängig als umgebungsbedingt bestätigt – der Block (ab Zeile 3288) liegt außerhalb
  jedes Diff-Hunks (letzter Hunk endet ~3029), steht seit `ba61638` (#212, 2026-07-24)
  unverändert auf `main`, und ist ein echter Non-Dry-Pipeline-Lauf (`run-pipeline.sh 78` ohne
  `--dry-run`), dessen Positiv-Gegenprobe „sauber+gepusht → exit 0" in der Sandbox exit 1
  liefert (Lessons #239/#244: Wiederholung + unveränderter Block + CI-Historie).

## Empfehlung
APPROVED
