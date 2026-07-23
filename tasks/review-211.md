# Review: Task 211

Multi-Persona-Review (3 Runden: Backend/Logik, Code-Qualität/Tests, Architektur/Patterns).
Alle drei Personas empfahlen für sich jeweils ohne kritische Findings. Zwei **im Scope**
liegende WICHTIG-Findings führen zu einer Rework-Runde.

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- [x] `docs/adr/019-stage3-commit-seam-report-guard.md:65-66` – ADR-Drift: §4 beschreibt die
  Verdict-Erkennung noch als `grep -oE "APPROVED|NEEDS_REWORK" / "PASSED|NEEDS_FIXES"`
  („letztes Vorkommen"). Genau diese Mechanik ersetzt dieser PR durch die Anker-basierte
  awk-Logik. Die Entscheidung („ein Ort", Report-Guard) bleibt gültig, aber die beschriebene
  Mechanik ist jetzt falsch → in diesem PR mitpflegen (Codify-Learning #55 „ADR nach
  Review-Rework auf Drift prüfen"). **[behoben Runde 2]**
- [x] `scripts/checks/tests/run-tests.sh` – Testlücke AK6: die für das Security-Gate gefährliche
  Spiegel-Richtung (Verdict-Zeile `PASSED` + Fließtext `NEEDS_FIXES` → darf **nicht** blockieren)
  war nur transitiv über den Wiring-Guard belegt, nicht durch eine eigene Assertion. Verhalten
  war korrekt, aber unassertiert (testing-standards „jedes AK ≥ 1 Test"). **[behoben Runde 2]**

## Nitpicks (optional)
- [ ] `scripts/lib/report-verdict.sh:43-44` – `index()` ist substring-basiert (`NOT_APPROVED`
  würde `APPROVED` matchen). Durch den Anker (nur erste Nicht-Leerzeile) + `hasA && hasB`-
  Ausschluss praktisch unkritisch; Contract erzeugt bare Tokens. Bewusst belassen.
- [ ] `scripts/lib/report-verdict.sh:40` – `header` geht als Regex-Fragment in den Match ein.
  Für `## Empfehlung`/`## Ergebnis` (keine Metazeichen) unkritisch; latent, falls ein künftiger
  Header ein Metazeichen bekäme. Contract-fixiert, kein Handlungsbedarf.
- [ ] `token_a`/`token_b` sind leicht generisch benannt; marginal.

## Out-of-Scope (nicht in diesem PR – Follow-up)
- Contract-Drift-Guard: Kein Test liest die echten `.claude/commands/{review,security-review}.md`
  und prüft, dass deren Anker-Überschriften mit den Parser-Konstanten übereinstimmen. Benennt
  jemand die Überschrift um, liefert `report_verdict` still ein leeres Verdict (fail-closed →
  Dauer-Rework), ohne dass ein Test rot wird. Dieselbe Lücke besteht bereits für
  `count_section_items` – dieser PR vertieft sie nur. → autonom als Issue **#214** angelegt
  (`enhancement` + `test`/`tech-debt`).

## Positives
- Wurzelfix statt Symptom: Verdict kommt aus der strukturierten Anker-Zeile; Fließtext-
  Erwähnungen können den Verdict nicht mehr kippen (behebt den #206-Vorfall sauber).
- Konsequent fail-closed: fehlender Anker, kein Token, **beide** Tokens (Template-Copy-Paste)
  → leeres Verdict, kein Raten.
- AK7 „ein Ort" vollständig erfüllt und per `grep -rn` verifiziert: alle fünf Lesestellen
  (`run-pipeline.sh:261/350/364/429/463`) laufen über `report_verdict`; kein Volltext-Grep mehr.
- awk POSIX-portabel (BSD/macOS + GNU/Alpine): nur `index()`, `[[:space:]]`, `next`/`exit`.
- Testmigration vorbildlich: alter „letztes Vorkommen"-Test durch AK2+F4 ersetzt; alle
  `--dry-run`-Fixtures auf das Anker-Format umgestellt; keine Tautologien.
- Änderung eng am Scope, kein Gold-Plating.

## Empfehlung
APPROVED
</content>
</invoke>
