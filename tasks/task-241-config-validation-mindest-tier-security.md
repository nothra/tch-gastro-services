# Task 241: config-validation-mindest-tier-security

## Status
- [x] In Bearbeitung
- [x] Review bestanden (`tasks/review-241.md` – APPROVED, keine kritischen/wichtigen Findings)
- [x] Tests vollständig
- [x] Security-Review bestanden (`tasks/security-241.md` – PASSED, kein Blocker; Out-of-Scope-
      Härtungsfinding als Issue #249 ausgelagert)
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
`scripts/checks/config-validation-check.sh` erzwingt für sicherheitsrelevante Skills
(`security-review`, `review`) eine Mindest-Tier-Schwelle (`heavy`), damit ein Override diese
Gates nicht unbemerkt schwächen kann (weder über das statische `tier`-Feld noch – bei
`security-review` – über `tier_by_size`). Details, Kontext und Abgrenzung: siehe
[spec-241-config-validation-mindest-tier-security.md](../docs/specs/spec-241-config-validation-mindest-tier-security.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 – `security-review.tier` unter `heavy` wird abgelehnt
- [x] AK2 – `review.tier` unter `heavy` wird abgelehnt
- [x] AK3 – `tier_by_size` bei `security-review` wird abgelehnt, auch mit gültigem Signal/Threshold
- [x] AK4 – `review.tier_by_size` bleibt erlaubt (Nicht-Regression zu ADR-038)
- [x] AK5 – Reiner Default-Lauf bleibt grün
- [x] AK6 – Explizite Bestätigung des Minimums (`tier: heavy`) bleibt gültig
- [x] AK7 – Die Mindest-Tier-Schwelle ist nicht override-bar (Policy-Konstante im Gate-Skript)
- [x] AK8 – Regressionstest deckt Positiv- und Negativfälle ab (yq-gated)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**ADR-Trigger-Check (Spec-002/ADR-002), 2026-08-01 – keine Kategorie zutreffend:**

| # | Kategorie | Zutreffend? | Begründung |
|---|-----------|-------------|------------|
| 1 | Technologiewahl | Nein | Keine neue Library/Framework/DB/externer Dienst – reines Bash/`yq` im bestehenden Gate-Skript, bereits Prerequisite (ADR-009 §A). |
| 2 | Architekturmuster | Nein | Erweitert ein **bereits entschiedenes** Muster (ADR-010: Policy-Konstante im Gate-Skript, analog `MAX_TURNS_CEILING`) um eine weitere Werte-Constraint-Regel derselben Klasse – kein neuer Schichtungs-/Datenfluss-Ansatz. |
| 3 | Schnittstellen-Vertrag | Nein | `config-validation-check.sh` ist internes Factory-Tooling ohne Außenwirkung auf Teams/Services; die "Schnittstelle" (Aufruf-Signatur, Exit-Code-Semantik) ändert sich nicht, nur eine zusätzliche interne Ablehnungsregel kommt hinzu. |
| 4 | Irreversible Konsequenz | Nein | Reversibel durch Editieren des Gate-Skripts; keine Datenmigration, keine öffentliche API, keine Persistenz-Strategie betroffen. |

**Nicht-ADR 2026-08-01:** Mindest-Tier-Constraint für `security-review`/`review` im
Config-Gate – bewusst kein neues ADR (Begründung: reine Erweiterung des in ADR-010 bereits
etablierten Musters "Policy-Konstante im Gate-Skript, nicht Teil der merge-baren Config" um
eine weitere Constraint-Klasse; keiner der vier Trigger aus Spec-002/ADR-002 greift, s. o.).
Referenz bleibt ADR-009 §6 / ADR-010 – kein ADR-Nachtrag nötig, da keine bestehende Aussage
dieser ADRs geändert wird (nur ergänzt).

**Implementierungs-Hinweise für `/implement`:**

- **Ort:** `scripts/checks/config-validation-check.sh`, neue Regel **5** nach der bestehenden
  Regel 4c (`tier_by_size`-Form), operiert wie 4a/4b/4c auf der bereits berechneten
  `effective`-Config (gemergte Defaults * Override) – nicht auf dem rohen Override, sonst
  greift die Regel nicht bei einem Override, der den Wert nur indirekt beeinflusst.
- **Policy-Konstanten am Skriptkopf** (analog `MAX_TURNS_CEILING`, mit Verweis auf diese ADR-Notiz
  statt einer neuen ADR-Nummer):
  - Ein Bezeichner für die geforderte Mindest-Tier (aktuell: der String `heavy`).
  - Eine Liste der Skills, die dieser Mindest-Tier-Pflicht unterliegen: `security-review review`.
  - Eine (Teil-)Liste der Skills, bei denen zusätzlich **kein** `tier_by_size` gesetzt sein darf:
    `security-review` (nicht `review` – AK4).
- **Prüf-Logik:**
  1. Für jeden Skill aus der Mindest-Tier-Liste: `cfg_skill_field <skill> tier` (bzw. äquivalenter
     `yq`-Pfad auf `effective`) muss exakt der geforderten Tier-Konstante entsprechen; sonst `fail`
     mit Skill-Name + Ist-Wert + geforderter Wert in der Meldung (Stil wie bestehende Regel 4a:
     „ungültiges tier '…' bei '…'").
  2. Für `security-review` zusätzlich: existiert `skills.security-review.tier_by_size` in der
     effektiven Config (`yq eval '.skills."security-review" | has("tier_by_size")'`), `fail` –
     unabhängig davon, ob Regel 4c den Inhalt für sich genommen als gültig einstufen würde.
- **Reihenfolge der Regeln beachten:** Diese neue Regel darf **nicht** vor 4a (tier ∈ model_tiers)
  greifen, sonst würde z. B. `tier: unbekannt` bei `security-review` mit der falschen
  Fehlermeldung ("unter Mindest-Tier" statt "ungültiges tier") abbrechen. Reihenfolge: 4a → 4b →
  4c → **5 (neu)**.
- **Tests:** `scripts/checks/tests/run-tests.sh`, im bestehenden `HAS_YQ`-Block direkt nach den
  vorhandenen Config-Gate-Fixtures (vgl. Zeilen ~1178–1235) – je AK1–AK5 ein Fixture, im
  bestehenden Stil (`printf ... > "$GTMP/<name>.yml"`, `assert_true`).
- **Keine Änderung** an `run-pipeline.sh` nötig – das Gate wird dort bereits fail-closed vor jeder
  Nutzung aufgerufen (ADR-010, `load_config()`), die neue Regel wirkt automatisch mit.

**Implementierungs-Notiz (2026-08-01, /implement):**

- Umgesetzt als **Regel 5** in `config-validation-check.sh` (nach 4a/4b/4c): Policy-Konstanten
  `MIN_TIER_REQUIRED=heavy`, `MIN_TIER_SKILLS="security-review review"`,
  `NO_TIER_BY_SIZE_SKILLS="security-review"` am Skriptkopf (analog `MAX_TURNS_CEILING`, nicht
  merge-bar → AK7). 5a prüft das statische `tier` der effektiven Config gegen `MIN_TIER_REQUIRED`,
  5b verbietet `tier_by_size` für `security-review`.
- Tests: 10 Assertions `Gate #241 AK1…AK6` in `run-tests.sh` (yq-gated), inkl. Meldungs-Asserts,
  die Regel 5 gegen Fremd-Pfade isolieren (AK3b: Custom-Defaults deklarieren den `tier_by_size`-Pfad,
  damit nicht Regel 2 statt Regel 5 fällt – #214-Muster). Alle 10 grün.
- **`#212 W3`-E2E-Fehlschläge in der Bash-Suite sind umgebungsbedingt, nicht durch diese Task
  verursacht** (belegt, nicht behauptet): (a) `run-tests.sh`-Diff ist rein additiv (+53/−0), der
  `#212 W3`-Testcode ist byte-identisch zu HEAD; (b) der E2E-Block speist nur `factory.defaults.yml`
  ein (security-review=heavy, kein tier_by_size) → Regel 5 passiert sauber; (c) isolierter
  Positiv-Probelauf mit dem geänderten Gate → Pipeline `exit 0`. Deckt sich mit #244/#245
  (spec-244: „umgebungs-/sandboxbedingt, kein Code-Defekt", isoliert 5/5 grün, CI-Historie success).
  Die 4 roten Assertions treten nur in der lokalen Sandbox auf; CI läuft die Suite non-sandboxed grün.

**Test-Verifikation (2026-08-01, `/test`):**

- Vollständiger Lauf `bash scripts/checks/tests/run-tests.sh`: **565 grün, 0 rot** – kein
  Restfehlschlag mehr, auch nicht die zuvor als umgebungsbedingt eingeordneten `#212 W3`-Fälle.
  Kein Produktionscode geändert (nur Verifikation), Tests waren bereits vollständig aus
  `/implement`.
- AK1–AK8 sind alle über Gate-Fixtures/Policy-Konstanten abgedeckt (kein zusätzlicher Testbedarf):
  AK1/AK2 (Mindest-Tier-Ablehnung je Skill inkl. Meldungs-Assert), AK3a/AK3b (`tier_by_size`-
  Ablehnung gegen reale Defaults **und** isoliert gegen Regel 5), AK4 (Nicht-Regression
  `review.tier_by_size`), AK5 (Default-Lauf), AK6 (redundante Bestätigung), AK7 (Policy-Konstanten
  nicht Teil der merge-baren Config, strukturell), AK8 (dieser yq-gated Regressionsblock selbst).
- Kein App-Code (TS/React) betroffen → `pnpm test`/Coverage-Schwelle aus `PROJECT-CONTEXT.md`
  nicht einschlägig für diese Task (reines Bash-Gate-Tooling).

**Refactoring-Notiz (2026-08-01, `/refactor`):**

- Clean-Code-Checkliste gegen `scripts/checks/config-validation-check.sh` (Regel 5a/5b)
  geprüft: sprechende Namen, kurze fokussierte Blöcke (je eine Sache), keine Duplikation,
  Kommentare erklären WHY (Policy-Begründung, Reihenfolge-Invariante zu 4a). **Keine
  Code-Änderung nötig.**
- Die beiden optionalen Review-Nitpicks (`tasks/review-241.md`) bewusst nicht umgesetzt:
  - Fehlender Ordering-Pin-Test (`tier: medium` → 4a- statt 5-Meldung) ist eine
    Testabdeckungs-Frage, kein Struktur-/Clean-Code-Thema – außerhalb des `/refactor`-Scopes.
  - `for skill in $LISTE` vs. `while IFS= read -r … < <(yq …)`: bewusst **nicht** vereinheitlicht,
    da Regel 5 über eine statische, whitespace-sichere Policy-Konstante iteriert, 4a–4c dagegen
    über dynamischen yq-Output – die unterschiedlichen Idiome spiegeln unterschiedliche
    Datenquellen, keine Inkonsistenz ohne Grund.
- Regressionslauf nach Prüfung: `bash scripts/checks/tests/run-tests.sh` → **565 grün, 0 rot**
  (unverändert).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Scope im Requirements-Gespräch geklärt (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

**Codify (2026-08-01):** Learning aus dem Security-Review-Finding extrahiert und als Volltext-
Lesson unter `docs/factory/lessons/factory-workflow.md` („Ein Floor auf einen Lookup-Key ist
kein Floor auf das, wofür er steht") + Index-Zeile in `PROJECT-CONTEXT.md` hinterlegt: Regel 5
pinnt das Tier-*Label* `heavy`, nicht das dahinterliegende `model_tiers.heavy`-Modell – dieser
zweite, nicht enumerierte Pfad blieb override-bar (PoC: Exit 0 trotz gepinntem Label). Als
eigenständiges Härtungs-Issue **#249** ausgelagert (kein Blocker für diesen PR). Details:
`tasks/codify-241.md`. Die beiden optionalen Review-Nitpicks (Ordering-Pin-Test,
Stil-Inkonsistenz `for`/`while read`) brauchen keine neue Regel – bereits im Refactor-Schritt
bewusst und begründet zurückgestellt.

**PR-Shepherd (2026-08-01):** Merge freigegeben – alle Gates grün. Branch bereits auf aktuellem
`main` (kein Rebase nötig), CI grün (alle Checks pass), kein Approval erforderlich (0 Approvals
gemäß ADR-029), keine offenen Review-Kommentare (einziger PR-Kommentar war der automatische
Vercel-Deploy-Bot). Draft-Status via `gh pr ready` aufgelöst. PR #247, `mergeStateStatus: CLEAN`
→ Merge per `gh pr merge --squash`.

---
Branch: `feature/241-config-validation-mindest-tier-security`
Erstellt: 2026-08-01 07:46
