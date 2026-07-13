# Task 49: getraenke-katalog-preise

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Feature **F2** des Epics „Digitale Veranstaltungs-Abrechnung": Der **Verwalter** pflegt
den Getränke-Katalog (Bezeichnung, optionale Größe, Preis, Kategorie `getraenk`/`kaffee`,
Sortierung, aktiv/inaktiv). Grundlage für die automatische Getränke-Summe (F5). Kaffee
ist Katalog-Artikel mit festem Preis (mehrere erlaubt); Essen gehört **nicht** hierher
(pro Abend in F4). Preise in EUR mit genau 2 Nachkommastellen, serverseitig (Zod)
validiert. Artikel werden nie hart gelöscht, sondern deaktiviert/wieder aktiviert. Die
Excel-Referenzpreisliste wird initial geseedet.

Kanonische Spec: [spec-49-getraenke-katalog.md](../docs/specs/spec-49-getraenke-katalog.md).
Hängt ab von F1 (#48 Login & Rollen).

## Akzeptanzkriterien
<!-- Gespiegelt aus docs/specs/spec-49-getraenke-katalog.md -->
- [ ] Verwalter legt Artikel (Bezeichnung + Preis, Größe optional) an → erscheint im Katalog, für neue Abende wählbar.
- [ ] Preisänderung gilt für künftige Erfassungen; abgeschlossene Abende bleiben unverändert.
- [ ] Deaktivierter Artikel ist in neuen Abenden nicht mehr wählbar, bleibt in alten Abrechnungen erhalten.
- [ ] Deaktivierter Artikel kann wieder aktiviert werden.
- [ ] Mehrere Artikel der Kategorie `kaffee` sind erlaubt (kein Ein-Kaffee-Limit).
- [ ] Ungültiger Preis (kein EUR ≥ 0 mit ≤ 2 Nachkommastellen) wird serverseitig (Zod) abgelehnt.
- [ ] Frisch initialisiertes System enthält die geseedete Excel-Referenzpreisliste.
- [ ] Abrechner ohne Verwalter-Rolle wird beim Katalog-Bearbeiten serverseitig abgelehnt (F1).
- [ ] Fehlerfall: doppelte Bezeichnung+Größe → Hinweis, kein stiller Duplikat.
- [ ] Fehlerfall: Deaktivieren eines in offenem Abend genutzten Artikels → bleibt dort nutzbar, nur für neue Abende gesperrt.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Offen für /architecture: Preis-„Einfrieren" (Snapshot pro Position vs. pro Abend);
Seeding-Mechanik (Migration/Seed-Skript vs. idempotenter App-Start).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/49-getraenke-katalog-preise`
Erstellt: 2026-07-13 18:40
