## Codify-Report: Task 59

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – neue Lesson „Gleicher
  Testdaten-Namensliteral in mehreren DB-Integrationstestdateien kollidiert unter
  Parallelisierung" – wegen: der vorbestehende, aber durch #59 praktisch deterministisch
  gewordene `__test__Cola`/`__test__Kaffee`-Flake (Issue #347, in dieser Task-Runde 3 behoben).
  Mehrere `*.test.ts`-Dateien legten unabhängig denselben Namensliteral in derselben
  unique-constraint-tragenden Spalte an; Fix war ein dateispezifisches `ITEM_PREFIX`. Index-Zeile
  in `PROJECT-CONTEXT.md` ergänzt (Trigger: `/implement`, `/test`, `/review` bei Data-Layer).
- [`docs/factory/lessons/code-style.md`](../docs/factory/lessons/code-style.md) – Rezidiv-Absatz
  an der bestehenden Lesson „Eine Erzwingungs-Behauptung ist eine Tatsachenbehauptung über Code"
  (#319) ergänzt – wegen: der viermal kopierte Testkommentar in Review-Runde 2, der einem
  Drift-Guard eine Prüfung zuschrieb, die er nicht leistet. Die Lesson existierte bereits, wurde
  aber beim **Kopieren** eines Kommentars in Geschwisterdateien nicht angewendet – der neue Absatz
  benennt genau diesen Moment als zusätzlichen Trigger. Index-Zeile in `PROJECT-CONTEXT.md`
  ergänzt (Rezidiv-Vermerk an bestehender Zeile).

### Keine Änderungen nötig

- Die beiden Security-Hinweise (`updateItem`-Asymmetrie zu `createItem`, `db/catalog.test.ts`-
  Dateikopf-Drift) sind bereits vom `/security-review`-Schritt selbst nach ADR-043 Schritt B in
  `docs/factory/kleinfunde.md` eingetragen – keine doppelte Erfassung nötig.
- Die restlichen Review-Findings (Guarded-UPDATE-Auswertung, ADR-Sweep, D5-Regressionsguard,
  AK5-Testfestigkeit) sind Anwendungen bereits bestehender Lessons (#55, #211, #264) ohne neue
  Fehlerklasse – kein zusätzlicher Lesson-Eintrag, die vorhandenen Regeln haben funktioniert.
- Kein neuer Check in `scripts/checks/` nötig: die Namenskollision ist eine Testdaten-Konvention,
  kein automatisierbares Gate (ein Enforcer müsste alle Testdateien einer Tabelle kennen – siehe
  Nitpick 2 aus Review-Runde 2, bewusst nicht behoben).
- Kein neues Issue/`kleinfunde.md`-Eintrag für die fehlende Enforcement der Namenskonvention:
  unter der ADR-018/043-Schwelle (reine Konvention, kein reproduzierbarer Defekt heute), bereits
  als Nitpick im Review dokumentiert.

### Empfehlung für nächste Features

- Beim Anlegen einer vierten artikelanlegenden `db/*.test.ts`-Datei das `ITEM_PREFIX`-Muster aus
  `db/catalog.test.ts`/`db/veranstaltung.test.ts`/`db/verzehr.test.ts` übernehmen (neue Lesson).
- Bei einem kopierten Kommentar, der eine Guard-/Enforcer-Aussage trifft, den Enforcer auch beim
  **n-ten** Kopieren erneut öffnen – nicht nur beim ersten Schreiben (Rezidiv-Ergänzung zu #319).
