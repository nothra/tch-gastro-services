# Task 193: pdf-abschlussbericht-download

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Bug (#193): PDF-Download des Abschlussberichts einer abgeschlossenen Veranstaltung
schlägt in der **deployten** Umgebung fehl (Safari: leere Seite, Edge: HTTP 500).
Das Excel-Format (`?format=xlsx`) funktioniert. Lokal/CI grün, Fehler nur auf Vercel.

- Route: `app/api/veranstaltung/[id]/bericht/route.ts` (GET, `?format=pdf`, Node-Runtime)
- Renderer: `app/veranstaltung/berichtPdf.ts` (`pdfmake` → `pdfkit`)

## Akzeptanzkriterien
- [x] GIVEN abgeschlossene Veranstaltung WHEN „PDF herunterladen" THEN wird der Bericht als
  `application/pdf`-Download ausgeliefert (kein 500, keine leere Seite) – auch im gebündelten
  Serverless-Output, nicht nur im lokalen vitest-Lauf.
- [x] Regressions-Guard, der RED ist, solange pdfmake nicht aus dem Server-Bundle externalisiert
  ist, und GREEN nach dem Fix.

## Technische Notizen

### Reproduktion (empirisch, Build-Ebene)
Der Fehler ist ein **Bundling-Defekt** – kein Quell-Unit-Test kann ihn zeigen, weil vitest die
Renderer-Quelle direkt lädt (echtes `__dirname`). Reproduktion über den echten Serverless-Output:

```
pnpm build
# Chunk mit inlinetem pdfkit:
grep -o '/ROOT/node_modules[^"]*\.afm' .next/server/chunks/*.js   # → 17 tote Literal-Pfade
test -e /ROOT   # → existiert NICHT
```

Turbopack kompiliert `fs.readFileSync(__dirname + "/data/Helvetica.afm")` zu
`readFileSync("/ROOT/node_modules/.pnpm/pdfkit@0.19.1/.../data/Helvetica.afm", "utf8")` –
`__dirname` verschwindet (0 Treffer im Chunk), ersetzt durch den Build-Sentinel `/ROOT`.
Zur Laufzeit auf Vercel existiert `/ROOT` nicht → **ENOENT beim ersten Font-Zugriff → 500**.
Excel funktioniert, weil exceljs keine `__dirname`-basierten Datei-Reads zur Laufzeit macht.

Ausgeschlossene Hypothese (Issue): „`.afm` fehlt im File-Tracing". Falsch – der Trace **enthielt**
die `.afm`-Dateien bereits vor dem Fix; das Problem war der **falsche Pfad** im gebündelten Code,
nicht eine fehlende Datei. `outputFileTracingIncludes` allein hätte den Bug NICHT behoben.

### Root Cause
`Root Cause [2026-07-21]: next.config.ts (fehlende serverExternalPackages) → Turbopack inlint`
`pdfkit in den Route-Chunk und ersetzt dessen Laufzeit-\`__dirname\` durch den nicht existenten`
`Build-Sentinel \`/ROOT/...\`; pdfkits \`fs.readFileSync(__dirname + "/data/*.afm")\` (Standard-`
`Font-Metriken) läuft dadurch auf Vercel in ENOENT → HTTP 500.`

### Fix (minimal, chirurgisch)
`next.config.ts`: `serverExternalPackages: ["pdfmake"]`. Damit bündelt Turbopack pdfmake/pdfkit
nicht mehr, sondern lädt sie zur Laufzeit aus `node_modules` (korrektes `__dirname`); das
File-Tracing (@vercel/nft) zieht die `.afm`-Dateien an ihren echten Pfad.

### Verifikation (Build nach Fix)
- Tote `/ROOT/...afm`-Literale im Server-Bundle: **0** (vorher 17).
- pdfkit-/pdfmake-**JS** erscheinen jetzt im Route-Trace (`pdfkit/js/pdfkit.js`, `pdfmake/js/*.js`)
  → extern aus `node_modules`, `__dirname` korrekt.
- `.afm` weiterhin im Trace am echten `node_modules`-Pfad.
- Reproduktions-Test `next.config.test.ts`: RED ohne Fix, GREEN mit Fix.
- Volle Suite grün (605 Tests), Typecheck + Format grün.

> Deployment-Nachweis: lokal ist der 500 im gebündelten `pnpm start`-Output reproduzierbar; der
> echte Vercel-Beweis folgt über `/post-merge-verify` (INT/PROD-Smoke) nach dem Merge.

## Offene Fragen
_Keine._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
- **Muster (Bug-Ursache):** Ein Node-Paket, das Datendateien zur Laufzeit über
  `fs.readFileSync(__dirname + "…")` lädt (pdfkit-AFM-Fonts, aber auch Templates/WASM/ICU-Daten
  anderer Libs), bricht auf Vercel, wenn Turbopack es ins Route-Bundle inlint: `__dirname` wird
  zum toten Sentinel `/ROOT/…`. Symptom: CI/vitest grün (Quelle direkt geladen), 500 nur deployed.
  **Regel-Kandidat:** Solche Pakete grundsätzlich per `serverExternalPackages` externalisieren;
  `outputFileTracingIncludes` allein genügt NICHT (liefert die Datei, korrigiert aber nicht den
  falschen Pfad). Verifikation immer gegen den **gebauten** `.next/server`-Chunk, nicht nur
  vitest – verwandt mit #164 (empirisch statt der gemeldeten Ursache glauben).

---
Branch: `fix/193-pdf-abschlussbericht-download`
Erstellt: 2026-07-21 00:26
