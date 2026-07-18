# ADR 028: Auslagenerstattung – Datenmodell, Status, Löschen

## Status
Accepted

## Date
2026-07-18

## Context

F6 (#53, [spec-53](../specs/spec-53-auslagen.md)) erfasst **Auslagen** je Veranstaltung: vorgestreckte
Kosten eines Teilnehmers, die als **eigener Vorgang** aus der der Veranstaltung zugeordneten Kasse
bar **erstattet** werden – bewusst **getrennt** vom individuellen Kassieren (F8), ohne Netto-Verrechnung
mit dem Verzehr. Jede Auslage ist genau **einem Teilnehmer** und **einer Kategorie**
(`getraenke`/`essen`/`sonstiges`) zugeordnet, hat einen Betrag > 0, eine optionale Zweck-Notiz und
einen Status `offen` → `erstattet`. Einträge sind **korrigierbar, löschbar** und die Erstattung ist
**rücknehmbar** (`erstattet` → `offen`), solange die Veranstaltung `offen` ist (Requirements 2026-07-18).

Es ist die erste Persistierung von *Auslagen* – ohne Prod-Daten. ADR-023 hat die Veranstaltung
ausdrücklich als Klammer über „Erfassungen (Verzehr F5, **Auslagen F6**, Kassieren F8)" angelegt; die
Kasse ist ein stabiler Text-Key, damit #57 (Kassenbuch mit laufendem Saldo) später **additiv** an der
Kasse ansetzen kann.

Die Spec delegiert an /architecture:
1. **Datenmodell** – Auslage als eigene Entität je Veranstaltung; Referenz auf Teilnehmer.
2. **Löschen** – Hard- vs. Soft-Delete.
3. **Statusmodell** `offen` ⇄ `erstattet` – Boolean vs. Enum, ohne Übergangs-Historie.

Bestehende Muster, an denen sich das Modell orientiert (alle beibehalten): UUID-`text`-PK via
`$defaultFn`, deutsche `pgEnum`-Werte, `*_cents`-Integer nach ADR-021, Data-Layer-Isolation `db/*.ts`
als einziger Query-Ort, Zod an der Server-Grenze, `requireRole`-Guard in der Action (ADR-016/025 D6),
`revalidatePath`. IDOR-Regel (Codify #51): DELETE/UPDATE auf Kind-Tabellen binden den **Parent-Key**
ins `WHERE`. Text-Spalten brauchen eine Zod-Obergrenze (Codify #50), Integer-Felder eine
`int4`-Obergrenze (Codify #49). Direktes Analog ist die Verzehr-Erfassung ([ADR-025](025-verzehr-erfassung-datenmodell.md)).

**Schlüssel-Unterschiede zu F5/Verzehr (prägen das Modell):**
- Eine Auslage ist **kein Katalogartikel** – Betrag und Zweck sind frei erfasst (kein
  `catalog_item`-Bezug, keine Preisauflösung per Join).
- Auslagen-Kategorien sind **`getraenke`/`essen`/`sonstiges`** – eine **andere** Wertmenge als
  `catalog_category` (`getraenk`/`kaffee`/`essen`). „Sonstiges" existiert nur hier, „Kaffee" nicht.
- Eine Auslage ist eine **Leaf-Entität**: nichts referenziert sie (anders als `catalog_item`, auf das
  `verzehr_position` verweist). Das entscheidet die Lösch-Strategie (D2).
- Auslagen sind **veranstalter-only** – keine öffentliche Theke (F7). Es gibt **keinen** Grund für
  eine route-neutrale UI wie `app/_verzehr/` (ADR-025 D5).

## Decision

### D1 — Eigene Tabelle `auslage` (Parent = Veranstaltung, Zuordnung = Teilnehmer)

```
export const auslageKategorie = pgEnum("auslage_kategorie", ["getraenke", "essen", "sonstiges"]);
export const auslageStatus    = pgEnum("auslage_status", ["offen", "erstattet"]);

export const auslage = pgTable("auslage", {
  id: text.primaryKey().$defaultFn(uuid),
  // Parent für IDOR + Lifecycle/Lock/Summen-Scope: die Auslage gehört zur Veranstaltung.
  veranstaltungId: text.notNull().references(() => veranstaltung.id, { onDelete: "cascade" }),
  // Zuordnung: genau ein Teilnehmer. Kein Hard-Delete von Teilnehmern (Soft-Delete via active)
  // → restrict (Default), Auflösung des Namens gelingt immer.
  teilnehmerId: text.notNull().references(() => teilnehmer.id),
  kategorie: auslageKategorie.notNull(),
  betragCents: integer("betrag_cents").notNull(),
  zweck: text("zweck"),                                   // optionale Notiz, nullable
  status: auslageStatus.notNull().default("offen"),
  createdAt, updatedAt,
}, (a) => [
  check("auslage_betrag_positiv", sql`betrag_cents > 0`), // fail-closed DB-Guard (> 0, nicht >= 0)
]);
```

- **Parent-Key = `veranstaltungId` direkt auf der Zeile.** Damit ist der IDOR-Guard (Codify #51) für
  **alle** Mutationen (auch die per `auslageId` adressierten Korrektur/Löschen/Status) ein triviales,
  robustes `WHERE id = :id AND veranstaltung_id = :v` – ohne Read-then-act oder Subquery. Der in Codify
  #51 dokumentierte Angriff ist „Eintrag einer **fremden Veranstaltung** manipulieren"; genau dieser
  Parent steht damit im `WHERE`.
- **`onDelete: cascade`** von der Veranstaltung: wird eine Veranstaltung gelöscht, verschwinden ihre
  Auslagen mit (konsistent mit `veranstaltung_zeile`/`verzehr_position`).
- **`teilnehmerId` mit restrict** (kein `onDelete`): Teilnehmer werden nie hart gelöscht (Soft-Delete
  via `active`, ADR-022) → die Namensauflösung gelingt immer.
- **Kategorie als eigenes Enum** `auslage_kategorie`, **nicht** `catalog_category` – bewusst getrennte
  Wertmenge (s. Kontext). Deutsche Enum-Werte wie überall.
- **`betrag_cents` Integer** (ADR-021) mit DB-`CHECK > 0` (fail-closed, unabhängig vom Aufrufweg;
  strikt positiv, anders als Verzehr `menge >= 0`).
- **`zweck` nullable `text`**, in Zod getrimmt + Obergrenze (Codify #50, z. B. `.max(200)`).
- **Teilnehmer-Zugehörigkeit** („Teilnehmer muss in der Veranstaltung geführt sein") ist **kein** FK,
  sondern eine **Action-Invariante**: es muss eine `veranstaltung_zeile` für (`veranstaltungId`,
  `teilnehmerId`) existieren (D5). Das ist die etablierte Grenze (Verzehr prüft `active` ebenso in der
  Action, nicht per FK).

Typen `Auslage`/`NewAuslage` via `$inferSelect`/`$inferInsert`.

### D2 — Löschen: **Hard-Delete** (Leaf-Entität, kein Audit im MVP)

Auslagen werden **hart gelöscht** (`DELETE … WHERE id = :id AND veranstaltung_id = :v`). Bewusste
Abweichung vom Soft-Delete aus [ADR-026](026-verzehr-soft-geloeschter-artikel.md)/#135:

- **Nichts referenziert `auslage`** – es ist ein Blatt. Der Grund für Soft-Delete beim `catalog_item`
  (Dangling-FK aus `verzehr_position`, unsichtbare-aber-referenzierte Beträge) existiert hier **nicht**.
- **Kein Korrektur-am-Gelöschten-Bedarf:** Eine versehentlich gelöschte Auslage wird schlicht **neu
  erfasst** (der Vorgang ist billig, kein aggregierter Zustand geht verloren). Die Spec verlangt
  ausdrücklich, dass gelöschte Einträge **nicht** in Summen/Kassenabrechnung eingehen – Hard-Delete
  erfüllt das ohne `active`-Filter an jeder Lesestelle.
- **Kein Audit-Bedarf im MVP** (kein Kassenbuch #57; kein laufender Saldo). Kommt #57, ist eine
  append-only Kassenbewegung die richtige Stelle für Historie – nicht ein `active`-Flag auf `auslage`.

Löschen ist – wie alle Mutationen – nur bei `status`-Veranstaltung `offen` erlaubt (D5).

### D3 — Statusmodell: **pgEnum `auslage_status` `["offen","erstattet"]`**, rücksetzbar, ohne Historie

Der Status ist ein deutsches `pgEnum` mit genau zwei Werten, Default `offen`, **beidseitig**
umschaltbar (`offen` ⇄ `erstattet`). Das spiegelt exakt den etablierten `veranstaltung_status`
(`offen`/`abgeschlossen`, ebenfalls reversibel „wieder öffnen") und die Ubiquitous Language
(„offen zu erstatten" / „erstattet"). **Keine** Übergangs-Historie, **kein** `erstattetAt`-Zeitstempel
im MVP (YAGNI; `updatedAt` genügt). Ein `STATUS`/`KATEGORIE`-Label-Record (Muster `labels.ts`) liefert
die Anzeigetexte (Getränke/Essen/Sonstiges; „offen"/„erstattet").

### D4 — Route & UI: authentifizierte Unterroute, **nicht** route-neutral

Gemäß ADR-024 (je Lifecycle-Phase eine Unterroute) und analog ADR-025 D5:

- **`app/veranstaltung/[id]/auslagen/page.tsx`** – authentifizierte Server-Seite, `requireRole`-Guard
  wie die Detailseite; lädt Auslagen + Teilnehmerliste, reicht die Veranstalter-Actions hinein.
  Verlinkt von `app/veranstaltung/[id]/page.tsx`. Liegt unter dem bereits von `proxy.ts` geschützten
  Bereich → **keine** `proxy.ts`-Ausnahme nötig (Codify #63).
- **Komponenten liegen im Feature** (`app/veranstaltung/[id]/auslagen/` bzw. `app/veranstaltung/`) –
  **kein** `app/_auslagen/`-Modul. Anders als der Verzehr (F7-Wiederverwendung an der öffentlichen
  Theke) sind Auslagen veranstalter-only; die Route-Neutralität aus ADR-025 D5 hat hier keinen Zweck
  (YAGNI). Die Import-Regel für `app/_*`-Module (Codify #52) entfällt mangels solchem Modul.
- **Reine Summen-Logik** (je Kategorie + gesamt, getrennt `offen`/`erstattet`) als eigenes, DB-freies
  Modul mit **domänenspezifischem** Namen (Codify #105 – z. B. `auslagenSummen.ts`, **nicht** `utils`)
  → 100 % unit-testbar ohne DB. Beträge sind Integer-Cent → Summen exakt ganzzahlig (ADR-021), Anzeige
  über `formatCents` (de-DE) aus `lib/money.ts`.
- **Aktualität/Nebenläufigkeit:** kein Echtzeit-Push (analog ADR-025 D4) – Server Actions +
  `revalidatePath`. Es gibt **keinen** Lost-Update-Fall wie beim Verzehr-Zähler: Auslagen-Operationen
  betreffen je einen **eigenen** Datensatz (Anlegen/Ändern/Löschen/Status eines einzelnen Eintrags),
  kein geteilter, inkrementierter Zähler. Kein atomarer Delta-Upsert nötig.

### D5 — Data-Layer, Actions, RBAC, Validierung (fail-closed)

- **Data-Layer neu `db/auslage.ts`** (einziger Query-Ort, rollen-neutral, analog `db/verzehr.ts`):
  - `createAuslage(data)` → `Promise<Auslage>` (INSERT ist nach Erfolg garantiert vorhanden, Codify #50).
  - `listAuslagen(veranstaltungId)` → **LEFT JOIN** `auslage` → `veranstaltung_zeile`
    ON (`veranstaltungId`, `teilnehmerId`) für den `anzeigename`-Snapshot (ADR-022-Vertrag –
    abgeschlossene Veranstaltungen zeigen den Namen wie damals) **plus INNER JOIN auf `teilnehmer`**;
    `anzeigename = COALESCE(veranstaltung_zeile.anzeigename, teilnehmer.name)`. Der LEFT JOIN ist
    bewusst: `auslage` referenziert direkt `teilnehmerId` (D1), **nicht** die Zeile – ihr Lebenszyklus
    ist von der Verzehr-Zeile unabhängig. Ein INNER JOIN würde eine Auslage still aus Übersicht/Summen/
    F8 fallen lassen, sobald die Teilnehmerzeile gelöscht wird – bei bereits `erstattet`en Auslagen ein
    **stiller Kassen-Datenverlust** (#53 Review K1). `teilnehmerId` ist `restrict` → der Fallback-Name
    ist immer vorhanden (D1). Kategorie, Betrag, Status, Zweck wie gehabt; gefiltert über `veranstaltungId`.
  - `updateAuslage(id, veranstaltungId, data)` → `Promise<Auslage | undefined>` (Codify #50),
    `WHERE and(eq(id, id), eq(veranstaltungId, veranstaltungId))` (IDOR).
  - `setAuslageStatus(id, veranstaltungId, status)` → `Promise<Auslage | undefined>`, IDOR-gebunden;
    deckt `offen→erstattet` **und** `erstattet→offen` (ein Weg, beide Richtungen).
  - `removeAuslage(id, veranstaltungId)` → Hard-Delete, IDOR-gebunden.
- **Actions** im Veranstaltungs-Feature (`app/veranstaltung/actions.ts` bzw. eigenes `auslagen`-Modul):
  `createAuslageAction`, `updateAuslageAction`, `setAuslageStatusAction`, `removeAuslageAction`.
  **Fail-closed in dieser Reihenfolge** (spiegelt `adjustVerzehrAction`):
  1. `requireRole("veranstalter")`.
  2. **Zod** an der Grenze: `kategorie ∈ auslage_kategorie`; `betrag` = gültiger EUR-Betrag **> 0**,
     ≤ 2 Nachkommastellen, via `parseEuroToCents` **mit Obergrenze ≤ 2_147_483_647** (Codify #49);
     `teilnehmerId` nicht leer; `zweck` getrimmt + `.max(200)` (Codify #50); bei Status-Action
     `status ∈ {offen, erstattet}`. Jede eigenständig prüfbare Fehlermeldung als eigene Assertion
     testen (Codify #116/#117).
  3. `getVeranstaltung(veranstaltungId)`; existiert + **`status === "offen"`** – sonst Ablehnung
     (deckt „abgeschlossene Veranstaltung sperrt **jede** Mutation": Anlegen/Ändern/Löschen/Erstatten/
     Zurücksetzen).
  4. **IDOR (Codify #51):** die Mutation bindet `veranstaltungId` im `WHERE` (D1). Bei Update/Status/
     Delete kommt bei `veranstaltungId`-Mismatch `undefined` zurück → Ablehnung; Pflicht-Integrationstest.
  5. Bei create/update: Teilnehmer existiert, **`active`** und ist **Mitglied der Veranstaltung**
     (eine `veranstaltung_zeile` für (`veranstaltungId`, `teilnehmerId`) existiert) – sonst Ablehnung
     (Soft-Delete-Prüfung nach Laden by id, Codify #51; Zugehörigkeit = Spec-Fehlerszenario). Guard-
     Clause-Branches je eigener Test (Codify #51).
  6. Operation ausführen, `revalidatePath(auslagenPath(veranstaltungId))`.

### D6 — Übergabe an F8 (Gesamtabrechnung) und #57 (Kassenbuch)

- **F8/#55:** Die Kassenwirkung der Veranstaltung ist `Σ Erhalten − Σ Auslagen-Erstattungen` **je Kasse**
  (PROJECT-CONTEXT). F8 liest `listAuslagen` und summiert die **`erstattet`**-Einträge (tatsächlich aus
  der Kasse geflossene Auszahlungen) je Kategorie; `offen`-Einträge sind noch nicht kassenwirksam. Das
  Summen-Modul (D4) liefert beides getrennt. **Keine** Netto-Verrechnung mit dem Verzehr (Spec).
- **#57 Kassenbuch:** `kategorie` + `betrag_cents` + `status` je Veranstaltung genügen, damit #57 später
  eine kategorisierte Kassenbewegung additiv ableiten kann (kein laufender Saldo im MVP).

## Alternatives

### Frage 1 – Referenz auf den Teilnehmer / Parent-Key

#### Option A: `veranstaltungId` + `teilnehmerId` direkt auf der Zeile (gewählt)
**Pros:** IDOR-Guard (Codify #51) ist für **by-id**-Mutationen (Korrektur/Löschen/Status) ein triviales
`WHERE id AND veranstaltung_id` – ohne Read-then-act/Subquery; klare Domänen-Semantik (Auslage gehört
zur Veranstaltung, zugeordnet einem Teilnehmer); `anzeigename`-Snapshot per Join auf die eindeutige Zeile.
**Cons:** Teilnehmer-Zugehörigkeit ist Action-Invariante statt FK (bewusst – identisch zur Verzehr-Grenze).

#### Option B: Referenz auf `veranstaltung_zeile` (`zeileId`) wie `verzehr_position`
**Pros:** FK-erzwungene Zugehörigkeit; trivialer Namens-Join.
**Cons:** Der IDOR-Parent für den dokumentierten Angriff ist die **Veranstaltung**; bei by-id-Mutationen
sendet der Client keine `zeileId` → man müsste die Auslage erst laden (Read-then-act) oder per Subquery
`zeile_id IN (SELECT … WHERE veranstaltung_id = :v)` binden. Mehr Reibung ohne Mehrwert. Verworfen.

### Frage 2 – Löschen

#### Option A: Hard-Delete (gewählt)
**Pros:** `auslage` ist Leaf (nichts referenziert es) → kein Dangling-Risiko; gelöschte Einträge fallen
ohne `active`-Filter aus allen Summen; neu erfassen ist billig; kein Audit-Bedarf im MVP.
**Cons:** Keine Wiederherstellung eines gelöschten Eintrags (bewusst – neu erfassen statt Papierkorb).

#### Option B: Soft-Delete (`active`) analog ADR-026
**Pros:** Konsistenz mit `catalog_item`/#135; Wiederherstellbarkeit.
**Cons:** Löst ein Problem, das hier nicht existiert (kein Referenz-/Dangling-Risiko), und zwingt jeder
Lesestelle einen `active`-Filter auf. Über-Engineering für ein Blatt ohne Audit-Anforderung. Verworfen.

### Frage 3 – Statusmodell

#### Option A: pgEnum `auslage_status` `["offen","erstattet"]` (gewählt)
**Pros:** Spiegelt `veranstaltung_status` (etabliertes Muster, reversibel); benannte Domänen-Zustände
in Query/Label; erweiterbar, falls je ein dritter Zustand nötig wird.
**Cons:** Minimal mehr Zeremonie als ein Boolean (Enum-Typ + Migration) – für exakt zwei Zustände.

#### Option B: Boolean `erstattet` (Default false)
**Pros:** Kleinstes mögliche Feld für einen binären Zustand.
**Cons:** Verliert die benannten Zustände der Ubiquitous Language, weicht vom Status-als-Enum-Muster
(`veranstaltung_status`) ab, weniger sprechend in Queries/Labels. Verworfen (Konsistenz schlägt Sparsamkeit).

## Rationale

Das Modell zieht die vorhandenen Muster durch, wo sie passen (deutsche pgEnums, Integer-Cent, Data-Layer-
Isolation, Zod-Grenze, `requireRole`, IDOR-Bindung, `revalidatePath`) und weicht **begründet** ab, wo
Auslagen sich strukturell vom Verzehr unterscheiden: eine **eigene** Tabelle statt Katalog-Bezug (Auslage
ist kein Artikel), eine **eigene** Kategorie-Wertmenge (`sonstiges` gibt es nur hier), **Hard-Delete** statt
Soft-Delete (Leaf ohne Referenzen/Audit), **kein** route-neutrales Modul (veranstalter-only, keine
F7-Wiederverwendung), **kein** atomarer Delta-Upsert (keine geteilten Zähler). Der Parent-Key
`veranstaltungId` auf der Zeile macht die verpflichtende IDOR-Bindung (Codify #51) für alle by-id-
Mutationen trivial und fail-closed. Der Status als `pgEnum offen/erstattet` folgt exakt dem reversiblen
`veranstaltung_status` und der Ubiquitous Language.

## Konsequenzen

**Positiv:**
- Ein klares Parent (`Veranstaltung`) macht IDOR-Schutz und Abschluss-Sperre für **jede** Operation
  (create/update/delete/status) einheitlich und fail-closed.
- Hard-Delete + Integer-Cent-Summen ergeben eine unit-testbare, DB-freie Summen-Logik ohne `active`-
  Filter-Streuung.
- F8 erhält eine klare Übergabe: `Σ erstattet` je Kategorie als Kassen-Ausgang; #57 kann additiv
  aufsetzen (Kategorie/Betrag/Status genügen).

**Zu beachten / Handoff:**
- **Neue Migration** (`db:generate`) für `auslage` (Tabelle, zwei neue Enums `auslage_kategorie`/
  `auslage_status`, CHECK `betrag_cents > 0`, FKs) lokal gegen eine Wegwerf-DB verifizieren
  (`0000→…→n` grün, Codify #48). Reine Tabellen-/Enum-Neuanlage → **kein** interaktiver drizzle-kit-Prompt
  erwartet (im Gegensatz zu Enum-Wert-Änderungen).
- **Löschen einer Veranstaltung** kaskadiert auf ihre Auslagen (auch `erstattet`e). Im MVP ohne
  laufenden Kassen-Saldo akzeptiert; mit #57 wandert die Historie in die Kassenbewegung.
- **Löschen einer Teilnehmerzeile** (`removeZeile`) lässt eine bestehende Auslage als „verwaiste"
  Zeile stehen (keine Kaskade – bewusste Entkopplung, D1). `listAuslagen` hält sie via LEFT JOIN
  sichtbar (Anzeigename = aktueller Teilnehmername); sie bleibt über ihre eigenen Actions korrigier-/
  lösch-/status-bar. Alternativ verworfen: `removeZeile` sperren, solange Auslagen existieren – das
  koppelt die Lebenszyklen erneut (widerspricht D1) und zwänge, eine bereits ausgezahlte Erstattung
  zu löschen, nur um eine Zeile zu entfernen (#53 Review K1).
- **F8/#55** summiert die `erstattet`-Auslagen je Kategorie in die Kassenabrechnung (kein Verzehr-Abzug).
- **Änderbarkeit des zugeordneten Teilnehmers** bei Update: der neue Teilnehmer muss `active` und
  Mitglied der Veranstaltung sein (D5 Schritt 5) – analog zur Verzehr-/ADR-026-Grenze.
