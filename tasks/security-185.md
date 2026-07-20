# Security Review: Task 185

Scope: `git diff origin/main...HEAD` – Abschlussbericht (Excel/PDF) als GET-Route-Handler
(`app/api/veranstaltung/[id]/bericht/route.ts`) + reine Renderer (`berichtModell.ts`,
`berichtXlsx.ts`, `berichtPdf.ts`, `berichtDateiname.ts`), Detailseiten-Links, neue Deps
(`exceljs`, `pdfmake`, `@types/pdfmake`). Prüfkatalog: OWASP Top 10 + Basics.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] **[Dependency] `uuid <11.1.1` (moderate, GHSA-w5hq-g745-h8pq) transitiv über `exceljs>uuid` – im Bericht-Kontext nicht ausnutzbar.** `pnpm audit` meldet 1 moderate: uuid@8.3.2 (`node_modules/.pnpm/uuid@8.3.2`). Der Advisory betrifft **v3/v5/v6, wenn ein `buf`-Argument übergeben wird** (fehlende Bounds-Prüfung). exceljs ruft aber nur `uuidv4()` **ohne** `buf` auf (`node_modules/exceljs/lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js:1,43,77`), und zwar nur im Conditional-Formatting-Ext-Pfad, den der Bericht-Renderer gar nicht nutzt. → **Kein realer Angriffsvektor.** Optionale Härtung (Dependabot-/Audit-Ruhe): konditionalen Override `"uuid@<11.1.1": ">=11.1.1"` in `pnpm-workspace.yaml` ergänzen (Codify #167), mit `pnpm why uuid` verifizieren. Nicht zwingend für diesen PR.
- [ ] **[Injection] Excel-Formula-Injection – durch xlsx-String-Typ mitigiert, aber ohne aktive Neutralisierung führender `= + - @` (Defense-in-Depth).** Nutzerkontrollierte Strings (`modell.kopf.bezeichnung` `berichtXlsx.ts:57`; `teilnehmer.anzeigename` `:91`; `auslage.anzeigename` `:116`) werden als **reine Zell-Strings** gesetzt (`sheet.addRow([...])`), nie als `{ formula: … }`. exceljs schreibt sie als Cell-Type `string`; Excel/LibreOffice werten sie beim Öffnen **nicht** als Formel aus (der DDE-/Formula-Injection-Vektor greift bei echtem `.xlsx` nicht, anders als bei CSV). `anzeigename` ist teils über die öffentliche Theken-Selbstbedienung (F7/QR) beeinflussbar – Risiko dennoch niedrig. Optional: bei Zell-Strings, die mit `= + - @ \t \r` beginnen, ein führendes `'` voranstellen. Kein Blocker.
- [ ] **[AuthZ/IDOR] Zugriff nur per Rolle `veranstalter`, keine Pro-Nutzer-Eigentümerbindung an die Veranstaltung – konsistent mit der Baseline, kein Regress.** Der Handler autorisiert über `hasRole(session?.user?.roles, "veranstalter")` (`route.ts:34`) und lädt dann per Pfad-`id` (`route.ts:43`), ohne zu prüfen, welchem Veranstalter die Veranstaltung „gehört". Damit kann **jeder** Veranstalter den Finanzbericht **jeder** Veranstaltung ziehen. Das ist exakt das bestehende Autorisierungsmodell der Detailseite (`app/veranstaltung/[id]/page.tsx:25`) und der Actions – ein kleiner Vereinsclub mit geteilter Owner-Rolle (PROJECT-CONTEXT/ADR-024). Diese Task führt keine neue Schwäche ein; falls künftig Mandantentrennung nötig wird, ist das ein eigenes, projektweites Thema (out-of-scope).

## Geprüft und in Ordnung
- **Content-Disposition-/CRLF-/Path-Traversal-Injection:** Der `filename` (`route.ts:95`) stammt aus `berichtDateiname` (`berichtDateiname.ts:38`). Der Slug ist per `.replace(/[^a-z0-9]+/g, "-")` (`:24`) auf `[a-z0-9-]` reduziert, das Datum ist ISO `YYYY-MM-DD`, das Format whitelist-validiert (`xlsx`/`pdf`). CRLF, Anführungszeichen, `/`, `..`, Unicode-Tricks sind konstruktionsbedingt ausgeschlossen. Sicher.
- **Format-Whitelist fail-closed:** `parseFormat` (`route.ts:25`) akzeptiert nur `xlsx`/`pdf`, sonst `null` → `400` (`:39`). Fehlender Parameter ebenfalls `400`.
- **RBAC-Reihenfolge fail-closed:** Rolle (`403`) → Format (`400`) → `getVeranstaltung` (`404`) → Status ≠ `abgeschlossen` (`409`) → Modell → Render (`route.ts:33-88`). Offene Veranstaltung wird abgelehnt (kein Datei-Leak), unbekannte ID → 404. Entspricht ADR-036 D4.
- **Proxy-Schutz intakt:** Der `proxy.ts`-Matcher nimmt nur `api/auth|api/version|api/health|theke/` + Assets aus – `api/veranstaltung/**` bleibt authentifiziert (keine neue Ausnahme, Codify #63).
- **pdfmake URL-/Local-Access fail-closed:** `setUrlAccessPolicy(() => false)` (`berichtPdf.ts:37`) sperrt **jeden** externen URL-Zugriff (kein SSRF). `setLocalAccessPolicy((path) => ERLAUBTE_FONT_DATEIEN.has(path))` (`:38`) erlaubt ausschließlich die 4 eingebauten Helvetica-Namen (`:28-34`), jeder echte Dateipfad wird abgelehnt (kein LFI). Kein VFS/Font-Download. Fail-closed bestätigt.
- **SQL-Injection:** `getVeranstaltung`/`listZeilen`/`listPositionen`/`listAuslagen` nutzen Drizzle mit parametrisiertem `eq(veranstaltung.id, id)` (`db/veranstaltung.ts:39`) – keine String-Konkatenation. Sicher.
- **Runtime + Error-Handling:** `export const runtime = "nodejs"` gesetzt (`route.ts:17`). Fehlermeldungen sind generische deutsche Klartexte ohne Stacktrace/interne Details. Kein Secret im Code. Renderer enthalten kein `eval`/`Function`/`child_process`.
- **Info Disclosure:** Werte stammen ausschließlich aus dem geprüften `berichtModell` (Single Source); keine sensiblen internen IDs im Bericht über die fachlich erwarteten Anzeigedaten hinaus.

## Ergebnis
PASSED
