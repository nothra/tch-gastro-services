# Task 50: teilnehmer-stammdaten

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Feature F3: Stammdaten-Verwaltung für **Teilnehmer** (Einzelperson oder Familie) durch den
**Verwalter**. Teilnehmer werden angelegt, bearbeitet und deaktiviert (kein Hard-Delete) und
sind später beim Anlegen eines Abends (F4) auswählbar. Felder: Anzeigename, Typ
(`person` | `familie`), Kennzeichen `mitglied` (ja/nein), aktiv/inaktiv. Kein Teilnehmer-Konto.

Kanonische Spec: [docs/specs/spec-50-teilnehmer-stammdaten.md](../docs/specs/spec-50-teilnehmer-stammdaten.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN ein angemeldeter Verwalter WHEN er einen Teilnehmer vom Typ `person` oder `familie`
      mit Anzeigename und Mitglied-Kennzeichen anlegt THEN erscheint dieser in der
      Stammdatenliste und ist beim Anlegen eines Abends auswählbar.
- [ ] GIVEN ein bestehender Teilnehmer WHEN der Verwalter Name oder Mitglied-Kennzeichen ändert
      THEN gilt die Änderung für künftige Abende; abgeschlossene Abende zeigen weiterhin den
      Namen wie zum Abrechnungszeitpunkt.
- [ ] GIVEN ein Teilnehmer, der nicht mehr kommt WHEN der Verwalter ihn deaktiviert THEN ist er
      für neue Abende nicht mehr wählbar, bleibt aber in alten Abrechnungen erhalten.
- [ ] GIVEN eine leere oder nur aus Leerzeichen bestehende Namenseingabe WHEN gespeichert wird
      THEN wird sie serverseitig (Zod) abgelehnt.
- [ ] GIVEN ein Abrechner (ohne Verwalter-Rolle) WHEN er Stammdaten bearbeiten will THEN wird die
      Aktion serverseitig abgelehnt (siehe F1).
- [ ] GIVEN ein offener Abend WHEN der **Abrechner** einen bisher unbekannten Teilnehmer
      (Walk-in) mit Anzeigename und Typ anlegt THEN wird dieser in den Stammdaten angelegt **und**
      dem Abend als Zeile hinzugefügt.
- [ ] GIVEN die Preisberechnung eines Verzehrs WHEN der Teilnehmer Nicht-Mitglied ist THEN gelten
      dieselben Preise wie für Mitglieder (Kennzeichen `mitglied` ist nur Info/Auswertung).

### Fehlerszenarien
- [ ] Zwei Teilnehmer mit identischem Anzeigenamen → erlaubt, aber Warnhinweis; Unterscheidung
      über eindeutige ID.
- [ ] Deaktivieren eines Teilnehmers, der in einem **offenen** Abend geführt wird → bleibt in
      diesem Abend, nur für neue Abende gesperrt.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Entscheidung: [ADR-022](../docs/adr/022-teilnehmer-datenmodell.md). Muster durchgehend
analog zum Getränke-Katalog (#49) – **eine Abweichung**: kein Unique auf `name`.

**Datenmodell (`db/schema.ts`):**
- `pgEnum("teilnehmer_typ", ["person", "familie"])` + `type TeilnehmerTyp`.
- Tabelle `teilnehmer`: `id` (UUID-PK via `$defaultFn`), `name` text NOT NULL (**kein**
  Unique), `typ` teilnehmer_typ NOT NULL, `mitglied` boolean NOT NULL DEFAULT false,
  `active` boolean NOT NULL DEFAULT true, `createdAt`/`updatedAt` timestamptz DEFAULT now().
- `Teilnehmer`/`NewTeilnehmer` via `$inferSelect`/`$inferInsert`.

**Data-Layer (`db/teilnehmer.ts`, einziger Query-Ort, rollen-neutral):**
`listTeilnehmer()`, `listActiveTeilnehmer()`, `createTeilnehmer(data)`,
`updateTeilnehmer(id, data)`, `setTeilnehmerActive(id, active)`, `findActiveByName(name)`.
Sortierung: `asc(name)`.

**Zod (`app/verwaltung/teilnehmer/schema.ts`):** `name` `z.string().trim().min(1, …)`,
`typ` `z.enum(teilnehmerTyp.enumValues, …)`, `mitglied` aus Checkbox
(`z.union`/`"on"`→boolean oder `z.coerce.boolean()`; Checkbox liefert `"on"`/fehlt).

**Actions (`app/verwaltung/teilnehmer/actions.ts`, `"use server"`):**
`requireRole("verwalter")` als erste Zeile jeder Action (fail-closed). Duplikat-Warnung
**nicht-blockierend**: vor `createTeilnehmer` `findActiveByName` prüfen → bei Treffer und
ohne `confirmDuplicate` `{ needsConfirm: true, warning }` zurückgeben (nicht speichern);
erst mit `confirmDuplicate=true` anlegen. `revalidatePath("/verwaltung/teilnehmer")`.
Kein `23505`-Pfad nötig (kein Unique).

**UI (`app/verwaltung/teilnehmer/`):** `page.tsx` (Server Component, listet via Data-Layer),
Formular + Row analog `CatalogItemForm`/`CatalogRow`. Inline-Edit-Erfolgsfall über
`useCallback`-Wrapper schließen – **kein** `useEffect` (CLAUDE.md: `react-hooks/set-state-in-effect`).

**Migration:** `pnpm drizzle-kit generate` → neues Enum + Tabelle (kein Enum-Wert-Wechsel,
also nicht von der #48-Drop-and-recreate-Falle betroffen). Lokal gegen Wegwerf-DB `0000→n`
verifizieren.

**Grenzen:** Historien-Snapshot & Walk-in-Anlage gehören zu **F4/#51**, nicht in diese Task
(Data-Layer aber rollen-neutral vorbereiten). RBAC-Ablehnung des Abrechners (AK5) ergibt sich
aus `requireRole("verwalter")` – Test über direkten Action-Aufruf mit Abrechner-Session.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine offenen Produktfragen (Spec bestätigt). Datenmodell/Namensgleichheit → `/architecture`.

## Implementierungs-Notizen (2026-07-14)

ADR-Trigger-Check (Schritt 0): kein neuer Trigger – ADR-022 ist bereits *Accepted* und
deckt alle Modellierungsentscheidungen (eine Tabelle, kein Namens-Unique, Historie in F4).

Implementiert (TDD, Muster analog Getränke-Katalog #49):
- `db/schema.ts`: Enum `teilnehmer_typ` + Tabelle `teilnehmer` (kein Unique auf `name`).
- `db/teilnehmer.ts`: rollen-neutraler Data-Layer (`listTeilnehmer`, `listActiveTeilnehmer`,
  `createTeilnehmer`, `updateTeilnehmer`, `setTeilnehmerActive`, `findActiveByName`), sort `asc(name)`.
- `app/verwaltung/teilnehmer/schema.ts`: Zod (`name` trim+min1, `typ` enum, `mitglied`
  Checkbox→boolean).
- `app/verwaltung/teilnehmer/actions.ts`: `requireRole("verwalter")` fail-closed; nicht-blockierende
  Duplikat-Warnung über `confirmDuplicate`-Zweig (ADR-022, kein `23505`-Pfad).
- UI: `page.tsx`, `TeilnehmerForm.tsx`, `TeilnehmerFields.tsx`, `TeilnehmerRow.tsx`
  (Inline-Edit-Erfolg über `useCallback`-Wrapper, kein `useEffect`).
- Tests: `schema.test.ts`, `actions.test.ts`, `page.test.tsx` (mockfrei/gemockte Grenze),
  `db/teilnehmer.test.ts` (Integration, `skipIf` ohne DB).

**Blocker [2026-07-14]: Quality Gates + Migration nicht ausgeführt – `pnpm`-Befehle
sind in dieser Session permission-gated.** Erforderliche Aktion des Menschen: `pnpm db:generate`
(neues Enum + Tabelle, kein Enum-Wert-Wechsel → nicht #48-betroffen), `pnpm lint`, `pnpm test`
freigeben bzw. ausführen. UI-Oberflächentest (`pnpm db:up` + `pnpm test:e2e` / Browser) danach.
Erst wenn Lint + Tests grün: Akzeptanzkriterien abhaken und commit über `scripts/factory-commit.sh`.

## Refactoring-Notizen (2026-07-14)

Review-Finding behoben:
- `db/teilnehmer.ts`: `updateTeilnehmer` und `setTeilnehmerActive` geben jetzt ehrlich
  `Promise<Teilnehmer | undefined>` zurück (war `Promise<Teilnehmer>` – lügt, wenn die `id`
  nicht existiert, weil Drizzle `.returning()` ein leeres Array liefert). Kein Laufzeit-
  Verhalten geändert; beide Actions ignorieren den Rückgabewert.
- `db/teilnehmer.test.ts`: Test-Assertions auf `updated?.name`/`updated?.mitglied` umgestellt
  (TypeScript-Konsistenz mit neuem Rückgabetyp).

Bewusst nicht angefasst: `firstIssueMessage`-Duplikat mit `katalog/actions.ts` (Cross-Feature-
Refactor, eigenes Issue). Alle anderen Nitpicks (confirmDuplicate, mitglied-Schema,
Rename-Duplikat) sind akzeptiert oder Produkt-Entscheidungen.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Keine neuen CLAUDE.md-Regeln – beide Findings (Drizzle-Return-Type, text.max) waren bereits
als Regeln erfasst und haben korrekt gegriffen. Positiv-Bestätigung: useCallback-Wrapper und
Schicht-Trennung ohne Findings. Offene Folgearbeit: `firstIssueMessage`-Duplikat als
GitHub-Issue anlegen (tech-debt, enhancement) – `gh`-Befehl war permission-gated.
Vollständiger Report: `tasks/codify-50.md`.

PR-Shepherd [2026-07-14]: Alle Gates grün (lint, factory-self-test, issue-sync, Vercel). Test-CI pending → Auto-Merge freigegeben, wartet auf CI. Draft aufgelöst, PR #104 merge-ready.

---
Branch: `feature/50-teilnehmer-stammdaten`
Erstellt: 2026-07-14 19:01
