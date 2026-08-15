# Review: Task 298

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
_Keine._

## Nitpicks (optional)
- [ ] [scripts/checks/tests/run-tests.sh:3821] Regressions-Guard testet die Kombination
  „`pr_state≠MERGED` + `unpushed` nicht-numerisch" nur mit `pr_state=OPEN`. Spec-298
  Fehlerszenario 2 nennt explizit `pr_state=CLOSED` + `unpushed=NO_UPSTREAM` als
  Zielszenario; dieser exakte Kombi-Fall ist nicht als eigener Testfall abgedeckt (nur
  `CLOSED`+`unpushed=0` bei AK4-Edge und `OPEN`+`NO_UPSTREAM` beim neuen Regressions-Guard,
  aber nicht kombiniert). Der Code-Pfad ist für jeden `pr_state != "MERGED"` identisch
  (`case "$unpushed"` greift unabhängig vom konkreten `pr_state`-Wert), daher kein
  Verhaltensrisiko – reine Testvollständigkeit.
- [ ] [scripts/checks/tests/run-tests.sh:3807] Ebenso nicht kombiniert getestet: Spec-298
  Fehlerszenario 1 (`pr_state` leer/nicht verwertbar **und gleichzeitig** `unpushed`
  nicht-numerisch). F1 (leerer `pr_state`, `unpushed=0`) und F2 (nicht-numerisch,
  `pr_shepherd=false`) sind getrennt abgedeckt, die Kombination beider Bedingungen bei
  `pr_shepherd=true` nicht explizit. Gleiche Einordnung: Code-Pfad identisch zum
  bestehenden F2-Fall, kein Risiko.

## Positives
- Root-Cause-Fix ist chirurgisch minimal: exakt der in Spec/Task beschriebene
  MERGED-Kurzschluss wurde vor die Unpushed-Prüfung gezogen, der dadurch unreachable
  gewordene alte Block sauber entfernt – keine tote Zeile, kein Scope Creep.
  (`scripts/lib/verify-final-state.sh:43–48`)
- Code-Reihenfolge stimmt exakt mit der in `spec-298` verlangten Priorität überein
  (Tree-Check → MERGED-Kurzschluss → Unpushed-Check → restliche PR-Invarianten), und der
  Funktionskopf-Kommentar wurde konsistent mitgepflegt (Meldungs-Priorität-Zeile).
- Regressionstests sauber auf beiden Ebenen (reine `evaluate_final_state()` **und**
  I/O-`verify_final_state()` mit echtem `git`-Repo + `push origin --delete`) – reproduziert
  das reale Branch-Auto-Delete-Szenario aus Issue #298 statt es nur zu simulieren.
- Tree-Check-vor-Kurzschluss explizit per eigenem Regressionstest (dirty+MERGED) belegt,
  nicht nur behauptet – genau der in Spec/AK geforderte Guard.
- ADR-040-Nachtrag folgt dem etablierten Muster (ADR-019 „Nachträge") und wurde im
  selben PR aktualisiert (Lesson `factory-workflow.md` „PR ändert die von einer ADR
  namentlich beschriebene Mechanik").
- Task-Datei enthält Root Cause, Fix-Kurzform und einen konkreten Codify-Hinweis
  (Reihenfolge bei neuem Erfolgs-Kurzschluss in einer Guard-Clause-Kette).
- Volle Test-Suite (`run-tests.sh`: 1036/1036, `pnpm test`: 687 passed) läuft grün, keine
  Regression.

## Empfehlung
APPROVED
