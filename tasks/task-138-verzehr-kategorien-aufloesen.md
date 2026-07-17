# Task 138: verzehr-kategorien-aufloesen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
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
- [ ] AC-1: `zeileSummen` liefert `{ getraenkeCents, essenCents, kaffeeCents }` (kein `sonstigeCents`).
- [ ] AC-2: Nur `essen`-Positionen → `essenCents` gesetzt, `getraenkeCents` = `kaffeeCents` = 0.
- [ ] AC-3: Nur `kaffee`-Positionen → `kaffeeCents` gesetzt, `getraenkeCents` = `essenCents` = 0.
- [ ] AC-4: Zusammenfassung zeigt Getränke, Essen und Kaffee (Reihenfolge) mit `formatCents`.
- [ ] AC-5: Getränke-only-Zeile zeigt trotzdem alle drei; Essen/Kaffee mit `0,00 €`.
- [ ] AC-6: `Verzehr-Gesamt = getraenkeCents + essenCents + kaffeeCents`; Kassier-/Spenden-Logik unverändert.
- [ ] Fehlerfälle: leere Positionsliste → alle 0; `menge = 0` trägt 0 Cent bei.
- [ ] Unit-Tests (`summen.test.ts`) decken alle drei Kategorien einzeln ab; Component-Test prüft die drei Beträge.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Betroffen: `app/_verzehr/summen.ts` (+`.test.ts`), `app/_verzehr/VerzehrErfassung.tsx` (~Z.86, +`.test.tsx`).
- Vor Umbau Konsumenten prüfen: `grep -rn "sonstigeCents\|zeileSummen" app/ db/ lib/` (AC-6).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/138-verzehr-kategorien-aufloesen`
Erstellt: 2026-07-17 22:11
