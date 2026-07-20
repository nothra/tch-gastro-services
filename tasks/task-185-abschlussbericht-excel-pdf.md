# Task 185: abschlussbericht-excel-pdf

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
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
- [x] AC1 – Aus der Detailansicht einer **abgeschlossenen** Veranstaltung sind Excel- **und** PDF-Download verfügbar (Veranstalter). _(page.test.tsx: `should_showBerichtDownloads_when_veranstaltungAbgeschlossen` / `should_hideBerichtDownloads_when_veranstaltungOffen`)_
- [x] AC2 – Bericht für **offene** Veranstaltung → serverseitig abgelehnt (fail-closed). _(route.test.ts: `should_return409_when_veranstaltungOffen`)_
- [x] AC3 – Anforderung ohne Veranstalter-Rolle (z. B. Verwalter) → serverseitig abgelehnt. _(route.test.ts: `should_return403_when_userIsNotVeranstalter`)_
- [x] AC4 – Teilnehmerzeilen enthalten konsumierte Artikel mit **Menge** (Strichzahl) + Zeilenbetrag (Menge × eingefrorener Einzelpreis). _(berichtModell.test.ts AC4/AC5)_
- [x] AC5 – `Verzehr-Gesamt = Σ Getränke + Σ Sonstige`, `Spende = max(0, Erhalten − Verzehr-Gesamt)`; **ohne** Auslagen-Abzug. _(berichtModell.test.ts: `should_computeZeilenSummenWithoutAuslagen_when_built`)_
- [x] AC6 – Tagessummen entsprechen der Summe der Zeilenwerte. _(berichtModell.test.ts: `should_sumZeilenValues_when_built`)_
- [x] AC7 – Separater Auslagen-Abschnitt listet **jede** Auslage einzeln (Teilnehmer, Kategorie, Betrag, Status) – nicht in den Teilnehmerzeilen. _(berichtModell.test.ts: `should_listEachAuslageSeparatelyWithLabels` / `should_notIncludeAuslagenInTeilnehmerzeilen`)_
- [x] AC8 – Gesamtabrechnung: Verzehr-Umsatz je Kategorie, Σ Spende separat, Auslagenerstattung je Kategorie + gesamt, Kassenveränderung (je zugeordneter Kasse). _(berichtModell.test.ts AC8)_
- [x] AC9 – Konsistenz: `Σ Getränke + Σ Essen + Σ Kaffee + Σ Spende = Σ Erhalten`. _(berichtModell.test.ts: `should_satisfyEinnahmenConsistency_when_closed`)_
- [x] AC10 – Werte in Excel und PDF sind identisch. _(per Konstruktion: beide Renderer konsumieren ausschließlich das reine `berichtModell`; Smoke-Tests belegen valide xlsx/pdf-Ausgabe)_
- [x] AC11 – Kopf enthält Bezeichnung, Datum (de-DE), Kasse, Status `abgeschlossen`. _(berichtModell.test.ts AC11)_
- [x] AC12 – Beträge im de-DE-Format, 2 Nachkommastellen (konsistent zu `formatCents`). _(Excel: `numFmt "#,##0.00 €"` + echte Zahlen; PDF: `formatCents`)_
- [x] AC13 – Abgeschlossene Veranstaltung **ohne** Teilnehmer/Verzehr/Auslagen → Bericht wird dennoch erzeugt (Kopf + Nullsummen), kein Fehler. _(berichtModell.test.ts: `should_buildReportWithNullSums_when_noParticipants`; berichtPdf.test.ts: `should_produceValidPdf_when_reportIsEmpty`)_

### Fehlerszenarien
- [x] Offene Veranstaltung → abgelehnt (AC2); ohne Rolle → abgelehnt (AC3). _(route.test.ts 409/403)_
- [x] Unbekannte/gelöschte Veranstaltungs-ID → 404, kein leerer Download. _(route.test.ts: `should_return404_when_veranstaltungMissing`)_
- [x] Auslage auf gelöschter Zeile → Fallback-Anzeigename (analog `listAuslagen`, Codify #53). _(orphan-sicher im Data-Layer `listAuslagen` per LEFT JOIN + COALESCE; das Modell reicht den aufgelösten `anzeigename` durch)_

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
Blocker [2026-07-20]: `/review` abgebrochen – der Branch enthält nur Dokumentation
(ADR-036, spec-185, Task-Datei), keinen Implementierungs-Code. `git diff origin/main...HEAD`
zeigt ausschließlich `docs/**` + `tasks/**`; es existiert weder der Route Handler
(`app/api/veranstaltung/[id]/bericht/route.ts`) noch `berichtModell`/Renderer/Tests.
– Der Mensch muss zuerst `/implement 185` ausführen (Pipeline-Reihenfolge
requirements → architecture → implement → review). Danach `/review` erneut starten.

Blocker erledigt [2026-07-20]: `/implement 185` ist durchlaufen – der Route Handler,
`berichtModell`, beide Renderer (`berichtXlsx`/`berichtPdf`), `berichtDateiname`, die
Detailseiten-Links und alle Tests existieren jetzt im Branch (alle Gates grün). `/review` kann
erneut gestartet werden.

## Implementierungs-Fortschritt (2026-07-20)

Umgesetzt (TDD, pure Module zuerst):
- `kassierSummen.ts` um getrennte `essenCents`/`kaffeeCents` erweitert (ADR-036 D7) + Tests.
- `berichtModell.ts` (reine Single Source, ADR-036 D6) + umfassende Tests (AC4–AC9, AC11, AC13).
- `berichtDateiname.ts` (Slug + Dateiname, ADR-036 D9) + Tests.
- `berichtXlsx.ts` (Excel-Renderer, ADR-036 D8) + Smoke-Test (Magic Bytes „PK").
- Route Handler `app/api/veranstaltung/[id]/bericht/route.ts` (ADR-036 D1–D4) + Test
  (403/400/404/409/200 xlsx+pdf, Content-Disposition) – Renderer gemockt, läuft ohne die Pakete.
- Detailseite: Excel-/PDF-Download-Links nur bei Status `abgeschlossen` (AC1) + Tests.
- `docs/routes.md`: neue Route ergänzt (authentifiziert, `veranstalter`, nicht proxy-exempt).

Blocker [2026-07-20]: Abhängigkeits-Installation ausstehend – bare `pnpm` ist policy-geblockt
(nur `bash scripts/*` allow-gelistet, Codify pnpm-gates-via-scripts). ADR-036 D5 verlangt
`exceljs` + `pdfmake` (+ `@types/pdfmake`). – Der Mensch muss einmalig ausführen (oder freigeben):
`pnpm add exceljs pdfmake` und `pnpm add -D @types/pdfmake` (danach `pnpm audit`; Overrides via
`pnpm-workspace.yaml`, Codify #167). Erst danach folgen der PDF-Renderer (`berichtPdf.ts`, korrektes
Node-Font-Handling), sein Smoke-Test und das grüne Gate (Typecheck braucht die exceljs/pdfmake-Imports).

Blocker erledigt [2026-07-20]: `exceljs`/`pdfmake`/`@types/pdfmake` sind installiert
(`package.json` + `node_modules` + `pnpm-lock.yaml`; Security-Overrides für postcss/esbuild in
`pnpm-workspace.yaml`, Codify #167). Danach umgesetzt:
- `berichtPdf.ts` (PDF-Renderer, ADR-036 D8): kompakte Unterliste je Teilnehmer; Node-nativ mit den
  eingebauten Helvetica-Standardschriften (kein VFS/Font-Download); URL-Access fail-closed,
  Local-Access auf genau die registrierten Helvetica-Dateien beschränkt.
- `berichtPdf.test.ts`: Smoke-Tests (PDF-Magic-Bytes „%PDF" bei befülltem UND leerem Bericht, AC13).

Gate-Verifikation [2026-07-20] – alle grün:
- `bash scripts/checks/pre-push.sh`: Tests **597 passed** / 59 skipped, Typecheck ✓, Format ✓,
  Routen-Doku-Drift ✓.
- `bash scripts/checks/pre-commit.sh`: Lint ✓ (keine Debug-Statements / Merge-Konflikte / Secrets).

Implementierung damit vollständig (alle AC + Fehlerszenarien getestet). Nächster Pipeline-Schritt: `/review`.

## /review-Ergebnis (2026-07-20)

`tasks/review-185.md`: **APPROVED**, keine kritischen Findings. Ein wichtiges Finding
(Route-Mapping-Lambdas in `bericht/route.ts` nur mit leeren Arrays getestet) explizit für `/test`
vorgemerkt; vier Nitpicks optional.

## /test-Ergebnis (2026-07-20)

- Wichtiges Review-Finding behoben: `route.test.ts` hat jetzt
  `should_mapDbRowsIntoBerichtModell_when_zeilenPositionenAndAuslagenPresent` – prüft das an
  `berichtXlsx`/`berichtPdf` übergebene Modell mit je einer befüllten Zeile/Position/Auslage
  (deckt AC4/AC7 zusätzlich auf Handler-Ebene ab).
- Zusätzliche Branch-Coverage-Lücken geschlossen: `berichtModell.test.ts` (Teilnehmer ohne jede
  Position, Artikel-Sortierung bei gleicher Kategorie+Name via Größe), `berichtXlsx.test.ts`
  (geteilter Artikel über zwei Teilnehmer, unterschiedliche Artikel je Teilnehmer,
  `erhaltenCents === null`), `berichtPdf.test.ts` (Teilnehmer ohne Positionen + `null` Erhalten).
- Verbleibende ungetestete Branches sind echte Dead-Branches in Produktionscode (kein
  Produktionscode-Fix in diesem Schritt, Review-Nitpicks): `berichtDateiname.ts:23`
  (`?? char`-Fallback nach `/[äöüß]/g` ist unerreichbar) und `berichtXlsx.ts:89`
  (`spalte !== undefined` ist immer wahr, da `spalteJeArtikel` aus denselben Positionen gebaut
  wird, die die Schleife durchläuft) – beide nur durch eine Produktionscode-Änderung (Fallback
  entfernen bzw. Guard entfernen) auf 100 % Branch-Coverage zu heben; Kandidat für `/refactor`.
- Finaler Lauf: `pnpm test:coverage` → **604 passed / 59 skipped** (0 Failures), Statements
  88.86 %, Branches 93.93 %, Funktionen 76.99 %, Lines 88.89 % (deutlich über der 80 %-Schwelle;
  die 0 %-Werte unter `db/**` sind vorbestehende Integrationstests ohne lokale DB, unabhängig
  von dieser Task). `bash scripts/checks/pre-push.sh` erneut grün.

## /refactor-Ergebnis (2026-07-20)

Der automatisierte `/refactor`-Schritt lief 3× ins Turn-Limit (20 Turns) ohne Commit – bei
Wiederholungsversuchen (frische Session, kein Gedächtnis) griff jeder Versuch auf den
halb bearbeiteten Stand des vorigen zu, ohne dessen Absicht zu kennen. Menschlich
fertiggestellt, gleicher Scope wie von den Versuchen selbst vorgezeichnet:
- `artikelBezeichnung`/`gesamtabrechnungsZeilen` aus `berichtModell.ts` exportiert und in
  `berichtXlsx.ts` + `berichtPdf.ts` genutzt statt dupliziert (DRY, kein zweiter Wahrheitspfad).
- Toten `?? char`-Fallback in `berichtDateiname.ts:23` entfernt (Record-Lookup ohne
  `noUncheckedIndexedAccess` ist bereits `string`, nie `undefined`).
- Tote `spalte !== undefined`-Guard in `berichtXlsx.ts` entfernt (`spalteJeArtikel` wird aus
  denselben Positionen aufgebaut, die durchlaufen werden – Lookup kann nie fehlschlagen).
- Alle drei Dateien danach 100 % Branch-Coverage (waren die einzigen Uncovered-Lines aus dem
  `/test`-Schritt). Gates grün: 604 Tests, Typecheck, Format, Lint, Routen-Doku-Drift.
  Committet + gepusht via `factory-commit.sh` (`f39769a`).

## /security-review-Ergebnis (2026-07-20)

`tasks/security-185.md`: **PASSED** – keine kritischen oder wichtigen Findings. Der explizit
geprüfte Angriffsvektor (Content-Disposition-Header-Injection/CRLF/Path-Traversal über die
nutzerkontrollierte `bezeichnung`) ist konstruktionsbedingt ausgeschlossen (Slug reduziert auf
`[a-z0-9-]`). RBAC-Reihenfolge (403→400→404→409→Render), Proxy-Schutz ohne neue Ausnahme
(Codify #63), pdfmake URL-/Local-Access fail-closed (kein SSRF/LFI), parametrisierte
Drizzle-Queries, `runtime = "nodejs"` – alles korrekt. Drei optionale Hinweise (kein Blocker):
- **[Dependency]** `uuid <11.1.1` (moderate, GHSA-w5hq-g745-h8pq) transitiv über `exceljs>uuid` –
  im Bericht-Kontext nicht ausnutzbar (exceljs ruft `uuidv4()` ohne `buf`-Argument, nur im
  ungenutzten Conditional-Formatting-Pfad). Optional per konditionalem Override in
  `pnpm-workspace.yaml` schließbar (Dependabot-/Audit-Ruhe).
- **[Injection]** Excel-Formula-Injection durch xlsx-String-Zelltyp mitigiert; optionale
  Defense-in-Depth: führende `= + - @` in Nutzer-Strings mit `'` neutralisieren.
- **[AuthZ/IDOR]** Zugriff nur per Rolle `veranstalter`, keine Pro-Nutzer-Eigentümerbindung –
  konsistent mit der bestehenden Baseline (Detailseite/Actions), kein Regress dieser Task.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Voller Report: [`tasks/codify-185.md`](codify-185.md). Zusammenfassung:
- `clean-code.md`: Regel gegen tote Fallbacks für vom Typsystem bereits ausgeschlossene Fälle
  (aus den beiden im `/refactor`-Schritt entfernten toten Branches).
- `PROJECT-CONTEXT.md`: Stolperstein „`/refactor` Turn-Limit-Exhaustion" (drei Retries ohne
  Commit, gedächtnisloser Restart auf halbfertigem Zwischenstand).
- `testing-standards.md`: neue Regel „Mock-Default mit leerem Array verdeckt Mapping-Code"
  (verallgemeinert das wichtige Review-Finding zu den ungetesteten Route-Mapping-Lambdas).
- Security-Review-Hinweise (uuid-Advisory, Formula-Injection-Härtung, fehlende
  Eigentümerbindung) brauchten keine neue Regel – nicht ausnutzbar bzw. konsistent mit
  bestehender Baseline, kein Wiederholungsmuster.

---
Branch: `feature/185-abschlussbericht-excel-pdf`
Erstellt: 2026-07-20 13:42
