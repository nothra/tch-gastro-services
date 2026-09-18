## Codify-Report: Task 348

### Neue Regeln hinzugefügt

- `docs/factory/lessons/testing.md` (neuer Eintrag „Ein Config-/Gate-Wert, der als ‚gültig'
  akzeptiert wird, ist damit noch nicht als ‚angewendet' belegt") + Index-Zeile in
  `docs/factory/PROJECT-CONTEXT.md` (Gruppe `lessons/testing.md`). – wegen: `/implement` schrieb
  für die Ceiling-Anhebung zwei echte Grenzfall-Verhaltenstests (Gate akzeptiert `max_turns:
  80`, lehnt `81` ab) – beide bewiesen aber nur, dass das **Validierungs-Gate** den Wert für
  gültig hält, nicht, dass der **Konsument** (`run-pipeline.sh`, ein anderes Skript) ihn für
  `/implement` auch tatsächlich anwendet. Erst `/test` fand diese Lücke (Selbstfund) und
  ergänzte eine End-to-End-Assertion mit der realen `factory.config.yml` gegen
  `run-pipeline.sh --dry-run`. Kein bestehender Lesson-Eintrag deckte diesen spezifischen
  „Gate-Validität ≠ Downstream-Anwendung"-Fall ab (`#212` ist verwandt, behandelt aber die
  Existenz/Ausführung eines Gate-**eigenen** Zweigs, nicht die Weiterleitung eines bereits
  validierten Werts an eine andere Komponente) – daher neuer Eintrag statt Nachtrag.

### Keine Änderungen nötig

- **Review-Finding (Nitpick, ASCII- statt Unicode-Pfeile in einem neuen Kommentar):** Kein
  neuer Lesson-Eintrag. Deckt sich mit der bereits bestehenden Regel „Neue
  Verfügbarkeits-/Capability-Prüfung immer gegen bereits vorhandene im selben File abgleichen"
  (`code-style.md`, aus #224) – derselbe Grundfehler (neues Element folgt nicht der im File
  schon etablierten Konvention), nur in einer anderen Ausprägung (Pfeil-Stil statt
  Verfügbarkeitsprüfung). Der Fehler wurde außerdem **im selben Review-Pass sofort gefunden und
  behoben** (kein Entkommen in eine spätere Stufe) – ein Beleg, dass der bestehende
  Review-Prozess bereits funktioniert, keine zusätzliche Regel nötig. Eine weitere,
  eng-thematische Lesson hierfür würde nur die von `PROJECT-CONTEXT.md` selbst kritisierte
  Lesson-Proliferation fortsetzen (ADR-037: „lief von ~80 auf 341 Zeilen").
- **Security-Review (PASSED, 0 Findings):** Die Prüfung folgte demselben Muster wie die
  historischen Security-Reviews zu `MAX_TURNS_CEILING`-Änderungen (`security-201.md`,
  `security-224.md`, `security-241.md`, `security-252.md`) – Ceiling-Integrität
  (nicht-config-überschreibbar), Grenzfall-Enforcement, keine Injection/Secrets. Kein
  Prozess-Defekt gefunden, kein neues Learning – die bestehenden Muster reichten aus.
- **Architektur (ADR-051):** Folgte exakt dem bereits etablierten Amendment-Muster
  (ADR-036 D1 ↔ ADR-046). Kein Learning – Muster funktioniert wie vorgesehen.
- **Refactoring:** Kein Bedarf, keine Code-Änderung. Kein Learning.

### Empfehlung für nächste Features

- Bei künftigen Änderungen an einem Gate-geprüften Config-Wert mit eigenem Konsumenten
  (`model_tiers`, `tier_by_size`, weitere `max_turns`-Deckel): den neuen Testing-Lesson-Eintrag
  aus #348 laden und – analog zur hier ergänzten Assertion – eine End-to-End-Probe gegen die
  **realen** Repo-Dateien schreiben, nicht nur gegen das Gate mit synthetischen Fixtures.
- Die Eskalationshistorie-Recherche (#49 → #53 → #324) in `/requirements`/`/architecture` hat
  sich als wertvoll erwiesen: eine Begründung, die sich auf ein wiederkehrendes Muster statt nur
  den letzten Einzel-Incident stützt, ist deutlich belastbarer. Kein neues Learning nötig – das
  ist bereits durch die bestehende `git-workflow.md`-Regel „Kanonische Quellen referenzieren"
  und den allgemeinen Rechercheauftrag von `/requirements` gedeckt, aber als Praxis-Beispiel für
  künftige Ceiling-/Policy-Anhebungen hier vermerkt.
