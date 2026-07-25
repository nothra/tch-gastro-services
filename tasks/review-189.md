# Review: Task 189

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [app/veranstaltung/berichtXlsx.test.ts:187-189, 202-203] Magic-Number-Kopplung an
      Row-Indizes (`getRow(2)/getRow(9)/getRow(14)`) ohne Kommentar, warum genau diese Zeilen
      die Zielzellen sind (6 Kopfzeilen + Header + Preiszeile ⇒ Zeile 9 für den ersten
      Teilnehmer, unabhängig von der Artikel-Spaltenzahl; Zeile 14 für die erste Auslage). Das
      ist zufällig stabil, solange genau 1 Teilnehmer vor der Zielzeile steht und sich die
      Kopf-/Header-Zeilenanzahl nicht ändert – bricht aber **stillschweigend** (falsche Zelle
      statt Testfehler) bei jeder Layout-Änderung am Renderer. Verstößt gegen die
      Clean-Code-Regel „Keine Magic Numbers" – zumindest ein kurzer WHY-Kommentar zur
      Herleitung der Zahlen fehlt.
- [ ] [app/veranstaltung/berichtXlsx.test.ts:184, 199] Code-Duplikation: `new
      ExcelJS.Workbook()` + identischer `as unknown as Parameters<typeof
      workbook.xlsx.load>[0]`-Cast + `workbook.xlsx.load(...)` sind zweimal wortgleich
      kopiert; nur die erste Stelle trägt den erklärenden Kommentar zum Typkonflikt. Sollte in
      einen kleinen Test-Helper (z. B. `ladeGerenderetesWorkbook(buffer)`) extrahiert werden.

## Nitpicks (optional)

- [ ] [app/veranstaltung/berichtXlsx.ts:21] `neutralisiereFormelPraefix` ist exportiert, wird
      aber nur innerhalb von `berichtXlsx.ts`/`berichtXlsx.test.ts` verwendet – Export dient
      nur dem direkten Unit-Test, keiner echten Wiederverwendung. Platzierung ist YAGNI-konform
      korrekt (kein `lib/`-Modul für eine noch nicht existierende Wiederverwendung).
- [ ] `pnpm audit` zeigt weiterhin ~20 andere Findings (u. a. `next-auth`/`@auth/core`,
      moderate/high/critical) – außerhalb des Scopes von #189 (nur `uuid` war Ziel), kein
      Blocker für dieses Review.

## Positives

- Alle Akzeptanzkriterien der Spec sind erfüllt und einzeln verifiziert (uuid-Override greift,
  `pnpm why uuid` zeigt 14.0.1, `pnpm audit` meldet uuid nicht mehr; alle sechs Formel-Präfixe
  `= + - @ \t \r` sind abgedeckt; leerer String und bereits-`'`-Wert bleiben unverändert; alle
  drei Stellen `bezeichnung`/`teilnehmer.anzeigename`/`auslage.anzeigename` sind verdrahtet).
- `neutralisiereFormelPraefix` ist klein, SRP, nutzt Guard-Clauses statt Verschachtelung,
  sprechender Name.
- Kommentar über `FORMEL_PRAEFIXE` erklärt WHY (OWASP-Cheatsheet, Defense-in-Depth, konkreter
  Angriffspfad), nicht nur WHAT.
- Kein Fallback für den durchs Typsystem bereits ausgeschlossenen `null`/`undefined`-Fall.
- Unit-Test (alle 6 Präfixe via `it.each`) und Integrationstest (Wiring-Nachweis an allen drei
  Stellen) sind komplementär, nicht redundant.
- pnpm-Override folgt exakt dem bestehenden `postcss`/`esbuild`-Muster (Kommentarblock mit
  Advisory-ID, Quelle, Issue-Referenz).
- Architektur: `neutralisiereFormelPraefix` sitzt korrekt in der Rendering-Schicht, verletzt
  nicht die Single-Source-of-Truth-Idee des `BerichtModell` (ADR-036) – die Beschränkung auf den
  Excel-Renderer ist medienspezifisch korrekt begründet, da nur Tabellenkalkulationsprogramme
  Formel-Präfixe interpretieren, PDF nicht.
- Keine neue Dependency (`uuid` bleibt transitiv), keine Routen-Änderung (`docs/routes.md`
  korrekterweise unangetastet).
- Der Typ-Cast `as unknown as Parameters<typeof workbook.xlsx.load>[0]` ist eine akzeptable,
  gut begründete Ausnahme für einen echten `@types/node`-Versionskonflikt über eine transitive
  Dependency (`fast-csv`, via `exceljs`), keine Umgehung einer echten Typinkompatibilität.

## Empfehlung
NEEDS_REWORK
