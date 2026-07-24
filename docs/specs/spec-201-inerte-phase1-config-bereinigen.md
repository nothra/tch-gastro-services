# Spec: Inerte Modell-/max_turns-Config für Phase-1-Skills bereinigen

Issue: [#201](https://github.com/nothra/tch-gastro-services/issues/201) · Branch: `chore/201-inerte-phase1-config-bereinigen`

## Kontext

`factory.defaults.yml` bündelt pro Skill zwei Knöpfe – `tier` (→ Modell) und `max_turns`
(Kosten-Deckel). Diese Werte greifen **ausschließlich** über `get_model`/`get_max_turns` in
`scripts/run-pipeline.sh`. Der einzige automatisierte Konsument, `run_skill`, wird dort aber
nur für `implement`, `review`, `test`, `refactor`, `security-review`, `codify`, `pr-shepherd`
aufgerufen (`run-pipeline.sh:411–484`).

`requirements` und `architecture` sind per Design **Phase-1-Skills** (CLAUDE.md/OPERATING.md:
„erfordert immer die Interaktion Mensch ↔ Claude und wird nicht automatisiert"). `run-pipeline.sh`
führt sie nie aus (nur eine Hinweiszeile). Beim interaktiven Aufruf in Claude Code gilt das
Modell der Session, nicht `factory.defaults.yml`. Gleiches gilt für `release-notes` (ebenfalls
nicht pipeline-invoked).

Damit sind die Einträge `skills.requirements`, `skills.architecture` und `skills.release-notes`
(Zeilen 77–79) **inert**: sie steuern nichts, suggerieren aber eine Phase-1-Automatik, die es
nicht gibt. Reine Config-/Doku-Klarheit ohne neues Verhalten → eigener Aufräum-Task außerhalb
des Scopes von #197/ADR-038.

**Getroffene Entscheidungen (Requirements-Sitzung):**
- **Ansatz = Entfernen.** Die drei Einträge werden gelöscht; sie fallen sauber auf den
  `default`-Block (`tier: light`, `max_turns: 10`) zurück. `cfg_skill_field` nutzt
  `.skills.<skill>.<feld> // .default.<feld>` → Auflösung bleibt garantiert, kein stilles
  Heavy-Upgrade.
- **bug-fix bleibt unverändert.** `bug-fix` ist der konzeptionelle alternative Einstieg zu
  `implement` (heavy + `tier_by_size`); die Config bleibt „bereit", falls die Pipeline bug-fix
  je als Entrypoint via `run_skill` unterstützt. Kein Teil dieses Tasks.

## Scope

**Inbegriffen:**
- Entfernen von `skills.requirements`, `skills.architecture`, `skills.release-notes` aus
  `factory.defaults.yml`.
- Anpassen des Tests „#197 AK7" (`scripts/checks/tests/run-tests.sh:2648`), der die drei Skills
  namentlich als `light`/ohne `tier_by_size` prüft, sodass er die effektive Auflösung auf
  `default`-`light` belegt statt die (dann nicht mehr existenten) Einträge – Suite bleibt grün.
- Prüfen/Nachziehen der ADR-038-Kommentarzeile (`docs/adr/038-…:62`), die die drei Skills als
  „unverändert (light, kein tier_by_size)" beschreibt, damit sie nicht auf entfernte Einträge
  verweist.

**Nicht inbegriffen:**
- Jede Änderung an `bug-fix` (bewusst so belassen).
- Jede Änderung an pipeline-getriebenen Skills (`implement`, `review`, `test`, `refactor`,
  `security-review`, `codify`, `pr-shepherd`), an `model_tiers` oder am `default`-Block.
- Rückwirkende Änderung des **historischen** Narrativs in `spec-197` (abgeschlossener Change,
  bleibt als Vorfall-Historie stehen).
- Neues Verhalten der Pipeline (kein Verdrahten von Phase-1-Skills in `run_skill`).

## Akzeptanzkriterien

- [ ] **AK1 – Einträge entfernt.** GIVEN `factory.defaults.yml` mit `skills.requirements`,
  `skills.architecture`, `skills.release-notes` WHEN die drei Skill-Einträge gelöscht sind THEN
  enthält `.skills` keinen dieser drei Schlüssel mehr, während `model_tiers`, `default`,
  `bug-fix` und alle pipeline-getriebenen Skill-Einträge unverändert bleiben.
- [ ] **AK2 – Fallback erhält das Verhalten.** GIVEN die entfernten Einträge WHEN
  `get_model <skill>` bzw. `get_max_turns <skill>` für `requirements`/`architecture`/
  `release-notes` läuft THEN liefert `get_model` das **light**-Modell und `get_max_turns` den
  **default**-Wert (`10`) – kein stilles Heavy-Upgrade, konsistent mit dem bisherigen `light`.
- [ ] **AK3 – Config-Gate bleibt fail-closed konsistent.** GIVEN die bereinigte
  `factory.defaults.yml` WHEN `scripts/checks/config-validation-check.sh` läuft THEN endet es mit
  Exit 0, und die Regeln 4a–4c (tier ∈ model_tiers, max_turns ∈ [1,50], tier_by_size) bleiben
  unverändert wirksam.
- [ ] **AK4 – #197-AK7-Test angepasst, Suite grün.** GIVEN der Test „#197 AK7"
  (`run-tests.sh:2648`), der die drei Skills namentlich prüft WHEN die Einträge entfernt sind
  THEN belegt der Test die effektive Auflösung dieser drei Skills auf `default`-`light` (statt
  eigener Einträge), und `bash scripts/checks/tests/run-tests.sh` läuft vollständig grün.
- [ ] **AK5 – Keine irreführende Automatik-Suggestion.** GIVEN die bereinigte Config WHEN ein
  Leser die `skills`-Map inspiziert THEN suggeriert kein `tier`/`max_turns`-Knopf mehr eine
  Phase-1-Automatik für `requirements`/`architecture`/`release-notes`.
- [ ] **AK6 – ADR-038-Kommentar konsistent.** GIVEN die ADR-038-Zeile, die die drei Skills als
  „unverändert (light, kein tier_by_size)" auflistet WHEN die Einträge entfernt sind THEN
  beschreibt der Kommentar den tatsächlichen Zustand (Auflösung über `default`), ohne auf
  entfernte Einträge zu verweisen.

## Fehlerszenarien

- [ ] **F1 – Verstecktes Test-/Skript-Coupling.** Ein weiterer Test oder ein Skript liest
  `skills.requirements|architecture|release-notes` direkt (`yq`) und bräche nach dem Entfernen.
  → Vor dem Merge repo-weit greppen (`grep -rIn` über `scripts/`); nur `run-tests.sh:2648` ist
  bekannt. Fund → mit anpassen.
- [ ] **F2 – Annotation-Vollständigkeits-Gate (C(a)).** Der Test „C(a)/yq" prüft, dass **jeder**
  vorhandene `skills`-Pfad einen `@reason`-Textkörper trägt. → Bleibt konsistent, weil er über
  die tatsächlich vorhandenen Keys iteriert (weniger Keys = weiterhin vollständig); nach der
  Änderung verifizieren.
- [ ] **F3 – Doku-Drift.** Wizards (`/setup-project`, `/configure-factory`),
  `factory.config.yml.example` oder ADR-Prosa beschreiben die entfernten Einträge namentlich.
  → `factory.config.yml.example` nutzt nur den generischen Platzhalter `skills.<name>` (keine
  Änderung nötig); ADR-038:62 im selben PR nachziehen (AK6); `spec-197` bleibt als historisches
  Narrativ.

## Offene Fragen

- [ ] Keine offen. Kein neuer ADR nötig – die Config-Mechanik ist bereits durch ADR-009
  (Config), ADR-011 (Annotation-Konvention) und ADR-038 (größenabhängiges Tiering) abgedeckt;
  dieser Task ist reine Bereinigung ohne neues Verhalten.
