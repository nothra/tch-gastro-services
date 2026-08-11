# Review: Task 286

## Kritische Findings (müssen behoben werden)
Keine.

## Wichtige Findings (sollten behoben werden)
- [x] [scripts/checks/tests/run-tests.sh:4738-4746 (vor Fix)] Der Mutationsbeleg für den
      Abwesenheits-Guard führte nicht denselben Assert-Ausdruck (`! grep -qF "$old_line" "$skf"`)
      gegen die mutierte Fixture aus, sondern eine unabhängige, tautologische `grep -qF`-Prüfung
      auf genau den String, der eine Zeile zuvor per `printf` selbst angehängt wurde – bewies also
      nur korrektes Quoting, nicht dass der reale Guard bei einer Rückkehr zur alten Formulierung
      tatsächlich rot würde. **Fix:** Der Mutationsbeleg führt jetzt denselben Ausdruck
      (`! grep -qF "$old_line" "$mut_286"; echo $?`) aus und prüft explizit auf `"1"`.
- [x] [.claude/commands/review.md:87-91, security-review.md:83-87, codify.md:71-75 (vor Fix)]
      Der Fehlerfall-Satz „Schlägt der Edit fehl (Datei fehlt oder ist nicht schreibbar), den
      Fund stattdessen im Report vermerken" stand byte-identisch dreifach in den Skill-Dokus,
      statt einmal zentral in `docs/factory/kleinfunde.md` (wo der Schema-Kontrakt lebt) zu
      stehen – ein Verstoß gegen ADR-043 Decision 4 ("Ein Ort je Regel, drei dünne Referenzen"),
      den die Task selbst beim Nachtrag in Patch-286b eingeführt hatte. **Fix:** Regel in den
      Kopf von `kleinfunde.md` verschoben; die drei Skill-Dokus verweisen jetzt nur noch kurz
      darauf ("Schema, Duplikat-Prüfung und Verhalten bei fehlgeschlagenem Edit stehen im
      Dateikopf").

## Nitpicks (optional)
- [ ] [docs/factory/kleinfunde.md:14-16 vs. die vier Bestandseinträge] Der Schema-Kopf verlangt
      das Verifikationsdatum im Feld **Wo** ("Datei:Zeile + Verifikationsdatum"); alle vier
      Bestandseinträge tragen das Datum stattdessen im Feld **Herkunft** (z. B. "Herkunft: #279,
      … Fundstelle verifiziert am 2026-08-05"). Nicht behoben: der exakte Wortlaut des Schemas
      ist in Spec-286/Task-286 als AK vom Menschen abgestimmt, und die AK "vier Einträge
      inhaltlich unverändert" verbietet, die Bestandseinträge anzufassen. Künftige Skills sollten
      sich am Schema-Kopf orientieren, nicht am (abweichenden) Präzedenzfall der Altbestände.
- [ ] [scripts/checks/tests/run-tests.sh, `old_unconditional_line_286()`] Hartkodiert die drei
      alten Anweisungssätze als Literale ohne Bezug zur eigentlichen Quelle – ein harmloser
      Tippfehler-Fix an einer dieser Zeilen in den Skill-Dokus würde den Abwesenheits-Guard
      grundlos rot färben. Akzeptiert: die Guards testen bewusst den *exakten historischen*
      Wortlaut, den es zu entfernen galt; ein Alias auf die aktuelle Doku wäre hier keine
      stärkere Absicherung. Kleiner Fail-closed-Fix ergänzt: unbekannter Skill-Key liefert jetzt
      einen erkennbaren Sentinel-String statt eines Leerstrings (der als `grep -F`-Pattern jede
      Zeile treffen würde).
- [ ] [.claude/commands/{review,security-review,codify}.md, Schritt B] Die Duplikat-Prüf-Regel
      ("vorher per Suche auf die Fundstelle prüfen …") steht weiterhin sinngemäß sowohl im Kopf
      von `kleinfunde.md` als auch – seit dem Zentralisierungs-Fix oben – nur noch implizit über
      den Verweis "Duplikat-Prüfung … im Dateikopf" in den drei Skill-Dokus. Bewusst nicht weiter
      verdichtet: die Skill-Dokus brauchen eine kurze, direkt lesbare Handlungsanweisung, ADR-043
      Decision 4 zielt auf große Blöcke (Schema, Tabelle), nicht auf jede Ein-Satz-Erinnerung.

## Positives
- Alle Akzeptanzkriterien aus `docs/specs/spec-286-kleinfunde-sammeldatei.md` sind einzeln gegen
  den tatsächlichen Diff verifiziert und erfüllt (Schwellen-Tabelle genau einmal, Zweifelsregel,
  Herstellbarkeits-Kriterium, Schritt-A/B-Verzweigung vor dem `create_issue_idempotent`-Block in
  allen drei Skill-Dokus, ADR-018 ↔ ADR-043 Verweise, ADR-043 Status `Accepted`).
- Portabilität konsequent beachtet: `declare -A` (nicht auf macOS-Bash 3.2 verfügbar) bewusst
  vermieden, `head -n -1` (GNU-Extension) durch ein portables `awk`-Idiom ersetzt – beides mit
  Verweis auf `clean-code.md` begründet.
- Patch-Workflow für `.claude/**` (hard-denied, ADR-042/#91) korrekt eingehalten: alle drei
  Patch-Runden (`tasks/patch-286.diff`, `-286b.diff`, `-286c.diff`) sind per `git apply --check`
  verifiziert und stimmen byte-identisch mit dem committeten Live-Zustand überein – kein Drift
  zwischen Patch-Artefakt und Endzustand.
- Fundstellen-Zeilennummern der vier Bestandseinträge in `kleinfunde.md` gegen den aktuellen
  Dateistand nachgeprüft (keine Drift seit 05./06.08.2026).
- ADR-043 Decision 3 ("kein Seam für die Sammeldatei") korrekt umgesetzt – kein neues
  `scripts/lib/add-kleinfund.sh` entstanden; die Durchsetzungsebene ist ehrlich als
  "Prompt, nicht Laufzeit" benannt (Decision 5), kein Kommentar/Testname suggeriert fälschlich
  eine Laufzeit-Garantie.
- Volle Testsuite (`scripts/checks/tests/run-tests.sh`) läuft nach allen Fixes grün:
  **900 grün, 0 rot**; `pre-commit.sh` (Lint) und `pre-push.sh` (Tests/Typecheck/Format/
  Routen-Doku/Hooks) ebenfalls grün.

## Empfehlung
APPROVED
