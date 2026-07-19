# ADR 033: Kassieren & Abschluss – Erhalten/Status, Preis-Einfrieren, Abschluss-Guard, Protokoll

## Status
Accepted

## Date
2026-07-19

## Context

F8 (#55, [spec-55](../specs/spec-55-kassieren-abschluss.md)) ist die letzte Erfassungsphase der
Veranstaltung: Der **Veranstalter** kassiert je Teilnehmerzeile den **Verzehr-Gesamt** bar
(`Erhalten`), die **Spende** (`Erhalten − Verzehr-Gesamt`, nur positiver Überschuss) ergibt sich
automatisch, und die Veranstaltung wird **abgeschlossen** (schreibgeschützt, Tagessummen fixiert)
bzw. von einem Veranstalter **wieder geöffnet** (protokolliert). Zusätzlich die
**Veranstaltungs-Gesamtabrechnung** je zugeordneter Kasse (Σ Erhalten − Σ Auslagenerstattungen).

Es ist die erste Persistierung von *Kassier-Daten* – ohne Prod-Daten. Die Requirements-Schärfung
(2026-07-19) hat zwei Regeln festgezurrt, die das Modell prägen:

1. **Abgeleiteter Zeilenstatus, strikter Abschluss:** Eine Zeile ist genau dann `bezahlt`, wenn
   `Erhalten ≥ Verzehr-Gesamt` (Zeilen mit `Verzehr-Gesamt = 0` auch ohne `Erhalten`); sonst
   `offen`. Ein Abschluss wird **abgelehnt, solange eine Zeile `Verzehr-Gesamt > Erhalten`** hat –
   **kein** manuelles Offen-/Bezahlt-Setzen, **kein** Fall „nicht kassierbar".
2. **Fixierte Tagessummen:** Nach Abschluss stehen die Summen fest; nach Wiederöffnung/erneutem
   Abschluss neu fixiert.

Die Spec delegiert drei Fragen ausdrücklich an /architecture:
1. **Ablage** von `Erhalten` und Zeilenstatus (neue Spalten an `veranstaltung_zeile`).
2. **Protokollierung** von Öffnen/Abschluss (Audit-Log vs. Zeitstempel+Nutzer).
3. **Konsistenz der fixierten Tagessummen** bei Wiederöffnung (neu berechnen vs. Snapshot).

**Entscheidende Vorbedingung aus ADR-025 (Verzehr):** Preise sind heute ein **Live-Katalog-Join**
(`verzehr_position.menge × catalog_item.price_cents`, read-time, [ADR-025](025-verzehr-erfassung-datenmodell.md)
D2). ADR-025 hat das **Einfrieren der Preise beim Abschluss** ausdrücklich an F8 übergeben
(„F8/#55 muss die Preise beim Abschluss einfrieren … additiv nachrüstbar, ohne F5-Schreibpfade zu
ändern"). Ohne Einfrieren würde eine **abgeschlossene** Veranstaltung ihre Summen ändern, sobald
der Verwalter später einen Katalogpreis anpasst – die Regel „Tagessummen fixiert" wäre verletzt.
Damit ist Frage 3 nicht „ob", sondern „wie" einfrieren.

**Bestehende Muster (alle beibehalten):** UUID-`text`-PK via `$defaultFn`, deutsche `pgEnum`-Werte,
`*_cents`-Integer nach [ADR-021](021-geldbetraege-integer-cent.md), Data-Layer-Isolation `db/*.ts`
als einziger Query-Ort, Zod an der Server-Grenze mit `INT4_MAX`-Obergrenze (Codify #49) und Geld-Seam
`lib/money.ts` (`parseEuroToCents`/`formatCents`), `requireRole`-Guard in der Action
([ADR-016](016-rbac-rollen-login.md)), IDOR-Bindung des Parent-Keys ins `WHERE` (Codify #51),
reine DB-freie Summen-Module mit domänenspezifischem Namen (Codify #105, vgl. `auslagenSummen.ts`,
`app/_verzehr/summen.ts`), `revalidatePath`. Route unter dem bereits vom `proxy.ts`-Schutz erfassten
Bereich → keine Proxy-Ausnahme (Codify #63). Bestandsaufnahme: `veranstaltung.status`
(`offen`/`abgeschlossen`) und die **fire-and-forget** `setStatusAction` existieren bereits aus F4/#51
([ADR-023](023-veranstaltung-datenmodell.md) D6/D7); F8 **erweitert** sie.

## Decision

### D1 — `erhalten_cents` (nullable) an `veranstaltung_zeile`; Zeilenstatus **abgeleitet**, keine Status-Spalte

```
// erweitert veranstaltung_zeile (ADR-023 D5):
erhaltenCents: integer("erhalten_cents"),          // nullable: NULL = noch nicht kassiert
// (a) => check("veranstaltung_zeile_erhalten_nicht_negativ",
//              sql`erhalten_cents IS NULL OR erhalten_cents >= 0`)
```

- **Nur `erhalten_cents`, kein Status-Feld.** `bezahlt`/`offen` ist **vollständig ableitbar**:
  `bezahlt ⇔ (erhalten_cents ?? 0) ≥ verzehrGesamtCents`. Für `verzehrGesamt = 0` ⇒ `0 ≥ 0` ⇒
  `bezahlt` auch bei `NULL` (Spec: Null-Verzehr = bezahlt). Eine gespeicherte Status-Spalte wäre eine
  **zweite Quelle der Wahrheit**, die zu `erhalten`/`verzehr` driften kann – vermieden (single source).
- **`NULL` unterscheidet „noch nicht kassiert" von „0 kassiert".** Für die Ableitung sind beide
  gleichwertig (`?? 0`), aber die UI kann „—" vs. „0,00 €" zeigen und die Korrektur (Erhalten wieder
  löschen) auf `NULL` zurücksetzen.
- **`CHECK erhalten_cents IS NULL OR >= 0`** als fail-closed DB-Guard, unabhängig vom Aufrufweg
  (analog `verzehr_position.menge >= 0`, `auslage.betrag_cents > 0`). Die Obergrenze (`INT4_MAX`)
  sitzt in Zod (Codify #49).
- **Spende ist ebenfalls abgeleitet**, nicht gespeichert: `spende = max(0, (erhalten ?? 0) − verzehrGesamt)`.

### D2 — Preis-Einfrieren beim Abschluss: `einzelpreis_cents` (nullable) an `verzehr_position`

```
// erweitert verzehr_position (ADR-025 D1):
einzelpreisCents: integer("einzelpreis_cents"),    // NULL = live-Katalog; gesetzt = eingefroren
// (p) => check("verzehr_position_einzelpreis_nicht_negativ",
//              sql`einzelpreis_cents IS NULL OR einzelpreis_cents >= 0`)
```

Antwort auf Frage 3: **Nicht die Aggregate einfrieren, sondern die Preis-Inputs** – Summen bleiben
immer aus den (dann eingefrorenen) Werten **neu berechnet**:

- **Beim Abschluss** wird je Position der **aktuelle Katalogpreis in `einzelpreis_cents`
  geschrieben** (Snapshot). Die `menge` ist nach dem Abschluss ohnehin unveränderlich (Schreibsperre),
  → mit eingefrorenem Preis **und** gesperrter Menge sind Zeilen-/Tages-Summen stabil.
- **Preis-Auflösung überall via `COALESCE(einzelpreis_cents, catalog_item.price_cents)`.** Solange
  `offen`, ist `einzelpreis_cents = NULL` ⇒ Live-Katalog (erfüllt ADR-025 D2 wörtlich). Nach Abschluss
  ⇒ eingefrorener Wert. Der Lese-Pfad bleibt **status-agnostisch** (kein Join auf `status` nötig) und
  robust – die Quelle steht explizit in den Daten.
- **Beim Wiederöffnen** werden die Snapshots **auf `NULL` zurückgesetzt** ⇒ Korrekturen rechnen wieder
  gegen den Live-Katalog, ein erneuter Abschluss friert neu ein („neu fixiert", Spec).
- **`listPositionen` (F5, `db/verzehr.ts`) wird auf `COALESCE(...)` umgestellt** – ein Lese-Zusatz,
  kein F5-Schreibpfad (konform ADR-025 D2). Damit zeigen **auch die F5-Detail-/Verzehr-Seiten** einer
  abgeschlossenen Veranstaltung eingefrorene Preise. Kein weiterer Snapshot (Aggregat/Zeile) nötig –
  der Preis ist der einzige veränderliche Input.

### D3 — Abschluss ist **transaktional & fail-closed guarded** (block bei offener Zeile)

Der Abschluss vereint drei Schreibvorgänge, die **atomar** sein müssen: Preis-Snapshot (D2),
`status → abgeschlossen`, Protokoll-Eintrag (D4).

- **Reihenfolge in der Action:** (1) `requireRole("veranstalter")`; (2) Veranstaltung laden,
  `status === "offen"`, `typ !== "theke"` (Theke schließt nie, ADR-023 D4); (3) Positionen + Zeilen
  laden, offene Zeilen über das Summen-Modul (D5) bestimmen; (4) **gibt es ≥ 1 offene Zeile → Ablehnung**
  mit Hinweis „N Zeile(n) noch offen" (kein Schreibvorgang); (5) sonst **transaktional**:
  Preis-Snapshot + `status` + Ereignis.
- **Atomarität + TOCTOU:** Die Schreibgruppe läuft als **eine Transaktion/Batch** über den
  Neon-HTTP-Treiber (unbedingte Writes → batch-tauglich). Der `status`-UPDATE ist **guarded**
  (`WHERE id = :id AND status = 'offen'`), damit ein nebenläufiger Zweitaufruf nicht doppelt
  abschließt. Der „alle bezahlt"-Check (Schritt 3/4) dient primär der **Fehlermeldung**; das
  Rest-Risiko eines nebenläufigen Verzehr-Strichs zwischen Check und Abschluss ist im MVP
  (ein Veranstalter kassiert) akzeptiert und optional durch eine `NOT EXISTS(offene Zeile)`-Bedingung
  im guarded UPDATE härtbar.
- **Wiederöffnen** ist ebenfalls transaktional: Snapshots `→ NULL` + `status → offen` + Ereignis;
  guarded `WHERE status = 'abgeschlossen'`.

### D4 — Protokoll: append-only `veranstaltung_ereignis` (Art, Akteur, Zeitpunkt)

```
export const veranstaltungEreignisArt =
  pgEnum("veranstaltung_ereignis_art", ["abgeschlossen", "wiedereroeffnet"]);

export const veranstaltungEreignis = pgTable("veranstaltung_ereignis", {
  id: text.primaryKey().$defaultFn(uuid),
  veranstaltungId: text.notNull().references(() => veranstaltung.id, { onDelete: "cascade" }),
  art: veranstaltungEreignisArt("art").notNull(),
  akteurUserId: text("akteur_user_id").references(() => users.id, { onDelete: "set null" }), // nullable
  akteurName: text("akteur_name"),   // Snapshot (ADR-022-Philosophie), display-ready ohne Join
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- **Append-only Log statt Zeitstempel an der Entität**, weil die Spec **„jede (Wieder-)Öffnung/
  Abschluss"** verlangt: eine Veranstaltung kann mehrfach geöffnet/geschlossen werden; Zeitstempel-
  Spalten (`abgeschlossenAt/By`) hielten nur den **letzten** Vorgang und verlören die Historie.
  Reopening eines abgeschlossenen Bar-Kassenstands ist der **sicherheitsrelevante** Vorgang, dessen
  vollständige Nachvollziehbarkeit (wer/wann) den Ausschlag gibt.
- **Akteur aus der Session** (D7): `akteurUserId = session.user.id`, dazu ein **Name-Snapshot**
  (`session.user.name`) – so bleibt der Eintrag anzeigbar (ohne Join) und **übersteht eine spätere
  User-Löschung** (`onDelete: "set null"`, `akteurUserId` nullable; Name-Snapshot bleibt).
- **`onDelete: cascade`** von der Veranstaltung (konsistent zu Zeilen/Positionen/Auslagen). Kein
  weiterer Zustand, keine Übergangs-Payload – bewusst minimal.

> Abgrenzung zu [ADR-028](028-auslagen-datenmodell.md) D3 (kein `erstattetAt`, keine Status-Historie
> für Auslagen): Dort verlangte die Spec **keine** Historie (YAGNI, `updatedAt` genügt). Hier fordert
> die Spec das Protokoll **explizit** und der Vorgang ist kassenintegritäts-kritisch – die Tabelle ist
> also die *einfachste Lösung, die die Anforderung erfüllt*, kein Gold-Plating.

### D5 — Reine Kassier-Summen-/Status-Logik als DB-freies Modul `app/veranstaltung/kassierSummen.ts`

Domänenspezifischer Name (Codify #105), analog `auslagenSummen.ts`/`app/_verzehr/summen.ts`; 100 %
unit-testbar ohne DB. **Single source** für **Anzeige und Abschluss-Gate** (D3):

- Je Zeile aus `zeileSummen` (getraenke/essen/kaffee, ADR-027) + `erhaltenCents`:
  `verzehrGesamtCents = getraenke + essen + kaffee`, `bezahlt = (erhalten ?? 0) ≥ verzehrGesamt`,
  `spendeCents = max(0, (erhalten ?? 0) − verzehrGesamt)`, `sonstigeCents = essen + kaffee` (Anzeige).
- Tagessummen: Σ Getränke, Σ Sonstige, Σ Verzehr-Gesamt, Σ Erhalten, Σ Spende, **Anzahl offener Zeilen**.
- **Kassenveränderung** = Σ Erhalten − Σ Auslagen(`erstattet`): der Auslagen-Teil kommt aus dem
  bestehenden `auslagenSummen`/`listAuslagen` (nur `erstattet`e sind kassenwirksam, ADR-028 D6),
  **je zugeordneter Kasse** – **keine** Netto-Verrechnung mit dem Verzehr (Spec). Beträge sind
  Integer-Cent → Summen exakt ganzzahlig; Anzeige über `formatCents` (de-DE).
- **Kein Exhaustiveness-Guard ohne Test** (testing-standards): der `never`-Zweig aus `zeileSummen`
  bleibt dort; neue separierbare Kriterien je eigener Assertion (Codify #116/#117).

### D6 — Data-Layer, Actions, RBAC, Route/UI (fail-closed)

- **Data-Layer `db/veranstaltung.ts` (erweitert):**
  - `setErhalten(zeileId, veranstaltungId, erhaltenCents | null)` → `Promise<VeranstaltungZeile | undefined>`,
    IDOR-gebunden (`WHERE id AND veranstaltung_id`, Codify #51). `erhalten` wird über `listZeilen`
    automatisch mitgelesen (neue Spalte, kein neuer Reader).
  - `abschliessenVeranstaltung(veranstaltungId, akteur)` / `wiedereroeffnenVeranstaltung(veranstaltungId, akteur)`
    – transaktional (D3): Preis-Snapshot bzw. `NULL`-Reset auf `verzehr_position` **dieser** Veranstaltung
    (korrelierter UPDATE über die Zeilen), guarded `status`-UPDATE, Ereignis-Insert inline in derselben
    atomaren Klammer. Kein roher `setStatus` – die beiden Funktionen sind der einzige Weg, den Status
    zu ändern (Review-Runde-1-Fix, Codify: YAGNI).
  - Preis-Auflösung in `db/verzehr.ts` `listPositionen` auf `COALESCE(einzelpreis_cents, price_cents)`.
- **Ereignis-Log** in eigenem, kleinem Modul `db/veranstaltung-ereignis.ts` (`listEreignisse(veranstaltungId)`);
  der Insert selbst läuft inline in `runAtomic(...)` der Abschluss-/Wiederöffnungs-Transaktion (D3/D4),
  nicht über eine separate `logEreignis`-Funktion (Review-Runde-1-Fix, Codify: YAGNI).
- **Actions** (`app/veranstaltung/actions.ts`, Muster wie `adjustVerzehrAction`/Auslagen):
  - `kassiereZeileAction(veranstaltungId, prev, formData)` → `{ ok } | { error }`:
    `requireRole("veranstalter")`; Zod (`erhalten` via `parseEuroToCents`, `≥ 0`, `≤ INT4_MAX`, leer ⇒
    `NULL`); Veranstaltung `offen`; IDOR-`getZeile`; `setErhalten`; `revalidatePath(kassierenPath)`.
  - **`setStatusAction` wird erweitert:** von `Promise<void>` (still) auf einen **Rückgabe-State**
    (`{ ok } | { error }`), der beim Abschluss die Ablehnung „N Zeile(n) offen" transportiert; ruft
    `abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung`. Aufrufer (`StatusToggle`) auf
    `useActionState` + `useCallback`-Wrapper umstellen (kein `useEffect`, Codify #49).
- **Route/UI:** neue authentifizierte Unterroute **`app/veranstaltung/[id]/kassieren/page.tsx`**
  (Guard wie Detail-/Auslagen-Seite, ADR-024/028 D4), verlinkt von `app/veranstaltung/[id]/page.tsx`;
  liegt im bereits geschützten Bereich → **keine** `proxy.ts`-Ausnahme (Codify #63). **Kein**
  route-neutrales `app/_kassieren/`-Modul (veranstalter-only, keine F7-Wiederverwendung – analog
  ADR-028 D4). **[`docs/routes.md`](../routes.md) im selben PR pflegen** (CLAUDE.md-Guardrail #145).

### D7 — `session.user.id` aus `token.sub` freischalten (für den Akteur)

Der `session()`-Callback (`auth.config.ts`) exponiert heute nur `roles`, **nicht** `id`. Für D4 wird
`session.user.id = token.sub` im `session()`-Callback gesetzt und `Session["user"]` in
`types/next-auth.d.ts` um `id: string` augmentiert (Muster/Fallstricke wie beim Rollen-Claim,
Codify #48: `@auth/core/jwt`-Augmentierung, Cast im Callback). Kleiner, edge-sicherer Zusatz
(kein `db`/`bcrypt`).

## Alternatives

### Frage 1 – Ablage von Erhalten & Zeilenstatus

#### Option A: Nur `erhalten_cents`, Status abgeleitet (gewählt)
**Pro:** Single source of truth; kein Drift zwischen Status und `erhalten`/`verzehr`; keine
Status-Migration bei Regeländerung; die abgeleitete Regel ist rein/unit-testbar (D5).
**Contra:** Der Status wird bei jedem Lesen berechnet (trivial, Integer-Vergleich).

#### Option B: Zusätzliche Status-Spalte (`bezahlt`/`offen`) an der Zeile
**Pro:** Status direkt abfragbar (z. B. Index).
**Contra:** Zweite Quelle der Wahrheit → muss bei jeder `erhalten`- **und** jeder `verzehr`-Änderung
synchron nachgeführt werden (Verzehr-Striche ändern `verzehrGesamt` und damit den Status!) – hohe
Drift-/Bug-Fläche für null Mehrwert im MVP. Verworfen.

### Frage 2 – Fixierte Tagessummen bei Wiederöffnung

#### Option A: Preis-Snapshot je Position, Aggregate neu berechnen (gewählt)
**Pro:** Erfüllt den ADR-025-D2-Handoff am vorgesehenen Ort (Abschluss); friert den **einzigen**
veränderlichen Input (Katalogpreis) ein – Menge ist nach Abschluss ohnehin gesperrt; alle Summen
(Zeile, Kategorie, Tag) bleiben eine **konsistente** Neuberechnung; `COALESCE`-Lesepfad ist
status-agnostisch und robust; additiv (eine nullable Spalte), keine F5-Schreibänderung.
**Contra:** Beim Abschluss/Wiederöffnen ein korrelierter Bulk-UPDATE über die Positionen (transaktional).

#### Option B: Aggregat-Snapshot je Abschluss (Zeilen-/Tages-Summen speichern)
**Pro:** Lesen ohne Neuberechnung.
**Contra:** Mehrere Snapshot-Spalten/Tabelle (getraenke/essen/kaffee/verzehrGesamt/…); der Verzehr-Teil
rechnete weiter live → **inkonsistente** Mischung aus Snapshot-Aggregat und Live-Positionen; doppelte
Wahrheit. Über-modelliert. Verworfen.

#### Option C: Keine Fixierung – immer live neu berechnen
**Pro:** Nichts zu speichern.
**Contra:** Verletzt „Tagessummen fixiert": eine spätere Katalog-Preisänderung verändert **abgeschlossene**
Veranstaltungen rückwirkend (ADR-025 nennt genau das als F8-Pflicht). Verworfen.

### Frage 3 – Protokollierung Öffnen/Abschluss

#### Option A: Append-only `veranstaltung_ereignis` (gewählt)
**Pro:** Erfüllt „**jede** (Wieder-)Öffnung/Abschluss" inkl. Mehrfach-Zyklen; volle Nachvollziehbarkeit
(wer/wann) des kassenintegritäts-kritischen Reopenings; minimal (Art + Akteur + Zeitpunkt);
`#57`-anschlussfähig (append-only wie die künftige Kassenbewegung).
**Contra:** Eine zusätzliche Tabelle + Enum (kleine Migration).

#### Option B: Zeitstempel + Akteur an der Veranstaltung (`abgeschlossenAt/By`, `wiedereroeffnetAt/By`)
**Pro:** Keine neue Tabelle.
**Contra:** Speichert nur den **letzten** Abschluss bzw. die letzte Wiederöffnung → verliert die von
der Spec geforderte Historie bei mehrfachem Zyklus. Verworfen.

#### Option C: Nur `updatedAt`/`status` (kein Akteur, keine Historie)
**Contra:** Kein Akteur, keine Nachvollziehbarkeit – erfüllt „protokolliert" nicht. Verworfen.

### Frage 4 – Atomarität des Abschlusses

#### Option A: Transaktional + guarded UPDATE (gewählt)
**Pro:** Preis-Snapshot, Status und Protokoll sind **eine** atomare Einheit; guarded `WHERE status`
verhindert Doppel-Abschluss; fail-closed.
**Contra:** Erfordert Transaktion/Batch (neon-http tauglich, da unbedingte Writes).

#### Option B: Nur App-seitiger Check, Einzel-Writes
**Contra:** Teilzustand möglich (Status gesetzt, Snapshot fehlt) bei Fehler mitten in der Sequenz;
kein Schutz gegen Doppel-Abschluss. Verworfen.

## Rationale

Das Modell zieht die etablierten Muster durch (Integer-Cent, Data-Layer-Isolation, Zod-Grenze mit
`INT4_MAX`, `requireRole`, IDOR-Bindung, reine Summen-Module, `revalidatePath`, Route unter dem
geschützten Bereich) und trifft die vier F8-eigenen Entscheidungen entlang **einer Leitlinie:
so wenig gespeicherter, ableitbarer Zustand wie möglich** – Status und Spende abgeleitet (D1),
nur der **eine** unvermeidbare Snapshot (Katalogpreis beim Abschluss, D2, vorgegeben durch ADR-025),
und ein **append-only** Protokoll dort, wo die Spec Historie explizit fordert (D4). Der Abschluss ist
die einzige zustandsverändernde Transition mit mehreren gekoppelten Writes → **atomar & guarded** (D3),
fail-closed bei offener Zeile. Die abgeleitete Kassier-Logik lebt als **eine** DB-freie, testbare
Funktion (D5) und speist sowohl Anzeige als auch Abschluss-Gate – kein doppelter Wahrheitspfad.

## Konsequenzen

**Positiv:**
- Kein Status-/Spende-Drift (abgeleitet); die Regeländerung „strikt statt hybrid" kostete null
  Schema-Änderung – ein Beleg für die single-source-Wahl.
- Abgeschlossene Veranstaltungen sind gegen spätere Katalog-Preisänderungen stabil (ADR-025-Handoff
  erfüllt), Wiederöffnen rechnet wieder live, erneuter Abschluss friert neu ein.
- Vollständiges, kassensicheres Protokoll jedes Öffnen/Abschluss (wer/wann), user-löschungs-robust.
- Eine DB-freie Kassier-Summen-Funktion als gemeinsame Wahrheit für Anzeige und Abschluss-Gate.

**Zu beachten / Handoff an /implement:**
- **Neue Migration** (`db:generate`): zwei nullable Spalten (`veranstaltung_zeile.erhalten_cents`,
  `verzehr_position.einzelpreis_cents`) mit CHECKs, ein Enum (`veranstaltung_ereignis_art`), eine
  Tabelle (`veranstaltung_ereignis`, FKs, `onDelete` wie D4). Rein additiv → **kein** interaktiver
  drizzle-kit-Prompt erwartet; dennoch **lokal gegen eine Wegwerf-DB** `0000→…→n` grün verifizieren
  (Codify #48).
- **`setStatusAction` ändert ihre Signatur** (`void` → Rückgabe-State) – Aufrufer (`StatusToggle`)
  mitziehen (`useActionState` + `useCallback`, kein `useEffect`, Codify #49). Bestehende Tests der
  Action anpassen.
- **`listPositionen` (F5) ändert die Preis-Auflösung** auf `COALESCE` – bestehende F5-Tests prüfen;
  ein Test für „abgeschlossen zeigt eingefrorenen Preis trotz Katalog-Änderung" ergänzen.
- **Abschluss-Transaktion** über den Neon-HTTP-Treiber (Batch); den guarded `status`-UPDATE und den
  Preis-Snapshot in **einer** Transaktion halten. TOCTOU-Restrisiko dokumentiert (MVP akzeptiert).
- **`session.user.id`** in `auth.config.ts` freischalten + `types/next-auth.d.ts` augmentieren (D7,
  Codify #48-Muster). Edge-sicher (kein `db`/`bcrypt`).
- **`docs/routes.md`** um `app/veranstaltung/[id]/kassieren` ergänzen (Drift-Gate, CLAUDE.md #145).
- **Tests fail-closed & je Kriterium** (testing-standards, Codify #51/#116/#117): IDOR-Mismatch,
  Guard-Clauses, Abschluss-Ablehnung bei offener Zeile (mit N-Hinweis), Null-Verzehr = bezahlt,
  Spende=0 bei genau bezahlt, Preis-Einfrieren/Reset-bei-Wiederöffnung, Protokoll-Eintrag je Transition.
- **#57 (Kassenbuch):** `veranstaltung_ereignis` (append-only) und `Σ erstattet` je Kasse sind die
  additiven Anknüpfpunkte für den laufenden Saldo – kein laufender Saldo im MVP (Backlog).
