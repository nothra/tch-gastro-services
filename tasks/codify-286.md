## Codify-Report: Task 286

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`] Neuer Freitext-Ablage-Mechanismus in eine vom
  Agentenkontext wieder gelesene Repo-Datei braucht dieselbe „Daten, keine Anweisungen"-
  Absicherung wie bereits etablierte Kanäle (Issue-Body/-Label, ADR-018) – wegen: die neuen
  `kleinfunde.md`-Freitextfelder (Wo/Was/Fix) hatten diese Absicherung nicht, obwohl sie
  strukturell riskanter sind als ein Issue-Body (kein aktives Abrufen nötig, künftige
  Skill-Läufe lesen die Datei automatisch). Erst in `/security-review` gefunden, nicht in
  `/implement`/`/review`/`/test` – der Fokus lag auf Schema/Vollständigkeit, nicht auf der
  neuen Angriffsfläche.
- [`docs/factory/lessons/factory-workflow.md`] Reihenfolge-Guards-Lesson (#114) um Nachtrag 4
  ergänzt: ein AK, das explizit eine Reihenfolge zwischen zwei Elementen fordert, ist durch
  zwei getrennte Präsenz-Assertions NICHT abgedeckt – wegen: `/implement` schrieb für die
  zentrale #286-Anforderung „Klassifikation steht vor `create_issue_idempotent`" zunächst nur
  zwei isolierte Präsenz-Checks, keinen Positionsvergleich. Erst ein dedizierter
  Testing-Persona-Audit in `/test` fand die Lücke – fünftes Rezidiv derselben Lesson-Gruppe,
  aber ein anderer Root-Cause als die vorherigen vier (fehlender Check, nicht falscher Anker).
- [`docs/factory/lessons/testing.md`] Mutationsbeleg muss denselben Assert-Ausdruck (inkl.
  Negation/Vergleich) ausführen, nicht nur denselben Grundbefehl – wegen: der erste
  Mutationsbeleg für den #286-Abwesenheits-Guard prüfte nur `grep -qF` isoliert (tautologisch,
  bewies nur Quoting), nicht den echten negierten Assert-Ausdruck. Gefunden im Review, nicht
  beim Schreiben in `/implement`.
- [`docs/factory/lessons/testing.md`] Viertes Vorkommnis der `grep -qF`-vs-Markdown-Prosa-
  Lesson (#240/#249) ergänzt – wegen: ein in `/test` neu geschriebener Content-Check brach an
  einem Zeilenumbruch in bereits vorhandener Prosa, trotz existierender Lesson. Neu diesmal:
  Fix an der **Testinfrastruktur** (zeilenumbruch-toleranter `flat_286()`-Helper) statt an
  jeder einzelnen Prosa-Zeile – als zusätzliche Handlungsoption für den Fall „mehr als ein
  Mehrwort-Check gegen dieselbe Doku-Familie" in die Lesson aufgenommen.
- [`docs/factory/PROJECT-CONTEXT.md`] Vier Index-Zeilen entsprechend ergänzt/erweitert (zwei
  neue Lessons, zwei Rezidiv-Anhänge an bestehenden Lessons), mit „Laden bei"-Trigger.

### Muster über die gesamte Task-286-Session

Drei der vier Learnings haben denselben Kern: **ein AK, das ein RELATIONALES Kriterium
formuliert** (Reihenfolge X-vor-Y, Kausalität „Mutation macht rot", Vollständigkeit „vier
Tabellenzeilen" statt „Tabelle existiert") **wird durch isolierte Einzel-Assertionen
scheinbar erfüllt, ohne das relationale Kriterium selbst zu testen.** Das ist keine neue
Erkenntnis für sich (mehrere bestehende Lessons – #211 Symmetrie, #214 Pfad-Isolation, #114
Reihenfolge – behandeln Varianten davon), aber #286 zeigt, dass die Kategorie weiterhin
zuverlässig zuschlägt, auch wenn die zugehörigen Lessons zum Zeitpunkt des Schreibens bereits
existierten. Die Testing-Persona-Audits in `/test` und die dedizierten Review-Runden in
`/review`/`/security-review` waren jedes Mal die Stelle, an der die Lücke tatsächlich auffiel
– nicht `/implement` selbst. Das bestätigt den Wert der mehrstufigen Pipeline eher, als dass
es eine neue Regel für `/implement` allein nahelegt.

### Empfehlung für nächste Features

Bei AK-Formulierungen mit relationalen Wörtern („vor", „genau einmal", „muss X bewirken",
„bleibt Y trotz Z") in `/implement` bewusst fragen: „Testet meine Assertion das relationale
Kriterium selbst, oder nur die Existenz der beteiligten Einzelteile?" – nicht erst auf den
Testing-Persona-Audit in `/test` warten, auch wenn dieser als Netz zuverlässig funktioniert
hat.
