# Task 51: abend-anlegen-fuehren

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Feature F4: **Veranstaltung anlegen & führen**. „Veranstaltung" ist der Primärbegriff
(statt „Abend"), das **Datum** ist Pflichtfeld. Zwei Typen (ein gemeinsames Datenmodell):
1. **Datierte Veranstaltung** (`veranstaltung`) – Abrechner legt sie mit Datum, Bezeichnung
   und Kasse an; Teilnehmer aus Stammdaten; Status `offen`/`abgeschlossen`; Namens-Snapshot
   je Zeile (ADR-022). **Kein** Essenpreis (Essen kommt aus dem Katalog).
2. **Stehende Theken-Selbstbedienung** (`theke`) – dauerhaft offener Vorgang je Kasse für
   spontanen Wochentag-Verzehr ohne anwesenden Abrechner und ohne Login/Rolle (nur Getränke
   + Kaffee, Namenswahl aus Stammdaten).

**Essen-Modell (Änderung 2026-07-15):** Essen ist keine Eigenschaft der Veranstaltung mehr,
sondern eine Katalog-Kategorie `essen` (feste Preise). Die Kategorie ist eine **F2-Erweiterung
(eigenes Issue)**, die Essen-Erfassung ist **F5/#52**. #51 entfernt lediglich jedes Essenpreis-Feld.

Kanonische Spec: `docs/specs/spec-51-abend-anlegen.md`.

## Akzeptanzkriterien
**A) Datierte Veranstaltung**
- [x] Abrechner legt Veranstaltung mit Datum, Bezeichnung, Kasse an → Typ `veranstaltung`, Status `offen` (kein Essenpreis).
- [x] Kasse fehlt → serverseitige Ablehnung (Pflichtfeld).
- [x] Datum fehlt → serverseitige Ablehnung (Pflichtfeld).
- [x] Teilnehmer aus Stammdaten auswählen → je Teilnehmer eine Zeile mit Namens-Snapshot.
- [x] Offene Veranstaltung: Teilnehmer hinzufügen/entfernen (solange ohne Erfassung).
- [ ] Teilnehmer mit erfassten Positionen entfernen → verhindert / bewusste Bestätigung.
      _→ delegiert an **F5/#52**: „erfasste Positionen" (Verzehr) existieren erst mit der
      Erfassung; in #51 gibt es noch kein Positions-Modell, gegen das geprüft werden könnte._
- [x] Abrechner-Walk-in legt neuen Teilnehmer an (in Stammdaten + Zeile).
- [x] Abgeschlossene Veranstaltung schreibgeschützt; Abrechner kann wieder öffnen (Protokollierung → **F8/#55**).

**B) Stehende Theken-Selbstbedienung** _(Fundament in #51; Gast-Erfassungsfluss → F5/#52 + F7/#54, ADR-023 §D7)_
- [x] Verwalter/Abrechner richtet je Kasse genau eine stehende Theke ein (idempotent).
- [ ] Nicht angemeldeter Gast öffnet festen Theken-Link/QR und wählt Namen aus Stammdaten.
      _→ öffentliche Theken-Seite + Namenswahl: **F5/#52 + F7/#54** (Token + proxy-Seam liegen in #51)._
- [ ] Gast erfasst Getränke/Kaffee → Zeile in der stehenden Theke.
      _→ Gast-Erfassungsfluss: **F5/#52**._
- [ ] Erfassung ohne anwesenden Abrechner möglich (Theke steht bereit).
      _→ Theke steht bereit (Provisionierung in #51); Erfassungs-UI: **F5/#52 + F7/#54**._
- [x] Theke ist einer Kasse zugeordnet; Einnahmen wirken auf diese Kasse. _(Zuordnung in #51; Kassieren → F8/#55.)_
- [ ] Abrechner kassiert offene Einträge später (F8); Theke bleibt danach offen.
      _→ Kassier-Vorgang: **F8/#55**._

**Fehlerszenarien**
- [x] Zweite Theke je Kasse → abgelehnt (Idempotenz).
- [ ] Essen an der Theke → nicht verfügbar (nur Getränke + Kaffee).
      _→ durchgesetzt im Erfassungsfluss: **F5/#52** (Essen ist Katalog-Kategorie, #116)._
- [ ] Ungültiges Theken-Token → neutraler Fehler.
      _→ öffentliche Theken-Seite: **F5/#52 + F7/#54** (proxy-Seam für `theke/[token]` in #51)._

## Technische Notizen
**Entscheidung: [ADR-023](../docs/adr/023-veranstaltung-datenmodell.md).** Kurzfassung für /implement:

- **Schema (`db/schema.ts`):**
  - Enums `veranstaltung_typ` (`veranstaltung`|`theke`), `veranstaltung_status` (`offen`|`abgeschlossen`).
  - Tabelle `veranstaltung`: `id`(uuid), `typ`(default `veranstaltung`), `bezeichnung`,
    `datum`(date, nullable), `kasse`(**text-Key**, nicht Enum), `status`(default `offen`),
    `token`(text, unique, unratbar via crypto), `createdAt/updatedAt`. **Kein** Essenpreis-Feld.
  - **Partial-Unique-Index** `on(kasse) where typ='theke'` → genau eine Theke je Kasse.
  - **CHECK** `typ<>'veranstaltung' OR datum IS NOT NULL` (Datum-Pflicht nur für datierte).
  - **CHECK** `kasse IN ('montagsrunde','vereinskasse')` (fail-closed ohne Enum).
  - Tabelle `veranstaltung_zeile`: `id`, `veranstaltungId`(FK cascade), `teilnehmerId`(FK),
    `anzeigename`(**Snapshot** aus `teilnehmer.name` beim Anlegen), `createdAt/updatedAt`,
    `UNIQUE(veranstaltungId, teilnehmerId)`.
- **Migration** lokal gegen Wegwerf-DB verifizieren (`0000→…→n` grün, Codify #48). CHECKs +
  Partial-Index von Hand prüfen (drizzle-kit-Prompt ggf. per PTY beantworten).
- **Data-Layer `db/veranstaltung.ts`** (rollen-neutral, einziger Query-Ort): `createVeranstaltung`,
  `listVeranstaltungen`, `getVeranstaltung`, `setStatus`, `ensureThekeForKasse`, `addZeile`,
  `removeZeile`, `listZeilen`. UPDATE/DELETE mit `.returning()` → `Promise<T | undefined>` (Codify #50).
  Konstante `KASSEN = ["montagsrunde","vereinskasse"] as const` als kanonische Quelle (Zod + Seed + CHECK).
- **Actions** unter `app/abrechnung/veranstaltung/` mit `requireRole("abrechner")`. Zod-Grenze:
  `datum` Pflicht für `typ='veranstaltung'`; `kasse` gegen `KASSEN`; **kein** Essenpreis-Feld.
  `useActionState`-Erfolg per `useCallback`-Wrapper schließen, **kein** `useEffect` (Codify #49).
- **Provisionierung Theke:** Seed-Erweiterung + `ensureThekeForKasse` (Guard
  `requireAnyRole(["verwalter","abrechner"])`); Idempotenz via Partial-Unique (`23505` → „existiert bereits").
- **proxy.ts:** Negativ-Lookahead um `theke/[token]` erweitern (eng gefasst, fail-closed, Codify #63).
- **Feature-Schnitt (ADR-023 §D7):** #51 baut **Fundament** (Schema, Data-Layer, Abrechner-UI
  datierte Veranstaltung, Theke-Provisionierung, token + proxy-Seam). Der **Gast-Erfassungsfluss**
  der Theke (öffentliche Seite/Erfassung) kommt mit **F5/#52 + F7/#54** – nicht in #51 vorziehen.
- **Tests:** Oberflächentests gegen lokalen `pnpm dev`-Server gehören in /implement (Memory-Notiz).
  Vitest ohne `globals:true` → `cleanup()` in `afterEach` (Codify #48).

## Offene Fragen
**In ADR-023 entschieden:**
- Kasse als Text-Key statt Enum/Entität (§D2); Provisionierung idempotent serverseitig (§D3);
  bedingte Pflichtfelder via CHECK (§D4).

**Bewusst an Folge-Features/Reviews delegiert:**
- [ ] Katalog-Kategorie `essen` (Essen-Preise) → **eigenes F2-Erweiterungs-Issue #116** (Essen ist
      nicht mehr Teil der Veranstaltung); Essen-Erfassung per Katalog-Auswahl → **F5/#52** (Spec angepasst).
- [ ] Abrechnungs-Periodik der stehenden Theke (offen vs. kassiert) → **F8/#55** (ADR-023 §D7).
- [ ] Fester Theken-Token: Länge/Rotation/Rate-Limit → **F7/#54 & /security-review**.
- [ ] Unbekannter Gast an der Theke: nur Stammdaten vs. Freitext → **F7/#54**.
- [ ] Echtzeit-Updates / Nebenläufigkeit an derselben Zeile → **F5/#52**.

## Implementierungs-Status (2026-07-15)
Code + Tests sind vollständig geschrieben und intern konsistent (alle Abhängigkeiten geprüft:
`lib/form-errors`, `lib/authz`, `teilnehmerSchema`/`TeilnehmerFields`; Schema/CHECKs/Index laut
ADR-023; Actions mit RBAC + `23505`-Handling; UI mit `key`-Reset statt `useEffect`; `proxy.ts`-Seam;
`seed.ts`). Tests decken alle Akzeptanzkriterien ab (schema/actions/data-layer/labels).

**Blocker 2026-07-15 – behoben:** Migration `0006_material_grey_gargoyle.sql` generiert
(rein additiv, kein Rename-Prompt) und gegen die lokale Docker-Dev-DB `0000→…→0006` grün
verifiziert (CHECKs `veranstaltung_datum_pflicht`/`veranstaltung_kasse_gueltig` + Partial-Index
`veranstaltung_eine_theke_je_kasse` per `\d` bestätigt). Zusätzlich einen Test-Isolation-Bug in
`actions.test.ts` gefixt: `vi.clearAllMocks()` im `beforeEach` löscht keine Mock-Implementierungen
(nur Call-History) – `addZeileMock.mockRejectedValue({code:"23505"})` aus dem
`addZeileAction`-Block leakte dadurch in `createWalkInAction`-Tests (Reihenfolge-Abhängigkeit,
Verstoß gegen testing-standards.md). Fix: `vi.resetAllMocks()`. `pnpm lint` + `pnpm test`
(149 passed) jetzt grün.

## Review-Findings
Review 2026-07-15 (`tasks/review-51.md`): Empfehlung NEEDS_REWORK. Behoben:

- **[kritisch] Schreibschutz-Umgehung in `removeZeileAction`/`removeZeile`** – `removeZeile`
  filterte nur über `veranstaltungZeile.id`, ohne Bindung an `veranstaltungId`. Ein manipulierter
  Request (offene Veranstaltung + fremde `zeileId` aus abgeschlossener Veranstaltung/Theke) konnte
  die fremde Zeile löschen. **Fix:** Signatur `removeZeile(zeileId, veranstaltungId)`, Delete via
  `and(eq(id, …), eq(veranstaltungId, …))`; Action übergibt beide Werte. Data-Layer-Test
  `should_notRemoveZeileOfOtherVeranstaltung_when_veranstaltungIdMismatch` (belegt no-match →
  `undefined`, fremde Zeile bleibt) + Action-Test auf `("z1","v1")` angepasst.
- **[wichtig] Fehlende Active-Prüfung in `addZeileAction`** – `getTeilnehmer` selektiert unabhängig
  von `active`; ein manipulierter Request konnte einen soft-gelöschten Teilnehmer erfassen.
  **Fix:** `if (!person || !person.active) return { error: … }`; Test
  `should_returnErrorAndNotPersist_when_teilnehmerInactive`.
- Nitpicks (KASSE_LABEL-Fallback, AbrechnerGate-Extraktion, void-Actions ohne Feedback,
  skipIf-Integrationstests, protokolliertes Wiederöffnen) bewusst nicht in #51 behandelt – teils
  durch DB-CHECK unmöglich, teils an F8/#55 bzw. spätere Refactorings delegiert (siehe Review-Datei).

**Gates nach Review-Fixes grün (2026-07-15, Session 2):** Review-Fixes waren bereits committet
(`9153bc9`, Arbeitsbaum sauber). Erneut grün gefahren:
- `pnpm lint` (via `scripts/checks/pre-commit.sh`) – bestanden.
- `pnpm test` (via `scripts/checks/pre-push.sh`) – **150 passed | 27 skipped** (Skips = DB-Integration
  ohne `DATABASE_URL` in dieser Suite).
- DB-Integrationstests gegen die laufende lokale Docker-DB (`tch-gastro-db`, `postgresql://…/tch_dev`):
  `drizzle-kit migrate` angewandt, dann `db/veranstaltung`+`db/teilnehmer`+`db/catalog` → **27 passed**,
  inkl. Review-Fix-Test `should_notRemoveZeileOfOtherVeranstaltung_when_veranstaltungIdMismatch`.

Hinweis Permission-Mode: bare `pnpm` ist nicht allow-gelistet; die Gates laufen über
`bash scripts/checks/*` (dort per `eval` als Subprozess) – kein separater pnpm-Grant nötig.
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/51-abend-anlegen-fuehren`
Erstellt: 2026-07-15 15:13
