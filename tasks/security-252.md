# Security Review: Task 252

**Scope:** `git diff origin/main...HEAD` – reine Werte-/Kommentar-Kalibrierung der Factory-Config
(`factory.defaults.yml`, `factory.config.yml`), SSOT-Konsistenz zweier Fallback-Literale in
`scripts/run-pipeline.sh`, angepasste String-Literale in `scripts/checks/tests/run-tests.sh`
sowie Doku (`ADR-019`-Nachtrag, Spec, Task-/Review-Datei). **Kein Produkt-/App-Code**, kein
Datenfluss aus Nutzer-Eingaben, keine neue Angriffsfläche.

## Kritische Findings (Blocker)
- _Keine._

## Wichtige Findings
- _Keine._

## Hinweise
- [ ] **[AuthZ/Config-Gate] Sicherheitsrelevante Tier-Gates bleiben intakt (Nicht-Regression,
      geprüft).** `security-review` und `review` behalten in der effektiven Config das geforderte
      Mindest-Tier (`config-validation-check.sh` Regel 5), `security-review` trägt weiterhin kein
      `tier_by_size` (Regel 5b), und `model_tiers.heavy` bleibt nicht override-bar (Regel 6).
      `bash scripts/checks/config-validation-check.sh` → exit 0.
- [ ] **[Kryptographie/Modell-Stärke] Kein Downgrade des Security-Gate-Modells.** `model_tiers.heavy`
      wandert von `claude-opus-4-8` auf `claude-opus-5` – eine **stärkere** Generation. Das ist
      genau die Zielseite der Indirektion, auf die die Härtung aus #241/#249 (Regel 6) achtet: der
      Wechsel schwächt das fix auf `heavy` gepinnte `security-review`-Gate nicht, sondern hebt es.
- [ ] **[Kosten-/Turn-Deckel] `max_turns` 14 → 30 für review/security-review bleibt unter dem
      Policy-Ceiling.** `MAX_TURNS_CEILING = 50`; 30 liegt im erlaubten Intervall `[1, 50]`. Kein
      Weg, das Gate über einen unbegrenzten Turn-Deckel zu unterlaufen.
- [ ] **[Injection] Fallback-Literale in `run-pipeline.sh` sind statische Strings.** Die geänderten
      `yq '.model_tiers.heavy // "claude-opus-5"'`-Ausdrücke sind fest kodierte Literale ohne
      Interpolation nutzerkontrollierter Werte – keine Command-/YAML-Injection eingeführt.
- [ ] **[Secrets]** Keine Credentials/Keys/Tokens im Diff; die Env-Var-Hinweise
      (`# CLAUDE_MODEL_HEAVY`/`# CLAUDE_MODEL_LIGHT`) sind unveränderte Kommentare, keine Werte.
- [ ] **[Dependencies]** Keine neuen Abhängigkeiten.

## Ergebnis
PASSED
