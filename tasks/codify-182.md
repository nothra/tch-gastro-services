## Codify-Report: Task 182

### Neue Regeln hinzugefügt

- [`lessons/code-style.md`](../docs/factory/lessons/code-style.md) + Index-Zeile in
  `PROJECT-CONTEXT.md`: **JSDoc auf einem geteilten Options-Interface, die einen konkreten
  Produktionswert nennt, driftet beim zweiten Konsumenten** – wegen: `RateLimiterOptions.limit`
  nannte „(Produktion: 30)", bis Task #182 einen zweiten Singleton mit `limit: 60` einführte
  (Review-Runde 1, W2). Der Fix behob nur das gemeldete Feld – dieselbe Drift lag zeitgleich am
  Nachbarfeld `windowMs` vor und wurde erst eine Review-Runde später gefunden (Runde 2,
  Nitpick 1). Zwei Instanzen desselben Root Cause innerhalb einer Task rechtfertigen eine eigene
  Regel: beim Beheben eines solchen Findings alle Felder derselben Interface-Definition
  mitprüfen, nicht nur das gemeldete.

### Keine Änderungen nötig (bereits abgedeckte Muster)

Die übrigen Findings dieser Task waren Anwendungsfälle bereits bestehender Lessons – sie
bestätigen, dass die Regeln greifen, brauchen aber keine neue oder erweiterte Formulierung:

- **ADR-034-D7-/Schema-Kommentar-Drift** (Review-Runde 1 W1, Security-Hinweis): Prosa, die eine
  bereits gelieferte Mechanik weiter im Präsens als offenen Punkt beschreibt – exakt das Muster
  aus Codify #211/#176.
- **Mutationsbeleg für `windowMs`/`limit` am Singleton** (Review-Runde 2 W1): Test prüfte nur
  Zähler, nicht die tatsächliche Fensterlänge – exakt das Muster „derselbe Assert-Ausdruck, beide
  Richtungen" aus Codify #258/#268/#286. Mit Fake-Timern und beidseitiger Mutationsprobe sauber
  behoben, keine neue Lesson nötig.
- **Test-Duplikat** (`should_throttleKey_when_limitExceededWithinWindow`, /test-Schritt): exakt
  das Muster aus Codify #240 (parallele Struktur mit identischem Rumpf vor dem Anlegen
  abgleichen).
- **Out-of-Scope-Finding → Issue #297**: lief über den etablierten Schwellen-Prozess
  (ADR-018/ADR-043) wie vorgesehen, keine Prozessänderung nötig.

### Empfehlung für nächste Features

Keine besonderen Hinweise – die Pipeline lief in drei Review-Runden ohne kritische/wichtige
Findings zum Abschluss (Circuit Breaker nicht erreicht), Security-Review PASSED beim ersten
Durchlauf. Die neue Lesson-Regel ist beim nächsten Hinzufügen eines zweiten Konsumenten zu einem
bestehenden, dokumentierten Options-/Config-Interface relevant.
