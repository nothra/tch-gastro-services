# Task 252: factory-defaults-kalibrieren

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`factory.defaults.yml` (kanonische Quelle, ADR-009) trägt veraltete Modell-Tiers
(`model_tiers.heavy: claude-opus-4-8`, `model_tiers.light: claude-sonnet-4-6`) und zu knapp
bemessene `max_turns` für `review`/`security-review` (`14`, wiederholt „Reached max turns" in
Task 91/241). `factory.config.yml` korrigiert das bereits projektweise per Override. Diese Task
zieht die validierten Werte in die Defaults, entfernt die dadurch redundanten Overrides, hält
`scripts/run-pipeline.sh`-Fallback-Literale konsistent und dokumentiert die Entscheidung zu
Issue-Punkt 3 (keine dritte Tier-Stufe). Details, Scope und volle Akzeptanzkriterien:
[`docs/specs/spec-252-factory-defaults-kalibrieren.md`](../docs/specs/spec-252-factory-defaults-kalibrieren.md).

## Akzeptanzkriterien
<!-- Volltext inkl. GIVEN/WHEN/THEN in der Spec -->
- [ ] AK1 – `model_tiers.heavy` → `claude-opus-5`
- [ ] AK2 – `model_tiers.light` → `claude-sonnet-5`
- [ ] AK3 – `skills.review.max_turns` → `30`
- [ ] AK4 – `skills.security-review.max_turns` → `30`
- [ ] AK5 – redundanter `model_tiers.light`-Override in `factory.config.yml` entfernt
- [ ] AK6 – redundanter `skills.review.max_turns`-Override entfernt
- [ ] AK7 – redundanter `skills.security-review.max_turns`-Override entfernt
- [ ] AK8 – weiterhin nötige Overrides (implement/pr-shepherd/codify/test) unverändert
- [ ] AK9 – `config-validation-check.sh` bleibt grün
- [ ] AK10 – `run-pipeline.sh`-Fallback-Literale auf `claude-opus-5`/`claude-sonnet-5` aktualisiert
- [ ] AK11 – betroffene Regressionstests in `run-tests.sh` auf neue Literal-Werte angepasst
- [ ] AK12 – dritte Tier-Stufe dokumentiert entschieden (Nein, kein ADR)

## Technische Notizen
Reine Werte-/Config-Kalibrierung ohne neuen Mechanismus – **kein neues ADR** nötig (analog zur
bereits in der Spec entschiedenen Nicht-ADR-Begründung für AK12). Beide in der Spec offenen
ADR-Drift-Fragen sind entschieden (s. Offene Fragen unten); Umsetzung für `/implement`:

- `factory.defaults.yml`: `model_tiers.heavy` → `claude-opus-5`, `model_tiers.light` →
  `claude-sonnet-5`, `skills.review.max_turns` → `30`, `skills.security-review.max_turns` → `30`.
  `@reason`-Kommentare an den vier Knöpfen aktualisieren (ADR-011-Konvention beibehalten:
  Begründung am Knopf, nicht dupliziert an anderer Stelle).
- `factory.config.yml`: die drei redundant gewordenen Override-Blöcke (`model_tiers.light`,
  `skills.review.max_turns`, `skills.security-review.max_turns`) inkl. ihrer erklärenden
  Kommentare entfernen. `implement`/`pr-shepherd`/`codify`/`test`-Overrides unangetastet lassen.
- `scripts/run-pipeline.sh` Zeilen ~209–210: Fallback-Literale `claude-opus-4-8`/
  `claude-sonnet-4-6` → `claude-opus-5`/`claude-sonnet-5` (SSOT-Konsistenz).
- `scripts/checks/tests/run-tests.sh`: Dry-Run-Assertions an den in der Spec gelisteten Zeilen
  (u. a. 1128, 1134, 1152, 1154, 2991, 2993, 2995, 3005, 3015, 3024 im Ist-Stand) auf die neuen
  Modell-IDs bzw. „max 30 turns" (review/security-review) anpassen.
- `docs/adr/019-stage3-commit-seam-report-guard.md`: Nachtrag-Abschnitt ist bereits in diesem
  /architecture-Schritt ergänzt (kein weiterer Implementierungs-Schritt nötig).

## Offene Fragen
- [x] ADR-019 §5 („Budget-Puffer") nennt `max_turns: 14` als aktuellen Wert – nach AK3/AK4 nicht
      mehr zutreffend. **Entschieden:** §5 bleibt als historischer Schnappschuss unverändert
      (dokumentiert korrekt die damalige Entscheidung 8→14); neuer Abschnitt „## Nachtrag
      (2026-08-02, #252)" am Dateiende ergänzt, der die zweite Kalibrierung (14→30) festhält und
      auf `factory.defaults.yml` als kanonischen aktuellen Wert verweist (SSOT, ADR-009). Bereits
      umgesetzt in diesem /architecture-Schritt.
- [x] ADR-038-Beispielblock zeigt ebenfalls `max_turns: 14` – gleiche Frage. **Entschieden:**
      Unverändert gelassen. Der Codeblock in ADR-038 illustriert das `tier_by_size`-Config-Schema
      zum Zeitpunkt der Entscheidung, nicht einen live gepflegten Wert – anders als ADR-019 §5
      trifft er keine explizite Aussage über den „aktuellen" Stand, die durch die Kalibrierung
      falsch würde. Kein Nachtrag nötig; kanonischer aktueller Wert bleibt `factory.defaults.yml`.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/252-factory-defaults-kalibrieren`
Erstellt: 2026-08-02 09:47
