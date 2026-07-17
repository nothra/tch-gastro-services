# Task 52: verzehr-erfassen

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

F5 (Herzstück): Verzehr je Teilnehmerzeile einer **offenen** Veranstaltung erfassen –
Getränke als Strichliste (+/−), Essen (Auswahl eines `essen`-Katalogartikels × Anzahl),
Kaffee (× Katalog-Kaffeepreis) – mit **Live-Summen** je Zeile und Anzeige der ganzen
Teilnehmerliste. Kanonische Spec: `docs/specs/spec-52-verzehr-erfassen.md`.
Architektur: [ADR-025](../docs/adr/025-verzehr-erfassung-datenmodell.md).

Scope F5 = **authentifizierter Veranstalter-Pfad** + **route-neutrale Erfassungs-UI**
(`app/_verzehr/`, damit F7 sie wiederverwenden kann). Öffentliche Selbstbedienung (F7/#54)
und Kassieren/Abschluss (F8/#55) sind **nicht** Teil dieser Task.

## Akzeptanzkriterien
<!-- Kanonische Quelle: docs/specs/spec-52-verzehr-erfassen.md -->
- [ ] AC1 „+1" Getränk erhöht Menge um 1, Zeilensumme Getränke aktualisiert sofort (Menge × aktueller Katalogpreis).
- [ ] AC2 „−1" senkt Menge um 1, minimal 0 (keine negativen Mengen).
- [ ] AC3 Essen-Artikel mit Preis X, n Portionen → Essenanteil n × X (Katalogpreis, nicht von der Veranstaltung).
- [ ] AC4 Kaffeepreis Y, m Kaffee → Kaffeeanteil m × Y.
- [ ] AC5 Zwei Änderungen an **verschiedenen** Zeilen → beide verlustfrei.
- [ ] AC6 Zwei gleichzeitige Änderungen an **derselben** Zeile/Menge → kein Lost Update (ADR-025 D3).
- [ ] AC7 Summen auf 2 Nachkommastellen kaufmännisch, deutsches Format (Komma) – via Integer-Cent + `formatCents`.
- [ ] FS1 Menge < 0 nicht möglich (Minimum 0; App + DB-CHECK).
- [ ] FS2 Veranstaltung `abgeschlossen` → Erfassung abgelehnt.
- [ ] FS3 Verbindungsabbruch → Nutzer erkennt, ob Änderung ankam (Action gibt autoritative Menge zurück; Fehler sichtbar).

## Technische Notizen
<!-- Von /architecture befüllt: siehe ADR-025 für Begründungen -->

**Datenmodell (ADR-025 D1):** Neue Tabelle `verzehr_position` je (`zeileId`, `catalogItemId`)
mit aggregierter `menge`. `onDelete: cascade` von `veranstaltung_zeile`; FK auf `catalog_item`
ohne Cascade (Soft-Delete). `UNIQUE(zeileId, catalogItemId)` (= Konflikt-Ziel) + `CHECK menge >= 0`.
Eine Tabelle deckt Getränke/Essen/Kaffee ab – Split ist Lese-Gruppierung nach `catalog_category`.

**Migration:** `pnpm db:generate` → `verzehr_position`; lokal gegen Wegwerf-DB `0000→…→n` grün
verifizieren (Codify #48). Reine Tabellen-Neuanlage → kein interaktiver Prompt erwartet.

**Data-Layer** `db/verzehr.ts` (einziger Query-Ort, rollen-neutral):
- `adjustMenge(zeileId, catalogItemId, delta)` – atomarer Upsert (ADR-025 D3):
  `insert(...).values({ menge: sql\`GREATEST(0, ${delta})\` }).onConflictDoUpdate({ target: [zeileId, catalogItemId], set: { menge: sql\`GREATEST(0, ${verzehrPosition.menge} + ${delta})\`, updatedAt: new Date() } }).returning()` → gibt autoritative neue Menge zurück; `Promise<T | undefined>` (Codify #50).
- `listPositionen(veranstaltungId)` – Join Zeile→Position→Katalog, gefiltert über `veranstaltungId`; liefert je Position Menge + `price_cents` + `category` + Artikelname.

**Server Action** `adjustVerzehrAction` – fail-closed in dieser Reihenfolge (ADR-025 D6):
1. `requireRole("veranstalter")`
2. Zod: `catalogItemId` nicht leer; **Delta ∈ {+1, −1}** (andere ablehnen)
3. Veranstaltung laden, `status === "offen"` (sonst FS2-Ablehnung)
4. **IDOR (Codify #51):** Zeile muss zu dieser `veranstaltungId` gehören (`WHERE zeile.id=… AND zeile.veranstaltung_id=…`)
5. `catalogItem` existiert und `active` (Codify #51 Soft-Delete-Prüfung nach Laden by ID)
6. `adjustMenge(…)`, `revalidatePath(detailPath)`
Guard-Branches (2–5) je eigener Test (Codify #51).

**UI (ADR-025 D5):**
- `app/_verzehr/` – route-neutrale, präsentationale Komponenten (Strichliste je Getränk, Essen-Auswahl+Anzahl, Kaffee-Anzahl, Live-Summen je Zeile). Keine Auth/Session/Token intern; Server-Action als **Prop**. Client-Toggle-Pattern via `useCallback`-Wrapper, **kein** `useEffect` (Codify #49).
- `app/veranstaltung/[id]/verzehr/page.tsx` – authentifizierte Server-Seite (`hasRole("veranstalter")` wie Detailseite), lädt Daten, reicht Veranstalter-Action hinein; von der Detailseite verlinken.
- Reine Summen-Logik als DB-freies Modul mit **domänenspezifischem Namen** (Codify #105), z. B. `app/_verzehr/summen.ts` – `{ getraenkeCents, sonstigeCents }` aus Positionen (Menge × Preis, gruppiert nach Kategorie). 100 % unit-testbar.

**Geld:** durchgängig Integer-Cent (ADR-021); Σ `menge × price_cents` exakt ganzzahlig (kein Float, keine Rundung); Anzeige `formatCents` (de-DE). **Kein** `proxy.ts`-Eingriff nötig (Route liegt im geschützten Bereich).

**Kein Preis-Snapshot in F5** (ADR-025 D2): Summen live aus aktuellem Katalog; Einfrieren ist F8.
**Kein Echtzeit-Push** (ADR-025 D4): Server Actions + `revalidatePath`.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

Die beiden von der Spec an /architecture delegierten Fragen sind in ADR-025 entschieden:
- Nebenläufigkeit an derselben Zeile → atomarer DB-Increment mit Delta (ADR-025 D3).
- Echtzeit vs. Neuladen → kein Push; Server Actions + `revalidatePath` (ADR-025 D4).

Keine offenen Fragen mehr für /implement.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/52-verzehr-erfassen`
Erstellt: 2026-07-17 14:51
