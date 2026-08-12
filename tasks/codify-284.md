## Codify-Report: Task 284

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  „Nachtrag 5" zur Lesson „Reihenfolge-Guards: Kommando ≠ Prosa-Erwähnung" (aus #114) – sechstes
  Rezidiv: Der kritische Review-Runde-1-Fund von #284 (AK3-Guard durch den eigenen, im selben PR
  neu verfassten WHY-Kommentar prosa-erfüllbar) ist eine neue Auslöse-Variante derselben
  Fehlerklasse – die Kollisionsquelle ist hier kein vorbestehender Fremd-Kommentar, sondern eine
  Doku-Ergänzung, die derselbe PR/Schritt gerade erst einführt. Index-Zeile in
  `docs/factory/PROJECT-CONTEXT.md` ergänzt. – wegen: Review-Runde-1-Finding (kritisch, behoben).
- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) neue Lesson
  „Positivkontrolle für einen Mutations-Fixture darf nicht denselben Fail-closed-Pfad eines
  anderen Guards teilen" (aus #284) – der erste Versuch, eine Positivkontrolle aus einem
  bereits vorhandenen Mutanten zu bauen, schlug tatsächlich fehl, weil der wiederverwendete
  Mutant (leerer `on:`-Block) selbst eine Fail-closed-Vorbedingung des Kontroll-Guards verletzte.
  Ergänzt Lesson #214 um den Fall, dass auch der **grüne** Kontroll-Pfad isoliert werden muss,
  nicht nur der rote Ziel-Pfad. Index-Zeile in `PROJECT-CONTEXT.md` ergänzt. – wegen:
  Review-Runde-2-Nitpick + /test-Selbstfund.
- [`docs/factory/guidelines/bash-gotchas.md`](../docs/factory/guidelines/bash-gotchas.md)
  Addendum zu Gotcha #3 (`grep -q` in einer Pipe + `pipefail` → SIGPIPE-Falschrot): Wird das
  Pipe-Ergebnis zusätzlich negiert (`! producer | grep -q muster`), kippt die Falle von
  Falschrot in **Falschgrün** – ausgerechnet im Fund-Fall, den der Guard fangen soll. In #284
  proaktiv vermieden (Here-String statt Pipe für `poll_trigger_guard`), nicht als Bug gefunden –
  die Konsequenz war in der bisherigen Lesson nicht explizit benannt. – wegen: bewusste
  Implementierungs-Entscheidung, die den generalisierbaren Fall erstmals sichtbar machte.

### Keine Änderungen nötig

- Die übrigen Review-Runde-1-Findings (falsche Kausalkette im WHY-Kommentar, kopierte
  Fehlaussage in `factory-poll.sh`, ADR-012-Drift) sind Instanzen bereits vorhandener Lessons
  (`code-style.md` „Fix auf kopierte Geschwister-Stellen ausweiten", #211/#176 „ADR/Doku-Drift im
  selben PR mitpflegen") – kein neuer Regel-Text nötig, nur die im Task korrekt angewandte
  bestehende Regel.
- Die Mutationsbeleg-Konstruktion (awk-Einfügung statt `printf >>`) ist eine korrekte Anwendung
  der bereits dokumentierten #255-Lesson, keine Erweiterung.
- Kein neuer Check in `scripts/checks/` – die Guards dieses Tasks leben bereits in
  `scripts/checks/tests/run-tests.sh`, kein zusätzliches Automatisierungs-Bedürfnis erkennbar.
- Kein Folge-Issue über die Schwelle: Der einzige Out-of-Scope-Fund (`.issue-npm-pin.md`) liegt
  bereits als Kleinfund in `docs/factory/kleinfunde.md` (Rework-Notiz vom Review-Runde-1-Fix).

### Empfehlung für nächste Features

- Wird in einem PR im selben Zug ein Fragment-Grep-Guard **und** ein die geguardete
  Zeichenfolge zitierender Kommentar/Doku-Satz hinzugefügt, sofort auf Block-Extraktion
  (`awk`-Block statt dateiweiter `grep`) umstellen – unabhängig davon, ob heute schon eine
  Prosa-Kollision sichtbar ist (siehe Nachtrag 5, #114-Familie).
- Beim Bau einer Positivkontrolle für einen Mutations-Fixture nicht reflexhaft einen bereits
  vorhandenen Mutanten wiederverwenden; die Kontrolle selbst einmal laufen lassen und grün
  verifizieren, bevor sie als Beleg gilt (RED-vor-GREEN gilt auch für Kontrollen).
- Bei Guard-Funktionen mit `grep -q` in einer Pipe unter `pipefail`: prüfen, ob das Ergebnis
  irgendwo negiert verwendet wird – dann Here-String/Variable statt Pipe, sonst kippt die
  SIGPIPE-Falle von Falschrot in unsichtbares Falschgrün.
