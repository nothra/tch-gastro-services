# Security Review: Task 324

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] [Error Handling] `app/api/veranstaltung/[id]/bericht/route.ts` hat für beide Umfänge (`voll`/`getraenke`) weiterhin keinen `try/catch` um `rendere(...)` (Zeile 127) bzw. um die DB-Aufrufe (Zeilen 93–97). Ein Rendering-Fehler (z. B. `exceljs`/`pdfmake`) würde ungefangen durchschlagen. Das ist **kein neues Risiko dieses Diffs** – der bestehende vollständige Bericht (#185) hat exakt dasselbe Verhalten, und Next.js gibt bei einem ungefangenen Fehler in Produktion ohnehin nur eine generische 500-Antwort ohne Stacktrace zurück (kein Custom-Error-Handler, der Details herausreicht). Nur als Beobachtung dokumentiert, kein Fix erforderlich für dieses Feature.

## Analyse je Prüfpunkt

**1. Input-Validierung & Injection** – Sicher. `parseUmfang` (`route.ts:41-44`) ist eine strikte Whitelist (`null → "voll"`, `"voll"`/`"getraenke"` durchgelassen, alles andere → `null` → HTTP 400 in `route.ts:78-80`, generische Fehlermeldung ohne Details). Der bereits validierte, eng typisierte `BerichtUmfang`-Wert fließt in `berichtDateiname` (`berichtDateiname.ts:52-64`) nur über eine `=== "getraenke"`-Prüfung in den Dateinamen ein – der rohe Query-String selbst wird nirgends in Ausgabe, Dateiname oder Header übernommen. Kein SQL (Data-Layer bleibt Drizzle/parametrisiert, unverändert), keine Command-Injection-Fläche. Für den XLSX-Renderer bleibt der bestehende Formel-Injection-Schutz (`neutralisiereFormelPraefix`, `berichtXlsx.ts:34-37`) über die gemeinsamen Helfer `schreibeKopf`/`schreibeTeilnehmerMengen` erhalten und wird in `berichtXlsxGetraenke` zusätzlich explizit auf `auslage.anzeigename` angewandt (`berichtXlsx.ts:230-236`). PDF-Renderer (`berichtPdf.ts`) übergibt Strings nur als `text`-Felder an pdfmake – keine HTML-Interpretation, keine neue XSS-Fläche.

**2. Authentication & Authorization** – Sicher, für beide Umfänge identisch durchgesetzt. Reihenfolge in `route.ts:61-91`: Rolle (`hasRole(..., "veranstalter")`) → Format → Umfang → `getVeranstaltung` (404) → Status `abgeschlossen` (409) → Render. Die Rollen- und Statusprüfung liegt **vor** der Umfangs-Verzweigung in `rendere()` (`route.ts:49-59`) – es gibt keinen Codepfad, der die Getränke-Variante ohne diese Gates erreicht. Durch die Reihenfolge (Rolle zuerst) wird einem unautorisierten Aufrufer auch nicht per Fehlercode verraten, ob eine Veranstaltung existiert oder welchen Status sie hat. Bestätigt durch dedizierte Tests: `should_return403_when_umfangGetraenkeAndUserIsNotVeranstalter` und `should_return409_when_umfangGetraenkeAndVeranstaltungOffen` (`route.test.ts`).

**3. Sensitive Data Handling** – Sicher. `berichtModellGetraenke` (`berichtModell.ts:173-192`) ist eine reine Projektion über das bereits für **diese eine** Veranstaltung (`id`) geladene volle Modell – keine zusätzliche DB-Abfrage, kein Zugriff auf andere Veranstaltungen. Positionsfilter nutzt den Katalog-Enum-Wert `"getraenk"` (`db/schema.ts:82`), der Auslagenfilter vergleicht auf das bereits aufgelöste Label `AUSLAGE_KATEGORIE_LABEL.getraenke` (`labels.ts:24`) – beide Enums sind bewusst unterschiedlich benannt (`getraenk` vs. `getraenke`) und beide Filter greifen korrekt auf die jeweils richtige Quelle; verifiziert durch den Test `should_passProjectedGetraenkeModell_when_umfangGetraenke`, der eine `essen`-Auslage und eine `essen`-Position explizit herausfiltert. Teilnehmer ohne Getränke-Position fallen ganz weg (kein Leak einer 0,00-€-Zeile mit sonst leerem Namen). Fehlermeldungen (400/403/404/409) sind generisch und enthalten keine internen Details.

**4. Dependency Security** – Keine neuen Dependencies. `git diff origin/main...HEAD -- package.json pnpm-lock.yaml` ist leer.

**5. Error Handling & Information Disclosure** – Keine Stacktraces oder interne Details im neuen Codepfad; Fehlerantworten sind identisch generisch gehalten wie im Bestandscode (siehe Hinweis oben zum unveränderten Fehlerbehandlungs-Verhalten).

## Ergebnis
PASSED
