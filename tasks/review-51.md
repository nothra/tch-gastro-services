# Review: Task 51

> Runde 2 (2026-07-15, nach Rework). Die beiden Findings der ersten Runde
> (kritisch: Schreibschutz-Umgehung in `removeZeile`; wichtig: fehlende Active-Prüfung
> in `addZeileAction`) sind im Code **verifiziert behoben** – siehe „Positives". Diese
> Runde sucht neue Findings; behobene werden nicht wiederholt.

## Kritische Findings (müssen behoben werden)
- _Keine._ Die serverseitige Schreibschutz-Umgehung aus Runde 1 ist behoben
  (`removeZeile(zeileId, veranstaltungId)` mit `and(eq(id,…), eq(veranstaltungId,…))`,
  `db/veranstaltung.ts:94-105`; Action übergibt beide Werte, `actions.ts:119`;
  Data-Layer-Test `should_notRemoveZeileOfOtherVeranstaltung_when_veranstaltungIdMismatch`).

## Wichtige Findings (sollten behoben werden)
- [ ] **`app/abrechnung/veranstaltung/actions.ts` (Guard-Clause-Branches ungetestet)** –
  Die serverseitigen Leerfeld-Guards an der System-Grenze haben keinen Test, obwohl neuer
  Code laut `testing-standards.md` 100 % abgedeckt und Fehlerfälle explizit getestet sein
  sollen: `addZeileAction:61` (`!veranstaltungId || !teilnehmerId`), `removeZeileAction:114`
  (`!veranstaltungId || !zeileId`), `setStatusAction:129` (`!id`), `createWalkInAction:92`
  (`!veranstaltungId`). Ein Entfernen dieser Zeilen würde von keinem Test bemerkt.
  **Empfehlung:** im `/test`-Schritt schließen (kein Rework-Loop nötig – reine Test-Ergänzung).
- [ ] **`isUniqueViolation` byte-gleich in zwei Feature-Modulen dupliziert** (out-of-scope) –
  `app/abrechnung/veranstaltung/actions.ts:30-37` und `app/verwaltung/katalog/actions.ts:18-26`.
  Analog zur bereits erfolgten Zentralisierung von `firstIssueMessage` (#105/#108) gehört der
  geteilte 23505-Helfer in ein domänen-benanntes `lib/`-Modul (z. B. `lib/db-errors.ts`, nicht
  `lib/utils`; Codify #105). **Out-of-scope für #51** (betrifft auch das Katalog-Feature) →
  eigenes tech-debt-Issue. **Blocker 2026-07-15:** Autonome Issue-Anlage über den Seam
  (`scripts/lib/create-issue.sh`) in dieser Session per Permission-Mode blockiert (wie zuvor
  `pnpm`). Der Mensch legt es an mit:
  ```bash
  source scripts/lib/create-issue.sh
  create_issue "isUniqueViolation-Helfer zentralisieren (23505-Prüfung)" \
    "Byte-gleiche Duplikate: app/abrechnung/veranstaltung/actions.ts:30-37 und app/verwaltung/katalog/actions.ts:18-26. Analog #105/#108 in lib/db-errors.ts zentralisieren (nicht lib/utils, Codify #105); optional runWithUniqueCheck-Wrapper mitvereinheitlichen. Out-of-scope für #51." \
    enhancement "tech-debt"
  ```

## Nitpicks (optional)
- [ ] **`db/veranstaltung.ts:64-75` (`ensureThekeForKasse`)** – check-then-insert ist nicht
  nebenläufigkeitssicher: bei echtem Parallel-Insert wirft der zweite Aufruf 23505 statt die
  existierende Theke zurückzugeben. `ensureThekeAction` fängt das ab, `db/seed.ts:33` nicht.
  Praktisch risikolos (Seed single-run), aber Name/Kommentar („idempotent auch bei
  nebenläufigem Aufruf") überzeichnen die Garantie der Funktion. Sauberer: 23505 in der
  Funktion fangen und `getThekeForKasse` re-fetchen – oder den Kommentar entschärfen.
- [ ] **Duplizierter `inputClass`-String über 3 Client-Komponenten** – identischer
  Tailwind-String in `VeranstaltungForm.tsx:8`, `AddTeilnehmerForm.tsx:7`, `ThekeSetup.tsx:8`;
  dazu wiederholtes `key`-Reset-Muster + Fehler/Erfolg-`<p>`-Blöcke in allen vier Formularen.
  Extrahierbar (z. B. `formClasses.ts` + kleine Feedback-Komponente). → `/refactor`.
- [ ] **`actions.ts:130`/`:138` (`setStatusAction`)** – der Enum-Cast
  `status as (typeof veranstaltungStatus.enumValues)[number]` steht zweimal; einmal nach dem
  `includes`-Guard in eine lokale Variable ziehen.
- [ ] **`db/veranstaltung.test.ts:147`** – `expect(refetched.anzeigename).toBe(zeile.anzeigename)`
  prüft gegen den früheren Rückgabewert des Objekts-under-Test (leicht tautologisch).
  Aussagekräftiger: `toBe(person.name)` (ursprünglicher Stammdaten-Name) – belegt direkt die
  Snapshot-Treue nach Umbenennung (testing-standards.md).
- [ ] **`app/abrechnung/veranstaltung/labels.test.ts:5`** – der `formatDatum`-Test bewacht die
  `timeZone:"UTC"`-Zusage nur in negativen Offset-Zeitzonen; als deterministischer Nachweis der
  WHY-Aussage schwach.
- [ ] **`schema.ts` (datum-Refine via `Date.parse`)** – laxer als `<input type=date>` (akzeptiert
  z. B. `"2026"`); ein striktes `YYYY-MM-DD`-Regex wäre robuster gegen manipulierte Requests.
  Kein Korrektheits-/Sicherheitsproblem (DB-CHECK erzwingt NOT NULL, Ausgabe UTC-korrekt).
- [ ] **`createWalkInAction`** umgeht die Duplikat-Namens-Warnung (`findActiveByName`) des
  Verwalter-Pfads (spec-50/ADR-022). Vertretbar (Namensgleichheit erlaubt, #51-AK fordert nur
  „neu anlegen"), aber inkonsistent.
- [ ] **`KASSEN` ↔ DB-CHECK ohne Drift-Guard** – `db/schema.ts:180` kodiert die Kassen-Literale
  in der CHECK getrennt von der kanonischen `KASSEN`-Konstante (`schema.ts:146`). ADR-023
  dokumentiert den Trade-off, aber kein Test sichert die Synchronität. Ein Guard-Test wäre
  fail-closed. (Runde-1-Nitpicks KASSE_LABEL-Fallback, AbrechnerGate-Extraktion, void-Actions
  ohne Feedback, skipIf-Integrationstests, protokolliertes Wiederöffnen → F8 bleiben offen und
  korrekt delegiert.)

## Positives
- **Beide Runde-1-Findings sauber & minimal behoben, mit Tests:** Schreibschutz-Bindung an
  `veranstaltungId` (Data-Layer + Action-Test) und Active-Prüfung in `addZeileAction`
  (`if (!person || !person.active)`, Test `should_returnErrorAndNotPersist_when_teilnehmerInactive`).
- Saubere Schicht-Trennung: `db/veranstaltung.ts` als einziger, rollen-neutraler Query-Ort;
  RBAC-Guards (`requireRole`/`requireAnyRole`) in **jeder** Action; Zod strikt an der Grenze.
- Namens-Snapshot **serverseitig** aus den autoritativen Stammdaten geholt (ADR-022/023 D5);
  Integrationstest deckt Namenstreue nach Umbenennung ab.
- Defense-in-depth bei Idempotenz/Duplikaten: DB-Garantie (Partial-Unique je Theke,
  `UNIQUE(veranstaltungId, teilnehmerId)`) **plus** 23505-Handling in den Actions.
- CHECK-Constraints + Partial-Index sauber in Schema **und** Migration 0006 gespiegelt, rein
  additiv, lokal `0000→…→0006` grün verifiziert (Codify #48).
- Codify-Regeln eingehalten: `.returning()` → `Promise<T | undefined>` (#50), `useCallback`/
  `key`-Reset statt `useEffect` (#49), proxy-Seam eng/fail-closed (#63), Test-Isolation-Fix
  `resetAllMocks` statt `clearAllMocks`, domänen-benannte Module (#105).
- ADR-023 treu: eine Tabelle + `veranstaltung_typ`-Enum (D1), Kasse als Text-Key + CHECK (D2),
  Partial-Unique (D3/D6), bedingtes Datum-CHECK (D4), Feature-Schnitt D7 respektiert (kein
  Vorziehen des Gast-Frontends – nur `token`-Spalte + proxy-Seam).

## Empfehlung
APPROVED

<!-- Grund: Kein kritisches Finding – die Schreibschutz-Umgehung aus Runde 1 ist verifiziert
behoben (inkl. Tests), alle #51-Akzeptanzkriterien im gesetzten Scope serverseitig korrekt,
Migration additiv/kohärent. Von zwei „wichtigen" Findings ist keines merge-blockierend: die
Guard-Branch-Coverage gehört in den unmittelbar folgenden /test-Schritt (reine Test-Ergänzung,
kein Rework-Loop), die isUniqueViolation-Duplikation ist out-of-scope und als tech-debt-Issue
ausgelagert (Anlage per Permission-Mode blockiert – Seam-Kommando im Finding notiert). Alles
Übrige sind Nitpicks für /refactor. Kein neuer Review↔Implement-Loop nötig. -->
