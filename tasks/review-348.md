# Review: Task 348

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [x] **BEHOBEN (Runde 2):** `scripts/checks/config-validation-check.sh:34-35` – der neue
      Kommentar über `MAX_TURNS_CEILING` nutzte ASCII-Pfeile (`->`), während die Datei
      durchgängig den Unicode-Pfeil `→` verwendet (siehe Zeilen 13/17/20/21 derselben Datei).
      Auf `→` vereinheitlicht; Gate danach erneut gegen `factory.defaults.yml` +
      `factory.config.yml` verifiziert (exit 0).

## Positives

- **Runde 1 (Backend/Logik):** Die Grenzfall-Semantik ist exakt korrekt umgesetzt und getestet
  – `max_turns: 80` wird akzeptiert (neue Ceiling), `max_turns: 81` bleibt fail-closed
  abgelehnt. Kein anderer Skill-Wert wurde angefasst (`pr-shepherd`/`codify`/`test` unverändert
  in `factory.config.yml`); `factory.defaults.yml` bewusst nicht berührt, wie in
  [spec-348](../docs/specs/spec-348-max-turns-ceiling-implement.md) „Nicht inbegriffen"
  festgelegt. RED→GREEN nachvollziehbar dokumentiert (Task-Datei nennt die konkreten
  Testzahlen 1562/1 rot → 1563/0 rot).
- **Runde 2 (Code-Qualität):** Die neuen Test-Namen folgen exakt dem in dieser Datei bereits
  etablierten Muster für issue-getaggte Gate-Tests (`Gate #254 AK1: …` existiert bereits an
  anderer Stelle derselben Datei) – kein neues, konkurrierendes Namensschema eingeführt. Die
  neuen Fixtures (`ceil80.yml`/`ceil81.yml`) kollidieren nicht mit dem bestehenden
  `ceil.yml`-Fixture (Wert `9999`, deckt weiterhin den „weit über jeder plausiblen Ceiling"-Fall
  ab) – beide Grenzfälle bleiben separat und aussagekräftig, keine Dopplung.
- **Runde 3 (Architektur):** Die ADR-Erweiterung folgt exakt dem im Projekt bereits etablierten
  Amendment-Muster (ADR-036 D1 ↔ ADR-046): [ADR-051](../docs/adr/051-turn-limit-ceiling-implement-80.md)
  ist eine eigenständige neue ADR, [ADR-010](../docs/adr/010-config-validation-gate.md) bekam
  nur eine kurze Blockquote-Notiz an der richtigen Stelle („Heimat der Obergrenze"), kein
  Rewrite, keine Status-Änderung. ADR-009 §6 wurde korrekt **nicht** angefasst, weil es nur den
  Mechanismus, keinen Zahlenwert beschreibt – bewusst begründet in den
  Implementierungs-Hinweisen der ADR-051, keine stille Auslassung. Keine Routen-Änderung, daher
  `docs/routes.md` korrekt unberührt.

## Empfehlung

APPROVED
