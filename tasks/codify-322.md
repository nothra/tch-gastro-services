## Codify-Report: Task 322

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) „Zeilen-Gap-Assertion
  auf deterministischem Output: unbegründete Toleranz statt Ist-Wert" – wegen: die erste Fassung
  eines neuen Ordnungs-Tests (`rec_gap -ge 1 && -le 3`) erlaubte einen unbegründeten
  Toleranzbereich, wo der tatsächliche Abstand deterministisch exakt 1 ist; die Toleranz hätte
  eine Regression (zusätzliche Zeile zwischen Schritt 2 und Empfehlung) durchgewinkt. Gefunden im
  Review (Runde 2), noch in derselben Runde behoben (`-eq 1`).
- [`docs/factory/lessons/code-style.md`](../docs/factory/lessons/code-style.md) „TL;DR-Merksatz
  über einem umformulierten Absatz nicht mitgezogen" – wegen: beim Umformulieren des
  Detail-Absatzes in `git-workflow.md` → „Eine Task = Eine Session" blieb der kurze
  Zusammenfassungs-Bullet direkt darüber („je Task") bei der alten, jetzt widersprüchlichen
  Formulierung stehen – ein reiner Selbstwiderspruch innerhalb der in diesem PR neu verfassten
  Prosa, unabhängig von jeder externen Referenz. Gefunden im Review (Runde 3), noch in derselben
  Runde behoben.
- Index-Zeilen für beide Learnings in `docs/factory/PROJECT-CONTEXT.md` ergänzt (mit
  „Laden bei"-Trigger der jeweiligen Gruppe: `/test`/`/implement` bzw. `/refactor`/`/review`).

### Keine Änderungen nötig

- Das früh in dieser Session selbst passierte Schreibversehen (Edit-Tool-Aufruf gegen den
  Haupt-Baum statt den Worktree, sofort erkannt und reverted) ist bereits durch die bestehende
  Lesson „Write-Tool-Zielpfad im Worktree explizit gegen den Worktree-Suffix prüfen" (aus #240)
  abgedeckt – keine neue Regel nötig, die bestehende griff korrekt (nur die eigene
  Selbstüberprüfung kam einen Schritt zu spät).
- Keine Security-Findings (PASSED ohne Kritisch/Wichtig) – kein Anlass für einen neuen Check.
- Keine Out-of-Scope-Funde oberhalb der Issue-Schwelle (ADR-018/043) – die zwei Nitpicks aus dem
  Review (fehlendes `mktemp`-Aufräumen, gebündelte Assertion) liegen unterhalb der Schwelle
  (Test-Hygiene, entspricht bestehendem Datei-Stil) und wurden bewusst nicht in eine Sammeldatei
  ausgelagert, da sie keine eigenständige Handlung erfordern.

### Empfehlung für nächste Features

- Bei Doku-Abschnitten mit „Kurzbullet + Detail-Absatz"-Struktur: nach dem Umformulieren des
  Detail-Absatzes den ganzen Abschnitt (inkl. der Zeile(n) darüber) noch einmal am Stück lesen,
  nicht nur die geänderte Zeile.
- Bei neuen Zeilen-Positions-/Gap-Assertions in Bash-Tests: den Ist-Wert am realen Output messen
  und exakt prüfen, bevor ein Toleranzbereich als "sicherer" Standardweg gewählt wird.
