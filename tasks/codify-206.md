## Codify-Report: Task 206

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/frontend-react.md`](../docs/factory/lessons/frontend-react.md)
  „`.map`-Key aus Anzeigefeldern statt stabilem Identifier ist eine latente Kollisionsquelle" –
  wegen: einziger Rework-Grund aus Review-Runde 2 (`VerzehrAufschluesselung.tsx:34`, von zwei
  unabhängigen Personas gefunden). `key={`${category}-${name}-${size}`}` auf einem abgeleiteten
  Value-Objekt ohne stabilen Identifier (`VerzehrPositionDetail` trägt keine `catalogItemId`) ist
  bei zwei Katalog-Artikeln mit identischer Feldkombination (soft-gelöschter + neu angelegter
  Zwilling, ADR-033 D2) kollisionsanfällig. Fix war lokal (Index-Key auf deterministisch
  sortiertem, nie umgeordnetem Array) – die Regel hält den generellen Smell fest: Key aus
  mehreren Anzeigefeldern zusammengesetzt statt aus einem garantiert eindeutigen Identifier, plus
  Entscheidungsregel (Index-Key nur bei nachweislich statischer/nie umgeordneter Liste, sonst
  Identifier durchreichen).
- [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) Index-Zeile für obige
  Lesson unter „Index der ausgelagerten Learnings" (Gruppe `frontend-react.md`, Trigger:
  `/implement`, `/review` bei React/UI-Komponenten mit `.map`-Rendering).

### Keine Änderungen nötig
- Security-Review: keine Findings (nur bestätigende Hinweise zu XSS/AuthZ/IDOR) – keine neue
  Regel ableitbar.
- Übrige Review-Nitpicks (`CATEGORY_ORDER`-Export, Order-Duplikat mit `VerzehrErfassung.tsx`,
  ADR-Kommentar-Referenz, fehlendes `scope="col"`, Test-Redundanzhinweis) sind projektlokale
  Kleinigkeiten ohne wiederkehrendes Muster – bewusst nicht kodifiziert, um die Lessons nicht mit
  Einzelfällen aufzublähen. Der `CATEGORY_ORDER`-Export wurde im Refactoring bereits behoben.
- Die als „Positives" hervorgehobene SINGLE-SOURCE-Extraktion (`berichtModell.ts` →
  `app/_verzehr/positionen.ts`, byte-äquivalent gegen `git show origin/main:…` verifiziert) folgt
  bereits etablierten Regeln (route-neutrale Platzierung, ADR-039) – kein neues Learning, nur
  Bestätigung, dass die bestehende Praxis trägt.

### Empfehlung für nächste Features
Beim Extrahieren einer gemeinsamen Positions-/Zeilen-Aufbereitung in ein Value-Objekt (wie
`VerzehrPositionDetail`) von Anfang an einen stabilen Identifier mitführen, wenn er günstig
verfügbar ist (`catalogItemId`) – spart die spätere Nachfrage im Review, ob der `.map`-Key
kollisionssicher ist.
