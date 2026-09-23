# Review: Task 351

Diff-Scope: `git diff origin/main...HEAD` – `db/catalog.test.ts` (+77/−10),
`docs/specs/spec-351-…md` (neu), `tasks/task-351-…md` (neu). Kein Produktionscode.

## Kritische Findings (müssen behoben werden)

- [x] **(Runde 3)** `tasks/INTERRUPT-351.md` – Das transiente Interrupt-Sentinel liegt im
      **PR-Diff**. Eingebracht hat es Commit `eb7cd0d` (ein `/refactor`-Commit, dessen Message
      weder das Sentinel noch `tasks/interrupt-log.jsonl` erwähnt); der Working Tree hat die
      Löschung bereits vorgenommen, aber **uncommittet** – der Branch trägt die Datei weiterhin.
      Belegt, warum das nicht nach `main` darf: `scripts/metrics.sh:37` zählt offene Interrupts
      per `find … -name 'INTERRUPT-*.md'` (Kennzahl in jedem Clone dauerhaft +1);
      `scripts/factory-poll.sh:180` liest die Dateiexistenz als „Interrupt statt Fehler" und
      labelt jeden fehlgeschlagenen Async-Lauf zu #351 `factory::interrupted` statt
      `factory::failed`; `scripts/run-pipeline.sh:336-342` löscht das Sentinel im Pre-flight per
      `rm -f` – bei einer **getrackten** Datei erzeugt genau das einen unsauberen Working Tree
      und damit den `INCOMPLETE_OUTCOME`-Guard „Working Tree nicht sauber" (vgl.
      `tasks/interrupt-log.jsonl`, Eintrag zu #315), also einen selbstverstärkenden Zustand.
      Auf `origin/main` liegt bei 490 getrackten `tasks/`-Dateien **kein einziges**
      `INTERRUPT-*.md` – die Konvention ist eindeutig, nur nicht erzwungen.
      **Fix in diesem PR:** die vorhandene Löschung committen (`git rm`/`git add -A tasks/`),
      Diff muss `tasks/INTERRUPT-351.md` **nicht** mehr enthalten. `tasks/interrupt-log.jsonl`
      bleibt dagegen korrekt im Diff – der append-only Log ist laut `.gitignore:27` bewusst
      getrackt. Die `.gitignore`-Härtung selbst ist out-of-scope → **Issue #359**.

## Wichtige Findings (sollten behoben werden)

- [x] **(Runde 3)** `docs/factory/kleinfunde.md:409` – Der im `/codify`-Schritt dieses PRs
      angelegte Eintrag behauptet, die Konvention sei „aktuell an allen **vier** `push`-Stellen
      (`:138`, `:481`, `:558`, `:632`) eingehalten". Tatsächlich sind es **fünf**:
      `grep -c "createdCatalogs.push" db/catalog.test.ts` liefert `5`, die fehlende Stelle ist
      `:588` (`should_allowEmptyCatalogDuplication_when_sourceHasNoActiveArticles`). Die
      Schlussfolgerung bleibt richtig – auch `:588` trägt einen frisch duplizierten Katalog ein,
      nie `STANDARD_CATALOG_ID` –, aber die Behauptung „alle vier" ist als Vollständigkeits-
      aussage falsch und steht in einer kuratierten Datei, die den PR überlebt. Sie widerspricht
      zudem dem „Positives"-Abschnitt dieses Reports (`:85-88`), der korrekt fünf Stellen nennt.
      Besonders relevant, weil derselbe Commit (`da0fb30`) die Lesson zu #291 um genau die Regel
      erweitert, dass die im Eintrag zitierten Anker den **gesamten** behaupteten Sachverhalt
      abdecken müssen. **Fix:** „vier" → „fünf" und `:588` in die Aufzählung.

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
- [ ] **(Runde 2)** `docs/factory/kleinfunde.md:388-389` – Der neue Eintrag ankert auf
      `db/veranstaltung.test.ts:112-116`; dieser Bereich enthält den Katalog-Kommentar (`:112-113`)
      und das `catalog`-`DELETE` (`:114-116`). Die zweite Hälfte der „Was"-Behauptung
      („`catalog_item` aber ausschließlich über die `createdItems`-ID-Liste") steht bei
      `:109-111` und liegt damit **außerhalb** des zitierten Ankers. Korrekt wäre `:109-116`.
      Ein Zeichen Fix; die Lesson „`kleinfunde.md`-Eintrag mit `Datei:Zeile`-Ankern, im selben
      PR angelegt, braucht denselben Drift-Check" (#291) zielt genau darauf.
- [ ] **(Runde 2)** `tasks/task-351-…md:48` – Die Task-Datei nennt weiterhin
      `db/catalog.test.ts:521` für `should_copyOnlyActiveArticles_when_duplicateCatalogIsCalled`
      (heute `:538`). Inhaltlich richtig als Vor-Fix-Anker, aber die Spec hat für genau diese
      Situation im Rework einen Disclaimer bekommen – dieselbe Zeile im Task-Log nicht. Wenn
      der Hinweis dort sinnvoll war, ist er hier symmetrisch fällig (oder der Anker wird auf
      `:538` gezogen). Reines Doku-Log, kein Verhalten.
- [ ] **(Runde 2)** `db/catalog.test.ts:169-171` – Die Sicherheit der generischen Löschung ruht
      vollständig auf der Zusicherung im Kommentar („`createdCatalogs` … nie
      `STANDARD_CATALOG_ID`"). Sie stimmt heute (alle vier `push`-Stellen `:138`, `:481`, `:558`,
      `:632` tragen frisch angelegte bzw. duplizierte Kataloge ein – erneut nachgezählt), ist
      aber von nichts erzwungen; gerät der Standard-Katalog je in die Liste, löscht das
      `afterEach` den kompletten geseedeten Referenzbestand der Entwickler-DB. Eine Zeile machte
      daraus fail-closed statt Konvention, z. B. vor dem `DELETE`:
      `expect(catalogIds).not.toContain(STANDARD_CATALOG_ID)`. Bewusst als Nitpick und nicht als
      Wichtig eingestuft: kein erreichbarer Auslöser, und die Spec begrenzt den Scope – bei
      Nicht-Umsetzung gehört der Gedanke eher nach `kleinfunde.md` als in einen Rework.

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

APPROVED (Runde 2)

Das einzige Wichtig-Finding aus Runde 1 ist behoben, alle drei Nitpicks sind mitgelaufen, und
die Rework-Änderungen sind – wie behauptet – rein textuell (Dateikopf, ein Kommentar-Halbsatz,
drei lokale Variablennamen, ein Spec-Hinweisblock). Die drei neu ergänzten Nitpicks sind
optional und kein Rework-Grund.

**Verdict-Historie:** Runde 1 = NEEDS_REWORK (siehe „Rework Runde 1" unten).

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

## Runde 2 – Nachprüfung des Rework (`/review`, 2026-09-23)

Diff-Scope erneut `git diff origin/main...HEAD`: `db/catalog.test.ts`, `docs/factory/kleinfunde.md`,
`docs/specs/spec-351-…md`, `tasks/task-351-…md`, `tasks/review-351.md`. Kein Produktionscode.

**Runde 1 · Backend/Logik**

- **Wichtig-Finding geschlossen.** Der Dateikopf (`:28-33`) nennt jetzt beide Aufräumwege und
  trägt das Sicherheitsargument selbst. Die Formulierung „nur selbst angelegte Zeilen … Artikel
  per id sowie generisch alle Artikel der im Lauf angelegten Kataloge" deckt den tatsächlichen
  Radius von `cleanupCreatedRows()` – die `duplicateCatalog`-Kopien entstehen im Lauf, sind also
  „selbst angelegt".
- **Mitgenommene AK9-Aussage unabhängig verifiziert**, nicht nur gelesen: `CREATE SCHEMA` steht
  bei `:699`, `DROP SCHEMA … CASCADE` bei `:762`, `SET search_path` ohne `public` bei `:703`.
  Die Kopf-Behauptung ist damit eine geprüfte Tatsachenbehauptung, kein übernommener Satz
  (Lesson „X erzwingt Y", #319/#59).
- **Mutationssensitivität der Regression erneut durchgespielt** (statisch): Ohne `:171` bleibt
  die Kopie in `catalog_item` stehen, `:172` läuft in den Pflicht-FK → `cleanupCreatedRows()`
  rejected → `should_deleteCopiedArticles_when_cleanupRunsAfterDuplicateCatalog` **und** der
  bestehende `should_copyOnlyActiveArticles_…` fallen. AK5 bleibt belegt.
- **Kein neuer Fehlerpfad durch das Rework**: `created`/`createdCatalogs` werden weiter erst
  gespliced und dann gelöscht (Muster unverändert aus `main` übernommen, auch in der
  Schwesterdatei) – keine Regression dieses PRs.

**Runde 2 · Code-Qualität**

- Alle drei Runde-1-Nitpicks sind umgesetzt und nicht nur abgehakt: `remainingItems` /
  `remainingCatalogs` / `remaining` (`:640,646,663`), der korrigierte Konjunktiv-Halbsatz
  (`:655-656`), der Vor-Fix-Hinweisblock in der Spec (`:5-7`).
- Test-Namen folgen weiter `should_…_when_…`; Arrange-Act-Assert eingehalten; die
  Vorbedingungs-Assertion gegen Vakuum-Grün (`:636`) ist unverändert erhalten.
- Neu gefunden: drei Nitpicks (oben, mit „(Runde 2)" markiert) – Anker-Präzision im eigenen
  `kleinfunde.md`-Eintrag, fehlender Vor-Fix-Disclaimer im Task-Log, optionaler Fail-closed-Guard
  auf `STANDARD_CATALOG_ID`.

**Runde 3 · Architektur & Patterns**

- Keine Schicht-Verletzung: `db/catalog.ts` bleibt unangetastet (per Diff belegt), geändert ist
  ausschließlich Testinfrastruktur. Keine Route, keine `page.tsx`/`route.ts` → `docs/routes.md`
  ist korrekt nicht betroffen (#145).
- ADR-050 D2 (Pflicht-FK ohne `ON DELETE`) wird weiterhin respektiert statt umgangen – die
  Reihenfolge Artikel → Kataloge ist der Fix, nicht ein `CASCADE`.
- Der Kleinfund-Eintrag zur Asymmetrie mit `db/veranstaltung.test.ts` ist korrekt angelegt
  (alter AK9-Eintrag **gelöscht**, nicht abgehakt – Regel aus dem `kleinfunde.md`-Kopf; neuer
  Eintrag am Dateiende, Anker `db/catalog.test.ts:163-172` nachgerechnet und korrekt).

**Gates in dieser Runde selbst gefahren:** `pnpm lint` (exit 0), `pnpm format:check`
(„All matched files use Prettier code style!"), `pnpm exec tsc --noEmit` (exit 0).

**Nicht verifizierbar in dieser Session:** die DB-gestützten AK1/AK2/AK3/AK5. `DATABASE_URL`
ist im Worktree nicht gesetzt (`.env.local` fehlt, bekannte Lücke #228/#236), die
`describe.skipIf(!hasDb)`-Blöcke werden also übersprungen. Die Belege stammen unverändert aus
dem `/implement`-Lauf; das strukturelle Risiko daraus ist bereits als **Issue #357** verankert
(CI setzt kein `DATABASE_URL`, kein Gate schützt die neuen Tests gegen Regression).

## Rework Runde 3 (behoben, `/refactor` 2026-09-23)

- **Kritisch-Finding (Interrupt-Sentinel im Diff):** `tasks/INTERRUPT-351.md` war im Working
  Tree bereits gelöscht, aber uncommittet. Löschung jetzt gestaged/committet – der Branch
  trägt die Datei nicht mehr, `tasks/interrupt-log.jsonl` bleibt unverändert getrackt.
- **Wichtig-Finding (Zählfehler `kleinfunde.md:409`):** „vier" → „fünf", fehlende Stelle
  `:588` in die Aufzählung ergänzt (`:138`, `:481`, `:558`, `:588`, `:632`) – gegen
  `grep -c "createdCatalogs.push" db/catalog.test.ts` (liefert `5`) nachgezählt.
- **Kein Verhaltensunterschied:** beide Fixes sind Doku-/Git-Housekeeping, kein Produktions-
  oder Testcode geändert.
