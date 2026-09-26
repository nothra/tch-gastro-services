# Review: Task 365

Drei Runden (Backend/Logik, Code-Qualität, Architektur) gegen `origin/main...HEAD` auf
`fix/365-veranstaltung-katalog-nach-wechsel-falsch`. Ein Wichtig-Finding aus Runde 2 wurde
noch innerhalb dieses Review-Zyklus behoben (ADR-050-Nachtrag ergänzt, Test-Negativ-Assertion
nachgezogen, erneut committet/gepusht); die folgenden Abschnitte spiegeln den finalen Stand.

## Kritische Findings (müssen behoben werden)
(keine)

## Wichtige Findings (sollten behoben werden)
(keine – ursprünglich aus Runde 2: `docs/adr/050-katalog-als-template-entitaet.md` nannte
`app/veranstaltung/[id]/verzehr/page.tsx` als migrierten Lesepfad, aber nicht den öffentlichen
Token-Pfad `app/theke/[token]/page.tsx`, und behauptete fälschlich, `STANDARD_CATALOG_ID` habe
die produktiven Lesepfade seit #346 „vollständig (außer Theke)" verlassen. Behoben durch einen
neuen ADR-Nachtrag „(2026-09-26, #365)", der die Aussage korrigiert und den übersehenen
dritten Aufrufort dokumentiert. Runde 3 hat den Nachtrag als inhaltlich korrekt und
widerspruchsfrei bestätigt.)

## Nitpicks (optional)
- [ ] [app/theke/[token]/page.tsx:24-27] Der Kommentar könnte zusätzlich auf den bestehenden
      Test `should_workSameWayIncludingEssen_when_veranstaltungTypIsTheke` verweisen, der die
      Design-Entscheidung "diese Route verzweigt nirgends auf `typ`" bereits belegt – rein
      optionale Lesbarkeits-Verbesserung, kein Verhaltensrisiko.

## Positives
- Der Fix trifft exakt die Root Cause und ist konsistent mit dem etablierten Vorbild
  `app/veranstaltung/[id]/verzehr/page.tsx` (gleiche Data-Layer-Funktion, keine
  Schicht-Verletzung, keine neue Abhängigkeit).
- Grep-Sweeps (Runde 1 + Runde 3) bestätigen: kein weiterer Aufrufort trägt dieselbe falsche
  Annahme; die Sonderrolle der Dauer-Theke (`ensureThekeForKasse` setzt `catalogId` nie) bleibt
  korrekt erhalten.
- Neuer Testfall `should_loadCatalogFromVeranstaltung_when_catalogWasSwitchedAwayFromStandard`
  ist kein Scheingrün (vor dem Fix reproduzierbar rot) und folgt der Namens- und
  Assertions-Konvention des Schwester-Tests in `app/veranstaltung/[id]/verzehr/page.test.tsx`
  (inkl. `not.toHaveBeenCalledWith`-Symmetrie).
- Aufräumen im Test-Setup (nicht mehr benötigter `STANDARD_CATALOG_ID`-Mock-Export entfernt)
  ist vollständig, keine toten Referenzen.
- `docs/routes.md` korrekt unverändert, da keine Route hinzugefügt/entfernt/im Zugriff
  geändert wurde – nur ein interner Query-Parameter-Fix innerhalb der bestehenden Route.
- Root-Cause-Dokumentation in der Task-Datei ist präzise und liefert einen passenden
  `/codify`-Lesson-Vorschlag.

## Empfehlung
APPROVED
