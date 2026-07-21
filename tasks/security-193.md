# Security Review: Task 193

Diff-Scope (`git diff origin/main...HEAD`): `next.config.ts`, `next.config.test.ts`,
`tasks/task-193-pdf-abschlussbericht-download.md`.

## Kritische Findings (Blocker)
- Keine.

## Wichtige Findings
- Keine.

## Hinweise
- [ ] **Dependencies (out of scope, vorbestehend):** Ein offener Dependabot-Alert (#3, `uuid`,
  medium) besteht bereits auf `origin/main` und wird **nicht** von diesem PR eingeführt oder
  berührt (transitiv, unabhängig von pdfmake/pdfkit). Gehört in die laufende Dependency-Hardening-
  Linie (verwandt #169), nicht in diesen Fix. Kein neues Issue angelegt (kein Duplikat), da nicht
  von diesem Diff aufgedeckt.

## Analyse (Prüfkatalog)
- **Input/Injection:** Keine User-Inputs berührt. Der Fix ist reine Build-Config
  (`serverExternalPackages`). Kein SQL/Command/XSS/JSON-Injection-Bezug. N/A.
- **Auth/Autorisierung (IDOR/BOLA):** Unverändert. Die RBAC-Prüfung der Route
  (`hasRole(session?.user?.roles, "veranstalter")`, fail-closed vor DB-Zugriff) und die
  Objekt-Bindung sind nicht angefasst.
- **Secrets/Krypto:** Keine Secrets/Keys eingeführt; kein `Math.random()`; kein Kryptobezug.
- **Dependencies:** Keine neue Dependency. pdfmake war bereits Prod-Dependency; der Fix ändert nur
  dessen Bundling (extern statt inlined). Keine zusätzliche Angriffsfläche.
- **Error Handling / Info-Leak:** Der Fix **behebt** einen unbehandelten 500 (pdfkit-ENOENT).
  Next.js verbirgt Stacktraces in Production; die Route liefert generische JSON-Fehlermeldungen,
  keine internen Details. Der Fix verbessert die Robustheit, ohne Info-Leak zu schaffen.
- **Font-Access-Policies (nicht geändert, bestätigt intakt):** `berichtPdf.ts` setzt weiterhin
  `setUrlAccessPolicy(() => false)` und eine Whitelist-`setLocalAccessPolicy` (fail-closed gegen
  externe URL-/beliebige Datei-Zugriffe beim Rendern). Die Externalisierung untergräbt diese
  Laufzeit-Policies nicht.

## Ergebnis
PASSED
