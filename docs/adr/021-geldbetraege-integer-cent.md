# ADR 021: Geldbeträge als Integer-Cent speichern und rechnen

## Status
Accepted

## Date
2026-07-13

## Context

Mit F2 (#49, Getränke-Katalog & Preise) entsteht die **erste** persistierte
Geldgröße der App: der Artikelpreis. Sie ist der Grundstein einer ganzen Rechen-Domäne,
die in den Folge-Features aufeinander aufbaut:

- **F2** Katalogpreis, **F4** Essenpreis je Abend,
- **F5** `Verzehr-Gesamt = Σ Getränke (Menge × Preis) + Σ Sonstige (Essen + Kaffee)`,
- **F6** Auslagenerstattungen, **F8** `Spende = Erhalten − Verzehr-Gesamt` und
  `Kassenveränderung = Σ Erhalten − Σ Auslagenerstattungen`.

Die Wahl der Geld-Repräsentation ist damit **cross-cutting** und faktisch **einmalig**:
Sie legt fest, wie über alle Features hinweg gespeichert, validiert, summiert, gerundet
und formatiert wird. Eine spätere Umstellung würde Schema, Data-Layer, Zod-Grenzen und
alle Summenlogik gleichzeitig anfassen. Deshalb wird sie **jetzt**, vor der ersten
Persistierung und ohne Prod-Datenbestand, verbindlich entschieden.

Fachliche Randbedingungen (aus spec-49 und dem Epic):
- Preise in **EUR mit genau 2 Nachkommastellen**, Betrag **≥ 0**.
- Serverseitige Validierung an jeder Eingabe-Grenze mit **Zod** (PROJECT-CONTEXT).
- Beträge werden **summiert** (Zeilensummen, Abend-/Kassensummen) und **subtrahiert**
  (Spende, Kassenveränderung) – Rundungs- und Präzisionsfehler wären fachlich sichtbar
  (Barzahlung, Spendenanzeige).
- Kein Fremdwährungs-/Wechselkurs-Bedarf; ausschließlich EUR.

## Decision

Geldbeträge werden **als ganzzahlige Cent-Werte** (`integer`, Einheit: Euro-Cent)
gespeichert und in JavaScript als `number` gerechnet.

1. **DB:** Geld-Spalten sind `integer` (z. B. `price_cents`), **nicht** `numeric`/`decimal`.
2. **Rechnen:** Summen/Differenzen laufen auf ganzzahligen Cents → exakt, keine
   Gleitkomma-Fehler, innerhalb `Number.MAX_SAFE_INTEGER` für die realistischen Beträge
   dieses Projekts weit unbedenklich.
3. **Grenzen (ein Ort):** Ein kleines, framework-unabhängiges Modul **`lib/money.ts`**
   kapselt die Umrechnung:
   - `parseEuroToCents(input: string): number` – akzeptiert Nutzer-Eingaben mit `,` **oder**
     `.` als Dezimaltrenner, verlangt ≤ 2 Nachkommastellen und Betrag ≥ 0, liefert
     ganzzahlige Cents; ungültige Eingaben werfen/liefern einen Fehler, den Zod an der
     Server-Grenze in eine Validierungsmeldung übersetzt.
   - `formatCents(cents: number): string` – rendert `"2,00 €"` (de-DE) für die Anzeige.
   Zod validiert **rohe Eingabe** (Regex ≤ 2 Nachkommastellen, ≥ 0) und transformiert
   via `parseEuroToCents` zu Cents; gespeichert und weitergereicht werden nur Cents.
4. **Präsentation:** Cents werden **erst** in der UI/Anzeige zu EUR formatiert
   (`formatCents`), nie im Data-Layer.

## Alternatives

### Option A: Integer-Cent (empfohlen)
**Pros:**
- **Exakte Arithmetik.** Ganzzahl-Addition/-Subtraktion hat keine Binär-Float-Fehler
  (`0.1 + 0.2 !== 0.3`) – die Spende-/Kassendifferenzen stimmen cent-genau.
- **JS-nativ.** Cents sind `number` und bleiben für alle realistischen Vereinsbeträge
  weit unter `Number.MAX_SAFE_INTEGER` (2^53). Keine BigInt-, keine Decimal-Bibliothek.
- **Keine Treiber-Falle.** Drizzle/`node-postgres`/Neon liefern `integer` als `number`;
  es gibt keinen impliziten String↔Number-Bruch (siehe Contra von Option B).
- **Genau-2-Nachkommastellen ist strukturell erzwungen.** Die Einheit *ist* Cent → es gibt
  keine dritte Nachkommastelle, die versehentlich entstehen könnte.
- **Ein Konvertierungs-Seam** (`lib/money.ts`) → Rundung/Parsing an genau einer, testbaren
  Stelle statt verstreut.

**Cons:**
- Umrechnung an den Rändern (Eingabe → Cents, Cents → Anzeige) nötig – bewusst in
  `lib/money.ts` gebündelt.
- Roh-Cent-Werte in DB/Logs sind für Menschen weniger direkt lesbar (`210` statt `2,10`).

### Option B: `numeric(10,2)` / Drizzle `decimal`
**Pros:**
- Speichert den Dezimalwert direkt; in DB-Tools sofort als „2,10" lesbar.
- Postgres rechnet `numeric` selbst exakt (keine Float-Fehler auf DB-Ebene).

**Cons:**
- **Drizzle liefert `numeric` als `string`** (bewusst, um JS-Float-Verlust zu vermeiden).
  Damit müsste **jede** Summenbildung erst parsen (`Number(x)`) und träte genau in die
  Float-Falle ein, die `numeric` vermeiden sollte – oder eine Decimal-Bibliothek
  einführen (neue Abhängigkeit, mehr Mechanik). Die Präzisionsgarantie der DB endet an
  der JS-Grenze.
- Mischt String-Repräsentation und numerische Semantik über alle Features → mehr
  Fehlerfläche in der zentralen Rechen-Domäne.
- Für ein EUR-only-Projekt ohne Fremdwährung ist der `numeric`-Mehrwert gering.

### Option C: Gleitkomma-EUR (`real`/`double`, JS-`number` in Euro)
**Pros:** Keine Umrechnung, „natürlichste" Schreibweise.
**Cons:** **Ausgeschlossen** – Binär-Float kann `2,10 €` nicht exakt darstellen;
Summen/Differenzen driften (fachlich sichtbar bei Spende/Kasse). Kein seriöser
Geld-Speicher. Verworfen.

## Rationale

Die zentrale Rechen-Domäne (Summen **und** Differenzen von Bargeld) verlangt **exakte**
Arithmetik – das ist das ausschlaggebende Kriterium. Integer-Cent liefert Exaktheit mit
JS-nativen `number`-Werten, **ohne** neue Abhängigkeit und **ohne** die Drizzle-`numeric`-
als-`string`-Falle, die Option B genau im heißen Pfad (Summenbildung) aufreißt. Die
„genau 2 Nachkommastellen"-Regel der Spec wird durch die Einheit strukturell erzwungen
statt durch Formatierung nachgehalten. Die Beträge dieses Projekts (ein Abend, ein Verein)
liegen um viele Größenordnungen unter der `2^53`-Grenze, sodass der klassische
Integer-Cent-Nachteil (Überlauf bei sehr großen Summen) hier nicht greift.

Die Entscheidung ist **jetzt günstig** (keine Prod-Daten, keine bestehende Geld-Spalte)
und **hinter `lib/money.ts` reversibel gekapselt**: Parsing/Formatierung liegen an einer
Stelle. YAGNI gegenüber Decimal-Bibliotheken ist gewahrt.

## Consequences

**Positive:**
- Cent-genaue Summen/Differenzen über F5/F8 – keine Float-Drift in Spende/Kassenveränderung.
- Genau **ein** getesteter Konvertierungs-Seam (`lib/money.ts`) für Parsing, Rundung,
  Formatierung; von allen Features wiederverwendet. Deterministisch ohne DB/Netz testbar.
- Keine neue Abhängigkeit, kein String↔Number-Bruch aus dem Treiber.
- Zod-Grenzen bleiben schlank: Regex-Validierung + `transform` zu Cents.

**Negative / Trade-offs:**
- Folge-Features **müssen** Geld konsequent als Cents führen und **erst** in der Anzeige
  formatieren; ein versehentliches „Euro als number" in einer Summe wäre ein Bug. Wird
  durch das zentrale Modul + Typkonvention (Spalten heißen `*_cents`) entschärft.
- DB-Rohwerte sind in Cents (`210`), weniger direkt lesbar – akzeptiert; `db:studio`/Logs
  brauchen die gedankliche Division durch 100.
- Sehr große Summen (theoretisch > `2^53` Cent) wären unsicher – für dieses Projekt
  praktisch ausgeschlossen, daher kein BigInt.
