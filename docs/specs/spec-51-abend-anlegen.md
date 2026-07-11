# Spec: Veranstaltung/Abend anlegen & führen

> Feature F4 · Issue #51 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Jeder Abrechnungsvorgang bezieht sich auf **einen Abend** (eine Veranstaltung). Der
Abrechner legt den Abend an, bestimmt den **Essenpreis** dieses Abends und wählt die
teilnehmenden Personen/Familien aus den Stammdaten. Der Abend ist die Klammer um alle
Erfassungen (F5–F8).

## Scope

**Inbegriffen:**
- Abend anlegen mit Datum und Bezeichnung (z. B. „Montagsrunde").
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

- [ ] GIVEN ein angemeldeter Abrechner WHEN er einen Abend mit Datum, Bezeichnung und
      Essenpreis anlegt THEN wird ein Abend im Status `offen` erstellt.
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
- [ ] GIVEN ein `abgeschlossener` Abend WHEN jemand ihn bearbeiten will THEN ist er
      schreibgeschützt (Änderungen nur nach erneutem Öffnen durch berechtigte Rolle –
      Detail siehe F8 offene Fragen).

## Fehlerszenarien

- [ ] Essenpreis fehlt oder ist kein gültiger EUR-Betrag ≥ 0 → serverseitige Ablehnung.
- [ ] Abend ohne jeden Teilnehmer → anlegbar (Teilnehmer kommen später dazu), aber
      Abschluss (F8) eines komplett leeren Abends erfordert Bestätigung.
- [ ] Datum in der Zukunft/Vergangenheit → erlaubt (Nacherfassung möglich).

## Offene Fragen

- [ ] Darf der Essenpreis nach ersten Erfassungen noch geändert werden, und gilt er dann
      rückwirkend für schon erfasste Essen? (Annahme: Änderung wirkt auf alle Essen des
      Abends, da abendweit einheitlich.) → bestätigen.
- [ ] Kann der Kaffeepreis pro Abend abweichen? Im MVP **nein** (fester Katalogpreis,
      F2); abweichende Preise je Veranstaltungstyp sind Backlog #59.
