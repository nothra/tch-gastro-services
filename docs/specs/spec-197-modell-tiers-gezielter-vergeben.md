# Spec: Pipeline-Modell-Tiers gezielter vergeben

> Quelle: GitHub-Issue #197 (`enhancement` + `tech-debt`). Config-Tuning ohne neues
> Produktverhalten → Branch `improvement/`. Kein `factory::run`.

## Kontext

Die Factory kennt heute **zwei** Modell-Tiers (`factory.defaults.yml` → `model_tiers`):
`heavy` → `claude-opus-4-8`, `light` → `claude-sonnet-5` (Team-Override). `run-pipeline.sh`
wählt in `get_model()` pro Skill über ein **statisch** in der Config hinterlegtes `tier`-Feld.

Heute laufen `implement`, `review`, `security-review` und `bug-fix` auf `heavy`. `review` ist
damit einer der teuersten wiederkehrenden Posten: reine Lese-Analyse, läuft bei jedem Feature
(im Review↔Implement-Zyklus ggf. mehrfach) immer auf dem stärksten Modell – **unabhängig von
der Diff-Größe**. Zugleich ist die `implement`-Tier-Frage in `factory.config.yml` explizit als
„offen" dokumentiert (Task 135: Sonnet-Versuch ohne Einbußen bei kleinem Fix; Task 53: Sonnet
riss 3× bei größerem Scope → zurück auf heavy). Die Evidenz hängt also am **Aufwand des
einzelnen Laufs**, nicht am Skill.

Ziel: teure Modelle nur dort einsetzen, wo der Aufwand sie rechtfertigt – gesteuert über die
**Größe des jeweiligen Laufs** statt über eine pauschale Skill-Zuordnung. Effekt ist
multiplikativ mit dem Kontext-Hebel aus `token-efficiency.md` §6 (schlankerer Kontext ×
günstigeres Tier).

## Scope

**Inbegriffen:**
- Größenabhängige Tier-Wahl für **`review`** (Signal: Code-Diff, da bereits vorhanden).
- Größenabhängige Tier-Wahl für **`implement`** und **`bug-fix`** (Signal: **Proxy aus
  Spec/Task/ADR**, da der Code-Diff zum Auswahlzeitpunkt noch nicht existiert).
- **`security-review` bleibt fix `heavy`** – bewusst dokumentiert (nicht versehentlich
  „vergessen"). Ein übersehenes Finding ist teurer als der Token-Aufpreis (`token-efficiency.md` §6).
- `@reason`/`@tradeoff`-Begründung an jedem geänderten Knopf (ADR-011).
- Konsistenz kanonischer Quelle (`factory.defaults.yml`) + Reconciliation des veralteten
  Verweises auf eine nicht existierende README-Tier-Tabelle.
- Tests für den neuen Mechanismus (Positiv-/Negativ-Fall).

**Nicht inbegriffen (bewusst):**
- **Kein dritter/mittlerer Tier** – es bleibt bei genau zwei (`heavy`/`light`). YAGNI.
- **Keine Änderung der Modell-IDs** (`model_tiers.heavy`/`.light` unverändert).
- **Keine Tier-Änderung an den übrigen Skills** (`test`, `refactor`, `codify`, `pr-shepherd`,
  `requirements`, `architecture`, `release-notes`, `default` bleiben `light`).
- Kein Token-/Kosten-Accounting (ADR-006: die Factory baut das bewusst nicht nach).

## Größensignale (Definition, damit die AK testbar sind)

- **`review` – Diff-Größe:** Netto geänderte Zeilen = `added + deleted` summiert über
  `git diff --numstat <base>...HEAD`. **`<base>` ist ein aktuelles `origin/main`**, nicht das
  lokale `main` – sonst zählt der Diff Fremd-PRs mit, wenn lokales `main` zurückliegt (bekannter
  Stolperstein, `lessons/factory-workflow.md` → „Review-Diff-Scope"). Schwellwert: **Richtwert
  ~150 geänderte Zeilen**; `< Schwelle` → `light`, `>= Schwelle` → `heavy`.
- **`implement`/`bug-fix` – Proxy:** ein aus Spec/Task/ADR **zum Startzeitpunkt** ableitbares,
  zählbares Signal (z. B. Anzahl der Akzeptanzkriterien-Checkboxen in der Task-/Spec-Datei; ggf.
  ergänzt um ADR-Vorhandensein / Anzahl genannter Dateien). Unter Schwelle → `light`, ab
  Schwelle → `heavy`. **Die exakte Proxy-Metrik und ihr Schwellwert sind eine Architektur-
  Entscheidung** (siehe Offene Fragen) – die Spec legt nur das Prinzip und das Fail-Safe-
  Verhalten fest.

## Akzeptanzkriterien

- [ ] **AK1 – review klein → light:** GIVEN ein Branch, dessen Diff gegen ein aktuelles
      `origin/main` unter dem Schwellwert liegt, WHEN `run-pipeline.sh` `/review` aufruft, THEN
      läuft `/review` auf dem `light`-Modell.
- [ ] **AK2 – review groß → heavy:** GIVEN ein Diff am oder über dem Schwellwert, WHEN `/review`
      aufgerufen wird, THEN läuft es auf dem `heavy`-Modell.
- [ ] **AK3 – review-Basis korrekt:** GIVEN lokales `main` liegt hinter `origin/main`, WHEN die
      Diff-Größe berechnet wird, THEN wird gegen das aktuelle `origin/main` gemessen (Fremd-PRs
      blähen die Größe nicht auf).
- [ ] **AK4 – implement/bug-fix klein → light:** GIVEN eine Task, deren Spec/Task-Proxy unter dem
      Schwellwert liegt, WHEN `/implement` bzw. `/bug-fix` aufgerufen wird, THEN läuft der Skill
      auf `light`.
- [ ] **AK5 – implement/bug-fix groß → heavy:** GIVEN ein Proxy am oder über dem Schwellwert,
      WHEN `/implement` bzw. `/bug-fix` aufgerufen wird, THEN läuft der Skill auf `heavy`.
- [ ] **AK6 – security-review fix heavy:** GIVEN eine beliebige Diff-Größe, WHEN `/security-review`
      aufgerufen wird, THEN läuft es **immer** auf `heavy`; UND `factory.defaults.yml` dokumentiert
      dies per `@reason` als bewusste Festlegung.
- [ ] **AK7 – übrige Skills unverändert:** GIVEN die effektive Config, WHEN sie ausgewertet wird,
      THEN behalten `test`/`refactor`/`codify`/`pr-shepherd`/`requirements`/`architecture`/
      `release-notes` und `default` das Tier `light` (keine Tier-Änderung).
- [ ] **AK8 – Begründung am Knopf:** GIVEN jede geänderte Knopf-Zeile in `factory.defaults.yml`,
      THEN trägt sie `@reason` (und wo sinnvoll `@tradeoff`) gemäß ADR-011.
- [ ] **AK9 – Config-Gate grün:** GIVEN die neue Repräsentation dynamischer Tiers, WHEN
      `scripts/checks/config-validation-check.sh` läuft, THEN besteht es (die Prüfung
      `tier ∈ model_tiers` wird nicht durch den dynamischen Fall gebrochen).
- [ ] **AK10 – globaler Override sticht weiterhin:** GIVEN `CLAUDE_MODEL` gesetzt, WHEN ein
      beliebiger Skill läuft, THEN übersteuert es die größenabhängige Wahl (Verhalten wie heute).
- [ ] **AK11 – Konsistenz kanonischer Quelle:** GIVEN `factory.defaults.yml` als SSOT (ADR-009),
      THEN wird der veraltete Verweis in `token-efficiency.md` §6 auf eine „`README.md`
      (Tier-Tabelle)" bereinigt (Verweis auf die reale SSOT korrigieren **oder** die Tabelle
      tatsächlich anlegen und aktuell halten) – keine gegenseitig widersprechende Doku.
- [ ] **AK12 – implement-Tier nicht mehr „testweise":** GIVEN `factory.config.yml`, THEN ist der
      informelle „Test"-Override zu `implement` aufgelöst; die finale (größenabhängige) Regel
      steht in `factory.defaults.yml`, nicht als provisorischer Kommentar im Team-Override.

## Fehlerszenarien

- [ ] **F1 – Diff nicht bestimmbar (kein/kaputter Base, git-Fehler):** Tier fällt **fail-safe auf
      `heavy`** zurück – niemals still auf `light` (kein unbemerktes Downgrade an einer teuren
      Stelle).
- [ ] **F2 – Proxy nicht bestimmbar (Task-/Spec-Datei fehlt/leer):** ebenfalls **fail-safe
      `heavy`**.
- [ ] **F3 – Schwellwert-Konfigwert ungültig (nicht numerisch):** fail-closed über das
      Config-Gate (analog zu bestehenden Integer-Validierungen in `config-validation-check.sh`),
      kein stilles Durchwinken.
- [ ] **F4 – `yq`/Config fehlt:** unverändertes Bestandsverhalten (`run-pipeline.sh` bricht heute
      schon mit klarer Meldung ab).

## Offene Fragen (voraussichtlich `/architecture` vor `/implement`)

Der neue Mechanismus ist eine Design-Entscheidung mit Trade-offs und berührt ADR-009
(Config-Schichtung) – eine kurze ADR ist wahrscheinlich angezeigt („Entscheidungen
dokumentieren").

- [ ] **O1 – Repräsentation dynamischer Tiers in der Config:** Wie wird „größenabhängig" so
      hinterlegt, dass `config-validation-check.sh` (`tier ∈ model_tiers`) weiter greift?
      (z. B. Sentinel-Wert `auto`, separates `tier_rule`-Feld, o. Ä.)
- [ ] **O2 – Exakte Proxy-Metrik + Schwellwert für `implement`/`bug-fix`:** Welche zählbaren
      Spec/Task/ADR-Signale, welche Schwelle?
- [ ] **O3 – Wo lebt der/die Schwellwert(e)?** In `factory.defaults.yml` (ADR-009-Schichtung,
      per Team überschreibbar) mit `@reason`/`@tradeoff`? Ein Schwellwert für alle oder je Skill?
- [ ] **O4 – Diff-Größen-Randfälle:** Zählen Renames, generierte Dateien, Lockfiles mit? (Für
      einen stabilen, nicht manipulierbaren Schwellwert relevant.)

## Betroffene Artefakte (Orientierung, nicht abschließend)

- `factory.defaults.yml` – Tier-Zuordnung + `@reason`/`@tradeoff`, ggf. Schwellwert-Knopf.
- `factory.config.yml` – provisorischen `implement`-Override auflösen/aktualisieren.
- `scripts/run-pipeline.sh` – `get_model()`: Diff-Größe (review) + Proxy (implement/bug-fix),
  Fail-Safe auf `heavy`.
- `scripts/checks/config-validation-check.sh` – dynamische Tier-Repräsentation akzeptieren.
- `docs/factory/guidelines/token-efficiency.md` §6 – Verweis auf kanonische Quelle korrigieren.
- Tests zum Mechanismus (Positiv-/Negativ-Fall je Größensignal).
