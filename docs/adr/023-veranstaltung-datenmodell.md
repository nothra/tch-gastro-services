# ADR 023: Veranstaltung-Datenmodell (Typen, Kasse, stehende Theke)

## Status
Accepted

## Date
2026-07-15

## Context

Mit F4 (#51, [spec-51](../specs/spec-51-abend-anlegen.md)) entsteht die zentrale
**Vorgangs-Entität** der Abrechnung: die **Veranstaltung**. Sie ist die Klammer um alle
Erfassungen (Verzehr F5, Auslagen F6, Kassieren F8) und referenziert Teilnehmer-Stammdaten
(F3, ADR-022) sowie den Getränke-Katalog (F2).

Die Requirements-Schärfung 2026-07-15 hat den Schnitt erweitert: „Veranstaltung" ist der
Primärbegriff (mit Pflicht-**Datum**), und es gibt **zwei Typen**:

1. **Datierte Veranstaltung** (`veranstaltung`) – vom Abrechner angelegt, Datum + Essenpreis
   + Kasse, Status `offen` → `abgeschlossen`.
2. **Stehende Theken-Selbstbedienung** (`theke`) – dauerhaft offener Vorgang **je Kasse** für
   den spontanen Wochentag-Verzehr, Erfassung **ohne Login/Rolle** über einen **festen**
   Theken-Zugang, nur Getränke + Kaffee.

Vor der ersten Persistierung dieser Entität – ohne Prod-Daten – sind mehrere Entscheidungen
**jetzt** zu treffen, weil Folge-Features (F5–F8) darauf aufsetzen und weil das Backlog
(#57 Kassenbuch, #56 offene Posten) absehbar an der Kasse ansetzt:

1. **Typ-Modellierung:** beide Typen in einer Tabelle oder getrennt?
2. **Kasse:** pgEnum (Hausmuster) vs. stabiler Text-Key vs. eigene Entität – mit Blick auf den
   bekannten Entitäts-Pfad (#57) und die Spec-Vorgabe „Erweiterung **ohne Migration** der
   bestehenden Daten".
3. **Provisionierung & Idempotenz der stehenden Theke** (genau eine je Kasse).
4. **Bedingte Pflichtfelder** (Datum/Essenpreis nur für `veranstaltung`).
5. **Namens-Snapshot je Zeile** (Vertrag aus ADR-022).
6. **Feature-Schnitt:** Was baut #51 selbst, was ergänzen F5/F7/F8?

Bestehende Muster, an denen sich das Modell orientiert: `catalog_item`/`teilnehmer`
(UUID-`text`-PK via `$defaultFn`, deutsche `pgEnum`-Werte, Soft-Delete, `*_cents`-Integer
nach ADR-021, Data-Layer-Isolation `db/*.ts`, Zod an der Server-Grenze, `requireRole`-Guard
in der Action nach ADR-016), sowie der `proxy.ts`-Negativ-Lookahead für öffentliche Routen.

## Decision

### D1 — Eine Tabelle `veranstaltung` + `veranstaltung_typ`-Enum (beide Typen)

```
export const veranstaltungTyp = pgEnum("veranstaltung_typ", ["veranstaltung", "theke"]);

export const veranstaltung = pgTable("veranstaltung", {
  id: text.primaryKey().$defaultFn(uuid),
  typ: veranstaltungTyp("typ").notNull().default("veranstaltung"),
  bezeichnung: text("bezeichnung").notNull(),
  datum: date("datum", { mode: "date" }),          // Pflicht nur für 'veranstaltung' (CHECK)
  kasse: text("kasse").notNull(),                  // stabiler Key, s. D2
  essenpreisCents: integer("essenpreis_cents"),    // Pflicht nur für 'veranstaltung' (CHECK)
  status: veranstaltungStatus("status").notNull().default("offen"), // offen | abgeschlossen
  token: text("token").notNull().unique().$defaultFn(unguessableToken), // Zugang (F7)
  createdAt, updatedAt,
}, (v) => [
  // D6 – genau eine stehende Theke je Kasse:
  uniqueIndex("veranstaltung_eine_theke_je_kasse").on(v.kasse).where(sql`typ = 'theke'`),
  // D4 – bedingte Pflichtfelder für datierte Veranstaltungen:
  check("veranstaltung_datierte_pflichtfelder",
    sql`typ <> 'veranstaltung' OR (datum IS NOT NULL AND essenpreis_cents IS NOT NULL)`),
]);
```

Zusätzliches Enum `veranstaltung_status` (`offen` | `abgeschlossen`). Typen
`Veranstaltung`/`NewVeranstaltung` via `$inferSelect`/`$inferInsert`.

### D2 — Kasse als **stabiler Text-Key** (nicht Enum, nicht Entität)

`kasse` ist eine `text`-Spalte mit einem stabilen Schlüssel aus festem Satz
(`montagsrunde` | `vereinskasse`), abgesichert durch **(a)** Zod an der Server-Grenze und
**(b)** eine DB-`CHECK`-Constraint `kasse IN ('montagsrunde','vereinskasse')` (fail-closed
auch ohne Enum-Typ). Der feste Satz lebt als Konstante im Data-Layer
(`export const KASSEN = ["montagsrunde","vereinskasse"] as const`), von Zod und Seed genutzt.

Begründung dieser Abweichung vom Enum-Hausmuster: Kasse ist – anders als `teilnehmer_typ`
oder `catalog_category` – **kein geschlossener Typ, sondern eine Wertmenge, die absehbar zur
Entität mit eigenem Verhalten wird** (laufender Saldo, #57). Ein Text-Key erlaubt, dass eine
spätere `kasse`-Tabelle (`id text PK`) **dieselben Schlüssel** als PK trägt und die
`veranstaltung.kasse`-Spalte per FK adoptiert – **ohne Datenmigration bestehender Zeilen**
(Spec-Vorgabe). Eine dritte Kasse ist bis dahin nur ein neuer erlaubter Wert (CHECK +
Konstante anpassen), kein Enum-`ALTER TYPE`.

### D3 — Stehende Theke: Provisionierung serverseitig & idempotent

Die stehende Theke wird **nicht** vom Gast angelegt, sondern **serverseitig provisioniert**:
per **Seed** (`db/seed.ts`-Erweiterung) und über eine Action
`ensureThekeForKasse(kasse)` (Guard `requireAnyRole(["verwalter","abrechner"])`). Idempotenz
ist DB-seitig durch den Partial-Unique-Index aus D1 garantiert (zweiter Insert für dieselbe
Kasse → `23505` → Action meldet „existiert bereits", legt nicht doppelt an). Es wird nur die
tatsächlich genutzte Theke eingerichtet (kein Zwang zu zwei).

### D4 — Bedingte Pflichtfelder über CHECK + Zod

`datum` und `essenpreis_cents` sind spaltenweise **nullable**, aber per CHECK (D1) für
`typ='veranstaltung'` erzwungen NOT NULL. Für `typ='theke'` sind sie NULL (kein Datum, kein
Essen). Zod spiegelt das an der Grenze typ-abhängig. `status` ist für `theke` immer `offen`;
es gibt **keine** Abschluss-Action für `theke` (App-Guard), sodass die Theke nie durch
Zeitablauf schließt.

### D5 — Abrechnungszeile mit Namens-Snapshot (`veranstaltung_zeile`)

```
export const veranstaltungZeile = pgTable("veranstaltung_zeile", {
  id: text.primaryKey().$defaultFn(uuid),
  veranstaltungId: text.notNull().references(() => veranstaltung.id, { onDelete: "cascade" }),
  teilnehmerId: text.notNull().references(() => teilnehmer.id),   // kein Hard-Delete (ADR-022) → sicher
  anzeigename: text("anzeigename").notNull(),   // Snapshot zum Abrechnungszeitpunkt (ADR-022-Vertrag)
  createdAt, updatedAt,
}, (z) => [unique("veranstaltung_zeile_unique").on(z.veranstaltungId, z.teilnehmerId)]);
```

`anzeigename` wird beim Anlegen der Zeile aus `teilnehmer.name` kopiert und bleibt danach
stabil (erfüllt ADR-022, Konsequenz „F4 muss den Snapshot implementieren"). `UNIQUE`
verhindert Doppel-Zeilen desselben Teilnehmers je Veranstaltung.

### D6 — Data-Layer, Actions, RBAC, Route-Schnitt

- **Data-Layer** `db/veranstaltung.ts` als einziger Ort mit Drizzle-Queries (rollen-neutral,
  analog `db/teilnehmer.ts`): `createVeranstaltung`, `listVeranstaltungen`,
  `getVeranstaltung(id)`, `setStatus(id, status)`, `ensureThekeForKasse(kasse)`,
  `addZeile(veranstaltungId, teilnehmer)`, `removeZeile(zeileId)`, `listZeilen(veranstaltungId)`.
  UPDATE/DELETE-Funktionen mit `.returning()` deklarieren `Promise<T | undefined>` (Codify #50).
- **Actions** unter neuem Abrechner-Bereich `app/abrechnung/veranstaltung/` mit
  `requireRole("abrechner")` (Anlegen/Führen/Status). Zod-Schema an der Grenze:
  `essenpreis` via `parseEuroToCents` + `.refine(c => c <= 2_147_483_647)` (Codify #49),
  `datum` als Pflicht-Date für `typ='veranstaltung'`, `kasse` gegen `KASSEN` geprüft.
- **Öffentlicher Theken-Zugang** unter `app/theke/[token]/` – als **Seam** in `proxy.ts`
  vorgesehen (Negativ-Lookahead um `theke/[token]` erweitern, eng gefasst; Codify #63).
  **Die öffentliche Seite selbst baut F7/#54** (Zugang) zusammen mit F5/#52 (Erfassung); siehe D7.

### D7 — Feature-Schnitt (was #51 baut, was Folge-Features ergänzen)

Der Gast-Erfassungsfluss der stehenden Theke koppelt fachlich an F5 (Verzehr) und F7 (Zugang).
Um Doppelarbeit und Scope-Creep zu vermeiden, gilt:

- **#51 (F4) baut:** Schema (`veranstaltung`, `veranstaltung_zeile`, Enums, CHECKs, Index,
  Migration), Data-Layer, Abrechner-UI zum **Anlegen/Führen datierter Veranstaltungen**
  (Datum/Bezeichnung/Kasse/Essenpreis, Teilnehmerzeilen mit Snapshot, Status/Wiederöffnen),
  **Provisionierung der stehenden Theke** (Seed + `ensureThekeForKasse`, idempotent) inkl.
  `token`-Spalte und `proxy.ts`-Ausnahme für `theke/[token]`.
- **F7/#54 ergänzt:** die öffentliche Selbstbedienungs-Seite (Link/QR, Namenswahl) – für
  datierte Veranstaltungen **und** die stehende Theke (fester, dauerhafter Token).
- **F5/#52 ergänzt:** die eigentliche Verzehr-Erfassung je Zeile (Getränke/Kaffee; Essen nur
  bei datierten Veranstaltungen).
- **F8/#55 ergänzt:** Kassieren/Abschluss – inkl. der **Periodik der stehenden Theke** (offene
  vs. kassierte Einträge; die Theke „schließt" nicht, sondern wird periodisch abgerechnet).

Diese Sequenzierung ist die ehrliche Konsequenz aus „stehende Theke in #51 mitbauen": das
**Fundament** (Modell + Provisionierung + Route-Seam) liegt in #51, das **Gast-Frontend**
leuchtet mit F5/F7 auf. Die Akzeptanzkriterien B von spec-51 sind entsprechend als
Fundament-Kriterien zu lesen (Provisionierung, Idempotenz, Kassenzuordnung, Route-Seam);
der interaktive Gast-Fluss wird in F5/F7 abgenommen.

## Alternatives

### Frage 1 – Typ-Modellierung

#### Option A: Eine Tabelle + `veranstaltung_typ`-Enum (gewählt)
**Pros:** Beide Typen teilen Kasse, Zeilen, Verzehr und Kassieren – nur Regeln unterscheiden
sich (Datum/Essen/Abschluss). Eine Referenz für F5–F8 statt polymorpher Doppel-FKs. Muster-
gleich zu `teilnehmer`/`catalog_item` → schnelle, konsistente TDD-Umsetzung.
**Cons:** Bedingte Pflichtfelder brauchen CHECK-Constraints statt spaltenweiter NOT NULL.

#### Option B: Zwei Tabellen (`veranstaltung` / `theke`)
**Pros:** Jede Tabelle hätte nur ihre Pflichtfelder (kein CHECK).
**Cons:** F5–F8 müssten polymorph auf zwei Tabellen zeigen (doppelte FKs/Union-Views); Verzehr-
und Kassier-Logik doppelt oder generisch über beide. Hohe Fehlerfläche für einen Unterschied,
der sich in wenigen Regeln erschöpft. Verworfen (analog ADR-022, Frage 1).

### Frage 2 – Kasse-Modellierung

#### Option A: `pgEnum("kasse")` (Hausmuster)
**Pros:** Konsistent mit `user_role`/`catalog_category`/`teilnehmer_typ`; DB-Typsicherheit.
**Cons:** Der bekannte Entitäts-Pfad (#57) verlangt später `enum → text/FK` – genau die
Enum-Typ-Umbauten, die drizzle-kit-generate zum Hängen bringen und inkohärentes SQL erzeugen
(Codify #48). Widerspricht der Spec-Vorgabe „Erweiterung ohne Datenmigration".

#### Option B: Stabiler **Text-Key** + Zod + CHECK (gewählt)
**Pros:** Erfüllt „ohne Migration": eine spätere `kasse`-Entität adoptiert dieselben Keys als
PK, die Spalte wird per FK übernommen, **kein** Rewrite bestehender Zeilen. Dritte Kasse =
Wert in Konstante + CHECK, kein `ALTER TYPE`. DB bleibt fail-closed (CHECK).
**Cons:** Kein DB-Enum-Typ; Integrität hängt an CHECK + Zod (bewusst, gut abgesichert).

#### Option C: `kasse`-Entität + FK **jetzt**
**Pros:** Maximal zukunftssicher.
**Cons:** Über-Modellierung (YAGNI): Kasse ist im MVP „nicht pflegbar", fester 2-Wert-Satz.
Tabelle + Seed + Join ohne aktuellen Nutzen; das Verhalten (Saldo) entsteht erst mit #57, das
die Entität dann ownen soll. Verworfen.

### Frage 3 – Provisionierung der stehenden Theke

#### Option A: Serverseitig provisioniert, idempotent (gewählt)
**Pros:** Konsistent mit dem „kein-Gast-legt-an"-Prinzip (spec-54); DB-Idempotenz via Partial-
Unique. Gast erfasst nur.
**Cons:** Braucht Seed/Action zum Einrichten (einmalig, gering).

#### Option B: Gast legt Theke bei Bedarf an (lazy)
**Pros:** Keine Vorab-Provisionierung.
**Cons:** Anlage-Recht für nicht angemeldete Gäste – widerspricht RBAC/Security (spec-54,
Walk-in nur Abrechner) und öffnet eine Missbrauchsfläche. Verworfen.

## Rationale

Die fachliche Realität gibt die Kernentscheidungen vor: beide Typen sind **derselbe Vorgang**
mit wenigen abweichenden Regeln → **eine** Tabelle + Typ-Enum (Wiederverwendung, Muster-Treue).
Die einzige bewusste Abweichung vom Enum-Hausmuster – **Kasse als Text-Key** – ist durch einen
**konkret bekannten** künftigen Bedarf (#57 Kassenbuch mit Saldo) und die explizite Spec-Vorgabe
„ohne Migration" begründet und zugleich die einfachere Erweiterung (kein Enum-`ALTER TYPE`,
das laut Codify #48 in der Pipeline hängt). Die Provisionierung folgt dem etablierten
RBAC-Prinzip (kein Anlage-Recht für Gäste). Der explizite **Feature-Schnitt (D7)** hält #51
fokussiert und verhindert, dass die „in #51 mitgebaute" Theke die Scopes von F5/F7/F8
verschluckt – das Fundament liegt in #51, das Gast-Frontend in F5/F7.

## Consequences

**Positive:**
- F5–F8 erben eine einzige, konsistente Vorgangs-Entität; keine polymorphen Referenzen.
- Der Text-Key macht #57 zu einer rein additiven Änderung (Tabelle + FK), ohne Backfill.
- DB-seitige Garantien für die kniffligen Invarianten: genau eine Theke je Kasse
  (Partial-Unique), Pflichtfelder je Typ (CHECK) – fail-closed, nicht nur applikativ.
- Namens-Snapshot in der Zeile erfüllt den ADR-022-Vertrag; alte Veranstaltungen bleiben
  namenstreu.

**Negative / Trade-offs:**
- Zwei CHECK-Constraints + ein Partial-Unique-Index → die Migration ist etwas reicher als die
  bisherigen; **lokal gegen eine Wegwerf-DB verifizieren** (`0000→…→n` grün, Codify #48).
- Kasse hat keinen DB-Enum-Typ; die Wertintegrität liegt bei CHECK + Zod + Konstante (an drei
  Stellen synchron zu halten – kanonische Quelle ist die `KASSEN`-Konstante im Data-Layer).
- Der Gast-Erfassungsfluss der Theke ist in #51 **nicht** vollständig erlebbar (Abnahme der
  interaktiven B-Kriterien erst mit F5/F7) – bewusst dokumentiert (D7), damit /implement das
  Frontend nicht vorzieht.
- `proxy.ts` erhält eine weitere öffentliche Ausnahme (`theke/[token]`); Token-Länge/Rotation/
  Rate-Limit sind offen für F7/#54 & /security-review (fester Token = höheres Restrisiko als
  per-Termin-Link).
