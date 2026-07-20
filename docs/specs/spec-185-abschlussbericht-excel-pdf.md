# Spec: Abschlussbericht für abgeschlossene Veranstaltung (Excel + PDF)

> Issue #185 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> Baut auf F8 (#55, [spec-55](spec-55-kassieren-abschluss.md), [ADR-033](../adr/033-kassieren-abschluss-datenmodell.md))
> und F6 (#53, [spec-53](spec-53-auslagen.md), ADR-028) auf.

## Kontext

Für eine **abgeschlossene** Veranstaltung soll der Veranstalter einen **Abschlussbericht**
als Datei erzeugen und herunterladen können. Der Bericht bildet die Abrechnung so ab, wie sie
ursprünglich im Excel-Template „Abrechnung Veranstaltung" (Striche-Erfassung je Teilnehmer)
dargestellt war – die Vorlage, die die App abgelöst hat (siehe
[README-montagsrunde](README-montagsrunde.md)). So erhält der Thekenwart ein vertrautes,
exportier- und archivierbares Abrechnungsdokument je Veranstaltung.

**Werte folgen den geltenden Domänenregeln, nicht der alten Excel-Formel:**
- `Verzehr-Gesamt = Σ Getränke (Theke) + Σ Sonstige (Essen + Kaffee)`
- `Spende = Erhalten − Verzehr-Gesamt` (nur positiver Überschuss)
- **Auslagen mindern den Verzehr nicht** (bewusste Abweichung vom Excel `V = T + Q − U`);
  die Auslagenerstattung ist ein eigener Vorgang (F6) und erscheint **nicht** in den
  Teilnehmerzeilen, sondern separat.

**Reproduzierbarkeit statt Snapshot:** Bei Abschluss werden die Einzelpreise je Position per
`einzelpreis_cents` eingefroren (ADR-033 D2). Die Zahlen einer abgeschlossenen Veranstaltung
sind damit stabil und aus den bestehenden Daten deterministisch reproduzierbar – ein separater
Bericht-Snapshot ist fachlich nicht erforderlich.

## Scope

**Inbegriffen:**
- Abschlussbericht **nur für Veranstaltungen im Status `abgeschlossen`** erzeugbar.
- **Zwei Ausgabeformate** in dieser Task: **Excel (`.xlsx`)** und **PDF** – inhaltsgleich.
- Abruf/Download aus der authentifizierten Veranstaltungs-Detailansicht; **nur Rolle
  `veranstalter`**, serverseitig durchgesetzt.
- Bericht-Aufbau (Reihenfolge):
  1. **Kopf:** Bezeichnung, Datum, Kasse (`Montagsrunde` | `Vereinskasse`), Status.
  2. **Teilnehmertabelle mit Pro-Artikel-Strichen:** je Teilnehmer/Familie die tatsächlich
     konsumierten Artikel mit Menge (Strichzahl) und Zeilenbetrag (`Menge × Einzelpreis`,
     eingefrorener Preis), dazu die Kategorie-Summen (`Getränke`, `Sonstige` = Essen + Kaffee),
     `Verzehr-Gesamt`, `Erhalten`, `Spende`. **Keine** Auslagen in den Teilnehmerzeilen.
  3. **Tagessummen:** Σ Getränke, Σ Sonstige, Σ Verzehr-Gesamt, Σ Erhalten, Σ Spende über alle
     Teilnehmer.
  4. **Auslagenerstattungen (separater Abschnitt, Einzelnachweis):** je Auslage eine Zeile mit
     Teilnehmer, Kategorie (Getränke/Essen/Sonstiges), Betrag und Status (offen/erstattet).
  5. **Gesamtabrechnung (Kasse):**
     - **Verzehr-Umsatz je Kategorie:** Σ Getränke, Σ Essen, Σ Kaffee.
     - **Σ Spende** separat ausgewiesen (Verzehr-Umsatz + Spende = Σ Erhalten = Einnahmen).
     - **Auslagenerstattung je Kategorie** (Getränke/Essen/Sonstiges) und gesamt (nur
       erstattete Beträge).
     - **Kassenveränderung** = Σ Erhalten − Σ Auslagenerstattungen (erstattet), für die
       zugeordnete Kasse.
- Alle Beträge in EUR mit 2 Nachkommastellen, de-DE-Format (Komma), konsistent zu `formatCents`.
- Berechnungen folgen den bestehenden reinen Summen-Funktionen (`zeileSummen`, `kassierZeilen`,
  `kassierTagessummen`, `gesamtabrechnung`, `auslagenSummen`) als Single Source – kein zweiter
  Wahrheitspfad.

**Nicht inbegriffen:**
- **Kein Protokoll-Abschnitt** (Abschluss/Wiederöffnen-Ereignisse) im Bericht.
- Kein Bericht für **offene** Veranstaltungen oder die stehende Theke.
- Keine serverseitige **Persistenz/Archivierung** des Berichts (On-demand-Download); ein
  Ablage-/Historien-Konzept ist nicht Teil dieser Task.
- Keine Auslagen-Verrechnung in den Teilnehmerzeilen (Domänenregel, s. o.).
- Kein laufender Kassen-Saldo über mehrere Veranstaltungen (Backlog #57).
- Kein E-Mail-Versand / kein automatischer Export.

## Akzeptanzkriterien

- [ ] **AC1** GIVEN eine Veranstaltung im Status `abgeschlossen` WHEN ein `veranstalter` in der
      Detailansicht den Abschlussbericht abruft THEN wird sowohl ein Excel- (`.xlsx`) als auch
      ein PDF-Download angeboten und erfolgreich erzeugt.
- [ ] **AC2** GIVEN eine Veranstaltung im Status `offen` WHEN ein Bericht angefordert wird THEN
      wird die Erzeugung **serverseitig abgelehnt** (fail-closed); kein Bericht offener
      Veranstaltungen.
- [ ] **AC3** GIVEN eine angemeldete Person **ohne** Veranstalter-Rolle (z. B. `verwalter`)
      WHEN sie den Bericht anfordert THEN wird der Zugriff **serverseitig abgelehnt**.
- [ ] **AC4** GIVEN eine abgeschlossene Veranstaltung mit erfasstem Verzehr WHEN der Bericht
      erzeugt wird THEN enthält jede Teilnehmerzeile die konsumierten Artikel mit **Menge**
      (Strichzahl) und Zeilenbetrag (`Menge × eingefrorener Einzelpreis`).
- [ ] **AC5** GIVEN eine Teilnehmerzeile WHEN ihre Summen gebildet werden THEN gilt
      `Verzehr-Gesamt = Σ Getränke + Σ Sonstige (Essen + Kaffee)` und
      `Spende = max(0, Erhalten − Verzehr-Gesamt)`; **Auslagen sind nicht abgezogen**.
- [ ] **AC6** GIVEN mehrere Teilnehmerzeilen WHEN die Tagessummen gebildet werden THEN
      entsprechen sie der Summe der Zeilenwerte (Σ Getränke, Σ Sonstige, Σ Verzehr-Gesamt,
      Σ Erhalten, Σ Spende).
- [ ] **AC7** GIVEN eine abgeschlossene Veranstaltung mit Auslagen WHEN der Bericht erzeugt
      wird THEN listet der separate Auslagen-Abschnitt **jede** Auslage einzeln mit Teilnehmer,
      Kategorie, Betrag und Status – **nicht** in den Teilnehmerzeilen.
- [ ] **AC8** GIVEN eine abgeschlossene Veranstaltung WHEN die Gesamtabrechnung erzeugt wird
      THEN weist sie den **Verzehr-Umsatz je Kategorie** (Σ Getränke, Σ Essen, Σ Kaffee), die
      **Σ Spende** separat, die **Auslagenerstattung je Kategorie + gesamt** (erstattet) und die
      **Kassenveränderung** = Σ Erhalten − Σ Auslagenerstattungen aus, bezogen auf die
      zugeordnete Kasse.
- [ ] **AC9** GIVEN Verzehr-Umsatz je Kategorie und Spende WHEN summiert THEN gilt
      `Σ Getränke + Σ Essen + Σ Kaffee + Σ Spende = Σ Erhalten` (Konsistenz Einnahmen).
- [ ] **AC10** GIVEN derselbe Bericht in beiden Formaten WHEN Excel und PDF erzeugt werden THEN
      sind die dargestellten Werte (Zeilen, Tagessummen, Auslagen, Gesamtabrechnung) **identisch**.
- [ ] **AC11** GIVEN ein erzeugter Bericht WHEN der Kopf dargestellt wird THEN enthält er
      Bezeichnung, Datum (de-DE), Kasse und Status `abgeschlossen`.
- [ ] **AC12** GIVEN alle Beträge im Bericht WHEN sie dargestellt werden THEN im de-DE-Format
      mit 2 Nachkommastellen und Komma als Dezimaltrenner (konsistent zu `formatCents`).
- [ ] **AC13** GIVEN eine abgeschlossene Veranstaltung **ohne** Teilnehmer/Verzehr/Auslagen
      WHEN der Bericht erzeugt wird THEN wird er dennoch erzeugt (Kopf + leere Tabellen + Nullsummen),
      kein Fehler.

## Fehlerszenarien

- [ ] Bericht für **offene** Veranstaltung angefordert → serverseitig abgelehnt (fail-closed),
      kein Datei-Download (AC2).
- [ ] Anforderung **ohne** Veranstalter-Rolle → serverseitig abgelehnt (AC3).
- [ ] Unbekannte/gelöschte Veranstaltungs-ID → 404 / „nicht gefunden", kein leerer Datei-Download.
- [ ] Auslage bezieht sich auf eine gelöschte Teilnehmerzeile → im Auslagen-Abschnitt weiterhin
      sichtbar mit Fallback-Anzeigename (LEFT JOIN / COALESCE, analog `listAuslagen`, Codify #53).

## Offene Fragen (für /architecture)

- [ ] **Bibliothekswahl** für `.xlsx` und PDF (server-seitige Erzeugung, Vercel/Node-20-kompatibel,
      EU-Datenresidenz) – ADR-Kandidat. Kandidaten prüfen (Bundle-Größe, Edge-/Node-Runtime,
      Lizenz, Wartung).
- [ ] **Erzeugungs-Mechanismus:** Route Handler (`app/api/.../route.ts`, GET-Download mit
      `Content-Disposition`) vs. Server Action. Bei Route Handler: Proxy-Matcher-Schutz beachten
      (bleibt authentifiziert, **keine** Ausnahme wie öffentliche Endpunkte, Codify #63) und
      Routen-Doku (`docs/routes.md`) mitpflegen.
- [ ] **Dateibenennung:** Konvention aus Datum + Bezeichnung (z. B.
      `abschlussbericht-<YYYY-MM-DD>-<slug>.xlsx/.pdf`) – Sonderzeichen/Slug-Regel festlegen.
- [ ] **Pro-Artikel-Layout je Format:** Artikel-Matrix (Artikel als Spalten, wie das breite
      Excel-Gitter) vs. Unterliste je Teilnehmer – ggf. je Format unterschiedlich (Excel breit,
      PDF Hochformat). Informationsgehalt (Menge + Zeilenbetrag je Artikel) ist in beiden gleich.
- [ ] **Rendering-Ort der reinen Bericht-Daten:** eine gemeinsame, DB-freie
      „Bericht-Modell"-Funktion (analog `kassierSummen`) als Single Source für beide Format-Renderer.
