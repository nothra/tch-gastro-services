# Task 50: teilnehmer-stammdaten

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

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

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/50-teilnehmer-stammdaten`
Erstellt: 2026-07-14 19:01
