# Security Review: Task 241

> Persona: `docs/factory/agents/security-agent.md` · Scope: `git diff origin/main...HEAD`
> (merge-base `af5003f6`). Geänderte sicherheitsrelevante Artefakte:
> `scripts/checks/config-validation-check.sh` (Regel 5), `scripts/checks/tests/run-tests.sh`
> (AK1–AK6-Fixtures), `factory.config.yml` (`review.max_turns: 30`, Kommentar).
> Prüfkatalog: OWASP-Top-10-Anpassung für internes Bash/`yq`-Gate-Tooling.

## Kritische Findings (Blocker)

_Keine Blocker im Scope dieser Task._ Die eingeführte Regel 5 (5a Mindest-Tier, 5b
`tier_by_size`-Sperre für `security-review`) ist innerhalb ihres deklarierten Scopes
(`skills.<skill>.tier` + `tier_by_size`, Spec §Scope) korrekt, fail-closed und vollständig
über AK1–AK6 abgedeckt. Verifiziert:

- **5a/5b operieren auf der effektiven (gemergten) Config** (`$effective`), nicht auf dem rohen
  Override → ein indirekt wirkender Override wird erfasst (Spec-Fehlerszenario „Nur `tier`, nicht
  die effektive Config" adressiert).
- **Reihenfolge 4a → 5a** korrekt: ein strukturell ungültiges `tier` (z. B. `medium`) fällt zuerst
  mit der 4a-Meldung, nicht fälschlich als „unter Mindest-Tier".
- **Fail-closed bei fehlendem/leerem `tier`:** `... // ""` → Vergleich gegen `heavy` schlägt fehl →
  `exit 1`. Deep-Merge kann Keys nur hinzufügen/überschreiben, nicht entfernen → `security-review`/
  `review` bleiben immer geprüft.
- **5b `has("tier_by_size")`** greift unabhängig vom Wert (auch `tier_by_size: null` → `has=true`
  bzw. bereits durch Regel 2 als unbekannter Blatt-Pfad abgelehnt).
- **Keine Injection:** `$skill` iteriert über **statische Policy-Konstanten** im Skript
  (`security-review review`), nie über Fremdinhalt; `yq`-Pfade sind sauber gequotet; Config-Werte
  fließen ausschließlich in String-Vergleiche (`[ = ]`), kein `eval`.
- **Policy nicht override-bar (AK7):** `MIN_TIER_REQUIRED`/`MIN_TIER_SKILLS`/`NO_TIER_BY_SIZE_SKILLS`
  liegen als Konstanten am Skriptkopf, nicht in der merge-baren Config — analog `MAX_TURNS_CEILING`.

## Wichtige Findings

- [ ] **[Broken Access Control / Security-Control-Bypass] Das Gate pinnt das Tier-*Label* `heavy`,
      nicht das *Modell* dahinter — `model_tiers.heavy` bleibt override-bar und hebelt denselben
      Fail-Safe aus, den Task 241 schützen soll.**

  **Angriffsfläche / Beweis (verifiziert):** `factory.defaults.yml` definiert
  `model_tiers.heavy: claude-opus-4-8`. Dieser Pfad ist ein bekannter Blatt-Pfad → Regel 2 lässt
  einen Override darauf zu (die bestehende `factory.config.yml` überschreibt bereits
  `model_tiers.light` — der Pfad ist **live**, nicht theoretisch). Ein Override

  ```yaml
  model_tiers:
    heavy: claude-sonnet-5   # oder ein noch schwächeres/billigeres Modell
  ```

  passiert **alle** Regeln: Regel 2 (bekannter Key), Regel 4a (`security-review.tier == heavy` ist
  ein gültiger `model_tiers`-Key), Regel 5a (`tier == heavy` erfüllt), Regel 5b (kein
  `tier_by_size`). **PoC ausgeführt:** `config-validation-check.sh factory.defaults.yml <override>`
  → **Exit 0** (Gate akzeptiert).

  **Wirkung (real, nicht theoretisch):** `run-pipeline.sh:209` leitet
  `CLAUDE_MODEL_HEAVY` aus der effektiven `.model_tiers.heavy` ab; `get_model` (Zeile 151) gibt bei
  Tier `heavy` genau diesen Wert zurück. Damit läuft `/security-review` (und `/review`) trotz
  gepinntem Label `heavy` auf dem schwächeren Modell — **exakt die unbemerkte Schwächung des
  einzigen verbliebenen Security-Gates, die die Spec (§Kontext) verhindern will**, nur über einen
  zweiten, nicht enumerierten Pfad (`model_tiers`-Remap statt `skills.*.tier`).

  **Einordnung — kein Blocker für diesen PR:** (a) Die Schwachstelle ist **vorbestehend** —
  `model_tiers` war vor Task 241 override-bar; dieser PR führt sie nicht ein, er schließt sie nur
  nicht. (b) Der Spec-Scope grenzt bewusst auf `tier`/`tier_by_size` ab; `model_tiers`-Remap ist ein
  **distinkter Mechanismus**, in der Spec nicht enumeriert. (c) Ein Fix ist eine eigene
  Design-Entscheidung (erlaubte `heavy`-Modell-IDs pinnen? `model_tiers.heavy`-Override im Gate
  sperren? Capability-Floor definieren?) → eigener Task. Direkte Fortsetzung des Codify-Learnings
  #224→#241 („prüfen, ob deren Validierung einen Mindest-Floor erzwingt" — der Floor auf das *Label*
  existiert jetzt, der auf das *Modell* fehlt noch).

  **Empfohlene Lösung (im Folge-Issue):** Im Gate zusätzlich prüfen, dass `model_tiers.heavy` in der
  effektiven Config eine der policy-seitig erlaubten (starken) Modell-IDs bleibt — oder einen
  Override auf `model_tiers.heavy` ganz ablehnen (analog `MAX_TURNS_CEILING`-Muster: die
  heavy-Definition als Gate-Policy behandeln, nicht als merge-baren Knopf). → Out-of-Scope-Issue
  angelegt (Nr. siehe unten).

## Hinweise

- [ ] **[Robustheit / kein Security-Defekt] Regel 5a fordert exakte Gleichheit `tier == heavy`,
      keine „mindestens heavy"-Ordnung.** Solange nur `heavy`/`light` existieren (ADR-010), ist das
      korrekt und fail-closed. Käme künftig ein *stärkeres* Tier über `heavy` hinzu, würde ein
      `security-review.tier: <stärker>` fälschlich abgelehnt (over-strict, kein Loch). Da neue Tiers
      ohnehin nur per Template-Update der Defaults kommen und die Regel dann mitgepflegt wird, kein
      Handlungsbedarf — nur als bewusste Design-Grenze notiert (deckt sich mit Spec §„Nicht
      inbegriffen": keine Erweiterbarkeit auf künftige Tier-Namen).

- [ ] **[Housekeeping] PoC-Fixture aufräumen.** Für den PoC oben wurde `.coverage-tmp241poc.yml` im
      Repo-Root angelegt; die `rm` wurde im aktuellen Permission-Modus blockiert. Die Datei ist
      **nicht** von `.gitignore` gedeckt (Muster `.coverage-tmp*/` trifft nur Verzeichnisse) →
      bitte manuell entfernen: `rm '.coverage-tmp241poc.yml'`, damit sie nicht in `git status`
      auftaucht.

## Ergebnis

**PASSED** — kein Blocker im Scope; die neue Regel 5 ist sicherheitstechnisch sauber
(fail-closed, injection-frei, effektive Config, nicht override-bar). Ein **wichtiges
Out-of-Scope-Härtungs-Finding** (`model_tiers.heavy`-Remap umgeht die Mindest-Tier-Absicht) wird als
eigenes GitHub-Issue mit `security`-Label geführt (ADR-018) und blockiert den Merge dieses PR nicht.
