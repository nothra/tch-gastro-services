# Review: Task 51

> Runde 3 (2026-07-15, frische 3-Persona-Review nach Rework). Die zwei Runde-1-Findings
> (kritisch: Schreibschutz-Umgehung in `removeZeile`; wichtig: fehlende Active-Prüfung in
> `addZeileAction`) sind im Code **verifiziert behoben** (Data-Layer + Actions + Tests, siehe
> „Positives"). Diese Runde sucht neue Findings; behobene werden nicht wiederholt.
> Arbeitsbaum sauber, keine Änderung seit Runde 2 – die Befunde sind stabil.

## Kritische Findings (müssen behoben werden)
- _Keine._ Alle drei Personas (Backend/Logik, Code-Qualität, Architektur) bestätigen: kein
  kritisches Finding, kein merge-blockierender Punkt. Die serverseitige Schreibschutz-Umgehung
  aus Runde 1 ist verifiziert behoben (`removeZeile(zeileId, veranstaltungId)` mit
  `and(eq(id,…), eq(veranstaltungId,…))`, `db/veranstaltung.ts:94-105`; Action übergibt beide
  Werte, `actions.ts:119`; Unit- + Integrationstest).

## Wichtige Findings (sollten behoben werden)
- [ ] **Ungetestete Guard-Clause-Branches in `app/abrechnung/veranstaltung/actions.ts`** –
  die serverseitigen Leerfeld-Guards an der System-Grenze haben keinen Test, obwohl neuer Code
  laut `testing-standards.md` 100 % abgedeckt sein soll: `addZeileAction:61`
  (`!veranstaltungId || !teilnehmerId`), `removeZeileAction:114` (`!veranstaltungId || !zeileId`),
  `setStatusAction` (`!id`), `createWalkInAction:92` (`!veranstaltungId`). Ein Entfernen dieser
  Zeilen würde von keinem Test bemerkt. **Empfehlung:** im `/test`-Schritt schließen (reine
  Test-Ergänzung, kein Rework-Loop).
- [ ] **`db/teilnehmer.ts:30` (`getTeilnehmer`) – neue Produktionsfunktion ohne eigenen Test** –
  wird nur in `actions.test.ts` *gemockt* (verifiziert: `db/teilnehmer.test.ts` enthält Tests für
  `list…`/`create`/`update`/`findActiveByName`, aber keinen `getTeilnehmer`-Test); die echte Query
  läuft in keinem Test. Gleiche Kategorie/Schwere wie die Guard-Branch-Coverage. **Empfehlung:**
  ebenfalls im `/test`-Schritt schließen (Integrationstest analog zu den übrigen `db/teilnehmer`-Tests).
- [ ] **`isUniqueViolation` byte-gleich in zwei Feature-Modulen dupliziert** (out-of-scope) –
  `app/abrechnung/veranstaltung/actions.ts:30-37` und `app/verwaltung/katalog/actions.ts`.
  Analog zur Zentralisierung von `firstIssueMessage` (#105/#108) gehört der geteilte 23505-Helfer
  in ein domänen-benanntes `lib/`-Modul (z. B. `lib/db-errors.ts`, **nicht** `lib/utils`; Codify
  #105). **Out-of-scope für #51** (betrifft auch das Katalog-Feature) → eigenes tech-debt-Issue.
  **Blocker 2026-07-15:** Autonome Issue-Anlage über den Seam (`scripts/lib/create-issue.sh`) ist
  in dieser Session per Permission-Mode blockiert (wie zuvor `pnpm`). Der Mensch legt es an mit:
  ```bash
  source scripts/lib/create-issue.sh
  create_issue "isUniqueViolation-Helfer zentralisieren (23505-Prüfung)" \
    "Byte-gleiche Duplikate: app/abrechnung/veranstaltung/actions.ts:30-37 und app/verwaltung/katalog/actions.ts. Analog #105/#108 in lib/db-errors.ts zentralisieren (nicht lib/utils, Codify #105); optional runWithUniqueCheck-Wrapper mitvereinheitlichen. Out-of-scope für #51." \
    enhancement "tech-debt"
  ```

## Nitpicks (optional)
- [ ] **`app/abrechnung/veranstaltung/[id]/page.tsx:34-35` unterscheidet den `typ` nicht** –
  die Detailseite guardet nur `!veranstaltung` (`notFound()`), nicht den Typ. Mit der id einer
  `theke` würde die volle Führungs-UI (StatusToggle „Abschließen", `AddTeilnehmerForm`,
  `WalkInForm`) für einen Vorgang gerendert, der laut ADR-023 D7 nur über den Gast-Fluss (F5/F7)
  bespielt werden soll. Impact niedrig: die Theke ist in keiner UI verlinkt
  (`listVeranstaltungen` filtert `typ='veranstaltung'`), Aktionen sind serverseitig abgesichert
  (Abschließen no-op't still). Sauberer: `if (veranstaltung.typ !== "veranstaltung") notFound()`.
- [ ] **`createWalkInAction` nicht atomar** (`actions.ts:101-102`) – `createTeilnehmer` und
  `addZeile` laufen ohne Transaktion. Schlägt `addZeile` (reiner Infra-Fehler; 23505 bei frischer
  id ausgeschlossen) fehl, bleibt ein verwaister Teilnehmer ohne Zeile in den Stammdaten. Sehr
  geringe Eintrittswahrscheinlichkeit, harmlos (Teilnehmer bleibt normal wählbar) – Notiz.
- [ ] **Duplizierter „laden + Offen-Guard"-Block über drei Actions** – `actions.ts:63-65`,
  `:94-96`, `:116-117` wiederholen `getVeranstaltung(...)` + „not found / not offen"-Prüfung
  nahezu identisch (SRP/DRY). Extrahierbar (z. B. `ladeOffeneVeranstaltung(id)`). → `/refactor`.
- [ ] **Duplizierter `inputClass`-String + Feedback-`<p>`-Muster** über 3–4 Client-Komponenten –
  identischer Tailwind-String in `VeranstaltungForm.tsx:8`, `AddTeilnehmerForm.tsx:7`,
  `ThekeSetup.tsx:8`; dazu wiederholtes `key`-Reset + Fehler/Erfolg-Block in allen Formularen.
  Extrahierbar (`formClasses.ts` + kleine Feedback-Komponente). → `/refactor`.
- [ ] **`actions.ts` (doppelter Enum-Cast in `setStatusAction`)** – der Cast
  `status as (typeof veranstaltungStatus.enumValues)[number]` steht zweimal; einmal nach dem
  `includes`-Guard in eine lokale Variable ziehen.
- [ ] **Inkonsistente Fehlermeldung-Ablage** – teils Konstanten (`NOT_FOUND`, `NOT_OFFEN`,
  `DUPLICATE_ZEILE`), teils Inline-Literale (`"Teilnehmer und Veranstaltung nötig."`,
  `"Teilnehmer nicht gefunden."`, `"Keine Veranstaltung angegeben."`, `"Bitte eine gültige Kasse
  wählen."`). Einheitlich als benannte Konstanten wäre klarer. → `/refactor`.
- [ ] **`db/veranstaltung.ts:60-75` (`ensureThekeForKasse`)** – check-then-insert ist nicht
  nebenläufigkeitssicher: bei echtem Parallel-Insert wirft der zweite Aufruf 23505 statt die
  existierende Theke zurückzugeben. `ensureThekeAction` fängt das ab, `db/seed.ts` läuft
  single-threaded – praktisch risikolos, aber der Doc-Kommentar („idempotent auch bei
  nebenläufigem Aufruf") überzeichnet die Garantie. Sauberer: 23505 in der Funktion fangen und
  `getThekeForKasse` re-fetchen – oder den Kommentar entschärfen.
- [ ] **Manuelles FormData-Parsing vs. Zod** – `addZeileAction`, `removeZeileAction`,
  `setStatusAction` parsen FormData manuell (`String(formData.get(...))`), während
  `createVeranstaltungAction`/`createWalkInAction` Zod nutzen. Vertretbar (opake IDs bzw.
  Enum-Werte, per DB-Lookup / `enumValues.includes` validiert) – reine Konsistenz-Anmerkung zur
  „Zod an jeder Grenze"-Guideline.
- [ ] **`STATUS_LABEL` ist eine Identitäts-Map** (`labels.ts:10-13`) – `offen→"offen"`,
  `abgeschlossen→"abgeschlossen"`; der Test `labels.test.ts:20-23` prüft damit praktisch eine
  Konstante gegen sich selbst (geringer Aussagewert). Entweder als bewussten Anzeige-Seam belassen
  oder samt Test entfernen.
- [ ] **Tautologischer Snapshot-Test** – `db/veranstaltung.test.ts:147`:
  `expect(refetched.anzeigename).toBe(zeile.anzeigename)` prüft gegen den Rückgabewert des
  Objekts-under-Test (leicht tautologisch). Aussagekräftiger: `toBe(person.name)` (ursprünglicher
  Stammdaten-Name) – belegt die Snapshot-Treue nach Umbenennung direkt (testing-standards.md).
- [ ] **`proxy.ts` Matcher nimmt `theke/` (Subtree) statt strikt `theke/[token]` aus** – für den
  aktuellen Scope (gesamter Theke-Bereich öffentlich) korrekt und stilkonsistent mit
  `api/auth`/`api/version` (Präfix-basiert), aber eine Spur breiter als ADR-023 D6 wörtlich.
  Falls unter `theke/` je nicht-öffentliche Unterrouten entstehen: hier nachschärfen.
- [ ] **`KASSEN` ↔ DB-CHECK ohne Drift-Guard** – die CHECK (`db/schema.ts`) kodiert die
  Kassen-Literale getrennt von der kanonischen `KASSEN`-Konstante. ADR-023 D2 dokumentiert den
  Trade-off (Kommentar mahnt Synchronhaltung an), aber kein Test sichert die Synchronität; ein
  Guard-Test wäre fail-closed. (Runde-1-Nitpicks KASSE_LABEL-Fallback, AbrechnerGate-Extraktion,
  void-Actions ohne Nutzerfeedback, skipIf-Integrationstests, protokolliertes Wiederöffnen → F8
  bleiben korrekt an spätere Features/Refactorings delegiert.)

## Positives
- **Beide Runde-1-Findings sauber & minimal behoben, mit Tests:** Schreibschutz-Bindung an
  `veranstaltungId` (Data-Layer- + Action-Test, Integrationstest
  `should_notRemoveZeileOfOtherVeranstaltung_when_veranstaltungIdMismatch`) und Active-Prüfung in
  `addZeileAction` (`if (!person || !person.active)`, Test
  `should_returnErrorAndNotPersist_when_teilnehmerInactive`). Von allen drei Personas als echt und
  getestet verifiziert – nicht kosmetisch.
- **Strikte Schicht-Trennung:** `db/veranstaltung.ts` ist der einzige, rollen-neutrale Query-Ort;
  kein rohes SQL in Actions/UI; Business Logic nicht in Komponenten.
- **RBAC serverseitig in *jeder* Action** (`requireRole("abrechner")`; `ensureThekeAction` korrekt
  `requireAnyRole(["verwalter","abrechner"])`); Pages prüfen zusätzlich serverseitig, UI-Sperre nur
  Komfort. Zod strikt an der Grenze. Fail-closed.
- **Namens-Snapshot serverseitig** aus den autoritativen Stammdaten (`actions.ts:70,74`), nicht vom
  Client; Integrationstest deckt Namenstreue nach Umbenennung ab (ADR-022/023 D5).
- **Defense-in-depth bei Idempotenz/Duplikaten:** DB-Garantien (Partial-Unique je Theke,
  `UNIQUE(veranstaltungId, teilnehmerId)`) **plus** 23505-Handling in den Actions.
- **ADR-023 werktreu umgesetzt:** eine Tabelle + `veranstaltung_typ`-Enum (D1), Kasse als Text-Key
  + CHECK + `KASSEN`-Konstante (D2), Partial-Unique (D3/D6), bedingtes Datum-CHECK, kein
  Essenpreis-Feld (D4), Snapshot (D5), Feature-Schnitt D7 respektiert (Gast-Fluss nicht vorgezogen).
- **Migration 0006 rein additiv** und mit Schema kohärent (CHECKs + Partial-Index gespiegelt),
  lokal `0000→…→0006` grün; DB-CHECKs zusätzlich per Integrationstest belegt (Codify #48 vermieden).
- **Codify-Regeln eingehalten:** `.returning()` → `Promise<T | undefined>` (#50), `key`-Reset statt
  `useEffect` (#49), `text`-Feld-Obergrenze `bezeichnung.max(200)` (#50-Text), kein `middleware.ts`
  nur `proxy.ts` eng/fail-closed (#48/#63), domänen-benannte lib-Module (#105), Test-Isolation via
  `resetAllMocks`. Kommentare erklären durchgängig das WHY.

## Empfehlung
APPROVED

<!-- Grund: Kein kritisches Finding – alle drei Personas bestätigen APPROVED. Die
Schreibschutz-Umgehung aus Runde 1 ist verifiziert behoben (inkl. Tests), alle #51-Akzeptanz-
kriterien im gesetzten Scope serverseitig korrekt, Migration additiv/kohärent, ADR-023 werktreu.
Von den „wichtigen" Findings ist keines merge-blockierend: die zwei Coverage-Lücken
(Guard-Branches + getTeilnehmer) gehören in den unmittelbar folgenden /test-Schritt (reine
Test-Ergänzung, kein Rework-Loop), die isUniqueViolation-Duplikation ist out-of-scope und als
tech-debt-Issue ausgelagert (Anlage per Permission-Mode blockiert – Seam-Kommando im Finding
notiert). Alles Übrige sind Nitpicks für /refactor. Kein neuer Review↔Implement-Loop nötig. -->
