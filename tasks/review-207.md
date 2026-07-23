# Review: Task 207

> Multi-Persona-Review (Runde 1 Logik/Korrektheit, Runde 2 Clean Code, Runde 3 Architektur).
> Diff-Scope: `git diff origin/main...HEAD` (nur #207). Alle Findings sind **im Scope** dieses
> PR – kein Out-of-Scope-Issue angelegt.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle drei Runden bestätigen: `create_issue` byte-identisch (ADR-040 §1), Exit-Code-Kontrakt
0/1/2 korrekt, fail-open/fail-closed-Kaskade korrekt, stdout-Hygiene erfüllt, Scope auf 3 Aufrufer
begrenzt, keine neue jq-Abhängigkeit, ADR-Status/-Querverweise gepflegt.

## Wichtige Findings (sollten behoben werden)

- [x] **[scripts/lib/create-issue.sh:5] Datei-Header ist jetzt faktisch falsch** _(behoben, Rework 1)_ – der Modul-Docstring
  behauptet „stellt **EINE** Funktion bereit" und dokumentiert nur `create_issue`. Seit #207 gibt es
  zwei öffentliche Einstiegspunkte. Header um `create_issue_idempotent` (opt-in-Idempotenz-Semantik +
  Verweis auf ADR-040) ergänzen. *Begründung: clean-code.md verlangt korrekte Kommentare; ein Header,
  der die zweite Public-Funktion verschweigt, führt jeden Erstleser der bewusst gepflegten Seam-Lib in
  die Irre.*
- [x] **[scripts/lib/create-issue.sh:184] Numerik-Guard `''|*[!0-9]*)` ist durch keinen Test erreicht** _(behoben, Rework 1)_ –
  alle `FAKE_OPEN`-Fixtures liefern rein numerische Nummer-Zeilen, es läuft stets nur der `*)`-Zweig.
  *Begründung: testing-standards.md („Exhaustiveness-Guards … brauchen einen eigenen Test") + 100 %
  Coverage für neuen Code. Fixture ergänzen, z. B. `FAKE_OPEN=$(printf 'x\nMüll\n123\nEchter Titel\n')`,
  die belegt, dass die Nicht-Zahl übersprungen und der echte Treffer trotzdem gefunden wird.*
- [x] **[scripts/checks/tests/run-tests.sh] `set -euo pipefail` nur für den Treffer-Pfad getestet** _(behoben, Rework 1)_ –
  die errexit-empfindlichen Pfade (No-Match-`while read`-Heredoc-Schleife, `raw=$(...) || return 2`,
  `existing=$(...) || rc=$?`) laufen in keinem strict-mode-Test. Der Code ist manuell als korrekt
  verifiziert, aber unverriegelt. *Begründung: Ein künftiger Umbau, der unter errexit im No-Match-/
  Fail-open-Pfad abbricht, liefert nichts auf stdout → Skill wertet es als Fehler → Retry → genau das
  Duplikat, das #207 verhindern soll; der grüne Testlauf bemerkt das nicht. Fix: `idem()` selbst unter
  `set -euo pipefail` sourcen, oder je eine strict-mode-Assertion für No-Match und Fail-open ergänzen.*
- [x] **[scripts/checks/tests/run-tests.sh] F2 (Label-Degradation / fail-closed-Anlage) über den neuen
  Einstiegspunkt ungetestet** _(behoben, Rework 1)_ – kein Test treibt eine Label-Ablehnung durch `create_issue_idempotent`
  (Stub lässt `issue create` immer gelingen). Delegation ist verbatim (geringes Risiko), aber F2 ist ein
  deklariertes AC des Wrappers. *Fix: ein Test mit ablehnendem `issue create`-Stub durch
  `create_issue_idempotent` (No-Match-Pfad), der Degradation + Exit-Semantik prüft.*

## Nitpicks (optional)

- [x] **[scripts/checks/tests/run-tests.sh:826] AC5b erfasst `out`, prüft es aber nicht** _(behoben, Rework 1)_ – der
  Umkehr-Teilstring-Fall grept nur `issue create`; zur Symmetrie mit AC5a zusätzlich `out = 123` (+ `rc`)
  asserten, sonst ist `out` toter Ballast.
- [x] **[scripts/lib/create-issue.sh:170] `--limit 100` ohne Begründung** _(behoben, Rework 1)_ – bei >100 Substring-Treffern
  könnte ein älterer exakter Treffer fehlen. Für den Dedup-Zweck ungefährlich (fail-open-artig: höchstens
  ein Duplikat, kein verlorener Fund); ein Ein-Wort-Kommentar „warum 100 genügt" wäre nett.
- [ ] **[scripts/lib/create-issue.sh:187-189] Heredoc statt idiomatischem `<<<"$raw"`** – rein kosmetisch,
  Verhalten identisch.
- [ ] **[scripts/lib/create-issue.sh:83-85 vs. 164-166] Repo-Args-Ableitung dupliziert** – identischer
  3-Zeilen-Block in `create_issue` und `_cri_find_open_issue_by_title`. Extraktion in Bash unangenehm
  (array-rückgebender Helfer braucht Bash-4.3-nameref; macOS-Standard-Bash 3.2 kann das nicht) → Belassen
  vertretbar. Entscheidung beim Entwickler.
- [ ] **[scripts/lib/create-issue.sh:175] Flag `expect_num`** – ein sprechenderer Boolean-Name
  (`expecting_number`) würde die kleine State-Machine ohne Kommentar lesbar machen. Minimal.
- [ ] **[run-tests.sh AC3-Block] „geschlossen wird ignoriert" quasi-tautologisch** – der Stub ignoriert
  `--state` und kann das Herausfiltern geschlossener Issues nicht selbst zeigen (an gh delegiert). Der
  Test beweist nur, dass `--state open` mitgeschickt wird. Akzeptable Stub-Grenze.

## Positives

- **Verhaltensbasierte Testtiefe:** AC4 verankert die eigentliche Garantie („zwei Läufe, identischer
  Titel → genau EINE Anlage") statt nur Implementierungsdetails; dazu Bestandspfad-Regression + Treffer-
  Pfad unter `set -euo pipefail`. Genau die Testtiefe, die ADR-040 „deterministisch mit gh-Stub testbar"
  verspricht.
- **SRP sauber getrennt:** reiner Lookup (`_cri_find_open_issue_by_title`, dokumentierter 0/1/2-Exit-
  Kontrakt) vs. dünner Dispatch-Wrapper. Beide < 35 Zeilen.
- **Korrekte Delegation statt Kopie** – `create_issue` byte-identisch; DRY der Anlage-Logik gewahrt.
- **Bash-Robustheit:** nounset-Guard `${repo_args[@]+"…"}`, positionsbasiertes Paar-Parsing (immun gegen
  rein-numerische/Sonderzeichen-Titel), Numerik-Guard vor `-lt`, errexit-Fallen im Treffer-Pfad vermieden.
- **ADR-040 alle 5 Decision-Punkte erfüllt**, Status auf `Accepted` geflippt (Lesson #197), ADR-018-
  Querverweis nicht dangling, Mechanik-Beschreibung deckt sich mit Code (Lesson #211/#55).
- **Scope-Begrenzung negativ mitgetestet** (AC6: Bestands-Aufrufer nutzen den Wrapper NICHT); die
  bestehende #82-Skill-Doku-Assertion bleibt gültig. Keine Routen-Änderung → `docs/routes.md` unberührt.

## Re-Review (Runde 2, 2026-07-23)

Rework-Iteration 1 geprüft (inkrementeller Diff `a021a2c..6ee640a`): alle vier WICHTIG-Findings und die
beiden übernommenen Nitpicks (N1, N2) sind behoben. W1 (Header nennt beide Funktionen), W2 (Guard-Zweig
`''|*[!0-9]*)` durch einen Test erzwungen), W3 (No-Match- **und** Fail-open-Pfad unter `set -euo pipefail`
verriegelt), W4 (Label-Degradation über `create_issue_idempotent` abgedeckt). Keine neuen Findings, keine
Regression: `create_issue_idempotent`-Logik unverändert (nur Kommentare + Tests ergänzt), Bash-Suite
436 grün, kein `.claude/**`-/Routen-Impact. Die bewusst offen gelassenen Nitpicks (Heredoc statt `<<<`,
repo_args-Duplikat wegen Bash-3.2-nameref-Grenze, Flag-Name `expect_num`, AC3-Stub-Grenze) bleiben als
vertretbare Trade-offs akzeptiert.

## Empfehlung

APPROVED
