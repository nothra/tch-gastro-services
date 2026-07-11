# Spec: Veranstaltung/Abend anlegen & führen

> Feature F4 · Issue #51 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Jeder Abrechnungsvorgang bezieht sich auf **einen Abend** (eine Veranstaltung). Der
Abrechner legt den Abend an, bestimmt den **Essenpreis** dieses Abends, wählt die
**Kasse**, gegen die abgerechnet wird, und die teilnehmenden Personen/Familien aus den
Stammdaten. Der Abend ist die Klammer um alle Erfassungen (F5–F8).

**Kassen:** Veranstaltungen werden über **unterschiedliche Kassen** abgerechnet – die
Montagsrunde über ihre **eigene Kasse**, andere Veranstaltungen (z. B. Dorfmeisterschaften)
über die **Vereinskasse**. Im MVP ist die Kasse ein **fester Satz**
(`montagsrunde` | `vereinskasse`), nicht pflegbar.

## Scope

**Inbegriffen:**
- Abend anlegen mit Datum und Bezeichnung (z. B. „Montagsrunde").
- **Kasse des Abends** wählen (fester Satz: `montagsrunde` | `vereinskasse`).
- **Essenpreis des Abends** festlegen (i. d. R. 6 €, teurer auch 7 €).
- Teilnehmer aus den Stammdaten (F3) für diesen Abend auswählen → je Teilnehmer eine
  Abrechnungszeile.
- Während der Abend **offen** ist: Teilnehmer nachträglich hinzufügen/entfernen.
- Status des Abends: `offen` → `abgeschlossen` (Abschluss in F8).

**Nicht inbegriffen:**
- Wiederkehrende Serie/Vorlage mit vorbelegten Teilnehmern (Backlog #60).
- Preis-Templates je Veranstaltungstyp (Backlog #59).
- Mehrere gleichzeitig offene Abende sind zwar möglich, aber kein Fokus im MVP.

## Akzeptanzkriterien

- [ ] GIVEN ein angemeldeter Abrechner WHEN er einen Abend mit Datum, Bezeichnung, Kasse
      und Essenpreis anlegt THEN wird ein Abend im Status `offen` erstellt.
- [ ] GIVEN das Anlegen eines Abends WHEN keine Kasse gewählt ist THEN wird das Speichern
      serverseitig abgelehnt (Kasse ist Pflicht); die zugeordnete Kasse bestimmt, wohin
      Einnahmen und Auslagenerstattungen dieses Abends wirken (F6/F8).
- [ ] GIVEN ein offener Abend WHEN der Abrechner Teilnehmer aus den Stammdaten auswählt
      THEN entsteht je ausgewähltem Teilnehmer genau eine Abrechnungszeile mit leeren
      Positionen.
- [ ] GIVEN ein offener Abend WHEN der Abrechner einen weiteren Teilnehmer hinzufügt oder
      einen (noch ohne Erfassung) wieder entfernt THEN wird die Zeile ergänzt/entfernt.
- [ ] GIVEN ein offener Abend mit einem gesetzten Essenpreis WHEN eine Essen-Position
      erfasst wird (F5) THEN rechnet sie mit **diesem** Essenpreis.
- [ ] GIVEN ein Teilnehmer, der bereits erfasste Positionen hat WHEN versucht wird, ihn
      aus dem Abend zu entfernen THEN wird das verhindert oder erfordert eine bewusste
      Bestätigung (kein Datenverlust aus Versehen).
- [ ] GIVEN ein offener Abend WHEN der **Abrechner** einen Walk-in (neuen Teilnehmer)
      anlegt THEN wird dieser in die Stammdaten übernommen und erhält im Abend eine Zeile
      (siehe F3).
- [ ] GIVEN ein `abgeschlossener` Abend WHEN jemand ihn bearbeiten will THEN ist er
      schreibgeschützt; ein **Abrechner** kann ihn aber wieder öffnen (protokolliert,
      siehe F8), danach sind Änderungen erneut möglich.

## Fehlerszenarien

- [ ] Essenpreis fehlt oder ist kein gültiger EUR-Betrag ≥ 0 → serverseitige Ablehnung.
- [ ] Abend ohne jeden Teilnehmer → anlegbar (Teilnehmer kommen später dazu), aber
      Abschluss (F8) eines komplett leeren Abends erfordert Bestätigung.
- [ ] Datum in der Zukunft/Vergangenheit → erlaubt (Nacherfassung möglich).

## Gesetzte Entscheidungen (2026-07-11)

- **Kasse je Abend, fester Satz** (`montagsrunde` | `vereinskasse`), Pflichtfeld, nicht
  pflegbar im MVP. Ein **laufender Kassenstand** über mehrere Abende bleibt Backlog #57 –
  im MVP wird nur die **Kassenveränderung je Abend** ausgewiesen (F8).
- **Essenpreis gilt abendweit einheitlich.** Wird er im offenen Abend geändert, wirkt die
  Änderung auf **alle** Essen dieses Abends (nicht nur auf künftige).
- **Kaffeepreis** ist im MVP der feste Katalogpreis (F2), **nicht** pro Abend abweichend
  (abweichende Preise je Veranstaltungstyp: Backlog #59).
- **Wiederöffnen:** ein abgeschlossener Abend kann durch einen **Abrechner** wieder
  geöffnet werden (Details F8).

## Zusätzliche Akzeptanzkriterien

- [ ] GIVEN ein offener Abend mit bereits erfassten Essen WHEN der Essenpreis geändert
      wird THEN werden alle Essen-Anteile des Abends mit dem neuen Preis berechnet.

## Offene Fragen

- [ ] Keine offenen Produktfragen mehr. (Mehrere gleichzeitig offene Abende, Datenmodell
      → /architecture.)
