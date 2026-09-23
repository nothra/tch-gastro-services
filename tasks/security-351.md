# Security Review: Task 351

**Scope:** `git diff origin/main...HEAD` – 5 Dateien, 565+/26-.
Produktionscode: **keiner**. Geändert werden ausschließlich eine Integrationstest-Datei
(`db/catalog.test.ts`) und vier Doku-/Prozess-Dateien (`docs/factory/kleinfunde.md`,
`docs/specs/spec-351-…md`, `tasks/review-351.md`, `tasks/task-351-…md`).
`db/catalog.ts` und das Schema bleiben unangetastet – die Angriffsfläche der App
(Routen, Server Actions, Auth, Data-Layer) ändert sich durch diesen PR **nicht**.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [x] **[Destruktiver Radius / Blast Radius]** Die neue generische Löschung in
      `cleanupCreatedRows()` (`db/catalog.test.ts:171`) löscht `catalog_item`-Zeilen nicht
      mehr nur über die selbst getrackte ID-Liste, sondern über
      `catalog_id IN (createdCatalogs)` – also **jede** Zeile, die auf einen dieser Kataloge
      zeigt, unabhängig von `TEST_PREFIX`. Das ist die sicherheitsrelevanteste Änderung des
      PRs und wurde deshalb gegen die Quelle geprüft, nicht gegen den Kommentar:
      `createdCatalogs` wird an genau fünf Stellen befüllt – `trackCatalog()` (`:138`,
      frischer `INSERT`) sowie `:481` (`createCatalog`-Ergebnis), `:558`, `:588`, `:632`
      (`duplicateCatalog`-Ergebnis). Alle fünf liefern im selben Lauf neu erzeugte Zeilen mit
      frisch generierter UUID; `STANDARD_CATALOG_ID` steht an keiner Stelle in der Liste.
      Der geseedete Referenzbestand ist damit nachweislich außer Reichweite, und ein fremder
      Schreiber kann die frisch generierten UUIDs nicht kennen. **Bewertung: kein Risiko,
      kein Handlungsbedarf** – die im Code-Kommentar (`:169-170`) und im Dateikopf
      (`:28-30`) behauptete Zusicherung hält der Prüfung stand. Bewusst **kein** Issue und
      **kein** `kleinfunde.md`-Eintrag: hier ist kein Defekt offen, der getrackt werden
      müsste.
- [x] **[Information Disclosure / Doku-Drift]** Der PR **entschärft** ein bestehendes
      Doku-Risiko: Der alte Dateikopf behauptete „Tests sind nicht-destruktiv", während der
      AK9-Replay seit #59 `CREATE SCHEMA` / `DROP SCHEMA … CASCADE` ausführt. Wer diesen
      Kommentar als Freigabe las, konnte die Suite eher gegen eine fremde DB richten. Der neue
      Kopf (`:31-33`) nennt die DDL-Ausnahme und den nötigen Schema-Rechte-Bedarf explizit; der
      zugehörige `kleinfunde.md`-Eintrag ist korrekt **gelöscht** statt abgehakt. Positive
      Änderung, kein Finding.
- [x] **[Injection]** Keine neuen Roh-SQL-Aufrufe im Diff (`client.query`/`execute(` –
      0 Treffer in den `+`-Zeilen). Die neuen Lösch-Pfade laufen über parametrisierte
      Drizzle-Builder (`inArray`). Die bestehenden Template-Literal-SQL-Strings (`:80`, `:86`)
      sind **Erwartungswerte** von Assertions, keine ausgeführten Queries, und unverändert.
      Der AK9-Replay führt Anweisungen aus der versionierten Migrationsdatei aus – eine
      repo-kontrollierte, keine Nutzer-Quelle – und ist von diesem PR nicht berührt.
- [x] **[Secrets]** Keine Credentials, Keys oder Connection-Strings im Diff (Grep über alle
      `+`-Zeilen auf `password|secret|token|api_key|PRIVATE KEY|postgres(ql)://` – 0 Treffer).
      Der DB-Zugang kommt weiterhin ausschließlich aus `process.env.DATABASE_URL`; die
      Verwendung ist unverändert. Nichts wird geloggt.
- [x] **[Dependencies]** Keine Änderung an `package.json`, `pnpm-lock.yaml` oder
      `pnpm-workspace.yaml` – keine neue Angriffsfläche, kein Advisory-Check nötig.
- [x] **[Stored Prompt Injection]** Der neue `kleinfunde.md`-Eintrag wurde gegen das
      #286-Muster geprüft (Repo-Datei, die vom Agentenkontext wieder gelesen wird): Er enthält
      ausschließlich beschreibenden Text, Pfad-/Zeilen-Anker und ein Code-Fragment – keine
      imperativen Marker, keine Anweisungen an einen späteren Agenten. Unbedenklich.
- [x] **[AuthN / AuthZ / XSS / Error Handling]** Nicht anwendbar – der PR berührt keine Route,
      keine Server Action, keine Rendering-Pfade und keine Fehlerausgabe nach außen.

## Out-of-Scope-Findings

Der PR trägt einen Out-of-Scope-Fund in `docs/factory/kleinfunde.md`
(`db/veranstaltung.test.ts` hat dieselbe FK-Cleanup-Lücke). Aus Security-Sicht gegengeprüft
und **korrekt nach Schritt B klassifiziert**: reiner Testhygiene-Defekt, heute ohne
auslösenden Pfad, kein ausnutzbares Sicherheitsrisiko und keine Angriffsfläche – damit
unterhalb der Issue-Schwelle (ADR-043). Aus diesem Review entsteht **kein** zusätzlicher
Out-of-Scope-Fund; es bleibt nichts ungetrackt.

## Ergebnis

PASSED
