# Task 135: verzehr-soft-deleted-artikel-korrigierbar

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Bug (#135): `listPositionen` joint `catalog_item` bewusst **ohne** `active`-Filter (damit die
Preisauflösung immer gelingt, ADR-025 D2). Deaktiviert der Verwalter einen bereits konsumierten
Artikel während eine Veranstaltung noch **offen** ist, entsteht eine Anzeige-/Korrektur-Inkonsistenz:
(1) `zeileSummen` zählt die Position weiter in den Header, (2) es gibt keine `MengeControl`-Zeile
mehr dafür (Kontrollen kommen aus `listActiveCatalog()`), (3) `adjustVerzehrAction` lehnt jede
Anpassung ab (Soft-Delete-Guard) → der Betrag ist unsichtbar **und** nicht mehr korrigierbar.

## Entscheidung (Fix-Ansatz)
**Sichtbar + voll korrigierbar** (Issue-Option a, erweitert – vom Menschen bestätigt):
- Der Betrag zählt **weiter** in die Summe (kein Under-Billing) und wird als eigene, sichtbare
  Zeile „Nicht mehr im Katalog" gerendert.
- Auf einer bereits konsumierten Position eines inaktiven Artikels funktionieren **beide** Deltas
  (`+1` **und** `−1`), solange die Veranstaltung `offen` ist – Korrigieren und Weiterzählen möglich.
- **Neue** Positionen auf einem inaktiven Artikel bleiben blockiert (Soft-Delete behält seinen Zweck):
  Anpassung ist nur erlaubt, wenn auf der Zeile bereits eine Position für diesen Artikel existiert.

## Akzeptanzkriterien
Kanonisch in [spec-135](../docs/specs/spec-135-verzehr-soft-deleted-artikel-korrigierbar.md).
- [x] AC1 – Position auf soft-gelöschtem Artikel wird als eigene, sichtbare Zeile dargestellt.
- [x] AC2 – Betrag zählt weiter in die Zeilensumme (kein Under-Billing).
- [x] AC3 – Menge verringern möglich (offene Veranstaltung), Klemmung bei 0 bleibt.
- [x] AC4 – Menge erhöhen möglich (offene Veranstaltung).
- [x] AC5 – Keine Neu-Erfassung ohne bestehende Position (Soft-Delete behält Zweck).
- [x] AC6 – Aktive Artikel unverändert (spec-52 AC1–AC7).
- [x] AC7 – Abgeschlossene Veranstaltung: Position sichtbar, nur lesend.
- [x] FS1 – Anpassung ohne bestehende Position → Ablehnung, kein Schreibvorgang.
- [x] FS2 – Anpassung bei abgeschlossener Veranstaltung → Ablehnung (statusunabhängig vom Artikel).

## Technische Notizen
Architektur-Entscheidung: [ADR-026](../docs/adr/026-verzehr-soft-geloeschter-artikel.md)
(ergänzt ADR-025 Handoff „soft-gelöschte Artikel"). Kernentscheidung: **sichtbar + korrigierbar**,
Betrag zählt weiter (kein Under-Billing); Neu-Erfassung auf inaktivem Artikel bleibt blockiert.

- `db/verzehr.ts`: `VerzehrPositionRow` um `active: boolean`; `listPositionen`-select um
  `active: catalogItems.active`. Neu: `getPosition(zeileId, catalogItemId): Promise<VerzehrPosition | undefined>`
  (Existenz-Check, Codify #50).
- `app/veranstaltung/actions.ts` `adjustVerzehrAction` Schritt 5 (ADR-026 D2): `!item` → `ITEM_NOT_FOUND`;
  `item.active` → erlaubt; `!item.active` → nur erlaubt wenn `getPosition(...)` existiert. Reihenfolge
  (Role → Zod → Status → IDOR → Item/Position → Persist) unverändert fail-closed.
- `app/_verzehr/VerzehrErfassung.tsx`: je Zeile Abschnitt für `positionen.filter(p => !p.active && p.menge > 0)`
  mit `MengeControl` (`editable`-gesteuert). `summen.ts` **unverändert** (ADR-026 D4).
- Keine Schema-/Migrations-Änderung (`active` ist additive Lese-Spalte).

## Offene Fragen
_Keine._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
Voller Report: [codify-135.md](codify-135.md). Keine neuen Regeln – Review (APPROVED) und
Security-Review (PASSED) hatten keine kritischen/wichtigen Findings; die vorhandenen
Codify-Regeln (#50, #51, #52, #116/#117) griffen bereits korrekt. Beobachtung für später:
Das versuchsweise `tier: light`/Sonnet-5-Setup für `/implement` (`factory.config.yml`,
Commit `4104454`) lief für diesen eng geschnittenen Fix sauber durch – Ausgang im
Projekt-Memory `implement-sonnet5-tier-trial` festgehalten, Entscheidung über projektweite
Umstellung noch offen (Stichprobengröße 1).

## Refactoring-Notizen
`/review` (APPROVED, keine kritischen/wichtigen Findings) diente als Basis. Duplizierte JSX
zwischen der Kategorie-Schleife und dem neuen „Nicht mehr im Katalog"-Abschnitt in
`app/_verzehr/VerzehrErfassung.tsx` (identische `<li>`-Struktur: Name · Preis + `MengeControl`)
in die Komponente `PositionZeile` extrahiert – kein neues Verhalten, alle Tests weiterhin grün
(64 Unit-Tests dieser Task, 258 Gesamt-Suite). `db/verzehr.ts` und `app/veranstaltung/actions.ts`
ohne Änderungsbedarf (Guard-Reihenfolge, Naming, Kommentare bereits clean).

---
Branch: `fix/135-verzehr-soft-deleted-artikel-korrigierbar`
Erstellt: 2026-07-17 18:01
