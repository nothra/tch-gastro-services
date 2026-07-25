# Spec: Security-Härtung – uuid-Override + Excel-Formula-Neutralisierung

## Kontext

Aus dem Security-Review von Task #185 (`tasks/security-185.md`, Abschlussbericht Excel/PDF)
stammen zwei **Hinweise ohne Blocker-Status** ("kein Blocker", PASSED). Beide sind optionale
Härtung, keine akuten Schwachstellen – Issue #189 fasst sie zur Umsetzung zusammen:

1. **Dependency-Advisory-Ruhe:** `pnpm audit` meldet 1 moderate Finding: `uuid@8.3.2`
   (GHSA-w5hq-g745-h8pq), transitiv über `exceljs > uuid`. Der Advisory betrifft nur
   `uuidv4(buf)`-Aufrufe mit `buf`-Argument; exceljs ruft `uuidv4()` **ohne** `buf` auf, und
   zwar nur im Conditional-Formatting-Ext-Pfad, den der Bericht-Renderer nicht nutzt – kein
   realer Angriffsvektor. Ziel: Advisory über einen konditionalen Override zum Schweigen
   bringen (Dependabot-/Audit-Ruhe), analog zum bestehenden Muster in `pnpm-workspace.yaml`
   (Codify #167: `postcss@<8.5.10`, `esbuild@<0.25.0`).
2. **Defense-in-Depth gegen Excel-Formula-Injection:** Nutzerkontrollierte Strings landen als
   reine Zell-Strings (nie `{ formula: … }`) im Abschlussbericht-xlsx – Excel/LibreOffice werten
   sie beim Öffnen nicht als Formel aus, das ist bereits mitigiert. Ohne aktive Neutralisierung
   bleibt aber ein Restrisiko, falls eine Zelle später (z. B. durch ein Copy&Paste in eine andere
   Tabelle, ein anderes Tool oder eine künftige CSV-Exportfunktion) formelfähig interpretiert
   wird. `anzeigename` ist teils über die öffentliche Theken-Selbstbedienung (F7/QR) beeinflussbar.

Eine projektweite Suche nach `exceljs`/`ExcelJS`-Verwendungen (`grep -rl "exceljs\|ExcelJS"`)
bestätigt: **`app/veranstaltung/berichtXlsx.ts` ist die einzige Stelle**, die Zellen aus
nutzerkontrollierten Strings befüllt (`route.ts` und `route.test.ts` referenzieren exceljs nur
indirekt über den Renderer-Aufruf). Der projektweite Scope reduziert sich damit in der Praxis
auf diese eine Datei.

## Scope

**Inbegriffen:**
- Konditionaler pnpm-Override für `uuid` in `pnpm-workspace.yaml` (Muster wie bestehende
  `postcss`-/`esbuild`-Overrides), verifiziert mit `pnpm why uuid` (kein Advisory mehr nach
  `pnpm audit`).
- Neutralisierung von Excel-Formula-Injection-Präfixen in **allen** nutzerkontrollierten
  Zell-Strings von `berichtXlsx.ts`:
  - `modell.kopf.bezeichnung` (Kopfzeile, aktuell `berichtXlsx.ts:57`)
  - `teilnehmer.anzeigename` (Teilnehmerzeile, aktuell `berichtXlsx.ts:91`)
  - `auslage.anzeigename` (Auslagenzeile, aktuell `berichtXlsx.ts:116`)
- Erkennung führender Zeichen `= + - @ \t \r` (erweiterte Zeichenliste, OWASP-CSV-Cheatsheet-
  analog, über die im Fließtext des Security-Reports genannten `= + - @` hinaus) – bei Treffer
  wird der Zellwert mit einem führenden `'` (Apostroph) neutralisiert, sodass die Zelle als
  reiner Text ohne Formel-Interpretation gelesen wird.

**Nicht inbegriffen:**
- `auslage.kategorie` / `modell.kopf.kasse` – stammen aus festen Enum-Labels
  (`AUSLAGE_KATEGORIE_LABEL`, `kasse`-Enum), nicht aus Nutzereingaben; keine Neutralisierung
  nötig.
- Änderungen am PDF-Renderer (`berichtPdf.ts`) – PDF kennt keine Formel-Auswertung, betrifft
  den Report-Hinweis nicht.
- Kein genereller CSV-Export der Anwendung (existiert aktuell nicht).
- Kein unkonditionaler `uuid`-Versions-Bump/Deinstallation von `exceljs` – der Override bleibt
  konditional (nur unterhalb des Patch-Floors wirksam) und wird entfernt, sobald `exceljs`
  selbst eine gepatchte `uuid`-Version mitbringt.

## Akzeptanzkriterien

- [ ] GIVEN `pnpm-workspace.yaml` ohne uuid-Override WHEN der Override
      `"uuid@<11.1.1": ">=11.1.1"` ergänzt wird THEN meldet `pnpm audit` keine `uuid`-
      Verwundbarkeit mehr für `exceljs > uuid` und `pnpm why uuid` zeigt eine Version `>=11.1.1`.
- [ ] GIVEN `pnpm install` nach dem Override THEN bleiben alle bestehenden Tests
      (`pnpm test`), der Typecheck (`pnpm typecheck`) und der Excel-Renderer (`berichtXlsx`)
      unverändert funktionsfähig (kein Breaking Change durch die angehobene `uuid`-Version).
- [ ] GIVEN ein Zell-Wert in `berichtXlsx.ts`, der mit einem der Zeichen `= + - @ \t \r` beginnt
      (z. B. `modell.kopf.bezeichnung = "=SUM(A1)"`) WHEN der Bericht gerendert wird THEN
      beginnt der geschriebene Zellwert mit einem führenden `'` gefolgt vom Originalwert
      (`'=SUM(A1)"`), sodass Excel/LibreOffice die Zelle als Text, nicht als Formel liest.
- [ ] GIVEN ein Zell-Wert, der mit keinem dieser Zeichen beginnt (z. B. `"Anna"`) WHEN der
      Bericht gerendert wird THEN bleibt der Zellwert unverändert (kein unnötiges `'`-Präfix).
- [ ] GIVEN `teilnehmer.anzeigename` bzw. `auslage.anzeigename` mit einem Formel-Präfix
      (z. B. `"=HYPERLINK(...)"`) WHEN der Bericht gerendert wird THEN wird auch dieser Wert
      neutralisiert (nicht nur `bezeichnung`).
- [ ] GIVEN ein Wert, der bereits mit `'` beginnt oder ein leerer String ist WHEN neutralisiert
      wird THEN wird kein zusätzliches `'` vorangestellt bzw. ein leerer String bleibt leer
      (keine Sonderfall-Exception).

## Fehlerszenarien

- [ ] Der Neutralisierungs-Helper wird mit `null`/`undefined` nie aufgerufen (`anzeigename`/
      `bezeichnung` sind laut `BerichtModell`-Typ immer `string`, kein `string | null`) – kein
      Fallback für einen durchs Typsystem bereits ausgeschlossenen Fall (Clean-Code-Regel
      "Keine Fallbacks für vom Typsystem bereits ausgeschlossene Fälle").
- [ ] `pnpm audit` nach dem Override läuft weiterhin fehlerfrei durch (kein neuer, unerwarteter
      Blocker durch die Versionsanhebung transitiver `uuid`-Konsumenten).

## Offene Fragen

_Keine._

## Technische Notizen (Platzhalter für /implement)

- uuid-Override: reine `pnpm-workspace.yaml`-Änderung, Muster siehe bestehende
  `postcss@<8.5.10`/`esbuild@<0.25.0`-Einträge (Kommentarblock mit Advisory-ID + Quelle
  fortführen).
- Formula-Neutralisierung: kleine reine Funktion (z. B.
  `neutralisiereFormelPraefix(wert: string): string`), lokal in `berichtXlsx.ts` oder als
  eigenes, domänenspezifisch benanntes Modul – Entscheidung liegt bei `/implement` (kein
  ADR-Trigger, da keine Architektur-Entscheidung, nur eine kleine Utility-Funktion).
- Kein `/architecture`-Schritt nötig: reine Härtungsmaßnahme ohne neue Architekturentscheidung.
