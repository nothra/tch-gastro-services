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
Architektur entschieden: **[ADR-036](../docs/adr/036-abschlussbericht-erzeugung-excel-pdf.md)**
(Architektur-Session 2026-07-20). Kernpunkte für `/implement`:

- **Route Handler** (GET) `app/api/veranstaltung/[id]/bericht/route.ts`, `?format=xlsx|pdf`
  (Whitelist, fail-closed → 400). `Content-Disposition: attachment`. `export const runtime = "nodejs"`.
  Reihenfolge: `auth`/Rolle → `getVeranstaltung` (404) → Status ≠ `abgeschlossen` → 409 → Modell → Render.
- **RBAC serverseitig** im Handler: `hasRole(session?.user?.roles, "veranstalter")`, sonst 403.
  Route bleibt **proxy-geschützt** – **keine** `proxy.ts`-Ausnahme (Codify #63). Test auf Rollen-403.
- **Libs:** `exceljs` (.xlsx) + `pdfmake` (PDF) – Node-nativ, kein Headless-Browser (ADR-036 D5).
  Nur server-seitig → kein Client-Bundle-Impact. Nach `pnpm install` → `pnpm audit`; Overrides via
  `pnpm-workspace.yaml` (Codify #167).
- **Single Source:** DB-freies `berichtModell(...)` (analog `kassierSummen.ts`) baut das
  format-neutrale Modell aus `getVeranstaltung`/`listZeilen`/`listPositionen`/`listAuslagen`.
  Beide Renderer (`berichtXlsx.ts`, `berichtPdf.ts`) konsumieren **nur** das Modell ⇒ AC10.
  Modell 100 % unit-testbar; Renderer smoke-getestet (Magic Bytes: xlsx `PK`/`50 4B`, pdf `%PDF`).
- **Nutzt bestehende reine Summen** (`zeileSummen`, `kassierZeilen`, `kassierTagessummen`,
  `gesamtabrechnung`, `auslagenSummen`) – kein zweiter Wahrheitspfad. `listPositionen` liefert je
  Position bereits `menge`, `name`, `size`, `priceCents` (eingefroren via COALESCE, ADR-033 D2),
  `category` → Pro-Artikel-Striche ohne neue Query.
- **Verzehr-Umsatz je Kategorie** getrennt Getränke/Essen/Kaffee (AC8): bevorzugt kleine
  Erweiterung von `kassierSummen` statt Parallel-Aggregation (ADR-036 D7). AC9-Konsistenz
  (`Σ Getr + Σ Essen + Σ Kaffee + Σ Spende = Σ Erhalten`) gilt per Konstruktion (jede Zeile bezahlt).
- **Layout je Format** (ADR-036 D8): Excel = breite Artikel-Matrix; PDF = Unterliste je Teilnehmer.
  Beträge de-DE, 2 Nachkommastellen (konsistent zu `formatCents`; Excel via `numFmt`, echte Zahlen).
- **Dateiname:** `abschlussbericht-<YYYY-MM-DD>-<slug>.{xlsx,pdf}`, Slug aus Bezeichnung
  (transliteriert, `[a-z0-9-]`, gekürzt) – eigene reine, getestete Funktion (ADR-036 D9).
- **Auslagen orphan-sicher** via `listAuslagen` (LEFT JOIN + COALESCE-Fallbackname, Codify #53).
- **UI:** Detailseite (`app/veranstaltung/[id]/page.tsx`) zeigt beide Download-Links **nur** bei
  Status `abgeschlossen`.
- **Routen-Doku:** neue Zeile in `docs/routes.md` (authentifiziert, `veranstalter`, nicht
  proxy-exempt) – Drift-Check erzwingt es fail-closed.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Alle Fragen geklärt (Requirements 2026-07-20 + Architektur ADR-036 2026-07-20):

- Fachlich: Detailgrad = Pro-Artikel-Striche; Einnahmen = Verzehr-Umsatz je Kategorie + Σ Spende;
  Auslagen als separate Einzelliste; Zugriff nur Veranstalter; beide Formate; kein Protokoll.
- Technisch (ADR-036): Route Handler + `?format=`, Node-Runtime, exceljs + pdfmake, DB-freies
  Bericht-Modell als Single Source, Layout je Format (Excel Matrix / PDF Unterliste), Dateiname-Slug.

Keine offenen Punkte mehr → bereit für `/implement 185`.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/185-abschlussbericht-excel-pdf`
Erstellt: 2026-07-20 13:42
