# Security Review: Task 391

Diff-Scope: `git diff origin/main...HEAD` (34 Dateien). Reine UI-Umordnung: Teilen, Einstellungen
und Löschen wandern als Symbol-Schaltflächen in den Seitenkopf der Detailseite. Keine Änderung
an Server Actions, Data-Layer, `proxy.ts`, Routen oder Abhängigkeiten.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
_Keine offenen._ Geprüft und unauffällig:

- [x] **Autorisierung unverändert (FS1):** `app/veranstaltung/actions.ts` ist nicht im Diff. Die drei
  Schreibwege hinter den Kopfaktionen (`setVeranstaltungCatalogAction`,
  `updateVeranstaltungMetaAction`, `deleteVeranstaltungAction`) prüfen weiter serverseitig
  `requireRole("veranstalter")` und den Status. Das Ausblenden der Kopfaktionen bei
  abgeschlossener Veranstaltung/Theke ist reine UI; die Actions bleiben die Grenze.
- [x] **Selbstbedienungs-Token:** `ZugangTeilen` liefert den Token wie bisher nur auf der
  Veranstalter-Detailseite aus. Er wechselt nur die Client-Hülle (`ZugangDialog` → `KopfDialog`),
  wird nicht breiter sichtbar. `qrcode` bleibt server-seitig, kein Client-Bundle (ADR-053 D5).
- [x] **XSS:** `bezeichnung` landet als Text in `ConfirmDialog.description` und als Feldwert. React
  escaped beides, kein `dangerouslySetInnerHTML` neu. Die Symbole sind statische Inline-SVGs ohne
  Fremdeingabe.
- [x] **Löschen-Bestätigung:** Der Hard-Delete bleibt hinter einem Pflicht-Bestätigungsdialog.
  `ConfirmDialog` sperrt Schaltflächen und Escape, solange die Action läuft. Der `key` je Öffnen
  verhindert, dass eine frühere Ablehnung stehen bleibt.
- [x] **Abhängigkeiten:** keine neuen, `package.json`/`pnpm-lock.yaml` sind unverändert. Die
  Lucide-Pfade sind kopiert und tragen den ISC-Lizenzhinweis.
- [x] **Secrets/Artefakte:** keine Credentials im Diff; E2E-Passwörter sind unveränderte
  Kontextzeilen. Screenshot `07-zugang-teilen.png` zeigt einen `localhost`-Link/QR aus einer
  danach gelöschten Wegwerf-DB, also keinen gültigen Produktions-Token.
- [x] **Fehlermeldungen:** Es werden unverändert nur die fachlichen `state.error`-Texte der Actions
  angezeigt, keine Stack Traces.

## Ergebnis
PASSED
