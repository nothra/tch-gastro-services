# Review: Task 352

**Runde 4** gegen den Stand nach der manuellen Rework-Runde 3 (Commit `b7ff76e`), die nach dem
Circuit Breaker (3x `NEEDS_REWORK` in Folge, Runde 3) außerhalb von `run-pipeline.sh` per
menschlicher Entscheidung + manuellem `/implement`-Aufruf entstand. Diff-Scope:
`git diff origin/main...HEAD` (19 Dateien, +2386/−11). Gegenprüfung gegen
`docs/specs/spec-352-veranstaltung-bearbeiten-loeschen.md` (AK1–AK12, FS1–FS6) und
`tasks/task-352-veranstaltung-bearbeiten-loeschen.md` (insb. Abschnitt „Manuelle Runde 4"). Drei
Personas (Backend/Logik, Code-Qualität, Architektur), jede mit eigenem Lesezugriff auf Diff, Task-
Datei, Spec und relevante ADRs; jede Tatsachenbehauptung wurde von der jeweiligen Persona selbst
gegen den Code nachgeprüft (u. a. Guard-Reihenfolge, `kassierSummen.ts`-Aggregation je
Veranstaltung, fehlendes `requireRole` in `adjustVerzehrByTokenAction`).

**Vorbedingung dieser Runde:** Die manuelle Rework-Runde 3 lag bereits committet und gepusht vor
(`b7ff76e`), alle Gates lokal grün (Lint, Typecheck/`pnpm build`, Format, `routes-doc-check`,
Vitest **1074/1074** inkl. DB-Integrationstests via `dotenv -e .env.local`).

Die Findings der Runden 1–3 stehen unverändert weiter unten unter „Historie"; die
Überschriften hier oben tragen den **aktuellen** Stand.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle drei Personas bestätigen unabhängig: keine kritischen Findings in diesem Diff.

## Wichtige Findings (sollten behoben werden)

_Keine._ Alle drei aus Runde 3 offenen Wichtig-Findings sind geschlossen:

- **Finding 1** (`VeranstaltungMetaForm.tsx:73`, Reset feuert trotz blockierter Validierung) —
  behoben: Reset-Handler sitzt jetzt am `onSubmit` des `<form>` statt am `onClick` des Buttons.
  Neuer Test `should_keepSuccessMessageHidden_when_submitClickedWhileRequiredFieldInvalid`
  (`VeranstaltungMetaForm.test.tsx:133-150`), per Mutationsbeleg (Rückbau auf `onClick`) als
  trennscharf verifiziert.
- **Finding 2** (`kasse` ohne Sperre beim Bearbeiten) — Nutzer-Entscheidung **2a: dokumentieren,
  nicht sperren**. WHY-Kommentar in `updateVeranstaltungMetaAction` (`actions.ts:191-197`)
  ergänzt; die Backend/Logik-Persona hat die fachliche Begründung (Kasse hängt an der
  Veranstaltung, nicht an der Zeile, `kassierSummen.ts`) gegen den Code verifiziert und für
  korrekt befunden.
- **Finding 3** (TOCTOU beim Löschen) — Nutzer-Entscheidung **3b: Restrisiko bewusst
  akzeptieren**. WHY-Kommentar bei `deleteVeranstaltungAction` (`actions.ts:243-254`) adressiert
  jetzt die Unumkehrbarkeit direkt (statt nur auf die #346-UPDATE-Konsistenz zu verweisen); die
  Architektur-Persona hat geprüft, dass dies keinen neuen ADR-Trigger auslöst (keine der vier
  Kategorien aus `docs/specs/spec-002-adr-auto-detection.md` trifft zu – reine Präzisierung einer
  bereits akzeptierten Race-Toleranz, keine neue Persistenz-/Architekturentscheidung).

## Nitpicks (optional)

- [ ] `app/veranstaltung/actions.ts:243-291` (`deleteVeranstaltungAction`) — Header-Kommentar
      (inkl. dem in dieser Runde ergänzten Restrisiko-Absatz) + Funktionskörper bilden zusammen
      einen ~64-Zeilen-Block, der auf einen Blick schwer scannbar ist. Vorbestehend aus Runde 1
      (Funktion war schon vorher lang), durch den neuen Absatz weiter gewachsen. Eine Aufteilung
      der drei Sperr-Checks in eigene Guard-Funktionen würde der Klarheit dienen, wäre aber
      Scope-Erweiterung.
- [ ] `app/veranstaltung/actions.ts:183-197` — Der neue Absatz zu `kasse` (Z. 191-197) ist mit
      dem bestehenden Absatz davor (Z. 183-189) thematisch verwandt, aber durch eine Leerzeile in
      zwei Blöcke getrennt statt mit gemeinsamem Einleitungssatz zusammengefasst. Sehr geringes
      Gewicht.
- [ ] `app/veranstaltung/[id]/VeranstaltungMetaForm.test.tsx:133-150` — Der neue Test enthält
      zwei Act/Assert-Zyklen (`user.clear` + Assert, dann `user.click` + Assert) statt einer
      einzelnen AAA-Sequenz. Die erste Assertion dient nur als Vorbedingung für den eigentlichen
      Zielfall; ein Kommentar könnte das klarer als „Vorbedingung, nicht Ziel" markieren.
- [ ] `tasks/task-352-veranstaltung-bearbeiten-loeschen.md` (Abschnitt „Manuelle Runde 4") — Die
      beiden Risikoakzeptanz-Entscheidungen folgen inhaltlich sauber begründet, aber nicht dem
      kanonischen Ablehnungs-Protokoll-Format `Nicht-ADR [Datum]: [Entscheidung] – bewusst kein
      ADR (Begründung: [...])` aus dem ADR-Trigger-Check. Reine Formatkonsistenz, kein
      inhaltlicher Mangel.
- [ ] `app/veranstaltung/actions.ts:216-217` — *(aus Runde 3 unverändert übernommen, siehe
      Historie unten – Tatsachenbehauptung zur `.returning()`-Quelle bei
      `adjustVerzehrByTokenAction` weiterhin ungenau.)*
- [ ] `app/veranstaltung/actions.ts:116-118` — *(aus Runde 3 unverändert übernommen, siehe
      Historie unten – „dieselbe Reihenfolge wie `setVeranstaltungCatalogAction`" stimmt nur für
      zwei von drei Schritten.)*
- [ ] `app/veranstaltung/labels.test.ts:31-35` — *(aus Runde 3 unverändert übernommen, siehe
      Historie unten – Zeitzonen-Test ohne Trennschärfe in der realen Runner-TZ.)*
- [ ] `e2e/veranstaltung-bearbeiten-loeschen.spec.ts:26-28` — *(aus Runde 3 unverändert
      übernommen, siehe Historie unten – Restdrift im Dateikopf-Kommentar zu `LAUF`.)*
- [ ] `docs/adr/023-veranstaltung-datenmodell.md:131-134` — *(aus Runde 3 unverändert übernommen,
      siehe Historie unten – D6-Funktionsliste bereits vor #352 veraltet.)*
- [ ] `docs/routes.md:29` — *(aus Runde 3 unverändert übernommen, siehe Historie unten –
      Detailseiten-Beschreibung nicht um „Metadaten bearbeiten"/„Löschen" ergänzt.)*

## Positives

- **Alle drei Wichtig-Findings aus Runde 3 sind vollständig und nachvollziehbar geschlossen** –
  eines per Code-Fix mit Mutationsbeleg, zwei per begründeter, im Code UND in der Task-Datei
  verankerter Risikoakzeptanz. Keine der beiden Akzeptanzen ist eine bloße Behauptung: beide
  wurden von den Review-Personas gegen den echten Code nachgerechnet (Roundtrip-Zählung,
  `kassierSummen.ts`-Aggregationsebene, `requireRole`-Abwesenheit).
- **Der Fix zu Finding 1 ist minimal und präzise** (`VeranstaltungMetaForm.tsx:39-40`) – nur der
  Reset-Handler wandert von `onClick` zu `onSubmit`, keine sonstige Logik berührt. Kein
  Gold-Plating in der Circuit-Breaker-Situation.
- **Beide neuen WHY-Kommentare sind echtes WHY**, nicht Paraphrase des Codes: konkrete
  Geschäftsentscheidung + Review-Runde/Finding-Referenz, explizite Absage an den naheliegenden,
  aber falschen Vergleich zur #346-UPDATE-Konsistenz (Z. 252-254) statt einer unbelegten
  Tatsachenbehauptung.
- **Schicht-Einhaltung, Guarded-UPDATE/DELETE-Konvention und Dialog-Pattern** durchgehend
  konsistent zum bestehenden Code; keine neue Architekturentscheidung, kein Scope-Creep über die
  begründete DRY-Extraktion (`hatErfasstenVerzehr()`) hinaus.
- **Out-of-Scope-Fund korrekt kanalisiert:** drei `KEINE_VERANSTALTUNG`-Literal-Duplikate in
  `docs/factory/kleinfunde.md` verankert statt selbst mitgefixt.

## Empfehlung

APPROVED

0 kritisch, 0 wichtig, 10 Nitpicks (4 neu/präzisiert, 6 unverändert aus Runde 3 übernommen –
keiner davon blockierend). Alle drei Personas (Backend/Logik, Code-Qualität, Architektur)
empfehlen unabhängig APPROVED. Nächster Schritt laut Pipeline: `/test`.

## Out-of-Scope

- Drei weitere Vorkommen des Literals `"Keine Veranstaltung angegeben."` in fremden Actions
  (`actions.ts:158`, `:316`, `:375`) neben der von diesem PR eingeführten Konstante
  (`actions.ts:69`) → unter der Schwelle, als Eintrag in
  [`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md) festgehalten (aus Runde 3
  unverändert).

---

## Historie: Runde 3 (2026-09-24)

> Die Findings der dritten Runde im Wortlaut. Bewusst **ohne** die oben reservierten
> Abschnitts-Überschriften, damit `run-pipeline.sh` sie nicht doppelt zählt.
> Verdict der Runde 3: **NEEDS_REWORK** (0 kritisch, 3 wichtig, 6 Nitpicks) – Circuit Breaker
> ausgelöst (3x in Folge nicht konvergiert), manuelle Runde 4 statt automatischem Rework.

Diff-Scope: `git diff origin/main...HEAD` (18 Dateien, +2173/−11). Gegenprüfung gegen
`docs/specs/spec-352-veranstaltung-bearbeiten-loeschen.md` (AK1–AK12, FS1–FS6) und
`tasks/task-352-veranstaltung-bearbeiten-loeschen.md`. Drei Personas (Backend/Logik,
Code-Qualität, Architektur); jede Tatsachenbehauptung eines Sub-Agenten wurde vom Orchestrator
an der genannten Datei/Zeile nachgeprüft, zwei Funde zusätzlich durch eigene Messläufe belegt
(Browser-Probe zum `onClick`-Verhalten, Zeitzonen-Probe zur Trennschärfe eines Tests).

**Vorbedingung dieser Runde:** Der Rework der Runde 2 lag nur im Arbeitsbaum. Er wurde vor dem
Review committet (`523995c`, alle Gates grün) – sonst hätte jeder Sub-Agent über
`git diff origin/main...HEAD` einen veralteten Stand gesehen (Lesson #251). Ebenfalls vor dem
Commit entfernt: eine untracked Wegwerf-Probe (`scripts/click-validate-probe.tmp.mjs`) aus
Runde 2, die `.gitignore` nicht abdeckt und die `git add -A` sonst in den PR gezogen hätte.

**Kritische Findings:** _Keine._ Die kritische Lücke aus Runde 1 (Löschen trotz kassiertem Geld)
bleibt geschlossen; die vollständige AK1–AK12/FS1–FS6-Gegenprüfung dieser Runde fand kein
weiteres Loch in den drei Fachsperren, und die Cascade-Inventur
(`db/schema.ts:256`, `:294`, `:345`, `:385`) zeigt keine vierte Kind-Tabelle, die ungeprüft
mitverschwände.

**Wichtig 1.** `app/veranstaltung/[id]/VeranstaltungMetaForm.tsx:73` — Der `onClick`-Reset am
Submit-Button ist ungetestet und feuert auch dann, wenn die Absendung gar nicht stattfindet
(HTML-Constraint-Validierung bricht ab). Empirischer Beleg (Browser-Probe, Chromium): bei leerem
Pflichtfeld feuert `click`, aber kein `submit`. Umsetzung: Reset vom `onClick` des Buttons an
`onSubmit` des `<form>` hängen, dazu fehlenden Test ergänzen.

**Wichtig 2.** `app/veranstaltung/actions.ts:187-189` (Kommentar) + `app/veranstaltung/schema.ts:37`
— Die Begründung für „keine Fachsperre beim Bearbeiten" deckt `kasse` nicht ab: `kasse` ist der
Geldtopf, nicht die Beschriftung, und dasselbe `erhaltenCents`, das 30 Zeilen weiter das Löschen
hart sperrt, lässt sich hier per Dropdown umhängen. Empfehlung: dokumentieren, nicht sperren –
AK1 nennt die Kasse ausdrücklich als bearbeitbares Feld, eine Sperre widerspräche der Spec und
braucht eine Nutzer-Entscheidung.

**Wichtig 3.** `app/veranstaltung/actions.ts:242-266` — Die drei Lösch-Sperren sind reine
Vor-Checks; der guarded DELETE trägt sie nicht. Der nebenläufige Schreiber braucht keinen Login
(`adjustVerzehrByTokenAction` hat bewusst kein `requireRole`), und unter `neon-http` ist jede
Vor-Abfrage ein eigener Roundtrip. Die bisherige Begründung (Konsistenz zum reversiblen UPDATE aus
#346) trägt hier nicht – die Unumkehrbarkeit des Hard-Deletes ist der Unterschied. Akzeptabel:
(a) `NOT EXISTS`-Subqueries ins DELETE ziehen, (b) Vor-Checks parallelisieren + Begründung, die
die Unumkehrbarkeit adressiert, oder (c) Entscheidung bleibt, aber neu begründet.

**Nitpicks (6, unverändert in die aktuellen Abschnitte oben übernommen):**
`actions.ts:216-217` (Token-Quellen-Behauptung ungenau), `actions.ts:116-118`
(Reihenfolge-Vergleich zu `setVeranstaltungCatalogAction` stimmt nur teilweise),
`labels.test.ts:31-35` (Zeitzonen-Test ohne echte Trennschärfe), `e2e/…spec.ts:26-28`
(Restdrift im Dateikopf-Kommentar), `docs/adr/023-…:131-134` (D6-Funktionsliste veraltet),
`docs/routes.md:29` (Detailseiten-Beschreibung nicht nachgezogen).

**Positives (Auszug):** vollständige Revalidierungs-Inventur (sechs von sechs Routen belegt),
Sperren nicht durch Join-Blindstelle umgehbar, `typ`-Sperre doppelt (Vor-Check + WHERE), Katalog
strukturell aus dem Bearbeiten-Pfad ausgeschlossen, Neon-HTTP-Falle vermieden (FK-Kaskaden statt
Mehrfach-Write), Reihenfolge-Assertion über `invocationCallOrder` statt Präsenz-Assertion, alle
AK1–AK12/FS1–FS6 einzeln belegt.

> **Circuit Breaker (CLAUDE.md: max. 3 Review↔Implement-Iterationen).** Dies war die dritte
> Review-Runde in Folge ohne Konvergenz. `run-pipeline.sh` hat daraufhin gestoppt und an den
> Menschen eskaliert, statt einen vierten automatischen Rework zu starten.

### Manuelle Rework-Runde 3 (2026-09-25, nach Circuit Breaker)

Nutzer-Entscheidungen zu den beiden Findings mit Entscheidungsbedarf: **2a** (Kasse:
dokumentieren, nicht sperren) und **3b** (TOCTOU: Restrisiko bewusst akzeptieren). Umgesetzt
außerhalb von `run-pipeline.sh` per manuellem `/implement`-Aufruf:

**Finding 1 — behoben.** Reset-Handler von `onClick` auf `onSubmit` verschoben
(`VeranstaltungMetaForm.tsx:39-40`), neuer Test mit Mutationsbeleg
(`VeranstaltungMetaForm.test.tsx:133-150`).

**Finding 2 — Option 2a umgesetzt.** WHY-Kommentar in `updateVeranstaltungMetaAction`
(`actions.ts:191-197`) ergänzt.

**Finding 3 — Option 3b umgesetzt.** WHY-Kommentar in `deleteVeranstaltungAction`
(`actions.ts:243-254`) ergänzt, adressiert jetzt die Unumkehrbarkeit direkt statt nur auf #346
zu verweisen. Technische Notizen in `task-352` entsprechend korrigiert.

**Gates nach dem Rework:** Lint, `pnpm build` (Typecheck), `routes-doc-check`, Vitest mit
DB-Integrationstests **1074/1074** grün. Commit: `b7ff76e`.

---

## Historie: Runde 2 (2026-09-24)

> Die Findings der zweiten Runde im Wortlaut. Bewusst **ohne** die oben reservierten
> Abschnitts-Überschriften, damit `run-pipeline.sh` sie nicht doppelt zählt.
> Verdict der Runde 2: **NEEDS_REWORK** (0 kritisch, 1 wichtig, 2 Nitpicks) – alle drei erledigt.

**Wichtig (behoben).** `app/veranstaltung/actions.ts:210-218` (`updateVeranstaltungMetaAction`) —
Der Revalidierungs-Sweep hatte die einzige Route ausgelassen, die wirklich zwischenspeichert:
`/theke/<token>`. `app/theke/[token]/page.tsx:39-42` rendert **alle drei** geänderten Felder, und
`app/veranstaltung/[id]/page.tsx:160` blendet `ZugangTeilen` für jede offene Veranstaltung ein –
genau dieser Link liegt den Teilnehmern vor. Sie ist die einzige betroffene Route ohne Auth-Gate
und damit full-route-cache-fähig; `adjustVerzehrByTokenAction` revalidiert sie deshalb bereits
(`actions.ts:527`). Gleiche Ursache beim Löschen: nach dem Hard-Delete konnte der geteilte Link
die gelöschte Veranstaltung weiter ausliefern.

**Nitpick 1 (umgesetzt).** `VeranstaltungLoeschen.tsx:48-54` — „Abbrechen" blieb während des
laufenden Löschvorgangs klickbar, obwohl der Bestätigungs-Button daneben gesperrt war.

**Nitpick 2 (behoben).** `e2e/veranstaltung-bearbeiten-loeschen.spec.ts:18` — Der Dateikopf sagte
„**Beide** Tests", seit dem Rework der Runde 1 sind es **drei**.

### Rework-Runde 2 (`/implement`, 2026-09-24)

**Wichtig — behoben.** Beide Actions revalidieren jetzt `/theke/<token>`.

*Abweichung vom vorgeschlagenen Weg:* Der Report empfahl, `assertVeranstaltungAenderbar` das
geladene `ziel` zurückgeben zu lassen. Nötig war das nicht – `updateVeranstaltungMeta` und
`deleteVeranstaltung` geben ihre Zeile bereits per `.returning()` zurück, inklusive `token`. Der
Token kommt damit aus dem **tatsächlich geschriebenen bzw. entfernten** Datensatz, und der
Vor-Check bleibt rückgabefrei.

*Tests:* Update-Seite an `should_revalidateEveryRouteShowingTheBezeichnung_when_metaChanged`;
Löschseite als eigener Test `should_revalidateThekeRouteBeforeRedirecting_when_deleted` mit einer
**Reihenfolge**-Assertion über `invocationCallOrder` statt einer Präsenz-Assertion (der Mock wirft
bewusst kein NEXT_REDIRECT – eine „wurde aufgerufen"-Prüfung wäre auch bei toter Zeile grün
gewesen, Lesson #286).

*Mutationsbeleg:* Erst RED aus dem richtigen Grund, nach dem Fix grün, danach die Revalidierung
hinter den `redirect` verschoben → rot mit `expected 114 to be less than 113`, also am
Positionsvergleich.

**Nitpick 1 — umgesetzt.** `disabled={pending}` auch am Abbrechen-Button, mit Test
`should_disableCancelButton_when_pending` (RED vor GREEN) und einer Begründung im
Modul-Kommentar, warum die Musterkonsistenz zu `CatalogControls` bei einem unumkehrbaren
Hard-Delete nicht trägt.

**Nitpick 2 — behoben**, an **beiden** Stellen des Dateikopfs (der Report nannte nur die erste).

**Nitpick 2 der Runde 1 — bleibt abgelehnt**, Begründung unverändert.

**Gates nach dem Rework:** `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, volle Vitest-Suite
**1073/1073** (inkl. DB-Integrationstests), `routes-doc-check`, E2E **3/3**. Commit: `523995c`.

---

## Historie: Runde 1 (2026-09-24)

> Verdict der Runde 1: **NEEDS_REWORK** (1 kritisch, 2 wichtig, 3 Nitpicks).

**Kritisch (behoben).** `app/veranstaltung/actions.ts:220-245` (`deleteVeranstaltungAction`) —
Die Lösch-Sperre ignorierte bereits kassierte Beträge. Geprüft wurden nur Verzehr-Positionen mit
`menge > 0` und `auslage`-Zeilen. `veranstaltung_zeile.erhaltenCents` – das bar kassierte Geld –
ging in keine Prüfung ein und verschwand beim Hard-Delete per Cascade. Repro (beide Wege über die
normale UI erreichbar): (a) Reine Spende – Teilnehmer erfassen, nichts verzehren, 10,00 €
kassieren; `kassiereZeileAction` verlangt keinen Verzehr, und `kassierZeile` behandelt „Erhalten
ohne Verzehr" als erstklassige Spende (`kassierSummen.ts:44`). (b) Korrektur-Fall – Verzehr
erfassen → kassieren → per `adjustMenge(-1)` auf `menge = 0` zurücknehmen. Warum kritisch: der
Hard-Delete ist bewusst unumkehrbar, und `Σ Erhalten` ist laut `PROJECT-CONTEXT.md` die eine
Hälfte der Kassenveränderung. Kein reiner Spec-Gap: die Spec begründet AK7 mit „Zeilen **ohne
Fachdaten** sperren nicht" – ein kassierter Betrag ist Fachdaten; die Implementierung erfüllte den
AK-Wortlaut, verfehlte aber dessen erklärte Absicht (Lesson #253).

**Wichtig 1 (behoben).** `app/veranstaltung/actions.ts:208-209` — `updateVeranstaltungMetaAction`
revalidierte die drei Unterseiten nicht, obwohl sie die geänderte Bezeichnung anzeigen.
*(Nachtrag Runde 2: der Sweep war unvollständig – `/theke/<token>` fehlte. Nachtrag Runde 3: das
Inventar ist jetzt vollständig geprüft, sechs von sechs Routen.)*

**Wichtig 2 (behoben).** `db/veranstaltung.test.ts:449-465` — Die Cascade-Behauptung des
Kommentars war nur zur Hälfte belegt: der Integrationstest deckte Zeilen + Positionen ab, für
`auslage` und `veranstaltung_ereignis` gab es keine Assertion.

**Nitpick 1 (behoben).** `VeranstaltungLoeschen.tsx:36` — Der Fehler aus `useActionState`
überlebte das Schließen des Dialogs.

**Nitpick 2 (bewusst abgelehnt).** `actions.ts:206, 242` — Der No-Match des guarded UPDATE/DELETE
meldet `NOT_OFFEN`, obwohl der Kommentar selbst „oder gelöscht" als zweite Ursache nennt. Bewusst
konsistent mit `setVeranstaltungCatalogAction`; eine Änderung an allen drei Stellen berührt #346
und gehört nicht in diese Task. **Bleibt in Runde 2, 3 und 4 abgelehnt.**

**Nitpick 3 (behoben, aber nur halb).** `VeranstaltungMetaForm.tsx:72` — „Änderungen
gespeichert." blieb stehen, während der Nutzer die Felder erneut änderte. *(Nachtrag Runde 3: der
Fix verschob den Zustand auf einen zweiten Pfad – siehe Wichtig-Finding 1 der Runde 3. Nachtrag
Runde 4: in der manuellen Rework-Runde 3 endgültig auf `onSubmit` korrigiert.)*

### Rework-Runde 1 (`/implement`, 2026-09-24)

**Kritisch — behoben.** Dritte Lösch-Sperre in `deleteVeranstaltungAction`: `listZeilen(id)` →
`erhaltenCents !== null` → eigene Meldung `LOESCHEN_KASSIERT_ERFASST`. Neues **AK12** + **FS6**
in `spec-352` (der Spec-Wortlaut war die Ursache, nicht nur die Implementierung — Lesson #253).
Belegt auf drei Ebenen: zwei Action-Tests, ein Mutationslauf und ein E2E-Test, der Repro (a) auf
der echten Oberfläche durchspielt.

**Wichtig 1 + 2 — behoben.** Revalidierung der drei Unterseiten; Cascade-Test deckt jetzt alle
vier Kind-Tabellen ab, beide neuen Nachher-Assertions mit Vorher-Assertion gegen Leer-Grün.

**Nitpick 1 + 3 — behoben.** Beide Status-Meldungen sind an ihren Gültigkeitszeitraum gebunden;
dazu eine Gegenrichtungs-Kontrolle (`should_keepRejectionErrorVisible_…`) – die **Fehler**meldung
bleibt bewusst stehen, sie ist Aufforderung zur Korrektur, kein Zustandsbericht.

**Gates nach dem Rework:** volle Vitest-Suite **1071/1071**, E2E **3/3**.
