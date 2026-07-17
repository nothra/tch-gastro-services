# ADR 025: Verzehr-Erfassung – Datenmodell, Nebenläufigkeit, Aktualität

## Status
Accepted

## Date
2026-07-17

## Context

F5 (#52, [spec-52](../specs/spec-52-verzehr-erfassen.md)) ist das Herzstück der Abrechnung:
Über eine offene Veranstaltung hinweg werden je **Teilnehmerzeile** (`veranstaltung_zeile`, ADR-023 D5)
die entnommenen **Getränke** als Strichliste (+/−), dazu **Essen** und **Kaffee** erfasst –
mit **Live-Summen** je Zeile. Erfassen dürfen der Veranstalter **und** (später, F7/#54) die
Teilnehmer selbst; alle sehen und bearbeiten die ganze Liste (volle Transparenz).

Es ist die erste Persistierung von *Verzehr* – ohne Prod-Daten. Mehrere Entscheidungen sind
**jetzt** zu treffen, weil F7 (öffentliche Selbstbedienung) und F8 (Kassieren/Abschluss) darauf
aufsetzen. Die Spec delegiert zwei Fragen ausdrücklich an /architecture:

1. **Nebenläufigkeit an derselben Zeile/Menge** – kein „lost update" bei gleichzeitiger Erfassung
   (Handy des Teilnehmers + Theken-Gerät).
2. **Aktualität** – erscheinen Änderungen live auf anderen Geräten (Echtzeit) oder reicht Neuladen?

Hinzu kommen das **Datenmodell** der Verzehr-Speicherung, die **Preisquelle** (Live-Katalog vs.
Snapshot) und der **Route-/Komponenten-Schnitt** (Zielbild ADR-024: route-neutrale Erfassungs-UI,
geteilt mit `theke/[token]`).

Bestehende Muster, an denen sich das Modell orientiert (alle beibehalten):
`catalog_item`/`teilnehmer`/`veranstaltung_zeile` (UUID-`text`-PK via `$defaultFn`, deutsche
`pgEnum`-Werte, `*_cents`-Integer nach ADR-021, Data-Layer-Isolation `db/*.ts` als einziger
Query-Ort, Zod an der Server-Grenze, `requireRole`-Guard in der Action nach ADR-016, `revalidatePath`).
Zentraler Geld-Seam `lib/money.ts` (`formatCents`, de-DE). IDOR-Regel (Codify #51): DELETE/UPDATE
auf Zeilen-Tabellen binden den Parent-Key ins `WHERE`.

**Schlüssel-Einsicht:** Seit ADR-023 D4 ist **Essen ein Katalogartikel** (Kategorie `essen`, #116),
Kaffee ohnehin (`kaffee`), Getränke `getraenk`. Damit sind **alle drei Verzehrarten Katalogartikel** –
sie unterscheiden sich nur in der `catalog_category`. Das erlaubt **eine** Verzehr-Tabelle statt drei
paralleler Tabellen; die Aufteilung „Getränke (Theke)" vs. „Sonstige (Essen + Kaffee)" ist eine
**Lese-Gruppierung nach Kategorie**, kein Struktur-Unterschied.

## Decision

### D1 — Eine Tabelle `verzehr_position` je (Zeile, Katalogartikel), aggregierte Menge

```
export const verzehrPosition = pgTable("verzehr_position", {
  id: text.primaryKey().$defaultFn(uuid),
  zeileId: text.notNull().references(() => veranstaltungZeile.id, { onDelete: "cascade" }),
  catalogItemId: text.notNull().references(() => catalogItems.id),  // kein Hard-Delete → kein Dangling
  menge: integer("menge").notNull().default(0),
  createdAt, updatedAt,
}, (p) => [
  unique("verzehr_position_zeile_item_unique").on(p.zeileId, p.catalogItemId),
  check("verzehr_position_menge_nicht_negativ", sql`menge >= 0`),  // fail-closed DB-Guard
]);
```

- **Eine Zeile je (`zeileId`, `catalogItemId`)** mit **aggregierter Menge** (nicht ein Event je
  Strich). Das `UNIQUE` ist zugleich das Konflikt-Ziel für den atomaren Upsert (D3).
- `onDelete: "cascade"` von der Teilnehmerzeile: Entfernt der Veranstalter eine Zeile, verschwinden
  ihre Positionen mit. (Für F5 relevant: das bisher „bedingungslose" Entfernen aus #51 bleibt korrekt.)
- **Kein `onDelete` auf `catalogItemId`** (Default = restrict): Katalogartikel werden nie hart
  gelöscht (spec-49, Soft-Delete via `active`) → die Preis-/Kategorie-Auflösung per Join gelingt
  immer; ein versehentliches Hard-Delete eines genutzten Artikels bliebe fail-closed blockiert.
- **CHECK `menge >= 0`**: DB-seitige, fail-closed Absicherung der Regel „keine negativen Mengen" –
  zusätzlich zur App-Klemmung (D3), unabhängig vom Aufrufweg.
- **Kein Essen-/Kaffee-Sonderfeld**: Essen = Position auf einem `essen`-Artikel, Kaffee = Position
  auf einem `kaffee`-Artikel, Getränk = `getraenk`. Alle drei sind dieselbe Struktur.

Typen `VerzehrPosition`/`NewVerzehrPosition` via `$inferSelect`/`$inferInsert`.

### D2 — Preisquelle: **Live-Katalog** solange `offen`; Einfrieren ist F8

Solange die Veranstaltung `offen` ist, ist die **Quelle der Wahrheit für Preise der aktuelle
Katalog** (`catalog_item.price_cents`). Summen werden **read-time** aus `menge × aktuellem
Katalogpreis` gebildet (Join `verzehr_position` → `catalog_item`). Das erfüllt die Spec-AC
wörtlich („Menge × **aktueller** Katalogpreis"; Essenpreis aus dem Katalog, nicht von der Veranstaltung).

Es wird in F5 **kein** Einzelpreis-Snapshot in `verzehr_position` gespeichert. Das **Einfrieren**
der Preise zum Abrechnungszeitpunkt (damit eine abgeschlossene Veranstaltung stabil bleibt, auch wenn der
Katalog sich später ändert) gehört zur **Abschluss-Transition (F8/#55)** – dort ist der natürliche,
einmalige Moment dafür. Ohne Prod-Daten kann F8 dies per Migration additiv nachrüsten
(nullable `einzelpreis_cents` oder eigene Abrechnungs-Tabelle), **ohne** F5-Schreibpfade zu ändern.

### D3 — Nebenläufigkeit: **atomarer DB-Increment** (Delta ±1), kein Lost Update

Der Client sendet **kein absolutes `menge`**, sondern ein **Delta** (+1 / −1). Die Data-Layer
schreibt atomar per Upsert; die Zeilensperre von Postgres serialisiert konkurrierende Schreiber:

```
INSERT INTO verzehr_position (zeile_id, catalog_item_id, menge)
VALUES (:zeile, :item, GREATEST(0, :delta))
ON CONFLICT (zeile_id, catalog_item_id)
DO UPDATE SET menge = GREATEST(0, verzehr_position.menge + :delta), updated_at = now();
```

- **Kein Lost Update**: Zwei gleichzeitige „+1" auf dieselbe (Zeile, Artikel) ergeben +2, nicht +1 –
  weil `menge + delta` in der DB unter Zeilensperre ausgewertet wird, nicht als Read-Modify-Write in
  der App (das genau wäre die Lost-Update-Falle).
- **Klemmung bei 0** über `GREATEST(0, …)` – auch nebenläufig (zwei „−1" auf `menge=1` → 0, nicht −1);
  deckt die AC „Minimum 0" und das Fehlerszenario „Menge unter 0" DB-seitig ab.
- **Verschiedene Zeilen/Artikel** schreiben in verschiedene Datensätze → beide gehen verlustfrei ein
  (AC „zwei Änderungen an verschiedenen Zeilen").
- Drizzle: `db.insert(...).values({ menge: sql\`GREATEST(0, ${delta})\` }).onConflictDoUpdate({ target: [zeileId, catalogItemId], set: { menge: sql\`GREATEST(0, ${verzehrPosition.menge} + ${delta})\`, updatedAt: new Date() } }).returning()`.
- Die Action gibt die **autoritative neue Menge** aus dem `RETURNING` zurück; die UI stellt genau
  diesen Wert dar (keine optimistische Drift, deckt das Verbindungsabbruch-Szenario: schlägt die
  Action fehl, bleibt der alte Wert stehen und ein Fehler wird sichtbar – kein stiller Verlust).

### D4 — Aktualität: **kein Echtzeit-Push**; Server Actions + `revalidatePath`

Kein WebSocket/SSE/Long-Poll in F5. Der erfassende Client sieht seine Änderung sofort (Server
Action → `revalidatePath` re-rendert die serverseitig frisch geladene Liste); **andere** Geräte
sehen den Stand beim nächsten Laden/Navigieren (bzw. optional `router.refresh()`).

Begründung: Die AC verlangen **verlustfreie Persistenz** konkurrierender Änderungen (D3), **nicht**
sofortige geräteübergreifende Sichtbarkeit („gehen beide verlustfrei ein" = beide gespeichert). Die
Transparenz („alle sehen die ganze Liste") liefert die stets frisch server-gerenderte Gesamtliste.
Echtzeit ist auf dem Stack (Vercel-Functions serverless + Neon HTTP-Treiber, ADR-014/PROJECT-CONTEXT)
teuer und unpassend (keine dauerhaften Verbindungen). YAGNI; reversibel – Echtzeit/Polling ließe
sich später ohne Schema-Änderung ergänzen (Backlog).

### D5 — Route-neutrale Erfassungs-UI in `app/_verzehr/`, authentifizierte Route in `app/veranstaltung/[id]/verzehr`

Gemäß Zielbild ADR-024 (je Lifecycle-Phase eine Unterroute; Erfassungs-UI route-neutral teilbar):

- **`app/_verzehr/`** – präsentationale, **route-neutrale** Erfassungs-Komponenten (Strichliste je
  Getränk, Essen-Auswahl + Anzahl, Kaffee-Anzahl, Live-Summen je Zeile). **Keine** Auth-/Session-/
  Token-Annahme im Inneren; erhält Daten (Zeilen + Positionen + Katalog) und die auszuführende
  **Server Action als Prop**. So kann F7/#54 dieselbe UI mit einer token-scoped Action und ohne
  Essen (an der Theke kein Essen) wiederverwenden – ohne späteren Move.
- **`app/veranstaltung/[id]/verzehr/page.tsx`** – authentifizierte Server-Seite: `hasRole`/Guard
  wie die Detailseite, lädt Daten, reicht die **Veranstalter-Action** hinein. Verlinkt von der
  bestehenden Detailseite (`app/veranstaltung/[id]/page.tsx`).
- **Reine Summen-Logik** (Getränke/Sonstige) als eigenes, DB-freies Modul (domänenspezifischer
  Name, Codify #105 – z. B. `app/_verzehr/summen.ts`, **nicht** `utils`) → 100 % unit-testbar ohne DB.

### D6 — Data-Layer, Action, RBAC, Validierung (fail-closed)

- **Data-Layer** neu `db/verzehr.ts` (einziger Query-Ort, rollen-neutral, analog `db/veranstaltung.ts`):
  `adjustMenge(zeileId, catalogItemId, delta)` (atomarer Upsert, D3), `listPositionen(veranstaltungId)`
  (Join Zeile→Position→Katalog, gefiltert über `veranstaltungId`, liefert Menge + Preis + Kategorie
  je Zeile). UPDATE-artige Rückgaben typisieren `Promise<T | undefined>` (Codify #50).
- **Action** `adjustVerzehrAction` (im Veranstaltungs-Feature) – **fail-closed in dieser Reihenfolge**:
  1. `requireRole("veranstalter")` (F7 bringt später die token-scoped Variante),
  2. Zod-Validierung: `catalogItemId` nicht leer, **Delta ∈ {+1, −1}** (andere Werte ablehnen),
  3. `veranstaltungId` laden, **`status === "offen"`** (sonst „abgeschlossen"-Ablehnung, AC-Fehlerszenario),
  4. **IDOR-Bindung (Codify #51):** die `zeile` muss zu genau dieser `veranstaltungId` gehören
     (`WHERE zeile.id = :zeile AND zeile.veranstaltung_id = :veranstaltung`) – sonst Ablehnung,
  5. `catalogItem` existiert und **`active`** (Codify #51, Soft-Delete-Prüfung nach Laden by ID),
  6. `adjustMenge(...)`, `revalidatePath(detailPath)`.
- **Geld:** durchgängig Integer-Cent (ADR-021); Summe = Σ `menge × price_cents` ist **exakt ganzzahlig**
  (kein Float, keine Rundung nötig); Anzeige über `formatCents` (de-DE, Komma) – erfüllt die AC
  „2 Nachkommastellen, deutsches Format" automatisch.

## Alternatives

### Frage 1 – Nebenläufigkeit an derselben Zeile/Menge

#### Option A: Atomarer DB-Increment mit Delta (gewählt)
**Pros:** Kein Lost Update durch Postgres-Zeilensperre; kein Retry-Loop; ein einziger Upsert deckt
Anlage + Erhöhung + Klemmung; idiomatisch für Drizzle/Postgres. Klein und robust.
**Cons:** Client muss Deltas statt absoluter Mengen senden (bewusst – absolute Mengen wären die
Lost-Update-Falle).

#### Option B: Optimistic Locking (Versions-Spalte) + Retry
**Pros:** Erlaubt absolute Schreibwerte.
**Cons:** Retry-Loop, Konflikt-Behandlung, mehr Code für einen Fall, den A ohne Retry löst. YAGNI.

#### Option C: Event-Ledger (append-only ±1-Zeilen, Summe beim Lesen)
**Pros:** Von Natur aus konfliktfrei (nur Inserts), voll auditierbar.
**Cons:** Erfassung ist laut Spec **anonym** – Audit-Nutzen entfällt; Summierung vieler Zeilen und
korrekte 0-Klemmung (Ledger kann leicht negativ summieren) sind Mehraufwand. Über-Engineering. Verworfen.

### Frage 2 – Aktualität (Echtzeit vs. Neuladen)

#### Option A: Kein Push, Server Actions + `revalidatePath` (gewählt)
**Pros:** Einfachster Weg, der die AC erfüllt; passt zum serverless/HTTP-Stack; transparente
Gesamtliste bei jedem Laden.
**Cons:** Andere Geräte aktualisieren nicht von selbst (Neuladen/optionales Poll).

#### Option B: Echtzeit (SSE/WebSocket) oder Kurz-Polling
**Pros:** Live-Sicht auf allen Geräten.
**Cons:** Auf Vercel-Functions + Neon HTTP-Treiber aufwändig/unpassend (keine dauerhaften
Verbindungen); Kosten/Komplexität ohne AC-Bedarf. Reversibel später nachrüstbar. Für F5 verworfen.

### Frage 3 – Datenmodell der Verzehr-Speicherung

#### Option A: Eine `verzehr_position`-Tabelle über alle Katalog-Kategorien (gewählt)
**Pros:** Nutzt „Essen/Kaffee/Getränk = Katalogartikel" (ADR-023 D4); Getränke/Sonstige-Split ist
Lese-Gruppierung; ein Schreibpfad, eine FK-Struktur, ein atomarer Upsert. Musterkonform.
**Cons:** Der Kategorie-Split lebt in der Lese-/UI-Logik statt im Schema (bewusst, gut testbar).

#### Option B: Drei Tabellen (Getränke/Essen/Kaffee) oder Spalten je Art
**Pros:** Kategorie strukturell getrennt.
**Cons:** Dreifacher Schreib-/Lesepfad und FK-Fläche für einen Unterschied, der nur eine Spalte
(`catalog_category`) ist; widerspricht „Essen ist Katalog". Verworfen (analog ADR-022/023 Frage 1).

### Frage 4 – Preisquelle

#### Option A: Live-Katalog solange offen, Einfrieren in F8 (gewählt)
**Pros:** Erfüllt „aktueller Katalogpreis" wörtlich; kein Snapshot-Zustand in F5; F8 ownt den
einmaligen, natürlichen Einfrier-Moment; additiv nachrüstbar (keine Prod-Daten).
**Cons:** Bis F8 existiert, spiegeln abgeschlossene Veranstaltungen spätere Katalogänderungen (in F5-Scope
irrelevant – „Bearbeitung nach Abschluss" ist explizit F8).

#### Option B: Einzelpreis-Snapshot je Schreibvorgang in `verzehr_position`
**Pros:** Eingefrorener Wert „umsonst".
**Cons:** Anzeige-Mehrdeutigkeit offen (gespeichert vs. live), inkonsistente Teilmengen bei
Preisänderung mitten in der Veranstaltung, und es nimmt F8 die Definition des richtigen Einfrier-Moments vorweg.
Premature. Verworfen (F8 entscheidet die Snapshot-Semantik).

## Rationale

Die Entscheidungen ziehen konsequent die vorhandenen Muster durch: **eine** Tabelle statt drei folgt
„Essen ist Katalog" (ADR-023 D4); der **atomare Increment** ist die kleinste korrekte Lösung gegen
Lost Update und braucht keinen Retry; **kein Echtzeit** ist YAGNI-korrekt auf diesem Stack und erfüllt
die AC vollständig; die **Live-Preisquelle** trifft die Spec wörtlich und überlässt das Einfrieren dem
Feature, das den Abschluss ownt (F8). Der **route-neutrale** Komponenten-Schnitt (`app/_verzehr/`)
folgt ADR-024 und macht F5 ohne Umbau für F7 wiederverwendbar. Alle Preis-Arithmetik bleibt Integer-Cent
(ADR-021), damit „2 Nachkommastellen kaufmännisch" trivial und exakt erfüllt ist.

## Konsequenzen

**Positiv:**
- Ein Schreibpfad und eine FK-Struktur für Getränke/Essen/Kaffee; die Kategorie-Aufteilung ist reine,
  unit-testbare Lese-Logik.
- Nebenläufigkeit ist DB-seitig gelöst (atomarer Upsert + CHECK), robust ohne Retry.
- F7 (öffentliche Theke) kann die Erfassungs-UI und die Summen-Logik direkt wiederverwenden; nur eine
  token-scoped Action und das Ausblenden von Essen kommen hinzu.
- F8 erhält eine klare Übergabe: Preise beim Abschluss einfrieren (additiv, ohne F5-Änderung).

**Zu beachten / Handoff:**
- **F8/#55** muss die Preise beim Abschluss einfrieren (Snapshot) – bis dahin sind abgeschlossene
  Veranstaltungen nicht gegen spätere Katalogänderungen stabil (in F5-Scope akzeptiert).
- **F7/#54** ergänzt die token-scoped Erfassungs-Action und blendet Essen an der stehenden Theke aus
  (nur Getränke + Kaffee, ADR-023 D7); nutzt `app/_verzehr/`.
- Der Client sendet **Deltas (±1)**, nie absolute Mengen – Konvention, die die Action fail-closed
  erzwingt.
- Neue Migration (`db:generate`) für `verzehr_position` (Tabelle, UNIQUE, CHECK, FKs) lokal gegen eine
  Wegwerf-DB verifizieren (`0000→…→n` grün, Codify #48); reine Tabellen-Neuanlage → kein interaktiver
  drizzle-kit-Prompt zu erwarten.
- `app/veranstaltung/[id]/verzehr` ist eine authentifizierte Route unter dem bestehenden, bereits vom
  `proxy.ts`-Schutz erfassten Bereich – **keine** `proxy.ts`-Ausnahme nötig (anders als `theke/[token]`).
- **Soft-gelöschte Artikel während offener Veranstaltung (aufgelöst durch [ADR-026](026-verzehr-soft-geloeschter-artikel.md), #135):**
  Der Live-Join ohne `active`-Filter (D2) konnte einen bereits konsumierten, dann deaktivierten Artikel
  zu einem unsichtbaren, nicht korrigierbaren Betrag machen. ADR-026 entscheidet: Read-Model trägt `active`,
  solche Positionen bleiben sichtbar und (bei bestehender Position) beidseitig korrigierbar; Neu-Erfassung
  auf inaktiven Artikeln bleibt blockiert.
- **Lese-Gruppierung „Getränke/Sonstige" präzisiert durch [ADR-027](027-verzehr-summen-drei-kategorien.md) (#138):**
  Die hier (Schlüssel-Einsicht, D5, Frage 3) als **zwei** Töpfe „Getränke" vs. „Sonstige (Essen + Kaffee)"
  beschriebene Kopf-Summe weist ab ADR-027 **alle drei** Katalog-Kategorien einzeln aus
  (`getraenkeCents`/`essenCents`/`kaffeeCents`, kein `sonstigeCents` mehr). Die Kern-Entscheidung – die
  Aufteilung ist eine reine Lese-Gruppierung nach `catalog_category`, kein Struktur-Split – bleibt gültig.
