# Task 120: adr-frage-route-schnitt-abrechnung-veranstaltung

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
ADR-Frage: Wie wird der Lebenszyklus einer **Veranstaltung** geschnitten, bevor die Features
**F5–F8** (#52 Verzehr, #53 Auslagen, #54 Selbstbedienung-Link, #55 Kassieren) auf die heute
**flache** Route `app/abrechnung/veranstaltung/` aufsetzen?

**Leitgedanke (2026-07-15):** Das **Abrechnen ist nur eine Phase** im Lebenszyklus einer
Veranstaltung (anlegen → durchführen/Verzehr → abrechnen → abschließen). Daraus folgt: Route
UND Rolle sind heute nach *einer Phase* benannt (`/abrechnung…`, Rolle `abrechner`), obwohl
beide den ganzen Lebenszyklus meinen.

**Gebündelter Umfang (Entscheidung 2026-07-15):** #120 deckt zwei gekoppelte Concerns ab:
- **(A)** Lifecycle-orientierter **Route-/Verzeichnis-Schnitt** (Basis-Benennung, Phasen-URLs,
  Code-Schnitt, Actions-Schnitt, öffentlicher F7-Zugang).
- **(B)** **Rollen-Modell**: eine Rolle **`veranstalter`** über den ganzen Lebenszyklus statt
  einer eigenen Rolle `abrechner`; `verwalter` bleibt unverändert.

> ⚠ **Label-/Branch-Hinweis:** Durch (B) enthält #120 nun auch **Code + pgEnum-Migration**
> (nicht mehr docs-only). Branch `docs/…` und Label `documentation` passen nicht mehr –
> vor dem Merge auf `enhancement` anpassen (mit dem Menschen klären).

**Umfang DIESER Requirements-Task:** nur die **Framing-Spec** (`/requirements`). Entscheidung
und ADR liefert **`/architecture 120` → ADR-024**, die Umsetzung `/implement 120`.

Rahmung, Optionsraum (A–E + R0/R1) und Akzeptanzkriterien:
→ [spec-120-route-schnitt-abrechnung-veranstaltung.md](../docs/specs/spec-120-route-schnitt-abrechnung-veranstaltung.md)

## Akzeptanzkriterien
<!-- Kanonisch in spec-120; hier gespiegelt (Bezug: Artefakt ADR-024, nicht Laufzeit). -->
**Route/Struktur (A):**
- [ ] Ziel-Layout für Basis-Benennung, Phasen-URLs, Verzeichnis-/Code-Schnitt,
      Actions-Schnitt, F7-Zugang konkret genug, dass F5 (#52) starten kann.
- [ ] Optionen A–E abgewogen; verworfene begründet abgelehnt (ADR *Alternatives*).
- [ ] F7-Erfassungsroute außerhalb des Auth-Gates; `proxy.ts`-Matcher-Konsequenz explizit
      (Negativ-Lookahead, eng gefasst, fail-closed, #63).
- [ ] Schnitt der Server Actions je Phase/Domäne festgelegt.
- [ ] Migrationspfad + stabile URLs benannt; keine Breaking-URL-Änderung ohne Begründung.

**Rolle (B):**
- [ ] `veranstalter` als Owner-Rolle festgelegt; Begründung gegen eigene Abrechner-Rolle (R1 vs. R0).
- [ ] Verlustfreier Enum-Migrationspfad (`ALTER TYPE user_role RENAME VALUE`), abgegrenzt vom
      #48-drop-and-recreate.
- [ ] spec-48, ADR-016 (ggf. „Superseded by ADR-024") und PROJECT-CONTEXT auf `veranstalter`
      aktualisiert; Phasen-Specs (52…55) auf das Zielbild verwiesen; ADR-Nr. 024 vergeben.

**Gemeinsam:**
- [ ] Kein Gold-Plating (YAGNI): nicht tiefer verschachtelt als F5–F8 es brauchen.

## Technische Notizen
<!-- Von /architecture befüllt -->
**Entscheidung: [ADR-024](../docs/adr/024-route-schnitt-veranstaltung-lifecycle.md) (Accepted, 2026-07-15).**

Kurzfassung des Zielbilds (Details + Alternativen im ADR):
- **D1** Bereich `app/abrechnung/veranstaltung/` → **`app/veranstaltung/`** (Liste `/veranstaltung`,
  Detail `/veranstaltung/[id]`). Supersedes die „Abrechner-Bereich"-Benennung aus ADR-023 D6.
- **D2** Jede Phase als **eigene Unterroute**: `[id]/verzehr` (F5), `[id]/auslagen` (F6),
  `[id]/kassieren` (F8); `[id]/page.tsx` = Übersicht. (Review 2026-07-15.)
- **D3** Code colocatet je Route-Segment; **einziger geteilter Teil** = Verzehr-Erfassung
  (von `[id]/verzehr` UND `theke/[token]`) → route-neutrales Modul **`app/_verzehr/`**
  (beide importieren gleichberechtigt). Auslagen/Kassieren bleiben in ihren Segmenten.
- **D4** Anlege-/Führen-Actions bleiben bei `app/veranstaltung/`; F5/F6/F8 je eigenes
  Action-Modul; Verzehr-Erfassung autorisiert per **Rolle ODER Abend-Token** (Detail in F5/F7).
- **D5** Keine Route Groups – Auth-Grenze bleibt am `proxy.ts`-Matcher (`theke/`-Ausnahme unverändert).
- **D6** Rolle **`abrechner` → `veranstalter`** (Owner des Lebenszyklus); `verwalter` unverändert.
  Amendment zu ADR-016.
- **D7** Migration `ALTER TYPE "user_role" RENAME VALUE` (in-place, verlustfrei), **nicht** #48-
  drop-and-recreate; von Hand geschrieben, lokal gegen Wegwerf-DB verifiziert.

**Respektierte Fundamente (ADR-023 D6/D7, nicht neu entschieden):** Data-Layer `db/veranstaltung.ts`;
öffentlicher Zugang `app/theke/[token]/` (Seam in `proxy.ts` bereits vorhanden) für datierte
Veranstaltungen **und** stehende Theke via `token`-Spalte.

**Befund:** keine Nav-/Deep-Links auf den Bereich (Home/AppHeader linkfrei; einzige interne
Verweise: Zurück-Link in `[id]/page.tsx` + Detail-Links der Liste) → Bereichs-Rename billig,
kein Redirect nötig.

**Scope #120 (nur was heute existiert):** Bereichs-Rename (D1: Move `app/abrechnung/veranstaltung`
→ `app/veranstaltung` + Link-Fix) und Rollen-Rename (D6/D7: Enum-Migration + Code + Tests + Doku-
Sync spec-48/ADR-016/PROJECT-CONTEXT). D2–D4 (Phasen-Unterrouten, `app/_verzehr/`) sind nur
Vorzeichnung für F5/F6/F8 – **nicht** in #120 als Stubs anlegen (YAGNI).

Nächster Schritt: **`/implement 120`** – Konsequenzen-Abschnitt des ADR ist die Arbeitsliste.

## Implementierungs-Notizen (/implement 120, 2026-07-15)

**Erledigt (Rolle B – D6/D7):**
- `db/schema.ts`: `pgEnum("user_role", ["verwalter","veranstalter"])`.
- Migration `db/migrations/0007_rename_abrechner_veranstalter.sql`: `ALTER TYPE ... RENAME VALUE`
  (in-place, verlustfrei); Snapshot `0007_snapshot.json` (`prevId` = 0006-id, Enum-Wert
  `veranstalter`) + `_journal.json` konsistent.
- Code: `requireRole/requireAnyRole/hasRole` in `actions.ts`, `page.tsx`, `[id]/page.tsx`,
  `StatusToggle.tsx`, `ZeileRow.tsx`, `labels.ts`, `db/seed.ts`, `db/teilnehmer.ts`,
  `db/veranstaltung.ts`, `lib/authz.ts` → `veranstalter`. Alle Tests mitgezogen (Test-Namen +
  `sessionWithRoles(["veranstalter"])`). **Pre-push-Gate grün: 183 passed / 27 skipped.**
- Doku-Sync: `spec-48` (Titel + Rollen), `ADR-016` (Amendment-Rückverweis auf ADR-024),
  `PROJECT-CONTEXT.md` (Rollen-Zeile + „Offene Architektur-Fragen"-Eintrag als erledigt markiert),
  Phasen-Specs `52/53/54/55` (Zielbild-Verweis auf ADR-024: Route + Rolle).

**Erledigt (Struktur A – D1, Datei-Ebene):** Links/Pfade bereits auf `/veranstaltung` gesetzt
(`LIST_PATH`, Zurück-Link, Detail-Links); Grep bestätigt: keine `@/app/abrechnung`-Imports, keine
`/abrechnung`-Referenzen in Code/e2e. `proxy.ts` braucht keinen Matcher-Eintrag (Default-Schutz, D5).

**Blocker [2026-07-15]: physischer Verzeichnis-Move + Migration-DB-Verify nicht ausführbar –
Berechtigungen dieser Session gaten mutierende Shell-Kommandos (`git mv`/`mv`, bare `pnpm`,
`pnpm db:up`).** Was der Mensch tun muss (Feature-Branch, Reihenfolge einhalten):
1. `git mv app/abrechnung/veranstaltung app/veranstaltung` (Verzeichnis hoch; leeres
   `app/abrechnung` wird durch `git mv` entfernt). Imports sind relativ/co-located → kein weiterer
   Fix nötig. Kein Redirect (keine externen Deep-Links).
2. Migration lokal gegen Wegwerf-DB verifizieren (`pnpm db:up` → 0000→0007 grün), da Prod-`roles`
   betroffen (ADR-024 Risiko, #48). In dieser Session keine DB verfügbar → offener Nachtest.
3. Gates: `bash scripts/checks/pre-push.sh` (nach dem Move erneut) + `pnpm lint`.
4. Committen/Pushen via `bash scripts/factory-commit.sh "<msg>"` (ADR-019).

**Label/Branch (aus Task-Beschreibung):** #120 enthält jetzt Code + pgEnum-Migration → Branch
`docs/…` + Label `documentation` vor dem Merge auf `enhancement` anpassen (mit dem Menschen klären).

## Offene Fragen
<!-- Input für /architecture 120, ausführlich in spec-120 -->
- Eigene URLs für Verzehr/Auslagen/Kassieren (Deep-Link) oder eine Detailseite mit Abschnitten?
- Basis-Route umbenennen (`/veranstaltung…`)? Falls ja: Redirect von der alten URL nötig?
- F7-Route: `app/abend/[token]/` (top-level, public) – Segmentname?
- Teilt F7 die F5-Komponenten (shared) ohne Auth-Kopplung?
- Route Groups `(auth)`/`(public)` oder genügt der `proxy.ts`-Matcher?

## Review-Findings
<!-- Wird durch /review befüllt -->
→ Inhalt: `tasks/review-120.md`

## Refactoring-Notizen (/refactor 120, 2026-07-15)

Kein neues Verhalten. Zwei Nitpicks aus dem Review-120 behoben:
- **ADR-024:196** `_fuehren/actions.ts` → `app/veranstaltung/actions.ts` (Pfad existiert weder
  heute noch im Zielbild; korrekter Ziel-Pfad nach D1-Move).
- **`db/migrations/meta/_journal.json`** Fehlendes Trailing-Newline ergänzt (kosmetisch).

Pre-Commit (Lint) grün. Tests konnten nicht lokal ausgeführt werden (Session-Berechtigung –
Blocker D1 + Migration-Verifikation durch den Menschen offen, s. Implementierungs-Notizen).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
→ Vollständiger Report: `tasks/codify-120.md`

Zwei neue Regeln in `docs/factory/PROJECT-CONTEXT.md` ergänzt:
1. **ALTER TYPE RENAME VALUE: Deploy-Reihenfolge** – Migration muss vor Code-Deploy laufen
   (Lockout-Risiko bei umgekehrter Reihenfolge; Ergänzung zum #48-Drizzle-Abschnitt).
2. **Branch-Typ/-Label bei Scope-Expansion korrigieren** – nach `/architecture` prüfen ob
   Branch-Typ noch passt; falls Code in Scope → vor `/implement` umbenennen + Label anpassen.

---
Branch: `docs/120-adr-frage-route-schnitt-abrechnung-veranstaltung`
Erstellt: 2026-07-15 21:09
