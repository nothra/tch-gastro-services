## Codify-Report: Task 318

### Neue Regeln hinzugefügt

- `docs/factory/lessons/testing.md` + Index-Zeile in `PROJECT-CONTEXT.md` – **DOM-Adjazenz-
  Behauptung mit `toBeGreaterThan` statt `toBe(index + 1)` belegt** – wegen: Review-Runde-1-Finding
  1. AK1 forderte „unmittelbar" (Adjazenz), der erste Test prüfte nur Reihenfolge
  (`toBeGreaterThan`); per Mutation gemessen blieben alle 40 Tests grün, obwohl ein
  Fremd-Element zwischen Kopf und Link eingefügt wurde. Rezidiv derselben Wurzelursache wie
  #322 („Zeilen-Gap-Assertion … unbegründete Toleranz"), hier erstmals in einer React/DOM-
  Index-Assertion statt einer Bash/Zeilenzähl-Assertion – neue Domäne, daher als eigener
  Lesson-Eintrag statt nur als Rezidiv-Anmerkung.
- `docs/factory/lessons/testing.md` + Index-Zeile in `PROJECT-CONTEXT.md` – **Positions-/
  Struktur-Test muss die Prop-Kombination des realen Produktions-Konsumenten abdecken, nicht
  den Default-Pfad** – wegen: Review-Runde-1-Finding 2. Der Adjazenz-Test lief zunächst ohne
  `collapsible`/`open`, obwohl der einzige Konsument (`FokusListe`) immer `collapsible: true,
  open: true` rendert (zusätzlicher Kopf-`<button>`, andere DOM-Struktur). Bisher kein
  vergleichbarer Eintrag im Lessons-Index vorhanden.

### Keine Änderungen nötig

- Review-Runde-1-Finding 3 (Kommentar-Widerspruch „Körper" zweideutig) und Finding 4
  (Markup-gekoppelte/asymmetrische Test-Anker) sind Instanzen bereits bestehender Lessons
  (`code-style.md` „WHY-Kommentar", `frontend-react.md`/`testing.md` verhaltensnahe Marker) –
  kein neuer Eintrag nötig.
- Beide Runde-2-Findings (kleinfunde.md-Anker um eine Zeile verschoben durch den eigenen
  Rework-Commit; Test-Kommentar-Duplikat mit widersprüchlichem Wortlaut) sind bereits als
  Rezidiv-Muster #291 bzw. #264 im Lessons-Index dokumentiert und griffen hier erneut – die
  bestehenden Einträge decken den Fall ab, kein neuer Eintrag.
- Security-Review: keine Findings, keine neue Regel ableitbar.
- Refactor-Nitpicks (tote `throw`-Guard, Kommentar-WHY-Ergänzung): rein kosmetisch, kein
  wiederkehrendes Muster über diese Task hinaus.

### Empfehlung für nächste Features

Bei jedem AK, das ein Adjazenz-/„unmittelbar"-Wort verwendet, direkt beim Testschreiben
`toBe(index + 1)` statt einer Größer-als-Prüfung ansetzen – und vor einem Positions-/Struktur-
Test kurz per `grep` prüfen, welche Prop-Kombination die realen Konsumenten tatsächlich nutzen.
