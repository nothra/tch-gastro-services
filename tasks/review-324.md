# Review: Task 324

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] [app/veranstaltung/berichtDateiname.ts:44-49] `berichtDateiname` hat vier positionale
      Parameter (`datum`, `bezeichnung`, `format`, `umfang`). `docs/factory/guidelines/clean-code.md`
      erlaubt max. 3 Parameter, bei mehr ist ein Parameter-Objekt einzuführen. ADR-046 D4
      begründet die Erweiterung mit Bestandsschutz für existierende Aufrufer, adressiert aber
      nicht die Parameter-Anzahl-Regel selbst – alle bestehenden Aufrufer (inkl.
      `route.ts:128`) übergeben bereits alle vier Werte, ein `BerichtDateinameOptions`-Objekt
      hätte dieselbe Rückwärtskompatibilität ohne Guideline-Verstoß ermöglicht.
      (Runde 2 – Code-Qualität)
      **Behoben:** `berichtDateiname` nimmt jetzt ein `BerichtDateinameInput`-Parameter-Objekt
      (`datum`, `bezeichnung`, `format`, optional `umfang`); Aufrufer in `route.ts` und alle
      Testfälle in `berichtDateiname.test.ts` angepasst.

## Nitpicks (optional)

- [ ] [app/veranstaltung/berichtXlsx.ts:176-188,223-234 / app/veranstaltung/berichtPdf.ts:156-186,219-245]
      Strukturelle Ähnlichkeit der Auslagen-Abschnitte zwischen vollständigem und
      Getränke-Renderer – von ADR-046 D3 selbst als bewusster Trade-off benannt
      ("bei Bedarf extrahierbar"), kein Blocker. (Runde 2)
- [ ] [app/veranstaltung/berichtXlsx.test.ts:231-242 / app/veranstaltung/berichtPdf.test.ts:98-109]
      `KATEGORIEUEBERGREIFENDE_BEGRIFFE` + Hilfsfunktion sind wortgleich in beiden Testdateien
      dupliziert (Kommentar verweist selbst darauf). Kandidat für einen gemeinsamen
      Test-Helfer. (Runde 2)
- [ ] [app/api/veranstaltung/[id]/bericht/route.ts:127] Zeile mit `berichtDateiname(...)`-Aufruf
      überschreitet die übliche Zeilenlänge deutlich – reine Formatter-/Stilfrage. (Runde 3)

## Positives

- Alle 15 Akzeptanzkriterien (AC1–AC15) sind im Code nachweisbar erfüllt und durch Tests belegt,
  inkl. aller Fehlerszenarien (fail-closed, korrekte Prüf-Reihenfolge Rolle → Format → Umfang →
  `getVeranstaltung` → Status). (Runde 1)
- AC7 (Wertegleichheit zwischen vollem und Getränke-Bericht) ist **per Konstruktion** erfüllt:
  `berichtModellGetraenke` liest die zwei Summen unverändert aus dem bereits fertigen vollen
  `BerichtModell` – kein zweiter Berechnungspfad. (Runde 1, 3)
- AC5/AC6 (Ausschluss Spende/Erhalten/Kassenveränderung) ist strukturell abgesichert: die
  Felder existieren im Typ `BerichtGetraenkeModell` gar nicht, nicht nur zur Laufzeit
  ausgeblendet. (Runde 1)
- Sehr gute Wiederverwendung der Low-Level-Renderer-Bausteine zwischen vollständigem und
  Getränke-Renderer; nur die dokumentiert akzeptierte Auslagen-Sektion bleibt ähnlich. (Runde 2)
- Nicht-tautologische, unabhängig hergeleitete Test-Assertions; Magic-Number-Zeilenindizes in
  den Xlsx-Tests durchgängig mit Herleitungskommentar. (Runde 2)
- Architektur folgt ADR-046 exakt (D1–D5): Whitelist-Parameter analog `parseFormat`, reine
  Projektion statt Scope-Verzweigung, eigene Renderer-Funktionen, `BerichtUmfang` als
  Domänen-Typ statt Boolean-Flag, keine neuen Abhängigkeiten. (Runde 3)
- `docs/routes.md` und ADR-036 (die den erweiterten Mechanismus beschreibt) sind im selben PR
  korrekt nachgezogen; ADR-046-Status ist `Accepted`. (Runde 3)
- `page.tsx`-Refactoring hat nebenbei eine vorher vierfach kopierte Tailwind-Klasse in
  `AKTION_LINK_KLASSE` zusammengefasst. (Runde 2)

## Empfehlung

APPROVED (nach Behebung des Wichtig-Findings; verbleibende Nitpicks sind bereits in ADR-046
als bewusste Trade-offs dokumentiert bzw. optional)
