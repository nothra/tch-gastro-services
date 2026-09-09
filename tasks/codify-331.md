## Codify-Report: Task #331

### Neue Regeln hinzugefügt
_(keine)_

### Keine Änderungen nötig

Review (`tasks/review-331.md`) und Security-Review (`tasks/security-331.md`) sind beide ohne
kritische oder wichtige Findings durchgelaufen (APPROVED / PASSED). Die einzigen Findings waren
optionale Nitpicks:
- Header-Duplikation zwischen zwei kleinen Response-Buildern (`lib/theke-throttle-response.ts`) –
  bereits durch die bestehende Clean-Code-Regel „kein Over-Engineering für 3-Zeilen-Funktionen"
  abgedeckt (Extraktion erst beim dritten Vorkommen); kein neues Muster.
- Ein Testname, der mehr Vergleich versprach, als er prüfte – im selben `/test`-Schritt behoben
  (echter Cross-Check statt hartkodierter Literale). Ein Einzelfall, keine wiederkehrende Lücke,
  die eine eigene Lesson rechtfertigt.
- Ein reiner Hinweis zu `X-Content-Type-Options: nosniff` auf statischen 429-Antworten ohne
  Nutzereingaben – Security-Agent selbst hat das als kein Sicherheitsrisiko eingestuft, kein Issue,
  kein Kleinfund.

Das eigentliche auslösende Muster dieses Bugs – **ein früher Gate-/Drossel-Zweig vor einer
Server-Action-Route muss deren Antwortprotokoll einhalten, sonst globaler Client-Crash statt
Inline-Fehler** – ist bereits als Lesson aus #297 in
`docs/factory/PROJECT-CONTEXT.md` → `lessons/next-auth.md` indexiert und verlinkt explizit auf
dieses Issue (#331) als den Fall, in dem die Lücke schlagend wurde. Es gibt nichts nachzuziehen:
Die Lesson beschrieb das Risiko bereits vor der Implementierung korrekt: ADR-048 D5 hatte den
Drossel-Zweig für den Server-Action-Pfad eingeführt (#297), ohne dessen Antwortprotokoll
einzuhalten – genau das hat #331 nachträglich behoben. Kein zweites Vorkommen desselben Fehlers in
diesem PR (der Lesepfad wurde bewusst nicht angefasst, D5-Discriminator unverändert).

### Empfehlung für nächste Features

Keine besondere. Die Pipeline (Bug-Fix → Review 3 Runden → Test → Refactor → Security-Review) lief
diesmal ohne Rework-Runde durch – ein Indiz dafür, dass die vorhandenen Lessons (insbesondere
next-auth.md zu Server-Action-Antwortprotokollen und testing.md zu Spiegel-Assertionen, #211) die
Implementierung schon vorab in die richtige Richtung gelenkt haben, statt erst im Review entdeckt
werden zu müssen.
