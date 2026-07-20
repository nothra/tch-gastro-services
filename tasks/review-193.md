# Review: Task 193

Diff-Scope (`git diff origin/main...HEAD`): `next.config.ts`, `next.config.test.ts`,
`tasks/task-193-pdf-abschlussbericht-download.md` — 3 Dateien, keine Fremd-PRs im Scope (#161).

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- Keine.

## Nitpicks (optional)
- [ ] `tasks/task-193-...md` (Abschnitt „Root Cause"): Der Root-Cause-Block ist als vier
  einzeln in Backticks gesetzte Zeilen formatiert. Das rendert als vier getrennte Inline-Code-
  Spans statt als ein zusammenhängender Block – rein kosmetisch. Kein Code-Impact.
- [ ] `next.config.test.ts`: Der Guard prüft die **Config-Präsenz** von `serverExternalPackages`,
  nicht das gebaute Bundle. Für diese Bug-Klasse bewusst so gewählt und dokumentiert (ein
  `.next/server`-Chunk-Test wäre in der vitest-Suite nicht hermetisch; das echte Laufzeitverhalten
  deckt `/post-merge-verify` ab). Akzeptabel; kein Handlungsbedarf in diesem PR.

## Positives
- **Empirische Root-Cause-Analyse statt Hypothese-Übernahme (#164).** Die vom Issue vermutete
  Ursache („`.afm` fehlt im File-Tracing") wurde am gebauten Chunk widerlegt und die echte Ursache
  (Turbopack ersetzt `__dirname` durch den toten Sentinel `/ROOT/…`) belegt (17 → 0 tote Literale
  nach dem Fix). Vorbildlich dokumentiert.
- **Minimaler, chirurgischer Fix** (eine Config-Zeile) ohne Scope-Creep.
- **Fix empirisch verifiziert** am Build-Output (pdfkit/pdfmake-JS extern im Route-Trace, `.afm`
  am echten node_modules-Pfad) – nicht nur „Test grün".
- Korrekt begründet, warum `outputFileTracingIncludes` allein **nicht** gereicht hätte.
- Guard-Test folgt den Namens-/Literal-Konventionen; Kommentare erklären das WHY.
- Blast-Radius geprüft: einziger pdfmake-Konsument ist die Node-Route `berichtPdf.ts`; pdfmake ist
  Prod-Dependency → zur Laufzeit auflösbar.

## Empfehlung
APPROVED
