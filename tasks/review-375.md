# Review: Task 375

Iteration 2 (2026-10-08). Diff-Scope: `git diff origin/main...HEAD` (6 Dateien, reine Doku). Der
Rework-Stand ist committet (`cfc11c0`, `git status` sauber). Geprüft wurden die Iteration-1-Findings
und die neuen Regeln: `import-context-limit-check.sh` meldet 929 von 1100 Zeilen (grün). Alle
Meldungstexte in `app/` (ohne Tests) wurden per Grep gegen die neue Meldungstabelle gehalten. Die
Rework-Aussage „Feldmeldungen enden alle mit Punkt, ‚Name fehlt' gibt es im Produktionscode nicht"
stimmt (`app/**/schema.ts`, `actions.ts`).

**Iteration-1-Findings:** W1 erledigt (Tabelle unterscheidet abgelehnte Aktion, Feld-Validierung,
„nicht gefunden", „Kein Zugriff"; der Infinitiv „Bitte … wählen." ist als Sachsatz geregelt). W2
erledigt (`LinkKopieren.tsx:45` → #372, Anker belegt). Nitpick 1 erledigt (Kommentarzeile gestrichen,
unter „Ausnahmen" festgehalten). Nitpick 2 erledigt (Regel „Doppelpunkt nur bei ‚nicht möglich'"
mit Ausnahme für „Kein Zugriff – …").

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [docs/ux/glossar.md:54] **Die neue Doppelpunkt-Regel erzeugt Abweichungen, die nicht in der
  Liste stehen.** Die Regel „Doppelpunkt nur bei ‚nicht möglich'" (aus dem W1-Rework) trifft
  bestehende Meldungen der Mehrfach-Anlage im Teilnehmer-Dialog:
  - `app/veranstaltung/actions.ts:357` → „Bereits erfasst: <Namen>. Es wurde niemand hinzugefügt."
    (über `nichtsAngelegt`, `actions.ts:104–106`)
  - `app/veranstaltung/actions.ts:101` → „Bereits erfasst: jemand aus der Auswahl wurde gerade auf
    einem anderen Gerät erfasst. Es wurde niemand hinzugefügt."
  - `app/veranstaltung/actions.ts:353` → „Nicht mehr wählbar: <Namen>. Es wurde niemand hinzugefügt."

  `:357` und `:101` verstoßen außerdem gegen die Verb-Regel: Es geht um das **Hinzufügen** eines
  Teilnehmers zur Veranstaltung, die Meldung sagt aber „erfasst". Das ist dieselbe Abweichung wie
  in der gelisteten Zeile `TeilnehmerHinzufuegenDialog.tsx:97` („… bereits erfasst" → „… bereits
  hinzugefügt"). Die Task-Notiz nennt „bereits erfasst" sogar ausdrücklich als #401-Fall, die
  Tabelle führt aber nur die Dialogzeile. Die Abweichungsliste erhebt den Anspruch, die
  abweichenden Ist-Texte zu führen. Sonst findet #372/#401 diese Stellen nicht, oder ein späteres
  `/review` meldet sie als neuen Verstoß. Die zugehörigen Tests hängen am Wortlaut
  (`app/veranstaltung/actions.test.ts:961`, `:969`).

  **Fix (eine der beiden Varianten):**
  - (a) Drei Zeilen ergänzen, z. B. „Hinzufügen nicht möglich: <Namen> bereits hinzugefügt." bzw.
    „Hinzufügen nicht möglich: <Namen> nicht mehr wählbar." → #372 (Meldungstexte) oder #401.
  - (b) Die Regel so fassen, dass „<Grund>: <Namensliste>." als zulässiges Aufzählungsmuster gilt.
    Dann bleibt nur die Verb-Abweichung „erfasst" → „hinzugefügt" für `:357`/`:101` als
    Listenzeile übrig.

## Nitpicks (optional)

- [ ] [docs/ux/glossar.md:41–49] Mehrere bestehende Fehlertexte passen in keine Tabellenzeile,
  z. B. „Die Veranstaltung ist abgeschlossen und schreibgeschützt.", „Kein Katalog angegeben.",
  „Ein Artikel mit dieser Bezeichnung und Größe existiert bereits.", „Zu viele Anfragen – bitte
  kurz warten." (`app/veranstaltung/actions.ts:65`, `:71`; `app/verwaltung/katalog/actions.ts:21`,
  `:23`). Sie erfüllen die Satzzeichen-Regel und sind damit wohl konform. Eine Auffangzeile
  „Sonstiger Fehler: Sachsatz mit Punkt" würde das ausdrücklich machen. Ohne sie könnte #372 diese
  Texte für Umschreib-Kandidaten halten.

## Positives

- Der W1-Rework ist sauber: Die Meldungstabelle trennt die Fehlerarten mit belegten Beispielen. Die
  Grep-Gegenprobe gegen `schema.ts`/`actions.ts` ist in der Task-Datei dokumentiert und stimmt.
- Die Ausnahme „Kein Zugriff – …" beseitigt den Konflikt mit der Doppelpunkt-Regel ausdrücklich.
- Die „Walk-in"-Kommentare stehen jetzt widerspruchsfrei unter „Ausnahmen", passend zum Kopf
  („Nicht betroffen: Code-Kommentare").
- Rework-Ende mit Commit und sauberem Working Tree (Lesson #391 eingehalten). Die Task-Datei
  dokumentiert Iteration 1 und Rework 1 nachvollziehbar.
- Weiterhin keine Routen-, Code- oder ADR-Änderung. Die PROJECT-CONTEXT-Zeile ist genau eine
  Zeile, AK2.2 ist grün.

## Empfehlung

NEEDS_REWORK
