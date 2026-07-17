# Review: Task 138

## Kritische Findings (müssen behoben werden)
- _Keine._

## Wichtige Findings (sollten behoben werden)
- _Keine._

## Nitpicks (optional)
- [ ] [app/_verzehr/summen.ts:31] Der `else`-Zweig bildet implizit `kaffee` ab. `CatalogCategory`
  ist aktuell eine geschlossene Drei-Werte-Union, daher korrekt – aber ADR-027/Task forderten ein
  „explizites Kategorie-Mapping", und die `kaffee`-Zuordnung bleibt der einzige nicht benannte Fall.
  Ein `else if (position.category === "kaffee")` mit anschließendem Exhaustiveness-Guard
  (`const _exhaustive: never = position.category`) bzw. ein `switch` mit `default: never` machte die
  Zuordnung selbstdokumentierend und fail-safe: Käme je eine vierte Katalog-Kategorie hinzu, würde sie
  sonst still als Kaffee gezählt statt einen Compile-Fehler auszulösen. Kosmetisch, kein Verhaltensfehler.
- [ ] [app/_verzehr/VerzehrErfassung.test.tsx:90,106] `should_showEssenFormatted` /
  `should_showKaffeeFormatted` matchen lose (`/17,80\s*€/`, `/3,00\s*€/`) und prüfen nicht, dass der
  Betrag am **Essen-/Kaffee-Label** hängt. Der stärkere `should_showAllThreeCategorySumsInOrder`-Test
  deckt Zuordnung + Reihenfolge bereits ab, daher harmlos; bei Gelegenheit könnte man die Matcher an
  das Label binden (`/Essen\s*17,80\s*€/`), dann sind sie unabhängig aussagekräftig.

## Positives
- Vollständige AC-Abdeckung: alle sechs ACs + beide Fehlerszenarien haben eigene Assertions;
  `summen.test.ts` prüft jede Kategorie einzeln mit `toEqual` gegen das **volle** Drei-Felder-Objekt
  (Literal statt Ergebnis-Rückgriff) – deckt sich mit `testing-standards.md`.
- Sauberer Schnitt statt Redundanz: `sonstigeCents` ersatzlos entfernt (kein toter Sammel-Topf),
  begründet in ADR-027 (Konsumenten-Check per `grep` bestätigt – nur `app/_verzehr/`).
- Reihenfolge Getränke · Essen · Kaffee ist an einer Stelle (`CATEGORY_ORDER`) verankert und im
  Component-Test per einzelnem Reihenfolge-Regex verifiziert (AC-4) – nicht durch drei unabhängige
  Präsenz-Checks aufgeweicht.
- Kanonische Quellen synchron gehalten: veraltete „(Getränke/Sonstige)"-Kommentare in `summen.ts`,
  `summen.test.ts` und `VerzehrErfassung.tsx:21` konsequent angeglichen; ADR-025 mit Cross-Ref auf
  ADR-027 versehen (Codify W-02/W-03).
- `app/_verzehr/` bleibt route-neutral – keine neuen `app/<feature>`-Imports; Änderung strikt auf
  reine Lese-/Anzeige-Logik begrenzt (kein `db/`, keine Actions/Migrationen, Kassier-/Spenden-Logik
  unberührt). Scope exakt eingehalten.
- Alle 23 Tests grün (`summen.test.ts` + `VerzehrErfassung.test.tsx`).

## Empfehlung
APPROVED
