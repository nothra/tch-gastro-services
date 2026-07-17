## Codify-Report: Task 135

### Neue Regeln hinzugefügt
_Keine._

### Keine Änderungen nötig
`tasks/review-135.md` (APPROVED) und `tasks/security-135.md` (PASSED) enthalten **keine**
kritischen oder wichtigen Findings – nur optionale Nitpicks, die von den Reviewern selbst
explizit als "kein Handlungsbedarf" eingestuft wurden:

- Guard behandelt eine auf `menge=0` dekrementierte Position eines inaktiven Artikels als
  "bestehend" (`getPosition` liefert sie weiter) – spec-konform (AC5/FS1 sprechen von "noch
  keine Position"), in der UI nicht erreichbar (ADR-026 D3).
- Test `should_countInactivePositionInSum` prüft den Betrag über den aggregierten
  Zeilen-Header statt über den "Nicht mehr im Katalog"-Abschnitt selbst – eindeutig, aber indirekt.

Beide sind bewusste Design-/Test-Entscheidungen, kein Fehler-Muster. Bemerkenswert: Die
Security-Review bestätigt explizit, dass mehrere bestehende Codify-Regeln hier bereits
gegriffen haben, ohne dass ein neuer Fund nötig war – **#51** (IDOR: Parent-Key vor
`getPosition` bereits über `getZeile(zeileId, veranstaltungId)` gebunden), **#50**
(`getPosition` deklariert korrekt `Promise<T | undefined>`), **#52** (keine
`@/app/<feature>`-Imports in `app/_verzehr/`), **#116/#117** (je AC-Kriterium eine eigene,
literalbasierte Assertion). Kein neues Pattern – die vorhandenen Regeln haben genau das
verhindert, wofür sie gedacht waren.

### Empfehlung für nächste Features
- **Sonnet-5-Experiment für `/implement`** (`factory.config.yml`, `model_tiers.light` →
  `claude-sonnet-5`, `skills.implement.tier: light` statt `heavy`/Opus 4.8, Commit `4104454`):
  Für diesen eng spezifizierten, klein geschnittenen Fix (3 Produktionsdateien, keine
  Migration, ADR-026 vorab abgeschlossen) lief die Implementierung sauber durch – 0 kritische/
  wichtige Findings in Review **und** Security-Review, nur ein regulärer `/refactor`-Schritt
  (Duplikat-Extraktion `PositionZeile`). Laut `@tradeoff`-Kommentar in `factory.config.yml`
  ist das Ergebnis über weitere ähnlich klein geschnittene Tasks zu beobachten, bevor über eine
  projektweite Umstellung entschieden wird – noch keine Regel, da Stichprobengröße 1.
- Die beiden Nitpicks oben sind für spätere Spec-Erweiterungen im Hinterkopf zu behalten (z. B.
  falls eine zukünftige Task `menge=0`-Positionen explizit aus `getPosition` ausblenden soll –
  das wäre laut Review eine bewusste Scope-Erweiterung gegenüber spec-135, kein Bugfix).
