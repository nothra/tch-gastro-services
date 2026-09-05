# Coverage: Task 319

> Stand `c6d0c0d` + `/test`-Ergänzungen · Suite: `bash scripts/checks/tests/run-tests.sh`
> → **1430 grün, 0 rot**, davon **108 Assertions** in den beiden `#319`-Blöcken.

## 1 · Welches Instrument zuständig ist – und welches nicht

Der Diff besteht aus **18 Markdown-Dateien und 3 Shell-Skripten**; `git diff --name-only
origin/main...HEAD | grep -cE '\.(ts|tsx)$'` ergibt **0**. Die in `PROJECT-CONTEXT.md`
hinterlegte Coverage-Schwelle (80 %, `pnpm test:coverage`) misst Vitest-Coverage über den
Produktcode unter `app/`, `db/`, `lib/` – dieser Task berührt davon keine Zeile. Ein
Coverage-Lauf wäre hier kein Nachweis, sondern eine Messung an einem unveränderten Gegenstand;
die Zahl könnte sich nur durch Fremdänderungen bewegen.

Zuständig ist stattdessen die Bash-Self-Test-Suite, in der die Factory-Gates abgesichert sind.
`pnpm test` (Vitest, 773 Tests) und `pnpm typecheck` laufen weiterhin bei **jedem** Push über das
pre-push-Gate und waren in allen Läufen dieser Task grün – als Regressionsnachweis, nicht als
Abdeckungsnachweis für diesen Diff.

**Konsequenz für die 80 %-Schwelle:** nicht anwendbar, nicht verfehlt. Neuer Code dieses Tasks
sind zwei Bash-Skripte; deren Abdeckung wird unten pro Verhalten ausgewiesen.

## 2 · Abdeckung des neuen Gates (`import-context-limit-check.sh`)

Jeder Verhaltenspfad des Skripts ist mindestens einmal assertiert:

| Pfad | Abgedeckt durch |
|------|-----------------|
| Summe unter der Grenze → exit 0 | Test 1 (+ realer Repo-Stand) |
| **Grenzwert exakt** (`total == MAX`) → exit 0 | Test 2 |
| **Grenzwert +1** → exit 1 | Test 2 (schließt die `-gt`/`-ge`-Mutation aus) |
| Einstiegsdatei allein zu groß | Test 3 |
| Referenzierte Datei zu groß | Test 4 |
| Summen-Logik (zwei je-für-sich zulässige Dateien) | Test 5 |
| Rekursion über geschachtelte Imports | Test 6 (+ Mutation ohne den Beitrag) |
| Zyklus terminiert **und** zählt einmal | Test 9 (Exit **und** Summe assertiert) |
| Fail-closed: Referenz-Zeile unlesbar | Test 7 |
| Fail-closed: Einstiegsdatei fehlt (eigene Meldung) | Test 8 |
| Fail-closed: Projektwurzel unerreichbar (eigene Meldung) | Test 8 |
| Regel 2: sechs Inline-Formen (nackt, fett, kursiv, `>`, Satzzeichen, geklammert) | Test 10, je Form eine eigene Assertion |
| Regel 2 Gegenrichtung: Prosa-/npm-Token ohne Auflösung | Test 11 |
| Regel 1b: Prosa-Zeile, die mit `@` beginnt | Test 12 (+ Gegenprobe, dass die einwortige Zeile fail-closed bleibt) |
| Regel 1: Pfad mit Leerzeichen | Test 13 |
| Zeilenzählung ohne Schluss-Newline | Test 14 |
| Sortierung der Beiträger-Liste | Test 4 (Positionsvergleich, nicht zwei Präsenz-Checks) |
| Ausgabe nennt Ist-Summe und Grenze | Test 1 |
| Konstante ↔ dokumentierte Herleitung | rechnerische Assertion, **beide** Werte aus dem Skript gelesen |

Verdrahtung und Wirkung im Push-Gate: Aufrufzeilen-Anker **plus** E2E-Verhaltenstest (Blockade
und Durchlass) **plus** Mutation (ohne `FAILED=1` blockiert derselbe rote Deckel nicht mehr).

## 3 · AK-Abdeckungsmatrix (spec-319)

| AK | Abgedeckt durch | Bemerkung |
|----|-----------------|-----------|
| AC1 Entscheidung getroffen | ADR-047 §1/§2 + `## Status Accepted`-Guard | Inhalt einer ADR ist nur begrenzt testbar; der Status-Guard hält die Lesson aus #197 |
| AC2 keine Kosten-Messung als Vorbedingung | – (reine ADR-Prosa) | bewusst untestiert: keine mechanisch prüfbare Aussage |
| AC3 Gate-Risiko adressiert | Kurzregel-Präsenz (`umgehbar`, kein „beide fail-closed"), Trigger je Datei mit Mutation, Referenz-Guard über alle vier nicht importierten Guidelines in beide Richtungen | |
| AC4 Index-Wachstum mitentschieden | **neu:** `PROJECT-CONTEXT.md` ist Teil des gedeckelten Sets (+ Mutation) | war die größte Lücke – ohne diese Zeile liefe der Lessons-Index wieder ungedeckelt, und alle übrigen Deckel-Tests blieben grün |
| AC5 kein Regelverlust | Präsenz **und Rumpf-Größe** der drei verschobenen Abschnitte; **neu:** alle Regel-Abschnitte der zwei verdichteten Dateien (+ Diskriminierungs-Kontrolle) | |
| AC6 vollzogen, nicht beschrieben | `@import`-Zeilen: zwei entfernt, drei vorhanden; realer Deckel-Lauf gegen den echten Repo-Stand | |
| AC7 Zahlen dokumentiert | – (Task-Datei + PR-Body) | bewusst untestiert, s. §5 |
| AC8 keine toten Links | **neu:** Dead-Link-Guard über die 16 Dateien dieses Tasks, mit Positiv- **und** Negativ-Kontrolle des Helfers | in dieser Task zweimal real aufgetreten |
| AC9 `.claude/**`-Patch | – (nicht zutreffend, gegengeprüft) | ein Test auf „keine Änderung" hätte keinen Aussagewert |

## 4 · Test-Qualität (geprüft, nicht angenommen)

- **Verhalten statt Implementierung:** Die Deckel-Tests rufen das echte Skript über `FACTORY_DIR`
  gegen Fixtures auf und prüfen Exit-Code und Ausgabe – keine internen Funktionen, keine Mocks.
  Die Doku-Guards sind naturgemäß Textprüfungen; sie ankern auf Aussagen, nicht auf Formatierung.
- **Mutationsbelege führen denselben Assert-Ausdruck aus** (Lesson #286): Rekursion, Inline-Form,
  Aufrufzeile, `FAILED=1`, Trigger je Datei, `PROJECT-CONTEXT.md`-Import. Jeder belegt Kausalität,
  nicht nur Syntax.
- **Diskriminierungs-Kontrollen** für die zwei neuen Helfer: der Abschnitts-Helfer meldet eine
  fehlende Überschrift, der Link-Helfer meldet einen toten und schweigt bei einem guten Link.
- **Isolation:** jeder Fall baut sein Fixture selbst (die eine Reihenfolge-Abhängigkeit im
  Satzzeichen-Fall wurde im Rework behoben); die Temp-Verzeichnisse werden am Blockende entfernt.
- **Determinismus:** kein `sleep` als Timing-Annahme. Der einzige `sleep` ist ein 15-s-Watchdog
  gegen einen Endlos-Zyklus – bei einer Skript-Laufzeit von 0,08 s ist das ~190-facher Spielraum;
  er kann nur feuern, wenn der Zyklus-Schutz tatsächlich bricht (dann ist Rot richtig).
- **Namen:** jede Assertion nennt Task-Nummer, geprüfte Eigenschaft und – wo sinnvoll – die
  erwartete Zahl, sodass ein Fehlschlag ohne Quelltextlektüre einzuordnen ist.

## 5 · Bewusst nicht getestet (mit Begründung)

- **AC2 und AC7** sind Aussagen über Prosa in ADR, Task-Datei und PR-Body. Ein Guard auf die
  Zahlen wäre entweder tautologisch (er läse dieselbe Quelle) oder er würde bei jeder legitimen
  Zeilenänderung rot – die Herleitungs-Basis ist ausdrücklich ein **historischer** Wert
  („Ist-Stand direkt nach der Umstellung"), kein laufender Ist-Stand.
- **Vollständigkeit der erkannten Einbettungsformen.** Getestet sind die sechs Formen, für die
  das Ladeverhalten empirisch belegt ist. Dass es keine siebte gibt, ist nicht beweisbar; die
  Restgrenze steht deshalb im Skript-Header und in ADR §4, statt Vollständigkeit zu behaupten.
- **Der E2E-Test setzt voraus, dass die Checks 4 und 5 sich überspringen**, wenn ihre Skripte im
  Temp-Root fehlen. Würde einer davon künftig fail-closed abbrechen, bräche der Test mit einem
  irreführenden Rot. Notiert, nicht abgesichert – ein Guard dagegen wäre ein Test über einen
  hypothetischen Zustand.
- **Repo-weiter Dead-Link-Check.** Der neue Guard deckt die 16 Dateien dieses Tasks ab, nicht das
  ganze Repo. Eine Ausweitung wäre ein eigenes Gate mit eigener Fehlerlast und gehört nicht in
  diesen Task (`OPERATING.md` §5.1: kein Check-Skript aus Reflex – hier gerechtfertigt, weil der
  Defekt in dieser Task zweimal eingetreten ist, aber eben für diese Dateien).

## 6 · Ergebnis

- `bash scripts/checks/tests/run-tests.sh` → **1430 grün, 0 rot**
- `pnpm test` (Vitest, 773 Tests) und `pnpm typecheck` → grün über das pre-push-Gate
- Vier Abdeckungslücken gefunden und geschlossen (AC4, AC5, AC8, ADR-Status); kein
  Produktionscode in diesem Schritt geändert
