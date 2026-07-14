# ADR 022: Teilnehmer-Datenmodell (Personen & Familien)

## Status
Accepted

## Date
2026-07-14

## Context

Mit F3 (#50, spec-50) entsteht die erste **Stammdaten-Entität**, die über mehrere
Features hinweg referenziert wird: der **Teilnehmer**. Ein Teilnehmer ist die Einheit
**einer** Abrechnungszeile und kann eine **Einzelperson** oder eine **Familie** sein.
Aus der gepflegten Teilnehmerliste werden pro Abend (F4/#51) Zeilen ausgewählt; auf den
Teilnehmer beziehen sich später Verzehr (F5), Auslagen (F6) und Kassieren (F8).

Weil die Entität von Folge-Features referenziert wird, sind drei Modellierungsfragen
**jetzt** – vor der ersten Persistierung, ohne Prod-Daten – zu entscheiden:

1. **Typ-Modellierung:** Person und Familie in **einer** Tabelle oder getrennt?
2. **Eindeutigkeit des Namens:** Der Getränke-Katalog (spec-49) erzwingt
   `UNIQUE(name, size)`. Für Teilnehmer verlangt die Spec das **Gegenteil**:
   Namensgleichheit ist erlaubt (kommt real vor), nur mit **Warnhinweis**;
   Unterscheidung über die eindeutige ID.
3. **Historien-Treue:** Namensänderungen gelten für künftige Abende; **abgeschlossene**
   Abende zeigen den Namen wie zum Abrechnungszeitpunkt (spec-50, AK2).

Fachliche Randbedingungen (spec-50): kein Hard-Delete (Deaktivieren), kein
Teilnehmer-Konto, keine Familie↔Personen-Verknüpfung (Familie = **eine** Einheit),
keine Kontaktdaten. RBAC serverseitig: Stammdatenpflege nur `verwalter`; der **Walk-in**
(AK6) legt aus einem offenen Abend heraus als `abrechner` an (Umsetzung F4).

## Decision

**Eine Tabelle `teilnehmer`**, strukturgleich zum Katalog-Muster (spec-49), mit einem
Typ-Enum statt getrennter Tabellen:

1. **Schema (`db/schema.ts`):**
   - `id` `text` PK, UUID via `$defaultFn` (wie `catalog_item`/`user`).
   - `name` `text NOT NULL` – **kein** Unique-Constraint.
   - `typ` neues `pgEnum("teilnehmer_typ", ["person", "familie"])` (deutsche Werte wie
     `user_role`/`catalog_category`).
   - `mitglied` `boolean NOT NULL DEFAULT false` – reines Info-/Auswertungskennzeichen,
     **nicht** preisrelevant (spec-50: Nicht-Mitglieder zahlen dieselben Preise).
   - `active` `boolean NOT NULL DEFAULT true` – Soft-Delete (Deaktivieren/Reaktivieren).
   - `createdAt`/`updatedAt` `timestamp withTimezone NOT NULL DEFAULT now()`.
   - Typen `Teilnehmer`/`NewTeilnehmer` via `$inferSelect`/`$inferInsert`.

2. **Kein Unique auf `name` – bewusste Abweichung vom Katalog.** Duplikate sind erlaubt
   (spec-50). Der Warnhinweis wird **applikativ und nicht-blockierend** umgesetzt: der
   Data-Layer bietet `findActiveByName(name)`; die Server-Action prüft vor dem Insert und
   gibt bei Treffer `{ needsConfirm: true, warning }` **ohne zu speichern** zurück. Erst
   ein erneutes Absenden mit `confirmDuplicate=true` legt an. Kein DB-Constraint, kein
   `23505`-Pfad für Teilnehmer.

3. **Data-Layer `db/teilnehmer.ts`** als einziger Ort mit Drizzle-Queries auf die Tabelle
   (Separation of Concerns, PROJECT-CONTEXT), analog `db/catalog.ts`:
   `listTeilnehmer()` (inkl. inaktive, Pflegeansicht), `listActiveTeilnehmer()`
   (Auswahl im Abend), `createTeilnehmer(data)`, `updateTeilnehmer(id, data)`,
   `setTeilnehmerActive(id, active)`, `findActiveByName(name)`. Die Funktionen sind
   **rollen-neutral** – der RBAC-Guard sitzt in der jeweiligen Action, damit F4 dieselbe
   `createTeilnehmer`-Funktion für den Walk-in (`requireRole("abrechner")`) wiederverwendet.

4. **Historien-Treue ist NICHT Aufgabe der Stammdaten.** Die `teilnehmer`-Zeile trägt
   immer den **aktuellen** Namen (mutabel). Die Namens-Momentaufnahme eines abgeschlossenen
   Abends entsteht in der **Abend-Zeile** (F4/#51): diese referenziert `teilnehmer.id`
   **und** speichert den Anzeigenamen zum Abrechnungszeitpunkt (Snapshot). F3 stellt dafür
   nur die stabile `id` bereit; die Snapshot-Spalte gehört in die F4-Modellierung.

## Alternatives

### Frage 1 – Typ-Modellierung

#### Option A: Eine Tabelle `teilnehmer` + `typ`-Enum (empfohlen)
**Pros:**
- Person und Familie unterscheiden sich fachlich **nur** im Kennzeichen `typ` – gleiche
  Felder, gleiche Operationen, **eine** Abrechnungseinheit. Ein Flag genügt (YAGNI).
- Eine gemeinsame Liste/Query für die Abend-Auswahl (F4) ohne Union über zwei Tabellen.
- Strukturgleich zum bereits etablierten Katalog-Muster → geringe kognitive Last,
  Wiederverwendung von Data-Layer-/Action-/UI-Patterns.
**Cons:**
- `typ` muss bei Auswertungen mitgefiltert werden (trivial).

#### Option B: Getrennte Tabellen `person` / `familie`
**Pros:** Jeder Typ könnte eigene Felder bekommen.
**Cons:** Es gibt **keine** typ-spezifischen Felder (spec-50 schließt Personen-in-Familie
explizit aus). Jede Referenz (F4–F8) müsste polymorph auf zwei Tabellen zeigen → doppelte
FKs oder Union-Views, mehr Fehlerfläche. Über-Modellierung für einen reinen Flag-Unterschied.
Verworfen.

### Frage 2 – Eindeutigkeit des Namens

#### Option A: Kein Unique-Constraint, applikative Warnung (empfohlen)
**Pros:** Erfüllt die Spec direkt (Namensgleichheit erlaubt). ID bleibt die einzige
Identität. Warnung sitzt an der Server-Grenze und ist überstimmbar.
**Cons:** Warnung ist keine DB-Garantie – bewusst, weil Gleichnamigkeit gewünscht sein kann.

#### Option B: `UNIQUE(name)` wie beim Katalog
**Pros:** Verhindert versehentliche Dubletten hart; ein bekanntes Muster.
**Cons:** **Widerspricht der Spec** – zwei „Familie Müller" wären unmöglich, obwohl real.
Der `23505`-Pfad würde einen legitimen Fall als Fehler abweisen. Verworfen; explizit
dokumentiert, damit die Katalog-Analogie nicht reflexhaft ein Unique nachzieht.

## Rationale

Die fachliche Realität – Person und Familie sind dieselbe Abrechnungseinheit mit einem
Typ-Flag, und Gleichnamigkeit ist normal – gibt beide Kernentscheidungen vor: **eine**
Tabelle und **kein** Namens-Unique. Beides ist zugleich die einfachste Lösung (YAGNI) und
maximiert die Wiederverwendung des erprobten Katalog-Musters (Soft-Delete, deutsches Enum,
UUID-PK, Data-Layer-Isolation, Zod an der Server-Grenze, RBAC-Guard). Die Abweichung vom
Katalog (kein Unique) ist die einzige nicht-offensichtliche Stelle und wird deshalb
festgehalten. Die Historien-Treue bewusst der Abend-Zeile (F4) zuzuweisen hält die
Stammdaten mutabel und schlank und verhindert eine verfrühte Snapshot-Mechanik in F3.

## Consequences

**Positive:**
- Neues Feature erbt das gesamte Katalog-Muster → schnelle, konsistente TDD-Umsetzung.
- Rollen-neutraler Data-Layer macht den F4-Walk-in ohne Duplizierung möglich.
- Klare Grenze zu F4 (Snapshot dort) verhindert Scope-Creep in F3.
- Kein `UNIQUE(name)` → legitime Gleichnamigkeit ist ohne Sonderfall möglich.

**Negative / Trade-offs:**
- Die Duplikat-Warnung braucht einen Extra-Query (`findActiveByName`) und einen
  `confirmDuplicate`-Zweig in der Action – mehr Mechanik als der reine `23505`-Pfad des
  Katalogs, aber fachlich erforderlich.
- F4 **muss** den Namens-Snapshot implementieren, sonst zeigen alte Abende geänderte Namen.
  Als verbindliche Vorgabe hier dokumentiert (Vertrag für #51).
- Migration führt ein neues Enum `teilnehmer_typ` ein → Standard-Drizzle-Migration; kein
  Enum-Wert-Wechsel, daher nicht von der Drop-and-recreate-Falle (#48) betroffen.
