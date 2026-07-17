# Security Review: Task 52

Scope: `git diff main...HEAD` – Verzehr-Erfassung (F5). Betrachtete Angriffsfläche:
Server Action `adjustVerzehrAction`, Data-Layer `db/verzehr.ts`, Migration
`0009_last_thunderbolts.sql`, authentifizierte Seite `app/veranstaltung/[id]/verzehr/page.tsx`
sowie die route-neutrale UI `app/_verzehr/`.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] **[AuthZ/TOCTOU] Race zwischen Status-Prüfung und Schreibvorgang.**
  `adjustVerzehrAction` liest den Status (`ziel.status !== "offen"`, actions.ts:165) und ruft
  danach `adjustMenge` (actions.ts:175). Schließt ein zweiter Veranstalter die Veranstaltung
  in genau diesem Fenster, kann ein Strich noch auf der gerade geschlossenen Veranstaltung
  landen. Kein DB-seitiger Guard erzwingt „nur offen". **Bewertung:** niedrig – nur die
  vertrauenswürdige Rolle `veranstalter` erreicht die Action, kein Eskalations- oder
  Fremdzugriffs-Risiko, korrigierbar. **Optional:** Status-Bedingung in das UPDATE-`WHERE`
  ziehen (z. B. Join/Subselect auf `veranstaltung.status = 'offen'`), falls FS2 auch
  nebenläufig hart garantiert werden soll. Kein Muss für diesen PR.

- [ ] **[Input] `menge`-Integer-Overflow theoretisch unbeschränkt.** `menge + delta` (delta ±1)
  läuft gegen `int4` (max 2 147 483 647). Ein Overflow erfordert ~2 Mrd. Einzelklicks – nicht
  praktisch erreichbar, daher **kein** Handlungsbedarf. Festgehalten zur Vollständigkeit
  (analog Codify #49 „Obergrenze für int4-Mapped Inputs"); Delta-Modell macht Masseneingabe
  unmöglich.

## Geprüft und unauffällig

- **SQL-Injection:** `adjustMenge` nutzt Drizzle-`sql`-Template (parametrisierte Platzhalter,
  kein String-Concat); `zeileId`/`catalogItemId` via `.values()`/`onConflictDoUpdate`
  ebenfalls parametrisiert. `delta` ist Zod-validiert (`int`, ausschließlich +1/−1).
- **Input-Validierung:** `verzehrAdjustSchema` prüft feldweise (kein Mass-Assignment),
  `z.coerce.number().int()` + `refine`(±1) lehnt alles andere fail-closed ab.
- **AuthZ/RBAC:** `requireRole("veranstalter")` als erster Schritt (ADR-025 D6-Reihenfolge),
  Seite gated zusätzlich über `hasRole`. Serverseitig durchgesetzt, nicht nur UI.
- **IDOR (BOLA):** `veranstaltungId` ist server-gebundenes Argument (`bind(null, id)`), nicht
  client-geliefert; `getZeile(zeileId, veranstaltungId)` bindet den Parent-Key (Codify #51),
  `listPositionen`/`removeZeile` ebenso. Fremde/abgeschlossene Zeilen nicht erreichbar.
- **Soft-Delete:** `getCatalogItem` + `!item.active`-Guard verhindert Erfassung inaktiver
  Artikel (Codify #51). Offener Anzeigefall auf soft-gelöschten Positionen ist als Folge-Issue
  #135 ausgelagert (kein Security-, sondern Korrektheits-/UX-Thema).
- **Route-Schutz:** Route liegt im proxy-geschützten Bereich; kein `proxy.ts`-Matcher-Eingriff
  nötig, keine neue öffentliche Route (kein #63-Fall).
- **Sensible Daten/Secrets:** keine Secrets im Code, keine Credentials, keine neuen
  Dependencies, IDs via `crypto.randomUUID`. Geld durchgängig Integer-Cent (kein Float).
- **Error-Handling:** alle Meldungen sind generische, für Konsumenten formulierte Texte
  (`NOT_FOUND`, `NOT_OFFEN`, `ZEILE_NOT_FOUND`, `ITEM_NOT_FOUND`); keine Stack-Traces oder
  interne Details nach außen.
- **Migration:** reine Tabellen-Neuanlage mit `UNIQUE(zeile_id, catalog_item_id)`,
  `CHECK (menge >= 0)` (FS1 DB-seitig) und `ON DELETE cascade` von der Zeile – konsistent
  mit ADR-025, keine destruktive Änderung an Bestandsdaten.

## Ergebnis

PASSED
