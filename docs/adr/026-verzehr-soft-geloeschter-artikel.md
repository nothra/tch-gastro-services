# ADR 026: Verzehr auf soft-gelöschtem Katalogartikel – sichtbar und korrigierbar

## Status
Accepted

## Date
2026-07-17

## Kontext

[spec-135](../specs/spec-135-verzehr-soft-deleted-artikel-korrigierbar.md) behebt ein Finding aus
Task 52 (`tasks/review-52.md`, Wichtiges Finding 1). ADR-025 D2 löst Preise **read-time** über einen
Join `verzehr_position → catalog_item` **ohne** `active`-Filter auf (bewusst: die Preis-/Kategorie-
Auflösung soll immer gelingen, auch für einen soft-gelöschten Artikel; spec-49 kennt nur Soft-Delete).

Dadurch entsteht ein Rand-Widerspruch, wenn ein Artikel **während einer offenen Veranstaltung**
deaktiviert wird, obwohl darauf bereits Verzehr erfasst wurde:

1. `listPositionen` liefert die Position weiter (Join ohne `active`), `zeileSummen` (ADR-025 D5)
   **zählt sie in den Header**.
2. Die Bedien-Zeilen (`MengeControl`) entstehen aber nur aus `listActiveCatalog()` (nur `active`)
   → für den inaktiven Artikel wird **keine Zeile** mehr gerendert.
3. `adjustVerzehrAction` lehnt jede Anpassung ab (Soft-Delete-Guard, ADR-025 D6 Schritt 5:
   `!item.active → ITEM_NOT_FOUND`).

Ergebnis: ein **unsichtbarer, eingefrorener Betrag**, den der Veranstalter weder zuordnen noch
korrigieren kann. ADR-025 hatte diesen Fall nicht adressiert; das Review verwies ihn hierher.

Die Entscheidung ist **weitgehend reversibel** (keine Prod-Daten, kein Schema-Bruch – nur eine
zusätzliche Lese-Spalte im Read-Model, eine gelockerte Guard-Bedingung und ein UI-Abschnitt), aber
sie legt die **Soft-Delete-Semantik für bereits erfassten Verzehr** fest und wird deshalb als ADR
dokumentiert. Sie ergänzt ADR-025 (Handoff „soft-gelöschte Artikel").

## Entscheidung

**Sichtbar machen + korrigierbar machen**, statt zu verstecken. Der bereits erfasste Verzehr hat
stattgefunden und bleibt abrechnungsrelevant (kein Under-Billing). Konkret:

### D1 — Read-Model trägt `active` (Data-Layer)

`listPositionen` selektiert zusätzlich `catalog_item.active`; `VerzehrPositionRow` erhält das Feld
`active: boolean`. So kann die Lese-/UI-Schicht Positionen auf soft-gelöschten Artikeln **explizit**
erkennen, ohne aus „nicht im aktiven Katalog enthalten" rückzuschließen (kein impliziter
Set-Vergleich, self-documenting, am Data-Layer testbar). Der Join bleibt bewusst ohne `active`-Filter
(ADR-025 D2) – die Preisauflösung gelingt weiterhin immer.

### D2 — Guard-Lockerung: inaktiver Artikel anpassbar nur bei **bestehender** Position

Neue Data-Layer-Funktion `getPosition(zeileId, catalogItemId): Promise<VerzehrPosition | undefined>`
(reiner Existenz-/Lese-Zugriff, `T | undefined` nach Codify #50).

`adjustVerzehrAction` behält die fail-closed-Reihenfolge aus ADR-025 D6, ersetzt aber Schritt 5:

```
5. item = getCatalogItem(catalogItemId)
   - item fehlt              → ITEM_NOT_FOUND (unverändert)
   - item.active === true    → erlaubt (unverändert – aktive Artikel: kein Zusatz-Query)
   - item.active === false   → nur erlaubt, wenn getPosition(zeileId, catalogItemId) existiert;
                               sonst ITEM_NOT_FOUND
```

- **Beide Deltas** (`+1` **und** `−1`) sind auf einer bestehenden Position eines inaktiven Artikels
  erlaubt (korrigieren **und** weiterzählen; die 0-Klemmung `GREATEST(0, …)` aus ADR-025 D3 bleibt).
- **Neu-Erfassung bleibt blockiert:** existiert noch keine Position, wird abgelehnt – der Soft-Delete
  behält seinen Zweck (ein deaktivierter Artikel kann nicht neu konsumiert werden).
- Statusprüfung (`offen`) und IDOR-Bindung (`getZeile`, Codify #51) stehen unverändert **davor** –
  eine abgeschlossene Veranstaltung lehnt weiterhin ab, unabhängig vom Artikel-Status (FS2).

### D3 — UI: eigener Abschnitt „Nicht mehr im Katalog"

`VerzehrErfassung` rendert je Zeile zusätzlich die Positionen mit `active === false` **und**
`menge > 0` in einem eigenen, sichtbar abgesetzten Abschnitt, jede mit einer normalen `MengeControl`
(±1). Die `editable`-Prop steuert wie bisher: bei abgeschlossener Veranstaltung nur Lesesicht (FS2/AC7).
Positionen mit `menge === 0` werden **nicht** gerendert (kein Clutter; wird eine inaktive Position auf
0 korrigiert, verschwindet sie beim nächsten Laden – re-erfassen ist dann bewusst nicht mehr möglich).

### D4 — `summen.ts` unverändert

Die reine Summen-Logik zählt weiter **alle** übergebenen Positionen (inkl. inaktiver) → der Betrag
bleibt in der Zeilensumme (AC2, kein Under-Billing). Keine Änderung nötig.

## Alternativen

### Option A: Sichtbar + korrigierbar, bestehende Position editierbar (gewählt)
**Vorteile:** Löst alle drei Teilprobleme (zählt / sichtbar / korrigierbar); kein Under-Billing;
Soft-Delete behält Zweck (keine Neu-Erfassung); minimal-invasiv (eine Lese-Spalte, eine Guard-
Bedingung, ein UI-Abschnitt); keine Schema-/Migrations-Änderung. Entspricht Issue-Option (a),
erweitert um beidseitige Korrektur.
**Nachteile:** Ein zusätzlicher `getPosition`-Query im Guard-Pfad – aber nur für den seltenen
inaktiven-Artikel-Fall (aktive Artikel unverändert).

### Option B: `summen` nur über aktive Positionen bilden (Issue-Option b)
**Vorteile:** Kleinste Änderung; der eingefrorene Betrag verschwindet aus dem Header.
**Nachteile:** Der bereits konsumierte Betrag fällt **lautlos aus der Abrechnung** → Under-Billing
in einer Abrechnungs-App. Der Verzehr wäre weder sichtbar noch nachvollziehbar. Verworfen.

### Option C: Deferrieren – ADR-025-Notiz + Folge-Issue (Issue-Option c)
**Vorteile:** Kein Code jetzt.
**Nachteile:** Der Anzeige-/Korrektur-Bug bleibt bestehen; #135 ist bereits das Folge-Issue. Ein
weiteres Vertagen hätte keinen Nutzen. Verworfen.

### Nebenentscheidung: Inaktiv-Erkennung in der UI
- **Gewählt:** `active` ins Read-Model (D1) – explizit, testbar, entkoppelt.
- **Verworfen:** aus „`catalogItemId` nicht in `listActiveCatalog()`" rückschließen – koppelt die UI
  an die Annahme, dass `artikel` **alle** aktiven Artikel enthält, und versteckt die Absicht in
  Mengenlogik.

## Begründung

Für eine Abrechnungs-App wiegt Korrektheit der Summe (kein Under-Billing) schwerer als die Einfachheit
von Option B. Option A ist zugleich die kleinste Lösung, die die Spec-AC vollständig erfüllt, und
respektiert die bestehenden ADR-025-Entscheidungen (Live-Join ohne `active`-Filter D2, atomarer
Upsert + 0-Klemmung D3, route-neutrale UI mit Action-als-Prop D5, reine Summen-Logik). Der Soft-Delete
behält durch die „nur bestehende Position"-Bedingung seine Schutzwirkung gegen Neu-Erfassung.

## Konsequenzen

**Positiv:**
- Der eingefrorene, unsichtbare Betrag ist behoben: sichtbar, zuordenbar, korrigierbar.
- Keine Schema-/Migrations-Änderung; `active` ist eine additive Lese-Spalte im Read-Model.
- Data-Layer bleibt einziger Query-Ort; Guard-Reihenfolge bleibt fail-closed (ADR-025 D6).

**Zu beachten / Handoff:**
- **F7 (#54, öffentliche Theke):** erbt die gelockerte Guard-Logik über dieselbe Data-Layer; die
  token-scoped Action muss dieselbe „inaktiv nur bei bestehender Position"-Bedingung anwenden.
- **F8 (#55, Abschluss/Einfrieren):** beim Preis-Snapshot müssen auch Positionen auf inaktiven
  Artikeln eingefroren werden (sie zählen zur Abrechnung) – konsistent mit D4.
- **ADR-025** erhält im Konsequenzen-Abschnitt einen Verweis auf diese ADR (Handoff „soft-gelöschte
  Artikel" aufgelöst).

## Implementierungs-Hinweise (für den Coding-Agenten)

- `db/verzehr.ts`
  - `VerzehrPositionRow` um `active: boolean` erweitern; im `listPositionen`-`select`
    `active: catalogItems.active` ergänzen.
  - `getPosition(zeileId, catalogItemId)` neu: `select().from(verzehrPosition).where(and(eq(zeileId), eq(catalogItemId))).limit(1)` → `[row]`, Rückgabe `VerzehrPosition | undefined`.
- `app/veranstaltung/actions.ts` `adjustVerzehrAction`: Schritt 5 gemäß D2 umbauen; `getPosition`
  aus `@/db/verzehr` importieren. Reihenfolge nicht verändern (Role → Zod → Status → IDOR → Item/Position → Persist).
- `app/_verzehr/VerzehrErfassung.tsx`: pro `ZeileKarte` `positionen.filter(p => !p.active && p.menge > 0)`
  in einem eigenen Abschnitt rendern (Name, Preis, `MengeControl` mit `editable`). `summen.ts` **nicht** anfassen.
- Tests (TDD, je AC/FS eine Assertion, Codify #51/#116/#117):
  - `db/verzehr.test.ts` (Integration): `listPositionen` liefert `active`; `getPosition` existiert/undefined.
  - `app/veranstaltung/actions.test.ts` (Unit, `getPosition` mocken): inaktiv **mit** Position → `+1`
    und `−1` erlaubt (`adjustMenge` aufgerufen); inaktiv **ohne** Position → Fehler, nicht persistiert;
    aktiver Artikel unverändert.
  - `app/_verzehr/VerzehrErfassung.test.tsx`: inaktive Position (menge>0) sichtbar + editierbar;
    menge=0 nicht gerendert; `editable=false` → nur lesend. `pos()`-Helper um `active: true` ergänzen.
