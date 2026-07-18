## Codify-Report: Task 53

### Neue Regeln hinzugefügt

- **`docs/factory/PROJECT-CONTEXT.md` → „Orphan-sichere Joins: Snapshot-Referenz kann
  verschwinden, auch wenn die Business-Entity bleibt"** – wegen: Review-Finding K1
  (Runde 1, `tasks/review-53.md`). `listAuslagen` jointe anfangs per INNER JOIN auf
  `veranstaltung_zeile`, um den Anzeigenamen zu snapshotten; `auslage` hat aber keinen FK
  auf `zeile`. Wurde die Zeile gelöscht, verschwand die (ggf. bereits `erstattet`e) Auslage
  still aus Übersicht, Summen und der F8-Kassenabrechnung – ein stiller Kassen-Datenverlust
  bei unverändertem DB-Bestand. Neue Regel: INNER JOIN auf eine Tabelle, die nicht die
  Existenzgrundlage der eigenen Zeile ist, ist ein Kandidat für stillen Datenverlust in
  Listen/Summen – LEFT JOIN + COALESCE-Fallback auf eine stabilere Quelle verwenden, mit
  Integrationstest, der die referenzierte Zeile löscht und Sichtbarkeit/Summenwirksamkeit
  danach prüft.

- **`docs/factory/PROJECT-CONTEXT.md` → „Formular-Reset nach jeder Erfassung: key-Remount
  wirkt nur einmalig"** – wegen: Review-Finding W1 (Runde 1). Ein key-basierter Remount zum
  Leeren eines Formulars nach erfolgreicher Erfassung wirkt nur beim ersten Erfolg
  zuverlässig, wenn der Key sich danach nicht mehr ändert – Folge-Erfassungen behalten die
  alten Werte. Neue Regel: `formRef.current?.reset()` in einem `useCallback`-Wrapper um die
  Action verwenden (kein key-Remount, kein `useEffect`); Testfälle müssen mindestens zwei
  aufeinanderfolgende erfolgreiche Submits prüfen, nicht nur den ersten.

### Bereits durch bestehende Regeln abgedeckt (keine neue Regel nötig)

- **W2 (Betrag-Meldungsinhalt ungetestet):** Exakt der Fall, den Codify #116/#117 bereits
  beschreiben (Ablehnungs-Test ≠ Meldungs-Test; je separierbarem AC-Kriterium eine eigene
  Assertion). Die bestehenden Regeln haben den Fund im Review korrekt vorhergesagt und die
  Behebung (drei separate `firstIssueMessage`-Assertionen) folgt exakt dem dort
  dokumentierten Muster. Kein Update nötig – die Regeln haben funktioniert, wurden im
  ursprünglichen Draft aber trotzdem übersehen. Kein neues Muster, daher keine Verschärfung;
  wiederholtes Übersehen trotz dokumentierter Regel wird beobachtet, nicht sofort neu
  geregelt (kein zweites Auftreten in dieser Task).
- **IDOR-Bindung, `.returning()`-Typen, `active`-Guard, Zod-Obergrenzen:** Alle bereits
  durch Codify #48–#51 abgedeckt und in dieser Task korrekt angewendet (Review bestätigt
  dies explizit unter „Positives").

### Bewusst keine Regel (Nitpicks ohne generalisierbares Muster)

- Die übrigen Review-Nitpicks (Hidden-Input-Duplikation, Magic-Number-Konstante,
  Flag-Parameter-Grenzfall, ADR-Wortlaut-Präzisierung, `factory.config.yml`-Tuning im
  Feature-Diff) sind entweder bereits in `/refactor` behoben oder explizit als YAGNI/
  Out-of-Scope begründet (`tasks/task-53-auslagenerstattung.md` → Refactoring-Notizen).
  Keines zeigt ein wiederkehrendes, projektübergreifendes Muster – keine neue Regel.
- Security-Review: PASSED ohne kritische/wichtige Findings; der einzige Hinweis
  (`veranstaltungId` aus client-kontrolliertem FormData bei `setStatus`/`remove`) ist
  bereits durch die bestehende IDOR-Regel (Codify #51) strukturell abgesichert und als
  „kein Vuln" bewertet – keine neue Regel nötig.

### Empfehlung für nächste Features

- Beim Entwurf von Listen-/Summen-Queries, die einen Anzeigewert aus einer zweiten Tabelle
  snapshotten, immer zuerst fragen: „Kann diese zweite Zeile gelöscht werden, während meine
  eigene Zeile bestehen bleibt?" – wenn ja, LEFT JOIN von Anfang an, nicht erst nach einem
  Review-Fund.
- Prozess-/Tooling-Änderungen (z. B. `factory.config.yml`-Tuning), die während einer Task
  nötig werden, nach Möglichkeit in einem separaten `chore:`-PR statt im Feature-Diff
  bündeln (ADR-019/#91) – in Task 53 nur als Nitpick vermerkt, kein Blocker, aber sauberer.
