# Task 138: verzehr-kategorien-aufloesen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Auf der Seite **Verzehr erfassen** die Zeilen-Zusammenfassung von zwei Beträgen
(`Getränke · Sonstige`) auf **drei** getrennte Kategorien auflösen: **Getränke**, **Essen**,
**Kaffee**. Der Sammel-Topf `sonstigeCents` in `app/_verzehr/summen.ts` entfällt zugunsten
getrennter `essenCents` / `kaffeeCents`.

Spec: [docs/specs/spec-138-verzehr-kategorien-aufloesen.md](../docs/specs/spec-138-verzehr-kategorien-aufloesen.md)

**Design-Entscheidungen (geklärt in /requirements):**
- Alle drei Kategorien werden **immer** angezeigt, auch bei 0,00 €.
- Reihenfolge in der Zusammenfassung: **Getränke · Essen · Kaffee** (wie `CATEGORY_ORDER`).

## Akzeptanzkriterien
- [x] AC-1: `zeileSummen` liefert `{ getraenkeCents, essenCents, kaffeeCents }` (kein `sonstigeCents`).
- [x] AC-2: Nur `essen`-Positionen → `essenCents` gesetzt, `getraenkeCents` = `kaffeeCents` = 0.
- [x] AC-3: Nur `kaffee`-Positionen → `kaffeeCents` gesetzt, `getraenkeCents` = `essenCents` = 0.
- [x] AC-4: Zusammenfassung zeigt Getränke, Essen und Kaffee (Reihenfolge) mit `formatCents`.
- [x] AC-5: Getränke-only-Zeile zeigt trotzdem alle drei; Essen/Kaffee mit `0,00 €`.
- [x] AC-6: `Verzehr-Gesamt = getraenkeCents + essenCents + kaffeeCents`; Kassier-/Spenden-Logik unverändert.
- [x] Fehlerfälle: leere Positionsliste → alle 0; `menge = 0` trägt 0 Cent bei.
- [x] Unit-Tests (`summen.test.ts`) decken alle drei Kategorien einzeln ab; Component-Test prüft die drei Beträge.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
**Architektur-Entscheidung:** [ADR-027](../docs/adr/027-verzehr-summen-drei-kategorien.md) –
präzisiert die „Getränke/Sonstige"-Lese-Gruppierung aus ADR-025 zu **drei** Kategorien
(fokussierte Refinement-ADR, analog ADR-026; Cross-Ref in ADR-025 nachgetragen).

**Konsumenten-Check (durchgeführt):** `grep -rn "sonstigeCents\|zeileSummen\|ZeileSummen" app/ db/ lib/`
→ **nur** in `app/_verzehr/` (summen.ts, summen.test.ts, VerzehrErfassung.tsx). Kein externer
Konsument → AC-6 (Kassier-/Spenden-Logik unberührt) bestätigt.

**Umsetzung (TDD, Red → Green), nur `app/_verzehr/`:**
1. `summen.ts`: `ZeileSummen` → `{ getraenkeCents, essenCents, kaffeeCents }`; `else`-Zweig durch
   explizites Kategorie-Mapping ersetzen; kein `sonstigeCents`. Modul-Kommentar (Z.3–5) angleichen.
2. `summen.test.ts`: `sonstigeCents`-Assertions auf `essenCents`/`kaffeeCents` umstellen; je Kategorie
   ein Test; Leer-/`menge=0`-Fall auf drei Felder.
3. `VerzehrErfassung.tsx` (~Z.86): drei Beträge **Getränke · Essen · Kaffee** (Reihenfolge wie
   `CATEGORY_ORDER`), alle drei immer zeigen. Veralteten Kommentar Z.21 angleichen.
4. `VerzehrErfassung.test.tsx`: Component-Test für alle drei Beträge (AC-4) + Getränke-only-Zeile
   mit `0,00 €` (AC-5).

**Nicht anfassen:** `db/`, Actions, Migrationen, Erfassungs-Sektionen, Abschnitt „Nicht mehr im
Katalog" (ADR-026), Kassier-/Spenden-Logik.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
Aus `tasks/review-138.md` (APPROVED, keine kritischen/wichtigen Findings). Beide Nitpicks im
Refactoring-Pass behoben:
- [x] `summen.ts`: `kaffee`-Zweig jetzt explizit (`else if (position.category === "kaffee")`)
  statt implizitem `else`, plus Exhaustiveness-Guard (`const _exhaustive: never = ...`) – eine
  künftige vierte Katalog-Kategorie fällt jetzt als Compile-Fehler auf statt still als Kaffee zu
  zählen.
- [x] `VerzehrErfassung.test.tsx`: `should_showEssenFormatted`/`should_showKaffeeFormatted`
  binden den Betrag jetzt an das Label (`/Essen\s*17,80\s*€/`, `/Kaffee\s*3,00\s*€/`) statt lose
  auf den Betrag allein zu matchen.

Kein neues Verhalten; alle 23 Tests vor und nach dem Refactoring grün.

## Test-Vervollständigung (/test)
Coverage-Lücke nach dem Refactoring-Pass gefunden: Der neu explizit gemachte Exhaustiveness-
Guard (`summen.ts:36-37`, `const _exhaustive: never = ...; throw new Error(...)`) war
ungetestet (0/2 Zeilen). Ergänzt: `should_throw_when_categoryIsUnknown` in `summen.test.ts`
(erzwingt eine ungültige Kategorie per Type-Cast, prüft den Fehlertext). Kein Produktionscode
geändert. `app/_verzehr` jetzt 100 % Statements/Branches/Funcs/Lines. Gesamt-Suite: 261/261
Tests grün (34 Dateien, 4 bewusst geskippt).

## Codify-Notizen
Voller Report: [tasks/codify-138.md](codify-138.md).

Einzige Lücke im Zyklus: Der im Refactoring-Pass explizit gemachte Exhaustiveness-Guard
(`const _exhaustive: never`, `summen.ts:36-37`) wurde erst in `/test` als ungetestet erkannt,
nicht schon in `/review`/`/security-review`. Neue universelle Regel dazu ergänzt in
`docs/factory/guidelines/testing-standards.md` (Exhaustiveness-Guards brauchen einen eigenen
Test). Review und Security-Review sonst ohne Findings (APPROVED / PASSED).

---
Branch: `feature/138-verzehr-kategorien-aufloesen`
Erstellt: 2026-07-17 22:11
