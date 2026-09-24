## Codify-Report: Task 346

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/db-drizzle.md`](../docs/factory/lessons/db-drizzle.md) – neue Lesson:
  „Wegwerf-E2E-Verifikation gegen den lokalen Dev-Server pollutiert dieselbe geteilte Dev-DB,
  gegen die DB-Integrationstests laufen" – wegen: die manuelle Playwright-Verifikation aus
  `/implement` legte reale, nicht `__test__`-präfixierte Kataloge/Artikel/eine Veranstaltung in
  der lokalen Dev-DB an und räumte sie nie auf; ein vorbestehender, unveränderter DB-Test aus
  #59 brach dadurch in `/test` (umgebungsbedingt, nicht durch den PR-Diff verursacht). Index-
  Zeile in `PROJECT-CONTEXT.md` mit „Laden bei"-Trigger (`/implement` bei Wegwerf-E2E-
  Verifikation, `/test` bei unerklärtem DB-Integrationstest-Fehlschlag) ergänzt.
- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md) –
  viertes Vorkommnis der Turn-Limit-Exhaustion-Lesson (#185/#264/#324) dokumentiert: trotz der
  in #348 auf 80 angehobenen Ceiling riss `/implement` erneut 3× das Limit, obwohl der erste
  Versuch bereits vollständig fertig war (Commit gepusht, Draft-PR vorhanden, Task-Datei
  komplett). Neu ergänzt: eine konkrete 4-Punkte-Verifikationscheckliste (`git status`,
  `git log`, `gh pr list`, Task-Datei), bevor ein gemeldetes Skill-Scheitern als real gilt, plus
  die Handlungsanweisung, bei bereits fertiger Arbeit Stage 2 manuell Skill für Skill
  fortzusetzen statt `run-pipeline.sh` blind neu ab Phase 1 zu starten (genau so in dieser Task
  gehandhabt). Issue #275 (Retry-Guard) bleibt die kanonische Behebung und ist weiterhin offen –
  kein neues Issue angelegt, nur die bestehende Lesson/Index-Zeile um die Wiederholung ergänzt.

### Keine Änderungen nötig

- Review (3 Runden) und Security-Review ergaben keine kritischen/wichtigen Findings – die
  `/implement`-Ausgabe selbst war sauber (geteilte Helper-Funktion `assertKatalogWaehlbar`
  statt Duplikation, guarded UPDATE korrekt mit `T | undefined` ausgewertet, IDOR-Schutz über
  Parent-Key, RBAC serverseitig durchgesetzt, ADR-050-Nachtrag deckungsgleich mit dem Code).
  Die Nitpicks aus dem Review (TOCTOU-Fenster, `inputClass`-Duplikation, `KatalogWechsel` vs.
  `StatusToggle`) sind bewusste YAGNI-/Scope-Entscheidungen, keine Lücken, die eine neue Regel
  bräuchten.
- Kein neuer Check in `scripts/checks/` nötig: das DB-Pollution-Muster ist an eine bewusste
  Handlungsentscheidung während der manuellen Verifikation gebunden (welchen Namen/welches
  Präfix wählt der Skill-Agent), kein automatisierbares Gate-Muster wie z. B. ein
  Datei-Content-Scan.

### Empfehlung für nächste Features

- Bei jeder Wegwerf-E2E-Verifikation, die einen zweiten, absichtlich vom Standard
  abweichenden Datensatz braucht (hier: ein zweiter Katalog zum Beweis von AK2), den Namen
  entweder mit `__test__` präfixieren oder direkt im selben Schritt eine Aufräum-Notiz +
  tatsächliches Löschen einplanen – nicht erst `/test` das aufdecken lassen.
- Reißt `/implement` (oder ein anderer code-schreibender Skill) erneut das Turn-Limit: vor dem
  Neustart der gesamten Pipeline erst die 4-Punkte-Checkliste aus der Lesson durchgehen. Meist
  ist die Arbeit bereits fertig, und Stage 2 manuell fortzusetzen ist schneller und risikoärmer
  als ein erneuter automatisierter `/implement`-Lauf.
