## Codify-Report: Task 351

### Muster-Analyse

Beide Review-Runden und die Security-Review zu #351 fanden ausschließlich Findings, die
bereits durch bestehende Lessons abgedeckt sind:

1. **Wichtig-Finding (Runde 1):** Dateikopf von `db/catalog.test.ts` driftete durch die eigene
   PR-Änderung („nicht-destruktiv … per id" stimmte nach dem Fix nicht mehr). Exakt das Muster
   aus Lesson „PR ändert die von einer Doku beschriebene Mechanik → Prosa im selben PR
   nachziehen" (#211/#176) – wurde in `/implement`-Rework korrekt behoben, keine neue Regel
   nötig.
2. **Nitpick (Runde 2):** Ein im selben PR neu angelegter `kleinfunde.md`-Eintrag
   (`db/veranstaltung.test.ts`) zitierte einen zu engen Anker (`:112-116` statt `:109-116`) –
   ein zweites Vorkommnis der Lesson „Kleinfunde.md-Eintrag mit `Datei:Zeile`-Ankern braucht
   denselben Drift-Check" (#291). Neu daran: die Drift entstand hier nicht durch spätere
   Folge-Commits (wie bei #291), sondern schon bei der **Erstverifikation** – die zitierte
   Zeilenspanne deckte nicht die volle „Was"-Behauptung ab.
3. **Nitpick (Runde 2, unadressiert):** Fehlender Fail-closed-Guard
   (`expect(catalogIds).not.toContain(STANDARD_CATALOG_ID)`) vor der generischen Löschung in
   `cleanupCreatedRows()`. Reviewer selbst stufte dies bewusst als Nitpick ohne erreichbaren
   Auslöser ein und empfahl `kleinfunde.md` statt Rework, falls nicht umgesetzt.
4. **Out-of-Scope-Fund:** dieselbe FK-Cleanup-Lücke in `db/veranstaltung.test.ts` – wurde
   korrekt sofort als `kleinfunde.md`-Eintrag verankert (nicht nur als Session-Notiz erwähnt),
   genau wie die Lesson „Als ‚separat geflaggt' markierter Fund bleibt Session-Notiz" (#345)
   es verlangt. Positives Signal: die Lesson griff hier ohne weitere Intervention.

Security-Review: PASSED, keine Findings. Keine neue Sicherheitsklasse berührt (reine
Test-Datei, kein Produktionscode).

### Vorgenommene Änderungen

- **`docs/factory/lessons/factory-workflow.md`** – Lesson zu #291 um „zweites Vorkommnis
  (#351)" ergänzt: die Regel gilt nicht nur bei Drift *nach* der Anlage eines
  `kleinfunde.md`-Eintrags, sondern schon bei der Erstverifikation, wenn die zitierte
  Zeilenspanne nicht den vollen beschriebenen Sachverhalt abdeckt.
- **`docs/factory/PROJECT-CONTEXT.md`** – zugehörige Index-Zeile um den #351-Verweis ergänzt.
- **`docs/factory/kleinfunde.md`**:
  - Anker des `db/veranstaltung.test.ts`-Eintrags von `:112-116` auf `:109-116` korrigiert
    (der Review-Runde-2-Nitpick war noch offen).
  - Neuer Eintrag für den unadressierten Fail-closed-Guard-Nitpick zu
    `STANDARD_CATALOG_ID` in `db/catalog.test.ts:163-172` ergänzt (Schritt B, ADR-043 –
    kein erreichbarer Auslöser, unter der Issue-Schwelle).

### Keine weiteren Änderungen nötig

~~Die Task-Log-Symmetrie-Lücke (Runde-2-Nitpick zu `tasks/task-351-…md:48`, fehlender
Vor-Fix-Disclaimer analog zur Spec) bleibt als reine Doku-Feinheit ohne Produktionscode-Bezug
unadressiert~~ – **Korrektur (zweiter `/security-review`-Lauf, 2026-09-23):** `eb7cd0d`
(`/refactor`, nach diesem Codify-Report entstanden) hat den Disclaimer nachgetragen
(`tasks/task-351-…md:521`). Diese Zeile war zum Zeitpunkt ihres Schreibens korrekt, ist aber
durch einen späteren Commit überholt worden – kein Merge-Blocker, keine Generalisierung über
diese Task hinaus erkennbar. Kein neuer Check, keine neue CLAUDE.md-Regel: das Muster
„Doku-Drift durch eigene PR-Änderung" und „Kleinfunde-Anker-Drift" sind bereits als generische,
wiederholt zutreffende Lessons verankert; #351 bestätigt ihre Gültigkeit, statt eine neue
Fehlerklasse aufzudecken.

### Nachtrag: Skill-Reihenfolge-Verstoß führte zu teurem Security-Review-Re-Lauf

Commit-Historie dieser Task: `2d88506` (`/security-review`, PASSED) lief **vor** `da0fb30`
(`/codify`) und `eb7cd0d`/`9e90e7f` (`/refactor`) – entgegen der kanonischen Pipeline-Reihenfolge
in `CLAUDE.md` (`/review → /test → /refactor → /security-review → /codify`). Dadurch deckte der
erste Security-Report nur 5 der am Ende 10 geänderten Dateien ab und war beim tatsächlichen
Abschluss der Task bereits stale; `/security-review` musste komplett erneut laufen (siehe
`tasks/security-351.md`, „zweiter Lauf"). Neue Lesson dazu in
[`lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md) + Index-Zeile in
`PROJECT-CONTEXT.md` – Stage-2-Skills (manueller Einzelaufruf) prüfen die kanonische Reihenfolge
nicht selbst; das bleibt in dieser Session zu beachten.

### Empfehlung für nächste Features

Bei jedem `kleinfunde.md`-Eintrag mit `Datei:Zeile`-Anker: vor dem Abschluss die zitierte
Zeilenspanne gegen die **volle** „Was"-Beschreibung gegenlesen, nicht nur gegen den
auffälligsten Teilsatz – das war hier die eigentliche Ursache, nicht nachträgliche Drift.
