## Codify-Report: Task 339

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  (+ Index-Zeile in `PROJECT-CONTEXT.md`) – **drittes Vorkommnis** der #312-Lesson (Content-
  Scan-Guard blind für Tracked-Status): zwölf `scripts/*.tmp.*`-Reste aus den Review-Runden
  2/3 lagen beim `/test`-Lauf noch im Baum, obwohl eine frühere Notiz „Wegwerf-Artefakte:
  erledigt" bereits vermerkt war. Ergänzung: „Artefakte entfernt" ist eine Momentaufnahme,
  keine Dauerzusage – vor **jedem** Suite-Lauf erneut `git status --ignored` prüfen, nicht nur
  einmal pro Task. Wegen: wiederkehrendes Fehler-Muster (jetzt 3. Mal), aber keine neue
  Root-Cause – Ergänzung der bestehenden Lesson statt neuer Eintrag.
- [`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md) – Eintrag „Override-Selektoren
  ohne untere Schranke" war seit #337 inhaltlich stale (nannte `postcss`/`sharp`/`js-yaml`, die
  seither keinen Override mehr haben) plus gedriftete Zeilenverweise in zwei Einträgen. Beide
  korrigiert (Review-Runde-2-Nitpick 7).

### Issue angelegt (Schwelle: ADR-018, Schritt A – funktionaler Defekt mit reproduzierbarem Auslöser)

- **#342** – Review-Circuit-Breaker kollidiert mit dem Stale-Verdict-Guard von `run_skill()`
  (ADR-049/#310): Wenn `/review` unter `FACTORY_STAGE=3` erkennt, dass Code seit dem letzten
  Report unverändert ist (Circuit-Breaker-Fall), gab der Sub-Agent bislang nur eine
  Chat-Rückfrage aus, ohne `tasks/review-<id>.md` neu zu schreiben. Der Frische-Fingerprint
  wertet das als „Verdict aus früherem Aufruf" statt als Erfolg, retried 3x und lässt
  `run_skill()` danach `exit 1` aufrufen – das bricht die **gesamte** Pipeline hart ab statt
  der in `review.md` dokumentierten Eskalation. In dieser Task trat der Fall real auf (nach
  einem OOM-Kill mitten in Review-Runde 2) und brauchte manuelle Intervention (Report von Hand
  um eine Bestätigungsrunde ergänzt und committet). Label: `bug` + `factory-pipeline`.

### Keine Änderungen nötig (bewusst nicht umgesetzt)

- Review-Runde-2-Nitpicks 2 und 6 (Spec/Task-Zählungs-Inkonsistenz AK4; fehlende
  Re-Bewertungs-Klausel bei künftigem `^4.x`-Parent) sind reine Prosa-Feilen ohne
  Fehler-Muster-Charakter – keine Regel ableitbar, bleiben als optionale Verbesserung
  unerledigt (kein Blocker für `/pr-shepherd`).
- Die OOM-Kills während der Pipeline-Läufe sind eine Umgebungs-/Ressourcen-Frage dieser
  Maschine, kein Factory-Defekt – keine Regel dafür sinnvoll (kein reproduzierbarer,
  code-seitiger Auslöser).

### Empfehlung für nächste Features

- Issue #342 sollte vor dem nächsten OOM-/Turn-Limit-Zwischenfall in einer laufenden Review-
  Runde behoben werden – aktuell braucht jeder Circuit-Breaker-Fall eine manuelle
  Bestätigungsrunde, die dieselbe Klasse von Eingriff wiederholt.
- Vor jedem `/test`-/Suite-Lauf reflexhaft `git status --ignored` in `scripts/` prüfen, wenn
  vorherige Sub-Agenten-Schritte (Review-Rework, Verify-Skripte) liefen – nicht erst bei
  unerwartetem Rot.
