# Spec: Factory-Defaults kalibrieren (Modell-Tiers, review/security-review max_turns)

## Kontext

`factory.defaults.yml` ist laut eigenem Kopfkommentar die kanonische Quelle (ADR-009) –
„NIE im adoptierten Projekt direkt editieren, sie kommt per Template-Update". In diesem Repo
korrigiert `factory.config.yml` aktuell mehrere Defaults, weil diese veraltet bzw. zu knapp
bemessen sind:

1. **Modell-Tiers veraltet.** Defaults: `model_tiers.heavy: claude-opus-4-8`,
   `model_tiers.light: claude-sonnet-4-6`. Der Team-Override überschreibt `light` bereits auf
   `claude-sonnet-5` (Kommentar: „veraltete Modell-ID" → „aktuelle Sonnet-Generation"). `heavy`
   steht weiterhin auf `claude-opus-4-8`, obwohl `claude-opus-5` verfügbar ist. `heavy` ist seit
   Task 249 ohnehin nicht mehr override-bar (`config-validation-check.sh` Regel 6) – Modell-ID-
   Pflege für `heavy` läuft **ausschließlich** über diese Datei.
2. **`max_turns` für `review`/`security-review` zu knapp.** Default beider Skills: `14`. In der
   Praxis (Task 91, Task 241) ist die Pipeline damit wiederholt mit „Reached max turns"
   abgebrochen, ohne einen Report zu schreiben – bei größeren Diffs reichen die sequenziellen
   Review-Runden plus Kontext-Laden/Report-Schreiben nicht. Der validierte, im Override bereits
   produktiv genutzte Wert ist `30` (`MAX_TURNS_CEILING=50` in `config-validation-check.sh`
   erlaubt das).
3. **Dritte Tier-Stufe (z. B. Haiku 4.5) für reasoning-arme Skills?** Im Requirements-Gespräch
   entschieden: **Nein** (Details unten, „Entscheidung: kein dritter Tier").

**Zusätzlicher Befund (über den Issue-Text hinaus):** `scripts/run-pipeline.sh` trägt an zwei
Stellen (Zeilen 209–210) dieselben veralteten Modell-IDs zusätzlich als eigene **Fallback-
Literale** (`.model_tiers.heavy // "claude-opus-4-8"`, `.model_tiers.light // "claude-sonnet-4-6"`),
die nur greifen, wenn `model_tiers.*` im effektiven Config-Objekt fehlt. Das ist eine zweite,
bisher nicht erwähnte Kopie derselben Modell-IDs außerhalb der SSOT `factory.defaults.yml` – sie
sollte auf dieselben aktuellen Werte gezogen werden, sonst driftet der Fallback-Pfad künftig
unbemerkt vom kanonischen Default weg (genau das Muster, das dieses Issue für `factory.config.yml`
beheben will, hier nur innerhalb des Scripts selbst). Kein Verhaltens-Unterschied in bestehenden
Tests (der Fallback wird dort nie ausgelöst, da `$DEFAULTS` immer einen Wert setzt).

**Zusätzlicher Befund (Regressionstests):** `scripts/checks/tests/run-tests.sh` kopiert in
mehreren End-to-End-Blöcken das reale `factory.defaults.yml` in ein Temp-Repo und lässt
`run-pipeline.sh --dry-run` laufen; die Assertions erwarten dabei die **heutigen** Default-Werte
wörtlich in der Ausgabe (`model: claude-opus-4-8`, `model: claude-sonnet-4-6`, `max 14 turns` für
review/security-review, u. a. Zeilen 1128, 1134, 1152, 1154, 2991, 2993, 2995, 3005, 3015, 3024).
Nach der Kalibrierung sind diese Literale falsch und die Tests schlagen fehl, bis sie auf die
neuen Werte (`claude-opus-5`, `claude-sonnet-5`, `max 30 turns` für review/security-review;
`max 20 turns` für implement/test bleibt unverändert) aktualisiert sind.

## Scope

**Inbegriffen:**

- `model_tiers.heavy` in `factory.defaults.yml`: `claude-opus-4-8` → `claude-opus-5`.
- `model_tiers.light` in `factory.defaults.yml`: `claude-sonnet-4-6` → `claude-sonnet-5`.
- `skills.review.max_turns` in `factory.defaults.yml`: `14` → `30`.
- `skills.security-review.max_turns` in `factory.defaults.yml`: `14` → `30`.
- Die `@reason`/Begründungs-Kommentare an den vier oben genannten Knöpfen werden inhaltlich
  aktualisiert (Modell-ID-Pflege bzw. Verweis auf den validierten Task-241-Wert), ohne die
  bestehende Begründungs-Konvention (ADR-011: `@reason`/`@tradeoff` am Knopf) zu verlassen.
- Env-Var-Override-Hinweise (`# CLAUDE_MODEL_HEAVY`, `# CLAUDE_MODEL_LIGHT`) bleiben unverändert
  bestehen (reine Werte-Pflege, kein Mechanismus-Wechsel).
- Die dadurch redundant gewordenen Overrides in `factory.config.yml` werden entfernt, inkl. der
  jeweils zugehörigen erklärenden Kommentarblöcke (kein toter Verweis auf einen nicht mehr
  vorhandenen Override):
  - `model_tiers.light: claude-sonnet-5` (entspricht jetzt dem Default).
  - `skills.review.max_turns: 30` (entspricht jetzt dem Default).
  - `skills.security-review.max_turns: 30` (entspricht jetzt dem Default).
- Die weiterhin nötigen Overrides in `factory.config.yml` (`implement.max_turns: 50`,
  `pr-shepherd.max_turns: 20`, `codify.max_turns: 30`, `test.max_turns: 40`) bleiben unverändert –
  ihre Werte weichen weiterhin vom neuen Default ab.
- Die beiden Fallback-Literale in `scripts/run-pipeline.sh` (Zeilen 209–210) werden auf
  `claude-opus-5`/`claude-sonnet-5` aktualisiert (SSOT-Konsistenz, s. „Zusätzlicher Befund" oben).
- Anpassung der betroffenen Regressionstests in `scripts/checks/tests/run-tests.sh` auf die neuen
  Literal-Werte (Modell-IDs, `max 30 turns` bei review/security-review), s. „Zusätzlicher Befund"
  oben – ohne die Tests inhaltlich sonst zu verändern (reine Wert-Anpassung, keine neue
  Test-Semantik).
- Dokumentierte Entscheidung zu Punkt 3 des Issues (dritte Tier-Stufe), s. u.

**Nicht inbegriffen:**

- Jede Änderung an `model_tiers.heavy` über einen Team-Override – bleibt laut Task-249-Policy
  gesperrt (`config-validation-check.sh` Regel 6), unabhängig vom Wert.
- `max_turns` für andere Skills als `review`/`security-review` (z. B. `implement`, `test`,
  `codify`, `pr-shepherd`) – nicht Teil dieses Issues, deren Overrides bleiben unverändert
  bestehen.
- Einführung einer dritten Modell-Tier-Stufe (z. B. Haiku 4.5). **Entscheidung: Nein** – zwei
  Tiers (`heavy`/`light`) bleiben bestehen. Begründung: ADR-038 hat einen dritten/mittleren Tier
  bereits explizit als YAGNI verworfen (Option D); es liegt keine belegte Kostenpein vor, die eine
  Neubewertung rechtfertigt; `light` (Sonnet 5) ist für die reasoning-armen Skills (`test`,
  `refactor`, `codify`, `pr-shepherd`, `default`) weiterhin der richtige Kompromiss aus
  Kosten/Qualität. Kein neues ADR nötig – die Begründung lebt in dieser Spec (analog zur
  Vorgabe des Issues, „sonst kurze Begründung, warum nicht"). Kein Code-/Config-Change für
  diesen Punkt.
- Änderungen an `config-validation-check.sh` (Regel 4a/5/6 bleiben strukturell unverändert – sie
  operieren bereits generisch auf `model_tiers`-Schlüsseln bzw. Tier-Namen, nicht auf konkreten
  Modell-IDs oder Turn-Zahlen; eine dritte Tier-Stufe wird ohnehin nicht eingeführt).
- `factory.config.yml.example`: Der Beispielblock „Knopf: model_tiers" zeigt weiterhin
  `light: claude-sonnet-4-6` als illustrativen Override-Wert. Das bleibt syntaktisch korrekt
  (reines Beispiel, kein aktiver Override, vgl. bestehende Testabsicherung „yq-Tag → `!!null`")
  und wird nicht angepasst – kein Test erzwingt einen bestimmten Beispielwert an dieser Stelle,
  nur dass `heavy` dort nicht als Beispiel-Knopf auftaucht (Task 249, unverändert).
- Produktcode/Nutzerverhalten der App – betroffen sind ausschließlich Factory-Config und
  Pipeline-Skript.

## Akzeptanzkriterien

- [ ] **AK1 – `model_tiers.heavy` aktualisiert:** GIVEN `factory.defaults.yml` WHEN gelesen THEN
      steht `model_tiers.heavy` auf `claude-opus-5` (statt `claude-opus-4-8`); der
      Env-Var-Hinweis `# CLAUDE_MODEL_HEAVY` bleibt als Trailing-Kommentar erhalten.

- [ ] **AK2 – `model_tiers.light` aktualisiert:** GIVEN `factory.defaults.yml` WHEN gelesen THEN
      steht `model_tiers.light` auf `claude-sonnet-5` (statt `claude-sonnet-4-6`); der
      Env-Var-Hinweis `# CLAUDE_MODEL_LIGHT` bleibt als Trailing-Kommentar erhalten.

- [ ] **AK3 – `skills.review.max_turns` angehoben:** GIVEN `factory.defaults.yml` WHEN gelesen
      THEN steht `skills.review.max_turns` auf `30` (statt `14`); der `@reason`-Kommentar am
      Knopf verweist auf den validierten Task-241-Wert statt (nur) auf die ursprüngliche
      Task-91-Begründung.

- [ ] **AK4 – `skills.security-review.max_turns` angehoben:** GIVEN `factory.defaults.yml` WHEN
      gelesen THEN steht `skills.security-review.max_turns` auf `30` (statt `14`); der
      `@reason`-Kommentar am Knopf verweist auf den validierten Task-241-Wert.

- [ ] **AK5 – Redundanter `model_tiers.light`-Override entfernt:** GIVEN `factory.config.yml`
      WHEN nach der Default-Anhebung (AK2) gelesen THEN existiert dort kein `model_tiers.light`-
      Override mehr (Wert entspricht jetzt exakt dem neuen Default) und der zugehörige
      Kommentarblock „Knopf: model_tiers.light" ist entfernt.

- [ ] **AK6 – Redundanter `skills.review.max_turns`-Override entfernt:** GIVEN
      `factory.config.yml` WHEN nach der Default-Anhebung (AK3) gelesen THEN existiert dort kein
      `skills.review.max_turns`-Override mehr und der zugehörige Kommentarblock ist entfernt.

- [ ] **AK7 – Redundanter `skills.security-review.max_turns`-Override entfernt:** GIVEN
      `factory.config.yml` WHEN nach der Default-Anhebung (AK4) gelesen THEN existiert dort kein
      `skills.security-review.max_turns`-Override mehr und der zugehörige Kommentarblock ist
      entfernt.

- [ ] **AK8 – Weiterhin nötige Overrides bleiben unverändert (Nicht-Regression):** GIVEN
      `factory.config.yml` WHEN nach AK5–AK7 gelesen THEN sind `skills.implement.max_turns: 50`,
      `skills.pr-shepherd.max_turns: 20`, `skills.codify.max_turns: 30` und
      `skills.test.max_turns: 40` weiterhin vorhanden und unverändert (deren Werte weichen
      weiterhin von den Defaults ab).

- [ ] **AK9 – Config-Validierung bleibt grün:** GIVEN die aktualisierten `factory.defaults.yml`
      und `factory.config.yml` WHEN `bash scripts/checks/config-validation-check.sh` läuft THEN
      ist der Exit-Code `0` (sowohl Defaults allein als auch Defaults+Override).

- [ ] **AK10 – `run-pipeline.sh`-Fallback-Literale aktualisiert:** GIVEN
      `scripts/run-pipeline.sh` WHEN die Zeilen mit `CLAUDE_MODEL_HEAVY`/`CLAUDE_MODEL_LIGHT`
      gelesen werden THEN lauten die eingebetteten Fallback-Werte `claude-opus-5` bzw.
      `claude-sonnet-5` (statt `claude-opus-4-8`/`claude-sonnet-4-6`) – konsistent mit AK1/AK2.

- [ ] **AK11 – Bestehende Regressionstests grün:** GIVEN `bash scripts/checks/tests/run-tests.sh`
      WHEN die yq-abhängigen End-to-End-Dry-Run-Tests laufen (u. a. Zeilen 1128, 1134, 1152, 1154,
      2991, 2993, 2995, 3005, 3015, 3024 im Ist-Stand) THEN erwarten sie die neuen Literal-Werte
      (`model: claude-opus-5`, `model: claude-sonnet-5`, `max 30 turns` für review/
      security-review) und sind grün, ohne ihre inhaltliche Test-Aussage zu verändern.

- [ ] **AK12 – Dritte Tier-Stufe dokumentiert entschieden:** GIVEN diese Spec WHEN gelesen THEN
      ist Issue-Punkt 3 (dritte, günstigere Tier-Stufe) mit einer expliziten Entscheidung
      („Nein", Begründung s. Scope „Nicht inbegriffen") dokumentiert – kein offener Punkt, kein
      ADR nötig.

## Fehlerszenarien

- [ ] **Override-Entfernung lässt unbeabsichtigt einen anderen Knopf verwaisen:** Beim Entfernen
      der drei redundanten Override-Blöcke (AK5–AK7) darf keiner der weiterhin nötigen Overrides
      (`implement`, `pr-shepherd`, `codify`, `test`) oder deren Kommentarblöcke versehentlich mit
      entfernt werden (AK8 als Nicht-Regressions-Guard).
- [ ] **`config-validation-check.sh` lehnt die bereinigte `factory.config.yml` fälschlich ab:**
      Da Regel 2 (unbekannte Keys) und Regel 5 (Mindest-Tier) strukturell unverändert bleiben,
      darf das Entfernen von Override-Zeilen keine neue Gate-Verletzung auslösen (AK9 deckt das
      ab – ein leerer/kleinerer Override ist immer eine Teilmenge des vorherigen, gültigen
      Zustands).
- [ ] **Regressionstests werden nur teilweise angepasst:** Wird nur ein Teil der in „Zusätzlicher
      Befund" gelisteten Testzeilen aktualisiert (z. B. nur die `implement`-Assertions, nicht die
      `review`/`security-review`-Assertions), bleibt die Suite rot. AK11 verlangt explizit alle
      betroffenen Stellen.
- [ ] **`run-pipeline.sh`-Fallback bleibt unbemerkt veraltet:** Wird AK10 übersehen (da der
      Fallback in bestehenden Tests nie ausgelöst wird und daher kein Test ihn heute als rot
      markiert), bleibt eine zweite, stille Kopie der alten Modell-IDs im Repo zurück – exakt das
      Drift-Muster, das dieses Issue eigentlich beheben soll.

## Offene Fragen

- [ ] **ADR-019-Drift:** `docs/adr/019-stage3-commit-seam-report-guard.md` §5 („Budget-Puffer")
      beschreibt explizit die Werte „`max_turns` von `8` auf **14** für `review` und
      `security-review`". Nach AK3/AK4 ist „14" als aktueller Wert nicht mehr zutreffend (ADR
      bleibt als historisches Protokoll der damaligen Entscheidung gültig, wird aber ohne
      Anpassung leicht als „aktueller Stand" missverstanden). `/architecture` entscheidet, ob ein
      kurzer Nachtrag/Verweis auf Task 241/252 genügt oder ob die Passage unverändert als
      historischer Schnappschuss stehen bleibt (analog zur in spec-249 bereits an `/architecture`
      delegierten ADR-Drift-Frage zu ADR-010).
- [ ] **ADR-038-Beispielblock:** Der Config-Schema-Codeblock in
      `docs/adr/038-groessenabhaengige-modell-tier-wahl.md` zeigt `max_turns: 14` bei `review` und
      `security-review` als Beispielwert. Gleiche Frage wie oben – `/architecture` entscheidet,
      ob dieser Beispielblock mit aktualisiert wird oder als historischer Schnappschuss stehen
      bleibt.
