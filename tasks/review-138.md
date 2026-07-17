# Review: Task 138

## Kritische Findings (müssen behoben werden)
- _Keine._

## Wichtige Findings (sollten behoben werden)
- _Keine._

## Nitpicks (optional)
- [ ] [app/_verzehr/VerzehrErfassung.tsx:86] Die Reihenfolge der Kopf-Summe (Getränke ·
  Essen · Kaffee) ist als drei hartkodierte Feld-Zugriffe ausgeschrieben, während die Sektionen
  darunter über `CATEGORY_ORDER` (Z.22) iterieren. Bei nur drei festen Kategorien unkritisch,
  und der Exhaustiveness-Guard in `summen.ts` fängt eine vierte Kategorie als Compile-Fehler ab.
  Eine Ableitung aus `CATEGORY_ORDER` + `category → cents`-Mapping wäre DRY, lohnt die
  Zusatz-Indirektion hier aber nicht (YAGNI). Kosmetisch, kein Verhaltensfehler.

## Positives
- Vollständige AC-Abdeckung: alle sechs ACs + beide Fehlerszenarien haben eigene Assertions.
  `summen.test.ts` prüft jede Kategorie einzeln mit `toEqual` gegen das **volle** Drei-Felder-
  Objekt (Literal statt Ergebnis-Rückgriff) – konform zu `testing-standards.md`. Der Component-
  Test verifiziert Reihenfolge (AC-4) und 0,00-€-Sichtbarkeit (AC-5) je in einem eigenen Regex.
- Sauberer Schnitt statt Redundanz: `sonstigeCents` ersatzlos entfernt. Konsumenten-Check im
  Review unabhängig verifiziert (`grep` → `zeileSummen`/`ZeileSummen`/`sonstigeCents` nur in
  `app/_verzehr/`, einziger Call-Site `VerzehrErfassung.tsx:75`; kein Kassier-/Verzehr-Gesamt-
  Pfad betroffen) → AC-6 bestätigt.
- Exhaustiveness-Guard (`const _exhaustive: never`) statt implizitem `else`: eine künftige vierte
  Katalog-Kategorie fällt als Compile-Fehler auf, statt still als Kaffee zu zählen – fail-closed
  statt fail-open. Beide Nitpicks der Vorrunde (impliziter Kaffee-Zweig; lose Test-Matcher) sind
  im Refactoring behoben; Matcher jetzt an die Labels gebunden (`/Essen\s*17,80\s*€/`).
- Architektur sauber: `app/_verzehr/` bleibt route-neutral (keine `app/<feature>`-Imports,
  `CATEGORY_LABEL` aus lokalem `./category-labels`), reine DB-freie Lese-Logik. ADR-027 als
  fokussierte Refinement-ADR angelegt, ADR-025 mit Cross-Ref versehen; veraltete
  „(Getränke/Sonstige)"-Kommentare in allen drei Dateien angeglichen (Codify W-02/W-03).
- Alle 29 Tests im Verzeichnis grün (`summen.test.ts` + `VerzehrErfassung.test.tsx` + Nachbarn).

## Empfehlung
APPROVED
