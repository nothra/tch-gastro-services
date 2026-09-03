# Task 324: abschlussbericht-getraenke

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Zusätzliche Abschlussbericht-Variante „nur Getränke" für abgeschlossene Veranstaltungen:
weist ausschließlich den Verzehr-Umsatz Getränke (Einnahmenseite) und die
Auslagenerstattung der Kategorie `getraenke` (Ausgabenseite) aus – ohne Spende,
Kassenveränderung und Erhalten/Einnahmen (kategorieübergreifende Größen). Der bestehende
vollständige Abschlussbericht (#185) bleibt unverändert; die Variante kommt zusätzlich dazu,
in beiden Formaten (xlsx/pdf). Details: [spec-324](../docs/specs/spec-324-abschlussbericht-getraenke.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
Siehe [spec-324](../docs/specs/spec-324-abschlussbericht-getraenke.md) → Akzeptanzkriterien
AC1–AC15 (u. a. Kategorie-Filter Getränke, exakt zwei Summen, Ausschluss Spende/Kassenveränderung/
Erhalten, Wegfall von Teilnehmerzeilen ohne Getränke, gruppierte UI-Sektion, fail-closed Gates).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Siehe [ADR-046](../docs/adr/046-abschlussbericht-getraenke-variante.md). Kurzfassung:
- **Route:** kein neuer Endpunkt – bestehende `.../bericht`-Route bekommt zusätzlichen
  Query-Parameter `umfang=voll|getraenke` (Whitelist, fail-closed; Default `voll`).
- **Modell:** `berichtModell()` bleibt unverändert. Neue reine Projektions-Funktion
  `berichtModellGetraenke(modell: BerichtModell): BerichtGetraenkeModell` im selben Modul
  filtert Teilnehmer-Positionen auf `category === "getraenk"` (leere Teilnehmer weggelassen,
  AC12), Auslagen auf Kategorie Getränke, und übernimmt die zwei Summen unverändert aus dem
  vollen Modell (`tagessummen.getraenkeCents`,
  `gesamtabrechnung.auslagenErstattung.getraenkeCents`).
- **Renderer:** eigene `berichtXlsxGetraenke`/`berichtPdfGetraenke`-Funktionen statt Verzweigung
  in den bestehenden Renderern.
- **Dateiname:** `berichtDateiname` um `BerichtUmfang`-Parameter (Default `"voll"`) erweitert →
  Segment `getraenke` im Dateinamen.
- **UI:** eine Sektion „Abschlussbericht", zwei Gruppen „Vollständig"/„Nur Getränke", vier Links
  auf dieselbe Route mit unterschiedlichen Query-Parametern.
- `docs/routes.md`: bestehende Zeile um den `umfang`-Parameter ergänzen, kein neuer Eintrag.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Keine – alle drei Architekturfragen aus spec-324 sind in ADR-046 entschieden._

## Review-Findings
<!-- Wird durch /review befüllt -->

Drei-Runden-Review (`tasks/review-324.md`): keine kritischen Findings. Ein Wichtig-Finding
(Runde 2 – 4-Parameter-Verstoß in `berichtDateiname`) direkt behoben (Parameter-Objekt
`BerichtDateinameInput`). Drei Nitpicks belassen (Duplikation Auslagen-Abschnitt/Test-Helfer –
in ADR-046 als bewusster Trade-off dokumentiert; eine lange Zeile). Gesamtempfehlung: APPROVED.

## Refactoring-Notizen

`/refactor`-Pass gegen die Clean-Code-Checkliste (Naming, Funktionslänge, Parameter,
Duplikation, Verschachtelung): keine weitere Code-Änderung nötig. Das einzige
Wichtig-Finding aus dem Review (4-Parameter-Verstoß `berichtDateiname`) wurde bereits im
Review-Rework behoben. Die verbleibende Struktur-Ähnlichkeit zwischen `auslagenAbschnitt`/
`getraenkeAuslagenAbschnitt` (Xlsx/PDF) ist in ADR-046 D3 bewusst als Trade-off dokumentiert
("bei Bedarf extrahierbar") – eine Extraktion ohne dritte Kategorie-Variante wäre Premature
Abstraction (clean-code.md).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/324-abschlussbericht-getraenke`
Erstellt: 2026-09-03 10:27
