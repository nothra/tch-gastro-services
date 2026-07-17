# Review: Task 127

Diff-Umfang: reine `docs/`-Änderung – `PROJECT-CONTEXT.md` (6 Zeilen) + neue `spec-127` +
Task-Datei. Kein Produktionscode, kein Test-Code. Review gegen die drei Personas (Backend/Logik,
Code-Qualität, Architektur) auf inhaltliche Korrektheit des Doku-Abgleichs.

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- Keine.

## Nitpicks (optional)
- [ ] `PROJECT-CONTEXT.md:39-41` „…**Kaffee** und **Essen** sind Katalogartikel mit **festem**
  Preis … gewählt bei der Erfassung": Der Zusatz „gewählt bei der Erfassung" gilt streng genommen
  für **alle** Katalogartikel (auch `getraenk`), nicht nur Kaffee/Essen. Die Betonung auf
  Kaffee/Essen ist bewusst (sie ersetzt die alten Sonderfälle „Kaffee fester Katalogpreis / Essen
  pro Abend"), inhaltlich korrekt und nicht irreführend – daher belassen. Nur als Beobachtung
  vermerkt.

## Out-of-Scope-Findings (als eigenes Issue angelegt, ADR-018)
- **Issue #130** – `docs/adr/021-geldbetraege-integer-cent.md:15` nennt „F4 Essenpreis je Abend"
  als aktuelles Beispiel eines persistierten Geldbetrags; dieses Feld existiert seit ADR-023
  §D4/§D7 nicht mehr. Gehört nicht in diesen PR (#127 betrifft nur `PROJECT-CONTEXT.md`) und ist
  ein historischer ADR (Superseding-Notiz statt Rewrite). Als `documentation`+`tech-debt` erfasst.

## Positives
- **Alle vier Akzeptanzkriterien erfüllt** und exakt gegen die kanonischen Quellen (ADR-023
  §D4/§D7, spec-49 Z. 16/20-22, spec-116) verifiziert: Essenpreis-Property entfernt; Essen als
  Katalogartikel fester Preis (Kategorie `essen`); Umbenennung „Getränke-Katalog" → „Katalog";
  Quell-Verweis gesetzt.
- **Kanonische Slugs verwendet** (`getraenk`/`kaffee`/`essen`) – deckungsgleich mit dem
  `catalog_category`-Enum aus spec-49, kein frei erfundener Begriff.
- **CLAUDE.md-Regel „Kanonische Quellen immer referenzieren" befolgt** – Verweis auf ADR-023
  §D4/§D7 an beiden geänderten Stellen; die Formulierung „Essen ist kein Feld der Veranstaltung"
  spiegelt ADR-023 Z. 20/34 wortgetreu.
- **Scope sauber eingehalten** (YAGNI): keine Änderung an bereits konsistenten Stellen (Zentrale
  Regeln, Auslagen-Kategorien, Zweck); bewusst kein brüchiger Prosa-Grep-Guard – begründet in der
  Task-Datei.
- **Restliche `docs/`-Kopien geprüft**: bis auf das out-of-scope ADR-021-Beispiel (#130) sind alle
  weiteren „Getränke-Katalog"/„Essenpreis"-Treffer legitim (Feature-/Spec-Namen bzw. korrekt als
  „entfällt/überholt" markierte Stellen).

## Empfehlung
APPROVED
