# Task 252: factory-defaults-kalibrieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
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
- [x] AK1 – `model_tiers.heavy` → `claude-opus-5`
- [x] AK2 – `model_tiers.light` → `claude-sonnet-5`
- [x] AK3 – `skills.review.max_turns` → `30`
- [x] AK4 – `skills.security-review.max_turns` → `30`
- [x] AK5 – redundanter `model_tiers.light`-Override in `factory.config.yml` entfernt
- [x] AK6 – redundanter `skills.review.max_turns`-Override entfernt
- [x] AK7 – redundanter `skills.security-review.max_turns`-Override entfernt
- [x] AK8 – weiterhin nötige Overrides (implement/pr-shepherd/codify/test) unverändert
- [x] AK9 – `config-validation-check.sh` bleibt grün (exit 0)
- [x] AK10 – `run-pipeline.sh`-Fallback-Literale auf `claude-opus-5`/`claude-sonnet-5` aktualisiert
- [x] AK11 – betroffene Regressionstests in `run-tests.sh` auf neue Literal-Werte angepasst
- [x] AK12 – dritte Tier-Stufe dokumentiert entschieden (Nein, kein ADR)

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

## Implementierungs-Notizen (2026-08-02)
- **AK11 – Testzeilen über die Spec-Liste hinaus:** Neben den in der Spec gelisteten Dry-Run-
  Assertions musste zusätzlich der direkte Default-Wert-Assert `#91: review + security-review
  max_turns=14 (Budget-Puffer)` (`run-tests.sh`, vormals Zeile ~1972) auf `30` gezogen werden –
  er liest `.skills.review/.security-review.max_turns` direkt aus `factory.defaults.yml` und war
  nach AK3/AK4 sonst rot. Die Spec-Zeilenliste war nicht abschließend; AK11 verlangt „alle
  betroffenen" Stellen.
- **`run-tests.sh:1551` bewusst NICHT geändert:** Das `printf '#   heavy: claude-opus-4-8\n' |
  grep -qE '^#[[:space:]]*heavy:'` ist eine synthetische Regex-Positivkontrolle (Task 249,
  belegt, dass die `heavy:`-Erkennung scharf ist) – der Modell-String ist beliebiger Regex-Input,
  kein Config-Default-Verweis. Nicht in der Spec-Liste, außerhalb des Scopes (YAGNI).
- **`factory.config.yml` hat jetzt keinen `model_tiers`-Block mehr:** nach Entfernen des einzigen
  (`light`-)Overrides ist der ganze `model_tiers:`-Schlüssel weggefallen. Effektive Config wird
  über `config-validation-check.sh` (exit 0) und die grünen Dry-Run-E2E-Tests
  (implement→opus-5/20, review→sonnet-5|opus-5/30, security-review→opus-5/30, test→sonnet-5/20)
  end-to-end verifiziert.
- **Vorbestehende, umgebungsbedingte Testfehler (4× `#212 W3`):** Die vier
  `#212 W3`-End-to-End-Tests (`run-tests.sh` ~3253–3305) sind in dieser lokalen Sandbox rot
  (inkl. der Positiv-Gegenprobe „exit 0", die exit 1 liefert – der Non-Dry-Pipeline-Lauf mit
  echten Git-/Pipeline-Operationen bricht früh ab). **Nicht durch diese Task verursacht:** der
  Testblock ist von meinem Diff unberührt (belegt via `git diff`), steht seit `ba61638`
  (#212, 2026-07-24) unverändert auf `main`, und Factory CI (`factory-ci.yml:95` ruft
  `run-tests.sh`) ist auf meinem Basis-Commit `fc190e6` grün. Der isolierte Repro-Lauf war durch
  dieselben Sandbox-Restriktionen (Write-/`git stash`-Sperre) verhindert; Einordnung stützt sich
  auf: volle Suite (2× deterministisch dieselben 4) + unveränderter Block + CI-Historie
  (Lessons #239/#244). Alle übrigen 637 Tests grün.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Test-Notizen (2026-08-02)
Reine Config-Kalibrierung ohne TS-Produktionscode-Änderung – kein `pnpm test:coverage`-Lauf
nötig, die relevante Test-Suite ist `scripts/checks/tests/run-tests.sh` (Bash, tabellengetrieben).
Kein neuer Test geschrieben; bereits durch `/implement` angepasste Assertions verifiziert:

- `bash scripts/checks/config-validation-check.sh` → exit 0 (AK9, keine Ausgabe = bestanden).
- `bash scripts/checks/tests/run-tests.sh` → **637 grün, 4 rot**. Die 4 roten Tests
  (`#212 W3`-E2E-Block, ~Zeile 3288ff.) liegen außerhalb jedes Hunks dieses Diffs
  (`git diff origin/main...HEAD` bestätigt: kein Treffer in dem Bereich), sind seit `ba61638`
  (#212, 2026-07-24) unverändert auf `main` und laut Implementierungs-Notizen bereits als
  umgebungsbedingt (Sandbox-Restriktion, kein echter Git-Push möglich) eingeordnet – erneut per
  vollem Lauf bestätigt (deterministisch dieselben 4, kein Zusammenhang mit AK1–AK11).
- Alle AK-relevanten Assertions einzeln gegengeprüft und grün: `#91` (max 30 turns
  review/security-review, Dry-Run + Default-Wert-Assert), `#197 AK1/AK2/AK4-AK7` (E2E
  `claude-opus-5`/`claude-sonnet-5`-Literale in Dry-Run-Ausgaben, Zeilen 1128–3025), `#241`
  (Mindest-Tier-Gate unverändert grün), `#249` (`model_tiers.heavy` weiterhin nicht override-bar,
  `light` weiterhin erlaubt – AK5/AK8-Nichtregression).
- Kein Produktionscode in diesem Schritt geändert.

## Refactor-Notizen (2026-08-02)
Diff geprüft (`git diff origin/main...HEAD`): reine Werte-/Kommentar-Kalibrierung in
`factory.defaults.yml`/`factory.config.yml`/`scripts/run-pipeline.sh` plus String-Literal-
Anpassungen in `run-tests.sh`-Assertions – keine neue Funktion, kein neuer Kontrollfluss, keine
Duplikation. Kein Refactoring-Bedarf; `config-validation-check.sh` weiterhin grün (exit 0).

## Codify-Notizen
Review und Security-Review liefen ohne kritische/wichtige Findings (APPROVED/PASSED) – kein
Fehler-Muster, keine neue Regel nötig. Einziger Review-Nitpick (tote `yq`-Fallback-Literale in
`scripts/run-pipeline.sh:209-210`) ist vom Review selbst als „kein Handlungsbedarf in diesem PR"
eingestuft; kein Issue angelegt (Sandbox blockiert den `source`-basierten Issue-Anlage-Seam).
Voller Report: [`tasks/codify-252.md`](codify-252.md).

---
Branch: `chore/252-factory-defaults-kalibrieren`
Erstellt: 2026-08-02 09:47
