# Task 120: adr-frage-route-schnitt-abrechnung-veranstaltung

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
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

## Offene Fragen
<!-- Input für /architecture 120, ausführlich in spec-120 -->
- Eigene URLs für Verzehr/Auslagen/Kassieren (Deep-Link) oder eine Detailseite mit Abschnitten?
- Basis-Route umbenennen (`/veranstaltung…`)? Falls ja: Redirect von der alten URL nötig?
- F7-Route: `app/abend/[token]/` (top-level, public) – Segmentname?
- Teilt F7 die F5-Komponenten (shared) ohne Auth-Kopplung?
- Route Groups `(auth)`/`(public)` oder genügt der `proxy.ts`-Matcher?

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/120-adr-frage-route-schnitt-abrechnung-veranstaltung`
Erstellt: 2026-07-15 21:09
