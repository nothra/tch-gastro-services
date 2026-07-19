# Task 55: kassieren-abschluss

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
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

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/55-kassieren-abschluss`
Erstellt: 2026-07-19 20:50
