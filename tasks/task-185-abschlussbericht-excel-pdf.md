# Task 185: abschlussbericht-excel-pdf

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->
Abschlussbericht für eine **abgeschlossene** Veranstaltung als **Excel (.xlsx)** und **PDF**,
abrufbar durch den `veranstalter` aus der Detailansicht. Aufbau: Kopf (Bezeichnung/Datum/Kasse/
Status), Teilnehmertabelle mit **Pro-Artikel-Strichen** (Menge + Zeilenbetrag, eingefrorene
Preise) + Kategorie-/Zeilensummen, Tagessummen, **separater Auslagen-Einzelnachweis**,
Gesamtabrechnung (Verzehr-Umsatz je Kategorie + Σ Spende + Auslagenerstattung je Kategorie +
Kassenveränderung). Werte folgen den Domänenregeln (Auslagen mindern den Verzehr **nicht**).

Vollständige Spezifikation: [spec-185](../docs/specs/spec-185-abschlussbericht-excel-pdf.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AC1 – Aus der Detailansicht einer **abgeschlossenen** Veranstaltung sind Excel- **und** PDF-Download verfügbar (Veranstalter).
- [ ] AC2 – Bericht für **offene** Veranstaltung → serverseitig abgelehnt (fail-closed).
- [ ] AC3 – Anforderung ohne Veranstalter-Rolle (z. B. Verwalter) → serverseitig abgelehnt.
- [ ] AC4 – Teilnehmerzeilen enthalten konsumierte Artikel mit **Menge** (Strichzahl) + Zeilenbetrag (Menge × eingefrorener Einzelpreis).
- [ ] AC5 – `Verzehr-Gesamt = Σ Getränke + Σ Sonstige`, `Spende = max(0, Erhalten − Verzehr-Gesamt)`; **ohne** Auslagen-Abzug.
- [ ] AC6 – Tagessummen entsprechen der Summe der Zeilenwerte.
- [ ] AC7 – Separater Auslagen-Abschnitt listet **jede** Auslage einzeln (Teilnehmer, Kategorie, Betrag, Status) – nicht in den Teilnehmerzeilen.
- [ ] AC8 – Gesamtabrechnung: Verzehr-Umsatz je Kategorie, Σ Spende separat, Auslagenerstattung je Kategorie + gesamt, Kassenveränderung (je zugeordneter Kasse).
- [ ] AC9 – Konsistenz: `Σ Getränke + Σ Essen + Σ Kaffee + Σ Spende = Σ Erhalten`.
- [ ] AC10 – Werte in Excel und PDF sind identisch.
- [ ] AC11 – Kopf enthält Bezeichnung, Datum (de-DE), Kasse, Status `abgeschlossen`.
- [ ] AC12 – Beträge im de-DE-Format, 2 Nachkommastellen (konsistent zu `formatCents`).
- [ ] AC13 – Abgeschlossene Veranstaltung **ohne** Teilnehmer/Verzehr/Auslagen → Bericht wird dennoch erzeugt (Kopf + Nullsummen), kein Fehler.

### Fehlerszenarien
- [ ] Offene Veranstaltung → abgelehnt (AC2); ohne Rolle → abgelehnt (AC3).
- [ ] Unbekannte/gelöschte Veranstaltungs-ID → 404, kein leerer Download.
- [ ] Auslage auf gelöschter Zeile → Fallback-Anzeigename (analog `listAuslagen`, Codify #53).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Offene Architektur-Fragen (→ `/architecture`): Bibliothekswahl xlsx/PDF (ADR-Kandidat),
Erzeugungs-Mechanismus (Route Handler vs. Server Action; Proxy-Matcher-Schutz, Routen-Doku),
Dateibenennung, Pro-Artikel-Layout je Format (Matrix vs. Unterliste), gemeinsames DB-freies
Bericht-Modell als Single Source. Details in spec-185 „Offene Fragen".

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Fachlich geklärt (Requirements-Session 2026-07-20): Detailgrad = Pro-Artikel-Striche;
Einnahmen = Verzehr-Umsatz je Kategorie + Σ Spende; Auslagen als separate Einzelliste; Zugriff
nur Veranstalter; beide Formate in dieser Task; kein Protokoll-Abschnitt. Verbleibende Fragen
sind rein technisch → `/architecture` (siehe Technische Notizen / spec-185).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/185-abschlussbericht-excel-pdf`
Erstellt: 2026-07-20 13:42
