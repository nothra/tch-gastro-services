## Codify-Report: Task 189

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/build-tooling.md`](../docs/factory/lessons/build-tooling.md) – Verschachtelte
  alte `@types/node`-Kopie (via `fast-csv`, einer `exceljs`-Dependency) kollidiert mit dem
  generischen `Buffer`-Typ ab TS≥5.7, sobald ein Buffer-Wert an eine exceljs-API wie
  `workbook.xlsx.load()` übergeben wird. Regel: Cast über die Ziel-Funktionssignatur
  (`Parameters<typeof workbook.xlsx.load>[0]`), nicht `as unknown as Buffer` (trifft dieselbe
  kaputte globale Merge) – wegen: kostete während `/implement` mehrere Recherche-Schritte, um die
  Ursache zu isolieren (Verwechslungsgefahr mit einem echten Typfehler).
- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – Row/Cell-Index-
  Assertions gegen einen gerenderten Report (Excel/PDF-Renderer-Round-Trip-Tests) sind beim
  Schreiben Magic Numbers und brauchen sofort eine WHY-Herleitung (benannte Konstante +
  Zeilen-Arithmetik-Kommentar) – wegen: Review-Runde 1 musste genau das als „Wichtig"-Finding
  nachträglich einfordern, obwohl `clean-code.md` „keine Magic Numbers" bereits allgemein verlangt;
  die Test-schreibende Session hat den Renderer-Test-spezifischen Fall nicht proaktiv erkannt.
- Je eine **Index-Zeile** mit „Laden bei"-Trigger in `docs/factory/PROJECT-CONTEXT.md` unter den
  bestehenden Gruppen `lessons/build-tooling.md` und `lessons/testing.md` ergänzt (ADR-037-konform,
  kein neuer @import-Volltext).

### Keine Änderungen nötig

- Der pnpm-Override-Pattern (`uuid@<11.1.1`) folgte exakt der bereits aus #167 kodifizierten Regel
  (`pnpm-workspace.yaml`, konditionale Form, Kommentar mit GHSA-ID) – keine neue Lesson nötig, die
  bestehende Regel wurde korrekt angewendet und durch `pnpm why`/`pnpm audit` verifiziert.
- Die zwei Review-Runde-1-Findings zur Testqualität (Magic-Number-Zeilen, duplizierter
  Buffer-Load-Cast) sind bereits als generische Regeln in `clean-code.md`/`testing-standards.md`
  abgedeckt (Magic Numbers, Duplikation) – hier nur die Renderer-Test-spezifische Verschärfung als
  neue Lesson ergänzt (siehe oben), keine Änderung an den generischen Guidelines nötig.
- Security-Review-Prozess (Out-of-Scope-Finding → eigenes Issue via `create_issue_idempotent`) hat
  wie dokumentiert funktioniert (Issue #228 für die vorbestehenden next-auth/@auth/core-CVEs) –
  keine Prozessänderung nötig.
- Requirements/Spec (`spec-189`) waren vollständig und präzise – keine Lücken, keine Rückfragen
  während `/implement` nötig.

### Empfehlung für nächste Features

- Beim Schreiben eines Tests, der einen Datei-Renderer (Excel/PDF/CSV) über die Datei-Format-API
  zurückliest (statt nur Buffer-Länge/Magic-Bytes zu prüfen), die neue `testing.md`-Lesson zu
  Row/Cell-Index-Assertions direkt beim ersten Entwurf anwenden – spart eine Review-Runde.
- Bei einem ähnlichen `Buffer`-Typkonflikt mit einer anderen exceljs-/Node-Bibliothek zuerst in
  `build-tooling.md` nachsehen, bevor erneut recherchiert wird.
