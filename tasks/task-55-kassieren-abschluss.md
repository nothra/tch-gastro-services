# Task 55: kassieren-abschluss

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Feature **F8** (Epic „Digitale Veranstaltungs-Abrechnung"). Der **Veranstalter** kassiert am
Ende einer Veranstaltung bei jedem Teilnehmer den **Verzehr-Gesamt** bar, erfasst das
**Erhalten**; die **Spende** = Erhalten − Verzehr-Gesamt ergibt sich automatisch. Zeilen sind
**offen/bezahlt** (abgeleitet aus `Erhalten ≥ Verzehr-Gesamt`; kein Restbetrag im MVP). Die
Veranstaltung kann **nur abgeschlossen werden, wenn jede Zeile bezahlt ist** (danach
schreibgeschützt, Tagessummen fixiert) und kann von einem Veranstalter **wieder geöffnet**
werden (protokolliert). Zusätzlich die **Veranstaltungs-Gesamtabrechnung** je zugeordneter
Kasse (Einnahmen Σ Erhalten vs. Ausgaben Auslagenerstattungen, F6).

Auslagen werden beim Kassieren **nicht** verrechnet (eigener Vorgang, F6) → Verzehr-Gesamt ≥ 0.

**Terminologie:** durchgängig „Veranstaltung" (nie „Abend"); Owner-Rolle `veranstalter`.

Kanonische Quelle der Akzeptanzkriterien: [`docs/specs/spec-55-kassieren-abschluss.md`](../docs/specs/spec-55-kassieren-abschluss.md).

## Akzeptanzkriterien
<!-- Spiegelt spec-55; kanonische Quelle bleibt die Spec-Datei -->
- [ ] Verzehr-Gesamt je Zeile = Σ Getränke + Σ Sonstige (2 Nachkommastellen, **ohne** Auslagen-Abzug).
- [ ] `Erhalten = Verzehr-Gesamt` → `Spende = 0`, Zeile **bezahlt**.
- [ ] `Erhalten > Verzehr-Gesamt` → `Spende = Erhalten − Verzehr-Gesamt` (als Spende ausgewiesen), Zeile **bezahlt**.
- [ ] `Verzehr-Gesamt > Erhalten` → Zeile **nicht** bezahlt, bleibt/wird **offen** (kein Restbetrag gespeichert).
- [ ] Zeile ohne Verzehr (`Verzehr-Gesamt = 0`) und ohne `Erhalten` → **bezahlt** (nichts zu kassieren), zählt nicht als offen.
- [ ] Abschluss bei mindestens einer offenen Zeile (`Verzehr-Gesamt > Erhalten`) → **abgelehnt** (serverseitig, fail-closed) mit Hinweis welche/wie viele Zeilen offen sind; Status bleibt `offen`.
- [ ] Abschluss, wenn **jede** Zeile bezahlt ist (inkl. `Verzehr-Gesamt = 0`) → Status `abgeschlossen`, schreibgeschützt, Tagessummen fixiert.
- [ ] Abgeschlossene Veranstaltung wieder öffnen → Korrekturen (Verzehr/Erhalten/Auslagen) möglich, Wiederöffnung protokolliert, nach erneutem Abschluss Summen neu fixiert.
- [ ] Tagessummen entsprechen der Summe der Zeilenwerte (Getränke, Sonstige, Verzehr-Gesamt, Erhalten, Spende).
- [ ] Veranstaltungs-Gesamtabrechnung: Auslagenerstattungen je Kategorie + gesamt als Ausgaben; **Kassenveränderung** = Σ Erhalten − Σ Auslagenerstattungen je zugeordneter Kasse korrekt.
- [ ] Individuelles Kassieren mit eigenen Auslagen: zu kassierender Betrag bleibt der **volle** Verzehr-Gesamt (Auslagen wirken nur in der Gesamtabrechnung).

### Fehlerszenarien
- [ ] `Erhalten` kein gültiger EUR-Betrag ≥ 0 → serverseitig abgelehnt (inkl. int4-Obergrenze).
- [ ] Abschluss bei offener Zeile → serverseitig **abgelehnt** (fail-closed) mit Hinweis welche/wie viele Zeilen offen sind.
- [ ] Wiederöffnen ohne Veranstalter-Rolle → serverseitig abgelehnt (fail-closed, `lib/authz.ts`).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Datenmodell heute: `veranstaltung.status` (offen/abgeschlossen) + `auslage` (F6) existieren;
  `veranstaltung_zeile` hat **noch keine** Felder für `erhalten`/`bezahlt` und es gibt **kein**
  Reopen/Abschluss-Protokoll-Feld → beides in /architecture entscheiden (siehe Offene Fragen).
- Beträge als ganzzahlige Cent (`*_cents`, ADR-021); Zod-Validierung an der Server-Grenze,
  int4-Obergrenze beachten (Codify #49).

## Offene Fragen (für /architecture)
- [ ] Protokollierung Öffnen/Abschluss: eigenes Audit-Log oder Zeitstempel+Nutzer an der Veranstaltung?
- [ ] Fixierte Tagessummen bei Wiederöffnung: neu berechnen vs. Snapshot je Abschluss?
- [ ] Ablage Zeilen-Status (offen/bezahlt) + `erhalten`: neue Spalten an `veranstaltung_zeile` (Migration).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/55-kassieren-abschluss`
Erstellt: 2026-07-19 20:50
