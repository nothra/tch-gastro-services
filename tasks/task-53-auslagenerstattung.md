# Task 53: auslagenerstattung

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
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
- [ ] Auslage erfassen: offene Veranstaltung → Eintrag `offen`, einem Teilnehmer + einer Kategorie
      zugeordnet, ohne den Verzehr-Gesamt zu verändern.
- [ ] Erstattung bestätigen: `offen` → `erstattet`.
- [ ] Erstattung zurücknehmen (Veranstaltung offen): `erstattet` → `offen`.
- [ ] Eintrag korrigieren (Veranstaltung offen): Teilnehmer/Kategorie/Betrag/Notiz änderbar,
      serverseitig validiert, ohne Verzehr-Änderung.
- [ ] Eintrag löschen (Veranstaltung offen): raus aus Übersicht, Summen und Kassenabrechnung.
- [ ] Übersicht: Summen je Kategorie + gesamt, getrennt nach „offen"/„erstattet".
- [ ] Kassieren (F8): Verzehr-Gesamt unabhängig von den Auslagen (keine Netto-Verrechnung).
- [ ] Gesamtabrechnung (F8): Erstattungen als Ausgaben je Kategorie für die zugeordnete Kasse.
- [ ] Betrag-Validierung (Zod): nur gültiger EUR-Betrag > 0 mit ≤ 2 Nachkommastellen.
- [ ] Pflichtfelder (Zod): Kategorie und Teilnehmer erforderlich.
- [ ] Abgeschlossene Veranstaltung: erfassen/ändern/löschen/erstatten/zurücksetzen gesperrt.
- [ ] IDOR-Schutz: Mutationen schließen `veranstaltungId` im WHERE ein (nicht nur Eintrags-ID).

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

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/53-auslagenerstattung`
Erstellt: 2026-07-18 01:08
