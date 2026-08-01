## Codify-Report: Task 241

### Neue Regeln hinzugefügt
- `docs/factory/lessons/factory-workflow.md` (+ Index-Zeile in `docs/factory/PROJECT-CONTEXT.md`)
  – **„Ein Floor auf einen Lookup-Key ist kein Floor auf das, wofür er steht"**: Regel 5 in
  `config-validation-check.sh` pinnt das Tier-*Label* `heavy`, nicht das *Modell* dahinter
  (`model_tiers.heavy` blieb weiter override-bar). Wegen: Security-Review-Finding (PoC belegt
  Exit 0 trotz gepinntem Label). Generalisiert über Tier-Label hinaus auf jede
  Lookup-Key→Zielseite-Indirektion (Rollen-Name → Rechte-Tabelle, Environment-Name →
  Secret-Store-Pfad). Trigger: `/security-review`, `/implement` bei Config-Gate mit Pin auf
  einen Lookup-Key. Direkte Fortsetzung des Codify-Learnings #224→#241.
- Out-of-Scope-Härtungs-Issue **#249** angelegt (Labels `enhancement` + `security`, über den
  zentralen Seam `create_issue`) für den konkreten `model_tiers.heavy`-Remap-Bypass –
  Security-Review stufte ihn bewusst als Nicht-Blocker für #241 ein (vorbestehend, außerhalb
  des Spec-Scopes), aber als eigenständigen Härtungsbedarf.

### Keine Änderungen nötig
- **Review-Nitpicks (2, beide optional/nicht-blockierend):** fehlender Ordering-Pin-Test
  (`tier: medium` → 4a- statt 5-Meldung) und `for`- vs. `while read`-Stilunterschied zwischen
  Regel 5 und 4a–4c. Beide bereits im Refactor-Schritt bewusst zurückgestellt und begründet
  (Testabdeckungsfrage außerhalb `/refactor`-Scope bzw. unterschiedliche Datenquellen
  rechtfertigen unterschiedliche Idiome). Kein wiederkehrendes Muster – keine neue Lesson.
- **Security-Hinweis „exakte Gleichheit statt Mindest-Ordnung" (`tier == heavy`):** bewusste,
  in der Spec dokumentierte Design-Grenze (nur `heavy`/`light` existieren aktuell), kein Defekt.
- **PoC-Housekeeping-Hinweis** (`.coverage-tmp241poc.yml` im Repo-Root): Datei existiert nicht
  mehr im Arbeitsbaum – bereits bereinigt, keine weitere Aktion nötig.

### Empfehlung für nächste Iteration
Bei künftigen Mindest-Tier-/Floor-Gates immer direkt mitprüfen, ob der gepinnte Wert selbst
wieder ein Lookup-Key in eine weitere, override-bare Config-Sektion ist – siehe neue Lesson.
