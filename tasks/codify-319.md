## Codify-Report: Task 319

> Grundlage: `tasks/review-319.md` (2 Iterationen, 4 Kritisch + 29 Wichtig + 34 Nitpicks),
> `tasks/security-319.md` (3 Härtungen), `tasks/coverage-319.md` (4 Abdeckungslücken) und die
> Selbstfunde aus `/implement`, `/refactor` und `/test`.
>
> Aufgenommen wurde nur, was **mehrfach oder mit Wirkung** aufgetreten ist – Einzelfälle ohne
> Wiederholungsgefahr bleiben in den Reports.

### Neue Regeln hinzugefügt

**[`guidelines/bash-gotchas.md` §13] `$((summe + ""))` ist kein Fehler, sondern `+ 0`** – wegen:
Der @import-Deckel war **fail-open**, obwohl er Fail-closed zusicherte: ein fehlschlagendes `awk`
lieferte einen leeren Wert, die Arithmetik addierte lautlos 0, und das Gate meldete
„✓ 0 von 1100 Zeilen" mit Exit 0, während der Kontext die Grenze um das Doppelte riss. Universeller
bash-Fallstrick mit direkter Sicherheitswirkung, deshalb in die Guideline statt in eine Lesson.
Der Eintrag nennt ausdrücklich die Gegenprobe: der **nicht-numerische** Fall bricht unter `set -u`
ab (rot) – wer nur ihn testet, hält das Gate fälschlich für abgesichert.

**[`lessons/code-style.md`] „X erzwingt Y" ist eine überprüfbare Tatsachenbehauptung über fremden
Code** – wegen: dreimal falsch im selben PR („Prettier erzwingt die Schluss-Newline" –
`.prettierignore` deckt `docs/`; „Hook und Ruleset, beide fail-closed" – der Hook ist mit
`--no-verify` umgehbar; „erzwungen durch `branch-name-check.sh`" – ein PreToolUse-Hook ohne
Push-/CI-Verdrahtung). Muster: **Plausibilität statt Prüfung**; ein Skript namens `…-check.sh`
klingt nach Gate. Im ersten Fall lag die widerlegende Information bereits im eigenen
Sitzungsverlauf. Regel: Enforcer öffnen, zwei Fragen beantworten (wo verdrahtet? was lehnt er ab?),
danach per Grep die Geschwister-Stellen suchen – solche Behauptungen treten in Rudeln auf.

**[`lessons/code-style.md`] Massen-Ersetzung beim Extrahieren eines Helfers trifft dessen eigenen
Rumpf** – wegen: Im `/refactor`-Schritt machte die Regex-Ersetzung den gerade angelegten
`claude_fixture_319` selbstrekursiv. Der Schaden wäre eine Endlosschleife zur Laufzeit gewesen,
keine Fehlermeldung. Das Warnzeichen war die Kontrollzählung „null verbliebene Vorkommen" – zu gut,
um zu stimmen, weil der neue Helfer das Muster per Definition enthält.

**[`lessons/testing.md`] Fail-closed-Zusicherung braucht einen Test, der die MESSUNG bricht** –
wegen: Zwölf Input-Tests (Grenzwert, Rekursion, Zyklus, fehlende Datei …) waren grün, während das
Gate bei ausgefallener Messung durchwinkte. Getestet war immer nur „Messung funktioniert, Ergebnis
unerwünscht". Regel: Stub im `PATH`, plus Kontrolle, dass derselbe Fixture unmanipuliert rot ist,
plus eine Assertion gegen die vorgetäuschte Summe – der Exit-Code allein unterscheidet nicht
zwischen „gemessen und abgelehnt" und „nichts gemessen".

**[`lessons/testing.md`] Content-Scan-Guard mit der Suchphrase als Literal in der gescannten
Datei** – wegen: Ein Abwesenheits-Guard über `run-tests.sh` enthielt seine eigene verbotene Phrase
als Argument und war damit nie erfüllbar. Verwandt mit #312 (Scan blind für Tracked-Status), aber
eigenständig: dort war eine fremde Datei die Störquelle, hier die geprüfte selbst.

**[`lessons/testing.md`] Ein Anker, der mit `-` beginnt, macht die assert-Helfer still falsch** –
wegen: `grep -qF "$2"` ohne `--` liest ihn als Option; der Präsenz-Guard wird rot, obwohl die
Phrase in der Datei steht. Die Fehldiagnose („warum fehlt der Satz?") kostet Zeit. **Dritter Fall
derselben `clean-code.md`-Regel in einer Task** – die anderen zwei: ein Ad-hoc-`grep -nF` auf eine
mit `- ` beginnende Zeile und die Argument-Injection-Fläche `@-v` im Gate selbst.

**[`lessons/factory-workflow.md`] Neues Gate: prüfen, ob eine ADR den Ort für Gates dieser Klasse
schon entschieden hat** – wegen: ADR-047 verankerte den Deckel mit „einer einzelnen Testzeile als
CI-Arm" – genau der Konstruktion, die ADR-041 für `config-validation` als „zufällig und fragil"
verworfen und durch einen eigenen Required-Check ersetzt hatte, ohne ADR-041 zu erwähnen. Nicht die
Entscheidung war falsch, sondern dass die bestehende Grundsatzentscheidung zur selben Frage nicht
gewogen wurde (Präzedenz-Drift).

Dazu **sechs Index-Zeilen** in `PROJECT-CONTEXT.md` mit „Laden bei"-Trigger (ADR-037-Konvention);
der bash-Gotcha braucht keine, weil `bash-gotchas.md` bereits in der Trigger-Liste von `CLAUDE.md`
steht.

### Bewusst keine Regel daraus gemacht

- **Die zwei falschen Agenten-Behauptungen** (ein Review-Agent zur `sed`-Semantik, ein
  Security-Agent zum Exit-Code des nicht-numerischen Falls) sind **kein neues** Learning – Lesson
  #314 deckt sie ab und hat in dieser Task zweimal funktioniert. Kein Bedarf für eine achte Regel;
  die vorhandene hat sich bewährt.
- **Ein Check gegen falsche Erzwingungs-Behauptungen** wäre ein Gate aus Reflex: „X erzwingt Y" ist
  nicht verlässlich grep-bar, und ein unscharfes Gate erzeugt mehr Fehlalarme als Nutzen
  (`OPERATING.md` §5.1). Die Regel bleibt Kontext, nicht Automatik.
- **Der `--`-Fix in den geteilten assert-Helfern** ist unterhalb der Schwelle (zwei Zeichen je
  Stelle) und liegt als Eintrag in `docs/factory/kleinfunde.md`. Kein Issue.

### Kein neues Issue

Die einzige Folge-Arbeit oberhalb der Schwelle ist bereits als
[#328](https://github.com/nothra/tch-gastro-services/issues/328) erfasst (eigener CI-Required-Check
für den Deckel, braucht eine Ruleset-Änderung nach ADR-029 und damit Adminrechte).

### Was überraschend gut funktioniert hat

- **Die Mutationsbeleg-Pflicht** (Lesson #286) hat sich in dieser Task selbst verteidigt: Der erste
  Trigger-Mutationsbeleg scheiterte still, weil BSD-`sed` das Muster `**Laden bei:**` als
  Repetition-Operator ablehnt – aufgefallen nur, weil die Mutation eine Assertion röten *musste*
  und es nicht tat.
- **Die eigenständige Nachprüfung von Agenten-Behauptungen** hat zwei Fehler in Review-Reports
  gefangen, ohne die Reports zu entwerten – beide Agenten lieferten überwiegend korrekte, scharfe
  Findings.
- **Der Deckel wirkt sofort auf den eigenen Prozess:** dieser `/codify`-Lauf hat den
  @import-Kontext von 863 auf 869 Zeilen wachsen lassen und damit 231 Zeilen Luft übrig. Genau der
  Mechanismus, der ADR-037 fehlte, greift jetzt bei jedem Learning – sichtbar statt unbemerkt.

### Empfehlung für nächste Features

1. **Bei jeder Behauptung über ein Gate den Enforcer öffnen.** Das ist die billigste der sieben
   neuen Regeln und hätte in dieser Task allein drei Review-Findings verhindert.
2. **Beim Bauen eines Gates zuerst fragen, wie seine Messung ausfallen kann** – nicht nur, welche
   Inputs es ablehnen soll. Der Testfall dafür ist ein fünfzeiliger Stub.
3. **Task-Zuschnitt:** Entscheidung + Umsetzung + neues Gate + Doku-Migration in einem PR hat zwei
   Review-Iterationen gebraucht und den Circuit Breaker fast ausgereizt. Die Kombination war hier
   bewusst gewählt (die Trennung hatte den Punkt bei ADR-037 zweimal liegen lassen) und hat sich
   gelohnt – als Regelfall taugt sie nicht.
