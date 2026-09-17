# Review: Task 59

> Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur & Patterns) gegen
> `git diff origin/main...HEAD`, `docs/specs/spec-59-katalog-als-entitaet.md`,
> [ADR-050](../docs/adr/050-katalog-als-template-entitaet.md) und
> `tasks/task-59-preis-templates-veranstaltungstyp.md`.
>
> Geprüfter Umfang: 23 Dateien / +2422 −70. Alle 10 AK und alle 5 FS sind inhaltlich getroffen;
> keine Routen berührt → `docs/routes.md` zu Recht unverändert (#145).

## Kritische Findings (müssen behoben werden)

_Keine._ Weder Datenverlust noch Sicherheitslücke noch unerfülltes Akzeptanzkriterium gefunden.
Die Migrations-Reihenfolge (nullable → seed → backfill → NOT NULL → FK/Unique-Tausch) ist
korrekt, der Drift-Guard Konstante↔Migration ist fail-closed, und die beiden laut ADR-050 D5
katalog-frei zu haltenden Pfade (`db/verzehr.ts:74`, Freeze-Subquery in `db/veranstaltung.ts`)
sind tatsächlich unangetastet.

> **Rework-Stand (`/implement`, 2026-09-17):** alle fünf wichtigen Findings und vier der fünf
> Nitpicks sind behoben (Nitpick 4 war ausdrücklich ohne Handlungsbedarf). Details in den
> Rework-Notizen der Task-Datei.

## Wichtige Findings (sollten behoben werden)

- [x] **`app/verwaltung/katalog/actions.ts:66` (und `:77`) – `undefined`-Rückgabe der
      guarded UPDATEs wird nicht ausgewertet; die Action meldet Erfolg für einen Schreibvorgang,
      der nicht stattgefunden hat.**
      Dieser PR ändert `updateItem`/`setItemActive` auf `Promise<CatalogItem | undefined>` und
      nimmt den Parent-Key ins `WHERE` – `db/catalog.test.ts:342-359` belegt beide No-Match-Pfade
      ausdrücklich. `updateCatalogItemAction` reicht das Ergebnis aber nur durch
      `runWithUniqueCheck(() => …)` (Rückgabetyp `unknown`) und antwortet danach unbedingt
      `{ ok: true }` + `revalidatePath`. `id` stammt aus `FormData`, ist also client-gesteuert:
      ein `id`, das es nicht gibt, erzeugt heute eine falsche Erfolgsmeldung.
      Genau das Muster aus der Lesson „Guarded UPDATE bei Status-Transition-Actions:
      `undefined`-Rückgabe auswerten, nicht `{ok:true}` annehmen" (#55) und Kern-Kurzregel 1.
      Vor #59 war das Verhalten identisch, aber der Typ verschwieg es – der PR macht den Zweig
      erst sichtbar und testbar, also gehört der Guard hierher.
      *Hinweis:* `setCatalogItemActiveAction` gibt `void` zurück und hat keinen Meldungskanal –
      dort genügt, den Fall bewusst zu kommentieren oder auf #345 zu vertagen; behoben werden
      sollte mindestens `updateCatalogItemAction` (AK7 bleibt unberührt, weil der gültige
      Bedienweg unverändert bleibt).

- [x] **`db/catalog.test.ts:311-315` – der AK5-Test schreibt im `finally` den Katalognamen
      hart auf `"Montagsrunde"` zurück, statt den vorgefundenen Wert wiederherzustellen.**
      spec-59 erklärt das Umbenennen direkt in der DB zum **einzigen** unterstützten Pflege-Weg
      bis #345 – der Test überschreibt damit ausgerechnet die eine Datenänderung, die ein
      Betreiber in dieser Slice legitim vornimmt, und zwar unbemerkt bei jedem Suite-Lauf gegen
      dieselbe DB. Der Test, der die Rename-Sicherheit belegt, ist so selbst rename-feindlich.
      Fix: Namen vor dem Umbenennen lesen und exakt diesen Wert im `finally` zurückschreiben.

- [x] **`docs/adr/050-katalog-als-template-entitaet.md:139-154` (D5) – für die
      wertvollste Invariante des ADR existiert kein Regressionsguard.**
      D5 nennt die katalog-freien Pfade ausdrücklich als Schutz der abgeschlossenen
      Abrechnungen („Die Versuchung, `catalog_id` konsistent überall mitzuführen, ist der
      plausibelste Weg, in #346 Historie zu beschädigen"), und die Begründung des ADR behauptet,
      D5 sei „als Abwesenheits-Aussage formuliert und damit testbar". Der PR liefert diesen Test
      nicht: nichts schlägt fehl, wenn jemand `db/verzehr.ts:74` oder die Freeze-Subquery um eine
      `catalog_id`-Bedingung ergänzt. Ein Verhaltenstest ist hier möglich und nicht brittle:
      Artikel in K2 anlegen, per `adjustMenge` (Data-Layer, ohne Katalog-Prüfung) eine Position
      darauf erzeugen, dann assertieren, dass `listPositionen` sie weiterhin auflöst und der
      Abschluss ihren Preis einfriert. Ohne diesen Guard ist der teuerste Fehler, den #346 machen
      kann, unbewacht.

- [x] **`docs/adr/050-katalog-als-template-entitaet.md:306-315` – der Abschnitt „Bezug zu
      bestehenden ADRs" nennt ADR-026 und ADR-027 nicht, obwohl dieser PR die dort im Präsens
      beschriebene Mechanik ändert.**
      - `docs/adr/027-…:13`: „Das Katalogmodell trägt `name` **und** `size` mit
        `UNIQUE(name, size)`" – seit 0012 gilt `UNIQUE(catalog_id, name, size)`.
      - `docs/adr/027-…:25`: „`listActiveCatalog()` liefert bereits sortiert nach …" – die
        Funktion hat jetzt einen Pflichtparameter.
      - `docs/adr/026-…:21` und `:55`: `listActiveCatalog()` bzw. `getCatalogItem(catalogItemId)`
        im Ablaufschritt – ADR-026 D2 wird vom geänderten Kommentar in
        `app/veranstaltung/actions.ts:268` sogar ausdrücklich zitiert.
      Das ist der Fall aus der Lesson „PR ändert die von einer ADR namentlich beschriebene
      Mechanik → ADR-Beschreibung im selben PR mitpflegen" (#211, triggert auch ohne Änderung an
      der ADR-Datei). Günstigste Behebung: zwei Zeilen in ADR-050 § „Bezug zu bestehenden ADRs"
      (ADR-026/ADR-027: Signatur bzw. Unique-Regel seit D2/D4 fortgeschrieben) plus je ein
      „seit ADR-050"-Nachtrag an den vier Fundstellen.

- [x] **`docs/adr/050-…:156` (D6-Überschrift „Expand-only") vs. Deploy-Reihenfolge – die
      Migration ist nicht expand-only, und es entsteht ein kurzes Schreib-Fenster.**
      `.github/workflows/deploy-gate.yml:251` wendet `db:migrate:prd` an, **bevor**
      Zeile 256 `main → production` promotet. Zwischen beidem läuft der **alte** Build gegen das
      **neue** Schema. Lesen bleibt unberührt, aber `createItem(data)` des alten Codes setzt kein
      `catalog_id` – nach `ALTER COLUMN … SET NOT NULL` (Statement 5 derselben Migration)
      scheitert das mit 23502, was `runWithUniqueCheck` nicht abfängt (nur 23505) und als
      unbehandelter Server-Action-Fehler durchschlägt. Betroffen ist genau ein Bedienweg
      („Verwalter legt Artikel an") für die Dauer des Promote/Build.
      Der Code ist in Ordnung – die **Aussage** ist zu stark: `SET NOT NULL` ist ein
      constraining, kein expandierender Schritt. Da ADR-050 für #345/#346 als Präzedenzfall
      gelesen werden wird, sollte D6 den Trade-off in einem Satz benennen (Fenster bewusst in
      Kauf genommen, weil Freitags-/Randzeiten-Deploy und einstelliger Nutzerkreis) – oder das
      `SET NOT NULL` in eine Folge-Migration nach dem Deploy ziehen.

## Nitpicks (optional)

- [x] `app/verwaltung/katalog/page.test.tsx:90` – `queryByText(/Montagsrunde/)` als
      AK7-Gegenprobe koppelt den Guard an einen Namen, den AK5 ausdrücklich für änderbar erklärt;
      außerdem existiert ein echter Artikel „Essen Montagsrunde" (vgl. `CatalogFields.test.tsx:10`),
      sodass die Assertion bei einem realistischeren Fixture aus einem AK-fremden Grund bräche.
      Die Zeile darüber (`queryByLabelText(/Katalog/)`) trägt die Aussage bereits allein.
- [x] `db/catalog.test.ts:234` – `expect(standard.name).toBe("Montagsrunde")` ist gegen eine DB,
      auf der der einzige unterstützte Pflege-Weg „direkt umbenennen" ausgeübt wurde, rot. Als
      AK2-Beleg gegen eine frisch migrierte DB richtig, als Dauertest gegen die geteilte Dev-DB
      fragil. Gleiche Wurzel wie das zweite Wichtig-Finding – ggf. zusammen lösen (z. B. Assertion
      nur, wenn `updatedAt == createdAt`, oder explizit als Fresh-DB-Test markiert).
- [x] ADR-050 D7 („`catalog.active` filtert nichts") hat keinen Abwesenheits-Test, obwohl die
      Begründung ihn als testbar anführt. Ein Test „inaktiver Katalog → `listActiveCatalog`
      liefert seine Artikel weiterhin" würde das heutige Verhalten festnageln und #345 zwingen,
      den Flip bewusst vorzunehmen. Bewusst nur Nitpick: der Test ist per Konstruktion einer, den
      #345 wieder umdreht.
- [ ] `docs/specs/spec-116-…:68` und `docs/specs/spec-137-…:11,36` nennen weiterhin
      `catalog_item_name_size_unique` bzw. `UNIQUE(name, size)`. Ausgelieferte Specs sind
      Momentaufnahmen und werden im Repo üblicherweise nicht nachgezogen – nur der Vollständigkeit
      halber notiert, kein Handlungsbedarf (anders als bei den ADRs oben).
- [x] `db/catalog.test.ts:107` – der Test-Helfer `track(data, catalogId = STANDARD_CATALOG_ID)`
      nutzt genau den Default-Parameter, den ADR-050 D4 für die Data-Layer verbietet. Für einen
      Testhelfer legitim (der Compiler-Checklisten-Effekt für #346 hängt an der Produktions-
      signatur), aber ein kurzer Kommentar „bewusst nur im Test" erspart die nächste Diskussion.

## Out-of-Scope-Funde

- **Issue [#347](https://github.com/nothra/tch-gastro-services/issues/347)** (`bug`, `test`) –
  Flaky Integrationstests: `db/veranstaltung.test.ts:40` und `db/verzehr.test.ts:46` legen beide
  `__test__Cola` mit leerer Größe im selben Katalog an; bei paralleler Dateiausführung kollidieren
  sie auf der Unique-Constraint. Vorbestehend (unter der alten globalen `UNIQUE(name, size)`
  identisch möglich), daher nicht in diesem PR zu beheben. Deckt sich mit Befund 2 der
  Implementierungs-Notizen.
  > **Korrektur (`/implement`, dritte Runde):** diese Einordnung wurde **verworfen** und #347
  > hier behoben. Gemessen: mit dem Rework ist die Suite in **3 von 3** Läufen gegen eine frische
  > DB rot (auf HEAD: 2 von 3) – der W3-Guard macht die vorbestehende Kollision deterministisch.
  > Ein roter Integrationslauf hätte `/test`/`/refactor`/`/security-review` einen wertlosen Gate
  > hinterlassen (`pre-push` läuft ohne `DATABASE_URL` und überspringt genau diese Blöcke).
  > Fix ist test-only: eigenes Namensfenster je Testdatei. Begründung und Messung in der
  > Task-Datei.
- Befund 1 der Implementierungs-Notizen (driftende lokale Dev-DB ohne die 0004-Referenzliste) ist
  ein Umgebungsproblem ohne Repo-Auslöser – korrekt als „nicht behoben" eingeordnet, weder Issue
  noch `kleinfunde.md`-Eintrag nötig.

## Positives

- **Der Migrations-Schnitt ist der schwierigste Teil und sitzt.** Die hand-editierte Reihenfolge
  nullable → seed → backfill → `SET NOT NULL` → FK → Unique-Tausch ist korrekt, jeder Schritt
  trägt einen WHY-Kommentar mit AK-Bezug, und der drizzle-Snapshot
  (`0012_snapshot.json`) stimmt mit dem hand-editierten SQL überein (`catalog_id` `notNull: true`,
  neue Unique-Constraint vorhanden, alte verschwunden) – genau die Stelle, an der eine
  hand-editierte Migration sonst stillschweigend vom Generator-Zustand abdriftet.
- **Der Drift-Guard Konstante↔Migration ist lehrbuchmäßig gebaut:** Anker ist die **volle**
  Anweisung statt eines Fragments (#114 ff.), `statementStartingWith` verlangt **genau einen**
  Treffer, und beide Fail-closed-Richtungen sind eigene Tests (`should_throw_when_migration
  SourceUnreadable`, `should_throw_when_anchoredStatementAbsent`) – die Lesson
  „Kopplungs-/Drift-Guard braucht je Seite einen Negativtest" (#214) ist vollständig umgesetzt.
- **Der AK9-Replay-Test ist sorgfältiger als verlangt:** Wegwerf-Schema mit `search_path` **ohne**
  `public` (eine falsch zielende Anweisung schlägt fehl statt Produktionsdaten zu treffen),
  Anweisungen unverändert aus der Migrationsdatei gelesen, und – das entscheidende Detail – eine
  echte divergenzerzeugende Aktion (Rename + Umzuordnung + neuer unzugeordneter Artikel) **vor**
  dem zweiten Lauf, sodass „nichts kaputt gemacht" von „nichts zu tun gehabt" unterscheidbar ist.
  Das ist exakt die Lesson aus #253, hier von selbst angewandt.
- **AK4 ist in beiden Richtungen assertiert** (#211) und der alte spec-49-Duplikat-Test wurde
  **zusammengeführt** statt als zweite Variante daneben stehen zu lassen (#240) – inklusive
  Kommentar, der die Zusammenführung erklärt. Ebenso hat AK6 eine Diskriminierungs-Kontrolle
  (gleicher Artikel im eigenen Katalog ist ein Treffer), sodass das `undefined` nicht aus einem
  generell kaputten Lesepfad stammen kann.
- **Die Mock-Vervollständigung ist richtig erkannt worden:** `vi.mock("@/db/catalog", …)` ersetzt
  das ganze Modul, also muss `STANDARD_CATALOG_ID` mitgeliefert werden – sonst hätten alle fünf
  Wiring-Assertions gegen `undefined` geprüft und wären wertlos gewesen. Der Soll-Wert steht
  jeweils als **Literal** im Test, nicht aus dem Mock gelesen (Testing-Standards), und der
  Drift-Guard hält das Literal gegen Produktionskonstante und Migration.
- **AK3/FS1 wird über einen Roh-`INSERT` an der Data-Layer vorbei belegt**, nicht über die
  typisierte Signatur – nur so ist „fail-closed, unabhängig vom Aufrufweg" tatsächlich gezeigt.
- **Der Client-Input-Pfad ist doppelt versperrt und getestet:** `catalogId` ist aus
  `CatalogItemData` heraus-`Omit`tet, `catalogItemSchema` ist ein striktes `z.object` (unbekannte
  Keys werden gestrippt), und `createItem` setzt `catalogId` **nach** dem Spread.
  `should_neverTakeCatalogFromFormData_when_clientSendsCatalogId` prüft beides statt es nur
  zu behaupten.
- **Scope-Disziplin:** keine Routen, kein Zod-Feld, keine UI-Änderung, `db/verzehr.ts` und
  `db/veranstaltung.ts` unangetastet, `docs/routes.md` zu Recht nicht angefasst. Der
  `next dev`-Autoblock in `CLAUDE.md` wurde aktiv aus dem Diff entfernt (Lesson #337).
- **PROJECT-CONTEXT §Fachdomäne** ist inhaltlich sauber fortgeschrieben (AK10) und benennt den
  Stand #59 („genau ein geseedeter Katalog") mitsamt Folge-Issues – die Doku sagt also nicht mehr,
  als der Code hergibt.

## Empfehlung

NEEDS_REWORK

Keine kritischen Findings – der Kern (Schema, Migration, Data-Layer, Wiring) ist belastbar und
überdurchschnittlich gut getestet. Die fünf wichtigen Findings sind durchweg klein und lokal:
ein fehlender `undefined`-Guard in einer Action, ein Testhelfer, der fremde Daten überschreibt,
ein fehlender Regressionsguard für die von ADR-050 selbst als teuerste bezeichnete Invariante
(D5) und zwei Doku-Genauigkeits-Korrekturen an ADR-050/026/027.

## Hinweis an den nächsten Schritt

Im Worktree lagen vier gitignorete Wegwerf-Skripte aus `/implement` und diesem Review
(`scripts/e2e-59.tmp.sh`, `scripts/gate-59.tmp.sh`, `scripts/tc59.tmp.sh`,
`scripts/review59-issue.tmp.sh`). Sie sind nicht getrackt, können aber verzeichnisweite
Content-Scan-Guards in `run-tests.sh` fälschlich rot machen (Lesson aus #312/#339) – vor dem
nächsten Suite-Lauf entfernen. **Erledigt** in der dritten `/implement`-Runde; die dort neu
angelegten Wegwerf-Skripte sind nach Gebrauch ebenfalls entfernt. „Artefakte entfernt" ist eine
Momentaufnahme – vor jedem Suite-Lauf erneut per `git status --ignored` prüfen (#339).
