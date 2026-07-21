## Codify-Report: Task 193

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` (Bekannte Stolpersteine) – **„Turbopack/Vercel: Node-Libs mit
  Laufzeit-`fs.readFileSync(__dirname + …)` externalisieren"**. Wegen des Fehler-Musters: ein
  Node-Paket (`pdfkit` via `pdfmake`), das Datendateien zur Laufzeit über `__dirname` lädt, bricht
  auf Vercel mit HTTP 500, weil Turbopack es ins Route-Bundle inlint und `__dirname` durch den
  toten Build-Sentinel `/ROOT/…` ersetzt. Fix: `serverExternalPackages` in `next.config.ts`.
  Enthält die Verifikations-Vorschrift (am gebauten `.next/server`-Chunk, nicht nur vitest) und
  den ausdrücklichen Hinweis, dass `outputFileTracingIncludes` allein **nicht** reicht.

### Muster-Analyse (Review + Security)
- **Review:** keine kritischen/wichtigen Findings; 2 optionale Nitpicks (Kosmetik im Root-Cause-
  Block – im `/refactor`-Schritt behoben; Bewusstsein, dass der Guard ein Config-Präsenz-Test ist –
  bewusst so). Kein wiederkehrendes Fehler-Muster.
- **Security:** PASSED, keine Findings. Der offene Dependabot-Alert #3 (`uuid`, medium) ist
  vorbestehend und unabhängig von diesem PR (Dependency-Hardening-Backlog, verwandt #169) – kein
  neues Issue (kein Duplikat), da nicht von diesem Diff aufgedeckt.

### Was gut funktioniert hat
- **Empirische Root-Cause-Analyse (#164 angewandt).** Die vom Issue vermutete Ursache wurde am
  gebauten Chunk widerlegt und die echte Ursache belegt (`/ROOT`-Sentinel, 17 → 0 tote Literale).
  Das verhinderte den naheliegenden Fehl-Fix (`outputFileTracingIncludes`), der den 500 nicht
  behoben hätte. Dieses Vorgehen ist die Grundlage der neuen Regel.

### Kein neuer Check-Skript
Ein automatisierter Guard gegen `/ROOT`-Sentinel-Pfade bräuchte einen vollen `next build` (in der
pre-push-/CI-Suite nicht hermetisch/zu langsam). Der vitest-Config-Guard `next.config.test.ts` +
`/post-merge-verify` decken die Regression ausreichend ab. Bewusst kein Over-Engineering (YAGNI).

### Empfehlung für nächste Features
- Beim Einführen einer neuen server-seitigen Lib, die Font-/Template-/Binär-Datendateien rendert
  (PDF, Bildverarbeitung, Charting, i18n/ICU): sofort prüfen, ob sie zur Laufzeit `__dirname`-Reads
  macht, und ggf. präventiv in `serverExternalPackages` aufnehmen – nicht erst nach einem
  Deploy-500. Verifikation am Build-Output einplanen.
