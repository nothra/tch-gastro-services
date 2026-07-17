## Codify-Report: Task 138

### Neue Regeln hinzugefügt
- `docs/factory/guidelines/testing-standards.md` – neuer Abschnitt „Exhaustiveness-Guards
  (`never`-Check) brauchen einen eigenen Test" – wegen: Der im Refactoring-Pass explizit
  gemachte `kaffee`-Zweig samt `const _exhaustive: never = ...; throw new Error(...)`-Guard in
  `summen.ts` war nach `/refactor` ungetestet. Nicht in Review oder Security-Review gefunden,
  sondern erst in `/test` als Coverage-Lücke (0/2 Zeilen). Muster ist generisch (kein
  TCH-Gastro-Spezifikum) → Guideline statt PROJECT-CONTEXT.md, analog zur bestehenden
  „Guard-Clause-Branches in Server Actions brauchen dedizierte Tests"-Regel (aus #51), aber für
  Exhaustiveness-Guards in reiner Rechenlogik statt für Action-Grenzen.

### Keine Änderungen nötig
- Review (`tasks/review-138.md`): APPROVED, keine kritischen/wichtigen Findings. Beide Nitpicks
  der Vorrunde (impliziter Kaffee-Zweig, lose Test-Matcher) waren bereits vor der finalen
  Review-Runde im Refactoring behoben.
- Security-Review (`tasks/security-138.md`): PASSED, keine Findings. Reine, DB-freie
  Rechenlogik + präsentationale Komponente ohne neue Eingaben/Dependencies/Auth-Berührung –
  Threat-Surface korrekt als minimal eingeordnet.
- Konsumenten-Check (`grep -rn "sonstigeCents\|zeileSummen\|ZeileSummen" app/ db/ lib/`) wurde
  bereits in `/architecture` durchgeführt und in der Task-Datei dokumentiert – kein Nacharbeiten
  nötig.
- Keine neue projektspezifische Regel für PROJECT-CONTEXT.md: Der einzige Fund (Exhaustiveness-
  Guard-Coverage) ist universell, siehe oben.

### Empfehlung für nächste Features
- Bei künftigen Refactorings, die einen impliziten `else`-Zweig in einen expliziten
  Exhaustiveness-Guard umwandeln (Fail-closed-Verbesserung, wie hier für eine vierte
  Katalog-Kategorie): den Guard-Test **im selben Schritt** ergänzen, nicht erst in `/test`
  nachziehen – spart eine Iteration.
