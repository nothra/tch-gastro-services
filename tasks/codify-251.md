## Codify-Report: Task 251

### Neue Regeln hinzugefügt

- **[`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md)** – Ergänzung zum
  bestehenden #240-Learning ("Neue Regressions-Assertion-Schleife gegen bereits vorhandene
  Schleife mit identischem Rumpf abgleichen"): Rezidiv-Fall aus #251 dokumentiert. `/implement`
  legte trotz vorhandener Lesson und sichtbarem Merge-Präzedenzfall im selben File erneut eine
  rumpfidentische Duplikat-Schleife an – ausgelöst durch mehrdeutigen Spec-Wortlaut
  (`spec-251` bot „Werteliste ergänzen **oder** neue Schleife daneben platzieren" als scheinbar
  gleichwertige Alternative an, obwohl die Lesson Letzteres bereits verbietet). Neue Regel:
  Bei Widerspruch zwischen Spec-Wortlaut und einer bestehenden Lesson gilt der Lesson-Text; die
  Rechtfertigung „andere Eintragsgruppe/-liste" ist nie hinreichend für eine zweite,
  prüfausdrucksidentische Schleife. – wegen: Review-Runde-1-Kritisch-Finding (behoben).
- **[`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)**
  – Neuer Eintrag: „Fix zwischen zwei `/review`-Runden sofort committen, nicht erst nach der
  letzten Runde". Ein zwischen Review-Runde 2 und Runde 3 angewendeter Fix blieb unkommittiert;
  Runde 3 bezog ihren Kontext über `git diff origin/main...HEAD` (sieht nur Commits, keinen
  Working-Tree-Stand) und hätte den bereits gelösten Fund fälschlich erneut als offen melden
  können – bemerkte die Diskrepanz nur durch zusätzliche eigene Verifikation. Neue Regel: Fixes
  zwischen Runden einer laufenden Multi-Agenten-Kette sofort über `factory-commit.sh`
  committen/pushen, nicht bündeln. – wegen: Review-Runde-3-Wichtig-Finding (behoben).
- **[`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md)** – zwei neue
  Index-Zeilen mit „Laden bei"-Trigger für die beiden obigen Lessons ergänzt (Gruppen
  `lessons/testing.md` bzw. `lessons/factory-workflow.md`).

### Keine Änderungen nötig

- Kein neuer automatisierbarer Check nötig: Das Duplikat-Muster ist bereits durch die
  bestehende (jetzt geschärfte) Lesson und durch `/review` als menschliche/Agenten-Prüfung
  abgedeckt; ein automatisiertes Duplikat-Rumpf-Gate für Bash-Testschleifen wäre für diesen
  einen Rezidiv-Fall Overengineering.
- Keine Änderung an `spec-251-edit-allow-regressionstest.md` selbst: Die Spec ist ein
  abgeschlossenes historisches Artefakt dieser Task; die Lehre wirkt für **künftige** Specs
  über die neue Lesson-Ergänzung, nicht durch rückwirkendes Umschreiben.
- Security-Review lieferte PASSED ohne Findings – keine sicherheitsbezogene Regel abzuleiten.

### Empfehlung für nächste Features

- Beim Schreiben von Akzeptanzkriterien, die sich explizit auf ein bekanntes Duplikat-/
  Muster-Learning beziehen (z. B. „kein struktureller Duplikat-Rumpf"), den AK-Wortlaut direkt
  gegen den Lesson-Text abgleichen, bevor die Spec finalisiert wird – keine „oder"-Alternative
  formulieren, die das Verbot der Lesson wieder aufweicht.
- Bei mehrstufigen `/review`-Läufen mit Zwischen-Fixes: Fix committen, bevor die nächste
  Runde/der nächste Sub-Agent gestartet wird, damit `git diff origin/main...HEAD` in jeder
  Runde den aktuellen Stand zeigt.
