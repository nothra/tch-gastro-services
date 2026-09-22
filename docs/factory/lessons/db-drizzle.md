# Lessons: Datenbank & Drizzle

> Ausgelagerte `/codify`-Learnings (Volltext) zu **Drizzle ORM, Migrationen, IDOR, Soft-Delete, Joins, guarded UPDATE, Zod-Obergrenzen**.
> **Nicht** `@import`-geladen (ADR-037) – bei Bedarf gezielt lesen. Kanonische Quelle je
> Regel ist der jeweilige Eintrag hier; im @import-Pfad (`PROJECT-CONTEXT.md`) steht nur eine Index-Zeile.
> Neue Learnings kommen hierher (nicht in den @import-Pfad) – siehe `/codify` + ADR-037.

### Drizzle-Migration bei Enum-Wert-Wechsel / Spalte→Array (aus #48)

Zwei Fallen: (1) `drizzle-kit generate` braucht bei mehrdeutigen Spalten-Änderungen einen
**interaktiven Prompt** (rename vs. create) und **hängt** in Non-TTY (CI/Pipeline). (2) Postgres
kann Enum-Werte nicht entfernen und eine Enum-Spalte nicht nach `Enum[]` casten → das generierte
SQL ist dann **inkohärent** (ALTER auf eine noch nicht existierende Spalte).

**Regel:** Prompt per `expect`/PTY beantworten (Default „create column" ist meist korrekt). Bei
Enum-Wert-Änderung/Enum→Enum[] das generierte SQL durch **drop-and-recreate** ersetzen (Spalte →
Type droppen → Type neu → Spalte neu), den **von drizzle-kit generierten Snapshot behalten**, und
die Migration **lokal gegen eine Wegwerf-DB** verifizieren (`0000→…→n` grün). Nur zulässig, solange
kein Prod-Datenbestand betroffen ist.

**Ergänzung ALTER TYPE RENAME VALUE: Deploy-Reihenfolge (aus #120, Security-Hinweis):**
`ALTER TYPE … RENAME VALUE` (`0007`) ist der korrekte, verlustfreie Weg für einen **reinen
Enum-Wert-Umbenennung** (kein drop-and-recreate). Aber: Die Migration **muss vor dem Code-Deploy**
laufen. Deployed der Code zuerst (referenziert `veranstalter`), während die DB noch `abrechner`
führt, verlieren alle Owner sofort den Zugriff (fail-closed, kein Escalation-Risiko, aber Lockout
bis zum nächsten Token-Refresh). Reihenfolge: **1. Migration → 2. Code-Deploy**. Sicherstellen,
dass Vercel/CI-Migrate-Step vor dem Build/Promote-Step liegt.

### Drizzle UPDATE/DELETE: `.returning()` liefert `T | undefined`, nicht `T` (aus #50, Refactoring-Finding)

`db.update(…).returning()` gibt `Promise<T[]>` zurück. Trifft der `WHERE`-Ausdruck keine Zeile,
ist das Array leer – `const [updated] = …` liefert dann `undefined`. Wer die Funktion als
`Promise<T>` deklariert, lügt gegenüber dem Compiler und allen Konsumenten.

**Regel:** `update()`- und `delete()`-Funktionen mit `.returning()` deklarieren ihren
Rückgabetyp als `Promise<T | undefined>`. `insert()`-Funktionen dürfen `Promise<T>` zurückgeben
(der Row ist nach erfolgreichem INSERT garantiert vorhanden):
```ts
// Richtig:
export async function updateTeilnehmer(id: string, data: TeilnehmerData): Promise<Teilnehmer | undefined> {
  const [updated] = await db.update(teilnehmer).set(data).where(eq(teilnehmer.id, id)).returning();
  return updated;
}
// Falsch: Promise<Teilnehmer> – undefined bei no-match unsichtbar für den Compiler
```

### Zod-Schema: Obergrenze für Integer-mapped Inputs fehlt (aus #49, Security-Hint)

Regex-basierte Preis-Validierung (`/^\d+([.,]\d{1,2})?$/`) prüft das **Format**, aber nicht
die **Größe**. Ein Verwalter kann `99999999999` eingeben – Zod akzeptiert, `parseEuroToCents`
liefert > `int4`-Maximum (2 147 483 647), der `INSERT`/`UPDATE` schlägt mit einem generischen
Postgres-`numeric value out of range`-Fehler fehl. Dieser Error-Code wird nicht als
Unique-Violation erkannt und re-geworfen → unbehandelter 500, kein Nutzer-Hinweis.

**Regel:** Jedes Zod-Feld, das auf eine PostgreSQL-`int4`-Spalte mappt, braucht nach dem
`.transform(...)` ein explizites Limit:
```ts
z.string()
  .transform(parseEuroToCents)
  .refine((c) => c <= 2_147_483_647, "Preis ist zu hoch.")
```
Analog für andere Integer-Felder (z. B. `sortOrder`): `.max(2_147_483_647)` oder ein
domänen-sinnvolles Maximum. Ohne Obergrenze ist der DB-Overflow die einzige Fehlergrenze –
fail-open für den Nutzerfeedback-Weg.

**Erweiterung auf `text`-Spalten (aus #50, Security-Hint):** Bei Postgres-`text` gibt es keine
DB-seitige Grenze – überlange Eingaben landen ohne Fehler in der DB. Auch wenn die Bedrohungs-
oberfläche niedrig ist (nur authentifizierte Verwalter), fehlt jede Nutzerrückmeldung. **Regel:**
Jedes Zod-String-Feld auf einer `text`-Spalte erhält eine domänen-sinnvolle Obergrenze:
```ts
z.string().trim().min(1, "…").max(200, "Name ist zu lang.")
```
Faustregel: Displaynamen 200, Freitext 1000, URLs/Keys nach Domäne.

### IDOR: Data-Layer DELETE/UPDATE müssen Parent-ID einschließen (aus #51, Security-Finding)

`removeZeile(zeileId)` filterte nur über `zeile.id` – ohne Bindung an die übergeordnete
`veranstaltungId`. Ein manipulierter Request mit einer offenen Veranstaltung konnte über die
offene Action-Grenze eine Zeile aus einer **anderen** Veranstaltung oder Theke löschen (IDOR).
**Fix:** Signatur `removeZeile(zeileId, veranstaltungId)`, Delete via
`and(eq(id, zeileId), eq(veranstaltungId, veranstaltungId))`.

**Regel:** Jede DELETE- oder UPDATE-Operation auf einer Zeilen-Tabelle (mit FK-Bezug auf einen
Parent) **muss den Parent-Key im WHERE einschließen** – nicht nur den Primärschlüssel der Zeile.
Nur `id` als Filterbedingung ist ein IDOR-Risiko, auch wenn RBAC auf Action-Ebene greift.
Pflicht-Begleitung: Integrationstest, der belegt, dass bei `veranstaltungId`-Mismatch `undefined`
zurückkommt und die fremde Zeile unverändert bleibt.

### Soft-Delete: `active`-Prüfung nach jedem Laden by ID (aus #51, Review-Finding)

`getTeilnehmer(id)` gab soft-gelöschte Teilnehmer (`active = false`) ohne `WHERE active = true`
zurück. Die aufgerufene Action (`addZeileAction`) prüfte `active` nicht → ein manipulierter
Request konnte einen inaktiven Teilnehmer in eine Veranstaltung eintragen, obwohl die UI ihn
nicht anzeigt.

**Regel:** Jede Funktion, die eine Entität per `id` lädt und das Ergebnis anschließend in einer
Schreiboperation nutzt, prüft explizit auf `active`:
```ts
const person = await getTeilnehmer(teilnehmerId);
if (!person || !person.active) return { error: "Teilnehmer nicht gefunden." };
```
Alternativ: `active = true` bereits im Query (z. B. `and(eq(id, …), eq(active, true))`).
Nie darauf vertrauen, dass die UI nur aktive Entitäten anzeigt – die Action ist die Grenze.

### Orphan-sichere Joins: Snapshot-Referenz kann verschwinden, auch wenn die Business-Entity bleibt (aus #53, Review-Finding K1)

`listAuslagen` jointe anfangs per **INNER JOIN** auf `veranstaltung_zeile`, nur um den
Anzeigenamen zu snapshotten. `auslage` hat aber **keinen** FK auf `zeile` – der Bezug läuft
implizit über `teilnehmerId`. Wird die Zeile gelöscht (Teilnehmer aus der Veranstaltung entfernt),
aber die zugehörige `auslage` bleibt bestehen (kein Cascade von dort), verschwand sie durch das
INNER JOIN **still** aus Übersicht, Summen und der F8-Kassenabrechnung – ein stiller
Kassen-Datenverlust, obwohl der Datensatz selbst unverändert in der DB stand.

**Regel:** Bezieht eine Tabelle einen reinen Anzeigewert (Name, Snapshot) über einen JOIN aus
einer **anderen** Tabelle, die unabhängig von der eigenen Zeile gelöscht werden kann (kein
`onDelete: cascade` **von dort auf diese Zeile**), muss der JOIN ein **LEFT JOIN** mit
`COALESCE`-Fallback auf eine stabilere Quelle sein (hier: `teilnehmer.name`, `onDelete: no
action`, nie hart gelöscht) – nicht ein INNER JOIN. Faustregel: Ein INNER JOIN auf eine Tabelle,
die nicht die Existenzgrundlage der eigenen Zeile ist, ist ein Kandidat für stillen Datenverlust
in Listen/Summen/nachgelagerten Abrechnungen. Pflicht-Begleitung: Integrationstest, der die
referenzierte Zeile löscht und prüft, dass der Eintrag weiterhin sichtbar/summenwirksam bleibt
(Fallback-Name) – siehe `should_keepAuslageVisibleWithFallbackName_when_zeileDeleted`.

### Guarded UPDATE bei Status-Transition-Actions: `undefined`-Rückgabe auswerten, nicht `{ok:true}` annehmen (aus #55, Review-Runde-1-Finding W1)

`setStatusAction` rief `abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung` auf – beide
Data-Layer-Funktionen guarden ihr UPDATE mit `WHERE status = <erwarteter-alt-Status>`, um einen
nebenläufigen Doppel-Abschluss zu verhindern (TOCTOU-Schutz). Der erste Entwurf der Action prüfte
den Rückgabewert nicht und gab bei einem nebenläufigen Zweitaufruf (0 betroffene Zeilen, Funktion
liefert `undefined`) trotzdem `{ ok: true }` zurück – der Nutzer bekam ein irreführendes Erfolgs-
Feedback für einen Vorgang, der real nichts verändert hat. Direkte Anwendung der bestehenden Regel
„`.returning()` liefert `T | undefined`" (#50) auf die **Aufrufer**-Seite: der Typ allein verhindert
den Bug nicht, wenn der Aufrufer den `undefined`-Fall nicht auswertet.

**Regel:** Jede Action, die eine guarded-UPDATE-Data-Layer-Funktion (WHERE auf den erwarteten
Vorzustand) für eine Status-Transition aufruft, muss den `undefined`-Rückgabewert explizit als
„nebenläufig bereits im Zielzustand" behandeln und einen eigenen Fehlercode zurückgeben (z. B.
`BEREITS_ABGESCHLOSSEN`/`BEREITS_OFFEN`), nicht stillschweigend Erfolg melden:
```ts
const updated = await abschliessenVeranstaltung(id);
if (!updated) return { error: "Bereits abgeschlossen." };
return { ok: true };
```
Pflicht-Begleitung: ein Test, der die Data-Layer-Funktion zweimal hintereinander aufruft und die
**tatsächliche** Semantik dokumentiert (z. B. Ereignis-Log-Länge), statt sie zu kaschieren.

### Neue Mehrfach-Write-Funktion nutzt `db.transaction()` direkt statt `runAtomic` – Treiber-Inkompatibilität nur in Produktion sichtbar (aus #345, Review-Runde-2-Finding, Architektur-Fokus)

`duplicateCatalog` (`db/catalog.ts`) legte einen neuen Katalog an und kopierte dessen Artikel in
einem `db.transaction(async (tx) => {...})`-Block – lokal/in CI grün, weil die
Integrationstests über node-postgres laufen, das `.transaction()` echt unterstützt. Der in
INT/PRD verwendete Neon-HTTP-Treiber (`db/index.ts`, ADR-014) wirft bei `.transaction()` jedoch
`"No transactions support in neon-http driver"` (`node_modules/drizzle-orm/neon-http/session.js`)
– **AK2 wäre in der Zielumgebung bei jedem Aufruf fehlgeschlagen**, obwohl alle lokalen/CI-Tests
grün waren. Genau für diesen Fall existiert bereits die projektweite Klammer `runAtomic`
(`db/atomic.ts`, etabliert für `abschliessenVeranstaltung` in `db/veranstaltung.ts`, ADR-033 D3):
sie wählt zur Laufzeit `.batch()` (neon-http) oder `.transaction()` (node-postgres). Weder die
ursprüngliche Implementierung noch Review-Runde 1 noch der Backend/Logik-Teil von Review-Runde 2
fanden das – nur der dedizierte Architektur-Review-Fokus, weil er gezielt auf
Treiber-/Infrastruktur-Kompatibilität statt nur auf Fehlerbehandlungs-Korrektheit prüfte.

**Smell:** „Meine neue Data-Layer-Funktion schreibt in **mehr als eine Tabelle/Zeile** und muss
dafür atomar sein – rufe ich dafür `db.transaction()` direkt auf dem importierten `db`-Objekt
auf, oder nutze ich `runAtomic` (`db/atomic.ts`)?" Ein reiner Integrationstest gegen die lokale
Dev-DB (node-postgres) kann diesen Fehler **nicht** aufdecken, weil node-postgres
`.transaction()` echt unterstützt – nur ein gezielter Mock-Test gegen den Neon-HTTP-Codepfad
(oder ein dedizierter Architektur-Review mit Treiber-Kenntnis) findet ihn.

**Regel:** Jede neue Data-Layer-Funktion in `db/`, die mehr als ein Insert/Update/Delete atomar
zusammenfassen muss, ruft ausschließlich `runAtomic` (`db/atomic.ts`) auf – nie `db.transaction()`
direkt auf dem `db`-Export. Ist eine ID vor der Ausführung nötig (z. B. für einen FK-Bezug
zwischen zwei Inserts derselben Batch), sie **vorab client-seitig** erzeugen (`crypto.randomUUID()`,
analog `$defaultFn` in `db/schema.ts`) statt aus dem `.returning()`-Ergebnis eines vorherigen
Statements zu lesen – `runAtomic`s Neon-Zweig (`.batch()`) erlaubt keine Cross-Query-Abhängigkeit
innerhalb derselben Batch (non-interactive). Pflicht-Begleitung: ein gezielter Mock-Test analog
`db/catalog.duplicateCatalog-driver.test.ts`, der beweist, dass `runAtomic` aufgerufen wird und
`db.transaction()` nicht – ein reiner Integrationstest über node-postgres reicht nicht. Bei
`/review` gehört „nutzt eine neue Mehrfach-Write-Funktion `runAtomic` statt `db.transaction()`
direkt?" explizit auf die Architektur-Checkliste (Perspektive „Architektur & Konsistenz"), nicht
nur implizit über Schicht-/Pattern-Konsistenz.

### Serverseitig-fix → client-gelesenes Feld öffnet neue DB-Fehlerklassen, die der bestehende Error-Translation-Wrapper nicht abdeckt (aus #345, Security-Review-Hinweis)

Vor #345 war `catalogId` bei `createItem(STANDARD_CATALOG_ID, ...)` serverseitig fix verdrahtet –
ein FK-Fehler auf `catalog_item.catalog_id` war strukturell unmöglich. Mit #345 liest
`createCatalogItemAction` (`app/verwaltung/katalog/actions.ts`) denselben Wert erstmals aus einem
**clientseitigen** Hidden-Field in `FormData`. `runWithUniqueCheck`/`isUniqueViolation` fängt
weiterhin nur SQLSTATE `23505` (Unique-Violation) ab; ein nicht existierender `catalogId`-Wert
löst beim `INSERT` stattdessen eine Fremdschlüssel-Verletzung (`23503`) aus, die ungefangen bis
zum Client durchschlägt (unbehandelter 500 statt einer Nutzermeldung wie „Katalog nicht
gefunden."). Kein Autorisierungsproblem in diesem Fall (jeder `verwalter` darf jeden Katalog
verwalten, spec-345), aber ein neues, bis dahin unerreichbares Fehlerbild. Als Issue
[#353](https://github.com/nothra/tch-gastro-services/issues/353) getrackt (Label `bug`,
funktionaler Defekt mit reproduzierbarem Auslöser).

**Smell:** „Ein Feld, das bisher serverseitig fix gesetzt war (Konstante, `STANDARD_...`,
hartcodierter Parameter), wird mit dieser Task erstmals aus `FormData`/einem Client-Wert
gelesen und dient weiterhin als FK-Bezug in einem `INSERT`/`UPDATE` – welche neuen
Postgres-Fehlerklassen (nicht nur `23505`) kann ein **ungültiger** Wert jetzt auslösen, die der
bestehende Error-Translation-Wrapper (`runWithUniqueCheck`/`isUniqueViolation`) nicht kennt?"

**Regel:** Wechselt ein Feld, das eine Fremdschlüssel-Spalte befüllt, von „serverseitig fix" auf
„aus einem Client-Wert gelesen" (auch wenn es weiterhin korrekt als Parent-Key im `WHERE`/`INSERT`
gebunden wird, Kern-Kurzregel 2), prüfen, ob der bestehende Error-Wrapper auch die dadurch neu
erreichbare FK-Violation (`23503`) abdeckt – nicht nur die bereits gehandhabte Unique-Violation
(`23505`). Fehlt die Abdeckung, entweder im selben PR ergänzen (zweiter abgefangener Code neben
`23505`, eigene Nutzermeldung) oder – wenn das Risiko nachweislich gering ist (keine
Autorisierungslücke, nur ein unschöner 500 bei einer manuell verfälschten Anfrage) – bewusst als
Folge-Issue auslagern, statt es unkommentiert stehen zu lassen.

