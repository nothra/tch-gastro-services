# Security Review: Task 254

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [Kontext] Scope-Einordnung: Task 254 ändert ausschließlich ein internes CI/Pre-Push-Gate-Bash-Skript (`scripts/checks/config-validation-check.sh`) plus dessen Testdatei — kein App-Code, keine Web-exponierte Oberfläche, kein Auth-/DB-Code, kein externer Netzwerk-Input. Die Threat Surface ist entsprechend klein: das Skript läuft ausschließlich lokal (pre-push Hook) oder in CI, nie mit von außen kontrolliertem Input.
- [Bypass-Analyse, höchste Priorität] Zentrale Sicherheitsfrage geprüft und empirisch (nicht nur gelesen) verifiziert: Können die zwei neuen, früher laufenden Guards (Mehrdokument-Guard, Root-Typ-Guard) die bestehenden, sicherheitskritischen Regeln 5 (Mindest-Tier für `security-review`/`review`, Task 241) oder 6 (`model_tiers.heavy` nicht override-bar, Task 249) umgehen? Getestet: zweidokumentiges Override mit `model_tiers.heavy`-Remapping im zweiten Dokument → wird vom Multidoc-Guard zuverlässig als 2 Dokumente erkannt (`yq eval-all 'document_index'` liefert `0\n1`, unabhängig von `...`-Endmarkern/CRLF) und blockiert **bevor** die `effective`-Merge-Zeile (die beide Dokumente mergen würde) erreicht wird. YAML-Merge-Key-Smuggling (`<<: *anchor`) wurde ebenfalls getestet: `leaf_paths()` löst Merge-Keys nicht auf, die resultierenden Pfade sind unbekannte Keys und werden von der bereits bestehenden Regel 2 abgelehnt — kein neues Risiko durch Task 254. Kein Bypass-Pfad gefunden.
- [Fail-Closed] Alle getesteten Fehlerpfade (leeres Override, defektes Zweitdokument, kaputtes YAML) enden in `fail()` bzw. im bereits bestehenden `override_present()`-Skip — kein stiller `exit 0`-Pfad gefunden. Der in `tasks/review-254.md` dokumentierte Nitpick (stiller Fallback auf `override_doc_count=0` bei nicht-numerischem Output statt eigenem `fail()`) wurde gegengetestet: unschädlich, da Regel 1b (YAML-Parse) denselben Fehlerfall ohnehin mit einer treffenderen Meldung abfängt.
- [Command Injection] `$OVERRIDE` ist in allen neuen `yq`-Aufrufen korrekt gequotet; `override_doc_count`/`override_root_tag` werden vor Integer-/Pattern-Vergleichen sanitisiert. Kein `eval`, kein ungequotetes `$()`, kein Wortsplitting-Risiko bei Pfaden mit Sonderzeichen.
- [Information Disclosure] Neue Fehlermeldungen zeigen nur Dateipfad + YAML-Tag-Namen, keine Dateiinhalte — im Kontext eines lokalen/CI-Gates unkritisch.
- [Secrets] Keine Secrets/Keys/Tokens im Diff oder in den neuen Testfixtures (`root-scalar.yml`, `root-bool.yml`, `root-seq.yml`, `root-multidoc.yml` enthalten nur triviale Testwerte).
- [Dependencies] Keine neuen Dependencies. `document_index`/`tag` sind Bordmittel des bereits als Prerequisite geführten `yq` v4 (ADR-009 §A).

## Ergebnis
PASSED
