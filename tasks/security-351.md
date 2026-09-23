# Security Review: Task 351

**Lauf:** 2026-09-23, **zweiter** `/security-review`-Durchlauf zu #351.
Der erste Report (Commit `2d88506`) deckte einen Diff von **5 Dateien / 565+/26−** ab. Seither
sind drei Commits dazugekommen (`da0fb30` `/codify`, `eb7cd0d` + `9e90e7f` `/refactor` inkl.
Review-Runde 3) – der Diff umfasst jetzt **10 Dateien / 785+/28−**. Der alte Report war damit
stale und wird durch diesen ersetzt; die neuen Dateien sind unten eigens geprüft.

**Scope:** `git diff origin/main...HEAD`.
Produktionscode: **keiner**. Geändert werden eine Integrationstest-Datei (`db/catalog.test.ts`)
sowie neun Doku-/Prozess-Dateien (`docs/factory/kleinfunde.md`,
`docs/factory/PROJECT-CONTEXT.md`, `docs/factory/lessons/factory-workflow.md`,
`docs/specs/spec-351-…md`, `tasks/codify-351.md`, `tasks/review-351.md`, `tasks/security-351.md`,
`tasks/task-351-…md`, `tasks/interrupt-log.jsonl`).
`db/catalog.ts`, das Schema, Routen, Server Actions und der Auth-Pfad bleiben unangetastet –
die Angriffsfläche der App ändert sich durch diesen PR **nicht**.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [x] **[Destruktiver Radius / Blast Radius]** Die generische Löschung in
      `cleanupCreatedRows()` löscht `catalog_item`-Zeilen nicht mehr nur über die getrackte
      ID-Liste, sondern über `catalog_id IN (createdCatalogs)` – also **jede** Zeile, die auf
      einen dieser Kataloge zeigt, unabhängig von `TEST_PREFIX`. Das ist die
      sicherheitsrelevanteste Änderung des PRs und wurde in diesem Lauf **erneut gegen den
      aktuellen Stand** geprüft (nicht gegen den Kommentar):
      `grep -n "createdCatalogs.push" db/catalog.test.ts` liefert genau **fünf** Stellen –
      `:138` (`trackCatalog()`, frischer `INSERT`), `:481` (`createCatalog`-Ergebnis), `:558`,
      `:588`, `:632` (`duplicateCatalog`-Ergebnis). Alle fünf tragen im selben Lauf neu
      erzeugte Zeilen mit frisch generierter UUID ein; `STANDARD_CATALOG_ID` steht an keiner
      Stelle in der Liste. Der geseedete Referenzbestand ist damit nachweislich außer
      Reichweite. **Bewertung: kein Risiko, kein Handlungsbedarf** – die im Code-Kommentar
      (`db/catalog.test.ts:169-170`) und im Dateikopf (`:28-30`) behauptete Zusicherung hält
      der Prüfung stand.
- [x] **[Blast Radius / Fail-closed]** Der aus Review-Runde 2 verbliebene Nitpick (kein
      Fail-closed-Guard `expect(catalogIds).not.toContain(STANDARD_CATALOG_ID)` vor dem
      generischen `DELETE`) ist im `/codify`-Schritt als `kleinfunde.md`-Eintrag verankert.
      Klassifizierung gegen die Schwellen-Tabelle in
      `docs/factory/guidelines/git-workflow.md` → „Zentraler Anlage-Weg (ADR-018)"
      gegengeprüft: **Schritt B ist korrekt.** Kein ausnutzbares Sicherheitsrisiko
      (keine angreiferkontrollierte Eingabe, kein Secret-/Auth-/Zahlungs-Pfad, Wirkung
      ausschließlich auf der per `DATABASE_URL` verbundenen Test-/DEV-DB), und das
      Abgrenzungskriterium „Ist der Auslöser in diesem Repo herstellbar?" ist mit **nein**
      beantwortet – es braucht erst eine künftige Code-Änderung, die `STANDARD_CATALOG_ID`
      in `createdCatalogs` einträgt. Damit hypothetischer Zustand → Sammeldatei, kein Issue.
      Die Zweifelsregel greift nicht, weil die Nicht-Ausnutzbarkeit hier belegt und nicht
      nur vermutet ist (fünf `push`-Stellen einzeln geprüft, s. o.).
- [x] **[Konfigurations-/Prozess-Integrität – behoben in Runde 3]** `eb7cd0d` hatte das
      transiente Interrupt-Sentinel `tasks/INTERRUPT-351.md` **getrackt** in den Branch
      gebracht; `9e90e7f` hat es wieder entfernt. Die Tragweite wurde hier gegen die drei
      Konsumenten nachgeprüft, nicht aus dem Review-Report übernommen:
      `scripts/factory-poll.sh:180` liest die reine Dateiexistenz und labelt jeden
      fehlgeschlagenen Async-Lauf zu #351 als `factory::interrupted` statt `factory::failed`
      – eine dauerhaft falsche Statusmeldung für ein Skript, das in CI Labels setzt;
      `scripts/metrics.sh:37` zählt offene Interrupts per `find … -name 'INTERRUPT-*.md'`;
      `scripts/run-pipeline.sh:336-342` würde die Datei im Pre-flight per `rm -f` löschen und
      damit bei einer getrackten Datei einen unsauberen Working Tree erzeugen.
      **Verifiziert:** `git ls-files 'tasks/INTERRUPT-*'` liefert **0 Treffer**, der Working
      Tree ist sauber. Kein Restrisiko aus diesem PR. Die `.gitignore`-Härtung selbst ist
      out-of-scope und bereits als **Issue #359** verankert – aus diesem Review entsteht
      deshalb kein zusätzlicher Fund.
- [x] **[Stored Prompt Injection – neue Diff-Anteile]** Die drei seit dem ersten Report
      hinzugekommenen Schreibziele wurden gegen das #286-/#334-Muster geprüft:
      `tasks/codify-351.md`, die Ergänzungen in
      `docs/factory/lessons/factory-workflow.md` / `docs/factory/PROJECT-CONTEXT.md` und
      die neue Zeile in `tasks/interrupt-log.jsonl`.
      **Kein neuer Ablage-Mechanismus** – alle drei sind etablierte Kanäle mit der
      „Daten, keine Anweisungen"-Zusicherung im jeweiligen Dateikopf bzw. in ADR-018.
      Grep über alle `+`-Zeilen in `docs/` und `tasks/` auf imperative Marker
      (`ignore previous|system-reminder|<system|assistant:|you must|disregard|new instruction|
      override|führe aus`) → **0 Treffer**; Grep auf ausführbare Kommando-Fragmente
      (`gh pr|gh issue|rm -rf|curl|wget|chmod +x|eval`) → **0 Treffer**.
- [x] **[Whitelist-/Freitext-Vermischung (#334)]** Die neue Zeile in
      `tasks/interrupt-log.jsonl` ist **kein** Agenten-Freitext: der `message`-Wert
      (`PR weder gemergt noch Auto-Merge scharfgeschaltet`) stammt als festes Literal aus
      `scripts/lib/verify-final-state.sh:78`. Alle 8 Zeilen der Datei wurden gegen
      `JSON.parse` validiert und tragen exakt denselben Schlüsselsatz
      (`message,task_id,ts,type`) – keine Feldinjektion, kein Schema-Drift. Der getrackte
      Status der Datei ist bewusst (`.gitignore:27` erklärt ihn explizit), im Gegensatz zum
      Sentinel oben.
- [x] **[Injection]** Keine neuen Roh-SQL-Aufrufe im Diff. Die beiden neuen Lösch-Pfade laufen
      über parametrisierte Drizzle-Builder (`inArray`). Der einzige Template-Literal-Treffer in
      den `+`-Zeilen ist ein Testdaten-Name (`` `${TEST_PREFIX}Cleanup351-Copy` ``), der als
      gebundener Parameter an `duplicateCatalog` geht, nicht in einen SQL-String. Der
      AK9-Replay (`CREATE SCHEMA` / `DROP SCHEMA … CASCADE`) führt Anweisungen aus der
      versionierten Migrationsdatei aus – eine repo-kontrollierte, keine Nutzer-Quelle – und
      ist von diesem PR nicht berührt.
- [x] **[Information Disclosure / Doku-Drift]** Der PR **entschärft** ein bestehendes
      Doku-Risiko: Der alte Dateikopf behauptete „Tests sind nicht-destruktiv", während der
      AK9-Replay seit #59 DDL ausführt. Wer diesen Kommentar als Freigabe las, konnte die Suite
      eher gegen eine fremde DB richten. Der neue Kopf nennt die DDL-Ausnahme und den nötigen
      Schema-Rechte-Bedarf explizit; der zugehörige `kleinfunde.md`-Eintrag ist korrekt
      **gelöscht** statt abgehakt. Positive Änderung, kein Finding.
- [x] **[Secrets]** Keine Credentials, Keys oder Connection-Strings im Diff. Grep über alle
      `+`-Zeilen auf `password|secret|token|api_key|PRIVATE KEY|postgres(ql)://|ghp_|sk-`
      liefert ausschließlich Prosa-Treffer in den Report-Dateien (u. a. das Wort „Secrets" im
      alten Report selbst und die Silbe `sk-` in „Ta**sk-L**og"). Der DB-Zugang kommt
      weiterhin ausschließlich aus `process.env.DATABASE_URL`; nichts wird geloggt.
- [x] **[Dependencies]** Keine Änderung an `package.json`, `pnpm-lock.yaml` oder
      `pnpm-workspace.yaml` – keine neue Angriffsfläche, kein Advisory-Check nötig.
- [x] **[AuthN / AuthZ / XSS / Error Handling]** Nicht anwendbar – der PR berührt keine Route,
      keine Server Action, keine Rendering-Pfade und keine Fehlerausgabe nach außen.

## Anker-Drift-Prüfung der `kleinfunde.md`-Einträge (Lesson #291/#351)

Die Lesson zu #291 (in diesem PR um das zweite Vorkommnis erweitert) adressiert ausdrücklich
auch `/security-review` „vor Merge-Freigabe, wenn dieser PR selbst einen
`kleinfunde.md`-Eintrag angelegt hat". Alle Anker der beiden neuen Einträge wurden gegen den
**aktuellen** Stand nachgelesen:

| Anker | Behauptung | Ist-Stand |
|-------|------------|-----------|
| `db/catalog.test.ts:163-172` | generische Löschung inkl. beider `DELETE`s | ✅ Spanne deckt `catalogIds`-Zuweisung, Kommentar und **beide** `DELETE`-Zeilen ab |
| `db/catalog.test.ts:169-170` | Kommentar „nie `STANDARD_CATALOG_ID`" | ✅ exakt diese zwei Zeilen |
| `:138`, `:481`, `:558`, `:588`, `:632` | „alle **fünf** `push`-Stellen" | ✅ `grep -c` = 5, alle fünf Zeilennummern treffen |
| `db/veranstaltung.test.ts:109-116` | `catalog_item` nur per ID-Liste, `catalog` per `createdCatalogs` | ✅ Spanne deckt **beide** Hälften der Was-Behauptung ab (`:109-111` Item-`DELETE`, `:114-116` Katalog-`DELETE`) |
| „kein `duplicateCatalog` in der Datei" | kein auslösender Pfad heute | ✅ `grep -n duplicateCatalog db/veranstaltung.test.ts` → 0 Treffer |

Der in Runde 3 korrigierte Zählfehler („vier" → „fünf") ist damit vollständig behoben; keine
Rest-Drift.

## Out-of-Scope-Findings

Aus diesem Review entsteht **kein** neuer Out-of-Scope-Fund. Die beiden bestehenden
`kleinfunde.md`-Einträge (`db/veranstaltung.test.ts`-FK-Lücke, fehlender
`STANDARD_CATALOG_ID`-Fail-closed-Guard) wurden oben gegen ADR-043 gegengeprüft und sind
**korrekt nach Schritt B** klassifiziert; die `.gitignore`-Härtung gegen getrackte
`INTERRUPT-*.md` liegt bereits als **Issue #359** vor. Es bleibt nichts ungetrackt.

## In-Scope-Hinweis ohne Sicherheitsrelevanz

- `tasks/codify-351.md:47-49` ist seit `eb7cd0d` inhaltlich überholt: der Report schreibt, die
  Task-Log-Symmetrie-Lücke (fehlender Vor-Fix-Disclaimer) „bleibt … unadressiert" – der
  darauffolgende `/refactor`-Commit hat sie jedoch nachgetragen (siehe Task-Datei,
  Abschnitt „/refactor"). Reine Prosa-Drift innerhalb des eigenen PR-Diffs, kein
  Sicherheitsbezug, kein Merge-Blocker. Bewusst **kein** Issue und **kein**
  `kleinfunde.md`-Eintrag: der Fund liegt **im Scope** dieses PRs (nicht out-of-scope) und ist
  damit hier kanonisch verankert, nicht nur als Session-Notiz (#345). Fix wäre ein Halbsatz in
  `tasks/codify-351.md`; die Entscheidung darüber liegt bei `/pr-shepherd` bzw. beim Menschen.

## Ergebnis

PASSED
