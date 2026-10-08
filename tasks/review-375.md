# Review: Task 375

Iteration 3 (2026-10-08). Diff-Scope: `git diff origin/main...HEAD` (6 Dateien, reine Doku). Der
Rework-2-Stand ist committet (`b8448b7`, `git status` sauber). Geprüft wurden das
Iteration-2-Finding und die drei neuen Zeilen der Abweichungsliste.

**Iteration-2-Findings:**

- W1 ist erledigt, und zwar nach Variante (a). Die Regel „Doppelpunkt nur bei ‚nicht möglich'"
  bleibt eng. Die drei Meldungen der Mehrfach-Anlage stehen jetzt in der Liste
  (`docs/ux/glossar.md:148–150`), mit Ziel #401.
- Die Anker sind per `grep -n` gegen den Baum belegt:
  - `actions.ts:101` (`GLEICHZEITIG_ERFASST`)
  - `:104` (`nichtsAngelegt`, Rumpf bis `:107`)
  - `:353` („Nicht mehr wählbar")
  - `:357` („Bereits erfasst")
- An #401 hängt ein Nachtrag-Kommentar. Er nennt den Umfang und die Test-Anker. Das Issue ist offen.
- Der Nitpick aus Iteration 2 (Auffangzeile für sonstige Fehler) ist nicht umgesetzt. Er war
  optional und steht unten weiter als Nitpick.

**Gegenprobe Doppelpunkt-Regel:** Alle Treffer von „nicht möglich" in `app/` wurden geprüft:
`actions.ts:75/:82/:84/:86/:455` und `LinkKopieren.tsx:45`. Sie folgen dem Muster mit Doppelpunkt.
Die einzige Ausnahme ist `LinkKopieren.tsx:45` mit Gedankenstrich, und genau diese Zeile ist in der
Liste (→ #372). Weitere Doppelpunkt-Meldungen außerhalb des Musters gibt es nur in `nichtsAngelegt`
bzw. `GLEICHZEITIG_ERFASST`, und die stehen jetzt in der Liste.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [ ] [docs/ux/glossar.md:148] Im Soll-Text steht „hinzugefügt" doppelt: „Hinzufügen nicht möglich:
  <Namen> bereits hinzugefügt. Es wurde niemand hinzugefügt." Das ist korrekt, liest sich aber
  holprig. Wer #401 umsetzt, darf das glätten, z. B. „<Namen> ist/sind bereits dabei". Der
  FS2-Zusatz aus #369 muss dabei erhalten bleiben. Hinweis zur Umsetzung: `nichtsAngelegt` baut
  heute `<Grund>: <Namen>.`. Das Soll stellt den Grund **hinter** die Namen, die Funktion muss
  dafür also umgebaut werden. Das ist Sache von #401, nicht dieses PRs.
- [ ] [docs/ux/glossar.md:41–49] Offen aus Iteration 2: Eine Auffangzeile „Sonstiger Fehler:
  Sachsatz mit Punkt" fehlt. Sie würde Texte wie „Die Veranstaltung ist abgeschlossen und
  schreibgeschützt." ausdrücklich als konform kennzeichnen.

## Positives

- Der Rework ist minimal und genau: Er ändert drei Listenzeilen und die Task-Notiz, sonst nichts.
  Die Regel wurde nicht aufgeweicht, um Listenzeilen zu sparen.
- Der FS2-Zusatz „Es wurde niemand hinzugefügt." bleibt im Soll ausdrücklich erhalten, mit Bezug auf
  #369. Die fachliche Anforderung geht also nicht verloren.
- Die Out-of-Scope-Folgearbeit ist im Ziel-Issue #401 hinterlegt (Kommentar mit Test-Ankern
  `actions.test.ts:961/:969`). Sie hängt nicht nur in der Task-Datei.
- Rework-Ende mit Commit und sauberem Working Tree (Lesson #391 eingehalten).
- Keine Routen-, Code- oder ADR-Änderung. AK2.2 (Import-Kontext-Limit) ist unverändert grün.

## Empfehlung

APPROVED
