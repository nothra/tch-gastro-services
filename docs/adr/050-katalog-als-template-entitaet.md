# ADR 050: Katalog als Template-Entität – Modell, Standard-Katalog-Auflösung, Expand-Migration

## Status

Accepted

## Datum

2026-09-17

## Kontext

Mit #59 ([spec-59](../specs/spec-59-katalog-als-entitaet.md)) beginnt die Grundlage für
**Preis-Templates**: unterschiedliche Preislisten je Anlass (Kaffee 1,00 € bei der Montagsrunde,
2,50 € bei den Dorfmeisterschaften).

Heute ist `catalog_item` eine **flache Menge ohne Container** – Duplikate sind global über
`UNIQUE(name, size)` verboten. Damit ist derselbe Artikel nicht zweimal mit verschiedenen Preisen
abbildbar, und es gibt keinen Ort, an dem eine „Preisliste" als Ganzes benannt, ausgewählt oder
kopiert werden könnte.

Der Feature-Schnitt ist dreiteilig (Issue #59): **#59** legt den Container an
(verhaltensneutral), **#345** macht mehrere Kataloge pflegbar, **#346** wählt den Katalog je
Veranstaltung. Diese ADR entscheidet das **Modell** und die **Übergangsmechanik** – also genau
das, was #345/#346 nicht mehr umwerfen dürfen, weil dann Produktionsdaten daran hängen.

Zu entscheiden ist jetzt:

1. **Welche Entität trägt die Typ-Semantik** („Montagsrunde" vs. „Dorfmeisterschaft")?
2. **Schema-Schnitt:** Wohin wandert die Duplikat-Regel, wie ist der Pflichtbezug abgesichert?
3. **Wie wird der Standard-Katalog aufgelöst**, solange es keine Auswahl gibt – und zwar so, dass
   ein **Umbenennen** ihn nicht bricht (Nutzer-Anforderung zu dieser Task, spec-59 AK5)?
4. **Wie greifen die Aufrufer zu** – expliziter Parameter oder Default?
5. **Was bleibt katalog-frei**, damit Historie und Preis-Freeze (ADR-033 D2) unangetastet bleiben?
6. **Wie läuft die Migration**, ohne den laufenden Montagsrunden-Betrieb zu berühren?

Bestehende Muster, an denen sich das Modell orientiert: UUID-`text`-PK via `$defaultFn`,
Soft-Delete über `active` statt Hard-Delete, `*_cents`-Integer (ADR-021), Data-Layer-Isolation in
`db/*.ts`, Zod an der Server-Grenze, `requireRole` in der Action (ADR-016) – sowie der
**stabile Text-Key statt Enum** für wohlbekannte, geseedete Werte (ADR-023 D2, `kasse`).

## Entscheidung

### D1 — Der Katalog **ist** das Template (keine Veranstaltungstyp-Entität, `kasse` ist nicht die Preis-Achse)

Die Typ-Semantik trägt der **Katalogname**. Ein fachlicher „Veranstaltungstyp" entsteht nicht;
`veranstaltung.typ` bleibt technisch (`veranstaltung` | `theke`, ADR-023 D1) und bekommt **keine**
Preis-Bedeutung.

`kasse` wird **nicht** als Preis-Achse wiederverwendet, obwohl die Spalte existiert und es
naheliegt. Kasse = Geldtopf, Katalog = Preisliste: „Dorfmeisterschaften" buchen auf
`vereinskasse`, hätten dort aber eigene Preise. Eine Kopplung wäre genau der Anker-Fehler aus dem
`/codify`-Learning zu #315 – eine Ablagekonvention als Domänengrenze missverstanden.

### D2 — Tabelle `catalog`, Pflicht-FK `catalog_item.catalog_id`, Unique wandert auf `(catalog_id, name, size)`

```
export const catalog = pgTable("catalog", {
  id: text("id").primaryKey().$defaultFn(uuid),   // Standard-Katalog: stabiler Key, s. D3
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),   // ohne Wirkung in #59, s. D7
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt, updatedAt,
});

// catalog_item zusätzlich:
catalogId: text("catalog_id").notNull().references(() => catalog.id),
// Unique-Tausch:
// − unique("catalog_item_name_size_unique").on(name, size)
// + unique("catalog_item_catalog_name_size_unique").on(catalogId, name, size)
```

- **`name` ist unique** – bewusst anders als `teilnehmer.name` (ADR-022, Frage 2: Namensgleichheit
  ist bei Personen fachliche Realität). Ein Katalogname ist ein **gewähltes Etikett**, das in #346
  die Auswahl des Veranstalters trägt; zwei gleichnamige Kataloge machen diese Auswahl unlesbar.
  Fail-closed in der DB, nicht nur applikativ.
- **Kein `onDelete`** am FK (Postgres-Default „no action", faktisch restriktiv) – konsistent zu
  `verzehr_position → catalog_item`. Kataloge werden nie hart gelöscht; es kann also keinen
  Artikel ohne Katalog geben (spec-59 FS5).
- **Kein zusätzlicher Index auf `catalog_id`.** Die neue Unique-Constraint legt einen
  Btree-Index mit `catalog_id` als **führender** Spalte an – der bedient die
  katalog-gefilterten Lesezugriffe vollständig. Ein separater FK-Index wäre redundant.
- **`catalog_id` steht vorn** in der Unique-Spaltenliste, genau deswegen.

### D3 — Standard-Katalog-Auflösung über einen **stabilen Text-Key** als feste ID-Konstante

Die Migration seedet den Standard-Katalog mit der **festen, nicht generierten** ID
`"standard"`; der Code kennt sie als benannte Konstante `STANDARD_CATALOG_ID` in `db/catalog.ts`.

```
// db/catalog.ts
export const STANDARD_CATALOG_ID = "standard";
```

Damit ist **AK5 konstruktiv erfüllt**: die Auflösung liest den Namen nie, ein Umbenennen von
„Montagsrunde" auf irgendwas ist folgenlos. Es kostet **keine** zusätzliche Spalte und **keinen**
Lookup-Round-Trip vor jedem Katalogzugriff.

Zwei Feinentscheidungen dazu:

- **Lesbarer Key statt Magic-UUID.** Die PK-Spalte ist `text`, nicht `uuid` – ein sprechender Key
  ist erlaubt und folgt dem Hausmuster für wohlbekannte, geseedete Werte (ADR-023 D2, `kasse`).
  In #346 steht dann `veranstaltung.catalog_id = 'standard'` statt einer undurchsichtigen UUID.
  Dass in #345 angelegte Kataloge UUIDs bekommen, ist gewollt: geseedete Systemzeile vs.
  nutzererzeugte Zeile sind auf einen Blick unterscheidbar.
- **Der Key kodiert den Namen nicht.** `"standard"` statt `"montagsrunde"` – sonst wäre die
  Rename-Sicherheit aus AK5 nur formal und der Key nach dem ersten Umbenennen irreführend.

**Diese Konstante ist ausdrücklich Übergangsmechanik.** In #346 kommt der Katalog aus der
Veranstaltung; die Konstante verschwindet aus den Aufrufpfaden und bleibt höchstens als
Migrations-/Seed-Bezug stehen. Genau das war das Hauptargument gegen die Flag-Spalte (s.
Alternativen): eine Spalte wieder loszuwerden kostet eine zweite Migration, eine Konstante nicht.

### D4 — Katalogbezug als **expliziter, nicht optionaler** Parameter – und **nie** aus Client-Input

```
listCatalog(catalogId)                  // Verwalter-Pflegeansicht
listActiveCatalog(catalogId)            // Auswahl in Verzehr/Theke
getCatalogItem(id, catalogId)           // Parent-Key im WHERE (Kern-Kurzregel 2)
createItem(catalogId, data)             // data ohne catalogId, s. u.
updateItem(id, catalogId, data)         // Parent-Key im WHERE
setItemActive(id, catalogId, active)    // Parent-Key im WHERE
export type CatalogItemData =
  Omit<NewCatalogItem, "id" | "catalogId" | "createdAt" | "updatedAt" | "active">;
```

- **Kein Default-Parameter.** Ein `catalogId = STANDARD_CATALOG_ID` wäre bequemer, würde aber in
  #346 zur Falle: Aufrufstellen, die auf den Veranstaltungs-Katalog umstellen müssen, blieben
  **lautlos** compilierbar und lieferten weiter die Standard-Preise. Ein Pflichtparameter macht
  den Compiler zur Checkliste für #346. Das ist der eigentliche Grund für diese Form – nicht
  Stilfrage.
- **`catalogId` ist aus `CatalogItemData` heraus-`Omit`tet** und wird von der Server Action
  gesetzt, nie aus `FormData` geparst. Zwei Wirkungen: das Zod-Schema in
  `app/verwaltung/katalog/schema.ts` bleibt **unverändert** (kein neues Formularfeld → spec-59
  AK7 verhaltensneutral), und ein Client kann keinen fremden Katalog als Schreibziel angeben.
  Zusammen mit dem Parent-Key im `WHERE` ist Cross-Catalog-Schreiben damit doppelt versperrt –
  eine Härtung, die #346 vorwegnimmt, statt sie dort nachzuholen.

### D5 — Lese-Joins und Preis-Freeze bleiben **katalog-frei**

`catalog_item.id` ist global eindeutig und bleibt der einzige Auflösungsschlüssel für
**bestehende** Verzehr-Positionen:

- der Anzeige-Join in `db/verzehr.ts` (`innerJoin catalog_item ON verzehr_position.catalog_item_id`)
- die Freeze-Subquery in `db/veranstaltung.ts` (`select price_cents from catalog_item where id = …`,
  ADR-033 D2)

Beide bekommen **keine** `catalog_id`-Bedingung. Begründung: eine Position referenziert einen
Artikel, der bereits gewählt und validiert wurde; eine nachgelagerte Katalog-Bedingung könnte in
#346 – sobald Veranstaltungen verschiedene Kataloge nutzen – Zeilen aus dem Join fallen lassen
oder den Freeze auf `NULL` laufen lassen und damit **Historie verfälschen**. Die
Katalog-Bedingung gehört an die **Auswahl**- und **Schreib**-Grenze (D4), nicht an die
Auflösung. Der Soft-Delete-Vertrag aus spec-49 (deaktivierte Artikel bleiben auflösbar) gilt
unverändert weiter.

### D6 — Eine hand-editierte **Expand**-Migration: nullable → seed → backfill → NOT NULL

Reihenfolge in **einer** Migrationsdatei, mit `--> statement-breakpoint` getrennt:

1. `CREATE TABLE "catalog"` (+ Unique auf `name`)
2. `INSERT INTO "catalog" (id, name, sort_order) VALUES ('standard', 'Montagsrunde', 0)`
   `ON CONFLICT (id) DO NOTHING`
3. `ALTER TABLE "catalog_item" ADD COLUMN "catalog_id" text` — **zunächst nullable**
4. `UPDATE "catalog_item" SET "catalog_id" = 'standard' WHERE "catalog_id" IS NULL`
5. `ALTER TABLE "catalog_item" ALTER COLUMN "catalog_id" SET NOT NULL`
6. FK hinzufügen, `catalog_item_name_size_unique` **droppen**, `catalog_item_catalog_name_size_unique`
   **anlegen**

Schritt 3–5 sind der Kern: `drizzle-kit generate` emittiert die Spalte direkt als `NOT NULL`,
was auf jeder DB mit bestehenden Artikeln **fehlschlägt**. Die generierte Datei ist deshalb
**von Hand nachzuziehen** – Präzedenzfall im Repo ist die manuelle Daten-Migration
`0004_seed_catalog_reference.sql`.

**Kein Contract-Schritt in diesem PR** (kein Spaltenabbau, kein Rename): die Migration ist allein
deploybar und rührt keine laufende Abrechnung an.

**Präzisierung – „expand" heißt hier nicht „ausschließlich erweiternd".** Schritt 5
(`SET NOT NULL`) ist ein **constraining** Schritt, und die Deploy-Reihenfolge wendet die Migration
**vor** dem Promote des neuen Builds an (`.github/workflows/deploy-gate.yml`: `db:migrate:prd`,
dann `main → production`). Dazwischen läuft für die Dauer von Promote + Build der **alte** Code
gegen das **neue** Schema. Lesen bleibt unberührt; betroffen ist genau ein Bedienweg: legt ein
Verwalter in diesem Fenster einen Artikel an, setzt der alte `createItem(data)` kein `catalog_id`
und die DB antwortet mit 23502 – ein Code, den `runWithUniqueCheck` bewusst nicht übersetzt (nur
23505), der also als unbehandelter Server-Action-Fehler durchschlägt.

Das Fenster wird **bewusst in Kauf genommen** statt das `SET NOT NULL` in eine Folge-Migration
nach dem Deploy zu ziehen: der Nutzerkreis ist einstellig, Deploys laufen außerhalb der
Montagsrunde, und ein zweistufiger Rollout kostet eine zweite Migration plus eine Schemaphase, in
der `catalog_id` nullable und damit die Pflicht-Zusicherung aus AK3 nicht durchgesetzt wäre.
Für #345/#346 gilt diese Abwägung nicht automatisch weiter – ein constraining Schritt auf einer
dann stärker genutzten Tabelle gehört hinter den Code-Rollout.

### D7 — `catalog.active` entsteht ohne Wirkung; die Semantik gehört zu #345

Die Spalte entsteht laut Vorgabe aus #59, **filtert aber nichts** – `listActiveCatalog` prüft
weiterhin nur `catalog_item.active`. Grund: in #59 existiert genau ein, immer aktiver Katalog;
ein `catalog.active = false`-Zweig wäre durch keinen Bedienweg und keinen Test erreichbar – also
totes Verhalten, das eine Fehlerbehandlung vortäuscht (Clean-Code-Guideline, „Keine Fallbacks für
bereits ausgeschlossene Fälle"). Die Spalte jetzt mitzulegen ist trotzdem richtig: die Tabelle hat
noch keine Produktionsdaten, die Endform ist hier am billigsten.

**Verpflichtung an #345:** dort wird `active` verdrahtet **und** getestet (deaktivierter Katalog
wird nicht mehr als Preisquelle angeboten).

## Alternativen

### Zum Modell (D1)

#### Option A: Katalog als Entität, Katalogname trägt die Typ-Semantik — **gewählt**

**Vorteile:** eine neue Entität, keine Zuordnungstabelle, keine zweite Pflege-UI. Kataloge können
sich in **Artikelmenge und Preis** unterscheiden – genau die Anforderung aus #59. „Duplizieren"
(#345) wird ein Kopiervorgang auf einer Tabelle.
**Nachteile:** der Name ist Etikett **und** fachliche Kategorie in einem; wer später eine echte
Typ-Taxonomie mit Attributen braucht, muss sie nachziehen.

#### Option B: Preis-Override-Tabelle `(catalog_item_id, typ) → price_cents`

**Vorteile:** Artikel bleiben global eindeutig, keine Duplikate über Preislisten hinweg, minimaler
Schema-Eingriff (keine Änderung an `catalog_item`).
**Nachteile:** deckt nur **abweichende Preise**, nicht **abweichende Artikelmengen** ab – #59
verlangt ausdrücklich beides („Kataloge können unterschiedliche Artikel enthalten"). Die
Preisauflösung würde überall zu einem `COALESCE` über eine zweite Tabelle, zusätzlich zum
bestehenden Freeze-`COALESCE` (ADR-033 D2) – zwei gestapelte Fallback-Ebenen auf dem
heißesten Lesepfad. Verworfen.

#### Option C: Eigene `veranstaltungstyp`-Entität + M:N-Zuordnung Typ ↔ Katalog

**Vorteile:** trennt „Anlass" und „Preisliste" sauber; ein Typ könnte mehrere Kataloge bündeln.
**Nachteile:** zwei zusätzliche Tabellen und eine zusätzliche Pflege-UI bei **identischem**
heutigem Nutzen – der Typ hätte außer dem Namen kein Attribut. Klassisches Gold-Plating für eine
Anforderung, die es (noch) nicht gibt. Verworfen (YAGNI).

#### Option D: `kasse` als Preis-Achse wiederverwenden

**Vorteile:** null Schema-Änderung, Feld existiert bereits an der Veranstaltung.
**Nachteile:** fachlich falsch. Dorfmeisterschaften buchen auf `vereinskasse` und bräuchten
dennoch eigene Preise; umgekehrt soll eine Kassen-Zuordnung Preise nicht verändern. Verworfen
(siehe D1).

### Zur Standard-Katalog-Auflösung (D3)

#### Option A: Feste ID-Konstante, von der Migration geseedet — **gewählt**

**Vorteile:** rename-sicher; keine zusätzliche Spalte; kein Lookup vor dem Zugriff; in allen
Umgebungen (DEV/INT/PRD) identisch; **restlos entfernbar**, wenn #346 den Katalog aus der
Veranstaltung nimmt.
**Nachteile:** ein wohlbekannter Wert liegt im Code **und** in der Migration – beide müssen
übereinstimmen (abgesichert durch einen Test, s. Implementierungs-Hinweise).

#### Option B: Default-Flag-Spalte `is_default` + Partial-Unique-Index

**Vorteile:** rename-sicher und DB-seitig selbsterklärend; kein Wert im Code.
**Nachteile:** eine Spalte, die #59 nicht vorsieht, und die in #346 **bedeutungslos** wird –
dann steht sie als toter Zustand im Schema oder kostet eine Rückbau-Migration. Jeder Lesezugriff
bräuchte zusätzlich einen Lookup oder Join, nur um die eine Zeile zu finden. Verworfen.

#### Option C: Lookup über den Namen „Montagsrunde"

**Vorteile:** kein technischer Schlüssel nötig, maximal lesbar.
**Nachteile:** verletzt die Nutzer-Anforderung „Name muss änderbar sein" (spec-59 AK5) direkt –
das erste Umbenennen bricht Verzehrerfassung und Theke. Verworfen.

#### Option D: Implizit „erste Zeile" (niedrigster `sort_order`, ältestes `created_at`)

**Vorteile:** kein Schlüssel und keine Spalte.
**Nachteile:** bricht, sobald #345 die Sortierung pflegbar macht – ein Verwalter könnte durch
Umsortieren unbemerkt die Preisquelle der laufenden Erfassung wechseln. Verworfen (fail-open).

## Begründung

Ausschlaggebend war die **Reversibilitäts-Frage** aus der Guideline „Evolutionäre Architektur":
Welche dieser Entscheidungen ist teuer zurückzunehmen?

- **Das Schema ist die teure Entscheidung** (D2) – nach dem Deploy hängen Produktionsdaten daran.
  Deshalb dort die Endform: Pflicht-FK, restriktive Referenz, Unique mit führendem `catalog_id`.
  Option B/C hätten diese Endform verbaut (B deckt die Artikelmengen-Anforderung nicht, C
  erzeugt Tabellen, die #345/#346 wieder abtragen müssten).
- **Die Auflösung ist die billige Entscheidung** (D3) – sie lebt nur bis #346. Also fällt sie auf
  die Variante mit den **geringsten Rückbaukosten**: eine Konstante, nicht eine Spalte.
- **Die Aufrufform ist das Gegenteil von Stil** (D4): der Pflichtparameter kauft für #346 eine
  compilergestützte Vollständigkeitsprüfung aller Aufrufstellen. Ein Default-Wert wäre heute
  bequemer und würde genau diese Prüfung ausschalten.
- **D5 schützt das Wertvollste** – abgeschlossene Abrechnungen. Die Versuchung, `catalog_id`
  „konsistent überall" mitzuführen, ist der plausibelste Weg, in #346 Historie zu beschädigen;
  sie wird hier vorab ausgeschlossen und begründet.

Testbarkeit war dabei kein nachträglicher Gedanke: D2/D3 sind gegen eine echte migrierte DB
prüfbar (`db/catalog.test.ts`-Muster, Integrationstests mit `DATABASE_URL`), D4 ist am
gemockten Data-Layer als Wiring-Assertion prüfbar, D5 und D7 sind als **Abwesenheits**-Aussagen
formuliert und damit ebenfalls testbar (kein `catalog_id` im Join / kein Filter auf
`catalog.active`).

## Konsequenzen

**Positiv:**

- Preis-Templates sind modelliert, ohne dass #345/#346 das Schema noch anfassen müssen.
- Die Migration ist allein deploybar und verhaltensneutral – der laufende Montagsrunden-Betrieb
  ist nicht betroffen (zum kurzen Schreib-Fenster zwischen Migration und Promote s. D6).
- Cross-Catalog-Schreiben ist **vor** dem Multi-Katalog-Feature versperrt (D4): Parent-Key im
  `WHERE` plus „`catalogId` nie aus Client-Input".
- Der Preis-Freeze (ADR-033 D2) und der Soft-Delete-Vertrag (spec-49) bleiben unangetastet.
- #346 bekommt durch den Pflichtparameter eine vollständige, compilergeprüfte Liste der
  umzustellenden Aufrufstellen.

**Negativ / Trade-offs:**

- **Der wohlbekannte Schlüssel `'standard'` lebt doppelt** – als Konstante im Code und als
  Literal in der Migration. Ein Test muss beide gegeneinander halten (s.
  Implementierungs-Hinweise), sonst driftet er lautlos.
- **Jede Data-Layer-Signatur ändert sich**, auch die reinen Verwalter-Pfade. Die Aufrufstellen
  sind überschaubar (sechs Produktionsstellen, s. Task-Notizen), die Tests umfangreicher.
- **`catalog.active` ist bis #345 eine Spalte ohne Wirkung** (D7) – bewusst in Kauf genommen und
  dort als Verpflichtung notiert.
- **Der Katalogname ist Etikett und Kategorie in einem** (D1). Käme je eine echte Typ-Taxonomie
  mit Attributen (Ort, Saison, Standard-Teilnehmerkreis), wäre das eine neue ADR.
- **Die Migration ist hand-editiert**, nicht rein generiert (D6). Das ist fehleranfälliger als
  `db:generate`-Output und braucht beim Review besondere Aufmerksamkeit auf die
  Statement-Reihenfolge.

## Bezug zu bestehenden ADRs

- **ADR-021** (Cent-Integer) – unverändert; `price_cents` bleibt, wo es ist.
- **ADR-022** (Teilnehmer-Modell) – `catalog.name` weicht bewusst ab und ist unique (D2).
- **ADR-023 D2** (stabiler Text-Key für wohlbekannte Werte) – Muster für `'standard'` (D3).
- **ADR-023 D4/D7** (Essen ist Katalogartikel, kein Veranstaltungs-Property) – unverändert
  gültig; `essen` bleibt eine `catalog_category` **innerhalb** eines Katalogs.
- **ADR-025** (Verzehr-Modell) – `verzehr_position` bleibt unverändert (D5).
- **ADR-026** (soft-gelöschter Artikel) – Semantik unverändert; die dort im Ablauf genannten
  Signaturen `listActiveCatalog()` und `getCatalogItem(catalogItemId)` tragen seit D4 den
  Katalogbezug. Der Guard-Ablauf aus ADR-026 D2 ist davon nicht betroffen: ein Artikel aus einem
  fremden Katalog läuft in dieselbe `ITEM_NOT_FOUND`-Meldung wie ein unbekannter (spec-59 FS2).
- **ADR-027** (Größe anzeigen/gruppieren) – die dort zitierte Duplikat-Regel `UNIQUE(name, size)`
  gilt seit D2 als `UNIQUE(catalog_id, name, size)`; die Sortierung `sortOrder, name, size` und
  die Gruppierungs-Entscheidung bleiben unverändert.
- **ADR-033 D2** (Preis-Freeze) – ausdrücklich katalog-frei (D5).
- **Kein Superseding.** Diese ADR erweitert das Katalog-Modell, ersetzt keine Entscheidung.

## Nachtrag (2026-09-20, #345): Auflösung der D7-Verpflichtung – `active` gate't nur die Verwaltung

**Kontext.** D7 verpflichtet #345 wörtlich: „dort wird `active` verdrahtet **und** getestet
(deaktivierter Katalog wird nicht mehr als Preisquelle angeboten)". Bei der Umsetzung von #345
([spec-345](../specs/spec-345-mehrere-kataloge-verwalten.md)) stellte sich heraus, dass eine
wörtliche Lesung – `catalog.active` filtert auch `listActiveCatalog`/Theke/Verzehr – zwei Probleme
hätte: Erstens gibt es vor #346 keinen Bedienweg, der einen anderen Katalog als den
Standard-Katalog an Theke oder Verzehrerfassung liefert; ein Aktiv-Filter auf diesem Pfad wäre ein
Zweig, den kein Test und kein Bedienweg erreicht – totes Verhalten, das eine Fehlerbehandlung
vortäuscht (Clean-Code-Guideline, „Keine Fallbacks für bereits ausgeschlossene Fälle"). Zweitens
bricht ein Verwalter, der versehentlich den Standard-Katalog deaktiviert, damit den laufenden
Montagsrunden-Betrieb – ein Fußangel, den D6 für die Migration selbst ausdrücklich vermeiden
wollte („der laufende Betrieb ändert sich nicht").

**Entscheidung.** `catalog.active` gate't in #345 ausschließlich die **Verwaltungsoberfläche**:
ein deaktivierter Katalog verschwindet aus der Quellenauswahl für „Katalog duplizieren"
(serverseitig durchgesetzt, nicht nur UI-Ausblendung), bleibt aber im Katalog-Umschalter sichtbar
und seine Artikel bleiben normal les- und bearbeitbar. `listActiveCatalog`, Theke und
Verzehrerfassung bleiben **unverändert** und prüfen `catalog.active` weiterhin nicht – exakt wie
vor #345. Das ist kein neuer Design-Fork gegenüber D7, sondern eine engere, jetzt bedienweg- und
testbare Lesung von „Preisquelle": in dieser Slice ist „neue Verwendung" ausschließlich
„als Vorlage für einen neuen Katalog dienen", nicht „von einer Veranstaltung gelesen werden" – das
Zweite entsteht erst mit #346 und bekommt dort, falls nötig, seine eigene Aktiv-Prüfung.

**Konsequenz.** Kein Superseding, keine Schema-Änderung. Diese engere Lesung ist die einzige
Interpretation von D7, die sich in #345 (ohne #346) tatsächlich durch einen Test belegen lässt;
#346 kann `catalog.active` bei Bedarf zusätzlich an die Veranstaltungs-Katalog-Auswahl koppeln,
ohne dass diese ADR dafür erneut geändert werden müsste.

## Nachtrag (2026-09-24, #346): D3 realisiert – `veranstaltung.catalogId` ersetzt `STANDARD_CATALOG_ID` in den Aufrufpfaden

**Kontext.** D3 hat diese Umstellung selbst angekündigt: „In #346 kommt der Katalog aus der
Veranstaltung; die Konstante verschwindet aus den Aufrufpfaden und bleibt höchstens als
Migrations-/Seed-Bezug stehen." #346 ([spec-346](../specs/spec-346-katalog-je-veranstaltung.md))
setzt genau das um; kein neuer ADR-Trigger (keine neue Technologie, kein neues
Architekturmuster, kein Schnittstellen-Vertrag zwischen Teams/Services – die Persistenz-
Strategie für einen Pflicht-FK mit stabilem Default ist mit D2/D3/D6 bereits entschieden und wird
hier nur auf eine zweite Tabelle angewandt, nicht neu erfunden).

**Entscheidung.**

- `veranstaltung` bekommt eine Pflichtspalte `catalog_id` (`text`, FK auf `catalog.id`, **mit
  echtem SQL-`DEFAULT 'standard'`**, kein `onDelete` – analog zur restriktiven Referenz aus D2).
  Anders als bei `catalog_item.catalog_id` (D6) braucht diese Migration **keine**
  nullable→backfill→NOT-NULL-Expand-Sequenz: weil die Spalte einen echten DB-`DEFAULT`-Wert
  trägt (nicht nur eine App-seitige `$defaultFn`), erfüllt ein einziges
  `ALTER TABLE veranstaltung ADD COLUMN catalog_id text NOT NULL DEFAULT 'standard'
  REFERENCES catalog(id)` sowohl bestehende als auch künftige Zeilen in einem Schritt – Postgres
  muss dafür die Tabelle nicht zeilenweise umschreiben (konstanter Default). Der Fall aus D6 (das
  von `drizzle-kit generate` emittierte `NOT NULL` ohne `DEFAULT` schlägt auf einer nicht-leeren
  Tabelle fehl) tritt hier nicht auf, solange das Drizzle-Schema den Default explizit deklariert.
- Betroffene Lesepfade lösen ab sofort über `veranstaltung.catalogId` auf statt über die
  Konstante: `listActiveCatalog` in `app/veranstaltung/[id]/verzehr/page.tsx` und `getCatalogItem`
  in `applyVerzehrAdjust` (`app/veranstaltung/actions.ts`). `STANDARD_CATALOG_ID` bleibt als
  Seed-/Migrations-Referenz und als Spalten-Default bestehen (letzter Absatz von D3 trifft
  weiterhin zu).
- Die Dauer-Theke bleibt **bewusst ausgenommen**: sie bezieht ihren Katalog weiterhin über den
  Spalten-Default, ohne eigene Auswahl (Nutzer-Entscheidung zu #346, kein Widerspruch zu D3 –
  D3 kündigt die Umstellung für die datierte Veranstaltung an, nicht für jeden Zeilentyp der
  `veranstaltung`-Tabelle).
- Der neue Katalogwechsel-Weg (Bearbeiten einer bereits offenen Veranstaltung) folgt demselben
  Guarded-UPDATE-Muster wie `setStatusAction` (`db/veranstaltung.ts`): serverseitige
  `WHERE`-Bindung an `status = 'offen'`, plus eine vorgelagerte Prüfung, dass keine
  Verzehr-Position dieser Veranstaltung `menge > 0` trägt (spec-346 AK3/AK4) – eine reine
  Zeilen-Existenz-Prüfung auf `verzehr_position` genügt nicht, da eine auf 0 zurückgesetzte
  Position kein tatsächlicher Verzehr ist. Das Ziel `catalogId` wird gegen `catalog.active = true`
  geprüft, bevor geschrieben wird (dieselbe Filterung wie bei der Anlage).

**Konsequenz.** Kein Superseding, keine Korrektur von D1–D7. Mit #346 verlässt
`STANDARD_CATALOG_ID` die produktiven Lese-/Schreibpfade vollständig (außer Theke, s. o.) und
bleibt nur noch Seed-Konstante – exakt der in D3 vorgezeichnete Endzustand.
