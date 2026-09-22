## Codify-Report: Task 345

### Neue Regeln hinzugefügt

- **[`docs/factory/lessons/db-drizzle.md`]** Neue Mehrfach-Write-Data-Layer-Funktion muss
  `runAtomic` (`db/atomic.ts`) statt `db.transaction()` direkt nutzen – wegen: `duplicateCatalog`
  rief `db.transaction()` direkt auf, was lokal/CI (node-postgres) grün blieb, aber in INT/PRD
  (Neon-HTTP-Treiber, unterstützt keine interaktive `.transaction()`) bei jedem Aufruf
  fehlgeschlagen wäre. Nur der dedizierte Architektur-Review-Fokus in Runde 2 fand das, nicht
  Runde 1 und nicht der Logik-Fokus in Runde 2. Index-Zeile in `PROJECT-CONTEXT.md` ergänzt
  (Trigger: `/implement`, `/review` (Architektur-Fokus) – bei neuer Mehrfach-Write-Funktion in
  `db/`).
- **[`docs/factory/lessons/db-drizzle.md`]** Ein Feld, das von „serverseitig fix" auf „aus
  `FormData` gelesen" wechselt und weiterhin als FK-Bezug dient, öffnet neue DB-Fehlerklassen, die
  der bestehende Error-Translation-Wrapper nicht kennt – wegen: `catalogId` wurde mit #345 erstmals
  aus einem Client-Hidden-Field gelesen; `runWithUniqueCheck` fängt nur `23505`
  (Unique-Violation), eine ungültige `catalogId` löst beim Insert eine ungefangene
  FK-Violation (`23503`) aus (Security-Review-Hinweis, Issue #353).
- **[`docs/factory/lessons/factory-workflow.md`]** Ein als „separat geflaggt"/„Hinweis-Ebene"
  markierter Out-of-Scope-Fund muss im selben Schritt kanonisch verankert werden (Issue oder
  `kleinfunde.md`), nicht nur als Session-Notiz/Vormerkung stehen bleiben – wegen: in dieser Session
  mussten Issues #351/#353 sowie ein `kleinfunde.md`-Eintrag nachträglich von der
  orchestrierenden Ebene angelegt werden, statt im selben Werkzeugaufruf-Block wie das Flaggen zu
  entstehen. Index-Zeile in `PROJECT-CONTEXT.md` ergänzt (Trigger: `/review`, `/security-review`,
  `/test`, `/refactor`, `/codify` – sobald ein Report „separat geflaggt"/„Hinweis-Ebene"/„außerhalb
  des Scopes" verwendet).
- **[`docs/factory/agents/review-agent.md`]** Perspektive 3 („Architektur & Konsistenz") um einen
  expliziten Checklistenpunkt „Treiber-/Infrastruktur-Kompatibilität" ergänzt – wegen: der
  bestehende Katalog („Schicht-Grenzen, ADR, Konsistenz, Abhängigkeiten") deckte diesen konkreten
  Bug-Typ nicht namentlich ab; der Fund in Runde 2 entstand aus der Sorgfalt des Reviewers, nicht
  aus einer Vorgabe der Persona-Doku. Das Muster – ein dedizierter Architektur-Fokus mit
  Treiber-/Infrastruktur-Kenntnis findet Bugs, die ein reiner Logik-/Pattern-Fokus übersieht – ist
  damit jetzt auch strukturell in der Checkliste verankert, nicht nur einmalig demonstriert.
- **[`docs/factory/kleinfunde.md`]** Zwei bisher unverankerte Nitpicks aus Review-Runde 1
  nachgetragen (waren am Ende der Task weder als Issue noch als `kleinfunde.md`-Eintrag
  auffindbar): TOCTOU-Lücke zwischen Quell-Katalog-Prüfung und `duplicateCatalog`-Aufruf
  (`app/verwaltung/katalog/actions.ts:203-210`) und die fehlende Doku, dass der
  Testdaten-Präfix `__test__` in drei Filterwegen identisch bleiben muss
  (`db/catalog.test.ts:33`). Ein dritter Nitpick (Kommentar zu `setCatalogItemActiveAction`,
  ursprünglich Review-Runde 1) ist bereits durch den vorhandenen Code-Kommentar (Zeilen 116-118)
  faktisch erledigt – kein Nachtrag nötig.

### Keine Änderungen nötig

- **Sandbox-Blockade `. scripts/lib/create-issue.sh` für Sub-Agenten:** Bereits durch die
  bestehende Lesson „„Nicht allow-gelistet" ist kein Umgebungs-Blocker, solange der
  Wrapper-Skript-Weg ungeprüft ist" (`factory-workflow.md`, aus #291) abgedeckt. Die Regel ist
  generisch als „Agent" formuliert (nicht auf den Hauptorchestrator beschränkt) und der
  Workaround (`scripts/*.tmp.sh`-Wrapper) ist bereits dokumentiert – kein neuer Eintrag nötig, nur
  Anwendung der bestehenden Regel.
- **Bekannte Kern-Kurzregeln (IDOR, Soft-Delete, `.returning()`-Typ, Zod-Obergrenzen):** Alle in
  #345 korrekt eingehalten (siehe Security-Review „IDOR-Lessons gegengeprüft" und
  Review-Positives) – kein neues Learning, die bestehenden Regeln haben wie vorgesehen
  funktioniert.
- **Empirische Treiber-Verifikation vor einer Kritisch-Einstufung:** Der Architektur-Reviewer
  verifizierte in Runde 3 seinen eigenen Fix empirisch gegen den installierten Treiber-Code
  (`node_modules/`) statt sich auf Kommentare zu verlassen – das ist exakt die bereits bestehende
  Regel „Review-Sub-Agent kann eine falsche Bash-/Shell-Verhaltensbehauptung als „empirisch
  geprüft" ausgeben" (`factory-workflow.md`, aus #314) korrekt angewendet, keine neue Lesson.
- **Issues #351/#353:** Beide bereits korrekt über den zentralen Anlage-Weg (ADR-018) mit
  passenden Labels (`bug`+`test` bzw. `bug`) angelegt und offen – kein Duplikat, keine weitere
  Aktion nötig.

### Empfehlung für nächste Features

- Bei jeder neuen Mehrfach-Write-Funktion in `db/` (INSERT/UPDATE/DELETE über mehr als eine Zeile
  in einer Operation) in `/implement` bereits proaktiv `runAtomic` statt `db.transaction()`
  verwenden, statt auf den Architektur-Review-Fund in einer späteren Runde zu warten – die neue
  Lesson + der ergänzte Review-Checklistenpunkt sollten das jetzt in Runde 1 abfangen.
- Wechselt ein Feld von serverseitig-fix auf client-gelesen (auch wenn korrekt als Parent-Key
  gebunden), im selben PR kurz prüfen, welche neuen DB-Fehlerklassen dadurch erreichbar werden –
  nicht erst in der Security-Review.
- Beim Flaggen eines Out-of-Scope-Funds als „separat geflaggt" im selben Werkzeugaufruf-Block
  direkt klassifizieren und anlegen (Issue oder `kleinfunde.md`), nicht als spätere
  Orchestrator-Aufgabe vormerken.
