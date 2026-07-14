# Spec: Getränke-Katalog & Preise verwalten

> Feature F2 · Issue #49 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Die Getränke-Summe eines Teilnehmers entsteht aus Menge × Preis je Artikel. Die
Preisliste (heute fest im Excel) soll pflegbar sein, weil sich Preise und Sortiment
gelegentlich ändern. Nur der Verwalter pflegt den Katalog.

## Scope

**Inbegriffen:**
- Katalog-Artikel anlegen, bearbeiten, deaktivieren **und wieder aktivieren** (nie hart löschen).
- Felder je Artikel: Bezeichnung, **Größe (optional**, z. B. „0,5 l"), Preis in EUR,
  Kategorie (`getraenk` | `kaffee`), Sortierreihenfolge, aktiv/inaktiv.
- Preise in EUR mit genau **2 Nachkommastellen**.
- **Kaffee**: Artikel der Kategorie `kaffee` mit **festem** Preis. **Mehrere** Kaffee-Artikel
  sind erlaubt (z. B. Kaffee, Cappuccino, Espresso) – jeder mit eigenem festen Preis.
- **Initialer Datenbestand:** Die Referenz-Preisliste aus dem Excel-Template
  (Stand 2026-04-28, siehe [README-montagsrunde](README-montagsrunde.md)) wird als
  Startbestand **geseedet**; der Verwalter kann sie danach frei anpassen.
- **Essen** ist **nicht** hier – dessen Preis wird pro Abend gesetzt (F4).

**Nicht inbegriffen:**
- Preis-Historie / zeitliche Gültigkeit von Preisen.
- Unterschiedliche Preise je Veranstaltungstyp (Backlog #59).
- Bestands-/Lagerverwaltung.

## Akzeptanzkriterien

- [ ] GIVEN ein angemeldeter Verwalter WHEN er einen Artikel mit Bezeichnung und
      Preis (Größe optional) anlegt THEN erscheint der Artikel im Katalog und ist für
      neue Abende auswählbar.
- [ ] GIVEN ein bestehender Artikel WHEN der Verwalter den Preis ändert THEN gilt der
      neue Preis für **künftige** Erfassungen; bereits **abgeschlossene** Abende bleiben
      unverändert (der zum Erfassungszeitpunkt gültige Preis zählt).
- [ ] GIVEN ein Artikel, der nicht mehr angeboten wird WHEN der Verwalter ihn
      deaktiviert THEN ist er in neuen Abenden nicht mehr wählbar, bleibt aber in alten
      Abrechnungen erhalten.
- [ ] GIVEN ein deaktivierter Artikel WHEN der Verwalter ihn wieder aktiviert THEN ist er
      in neuen Abenden erneut auswählbar.
- [ ] GIVEN mehrere Artikel der Kategorie `kaffee` WHEN der Verwalter sie anlegt THEN sind
      alle als eigene Artikel mit je eigenem festen Preis gültig (kein Ein-Kaffee-Limit).
- [ ] GIVEN eine Preiseingabe WHEN sie kein gültiger EUR-Betrag ≥ 0 mit ≤ 2
      Nachkommastellen ist THEN wird sie serverseitig (Zod) abgelehnt.
- [ ] GIVEN ein frisch initialisiertes System WHEN der Katalog erstmals geöffnet wird THEN
      enthält er die geseedete Referenz-Preisliste aus dem Excel-Template.
- [ ] GIVEN ein angemeldeter Abrechner (ohne Verwalter-Rolle) WHEN er den Katalog
      bearbeiten will THEN wird die Aktion serverseitig abgelehnt (siehe F1).

## Fehlerszenarien

- [ ] Doppelte Kombination Bezeichnung+Größe → Hinweis, kein stiller Duplikat-Eintrag
      (leere Größe zählt als eigener Wert; ein zweiter „Kaffee" ohne Größe kollidiert mit
      dem ersten „Kaffee" ohne Größe).
- [ ] Ungültiger/negativer Preis → Validierungsfehler an der Server-Grenze.
- [ ] Deaktivieren eines Artikels, der in einem **laufenden** (offenen) Abend verwendet
      wird → Artikel bleibt in diesem Abend nutzbar, wird nur für neue Abende gesperrt.

## Gesetzte Entscheidungen

**2026-07-11**
- **Maßgeblich ist der zum Erfassungszeitpunkt gültige Preis.** Abgeschlossene Abende
  bleiben von späteren Preisänderungen unberührt.

**2026-07-13 (Requirements-Schärfung F2)**
- **Mehrere Kaffee-Artikel** erlaubt (nicht auf genau einen begrenzt).
- **Referenz-Preisliste wird initial geseedet** (Startbestand aus dem Excel-Template).
- **Größe ist optional** (Kaffee hat keine Größe); Duplikat-Prüfung über Bezeichnung+Größe.
- **Deaktivieren ist reversibel** (Wiederaktivieren möglich); kein hartes Löschen.

## Architektur-Entscheidungen (2026-07-13, /architecture)

- **Geld = Integer-Cent** ([ADR-021](../adr/021-geldbetraege-integer-cent.md)):
  `price_cents integer`, Umrechnung/Formatierung zentral in `lib/money.ts`.
- **Preis-„Einfrieren": Snapshot pro erfasster Position.** In F5 wird der Stückpreis in die
  Verzehr-Zeile kopiert; Katalog-Änderungen berühren historische Zeilen nie. Keine
  Preis-Historientabelle. **Verbindliche Modellierung erst in F5 (#52)** – F2 baut es nicht.
- **Seeding der Referenzliste = idempotente Daten-Migration** (`ON CONFLICT DO NOTHING`),
  nicht das `db/seed.ts`-Skript – läuft automatisch im Deploy-Gate, in allen Umgebungen
  präsent. Details + Datenmodell (`catalog_item`) in der Task-Datei.
