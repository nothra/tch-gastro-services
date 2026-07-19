# Review: Task 55

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur/Patterns), Diff-Scope
`git diff origin/main...HEAD` (nach `git fetch`, Codify #161). Alle Findings am Code verifiziert.

## Kritische Findings (müssen behoben werden)
_Keine._ Kernlogik ist fail-closed, IDOR-gebunden, ADR-033-treu und integrationsgetestet.

## Wichtige Findings (sollten behoben werden)

- [ ] **[db/veranstaltung.ts:179-201, 206-229] Guarded UPDATE schützt nur die Status-Spalte – Ereignis-Insert und Preis-Snapshot laufen unbedingt.**
  In `runAtomic([...])` von `abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung` ist nur der mittlere Status-UPDATE guarded (`WHERE status='offen'`/`'abgeschlossen'`). Der Preis-Snapshot-UPDATE (Statement 1) und der Ereignis-INSERT (Statement 3) laufen ungeguarded. Failure-Szenario (echte Nebenläufigkeit, zwei Tabs/Doppel-Submit): Request A schließt ab; Request B las noch `status='offen'`, passiert das Gate, ruft `abschliessen` – der Status-Guard trifft 0 Zeilen (`undefined`), **aber** B fügt einen zweiten `"abgeschlossen"`-Protokolleintrag ein und re-snapshottet die Preise. Ergebnis: zwei `"abgeschlossen"`-Einträge ohne dazwischenliegendes `"wiedereroeffnet"` → falscher Audit-Trail (ADR-033 D4: „kassenintegritäts-kritisch"). ADR-033 D3 behauptet, der guarded UPDATE verhindere Doppel-Abschluss – das gilt nur für die Status-Spalte, nicht für Protokoll/Snapshot. Schwere realistisch **niedrig** (Single-Veranstalter-MVP, TOCTOU in D3 bewusst akzeptiert), aber der Audit-Trail ist der Zweck des Protokolls.
  Zusätzlich: `setStatusAction` (app/veranstaltung/actions.ts:191/194) ignoriert den `undefined`-Rückgabewert und liefert im No-op-Race dennoch `{ ok: true }`.
  Fix-Optionen: (a) Ereignis-Insert/Snapshot an dieselbe Statusbedingung koppeln (`… WHERE EXISTS(SELECT 1 FROM veranstaltung WHERE id=? AND status='offen')`) → gesamter Batch unter dem Guard idempotent; oder (b) den `undefined`-Rückgabewert in der Action auswerten. In jedem Fall: der Test `db/veranstaltung.test.ts:318` (`should_returnUndefined_when_abschliessenAlreadyClosed`) prüft nur `second === undefined` – ein `expect(await listEreignisse(v.id)).toHaveLength(1)` deckt die Ist-Semantik auf. Wird W1 als „MVP akzeptiert" eingestuft, muss dieser Test die tatsächliche Semantik dokumentieren statt sie zu kaschieren (Codify #51/#117).

- [ ] **[db/veranstaltung.ts:44-54] Tote Funktion `setStatus` – kein Produktionsaufrufer mehr nach dem Refactor.**
  Auf `origin/main` rief `setStatusAction` noch `setStatus(id, status)` auf; dieser PR schreibt die Action auf `abschliessen`/`wiedereroeffnen` um. `setStatus` wird jetzt nur noch vom Integrationstest `should_updateStatus_when_setStatus` (db/veranstaltung.test.ts:115-119) am Leben gehalten (per Grep verifiziert: kein Produktionsaufrufer). Das täuscht grüne Coverage auf ungenutztem Code vor – YAGNI-Verstoß (CLAUDE.md Prinzip 5). → Funktion **und** Test entfernen, oder begründen, warum sie bleibt.

- [ ] **[db/veranstaltung-ereignis.ts:20-30] Tote Funktion `logEreignis` – exportiert, nie aufgerufen, ungetestet.**
  Der Header-Kommentar rechtfertigt sie mit „nur wo NICHT bereits in der Transaktion mitgeschrieben" – dieser Ort existiert aber nicht: `abschliessen`/`wiedereroeffnen` inlinen den Insert bewusst in `runAtomic` (korrekt wegen Atomizität). `logEreignis` hat damit keinen Aufrufer (per Grep verifiziert). → Entfernen oder ADR-033 D4 auf das Inlining nachziehen.

- [ ] **[app/veranstaltung/actions.ts:220-221] Guard-Branch `NOT_FOUND` von `kassiereZeileAction` ungetestet (Codify #51).**
  Kein `kassiereZeileAction`-Test setzt `getVeranstaltung` auf `undefined` – alle anderen mutierenden Actions (addZeile, adjustVerzehr, createAuslage, updateAuslage) haben diesen Fall. Smell-Test: „Entferne ich den `!ziel`-Guard – schlägt ein Test fehl?" Nein. → Test `should_returnError_when_veranstaltungNotFound` für `kassiereZeileAction` ergänzen.

- [ ] **[app/veranstaltung/schema.test.ts:270-276] Test ohne Ablehnungs-Assertion kann still falsch-negativ werden.**
  `should_nameFormat_when_invalidAmount` prüft nur `if (!result.success) expect(...)` – **ohne** vorheriges `expect(result.success).toBe(false)`. Würde `kassiereSchema` `"1,234"` versehentlich akzeptieren, wird der if-Block übersprungen und der Test bleibt grün. Der Schwester-Test `should_reject_when_notANumber` (:266) macht es richtig. → Vorgeschaltetes `expect(result.success).toBe(false)` ergänzen.

## Nitpicks (optional)

- [ ] [app/veranstaltung/actions.test.ts:461/474/481] Die drei setStatus-Ablehnungen (`THEKE_NICHT_ABSCHLIESSBAR`, `BEREITS_ABGESCHLOSSEN`, `BEREITS_OFFEN`) prüfen nur `error toBeDefined()` – der „N Zeile(n) offen"-Fall (:447) prüft vorbildlich den Meldungsinhalt (Codify #116). Angleichen möglich.
- [ ] [app/veranstaltung/actions.ts:189] `` `Abschluss nicht möglich: ${offene} Zeile(n) noch offen.` `` ist die einzige nicht als Modul-Konstante definierte Fehlermeldung (wegen Interpolation vertretbar, aber inkonsistent).
- [ ] [app/veranstaltung/KassiereZeileForm.test.tsx:23, StatusToggle.test.tsx:26] `vi.clearAllMocks()` statt `resetAllMocks()` (Codify-Regel) – hier faktisch sicher, da `beforeEach` den Return-Wert neu setzt. Nur Konsistenz.
- [ ] [db/atomic.ts:24-27] Der neon-http `.batch()`-Zweig läuft lokal nie (Integrationstests über node-postgres); im Modul-Kommentar ehrlich dokumentiert, Mitigation `/post-merge-verify`. Rest-Risiko bewusst festhalten.
- [ ] [db/veranstaltung.ts:199, 227] Positionaler Cast `results[1] as Veranstaltung[]` koppelt implizit an die Build-Reihenfolge in `runAtomic` (Type-Erasure-Preis des Treiber-Seams). Ein kurzer Kommentar („Index 1 = Status-UPDATE") würde die Kopplung sichtbar machen.
- [ ] [auth.config.ts:31] `session.user.id = token.sub ?? ""` – leerer-String-Fallback bei `id: string` ist leicht unehrlich (bei authentifizierter Session ist `token.sub` faktisch immer gesetzt). Downstream sauber, da `setStatusAction:182` via `|| null` zu `null` normalisiert (konsistent mit `akteurUserId` nullable, D4). Kein Bug.

## Positives
- **Single-Source-Design (ADR-033 D5):** `kassierZeilen`/`kassierTagessummen` speisen Zeilenanzeige, Tagessummen **und** das Abschluss-Gate (`offeneZeilenCount`) über denselben DB-freien Pfad – kein doppelter Wahrheitspfad. Alle 11 ACs + 3 Fehlerszenarien erfüllt.
- **Preis-Einfrieren konsistent (ADR-033 D2):** `COALESCE(einzelpreis_cents, price_cents)` in `listPositionen` (db/verzehr.ts:68); das Abschluss-Gate rechnet über dieselbe Query → Live-Preis vor dem Snapshot (korrekt). Reset-auf-NULL beim Wiederöffnen mit Integrationstest belegt.
- **IDOR-Bindung** (`setErhalten`/`getZeile` mit `veranstaltungId` im WHERE, Codify #51) mit dediziertem Mismatch-Integrationstest; Zod-Grenze mit `INT4_MAX` (Codify #49); DB-CHECKs fail-closed.
- **Migration 0011 rein additiv & datensicher:** zwei nullable Spalten, neues Enum/Tabelle, FKs (`cascade`/`set null`), zwei `CHECK … IS NULL OR >= 0` – kein Backfill nötig; Snapshot + `_journal` mitgeneriert.
- **kassierSummen.ts** wirklich DB-/DOM-frei, domänenspezifisch benannt (Codify #105), 100 % unit-testbar; `kassierSummen.test.ts` deckt Null-Verzehr=bezahlt, Spende=0-Grenze, offeneZeilen-Zählung, negative Kassenveränderung und alle drei Kategorien ab.
- **Auth (Codify #48):** `types/next-auth.d.ts` korrekt augmentiert (`Session` via `next-auth`, JWT via `@auth/core/jwt`); FK-Schutz beim Akteur (`"" → null`) gut gefangen. Client-Komponenten auf `useActionState` ohne `useEffect` (Codify #49).
- **Schichtung strikt:** alle Drizzle-Queries in `db/*`, `sql`-Tag mit gebundenem `${veranstaltungId}` (keine Injektion); Routen-Doku `docs/routes.md` (#145) gepflegt; route-neutrale Module `app/_verzehr/*` unangetastet (Codify #52).

## Empfehlung
NEEDS_REWORK

> Keine kritischen Findings, aber fünf wichtige (zwei tote Funktionen, zwei Test-Lücken, eine
> Audit-/Nebenläufigkeits-Guard-Schwäche) – alle in-Scope und günstig zu beheben, alle berühren
> nicht-verhandelbare Prinzipien (Tests, Clean Code/YAGNI). Nach Behebung → `/test`.
> Keine Out-of-Scope-Findings → kein neues Issue angelegt.
