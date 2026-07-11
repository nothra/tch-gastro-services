# Spec: Getränke-Katalog & Preise verwalten

> Feature F2 · Issue #49 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Die Getränke-Summe eines Teilnehmers entsteht aus Menge × Preis je Artikel. Die
Preisliste (heute fest im Excel) soll pflegbar sein, weil sich Preise und Sortiment
gelegentlich ändern. Nur der Verwalter pflegt den Katalog.

## Scope

**Inbegriffen:**
- Katalog-Artikel anlegen, bearbeiten, deaktivieren (nicht hart löschen).
- Felder je Artikel: Bezeichnung, Größe (z. B. „0,5 l"), Preis in EUR, Kategorie
  (`getraenk` | `kaffee`), Sortierreihenfolge, aktiv/inaktiv.
- Preise in EUR mit genau **2 Nachkommastellen**.
- **Kaffee** ist ein Katalog-Artikel mit **festem** Preis (Kategorie `kaffee`).
- **Essen** ist **nicht** hier – dessen Preis wird pro Abend gesetzt (F4).

**Nicht inbegriffen:**
- Preis-Historie / zeitliche Gültigkeit von Preisen.
- Unterschiedliche Preise je Veranstaltungstyp (Backlog #59).
- Bestands-/Lagerverwaltung.

## Akzeptanzkriterien

- [ ] GIVEN ein angemeldeter Verwalter WHEN er einen Artikel mit Bezeichnung, Größe und
      Preis anlegt THEN erscheint der Artikel im Katalog und ist für neue Abende
      auswählbar.
- [ ] GIVEN ein bestehender Artikel WHEN der Verwalter den Preis ändert THEN gilt der
      neue Preis für **künftige** Erfassungen; bereits **abgeschlossene** Abende bleiben
      unverändert (der zum Erfassungszeitpunkt gültige Preis zählt).
- [ ] GIVEN ein Artikel, der nicht mehr angeboten wird WHEN der Verwalter ihn
      deaktiviert THEN ist er in neuen Abenden nicht mehr wählbar, bleibt aber in alten
      Abrechnungen erhalten.
- [ ] GIVEN eine Preiseingabe WHEN sie kein gültiger EUR-Betrag ≥ 0 mit ≤ 2
      Nachkommastellen ist THEN wird sie serverseitig (Zod) abgelehnt.
- [ ] GIVEN ein angemeldeter Abrechner (ohne Verwalter-Rolle) WHEN er den Katalog
      bearbeiten will THEN wird die Aktion serverseitig abgelehnt (siehe F1).

## Fehlerszenarien

- [ ] Doppelte Bezeichnung+Größe → Hinweis, kein stiller Duplikat-Eintrag.
- [ ] Ungültiger/negativer Preis → Validierungsfehler an der Server-Grenze.
- [ ] Deaktivieren eines Artikels, der in einem **laufenden** (offenen) Abend verwendet
      wird → Artikel bleibt in diesem Abend nutzbar, wird nur für neue Abende gesperrt.

## Gesetzte Entscheidungen (2026-07-11)

- **Maßgeblich ist der zum Erfassungszeitpunkt gültige Preis.** Abgeschlossene Abende
  bleiben von späteren Preisänderungen unberührt.

## Offene Fragen (für /architecture)

- [ ] Umsetzung des Preis-„Einfrierens": Snapshot pro erfasster Position oder pro Abend?
      → Datenmodell-Entscheidung in /architecture.
