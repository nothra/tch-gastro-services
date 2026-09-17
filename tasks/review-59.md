# Review: Task 59

> **Runde 2** (nach dem Rework aus `/implement`-Runde 2+3, Commit `d744d22`).
> Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur & Patterns) gegen
> `git diff origin/main...HEAD`, `docs/specs/spec-59-katalog-als-entitaet.md`,
> [ADR-050](../docs/adr/050-katalog-als-template-entitaet.md) und
> `tasks/task-59-preis-templates-veranstaltungstyp.md`.
>
> Geprüfter Umfang: 26 Dateien / +2903 −87. Alle 10 AK und alle 5 FS sind inhaltlich getroffen;
> keine Routen berührt → `docs/routes.md` zu Recht unverändert (#145).
>
> **Runde 1 (0 kritisch / 5 wichtig / 5 Nitpicks) ist vollständig abgearbeitet** – alle fünf
> wichtigen Findings und vier der fünf Nitpicks sind behoben (Nitpick 4 war ausdrücklich ohne
> Handlungsbedarf), der Volltext von Runde 1 steht unten im Anhang. Diese Runde hat die Fixes
> **nicht nur gelesen, sondern gemessen** (s. „Eigene Verifikation").

## Eigene Verifikation (nicht aus den Task-Notizen übernommen)

Lesson #312 („Report-Zusammenfassung einer Vorrunde nicht ungeprüft übernehmen") und die
Mutationsbeleg-Lesson aus #286 angewandt:

- **Gates von Null:** `pnpm lint`, `pnpm typecheck`, `pnpm format:check` grün.
- **Suite ohne DB:** 812 passed / 76 skipped (888).
- **Suite mit DB, 3 Läufe gegen eine frische, leere Instanz** (Wegwerf-Container
  `postgres:18-alpine`, passwortlos, `--rm`, danach gestoppt): **888/888 grün in 3 von 3 Läufen**.
  Damit ist der #347-Fix (Namensfenster je Testdatei) unabhängig bestätigt – die in der Task-Datei
  dokumentierte Messung „3 von 3 rot ohne Fix" schlägt jetzt in 3 von 3 grün um.
- **AK9 wörtlich:** `drizzle-kit migrate` **zweimal** hintereinander, beide Läufe erfolgreich;
  danach `kataloge=1`, `artikel=16`, `ohne_standard=0`, und als einzige Unique-Constraint auf
  `catalog_item` steht `catalog_item_catalog_name_size_unique` (die alte ist weg).
- **Mutationsbeleg für den neuen D5-Guard** (das teuerste Finding aus Runde 1): mit
  `catalog_id`-Bedingung im Anzeige-Join (`db/verzehr.ts`) → Test **rot**; mit
  `catalog_id`-Bedingung in der Freeze-Subquery (`db/veranstaltung.ts`) → Test **rot**;
  unmutiert grün. Beide Quellen danach per `git checkout` zurückgesetzt (Arbeitsbaum sauber).
  Der Guard ist also in **beiden** Richtungen kausal, nicht nur formal vorhanden.
- **Schema-/Snapshot-Drift:** `drizzle-kit check` „Everything's fine", `drizzle-kit generate`
  meldet „No schema changes" – die hand-editierte Migration und `db/schema.ts` laufen nicht
  auseinander (genau die Stelle, an der eine Hand-Edition sonst still abdriftet).
- **Kette bis zur Oberfläche:** `CatalogRow.tsx:18` schließt die Inline-Bearbeitung nur bei
  `result.ok`, `:51` rendert `state.error` – die neue Meldung „Artikel nicht gefunden." ist
  tatsächlich sichtbar und lässt das Formular offen. Der W1-Fix endet nicht in der Action.
- **Sweep-Vollständigkeit:** repo-weiter Grep auf `Expand-only` → **kein** Treffer mehr (W5 war in
  drei Dateien zu korrigieren).
- **PR-Körper:** trägt `Closes #59` **und** `Closes #347` – der in diesem PR mitbehobene
  Out-of-Scope-Fund wird also auch geschlossen, nicht nur gefixt.

## Kritische Findings (müssen behoben werden)

_Keine._ Weder Datenverlust noch Sicherheitslücke noch unerfülltes Akzeptanzkriterium.

## Wichtige Findings (sollten behoben werden)

- [ ] **`app/verwaltung/katalog/actions.test.ts:51`, `app/veranstaltung/actions.test.ts:167`,
      `app/veranstaltung/[id]/verzehr/page.test.tsx:96`, `app/theke/[token]/page.test.tsx:67` –
      der viermal kopierte Kommentar behauptet einen Guard, den es für diesen Wert nicht gibt.**
      Wortlaut: „Soll-Wert als Literal … Gegen die Produktions-Konstante und das Migrations-Literal
      hält ihn der Drift-Guard in `db/catalog.test.ts`." Der Drift-Guard hält
      `STANDARD_CATALOG_ID` (die **Produktions**-Konstante, in `db/catalog.test.ts` echt importiert)
      gegen das Migrations-Literal – er liest diese vier Testdateien nie. Das lokale Literal
      `"standard"` wird hier gegen den **gemockten** Modul-Export verglichen, der im selben File
      ebenfalls auf `"standard"` steht: die Assertion ist wertneutral (sie belegt „die Konstante
      wird durchgereicht", nicht „sie ist `standard`") und an nichts gebunden. Würde
      `STANDARD_CATALOG_ID` samt Migration auf einen anderen Key wechseln, bliebe der Drift-Guard
      grün, diese vier Dateien blieben grün – und die Behauptung wäre weiterhin falsch.
      **Kein Verhaltensrisiko** (die Wiring-Aussage der Tests trägt unverändert), aber genau die
      Lesson „„X erzwingt Y" ist eine überprüfbare Tatsachenbehauptung über fremden Code – vor dem
      Schreiben den Enforcer öffnen" (#319). Günstigste Behebung: den zweiten Satz auf das
      Zutreffende kürzen (der Wert muss mit dem Mock oben übereinstimmen; die Bindung an
      Migration/Produktionskonstante leistet der Drift-Guard nur für die Konstante selbst).
      Ein echter Import des Originals ist hier **kein** gangbarer Ersatz – `vi.importActual`
      auf `@/db/catalog` zöge `db/index.ts` und damit einen DB-Client in einen jsdom-Unit-Test.

## Nitpicks (optional)

- [ ] `app/verwaltung/katalog/actions.ts:11` – das Meldungs-Literal
      `ITEM_NOT_FOUND = "Artikel nicht gefunden."` existiert jetzt **zweimal** im Baum, unter
      demselben Konstantennamen, in zwei Feature-Modulen (`app/veranstaltung/actions.ts:48`). Der
      Wortlaut wurde bewusst übernommen statt neu erfunden – richtig –, aber nichts hält die beiden
      zusammen: eine spätere Umformulierung an einer Stelle divergiert lautlos. Eine geteilte
      Meldungsquelle für zwei Module ist womöglich Over-Engineering; dann genügt ein
      Querverweis-Kommentar an beiden Stellen.
- [ ] `db/veranstaltung.test.ts:44` / `db/catalog.test.ts:123` – der #347-Fix ist reine
      **Konvention ohne Enforcer**: eine vierte artikelanlegende DB-Testdatei kann die Kollision
      wieder einführen (heute sind es genau drei – per Grep auf `createItem`/`catalogItems` in
      `db/*.test.ts` bestätigt, `auslage`/`teilnehmer` legen keine Artikel an). Der erklärende
      Kommentar zählt zudem auf, welche Namen **kein** Fenster brauchen („Teilnehmer-/
      Veranstaltungsnamen … dort gibt es keine Unique-Constraint auf dem Namen") – und lässt dabei
      `catalog.name` aus, das **global unique** ist und inzwischen von **zwei** Dateien beschrieben
      wird (`trackCatalog` liegt in beiden, je ~8 Zeilen, praktisch identisch). Heute kollidiert
      nichts, weil die Katalognamen zufällig disjunkt sind; die Aufzählung im Kommentar ist aber
      unvollständig genau an der Stelle, die #347 ausgelöst hat.
- [ ] `docs/specs/spec-116-…` und `docs/specs/spec-137-…` nennen weiterhin
      `catalog_item_name_size_unique` bzw. `UNIQUE(name, size)` (unverändert aus Runde 1).
      Ausgelieferte Specs sind Momentaufnahmen und werden im Repo nicht nachgezogen – notiert der
      Vollständigkeit halber, **kein Handlungsbedarf** (anders als bei den ADRs, die behoben sind).

## Out-of-Scope-Funde

_Keine neuen._ Der Fund aus Runde 1 (Issue
[#347](https://github.com/nothra/tch-gastro-services/issues/347), Test-Isolation) ist in diesem PR
behoben; der PR-Körper schließt ihn mit. Die Abweichung von der Runde-1-Einordnung („nicht in
diesem PR") ist in der Task-Datei begründet **und gemessen** – diese Runde bestätigt die Messung
unabhängig (3 von 3 grün, s. oben). Befund 1 der Implementierungs-Notizen (driftende lokale
Dev-DB ohne die 0004-Referenzliste) bleibt ein Umgebungsproblem ohne Repo-Auslöser: gegen die
frische DB ist der betroffene Test grün.

## Positives

- **Alle fünf wichtigen Findings aus Runde 1 sind an der Wurzel behoben, nicht kosmetisch.**
  Der No-Match-Guard (W1) ist nicht nur eine `if`-Zeile: `runWithUniqueCheck` wurde generisch
  gemacht und reicht das Ergebnis durch (`{ok:true,value}` / `{ok:false,state}`), statt es zu
  verwerfen – der Typ zwingt den Aufrufer jetzt zur Auswertung. `createItem` bleibt bewusst
  ohne Zweig (Rückgabetyp ohne `| undefined`), mit Begründung im Code: das ist die Clean-Code-Regel
  „keine Fallbacks für typseitig ausgeschlossene Fälle" korrekt angewandt statt symmetrisch
  überdehnt. Und der Happy-Path-Test setzt jetzt einen echten Rückgabewert – ohne das hätte der
  Mock-Default `undefined` den neuen Zweig verdeckt (Lesson „Mock-Default", selbst erkannt).
- **Der D5-Regressionsguard ist der wertvollste Test dieses PR und er hält.** Mutation in beiden
  laut ADR-050 D5 katalog-frei zu haltenden Pfaden macht ihn rot (oben gemessen). Der Test prüft
  beide Hälften getrennt – Auflösung über den Join **und** Preis-Freeze über die Subquery – und
  belegt den Freeze über eine echte nachträgliche Preisänderung (250 bleibt 250, obwohl der
  Live-Preis auf 300 geht). Damit ist der teuerste Fehler, den #346 machen kann, bewacht.
- **Der AK5-Fix ist die richtige Lösung, nicht die bequeme.** Der Test stellt den *vorgefundenen*
  Namen wieder her statt „Montagsrunde" zurückzuschreiben, und er prüft den **selbst angelegten**
  Artikel über alle drei Lesewege statt die Gesamtliste zu vergleichen. Beides zusammen macht ihn
  parallelitätsfest **und** hört auf, die einzige Datenänderung zu überschreiben, die ein
  Betreiber bis #345 legitim vornimmt. Die AK2-Namensassertion ist konsequent mitentfallen, mit
  Begründung, wo der Seed-Name stattdessen belegt ist (Migrations-Guard + AK9-Replay).
- **Der W4/W5-Sweep ist vollständig ausgeführt** (Lesson #264: Geschwister-Stellen per Grep).
  ADR-026/027 tragen an allen vier Fundstellen einen „seit ADR-050"-Nachtrag ohne die historische
  Aussage zu verfälschen, ADR-050 § „Bezug zu bestehenden ADRs" nennt beide, und „Expand-only"
  ist aus ADR-050-Überschrift, ADR-050-Konsequenzen **und** dem Migrations-Kopfkommentar
  verschwunden – repo-weit kein Treffer mehr. Die D6-Präzisierung benennt das Schreib-Fenster
  konkret (welcher Bedienweg, welcher SQLSTATE, warum in Kauf genommen) und grenzt die Abwägung
  ausdrücklich für #345/#346 ab.
- **Der #347-Fix greift weiter als das Issue.** Neben der gemeldeten `__test__Cola`-Kollision
  fällt eine zweite, latente (`__test__Kaffee` in `catalog.test.ts` + `verzehr.test.ts`) weg, und
  das neue Präfix beginnt weiter mit `TEST_PREFIX`, sodass alle Fremdzeilen-Filter unverändert
  greifen (nachgeprüft: `should_assignEveryPreexistingItemToStandardCatalog_when_migrated` filtert
  über `TEST_PREFIX` und sieht die neuen Namen weiterhin als Testdaten).
- **Der neue D7-Abwesenheitstest schließt die letzte offene ADR-Behauptung.** ADR-050 nennt D5
  **und** D7 als „als Abwesenheits-Aussage formuliert und damit testbar" – nach dieser Runde haben
  beide tatsächlich einen Test, und der D7-Test ist so geschrieben, dass #345 den Flip bewusst
  vornehmen muss.
- **Migrations-Schnitt und Drift-Guard** (aus Runde 1, hier nachgemessen): Reihenfolge nullable →
  seed → backfill → `SET NOT NULL` → FK → Unique-Tausch ist korrekt, jeder Schritt trägt einen
  WHY-Kommentar mit AK-Bezug, `drizzle-kit check`/`generate` sehen keinen Drift, und der
  Konstante↔Migration-Guard ankert an der **vollen** Anweisung, verlangt **genau einen** Treffer
  und hat für beide Fail-closed-Richtungen einen eigenen Test (#214 vollständig umgesetzt).
- **AK9-Replay bleibt sorgfältiger als verlangt:** Wegwerf-Schema mit `search_path` **ohne**
  `public`, Anweisungen unverändert aus der Migrationsdatei gelesen, echte divergenzerzeugende
  Aktion vor dem zweiten Lauf plus Positivkontrolle (neuer unzugeordneter Artikel) – „nichts
  kaputt gemacht" ist von „nichts zu tun gehabt" unterscheidbar (#253).
- **Scope-Disziplin über drei Runden gehalten:** keine Routen, kein Zod-Feld, keine UI-Änderung,
  `db/verzehr.ts` und `db/veranstaltung.ts` produktiv unangetastet, `docs/routes.md` zu Recht
  nicht angefasst, `CLAUDE.md`-Autoblock aus dem Diff entfernt (Lesson #337). Der Rework von
  Runde 2/3 hat **keine** neue Produktionslogik eingeführt, die nicht ein Runde-1-Finding adressiert.

## Empfehlung

APPROVED

Der Kern (Schema, Migration, Data-Layer, Wiring, Doku) ist belastbar und überdurchschnittlich gut
getestet; alle fünf wichtigen Findings aus Runde 1 sind behoben, zwei davon habe ich kausal
nachgemessen (D5-Mutation, No-Match-Pfad bis in die UI). Kein kritisches Finding, keine offene
Verhaltenslücke.

Das einzige wichtige Finding dieser Runde ist eine **Kommentar-Korrektur ohne Verhaltensanteil**
(falsche Guard-Behauptung in vier Testdateien). Sie erzwingt **keine** weitere `/implement`-Runde:
sie gehört in den `/refactor`-Schritt (Kommentar-Änderung, kein neues Verhalten) und muss dort
tatsächlich erledigt werden – sonst bleibt eine nachweislich falsche Aussage über einen Guard im
Baum. Die drei Nitpicks sind optional; Nitpick 3 ist ausdrücklich ohne Handlungsbedarf.

## Hinweis an den nächsten Schritt

- **Gitignorete Wegwerf-Artefakte liegen im Worktree** und können verzeichnisweite
  Content-Scan-Guards in `run-tests.sh` fälschlich rot machen (Lesson #312/#339): aus `/implement`
  `scripts/baseline59.tmp.sh`, `scripts/gates59.tmp.sh`, `scripts/suite59.tmp.sh`,
  `scripts/baseline-catalog.test.ts.tmp.txt`, `scripts/baseline-veranstaltung.test.ts.tmp.txt`;
  aus diesem Review `scripts/review59-gates.tmp.sh`, `scripts/review59-db.tmp.sh`,
  `scripts/review59-mut.tmp.sh`, `scripts/review59-drift.tmp.sh`. Die Review-Skripte wollte ich
  selbst entfernen – `rm` war in dieser Session nicht freigegeben. **Vor dem nächsten Suite-Lauf
  löschen und erneut `git status --ignored` prüfen** („Artefakte entfernt" ist eine Momentaufnahme).
  Die beiden `tasks/telemetry-raw-59-*.tmp.txt` **nicht** anfassen – sie gehören zum
  Telemetrie-Schritt der Pipeline.
- **Die Integrationsblöcke belegen AK1–AK6/AK9/FS1/FS4/FS5 nur mit `DATABASE_URL`.** Ein bares
  `pnpm test` überspringt 76 Tests und ist als Beleg dieser AK wertlos. Für `/test` und
  `/security-review` gilt: gegen eine frische DB fahren, nicht gegen die geteilte Dev-DB (dort
  fehlt die 0004-Referenzliste, Befund 1).
- **Der Arbeitsbaum ist getrackt sauber** – dieser Review hat keine Quelldatei verändert (die
  Mutationsproben sind zurückgesetzt und per `git status` gegengeprüft).

---

# Anhang: Review-Runde 1 (2026-09-17, NEEDS_REWORK)

> Volltext zur Nachvollziehbarkeit. Erledigungsstand: alle 5 wichtigen Findings behoben, 4 von 5
> Nitpicks behoben (Nitpick 4 ohne Handlungsbedarf).

## Kritische Findings (Runde 1)

_Keine._ Weder Datenverlust noch Sicherheitslücke noch unerfülltes Akzeptanzkriterium gefunden.
Die Migrations-Reihenfolge (nullable → seed → backfill → NOT NULL → FK/Unique-Tausch) ist
korrekt, der Drift-Guard Konstante↔Migration ist fail-closed, und die beiden laut ADR-050 D5
katalog-frei zu haltenden Pfade (`db/verzehr.ts:74`, Freeze-Subquery in `db/veranstaltung.ts`)
sind tatsächlich unangetastet.

## Wichtige Findings (Runde 1)

- [x] **`app/verwaltung/katalog/actions.ts:66` (und `:77`) – `undefined`-Rückgabe der
      guarded UPDATEs wird nicht ausgewertet; die Action meldet Erfolg für einen Schreibvorgang,
      der nicht stattgefunden hat.** `id` stammt aus `FormData`, ist also client-gesteuert.
      Muster aus der Lesson „Guarded UPDATE bei Status-Transition-Actions" (#55) und
      Kern-Kurzregel 1. Vor #59 war das Verhalten identisch, aber der Typ verschwieg es – der PR
      macht den Zweig erst sichtbar und testbar, also gehört der Guard hierher.
      *Hinweis:* `setCatalogItemActiveAction` gibt `void` zurück und hat keinen Meldungskanal –
      dort genügt, den Fall bewusst zu kommentieren oder auf #345 zu vertagen.
- [x] **`db/catalog.test.ts:311-315` – der AK5-Test schreibt im `finally` den Katalognamen hart
      auf `"Montagsrunde"` zurück, statt den vorgefundenen Wert wiederherzustellen.** spec-59
      erklärt das Umbenennen direkt in der DB zum **einzigen** unterstützten Pflege-Weg bis #345 –
      der Test überschreibt damit ausgerechnet die eine Datenänderung, die ein Betreiber in dieser
      Slice legitim vornimmt. Der Test, der die Rename-Sicherheit belegt, war so selbst
      rename-feindlich.
- [x] **`docs/adr/050-…:139-154` (D5) – für die wertvollste Invariante des ADR existiert kein
      Regressionsguard.** Nichts schlug fehl, wenn jemand `db/verzehr.ts:74` oder die
      Freeze-Subquery um eine `catalog_id`-Bedingung ergänzt – obwohl die ADR-Begründung D5
      ausdrücklich „als Abwesenheits-Aussage formuliert und damit testbar" nennt.
- [x] **`docs/adr/050-…:306-315` – „Bezug zu bestehenden ADRs" nennt ADR-026/027 nicht, obwohl
      dieser PR die dort im Präsens beschriebene Mechanik ändert** (`UNIQUE(name, size)`,
      `listActiveCatalog()`, `getCatalogItem(catalogItemId)`). Lesson #211, triggert auch ohne
      Änderung an der ADR-Datei.
- [x] **`docs/adr/050-…:156` (D6-Überschrift „Expand-only") vs. Deploy-Reihenfolge – die Migration
      ist nicht expand-only, und es entsteht ein kurzes Schreib-Fenster.**
      `.github/workflows/deploy-gate.yml` migriert PRD **vor** dem Promote; dazwischen läuft der
      alte Build gegen `catalog_id NOT NULL`, `createItem` scheitert mit 23502 (von
      `runWithUniqueCheck` nicht übersetzt). Der Code ist in Ordnung – die **Aussage** war zu stark.

## Nitpicks (Runde 1)

- [x] `app/verwaltung/katalog/page.test.tsx:90` – `queryByText(/Montagsrunde/)` als AK7-Gegenprobe
      koppelt den Guard an einen Namen, den AK5 für änderbar erklärt; es existiert zudem ein
      echter Artikel „Essen Montagsrunde". Die Zeile darüber trägt die Aussage allein.
- [x] `db/catalog.test.ts:234` – `expect(standard.name).toBe("Montagsrunde")` ist gegen eine DB,
      auf der der einzige unterstützte Pflege-Weg „direkt umbenennen" ausgeübt wurde, rot.
- [x] ADR-050 D7 („`catalog.active` filtert nichts") hatte keinen Abwesenheits-Test, obwohl die
      Begründung ihn als testbar anführt.
- [ ] `docs/specs/spec-116-…:68` und `docs/specs/spec-137-…:11,36` nennen weiterhin
      `catalog_item_name_size_unique` bzw. `UNIQUE(name, size)` – ausgelieferte Specs sind
      Momentaufnahmen, **kein Handlungsbedarf**.
- [x] `db/catalog.test.ts:107` – der Test-Helfer `track(data, catalogId = STANDARD_CATALOG_ID)`
      nutzt den Default-Parameter, den ADR-050 D4 für die Data-Layer verbietet; für einen
      Testhelfer legitim, aber ein Kommentar erspart die nächste Diskussion.

## Positives (Runde 1)

- Der Migrations-Schnitt sitzt: hand-editierte Reihenfolge korrekt, WHY-Kommentar je Schritt mit
  AK-Bezug, `0012_snapshot.json` deckungsgleich mit dem hand-editierten SQL.
- Der Drift-Guard Konstante↔Migration ist lehrbuchmäßig gebaut (volle Anweisung als Anker, genau
  ein Treffer verlangt, beide Fail-closed-Richtungen als eigene Tests – #214 vollständig).
- Der AK9-Replay-Test ist sorgfältiger als verlangt (Wegwerf-Schema ohne `public` im
  `search_path`, echte divergenzerzeugende Aktion vor dem zweiten Lauf – #253 von selbst angewandt).
- AK4 ist in beiden Richtungen assertiert (#211), der alte spec-49-Duplikat-Test wurde
  **zusammengeführt** statt dupliziert (#240), AK6 hat eine Diskriminierungs-Kontrolle.
- Die Mock-Vervollständigung ist richtig erkannt: `vi.mock("@/db/catalog", …)` ersetzt das ganze
  Modul, also muss `STANDARD_CATALOG_ID` mitgeliefert werden – sonst hätten alle fünf
  Wiring-Assertionen gegen `undefined` geprüft.
- AK3/FS1 wird über einen Roh-`INSERT` an der Data-Layer vorbei belegt, nicht über die typisierte
  Signatur – nur so ist „fail-closed, unabhängig vom Aufrufweg" gezeigt.
- Der Client-Input-Pfad ist doppelt versperrt und getestet (`catalogId` aus `CatalogItemData`
  heraus-`Omit`tet, striktes `z.object`, `catalogId` **nach** dem Spread gesetzt).
- Scope-Disziplin und `PROJECT-CONTEXT §Fachdomäne` sauber fortgeschrieben (AK10), inklusive
  Stand-#59-Einordnung mitsamt Folge-Issues.
