# Review: Task 351

Diff-Scope: `git diff origin/main...HEAD` – `db/catalog.test.ts` (+77/−10),
`docs/specs/spec-351-…md` (neu), `tasks/task-351-…md` (neu). Kein Produktionscode.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] `db/catalog.test.ts:28-29` – Der Dateikopf behauptet weiterhin „Tests sind
      nicht-destruktiv: sie räumen nur die selbst angelegten Zeilen **per id** wieder ab und
      lassen den geseedeten Referenzbestand unangetastet." Genau das stimmt seit diesem PR
      nicht mehr: `cleanupCreatedRows()` löscht zusätzlich **per `catalog_id`** jede
      `catalog_item`-Zeile in einem getrackten Katalog – unabhängig davon, wer sie angelegt
      hat (das ist der ganze Punkt des Fixes). Dass der Referenzbestand sicher bleibt, trägt
      jetzt ein anderes Argument (`createdCatalogs` enthält nie `STANDARD_CATALOG_ID`), und
      dieses Argument steht nur an der neuen Zeile (`:165-166`), nicht im Kopf. Der PR
      verursacht die Drift selbst → gehört in denselben PR (Lessons „PR ändert die von einer
      Doku beschriebene Mechanik → Prosa im selben PR nachziehen", #211/#176).
      **Fix:** „per id" im Kopf durch die tatsächliche Regel ersetzen, z. B. „… räumen nur
      selbst angelegte Zeilen ab – Artikel per id sowie generisch alle Artikel der im Lauf
      angelegten Kataloge (#351); der geseedete Standard-Katalog steht nie in dieser Liste."
      **Mitnahme-Hinweis:** `docs/factory/kleinfunde.md` → „`db/catalog.test.ts`-Dateikopf
      behauptet ‚nicht-destruktiv‘, der AK9-Replay macht DDL" betrifft **denselben Satz**.
      Da die Datei hier ohnehin angefasst wird, greift die Mitnahme-Regel aus dem
      `kleinfunde.md`-Kopf – beide Korrekturen in einem Zug, danach den Kleinfund-Eintrag
      löschen (nicht abhaken).

## Nitpicks (optional)

- [x] `db/catalog.test.ts:636,642,658` – `verbliebeneArtikel`, `verbliebeneKataloge`,
      `verblieben` sind die einzigen deutschsprachigen lokalen Variablen der Datei; das
      Umfeld benennt Test-Locals englisch (`copied`, `found`, `itemsNamedLikeSource`,
      `allWithTargetName`, `matches`). Deutsch ist hier auch kein Ubiquitous-Language-Begriff
      (anders als `Veranstaltung`/`Teilnehmer`), sondern reine Testmechanik →
      `remainingItems` / `remainingCatalogs`.
- [x] `db/catalog.test.ts:650-652` – Der Kommentar sagt, die generische Löschung „trifft ihn
      ein zweites Mal"; zu diesem Zeitpunkt existiert die Zeile nicht mehr, das zweite DELETE
      trifft **null** Zeilen. Der Folgesatz sagt es richtig – der erste Halbsatz widerspricht
      ihm. Ein Wort genügt („… würde ihn ein zweites Mal treffen, falls er noch existierte").
- [x] `docs/specs/spec-351-…md:7,8,13,33` – Die `Datei:Zeile`-Anker (`:121`, `:151`, `:521`)
      beschreiben korrekt den **Vor-Fix-Stand** (nachgerechnet: `:521` + 13 eingefügte Zeilen
      = heutige `:534`). Nach dem Merge liest sich das wie Drift. Ein Halbsatz im Kontext
      („Zeilennummern beziehen sich auf den Stand vor dem Fix") verhindert, dass eine spätere
      Runde die Spec fälschlich als veraltet einstuft.

## Positives

- **Fix-Richtung sauber umgesetzt.** Die in `/requirements` entschiedene generische Variante
  (`catalog_id IN createdCatalogs`) statt punktuellem `track()`-Nachtragen ist exakt so
  gebaut, inklusive der korrekten Reihenfolge Artikel → Kataloge (ADR-050 D2 unabhängig
  gegen Migration `0012_catalog_als_entitaet.sql:33` geprüft: `ON DELETE no action` – die
  Kommentar-Behauptung stimmt).
- **`cleanupCreatedRows()` extrahiert statt nachgebaut.** Der Regressionstest fährt damit den
  **vollen** `afterEach`-Codepfad – genau die Lesson „Mutationsbeleg muss denselben
  Assert-Ausdruck ausführen" (#286) wurde hier aktiv angewandt, nicht nur zitiert.
- **Vorbedingungs-Assertion gegen vakuum-grün.** `expect(await listCatalog(copy.catalog.id))
  .toHaveLength(1)` (`:632`) stellt sicher, dass der Testfall den Defekt überhaupt berührt –
  ohne sie wäre der Test still grün, sobald `duplicateCatalog` nichts mehr kopiert.
- **Sicherheitsargument der generischen Löschung unabhängig nachgeprüft und korrekt.** Alle
  fünf `createdCatalogs.push`-Stellen (`:134`, `:477`, `:554`, `:584`, `:628`) tragen
  ausschließlich frisch angelegte bzw. duplizierte Kataloge ein, nie `STANDARD_CATALOG_ID` –
  der geseedete Referenzbestand kann nicht in den Löschradius geraten.
- **Mutationsbeleg an der vollen Aufrufzeile** mit Anker-Zählung vorher (1×) / nachher (0×)
  statt Fragment-Grep – vermeidet das Rezidiv-Muster aus #310/#286.
- **Scope strikt eingehalten:** `db/catalog.ts` unangetastet, die zwei nicht betroffenen
  Duplizier-Tests unverändert (AK4 per Diff belegt), kein Schema-/CI-Eingriff.
- **AK3 ist ein echter Testfall**, kein Prosa-Argument: der doppelt erfasste Artikel wird
  tatsächlich über beide Wege adressiert.

## Out-of-Scope-Findings (außerhalb dieses PRs verankert)

- **Issue #357** (oberhalb der Schwelle, ADR-043): `factory-ci.yml` setzt kein `DATABASE_URL`
  und stellt keinen Postgres-Service bereit – alle `describe.skipIf(!hasDb)`-Blöcke werden in
  CI übersprungen. Damit laufen **beide neuen Tests dieses PRs nie in CI**; AK1/AK3/AK5 sind
  ausschließlich durch einen lokalen, manuellen Lauf belegt, kein Gate schützt sie gegen
  Regression. Die Spec benennt den Zustand als „separat zu behandeln", ohne ihn zu verankern –
  genau das Muster der Lesson „Als ‚separat geflaggt‘ markierter Fund bleibt Session-Notiz".
  Jetzt kanonisch als Issue (`enhancement` + `test,factory-pipeline`).
- **`docs/factory/kleinfunde.md`** (unterhalb der Schwelle, ~4 Zeilen): `db/veranstaltung.test.ts:112-116`
  hat dieselbe FK-Lücke im `afterEach`. Heute folgenlos (die Datei erzeugt Artikel nur über
  `trackItem`), aber latent und nach diesem PR asymmetrisch zur Schwesterdatei.

## Empfehlung

NEEDS_REWORK

Kein kritischer Fund – die Änderung ist inhaltlich richtig, gut begründet und sauber belegt.
Rework-Grund ist allein das Wichtig-Finding: der PR macht den eigenen Dateikopf faktisch
falsch. Das ist ein Zweizeiler und sollte zusammen mit dem Kleinfund zum selben Satz erledigt
werden; die Nitpicks können dabei mitlaufen.

## Rework Runde 1 (behoben, `/implement` 2026-09-23)

- **Wichtig-Finding (Dateikopf):** `db/catalog.test.ts:25-33` neu formuliert. Der Kopf nennt
  jetzt beide Aufräumwege („Artikel per id sowie generisch alle Artikel der im Lauf angelegten
  Kataloge (#351)") und trägt das Sicherheitsargument selbst („der geseedete Standard-Katalog
  steht nie in dieser Liste").
- **Mitnahme Kleinfund (derselbe Satz):** Im selben Zug die AK9-Replay-Ausnahme ergänzt
  („legt ein Wegwerf-Schema an und verwirft es wieder … die Suite braucht Schema-Rechte").
  Der Eintrag „`db/catalog.test.ts`-Dateikopf behauptet ‚nicht-destruktiv‘, der AK9-Replay
  macht DDL" ist in `docs/factory/kleinfunde.md` **gelöscht** (nicht abgehakt, Regel im
  Datei-Kopf dort).
- **Nitpick Variablennamen:** `verbliebeneArtikel`/`verbliebeneKataloge`/`verblieben` →
  `remainingItems`/`remainingCatalogs`/`remaining`.
- **Nitpick Kommentar-Widerspruch:** „trifft ihn ein zweites Mal" → „würde ihn ein zweites Mal
  treffen, falls er noch existierte".
- **Nitpick Spec-Anker:** Hinweis-Block im Spec-Kontext ergänzt, dass alle `Datei:Zeile`-Anker
  den Vor-Fix-Stand beschreiben.
- **Kein Verhaltensänderung:** nur Kommentar-/Doku-Text und lokale Test-Variablennamen; die
  neue generische Lösch-Zeile und beide neuen Tests sind unverändert.
- **Folge-Drift mitgezogen:** Der neu angelegte `veranstaltung.test.ts`-Kleinfund verwies auf
  `db/catalog.test.ts:159-168`; durch den vier Zeilen längeren Dateikopf jetzt `:163-172`.
