# Review: Task 352

**Runde 2** gegen den Stand nach dem Rework von Runde 1 (Commit `96d3549`). Diff-Scope:
`git diff origin/main...HEAD` (18 Dateien, +2006/−11). Gegenprüfung gegen
`docs/specs/spec-352-veranstaltung-bearbeiten-loeschen.md` (AK1–AK12, FS1–FS6) und
`tasks/task-352-veranstaltung-bearbeiten-loeschen.md`. Gezielter Vitest-Lauf über die sieben
geänderten Testdateien inkl. der DB-Integrationstests: **284/284 grün**.

Die Findings der Runde 1 und ihr Rework stehen unverändert weiter unten unter
„Historie: Runde 1"; die Überschriften hier oben tragen den **aktuellen** Stand.

## Kritische Findings (müssen behoben werden)

_Keine._ Die kritische Lücke aus Runde 1 (kassiertes Geld ohne Verzehr) ist geschlossen –
Sperre (`actions.ts:248-251`), Spec-AK12/FS6, zwei Action-Tests inkl. `erhaltenCents = 0`-
Grenzfall und ein E2E-Nachweis der Repro decken sie ab.

## Wichtige Findings (sollten behoben werden)

- [ ] `app/veranstaltung/actions.ts:210-218` (`updateVeranstaltungMetaAction`) — **Der
      Revalidierungs-Sweep hat die einzige Route ausgelassen, die wirklich zwischenspeichert:
      `/theke/<token>`.** Der neue Kommentar an Z. 210 stellt die Regel selbst auf („Jede Route,
      deren gerenderter Inhalt sich ändert, wird revalidiert"), und `app/theke/[token]/page.tsx:39-42`
      rendert **alle drei** geänderten Felder – `veranstaltung.bezeichnung` als `<h1>`,
      `formatDatum(veranstaltung.datum)` und `KASSE_LABEL[veranstaltung.kasse]` in der Unterzeile.
      Diese Route gehört nicht nur zur Theke: `app/veranstaltung/[id]/page.tsx:160` blendet
      `ZugangTeilen` für **jede** offene Veranstaltung ein, d. h. genau dieser Link/QR-Code liegt
      den Teilnehmern der bearbeiteten Veranstaltung vor.
      **Warum das hier mehr wiegt als bei den vier nachgezogenen Pfaden:** `/theke/[token]` ist
      die einzige der betroffenen Routen ohne Auth-Gate – kein `auth()`, keine `cookies()`, kein
      `export const dynamic` (`app/theke/[token]/page.tsx`, 57 Zeilen). Sie ist damit
      full-route-cache-fähig, während `/veranstaltung/**` über den Session-Zugriff ohnehin
      dynamisch rendert. Genau deshalb revalidiert `adjustVerzehrByTokenAction` sie bereits
      explizit (`actions.ts:516`, `thekePath`) – der Präzedenzfall und die Pfad-Konstante stehen
      in derselben Datei, 300 Zeilen weiter unten, und wurden hier nicht mitgenommen.
      **Konkreter Ablauf:** Veranstalter korrigiert Bezeichnung/Datum → Teilnehmer öffnet den
      bereits geteilten QR-Link → Überschrift und Kopfzeile zeigen weiter den alten Stand, ohne
      dass irgendetwas die Seite je invalidiert.
      **Gleiche Ursache beim Löschen (`actions.ts:264`):** nach dem Hard-Delete bleibt
      `/theke/<token>` unrevalidiert; der Link, den die Teilnehmer in der Hand haben, kann eine
      gelöschte Veranstaltung weiter ausliefern, und ein Strich darauf läuft dann in
      „Veranstaltung nicht gefunden." statt in die 404-Seite.
      **Umsetzung:** `assertVeranstaltungAenderbar` (Z. 121-127) lädt die Veranstaltung bereits
      und verwirft sie – den geladenen `ziel` zurückgeben (bzw. als Tupel `{ ziel, error }`),
      dann `revalidatePath(thekePath(ziel.token))` in beiden Actions ergänzen. Der zugehörige
      Test lässt sich an `should_revalidateEveryRouteShowingTheBezeichnung_when_metaChanged`
      anhängen – dessen Name behauptet die Vollständigkeit heute schon.

## Nitpicks (optional)

- [x] `app/veranstaltung/[id]/VeranstaltungLoeschen.tsx:48-54` — „Abbrechen" bleibt während des
      laufenden Löschvorgangs klickbar, obwohl der Bestätigungs-Button daneben korrekt über
      `disabled={pending}` gesperrt ist. Klickt der Nutzer im Pending-Fenster auf „Abbrechen",
      schließt sich der Dialog, die bereits abgesetzte Action läuft aber serverseitig zu Ende und
      löscht – die Beschriftung verspricht das Gegenteil eines unumkehrbaren Vorgangs. Der
      Datenverlust ist durch die drei Fachsperren begrenzt (nur Veranstaltungen ohne Verzehr,
      Geld und Auslage sind löschbar), deshalb nur Nitpick. Einzuordnen ist außerdem: das
      Vorbild `CatalogControls.tsx:132-138` lässt „Abbrechen" ebenfalls aktiv – dort geht es
      aber um ein reversibles Anlegen/Umbenennen, nicht um einen Hard-Delete. Ein
      `disabled={pending}` auch am Abbrechen-Button wäre der Einzeiler; eine bewusste Ablehnung
      mit Verweis auf die Musterkonsistenz ist ebenso vertretbar (wie bei Nitpick 2 der Runde 1).

- [x] `e2e/veranstaltung-bearbeiten-loeschen.spec.ts:18` — Der Dateikopf sagt „**Beide** Tests
      räumen ihre Veranstaltung am Ende selbst wieder ab"; seit dem Rework der Runde 1 enthält
      die Spec **drei** Tests (AK1, AK4/7/8/9, AK12/FS6). Inhaltlich stimmt die Aussage für alle
      drei – nur das Zahlwort ist mit dem eigenen Nachtrag desselben PRs gedriftet.

## Positives

- **Der kritische Fund ist nicht nur gepatcht, sondern an der Wurzel korrigiert.** Die Ursache
  saß im Spec-Wortlaut („Zeilen ohne Fachdaten sperren nicht"), und genau dort steht jetzt AK12
  + FS6 mit der Begründung, warum ein kassierter Betrag Fachdaten ist (Lesson #253 angewandt,
  statt nur die Code-Zeile nachzuziehen).
- **Die AK12-Sperre prüft `!== null`, nicht Truthiness** – und der Grenzfall `erhaltenCents = 0`
  („kassiert, und zwar nichts") hat einen eigenen Test mit genau dieser Begründung im Kommentar.
  Das ist der Fehler, den eine naive Umsetzung hier gemacht hätte.
- **Der Mutationsbeleg zur AK12-Sperre benennt die rot gewordenen Testnamen einzeln** statt
  „Test wird rot" zu behaupten – dieselbe Belegtiefe wie beim AK8-Mutationsversuch aus
  `/implement`, inklusive des ehrlichen Protokolls eines *verhaltensneutralen* ersten Versuchs.
- **Der Cascade-Integrationstest hat jetzt für beide neuen Kind-Tabellen eine Vorher-Assertion**
  (`listAuslagen(...)` = 1, `listEreignisse(...)` = 2), damit das erwartete `[]` danach nicht
  leer-grün sein kann – und erzeugt die Protokoll-Einträge über den einzigen real möglichen Weg
  (Abschluss → Wiedereröffnung).
- **Beide Status-Meldungen sind an ihren Gültigkeitszeitraum gebunden, aber unterschiedlich** –
  die Erfolgsmeldung verschwindet beim Weitertippen, die Fehlermeldung bleibt bewusst stehen,
  und die Gegenrichtung ist als eigener Test (`should_keepRejectionErrorVisible_…`) mit
  Begründung festgehalten. Das ist die Unterscheidung „Zustandsbericht vs. Handlungsaufforderung",
  nicht ein pauschales „State zurücksetzen".
- **Die drei DRY-Extraktionen bleiben die richtige Antwort auf die Architektur-Notiz**
  (`hatErfasstenVerzehr`, `veranstaltungStammdaten`, `datierteOffeneVeranstaltung`) – je mit
  begründendem Kommentar, warum die *Meldung* trotzdem beim Aufrufer bleibt.
- **Nitpick 2 der Runde 1 wurde begründet abgelehnt, nicht stillschweigend übergangen** – mit
  dem Argument aus dem Report selbst (Konsistenz zu `setVeranstaltungCatalogAction:176`) und
  der richtigen Scope-Grenze zu #346. Die Ablehnung steht weiter.
- **`docs/routes.md` korrekt unverändert** – die Task fügt Komponenten hinzu, keine Route; der
  Drift-Check hat nichts zu tun.

## Empfehlung

NEEDS_REWORK

Einziger blockierender Punkt ist das Wichtig-Finding oben (fehlende Revalidierung von
`/theke/<token>` in beiden neuen Actions). Es ist derselbe Befund-Typ wie Wichtig 1 der Runde 1,
nur an der Route, wo das Caching real greift – der Fix ist der Rückgabewert des bereits
vorhandenen Guards plus zwei `revalidatePath`-Zeilen und eine Assertion im bestehenden Test.

## Rework-Runde 2 (`/implement`, 2026-09-24)

**Wichtig — behoben.** Beide Actions revalidieren jetzt `/theke/<token>`.

*Abweichung vom vorgeschlagenen Weg:* Der Report empfiehlt, `assertVeranstaltungAenderbar` das
geladene `ziel` zurückgeben zu lassen. Nötig ist das nicht – `updateVeranstaltungMeta` und
`deleteVeranstaltung` geben ihre Zeile bereits per `.returning()` zurück (`db/veranstaltung.ts`),
und `token` ist Teil davon. Der Token kommt damit aus dem **tatsächlich geschriebenen bzw.
entfernten** Datensatz statt aus dem Vor-Check, die Guard-Signatur bleibt unverändert, und der
Vor-Check bleibt das, was sein Kommentar behauptet: ein Vor-Check ohne Rückgabewert.

*Tests:* Die Update-Seite hängt wie vorgeschlagen an
`should_revalidateEveryRouteShowingTheBezeichnung_when_metaChanged`. Die Löschseite bekam einen
eigenen Test `should_revalidateThekeRouteBeforeRedirecting_when_deleted`, und zwar mit einer
**Reihenfolge**-Assertion über `invocationCallOrder` statt einer Präsenz-Assertion: der echte
`redirect` wirft NEXT_REDIRECT, der Mock in dieser Datei bewusst nicht (Kommentar Z. 54-57) – eine
bloße „wurde aufgerufen"-Prüfung wäre also auch dann grün gewesen, wenn die Zeile hinter dem
`redirect` stünde und in Produktion nie liefe (Lesson #286: Reihenfolge-Guard statt zwei isolierter
Präsenz-Assertions).

*Mutationsbeleg:* Erst RED aus dem richtigen Grund (Update: `"/theke/tok"` fehlt unter fünf
`revalidatePath`-Aufrufen; Delete: `expected -1 to be greater than or equal to 0`). Nach dem Fix
grün. Danach die Revalidierung im Delete-Pfad **hinter** den `redirect` verschoben: rot mit
`expected 114 to be less than 113` – der Positionsvergleich, nicht die Präsenz. Die
Reihenfolge-Assertion hat damit belegte Trennschärfe.

**Nitpick 1 — umgesetzt** (nicht abgelehnt). `disabled={pending}` jetzt auch am Abbrechen-Button,
mit Test `should_disableCancelButton_when_pending` (RED vor GREEN). Begründung im Modul-Kommentar:
Die Musterkonsistenz zu `CatalogControls` trägt hier nicht, weil dort ein *reversibles*
Anlegen/Umbenennen begleitet wird – bei einem unumkehrbaren Hard-Delete verspricht ein klickbares
„Abbrechen" im Pending-Fenster das Gegenteil dessen, was geschieht. Der Kommentar benennt die
Abweichung vom Vorbild ausdrücklich, damit sie nicht später als Drift zurückgebaut wird.

**Nitpick 2 — behoben.** Dateikopf der E2E-Spec auf drei Tests korrigiert – an **beiden** Stellen:
Z. 18 („Beide Tests" → „Alle drei Tests") und Z. 27, wo dieselbe Zahl ein zweites Mal als „die
beiden parallel laufenden Tests" steht. Der Report nennt nur die erste; die zweite ist dieselbe
Drift im selben Kopf (Lesson „Fix per Grep auf kopierte Geschwister-Stellen ausweiten").

**Nitpick 2 der Runde 1 — bleibt abgelehnt**, Begründung unverändert.

**Gates nach dem Rework:** `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, volle Vitest-Suite
**1073/1073** (inkl. DB-Integrationstests, +2 gegenüber Runde 1), `routes-doc-check`,
E2E **3/3** gegen den lokalen Dev-Server.

---

## Historie: Runde 1 (2026-09-24)

> Die Findings der ersten Runde im Wortlaut. Bewusst **ohne** die oben reservierten
> Abschnitts-Überschriften, damit `run-pipeline.sh` sie nicht doppelt zählt.
> Verdict der Runde 1: **NEEDS_REWORK** (1 kritisch, 2 wichtig, 3 Nitpicks).

**Kritisch (behoben).** `app/veranstaltung/actions.ts:220-245` (`deleteVeranstaltungAction`) —
Die Lösch-Sperre ignorierte bereits kassierte Beträge. Geprüft wurden nur Verzehr-Positionen mit
`menge > 0` und `auslage`-Zeilen. `veranstaltung_zeile.erhaltenCents` – das bar kassierte Geld –
ging in keine Prüfung ein und verschwand beim Hard-Delete per Cascade. Repro (beide Wege über die
normale UI erreichbar): (a) Reine Spende – Teilnehmer erfassen, nichts verzehren, auf
`/veranstaltung/[id]/kassieren` 10,00 € kassieren; `kassiereZeileAction` verlangt keinen Verzehr,
und `kassierZeile` behandelt „Erhalten ohne Verzehr" als erstklassige Spende
(`kassierSummen.ts:44`). (b) Korrektur-Fall – Verzehr erfassen → kassieren → per `adjustMenge(-1)`
auf `menge = 0` zurücknehmen. Warum kritisch: der Hard-Delete ist bewusst unumkehrbar, und
`Σ Erhalten` ist laut `PROJECT-CONTEXT.md` die eine Hälfte der Kassenveränderung. Kein reiner
Spec-Gap: die Spec begründet AK7 mit „Zeilen **ohne Fachdaten** sperren nicht" – ein kassierter
Betrag ist Fachdaten; die Implementierung erfüllte den AK-Wortlaut, verfehlte aber dessen erklärte
Absicht (Lesson #253).

**Wichtig 1 (behoben).** `app/veranstaltung/actions.ts:208-209` — `updateVeranstaltungMetaAction`
revalidierte die drei Unterseiten nicht, obwohl sie die geänderte Bezeichnung anzeigen
(`[id]/verzehr/page.tsx:95`, `[id]/auslagen/page.tsx:57`, `[id]/kassieren/page.tsx:121`).
Abweichung von der Konvention derselben Datei (Katalogwechsel → `verzehrPath`, Statuswechsel →
`kassierenPath`).

**Wichtig 2 (behoben).** `db/veranstaltung.test.ts:449-465` — Die Cascade-Behauptung des
Kommentars war nur zur Hälfte belegt: der Integrationstest deckte Zeilen + Positionen ab, für
`auslage` und `veranstaltung_ereignis` gab es keine Assertion. Der Protokoll-Pfad ist über die
Action real erreichbar und genau der, der bei fehlendem Cascade einen rohen `23503` liefern würde
(Lesson #345/#353).

**Nitpick 1 (behoben).** `VeranstaltungLoeschen.tsx:36` — Der Fehler aus `useActionState`
überlebte das Schließen des Dialogs und stand beim erneuten Öffnen sofort wieder da.

**Nitpick 2 (bewusst abgelehnt).** `actions.ts:206, 242` — Der No-Match des guarded UPDATE/DELETE
meldet `NOT_OFFEN`, obwohl der Kommentar selbst „oder gelöscht" als zweite Ursache nennt. Bewusst
konsistent mit `setVeranstaltungCatalogAction`; eine Änderung an allen drei Stellen berührt #346
und gehört nicht in diese Task. **Bleibt in Runde 2 abgelehnt** – die Begründung trägt weiter.

**Nitpick 3 (behoben).** `VeranstaltungMetaForm.tsx:72` — „Änderungen gespeichert." blieb stehen,
während der Nutzer die Felder erneut änderte.

### Rework-Runde 1 (`/implement`, 2026-09-24)

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
*(Nachtrag Runde 2: der Sweep war unvollständig – `/theke/<token>` fehlt, siehe Wichtig-Finding
oben.)*

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
