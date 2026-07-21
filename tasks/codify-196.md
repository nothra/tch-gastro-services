## Codify-Report: Task 196

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`] **Verlustfreie Doku-Migration/Split: skriptbasiert +
  Byte-Reconstruction-Assertion** – wegen: Muster „großer Doku-Block wird verschoben/gesplittet, das
  AC ‚verlustfrei' ist aber nur behauptet". Regel: an stabilen Marken splitten + Reihenfolge-Map,
  Zielstücke gegen `git show origin/main:<datei>` auf **Byte-Gleichheit** rekonstruieren, Count-/
  Header-Set-Assertion, relative Links beim Ebenen-Wechsel re-basen, Prettier-Gate prüfen.
  + Index-Zeile in `PROJECT-CONTEXT.md` (Gruppe factory-workflow).

**Dogfooding der neuen Konvention (ADR-037):** Dies ist der erste `/codify`-Lauf unter der in
dieser Task etablierten Regel – das Learning wurde korrekt als **Volltext nach `lessons/`** +
**Index-Zeile** geschrieben, **nicht** in den @import-Volltext. Damit ist AC5 end-to-end validiert
(der gepatchte `codify.md`-Skill funktioniert wie beabsichtigt).

### Keine Änderungen nötig

- Review: 0 kritische / 0 wichtige Findings, 1 kosmetischer Nitpick (in `/refactor` behoben) →
  kein wiederkehrendes Fehlermuster, keine Regel nötig.
- Security: PASSED, keine Findings.
- Kein neuer Check/Gate: Der einzige „Regressions"-Risikopfad (Zuwachsen des @import-Pfads durch
  `/codify`) ist an der Quelle behoben (codify.md-Anpassung) – ein zusätzliches Gate wäre YAGNI
  (`token-efficiency.md`: „Kein Check-Skript aus Reflex").

### Beobachtung (kein Regel-Bedarf)

- Die `/codify`-Slash-Command-Prompt dieser Session zeigte noch den **Vor-Patch-Text** („… in
  PROJECT-CONTEXT.md ‚Bekannte Stolpersteine'"), während die **Datei auf Platte** bereits die neue
  Fassung trug (Command-Text wird bei Invocation gecaptured). Auflösung: der on-disk-Skill (neue
  Konvention) ist maßgeblich – entsprechend nach `lessons/` + Index geschrieben. Kein Fehler, nur
  ein Timing-Artefakt beim ersten Lauf direkt nach dem Skill-Patch.

### Empfehlung für nächste Features

- Die Reconstruction-Assertion-Technik ist für jede künftige „Datei aufteilen/verschieben"-Task
  wiederverwendbar (nicht nur Doku – auch Code-Modul-Splits: Original == Konkatenation der Teile).
- Wenn `lessons/` weiter wächst, bleibt der @import-Pfad schlank – genau das Ziel von ADR-037.
