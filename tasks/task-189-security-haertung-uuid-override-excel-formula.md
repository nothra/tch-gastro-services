# Task 189: security-haertung-uuid-override-excel-formula

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Optionale Security-Härtung aus dem Review von Task #185 (kein Blocker, PASSED):
1. Konditionaler pnpm-Override, der die transitive `uuid`-Verwundbarkeit
   (`exceljs > uuid`, GHSA-w5hq-g745-h8pq) in `pnpm-workspace.yaml` schließt.
2. Defense-in-Depth-Neutralisierung von Excel-Formula-Injection-Präfixen
   (`= + - @ \t \r`) für nutzerkontrollierte Zell-Strings in `berichtXlsx.ts`
   (`bezeichnung`, `teilnehmer.anzeigename`, `auslage.anzeigename`).

Details, Scope und Akzeptanzkriterien: [`docs/specs/spec-189-security-haertung-uuid-override-excel-formula.md`](../docs/specs/spec-189-security-haertung-uuid-override-excel-formula.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN `pnpm-workspace.yaml` ohne uuid-Override WHEN der Override `"uuid@<11.1.1": ">=11.1.1"` ergänzt wird THEN meldet `pnpm audit` keine `uuid`-Verwundbarkeit mehr und `pnpm why uuid` zeigt eine Version `>=11.1.1`.
- [x] GIVEN `pnpm install` nach dem Override THEN bleiben `pnpm test`, `pnpm typecheck` und der Excel-Renderer unverändert funktionsfähig.
- [x] GIVEN ein Zell-Wert in `berichtXlsx.ts`, der mit `= + - @ \t \r` beginnt WHEN der Bericht gerendert wird THEN wird ein führendes `'` vorangestellt.
- [x] GIVEN ein Zell-Wert ohne dieses Präfix WHEN gerendert wird THEN bleibt er unverändert.
- [x] GIVEN `teilnehmer.anzeigename` bzw. `auslage.anzeigename` mit Formel-Präfix THEN wird auch dieser Wert neutralisiert (nicht nur `bezeichnung`).
- [x] GIVEN ein Wert, der bereits mit `'` beginnt oder leer ist THEN kein zusätzliches `'`, kein Sonderfall-Fehler.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein `/architecture`-Schritt nötig (kein ADR-Trigger, reine Härtung ohne Architekturentscheidung).
Siehe Spec-Datei „Technische Notizen" für Implementierungshinweise.

**Implementierungsnotiz (/implement):** `berichtXlsx.test.ts` ruft erstmals `workbook.xlsx.load()`
(zum Zurücklesen der Zellwerte) auf – dabei kollidiert exceljs' `Buffer`-Typreferenz mit einer
verschachtelten, älteren `@types/node@14`-Kopie (Dependency von `fast-csv`, selbst Dependency von
`exceljs`; vorbestehend, nicht durch den uuid-Override verursacht). `skipLibCheck: true` lässt die
inkonsistente Typ-Merge durch, wodurch der generische `Buffer`-Typ an der Aufrufstelle nicht direkt
zuweisbar ist. Workaround (nur im Test, keine Produktionscode-Änderung nötig): Cast über
`Parameters<typeof workbook.xlsx.load>[0]` statt direkt über `Buffer`.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine._

## Review-Findings
<!-- Wird durch /review befüllt -->
Runde 1 (2026-07-25): NEEDS_REWORK. Keine kritischen Findings; 2 wichtige Findings zu
Testqualität (Magic-Number-Row-Indizes ohne WHY-Kommentar, duplizierter Buffer-Load-Cast).
Volltext: [`tasks/review-189.md`](review-189.md).

Runde 2 (2026-07-25, /implement): Beide wichtigen Findings behoben – benannte Zeilen-Konstanten
mit WHY-Kommentar (`BEZEICHNUNG_ZEILE`/`ERSTE_TEILNEHMER_ZEILE`/`ERSTE_AUSLAGE_ZEILE`) und
Helper `ladeGerenderetesWorkbook(buffer)` statt dupliziertem Workbook-Load. Alle 16 Tests +
Typecheck weiterhin grün.

Runde 2 (2026-07-25, /review): APPROVED. Beide Fixes verifiziert, keine neuen Findings.
Volltext: [`tasks/review-189.md`](review-189.md).

**Refactoring (2026-07-25, /refactor):** Checkliste (Naming, Funktionsgröße, Duplikation,
Magic Numbers, Kommentare WHY/WHAT) durchgegangen – keine weiteren Änderungen nötig. Beide
Review-Findings (Magic-Number-Zeilen, duplizierter Buffer-Load) wurden bereits in Review-Runde 2
behoben; der restliche Code (`berichtXlsx.ts`, pnpm-Override) war bereits clean-code-konform.
Kein Verhalten geändert, keine Code-Änderung in diesem Schritt.

**Security-Review (2026-07-25, /security-review): PASSED.** Keine kritischen Findings. Formel-
Präfix-Liste vollständig (OWASP-CSV-Standard), keine praktikable Umgehung gefunden; uuid-Override
wirksam und ohne neues Risiko. Ein Out-of-Scope-Finding (vorbestehende kritische next-auth/
@auth/core-Verwundbarkeiten, unabhängig von #189) als eigenes Issue ausgelagert:
[#228](https://github.com/nothra/tch-gastro-services/issues/228). Volltext:
[`tasks/security-189.md`](security-189.md).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Zwei neue Lessons ergänzt (Volltext + Index-Zeile, ADR-037-konform):
- `lessons/build-tooling.md`: verschachtelte alte `@types/node`-Kopie kollidiert mit generischem
  `Buffer`-Typ bei TS≥5.7 – Cast über Ziel-Funktionssignatur, nicht `as unknown as Buffer`.
- `lessons/testing.md`: Row/Cell-Index-Assertions gegen einen gerenderten Report sind Magic
  Numbers – Herleitung sofort mitschreiben, nicht erst im Review.
Volltext: [`tasks/codify-189.md`](codify-189.md).

---
Branch: `improvement/189-security-haertung-uuid-override-excel-formula`
Erstellt: 2026-07-25 07:27
