## Codify-Report: Task 353

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/db-drizzle.md`](../docs/factory/lessons/db-drizzle.md) – „Zweiter
  Fehler-Übersetzungs-Wrapper um einen einzelnen DB-Call: Catch-Scope exakt auf den riskanten
  Aufruf begrenzen" – wegen: Review-Runde-1-Finding (Wichtig) dieser Task. Der erste Entwurf des
  FK-Violation-Fixes wickelte den `try/catch` um die gesamte restliche Funktion
  (`createCatalogItemAction`), nicht nur um den riskanten `createItem`-Aufruf – ein Fehler aus
  `revalidatePath` wäre fälschlich derselben Nutzermeldung zugeordnet worden. Generalisierbares
  Muster: Jeder zweite, spezifische Error-Translation-Wrapper (analog zu `runWithUniqueCheck`)
  gehört eng um genau den einen DB-Aufruf, den er behandelt.
- [`docs/factory/PROJECT-CONTEXT.md`](../docs/factory/PROJECT-CONTEXT.md) – passende
  Index-Zeile mit „Laden bei"-Trigger unter der `db-drizzle.md`-Gruppe ergänzt (bereits durch
  den Gruppen-Header abgedeckt: `/implement`, `/review`, `/test` bei Data-Layer).

### Keine Änderungen nötig
- Der Root-Cause-Fehler selbst (FK-Violation `23503` bei client-gelesener `catalogId`) war
  bereits vollständig als Lesson dokumentiert (aus #345, Security-Review-Hinweis) – dieser Task
  ist die Umsetzung des dort bereits empfohlenen Fixes, kein neues Muster an dieser Stelle.
- Review-Runde-2-Nitpicks (Funktionsname `runCreateItem` beschrieb nur einen Teil des
  Verhaltens; Typ-Herleitung über `Parameters<>`/`Awaited<ReturnType<>>` statt benannter
  Typ-Importe) wurden im selben Task per `/refactor` behoben. Beides erstmalige Einzelfälle
  ohne erkennbares Wiederholungsmuster – keine eigene Lesson, um den Lessons-Index nicht mit
  Einzelfall-Nitpicks aufzublähen. Bei erneutem Auftreten (z. B. eine weitere kleine
  Wrapper-Funktion, deren Name nur den ersten Aufruf beschreibt) lohnt sich dann eine
  `code-style.md`-Lesson.
- Security-Review-Hinweis „kein Logging der abgefangenen FK-Violation" ist konsistent mit dem
  bereits bestehenden Muster in `runWithUniqueCheck` (dort ebenfalls kein Logging) – keine
  Regression durch diesen Task, daher kein Issue/`kleinfunde.md`-Eintrag. Explizit als
  „kein Blocker" im Security-Report vermerkt.

### Empfehlung für nächste Features
- Beim nächsten `/implement`, das einen zweiten Error-Translation-Wrapper neben einem
  bestehenden (`runWithUniqueCheck`-artigen) einführt, die neue Lesson in `db-drizzle.md`
  vorab lesen – spart eine Review-Runde.
- Kleine Wrapper-Funktionen, die einen Fehlerfall in einen zweiten Rückgabezweig übersetzen,
  gleich beim ersten Entwurf so benennen, dass der Name beide Zweige (Erfolg + Fehlerfall)
  widerspiegelt, nicht nur den ersten aufgerufenen Ausdruck – spart die Review-Runde-2-Nitpick-
  Korrektur.
