# Review: Task 223

## Kritische Findings (müssen behoben werden)
- keine

## Wichtige Findings (sollten behoben werden)
- keine

## Nitpicks (optional)
- [ ] [app/veranstaltung/[id]/kassieren/page.tsx:66–75] Die alphabetische Ordnung *innerhalb*
  jeder Gruppe hängt vom impliziten Vertrag ab, dass `listZeilen` bereits alphabetisch liefert
  (`.orderBy(anzeigename)`). Das ist im Kommentar dokumentiert, aber am Seiten-Layer weder
  geguardet noch getestet – die Komponententests füttern bereits vorsortierte Mocks. Ändert
  jemand die `orderBy`-Klausel in `listZeilen`, bricht die Intra-Gruppen-Alphabetik hier
  **still**. Bewusste Design-Entscheidung der Spec (stabile Sortierung über vorsortierten Input)
  und durch die Data-Layer-Tests von `listZeilen` abgedeckt → kein Blocker, nur als latente
  Kopplung notiert.
- [ ] [app/veranstaltung/[id]/kassieren/page.test.tsx:161–166] `teilnehmerNamesInOrder` liest
  „erster `span` je `<li>`" – funktional korrekt (Anzeigename ist das erste `span`, Z. 116) und
  im Kommentar erklärt, aber an die DOM-Reihenfolge gekoppelt. Robuster wäre ein `data-testid`
  am Namens-Span; für diesen Scope vertretbar.

## Positives
- Sortier-Komparator `Number(a.kassier.bezahlt) - Number(b.kassier.bezahlt)` ist korrekt
  (offen `false→0` vor bezahlt `true→1`) und knapp; die Wahl von `Array.prototype.sort` (stabil
  seit ES2019) trägt die Intra-Gruppen-Alphabetik ohne zweites Sortierkriterium – sauber
  begründet im WHY-Kommentar.
- Sortierung wird korrekt **nach** dem Zippen von `zeile`/`kassier`/`positionen` auf das
  kombinierte Objekt angewandt → die Index-Kopplung (`kassierRows[index]`) bleibt intakt
  (expliziter Randfall der Spec adressiert).
- `kassierSummen.ts` unverändert – reine Präsentations-/Sortier-Änderung in der Server
  Component, kein neuer Wahrheitspfad, kein ADR-Trigger. Scope exakt eingehalten.
- Kein `?? fallback` auf `kassierRows[index]` eingeführt – ohne `noUncheckedIndexedAccess` ist
  der Typ `KassierZeile` (nicht `| undefined`); die Clean-Code-Regel „keine toten Fallbacks"
  ist beachtet.
- Test-Abdeckung vollständig gegen die ACs: Reihenfolge (offen→bezahlt), Intra-Gruppen-
  Alphabetik, Null-Verzehr-Randfall (sortiert nach unten), Styling inkl. `dark:`-Klassen und
  erhaltenes `tabular-nums`. Bestandstest `should_matchBreakdownSumToVerzehrGesamt` wurde
  korrekt von „erstes `li`" auf Annas Zeile explizit umgestellt (sonst grün aus falschem Grund).
- Tests prüfen gegen Literale/erwartete Reihenfolgen, nicht gegen das Objekt-under-Test; alle
  22 Tests der Datei laufen grün (lokal verifiziert).
- Keine Routen-Änderung (`page.tsx` existiert, Pfad/Zugriff unverändert) → `docs/routes.md`
  zu Recht nicht angefasst.

## Empfehlung
APPROVED
