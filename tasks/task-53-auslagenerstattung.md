# Task 53: auslagenerstattung

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Feature F6 – **Auslagenerstattung als eigener Vorgang**. Der Veranstalter (vormals Abrechner)
erfasst je Veranstaltung Auslagen-Einträge (je einem Teilnehmer + einer Kategorie Getränke/Essen/
Sonstiges zugeordnet, Betrag > 0, optionale Notiz) und erstattet sie als **separate
Barauszahlung** aus der der Veranstaltung zugeordneten Kasse. Auslagen mindern **nicht** den Verzehr
(keine Netto-Verrechnung beim Kassieren); auf Veranstaltungs-Ebene gehen die Erstattungen als Ausgaben
je Kategorie in die Kassenabrechnung ein. Einträge sind korrigier-, lösch- und in der
Erstattung rücknehmbar, solange die Veranstaltung offen ist.

Kanonische Quelle: **`docs/specs/spec-53-auslagen.md`**.

## Akzeptanzkriterien
<!-- Von /requirements befüllt; kanonisch in docs/specs/spec-53-auslagen.md -->
- [x] Auslage erfassen: offene Veranstaltung → Eintrag `offen`, einem Teilnehmer + einer Kategorie
      zugeordnet, ohne den Verzehr-Gesamt zu verändern.
- [x] Erstattung bestätigen: `offen` → `erstattet`.
- [x] Erstattung zurücknehmen (Veranstaltung offen): `erstattet` → `offen`.
- [x] Eintrag korrigieren (Veranstaltung offen): Teilnehmer/Kategorie/Betrag/Notiz änderbar,
      serverseitig validiert, ohne Verzehr-Änderung.
- [x] Eintrag löschen (Veranstaltung offen): raus aus Übersicht, Summen und Kassenabrechnung.
- [x] Übersicht: Summen je Kategorie + gesamt, getrennt nach „offen"/„erstattet".
- [x] Kassieren (F8): Verzehr-Gesamt unabhängig von den Auslagen (keine Netto-Verrechnung).
      → strukturell garantiert: `auslage` ist eine eigene Tabelle, keine Auslagen-Action berührt
      `verzehr`/`adjustMenge`.
- [~] Gesamtabrechnung (F8): Erstattungen als Ausgaben je Kategorie für die zugeordnete Kasse.
      → **Handoff** für F8/#55 (ADR-028 D6): `auslagenSummen` liefert `erstattet`-Summen je Kategorie;
      die eigentliche Kassenabrechnung baut F8/#55, nicht F6.
- [x] Betrag-Validierung (Zod): nur gültiger EUR-Betrag > 0 mit ≤ 2 Nachkommastellen.
- [x] Pflichtfelder (Zod): Kategorie und Teilnehmer erforderlich.
- [x] Abgeschlossene Veranstaltung: erfassen/ändern/löschen/erstatten/zurücksetzen gesperrt.
- [x] IDOR-Schutz: Mutationen schließen `veranstaltungId` im WHERE ein (nicht nur Eintrags-ID).

## Technische Notizen
<!-- Entschieden in ADR-028 (docs/adr/028-auslagen-datenmodell.md); Analog: ADR-025 (Verzehr). -->

**Datenmodell (ADR-028 D1):** neue Tabelle `auslage` mit Parent-Key `veranstaltungId` (FK→veranstaltung,
cascade), `teilnehmerId` (FK→teilnehmer, restrict), neue Enums `auslage_kategorie`
(`getraenke`/`essen`/`sonstiges`) und `auslage_status` (`offen`/`erstattet`, Default `offen`),
`betragCents` Integer mit DB-CHECK `> 0`, `zweck` nullable text. Eigene Kategorie-Wertmenge –
**nicht** `catalog_category`. Kein Katalog-Bezug (Auslage ist kein Artikel).

**Löschen (D2): Hard-Delete** – `auslage` ist Leaf (nichts referenziert es), kein Dangling-/Audit-Bedarf;
bewusste Abweichung von ADR-026-Soft-Delete. Nur bei Veranstaltung `offen`.

**Status (D3):** pgEnum, beidseitig umschaltbar (`offen ⇄ erstattet`), keine Historie/kein `erstattetAt`.

**Route/UI (D4):** authentifizierte Unterroute `app/veranstaltung/[id]/auslagen/` (keine `proxy.ts`-
Ausnahme). **Kein** route-neutrales `app/_auslagen/` (veranstalter-only, keine F7-Wiederverwendung).
DB-freies Summen-Modul mit Domänennamen (z. B. `auslagenSummen.ts`, nicht `utils`), 100 % unit-testbar;
`formatCents` (lib/money) für Anzeige. Kein Echtzeit-Push, kein atomarer Delta-Upsert (keine geteilten Zähler).

**Data-Layer `db/auslage.ts` (D5):** `createAuslage`, `listAuslagen(veranstaltungId)` (Join auf
`veranstaltung_zeile` für `anzeigename`-Snapshot), `updateAuslage(id, veranstaltungId, …)`,
`setAuslageStatus(id, veranstaltungId, status)`, `removeAuslage(id, veranstaltungId)`. UPDATE/DELETE-
Rückgaben `Promise<T | undefined>` (Codify #50).

**Actions – fail-closed-Reihenfolge (D5):** 1) `requireRole("veranstalter")`, 2) Zod (Kategorie-Enum,
Betrag EUR > 0 ≤ 2 NKS mit Obergrenze ≤ 2_147_483_647 (Codify #49), `teilnehmerId` gesetzt, `zweck`
`.max(200)` (Codify #50)), 3) Veranstaltung `offen`, 4) IDOR-Bindung `veranstaltungId` im WHERE
(Codify #51), 5) bei create/update Teilnehmer `active` + Mitglied (Zeile existiert), 6) ausführen +
`revalidatePath`.

**F8-Handoff (D6):** F8 summiert `erstattet`-Auslagen je Kategorie als Kassen-Ausgang (kein Verzehr-Abzug).

**Migration:** neue Tabelle + 2 Enums + CHECK + FKs; `db:generate`, lokal `0000→…→n` gegen Wegwerf-DB
verifizieren (Codify #48). Reine Neuanlage → kein interaktiver drizzle-kit-Prompt erwartet.

**Test-Pflichten (aus Codify):** Guard-Clause-Branches je eigener Test (#51); Exhaustiveness-`never` je
Test (testing-standards); Zod-Meldungsinhalt separat vom Ablehnungs-Test (#116); je separierbares
AC-Kriterium eine Assertion (#117); `pnpm build`/typecheck vor Merge (#137, jetzt im pre-push-Gate).

## Offene Fragen
- [x] Datenmodell (eigene Entität je Veranstaltung) + Hard- vs. Soft-Delete → **ADR-028 D1/D2** (Hard-Delete).
- [x] Statusmodell `offen` ⇄ `erstattet` als Boolean/Enum ohne Historie → **ADR-028 D3** (pgEnum).
- [x] Vormerkung Kassenbuch #57 (nur je Veranstaltung im MVP) → **ADR-028 D6** (additiv, kein Saldo).

## Implementierungs-Notizen (/implement, 2026-07-18)

**Umgesetzt (alle Gates grün: `pnpm test` 371 grün / 51 skip = DB-Integration, `pnpm lint` 0 Warnungen,
`pnpm typecheck` grün):**
- Data-Layer `db/auslage.ts` + Schema/Enums/CHECK + Migration `0010` (committet in `1fef533`).
- Zod-Schema `auslageSchema`/`auslageStatusSchema` (`app/veranstaltung/schema.ts`) + Actions
  `create/update/setStatus/removeAuslageAction` mit fail-closed-Reihenfolge, IDOR-Bindung und
  Teilnehmer-/`active`-Guard (`actions.ts`, committet in `1fef533`).
- DB-freies Summen-Modul `auslagenSummen.ts` (committet in `1fef533`).
- UI: `AuslageForm`/`AuslageRow`/`AuslagenSummary`, Route `app/veranstaltung/[id]/auslagen/page.tsx`,
  Verlinkung von der Detailseite, `AUSLAGE_*`-Labels, `centsToEuroInput` (committet in `f7be015`).
- Lint-Warnung in `schema.test.ts` (unused rest-sibling `_zweck`) bereinigt.

**Offen / Blocker [2026-07-18]:**
- **Migrations-Smoke-Test gegen Wegwerf-DB (Codify #48)** noch nicht ausgeführt – die dafür nötigen
  `docker compose`/`docker exec`-Kommandos sind in dieser Session nicht allow-gelistet (Approval
  verweigert). Migration ist reine Neuanlage (Tabelle + 2 Enums + CHECK + FKs, kein Enum-Wert-Wechsel
  → kein interaktiver drizzle-kit-Prompt erwartet); Schema/Snapshot-Konsistenz durch `pnpm typecheck`
  gedeckt. **Erforderliche Aktion Mensch:** Docker-Grant erteilen, dann
  `docker exec tch-gastro-db psql -U tch -d tch_dev -c "DROP DATABASE IF EXISTS tch_verify;" -c "CREATE DATABASE tch_verify;"`
  und `DATABASE_URL=postgresql://tch:tch@localhost:5432/tch_verify pnpm exec drizzle-kit migrate`
  laufen lassen (Nachweis `0000→0010` grün). Alternativ später über `/post-merge-verify`.
- **Browser-/E2E-Oberflächenverifikation:** UI ist auf Component-Ebene getestet (RTL: Form/Row/Summary +
  `page.test.tsx`). Volle E2E gegen einen Dev-Server steht aus (`.env.local` fehlt in dieser Session) –
  in `/verify`/`/test` nachziehen, sobald DB + `.env.local` verfügbar sind.

## Review-Findings
<!-- Wird durch /review befüllt -->

**Review-Runde 1 (NEEDS_REWORK, `tasks/review-53.md`) – Rework 2026-07-18:**
- **K1 (kritisch, behoben):** `listAuslagen` INNER→**LEFT JOIN** `veranstaltung_zeile` +
  INNER JOIN `teilnehmer`, `anzeigename = COALESCE(zeile.anzeigename, teilnehmer.name)`
  (`db/auslage.ts`). Zeile-Löschen verwaist eine (ggf. `erstattet`e) Auslage nicht mehr still
  aus Übersicht/Summen/F8. ADR-028 D5 + Konsequenzen nachgezogen; Integrationstest ergänzt
  (`should_keepAuslageVisibleWithFallbackName_when_zeileDeleted`, DB-Integration → skipped ohne DB).
- **W1 (behoben):** Formular-Reset per `formRef.reset()` statt key-Remount (`AuslageForm.tsx`) –
  leert die Felder bei jeder erfolgreichen Neu-Erfassung, nicht nur der ersten. Zwei Tests.
- **W2 (behoben):** Drei separate `firstIssueMessage`-Assertions für die Betrag-Meldungen
  (Format / `>0` / int4-Obergrenze) in `schema.test.ts` (Codify #116).
- **Nitpicks:** bewusst offen gelassen (optional, kein Merge-Blocker) – s. `tasks/review-53.md`.

Gates nach Rework grün: `pnpm test` 376 passed / 52 skip (DB-Integration), `pnpm lint` 0 Warnungen,
`tsc --noEmit` clean.

## Test-Notizen (/test, 2026-07-18)

**Coverage-Analyse:** `pnpm test:coverage` zeigt `app/veranstaltung` (inkl. aller Auslagen-Dateien:
`AuslageForm.tsx`, `AuslageRow.tsx`, `AuslagenSummary.tsx`, `auslagenSummen.ts`, `schema.ts`,
`labels.ts`) bei 99,63 % Stmts / 98,19 % Branch / 100 % Funcs / 100 % Lines – alle Auslagen-Dateien
selbst bei 100 % (Reporter listet nur unvollständige Dateien einzeln; `actions.ts`-Restlücken
109/139/203 liegen in bereits vor #53 bestehenden, nicht-Auslagen-Actions). `db/auslage.ts` zeigt
0 % nur weil die Integrationstests ohne laufende DB überspringen (`describe.skipIf(!hasDb)`,
konsistent mit allen anderen `db/*.ts`-Data-Layer-Dateien im Projekt – kein #53-spezifisches Defizit).

**AC-Vollständigkeits-Check gegen `spec-53-auslagen.md`:** alle Happy-Path-, Fehler- und
Boundary-Fälle bereits während `/implement` + Review-Rework testbegleitet umgesetzt:
- Betrag-Validierung: Format/`>0`/int4-Obergrenze je mit eigener Ablehnungs- **und** separater
  Meldungsinhalts-Assertion (Codify #116/#117) – keine Lücke gefunden.
- Pflichtfelder (Kategorie/Teilnehmer), Zweck-Obergrenze (200 Zeichen) inkl. Boundary (201 Zeichen
  abgelehnt) – vorhanden.
- Abschluss-Sperre (create/update/setStatus/remove) je mit eigenem Testfall – vorhanden.
- IDOR-Bindung `veranstaltungId` im WHERE: `db/auslage.test.ts` (Integrationstests je Mutation,
  DB-Integration) + actions-seitig über Mock-Rückgabe `undefined` (Codify #51) – vorhanden.
- Guard-Clause-Branches (`assertTeilnehmerInVeranstaltung`: nicht zugeordnet / inaktiv) je für
  create und update separat getestet – vorhanden.
- Exhaustiveness-`never`-Guard in `auslagenSummen.ts` per Type-Cast erzwungen und getestet
  (testing-standards.md) – vorhanden.
- K1-Regressionstest (LEFT JOIN bei Zeilen-Löschung, verwaiste Auslage bleibt sichtbar) –
  vorhanden (`should_keepAuslageVisibleWithFallbackName_when_zeileDeleted`, DB-Integration).

**Ergebnis:** Keine fehlenden Tests identifiziert – kein Produktionscode oder Testcode geändert
in diesem Schritt (Skill-Regel „kein Produktionscode ändern"). Gates final grün: `pnpm test` 376
passed / 52 skip (DB-Integration, ohne laufende DB erwartungsgemäß), `bash scripts/checks/pre-push.sh`
(Tests + Typecheck + Branch-Check) grün.

**Weiterhin offen (unverändert aus Implementierungs-Notizen, kein `/test`-Scope):** Migrations-
Smoke-Test gegen Wegwerf-DB (Docker-Grant fehlt in dieser Session) und Browser-/E2E-Verifikation
(`.env.local` fehlt) – beide Session-Umgebungs-Blocker, nicht Test-Suite-Lücken. Nachziehen in
`/post-merge-verify` bzw. sobald DB/`.env.local` verfügbar sind.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/53-auslagenerstattung`
Erstellt: 2026-07-18 01:08
