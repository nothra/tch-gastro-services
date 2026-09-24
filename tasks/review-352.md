# Review: Task 352

Diff-Scope: `git diff origin/main...HEAD` (17 Dateien, +1612/−11). Gegenprüfung gegen
`docs/specs/spec-352-veranstaltung-bearbeiten-loeschen.md` (AK1–AK11, FS1–FS5) und
`tasks/task-352-veranstaltung-bearbeiten-loeschen.md`. Gezielter Vitest-Lauf über die sechs
geänderten Testdateien: **240/240 grün**.

## Kritische Findings (müssen behoben werden)

- [x] `app/veranstaltung/actions.ts:220-245` (`deleteVeranstaltungAction`) — **Die Lösch-Sperre
      ignoriert bereits kassierte Beträge.** Geprüft werden nur Verzehr-Positionen mit `menge > 0`
      (Z. 231) und `auslage`-Zeilen (Z. 236). `veranstaltung_zeile.erhaltenCents` – das bar
      kassierte Geld – geht in keine Prüfung ein und verschwindet beim Hard-Delete per Cascade.
      **Repro (beide Wege über die normale UI erreichbar):**
      (a) Reine Spende: Teilnehmer erfassen, nichts verzehren, auf `/veranstaltung/[id]/kassieren`
      10,00 € kassieren. `kassiereZeileAction` (Z. 387 ff.) verlangt keinen Verzehr, und
      `kassierZeile` behandelt „Erhalten ohne Verzehr" als erstklassige Spende
      (`spende = max(0, erhalten − verzehrGesamt)`, `kassierSummen.ts:44`). → keine Position mit
      `menge > 0`, keine Auslage → Löschen erlaubt, die kassierten 10,00 € sind irreversibel weg.
      (b) Korrektur-Fall: Verzehr erfassen → kassieren → Verzehr per `adjustMenge(-1)` wieder auf
      `menge = 0` zurücknehmen. Dieselbe Lage, ohne dass jemand „ungewöhnlich" gehandelt hätte.
      **Warum kritisch:** Der Hard-Delete ist bewusst unumkehrbar (spec-352 „Gesetzte
      Entscheidungen"), und `Σ Erhalten` ist laut `PROJECT-CONTEXT.md` die eine Hälfte der
      Kassenveränderung – hier geht ein Bargeld-Datensatz ohne jede Warnung verloren.
      **Kein reiner Spec-Gap:** Die Spec begründet AK7 mit „Zeilen **ohne Fachdaten** sperren
      nicht" (spec-352 Scope, letzter Punkt). Ein kassierter Betrag ist Fachdaten; die
      Implementierung erfüllt den AK-Wortlaut, verfehlt aber dessen erklärte Absicht. Die Spec
      ist im selben PR entstanden und damit selbst prüfpflichtig (Lesson #253).
      **Vorschlag:** Dritte Sperre analog zu den beiden bestehenden – `listZeilen(id)` (bzw. eine
      schlanke Data-Layer-Abfrage) auf `erhaltenCents !== null` prüfen, eigene Meldung
      `LOESCHEN_KASSIERT_ERFASST`, plus Action-Test und AK-Ergänzung in der Spec.

## Wichtige Findings (sollten behoben werden)

- [x] `app/veranstaltung/actions.ts:208-209` (`updateVeranstaltungMetaAction`) — **Die drei
      Unterseiten werden nicht revalidiert, obwohl sie die geänderte Bezeichnung anzeigen.**
      Revalidiert werden nur `detailPath(id)` und `LIST_PATH`; die Überschriften von
      `[id]/verzehr/page.tsx:95`, `[id]/auslagen/page.tsx:57` und `[id]/kassieren/page.tsx:121`
      rendern jeweils `veranstaltung.bezeichnung`. Dieselbe Datei hält sonst konsequent die
      Regel „jede Route, deren gerenderter Inhalt sich ändert, wird revalidiert": der
      Katalogwechsel revalidiert `verzehrPath` (Z. 176-177), der Statuswechsel `kassierenPath`
      (Z. 377-379) – beide aus genau diesem Grund. Praktische Auswirkung ist durch die
      Session-Abhängigkeit (dynamische Routen) begrenzt; die Abweichung von der etablierten
      Konvention derselben Datei bleibt und ist ein Dreizeiler.

- [x] `db/veranstaltung.test.ts:449-465` — **Die Cascade-Behauptung des Kommentars ist nur zur
      Hälfte belegt.** `db/veranstaltung.ts:129-134` sagt zu, dass Zeilen, Verzehr-Positionen,
      **Auslagen und Protokoll-Einträge** per `onDelete: "cascade"` verschwinden. Der
      Integrationstest deckt Zeilen + Positionen ab; für `auslage` und `veranstaltung_ereignis`
      gibt es keine Assertion. Der Protokoll-Pfad ist über die Action real erreichbar
      (abschließen → wiedereröffnen → Status wieder `offen`, zwei `veranstaltung_ereignis`-Zeilen,
      Verzehr auf 0) und genau der Pfad, der bei fehlendem Cascade keinen sauberen Fehler,
      sondern einen rohen `23503` liefern würde, den kein Error-Translation-Wrapper abfängt
      (Lesson aus #345/#353). Zwei zusätzliche Assertions im bestehenden Delete-Test genügen.

## Nitpicks (optional)

- [x] `app/veranstaltung/[id]/VeranstaltungLoeschen.tsx:36` — Der Fehler aus `useActionState`
      überlebt das Schließen des Dialogs. Nach einer abgelehnten Löschung (Verzehr erfasst) →
      „Abbrechen" → erneut „Veranstaltung löschen" steht die alte Fehlermeldung sofort wieder im
      frisch geöffneten Dialog, bevor irgendetwas versucht wurde. Ein
      `{showConfirm && state?.error && …}` reicht nicht (State bleibt), aber ein Zurücksetzen
      beim Öffnen bzw. eine an den Öffnungs-Zyklus gebundene Anzeige würde es lösen.

- [ ] `app/veranstaltung/actions.ts:206, 242` — Der No-Match des guarded UPDATE/DELETE meldet
      `NOT_OFFEN` („Die Veranstaltung ist abgeschlossen und schreibgeschützt."), obwohl der
      danebenstehende Kommentar selbst „oder gelöscht" bzw. „Zweit-Löschung" als zweite Ursache
      nennt – dann ist die Meldung schlicht falsch. Bewusst konsistent mit
      `setVeranstaltungCatalogAction` (Z. 174), deshalb nur Nitpick; eine neutrale Meldung
      („Die Veranstaltung lässt sich nicht mehr ändern.") träfe beide Fälle.

- [x] `app/veranstaltung/[id]/VeranstaltungMetaForm.tsx:72` — „Änderungen gespeichert." bleibt
      stehen, während der Nutzer die Felder erneut ändert; die Anzeige behauptet dann einen
      Speicherstand, der nicht mehr dem Formularinhalt entspricht.

## Positives

- **Die drei DRY-Extraktionen sind die richtige Antwort auf die Architektur-Notiz.** Die Notiz
  hätte das Kopieren der `menge > 0`-Prüfung erlaubt; stattdessen `hatErfasstenVerzehr()`
  (actions.ts:109), `veranstaltungStammdaten` (schema.ts:25) und `datierteOffeneVeranstaltung()`
  (db/veranstaltung.ts:95) – je mit begründendem Kommentar, warum die *Meldung* trotzdem beim
  Aufrufer bleibt. Die Abweichung ist in der Task-Datei dokumentiert.
- **Der `typ`-Guard sitzt doppelt und an der richtigen Stelle** – in der Action (AK10) und als
  WHERE-Bedingung der Data-Layer, jeweils mit eigenem Test. Die Data-Layer bleibt dabei
  regel-neutral: die fachliche Verzehr-/Auslagen-Sperre liegt bewusst in der Action.
- **`catalogId` wird nicht nur ignoriert, sondern nachweislich abgestreift** – Schema-Test
  (`should_ignoreCatalogId_when_itIsSubmittedAnyway`) und Action-Test
  (`should_notForwardCatalogId_when_itIsSubmittedAnyway`) prüfen die Umgehung der
  #346-Verzehr-Sperre von beiden Seiten.
- **Guard-Test-Dichte stimmt** (Lesson #51): jeder Ablehnungszweig beider Actions hat einen
  eigenen Test inkl. „und es wurde nicht geschrieben"-Assertion, dazu beide `undefined`-Zweige
  der guarded Schreibwege (FS3/FS5) und der FS1-Grenzfall `menge = 0` als Positiv-Fall.
- **Der Theke-Test auf der Detailseite hat eine Gegenkontrolle** (`katalog-wechsel` ist weiter
  da) – der Test kann nicht grün werden, weil die ganze Ansicht wegfällt.
- **`formatDatumInput` ist als eigene Funktion mit UTC-Begründung und eigenem
  Zeitzonen-Verschiebungs-Test ausgelagert**, statt inline im Formular zu stehen.
- **E2E belegt genau das, was jsdom nicht kann**: Persistenz über ein echtes Neuladen, den
  404 auf der Detailroute nach dem Hard-Delete und den Dokumentwechsel der Weiterleitung – mit
  `__test__`-Präfix und Selbstaufräumen (#346).
- **`docs/routes.md` korrekt unverändert** – die Task fügt Komponenten hinzu, keine Route
  (`app/**/page.tsx` / `app/api/**/route.ts` unverändert), der Drift-Check hat nichts zu tun.

## Empfehlung

NEEDS_REWORK

---

## Rework-Runde 1 (`/implement`, 2026-09-24)

Verdict oben ist das der **Review-Runde 1** und bleibt als solches stehen; die Freigabe spricht
die nächste `/review`-Runde gegen den neuen Stand aus (kein Selbst-Freispruch durch den
implementierenden Schritt).

**Kritisch — behoben.** Dritte Lösch-Sperre in `deleteVeranstaltungAction`: `listZeilen(id)` →
`erhaltenCents !== null` → eigene Meldung `LOESCHEN_KASSIERT_ERFASST`. Neues **AK12** + **FS6**
in `spec-352` (der Spec-Wortlaut war die Ursache, nicht nur die Implementierung — Lesson #253).
Belegt auf drei Ebenen: zwei Action-Tests, ein Mutationslauf (Sperre entfernt → genau
`should_returnErrorAndNotDelete_when_geldKassiertOhneVerzehr` und
`…_when_kassiertBetragIsZero` rot) und ein E2E-Test, der die im Report beschriebene Repro (a)
auf der echten Oberfläche durchspielt: Walk-in → 10,00 € kassieren ohne einen einzigen Strich →
Lösch-Versuch abgelehnt → Kassieren zurücknehmen → Löschen wieder erlaubt.

**Wichtig 1 — behoben.** `updateVeranstaltungMetaAction` revalidiert jetzt zusätzlich
`verzehr`/`auslagen`/`kassieren`. Test
`should_revalidateEveryRouteShowingTheBezeichnung_when_metaChanged`, mutationsbelegt.

**Wichtig 2 — behoben.** Der Cascade-Test deckt jetzt alle vier Kind-Tabellen ab (Zeilen,
Positionen, **Auslagen**, **Protokoll-Einträge**). Der Protokoll-Pfad wird über
Abschluss→Wiedereröffnung erzeugt; beide neuen Nachher-Assertions haben eine Vorher-Assertion,
damit das erwartete `[]` nicht leer-grün sein kann.

**Nitpick 1 + 3 — behoben.** Beide Status-Meldungen sind an ihren Gültigkeitszeitraum gebunden:
die Lösch-Fehlermeldung an den Öffnungs-Zyklus des Dialogs (`abgeschickt`), die
„Änderungen gespeichert."-Bestätigung an den unveränderten Formularstand
(`geaendertSeitSpeichern`). Je ein Test, beide mutationsbelegt; dazu eine Gegenrichtungs-Kontrolle
(`should_keepRejectionErrorVisible_when_fieldEditedAfterRejection`) — die **Fehler**meldung bleibt
bewusst stehen, sie ist Aufforderung zur Korrektur, kein Zustandsbericht.

**Nitpick 2 — bewusst nicht umgesetzt.** Der No-Match von guarded UPDATE/DELETE meldet weiter
`NOT_OFFEN`. Eine neutrale Meldung nur an den beiden #352-Stellen machte sie inkonsistent zu
`setVeranstaltungCatalogAction:174`, das denselben No-Match-Zweig hat — genau die Konsistenz, mit
der der Report die Einstufung als *Nitpick* begründet. Die Meldung an allen drei Stellen zu
ändern ist eine eigene, #346 mitberührende Änderung und gehört nicht in diese Rework-Runde.

**Gates nach dem Rework:** `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, volle Vitest-Suite
**1071/1071** (inkl. DB-Integrationstests), `routes-doc-check`, E2E **3/3** gegen den lokalen
Dev-Server.
