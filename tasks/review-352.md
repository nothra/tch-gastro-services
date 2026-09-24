# Review: Task 352

**Runde 3** gegen den Stand nach dem Rework von Runde 2 (Commit `523995c`). Diff-Scope:
`git diff origin/main...HEAD` (18 Dateien, +2173/−11). Gegenprüfung gegen
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

Die Findings der Runden 1 und 2 stehen unverändert weiter unten unter „Historie"; die
Überschriften hier oben tragen den **aktuellen** Stand.

## Kritische Findings (müssen behoben werden)

_Keine._ Die kritische Lücke aus Runde 1 (Löschen trotz kassiertem Geld) bleibt geschlossen;
die vollständige AK1–AK12/FS1–FS6-Gegenprüfung dieser Runde fand kein weiteres Loch in den drei
Fachsperren, und die Cascade-Inventur (`db/schema.ts:256`, `:294`, `:345`, `:385`) zeigt keine
vierte Kind-Tabelle, die ungeprüft mitverschwände.

## Wichtige Findings (sollten behoben werden)

- [ ] `app/veranstaltung/[id]/VeranstaltungMetaForm.tsx:73` — **Der `onClick`-Reset am
      Submit-Button ist ungetestet, und er feuert auch dann, wenn die Absendung gar nicht
      stattfindet.** Zwei Seiten derselben Zeile:
      **(a) Testlücke, Mutation überlebt.** Kein Test in `VeranstaltungMetaForm.test.tsx` klickt
      „Änderungen speichern" (`grep -n "click"` → kein Treffer; der einzige Button-Test, Z. 130,
      prüft nur den `disabled`-Zustand). Coverage der Datei: 75 % Funcs, einzige unabgedeckte
      Zeile ist 73. Ohne diese Zeile wäre die Erfolgsmeldung in Produktion **tot**, nicht nur
      verzögert: `onChange` am Formular (Z. 39) setzt `geaendertSeitSpeichern = true`, jeder
      reale Speichervorgang beginnt zwingend mit einer Feldänderung, und die Anzeigebedingung ist
      `state?.ok && !geaendertSeitSpeichern` (Z. 80). Der einzige Test, der die Meldung sieht
      (`should_showSuccessMessage_when_stateOk`, Z. 94-99), rendert `{ok:true}` bei unberührtem
      Formular – eine Kombination, die über die UI nicht entstehen kann.
      **(b) Verhaltensfehler.** Bricht die HTML-Constraint-Validierung die Absendung ab (leere
      Bezeichnung, leeres/ungültiges Datum – alle drei Felder sind `required`), läuft der
      `onClick` trotzdem und setzt `geaendertSeitSpeichern` auf `false`. Ein noch stehendes
      `state.ok` einer **früheren** Speicherung lässt „Änderungen gespeichert." damit wieder
      erscheinen – über einem leeren Pflichtfeld, das nie gespeichert wurde. Das ist genau der
      Zustand, den Nitpick 3 der Runde 1 beseitigen sollte; der Fix hat ihn auf einen zweiten
      Pfad verschoben.
      **Empirischer Beleg (eigene Browser-Probe, Chromium):** bei leerem Pflichtfeld feuert
      `click`, aber **kein** `submit` (`["click"]`); bei gefülltem Feld beide
      (`["click","click","submit"]`).
      **Umsetzung (löst beide Seiten mit einer Zeile):** den Reset vom `onClick` des Buttons an
      `onSubmit` des `<form>` hängen – das Submit-Event feuert laut derselben Probe nur, wenn die
      Validierung durch ist. Dazu der fehlende Test: tippen → absenden → mit `{ok:true}` rendern
      → Meldung sichtbar; Mutation (Reset entfernen) muss ihn rot machen.

- [ ] `app/veranstaltung/actions.ts:187-189` (Kommentar) + `app/veranstaltung/schema.ts:37` —
      **Die Begründung für „keine Fachsperre beim Bearbeiten" deckt `kasse` nicht ab.** Der
      Kommentar rechtfertigt den fehlenden Check mit: „Metadaten zu korrigieren bleibt auch mit
      erfasstem Verzehr erlaubt (anders als der Katalogwechsel, der die Preis-Grundlage unter den
      Strichen austauschte)". Das Argument trennt „Etikett korrigieren" von „Rechen-Grundlage
      austauschen" – und trägt damit für `bezeichnung` und `datum`, aber nicht für `kasse`:
      `kasse` ist der Geldtopf, nicht die Beschriftung
      (`docs/factory/PROJECT-CONTEXT.md:44` „Kasse = Geldtopf, Katalog = Preisliste";
      `spec-51:39-40` „Die zugeordnete Kasse bestimmt, wohin Einnahmen und Auslagenerstattungen
      wirken"). `app/veranstaltung/[id]/kassieren/page.tsx:234` rendert „Gesamtabrechnung (Kasse:
      …)" und Z. 251 die „Kassenveränderung" – nach einem Wechsel steht dieselbe Summe unter der
      anderen Kasse, ohne Protokoll-Eintrag (`db/schema.ts:371-375` kennt nur `abgeschlossen` |
      `wiedereroeffnet`). **Die Asymmetrie zum Nachbar-Pfad ist das Eigentliche:** dasselbe
      `erhaltenCents`, das 30 Zeilen weiter das Löschen hart sperrt (AK12), lässt sich hier per
      Dropdown umhängen.
      **Impact ehrlich eingegrenzt:** ein laufender Saldo je Kasse existiert noch nicht
      (`PROJECT-CONTEXT.md:62-63`, Backlog #57), und der Wechsel ist auf `status = 'offen'`
      beschränkt – heute also auf die Abrechnung dieser einen Veranstaltung begrenzt, mit #57
      kumulativ.
      **Empfehlung: dokumentieren, nicht sperren.** AK1 der Spec nennt die Kasse ausdrücklich als
      bearbeitbares Feld – das ist eine Entscheidung aus der Requirements-Session, keine
      Nachlässigkeit der Umsetzung. Eine Sperre würde ihr widersprechen und gehört nicht ohne
      Rücksprache in einen Review-Rework. Zu tun ist deshalb: den Kommentar Z. 187-189 um
      `kasse` ergänzen (warum ein Umhängen mit bereits kassiertem Geld zulässig ist – das
      Korrigieren einer falsch gewählten Kasse ist vermutlich genau der Anwendungsfall) und
      denselben Satz als Notiz in spec-352 verankern, damit die Asymmetrie zu AK12 als
      **entschieden** lesbar ist statt als übersehen.

- [ ] `app/veranstaltung/actions.ts:242-266` — **Die drei Lösch-Sperren sind reine Vor-Checks;
      der guarded DELETE trägt sie nicht.** Vier nacheinander awaitete Abfragen
      (`getVeranstaltung`, `listPositionen`, `listZeilen`, `listAuslagen`), dann feuert der DELETE
      mit `datierteOffeneVeranstaltung()` (`db/veranstaltung.ts:95-101`) – dessen WHERE kennt nur
      `id`, `typ`, `status`, **keine** der drei Fachbedingungen. Was im Fenster entsteht,
      verschwindet per Cascade, ohne Fehler.
      **Warum das mehr ist als eine Lehrbuch-TOCTOU:** Der nebenläufige Schreiber braucht keinen
      Login. `adjustVerzehrByTokenAction` (`actions.ts:516-529`) hat bewusst kein `requireRole`
      (Kommentar Z. 509, capability-based) – jeder Teilnehmer mit dem QR-Link, den
      `ZugangTeilen` für jede offene Veranstaltung ausgibt, kann in diesem Fenster Verzehr
      erzeugen. Und das Fenster ist in INT/PRD nicht mikroskopisch: `db/index.ts:20-22` wählt für
      Neon-URLs `neon-http`, wo jede Query ein eigener HTTPS-Roundtrip ist – die lokale
      node-postgres-Verbindung, gegen die die Tests laufen, ist strukturell schneller und damit
      kein Beleg für die Enge.
      **Zum Status als bewusste Entscheidung:** `task-352:72-75` entscheidet das explizit
      („dieselbe Race-Toleranz wie beim bereits gemergten Katalogwechsel (#346)"). Die Begründung
      vergleicht aber ein **reversibles UPDATE auf `catalogId`** mit einem **unumkehrbaren
      Hard-Delete mit Cascade über vier Kind-Tabellen** – und die Unumkehrbarkeit ist der Grund,
      warum es die Sperren überhaupt gibt (spec-352, „Gesetzte Entscheidungen"). FS3 ist im
      Wortlaut erfüllt (Prüfung zum Ausführungszeitpunkt, kein Client-Snapshot); das Restfenster
      liegt genau dort, wo spec-352 „Offene Fragen" Punkt 3 die Frage gestellt hatte.
      **Akzeptabel ist jede der drei Auflösungen:** (a) die drei Bedingungen als
      `NOT EXISTS`-Subqueries in die bereits vorhandene Delete-Bedingung ziehen – der
      No-Match-Zweig (`actions.ts:267`) existiert schon; (b) die Vor-Checks parallelisieren
      (`Promise.all`) **plus** eine Begründung, die die Unumkehrbarkeit adressiert; (c) die
      Entscheidung bleibt, wird aber in `task-352` neu begründet – dann steht sie wie „Nitpick 2
      der Runde 1" und ist erledigt.

## Nitpicks (optional)

- [ ] `app/veranstaltung/actions.ts:216-217` — Tatsachenbehauptung über fremden Code trifft nicht
      zu: „Den Token liefert die `.returning()`-Zeile des UPDATE – **dieselbe Quelle**, aus der
      `adjustVerzehrByTokenAction` revalidiert." Diese Action bezieht den Token nicht aus
      `.returning()`, sondern als gebundenes Routen-Argument (`actions.ts:517` Parameter `token`,
      `:527` `revalidatePath(thekePath(token))`, gebunden in `app/theke/[token]/page.tsx`).
      Gemeint ist offenbar „derselbe Pfad/Präzedenzfall" – dann sollte es das sagen. Genau die
      Art Behauptung, die beim nächsten Lesen als belegt gilt (Lesson „X erzwingt Y").

- [ ] `app/veranstaltung/actions.ts:116-118` — „dieselbe Reihenfolge wie bei
      `setVeranstaltungCatalogAction` – Existenz → Typ → Status" stimmt nur für zwei der drei
      aufgezählten Schritte: die Schwester-Action hat den Typ-Check nicht (`actions.ts:163-165`,
      nur Existenz + Status – die Theke darf ihren Katalog wechseln). Die Nicht-Adaption ist
      sachlich richtig (der Guard dort einzusetzen verböte den Katalogwechsel für die Theke, eine
      #346-Verhaltensänderung außerhalb dieses Scopes), steht aber nirgends. Einzeiler:
      „…, **erweitert um den Typ-Check (AK10)**; die Schwester-Action bleibt bewusst inline, weil
      der Typ-Check dort #346-Verhalten änderte."

- [ ] `app/veranstaltung/labels.test.ts:31-35` — Der Test
      `should_keepUtcDay_when_localTimezoneWouldShiftIt` hat in der realen Runner-Zeitzone keine
      Trennschärfe und wiederholt den Test darüber. Eigene Messung: `new Date("2026-07-13")` und
      `new Date("2026-07-13T00:00:00.000Z")` sind **derselbe Zeitpunkt** (`getTime()`-Vergleich
      `true`), und die im Kommentar behauptete Mutante (lokalzeit-basierte Formatierung) liefert
      unter `TZ=Europe/Berlin` ebenfalls `2026-07-13` – erst unter `TZ=America/New_York`
      `2026-07-12`. Ein `TZ`-Pinning gibt es nicht (`vitest.config.ts`, `package.json`: kein
      Treffer). Entweder streichen (die UTC-Semantik steckt schon in Z. 25-29) oder ehrlich
      machen: Runner-TZ für diesen Test auf einen negativen Offset fixieren.

- [ ] `e2e/veranstaltung-bearbeiten-loeschen.spec.ts:26-28` — Restdrift im in Runde 2
      nachgebesserten Dateikopf: „damit die **parallel laufenden Tests** sich nicht gegenseitig
      die Namen wegnehmen". `LAUF` wird einmal auf Modulebene gelesen (Z. 28) und ist für alle
      drei Tests desselben Laufs identisch – er trennt parallele **Läufe**, nicht Tests; die
      Tests trennen ihre Basisnamen (Z. 110 „Bearbeiten", Z. 150 „Loeschen", Z. 195 „Kassiert").
      In Runde 2 wurde das Zahlwort korrigiert, die Aussage selbst blieb. Daneben kosmetisch:
      `const PREFIX = ` mit Backticks ohne Interpolation (Z. 29).

- [ ] `docs/adr/023-veranstaltung-datenmodell.md:131-134` — D6 zählt den Funktionsbestand von
      `db/veranstaltung.ts` namentlich auf; dieser PR fügt dort zwei Funktionen hinzu
      (`updateVeranstaltungMeta`, `deleteVeranstaltung`) und lässt die Liste unberührt (Lesson
      „PR ändert die von einer ADR namentlich beschriebene Mechanik"). Die Liste ist allerdings
      **schon vor #352** falsch: sie nennt `setStatus(id, status)`, das es nicht mehr gibt
      (heute `abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung`), und ihr fehlen
      `setVeranstaltungCatalog`, `setErhalten`, `getZeile` u. a. Billigster korrekter Fix ist
      deshalb nicht das Nachtragen, sondern die Liste als beispielhaft zu kennzeichnen („u. a.")
      – ein Wort, und die Drift kann nicht wiederkehren.

- [ ] `docs/routes.md:29` — `/veranstaltung/[id]` steht weiter nur als „Veranstaltung führen
      (Detail)". Kein Gate bricht (der Drift-Check prüft den `app/`-Baum, der CLAUDE.md-Guardrail
      triggert auf Pfad/Zugriff) – die Datei pflegt funktionale Erweiterungen an unveränderten
      Routen aber nachweislich mit: Z. 30 und 32 („personenbezogener Einstieg via `?zeile=…`"),
      Z. 34 („+ Katalog-Management: anlegen/umbenennen/deaktivieren/duplizieren, #345"). #352
      ergänzt der Detailseite „Metadaten bearbeiten" und „Veranstaltung löschen".

## Positives

- **Die vollständige Revalidierungs-Inventur geht jetzt auf.** Genau sechs Routen rendern
  Veranstaltungsfelder (`/veranstaltung`, `/veranstaltung/[id]`, `…/verzehr`, `…/auslagen`,
  `…/kassieren`, `/theke/[token]`), und alle sechs stehen in `actions.ts:218-223`. Die einzige
  weitere Leserin, der Bericht-Route-Handler, ist auf `status === "abgeschlossen"` gegated und
  für eine bearbeitbare Veranstaltung unerreichbar. Das war in Runde 1 und 2 je unvollständig –
  jetzt ist es geprüft statt behauptet.
- **Die Sperren lassen sich nicht durch eine Join-Blindstelle umgehen** – das war der naheliegende
  Verdacht auf eine Wiederholung des Runde-1-Fundes, und er trägt nicht: `listPositionen` joint
  Katalogartikel ohne `active`-Filter (die nie hart gelöscht werden), `listZeilen` ist ein
  filterloses `select()`, `listAuslagen` joint Teilnehmer, die ebenfalls nur soft-gelöscht werden.
  Keine Zeile mit Fachdaten kann sich vor einer Sperre verstecken.
- **Die `typ`-Sperre sitzt doppelt** – als Vor-Check (`actions.ts:124`) *und* in der
  WHERE-Bedingung beider Schreibwege (`db/veranstaltung.ts:98`), mit einem Data-Layer-Test, der
  sie ohne die Action prüft. Ein geschmuggelter Theken-`id` scheitert auch dann, wenn der
  Vor-Check je wegrefaktoriert würde.
- **Der Katalog ist aus dem Bearbeiten-Pfad strukturell ausgeschlossen**, nicht nur UI-seitig:
  weder `veranstaltungMetaSchema` noch `VeranstaltungMetaData` kennen `catalogId`, und
  `should_notForwardCatalogId_when_itIsSubmittedAnyway` belegt es am Verhalten. Die
  Verzehr-Sperre aus #346 lässt sich über keinen der beiden Layer umgehen.
- **Die Neon-HTTP-Falle wurde strukturell vermieden:** Der Hard-Delete verlässt sich auf
  FK-Kaskaden statt auf eine clientseitige Mehrfach-Write-Sequenz – die einzige Variante, die
  unter beiden Treibern identisch atomar ist. Lesson #345 richtig angewandt, nicht formal erfüllt.
- **Die Reihenfolge-Assertion über `invocationCallOrder`** (`actions.test.ts:680-687`) ist die
  richtige Antwort darauf, dass der `redirect`-Mock kein NEXT_REDIRECT wirft – eine
  „wurde aufgerufen"-Prüfung wäre auch bei toter Zeile grün gewesen, und der Mutationsbeleg zeigt
  genau den Positionsvergleich rot.
- **Die Abweichung vom `CatalogControls`-Vorbild steht im Code selbst**
  (`VeranstaltungLoeschen.tsx:13-17`) – nachgeprüft: dort hat „Abbrechen" tatsächlich kein
  `disabled`. So kann die bewusste Abweichung nicht später als Drift zurückgebaut werden.
- **Alle AK1–AK12 und FS1–FS6 sind einzeln gegen Code *und* Test belegt**, mehrere davon doppelt
  (Action-Ebene + Data-Layer-Ebene). Kein Soft-Delete-, Papierkorb- oder Force-Delete-Apparat,
  den die Spec ausschließt – kein Gold-Plating.

## Empfehlung

NEEDS_REWORK

0 kritisch, 3 wichtig, 6 Nitpicks. Keines der drei Wichtig-Findings ist ein Defekt des normalen
Bedienwegs; zwei davon (Kasse, TOCTOU) sind vollständig durch eine **begründete Entscheidung**
auflösbar statt durch Code. Nur Finding 1 verlangt echte Änderung – eine verschobene Zeile plus
einen Test.

> **Circuit Breaker (CLAUDE.md: max. 3 Review↔Implement-Iterationen).** Dies ist die dritte
> Review-Runde. Der folgende Rework ist der letzte innerhalb des Limits: Eine Runde 4 findet
> **nicht** statt. Bleiben danach Punkte offen, gehen sie an den Menschen – oder als Issue in den
> Tracker –, nicht in eine weitere Schleife.

## Out-of-Scope

- Drei weitere Vorkommen des Literals `"Keine Veranstaltung angegeben."` in fremden Actions
  (`actions.ts:158`, `:316`, `:375`) neben der von diesem PR eingeführten Konstante
  (`actions.ts:69`) → unter der Schwelle, als Eintrag in
  [`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md) festgehalten.

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
und gehört nicht in diese Task. **Bleibt in Runde 2 und 3 abgelehnt.**

**Nitpick 3 (behoben, aber nur halb).** `VeranstaltungMetaForm.tsx:72` — „Änderungen
gespeichert." blieb stehen, während der Nutzer die Felder erneut änderte. *(Nachtrag Runde 3: der
Fix verschob den Zustand auf einen zweiten Pfad – siehe Wichtig-Finding 1 oben.)*

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
