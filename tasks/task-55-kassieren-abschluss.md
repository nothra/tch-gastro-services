# Task 55: kassieren-abschluss

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Feature **F8** (Epic „Digitale Veranstaltungs-Abrechnung"). Der **Veranstalter** kassiert am
Ende einer Veranstaltung bei jedem Teilnehmer den **Verzehr-Gesamt** bar, erfasst das
**Erhalten**; die **Spende** = Erhalten − Verzehr-Gesamt ergibt sich automatisch. Zeilen sind
**offen/bezahlt** (abgeleitet aus `Erhalten ≥ Verzehr-Gesamt`; kein Restbetrag im MVP). Die
Veranstaltung kann **nur abgeschlossen werden, wenn jede Zeile bezahlt ist** (danach
schreibgeschützt, Tagessummen fixiert) und kann von einem Veranstalter **wieder geöffnet**
werden (protokolliert). Zusätzlich die **Veranstaltungs-Gesamtabrechnung** je zugeordneter
Kasse (Einnahmen Σ Erhalten vs. Ausgaben Auslagenerstattungen, F6).

Auslagen werden beim Kassieren **nicht** verrechnet (eigener Vorgang, F6) → Verzehr-Gesamt ≥ 0.

**Terminologie:** durchgängig „Veranstaltung" (nie „Abend"); Owner-Rolle `veranstalter`.

Kanonische Quelle der Akzeptanzkriterien: [`docs/specs/spec-55-kassieren-abschluss.md`](../docs/specs/spec-55-kassieren-abschluss.md).

## Akzeptanzkriterien
<!-- Spiegelt spec-55; kanonische Quelle bleibt die Spec-Datei -->
- [x] Verzehr-Gesamt je Zeile = Σ Getränke + Σ Sonstige (2 Nachkommastellen, **ohne** Auslagen-Abzug).
- [x] `Erhalten = Verzehr-Gesamt` → `Spende = 0`, Zeile **bezahlt**.
- [x] `Erhalten > Verzehr-Gesamt` → `Spende = Erhalten − Verzehr-Gesamt` (als Spende ausgewiesen), Zeile **bezahlt**.
- [x] `Verzehr-Gesamt > Erhalten` → Zeile **nicht** bezahlt, bleibt/wird **offen** (kein Restbetrag gespeichert).
- [x] Zeile ohne Verzehr (`Verzehr-Gesamt = 0`) und ohne `Erhalten` → **bezahlt** (nichts zu kassieren), zählt nicht als offen.
- [x] Abschluss bei mindestens einer offenen Zeile (`Verzehr-Gesamt > Erhalten`) → **abgelehnt** (serverseitig, fail-closed) mit Hinweis welche/wie viele Zeilen offen sind; Status bleibt `offen`.
- [x] Abschluss, wenn **jede** Zeile bezahlt ist (inkl. `Verzehr-Gesamt = 0`) → Status `abgeschlossen`, schreibgeschützt, Tagessummen fixiert.
- [x] Abgeschlossene Veranstaltung wieder öffnen → Korrekturen (Verzehr/Erhalten/Auslagen) möglich, Wiederöffnung protokolliert, nach erneutem Abschluss Summen neu fixiert.
- [x] Tagessummen entsprechen der Summe der Zeilenwerte (Getränke, Sonstige, Verzehr-Gesamt, Erhalten, Spende).
- [x] Veranstaltungs-Gesamtabrechnung: Auslagenerstattungen je Kategorie + gesamt als Ausgaben; **Kassenveränderung** = Σ Erhalten − Σ Auslagenerstattungen je zugeordneter Kasse korrekt.
- [x] Individuelles Kassieren mit eigenen Auslagen: zu kassierender Betrag bleibt der **volle** Verzehr-Gesamt (Auslagen wirken nur in der Gesamtabrechnung).

### Fehlerszenarien
- [x] `Erhalten` kein gültiger EUR-Betrag ≥ 0 → serverseitig abgelehnt (inkl. int4-Obergrenze).
- [x] Abschluss bei offener Zeile → serverseitig **abgelehnt** (fail-closed) mit Hinweis welche/wie viele Zeilen offen sind.
- [x] Wiederöffnen ohne Veranstalter-Rolle → serverseitig abgelehnt (fail-closed, `lib/authz.ts`).

## Technische Notizen
<!-- Kanonische Quelle: docs/adr/033-kassieren-abschluss-datenmodell.md -->
Architektur entschieden in **[ADR-033](../docs/adr/033-kassieren-abschluss-datenmodell.md)**:

- **D1 – Erhalten/Status:** neue nullable Spalte `veranstaltung_zeile.erhalten_cents`
  (CHECK `IS NULL OR >= 0`). **Keine** Status-Spalte – `bezahlt ⇔ (erhalten ?? 0) ≥ verzehrGesamt`
  und `spende = max(0, (erhalten ?? 0) − verzehrGesamt)` werden **abgeleitet** (single source).
- **D2 – Preis-Einfrieren:** neue nullable Spalte `verzehr_position.einzelpreis_cents`; beim Abschluss
  Katalogpreis snapshotten, Lesen via `COALESCE(einzelpreis_cents, price_cents)`, beim Wiederöffnen
  auf `NULL` zurücksetzen. `listPositionen` (F5) auf `COALESCE` umstellen. Erfüllt den ADR-025-D2-Handoff.
- **D3 – Abschluss transaktional & guarded:** block bei ≥1 offener Zeile (`Verzehr-Gesamt > Erhalten`,
  Hinweis „N Zeile(n) offen"); Preis-Snapshot + `status` + Ereignis atomar (Batch, guarded `WHERE status`).
- **D4 – Protokoll:** append-only Tabelle `veranstaltung_ereignis` (`art` enum abgeschlossen/wiedereroeffnet,
  `akteurUserId` nullable `onDelete set null`, `akteurName`-Snapshot, `createdAt`).
- **D5 – Kassier-Summen:** DB-freies Modul `app/veranstaltung/kassierSummen.ts` (Codify #105) als
  gemeinsame Quelle für Anzeige **und** Abschluss-Gate; Kassenveränderung = Σ Erhalten − Σ Auslagen(`erstattet`).
- **D6 – Actions/Route:** `setStatusAction` von `void` → Rückgabe-State erweitern (StatusToggle mitziehen,
  `useActionState`/`useCallback`, Codify #49); neue `kassiereZeileAction`; neue Route
  `app/veranstaltung/[id]/kassieren/` → **`docs/routes.md` mitpflegen** (Guardrail #145).
- **D7 – Session:** `session.user.id` aus `token.sub` freischalten (`auth.config.ts` + `types/next-auth.d.ts`,
  Codify #48).
- Beträge Integer-Cent (ADR-021); Zod an der Grenze mit `INT4_MAX` (Codify #49); IDOR-Bindung (Codify #51).
- **Migration** (`db:generate`) rein additiv → kein interaktiver Prompt erwartet; lokal gegen Wegwerf-DB
  `0000→…→n` grün verifizieren (Codify #48).

## Implementierungs-Notizen
- **Vollständig umgesetzt (D1–D7):** Schema + Migration `0011_red_ronan.sql` (additiv: `erhalten_cents`,
  `einzelpreis_cents`, Tabelle `veranstaltung_ereignis` + Enum, beide CHECKs), Data-Layer
  (`setErhalten`, `abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung` transaktional über
  `db/atomic.ts`, `db/veranstaltung-ereignis.ts`, `listPositionen` COALESCE), reine Summen
  (`kassierSummen.ts`), Actions (`kassiereZeileAction`, `setStatusAction` mit Rückgabe-State),
  Zod (`kassiereSchema`), Route/Seite `app/veranstaltung/[id]/kassieren`, `StatusToggle`
  (`useActionState`), Session `id` (D7), `docs/routes.md`, `types/next-auth.d.ts`.
- **Beim Aufsetzen (resume) behoben:** stale Test-Fixtures ohne die neuen Spalten
  (`erhaltenCents`/`einzelpreisCents`/`VerzehrPositionRow`) ließen `pnpm lint`+`pnpm test` grün,
  brachen aber `pnpm typecheck` (#137-Klasse). Fixtures ergänzt → Typecheck grün.
- **Neu ergänzt (war der abgebrochene WIP-Teil):** Integrationstests in `db/veranstaltung.test.ts`
  für die neuen Data-Layer-Funktionen — `setErhalten` (inkl. IDOR-Mismatch, Codify #51),
  Preis-Einfrieren beim Abschluss trotz späterer Katalog-Preisänderung (ADR-025-D2-Handoff),
  Preis-Reset + Live-Neuberechnung beim Wiederöffnen, Protokoll-Eintrag je Transition (D4),
  guarded UPDATE gegen Doppel-Abschluss/-Öffnen (D3).
- **Gates lokal grün:** `pnpm test` (484 passed), `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
  Routen-Doku-Drift.

### Nachtest (in dieser Umgebung nicht ausführbar – Sandbox verweigert Docker/`.env.local`)
- **DB-Integrationstests** (`db/*.test.ts`, `skipIf(!hasDb)`) und die **Migrationskette**
  `0000→…→0011` konnten hier nicht gegen eine Postgres-Instanz laufen (`pnpm db:up`/`.env.local`
  blockiert). Sie sind typecheck-sauber und folgen dem bestehenden DB-Test-Muster. Nachweis über
  einen lokalen Lauf (`pnpm db:up && pnpm db:migrate && pnpm test`) bzw. `/post-merge-verify`.
- **Browser-Oberflächentest** der Kassier-Seite (`pnpm dev`) analog – DB-abhängig, hier nicht
  möglich; als UI-Nachtest offen.

## Offene Fragen
_Alle drei /architecture-Fragen in [ADR-033](../docs/adr/033-kassieren-abschluss-datenmodell.md) entschieden
(Protokoll → D4, fixierte Summen → D2, Ablage Erhalten/Status → D1). Derzeit keine offenen Fragen._

## Review-Findings
<!-- Wird durch /review befüllt -->
**Review-Runde 1** (`tasks/review-55.md`, Verdict NEEDS_REWORK): keine kritischen, fünf wichtige
Findings – alle behoben (2026-07-20):

- **W1 – Guarded UPDATE schützt nur die Status-Spalte (Audit-Trail/`{ok:true}`-Race).** Behoben
  über **Fix-Option (b)** des Reviews: `setStatusAction` wertet jetzt den `undefined`-Rückgabewert
  von `abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung` aus und meldet den nebenläufigen
  No-op als „bereits abgeschlossen/offen"-Fehler statt fälschlich `{ ok: true }`
  (`app/veranstaltung/actions.ts`). Zwei neue Action-Unit-Tests decken beide Branches ab.
  Die reine Data-Layer-Idempotenz (Fix-Option a) wurde **bewusst nicht** in SQL nachgezogen: sie
  erforderte ein `INSERT … SELECT … WHERE EXISTS` mit Enum-Cast, das in dieser Sandbox nicht gegen
  eine echte Postgres-DB verifizierbar ist – ein ungetesteter Umbau des kassenkritischen
  Abschluss-Pfads wäre unverhältnismäßig für den Single-Veranstalter-MVP. Die Data-Layer-Funktionen
  sind bewusst reine atomare Writer; der Guard sitzt in `setStatusAction` (Status-Vor-Check + neue
  `undefined`-Auswertung). Der verbleibende Phantom-Event bei einem echten Nebenläufigkeits-Rennen
  ist die in **ADR-033 D3 bewusst akzeptierte TOCTOU**. Die beiden Data-Layer-Doppelaufruf-Tests
  dokumentieren jetzt die **tatsächliche** Semantik (`listEreignisse` Länge 2 bzw. 1) statt sie zu
  kaschieren (Review-Vorgabe „In jedem Fall").
- **W2 – Tote Funktion `setStatus`** (kein Produktionsaufrufer nach dem Action-Refactor): Funktion
  und ihr Integrationstest entfernt (`db/veranstaltung.ts`, `db/veranstaltung.test.ts`), YAGNI.
- **W3 – Tote Funktion `logEreignis`** (exportiert, nie aufgerufen): entfernt; der Modul-Kommentar
  von `db/veranstaltung-ereignis.ts` erklärt jetzt, dass der Ereignis-Insert bewusst inline in der
  Abschluss-/Wiederöffnungs-Transaktion läuft (ADR-033 D3/D4).
- **W4 – `kassiereZeileAction` NOT_FOUND-Guard ungetestet:** Test
  `should_returnError_when_veranstaltungNotFound` ergänzt (Codify #51).
- **W5 – Test ohne Ablehnungs-Assertion:** `should_nameFormat_when_invalidAmount` um vorgeschaltetes
  `expect(result.success).toBe(false)` ergänzt (`app/veranstaltung/schema.test.ts`).

Nitpicks (optional) bewusst nicht adressiert, um den Rework-Diff fokussiert zu halten.
Gates nach Rework grün: `pre-push.sh` (Tests 487 passed, Typecheck, Format, Routen-Drift) + Lint.

**Review-Runde 2** (`tasks/review-55.md`): Backend/Logik und Architektur/Patterns **APPROVED**;
Code-Qualität fand ein neues, in-Scope Doku-Drift-Finding – ADR-033 D6 beschrieb die in Runde 1
entfernten `setStatus`/`logEreignis` noch als „bestehend". Behoben (2026-07-20): beide Sätze in
ADR-033 auf die Ist-Architektur gezogen (kein roher `setStatus`; Ereignis-Insert läuft inline in
der atomaren Abschluss-/Wiederöffnungs-Klammer).

## Test-Vervollständigung (`/test`, 2026-07-20)

Coverage-Analyse (`pnpm test:coverage`) gegen den Task-55-Diff (`git diff origin/main...HEAD`)
zeigte drei ungetestete Branches in **neuem** F8-Code (Rest-Lücken sind entweder DB-Integrations-
tests, die in dieser Sandbox mangels Postgres skippen, oder unverändertes Fremd-Feature-Coding
außerhalb des Diffs):

- **`auth.config.ts` (D7, `session.user.id`) komplett ungetestet** (0 % – nie ein eigener Test seit
  Einführung des Callbacks). Neu: `auth.config.test.ts` – deckt `authorized`/`jwt`/`session` inkl.
  des `token.sub ?? ""`-Fallbacks direkt als reine Funktionen ab (10 Tests, kein next-auth-Mock nötig).
- **`app/veranstaltung/[id]/kassieren/page.tsx`**: `ereignis.akteurName ?? "—"`-Fallback (Protokoll-
  Anzeige bei FK `onDelete set null`) war ungetestet. Neu:
  `should_showFallbackDash_when_akteurNameMissing`.
- **`app/veranstaltung/actions.ts`**: zwei `?? ""`-Fallback-Branches auf fehlende (nicht nur leere)
  Formularfelder ungetestet – `kassiereZeileAction` (`erhalten`-Feld komplett fehlend) und
  `setStatusAction` (`status`-Feld komplett fehlend); außerdem der `session.user.id || null`- und
  `session.user.name ?? null`-Fallback im Akteur-Snapshot (leere/fehlende Session-Felder). Neu:
  `should_resetErhaltenToNull_when_amountFieldMissing`,
  `should_rejectInvalidStatus_when_statusFieldMissing`,
  `should_normalizeEmptyActorIdAndMissingName_when_sessionUserIncomplete`.

Gates danach grün: `pre-push.sh` (501 Tests, Typecheck, Format, Routen-Drift) + `pre-commit.sh`
(Lint; eine vorbestehende, unveränderte Warnung in `db/veranstaltung.test.ts` – außerhalb des
Task-55-Diffs, blockiert nicht). Coverage F8-relevanter Nicht-DB-Dateien: 100 % (Stmts/Branch/Funcs/
Lines) bis auf zwei Fremd-Feature-Branches in `actions.ts` (F1/F7, außerhalb #55).

## Refactoring (`/refactor`, 2026-07-20)

Kein neues Verhalten. Adressiert die verbliebenen offenen Review-Nitpicks aus `tasks/review-55.md`,
die günstig und risikoarm waren (Datenkorruption/Revalidate-Nitpicks bewusst nicht angefasst, da sie
zusätzliches Laufzeitverhalten wären, kein reines Refactoring):

- **`db/veranstaltung.ts`**: Ein-Wort-Kommentar an den beiden positionalen Casts
  `results[1] as Veranstaltung[]` (`abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung`), der
  die implizite Kopplung an die Query-Reihenfolge in `runAtomic` sichtbar macht (Review-Nitpick).
- **`app/veranstaltung/actions.ts`**: die einzige inline-interpolierte Fehlermeldung
  (`Abschluss nicht möglich: N Zeile(n) noch offen.`) als benannte `offeneZeilenFehler(n)`-Funktion
  neben die übrigen Message-Konstanten gezogen – konsistent mit dem Rest der Datei (Review-Nitpick).
- **`KassiereZeileForm.test.tsx`/`StatusToggle.test.tsx`**: `vi.clearAllMocks()` → `vi.resetAllMocks()`
  im `beforeEach` (Codify #51-Konvention; hier zuvor faktisch sicher, da `withState()` den Mock direkt
  danach neu setzt, aber konsistent zum Rest der Test-Suite).

Nicht angefasst (bewusst, siehe Review-Nitpicks): `docs/adr/023-*` (außerhalb Diff-Scope),
fehlende `verzehrPath`/`auslagenPath`-Revalidierung in `setStatusAction` (wäre neues Verhalten),
`getAllByText`-Exaktheit in `kassieren/page.test.tsx` (laut Review tolerierbar).

Gates nach dem Refactoring grün: `pre-push.sh` (501 Tests, Typecheck, Format, Routen-Drift) +
`pre-commit.sh` (Lint).

## Security-Review (`/security-review`, 2026-07-20)

`tasks/security-55.md`, Verdict **PASSED** – **keine** kritischen, **keine** wichtigen Findings.
Scope `git diff origin/main...HEAD` (Codify #161, kein Fremd-PR-Bleed). Positiv am Code (nicht nur
laut Task-Datei) verifiziert: RBAC fail-closed in jeder Action + serverseitiges Route-Gate (defense
in depth), IDOR-Bindung (`veranstaltungId` im WHERE bei `getZeile`/`setErhalten`/Preis-Snapshot),
Write-Sperre für abgeschlossene Veranstaltungen, guarded UPDATE gegen Doppel-Abschluss, Zod mit
`INT4_MAX` + DB-CHECKs (kein Overflow-Bypass), keine SQL-Injection (Drizzle parametrisiert), kein
XSS (React-Escaping, kein `dangerouslySetInnerHTML`), keine neuen Dependencies, keine Secrets/PII
in Logs.

Drei **Hinweise** (kein Merge-Blocker, kein eigenes Issue angelegt):
1. **Phantom-Ereignis-TOCTOU** – nebenläufiger Doppel-Abschluss/-Wiederöffnen kann einen
   Protokolleintrag ohne realen Zustandswechsel schreiben. Bereits als akzeptierter MVP-Trade-off
   dokumentiert (ADR-033 D3, Review-Runde 1 W1); optionale Härtung (konditionaler INSERT) → Backlog #57.
2. **Append-only nur konventionell** (nur INSERTs im Data-Layer, keine DB-seitige Erzwingung) – fürs
   Bedrohungsmodell ausreichend, Notiz fürs künftige Kassenbuch (#57).
3. **`session.user.id`-Exposition (D7)** – nur die eigene, signierte, nicht-manipulierbare User-ID;
   Standard, kein Handlungsbedarf.

## Codify-Notizen

`tasks/codify-55.md` – drei neue Regeln in `docs/factory/PROJECT-CONTEXT.md` ergänzt:
(1) Guarded-UPDATE/Status-Transition-Actions müssen den `undefined`-Rückgabewert auswerten statt
`{ok:true}` anzunehmen (Review W1, generalisiert #50); (2) ADR nach Review-Rework auf Drift prüfen
(`git grep` auf entfernte Funktionsnamen), nicht nur `docs/routes.md` (Review-Runde-2-Finding);
(3) Ergänzung am #48-Eintrag: NextAuth-Callbacks sofort testen, nicht auf spätere
Coverage-Analyse verlassen (`auth.config.ts` war seit #48 bei 0 % Coverage). Dead-Code- und
Guard-Clause-Findings (W2–W5) waren Instanzen bestehender Regeln, kein neuer Bedarf. Security-
Review-Hinweise bereits als MVP-Trade-off in ADR-033 D3 / Backlog #57 dokumentiert, kein neues Issue.

---
Branch: `feature/55-kassieren-abschluss`
Erstellt: 2026-07-19 20:50
