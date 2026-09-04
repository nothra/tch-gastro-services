# Task 319: adr-import-kontext-guidelines

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
@import-Umgang mit den 5 Guidelines-Dateien in `CLAUDE.md` entscheiden **und umsetzen**
(offener Posten aus ADR-037, herausgelöst aus dem Nachtrag zu #314). Auftraggeber-Entscheidung:
abweichend von der Issue-Abgrenzung ("Umsetzung ist ein Folge-Task") liefert dieser Task ADR
**plus** vollzogene Umstellung – die Trennung hat den Punkt bei ADR-037 zwei Runden liegen lassen.
Spec: [`docs/specs/spec-319-adr-import-kontext-guidelines.md`](../docs/specs/spec-319-adr-import-kontext-guidelines.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
Entscheidung:
- [x] AC1 – @import-Umgang (Mechanismus und/oder Umfang) für alle 5 Guidelines entschieden (einer der 4 Issue-Kandidaten oder begründete Kombination)
- [x] AC2 – Begründung ohne Kosten-Messwerte prüfbar, je Kandidat mit dessen eigener Argumentationsart; keine Option vorab ausgeschlossen
- [x] AC3 – Risiko "Gate-Regel wird durch Nicht-Laden still verletzt" explizit adressiert
- [x] AC4 – Zusatzbefund "Lessons-Index wächst zurück" (PROJECT-CONTEXT.md) in derselben ADR mitentschieden
- [x] AC5 – Normativer Gehalt bleibt gültig; Prosa-/Narrativ-Kürzung (Kandidat 3) ausdrücklich erlaubt, Regelverlust nicht

Umsetzung (in diesem Task):
- [x] AC6 – Gewählter Mechanismus im Repo tatsächlich angewandt, nicht nur beschrieben
- [x] AC7 – Neuer @import-Zeilen-/Wortstand gegen Ausgangswert (1.376 / 9.812) im PR dokumentiert
- [x] AC8 – Verweise konsistent, kanonische Quelle je Regel eindeutig, keine toten Links
- [x] AC9 – `.claude/**`-Anteil (falls nötig) als `tasks/patch-319.diff`, `git apply --check` grün

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**Entscheidung: [ADR-047](../docs/adr/047-import-kontext-guidelines-nach-erzwungenheit.md)** –
Schnitt nach *Erzwungenheit*: eine Guideline darf den Dauerkontext verlassen, wenn ein
Gate/Hook/Ruleset sie fail-closed erzwingt; wo sie nur durch Gelesenwerden wirkt, bleibt sie.

| Datei | Aktion |
|-------|--------|
| `git-workflow.md` (390) | raus aus `@import` + ~10 Kern-Kurzregeln & „Laden bei"-Trigger inline |
| `architecture-principles.md` (79) | raus aus `@import` + Trigger (`/architecture`, `/review`) |
| `clean-code.md` (131) | bleibt unverändert geladen |
| `tdd-principles.md` (84) | bleibt geladen, verdichten (Didaktik-Prosa raus, Red→Green→Refactor + Granularität bleibt) |
| `testing-standards.md` (181) | bleibt geladen, verdichten; die 3 lessons-artigen Abschnitte (Exhaustiveness-Guards, Mock-Default mit leerem Array, Coverage-Ausgabe/ADR-040) nach `lessons/testing.md` verschieben |

Zielrichtwert: Guidelines-Block 865 → ~250, `@import` gesamt 1.410 → ~800 (exakte Zahl messen, AC7).

**Umsetzungs-Schritte (Reihenfolge empfohlen):**

1. **Verdichten + verschieben** (`tdd-principles.md`, `testing-standards.md` → `lessons/testing.md`)
   verlustfrei: vorher ein **Regel-Inventar** erheben, nachher gegenprüfen (AC5). Die drei
   verschobenen Abschnitte brauchen je eine Index-Zeile mit „Laden bei"-Trigger in
   `PROJECT-CONTEXT.md` (ADR-037-Konvention) – das lässt den Index leicht wachsen, netto bleibt
   die Reduktion.
2. **`CLAUDE.md`**: die zwei `@import`-Zeilen entfernen, Kern-Kurzregeln + Trigger einsetzen.
   Formatvorbild ist der bestehende Kommentarblock zu `token-efficiency.md`/`bash-gotchas.md`/
   `lessons/` (CLAUDE.md:108–118) – kein neues Format erfinden.
3. **Deckel-Check** `scripts/checks/` (Name analog `routes-doc-check.sh`/`hooks-installed-check.sh`),
   verdrahtet in `pre-push.sh`: löst `@`-Zeilen ab `CLAUDE.md` **rekursiv** auf, summiert Zeilen,
   vergleicht gegen eine Konstante (Ist nach Umstellung + ~25 %, aufgerundet auf 50, Herleitung
   als Kommentar an der Konstante – keine Magic Number). **Fail-closed**, wenn eine referenzierte
   Datei nicht lesbar ist.
4. **ADR-037 präzisieren**: der Satz „Guidelines-Dateien und ihre `@import`-Einbindung bleiben
   unverändert" ist ab jetzt falsch → Verweis auf ADR-047 (kein `Superseded`, der Lessons-Teil
   bleibt gültig). Lesson: PR ändert die von einer ADR beschriebene Mechanik → ADR im selben PR
   mitpflegen (#211/#176).
5. **PR-Body** um die Vorher/Nachher-Zahlen ergänzen (AC7) – passiert **nicht** automatisch, der
   Draft-Body aus `start-work.sh` bleibt sonst stehen: `gh pr edit 327 --body "…"` (Lesson #233).

**Tests (`scripts/checks/tests/run-tests.sh`):**

- Deckel-Check gegen **Positiv- und Negativbeispiel** laufen lassen (clean-code.md → Portabilität
  in Gate-Skripten: ein Gate-Regex braucht beide Richtungen).
- Er ist ein **Kopplungs-/Drift-Guard** (liest `CLAUDE.md`, prüft die referenzierten Dateien):
  je Seite ein eigener Negativtest + Fail-closed-Test bei unlesbarer Quelle (Lesson aus #214).
- **Referenz-Guard** für die zwei ausgelagerten Dateien – Muster existiert für `bash-gotchas.md`
  in `run-tests.sh:1261-1264`, dorthin anschließen, keine dritte Schreibweise erfinden
  (Lesson #224). Ohne ihn wird eine ausgelagerte Datei zur toten Datei.
- Mutationsbeleg muss **denselben Assert-Ausdruck** ausführen, nicht nur denselben Grundbefehl
  (Lesson #286).

**Voraussichtlich kein `.claude/**`-Patch nötig** (AC9 → „nicht zutreffend" vermerken): Die
Trigger landen in `CLAUDE.md`, nicht in Skills. `architecture.md:26` nennt
`architecture-principles.md` bereits, `refactor.md:8` nennt `clean-code.md` (bleibt geladen), und
die Abschnitts-Verweise in `review.md`/`security-review.md`/`codify.md` auf `git-workflow.md`
bleiben gültig, weil die Datei bestehen bleibt. Vor Abschluss gegenprüfen – falls doch ein Skill
angepasst werden muss, `tasks/patch-319.diff` + Human-Apply.

**Nicht betroffen:** `docs/routes.md` (keine Routen), Produktcode, `lessons/`-Mechanismus selbst.

## Umsetzungs-Notizen (/implement)

**Reihenfolge:** Doku-Umstellung zuerst (der Ist-Stand danach ist die Grundlage der
Deckel-Konstante), dann TDD für den Check: Test-Block in `run-tests.sh` → RED (19 rot, alle
skript-abhängig) → `import-context-limit-check.sh` + `pre-push.sh`-Verdrahtung → GREEN
(1358 grün, 0 rot).

### AC7 – @import-Stand vorher/nachher (gemessen im Worktree)

| Datei | vorher | nachher |
|-------|-------:|--------:|
| `CLAUDE.md` | 204 | 230 |
| `docs/factory/PROJECT-CONTEXT.md` | 341 | 344 |
| `guidelines/clean-code.md` (bleibt geladen) | 131 | 131 |
| `guidelines/tdd-principles.md` (verdichtet) | 84 | 54 |
| `guidelines/testing-standards.md` (verdichtet) | 181 | 90 |
| `guidelines/architecture-principles.md` (**raus**) | 79 | – |
| `guidelines/git-workflow.md` (**raus**) | 390 | – |
| **Summe @import-Kontext** | **1.410 Zeilen / 10.401 Wörter** | **849 Zeilen / 7.443 Wörter** |

**−561 Zeilen (−39,8 %), −2.958 Wörter (−28,4 %).** Guidelines-Block: 865 → 275 Zeilen
(−68 %), Zielrichtwert der ADR war ~250. Der Ausgangswert der Spec (1.376 / 9.812) ist die
Messung aus dem Issue; im Worktree lag der Stand vor der Umstellung bei 1.410 / 10.401 (die
Dateien sind zwischen Issue-Anlage und Task-Start gewachsen) – beide Werte hier genannt, damit
die Differenz nachvollziehbar bleibt.

### AC5 – Regel-Inventar vorher/nachher (kein Regelverlust)

Methode: `git diff -U0` über die zwei verdichteten Dateien, **jede** entfernte Zeile einzeln
klassifiziert (Regel vs. Prosa/Illustration). Ergebnis:

- **Verschoben, byte-identisch** (`lessons/testing.md`, per Reconstruction-Assertion belegt:
  1.197 + 1.531 + 920 = 3.648 Bytes): „Exhaustiveness-Guards (`never`-Check)", „Mock-Default mit
  leerem Array verdeckt Mapping-Code", „Coverage-Ausgabe nur in ignorierte Pfade (ADR-040)".
  Je eine Index-Zeile mit „Laden bei"-Trigger in `PROJECT-CONTEXT.md`. Die ADR-040-Regel behält
  zusätzlich einen Einzeiler inline, weil sie jede Test-Task treffen kann.
- **Umformuliert, Regel erhalten:** Test-Granularität, „Was TDD nicht bedeutet", „Wenn TDD schwer
  fällt", Was-testen/Nicht-testen, Mocking-Regeln, Isolation, Flaky, Coverage-Anforderungen
  (Bullet-Listen → Prosa, gleicher normativer Gehalt).
- **Ersatzlos entfallen – ausschließlich Rationale/Illustration, keine Regel:** (a) Abschnitt
  „Warum Test-First?" (4 Begründungs-Bullets; die darin enthaltene Aussage „schwer testbarer Code
  ist schlecht designed" steht weiterhin unter „Wenn TDD schwer fällt"), (b) der generische
  Java-AAA-Codeblock (die Regel ARRANGE→ACT→ASSERT + „keine Logik zwischen Arrange und Act" steht
  als Prosa), (c) zwei von drei Test-Namens-Beispielen, (d) eine Arrange-Zeile im
  Tautologie-Codebeispiel (Schlecht/Gut-Paar und Faustregel unverändert).

### AC9 – `.claude/**`-Patch: nicht zutreffend

Kein Skill musste geändert werden, gegengeprüft statt angenommen: `architecture.md:26` nennt
`architecture-principles.md` bereits im „Kontext laden"-Teil (Trigger existiert), `refactor.md:8`
nennt `clean-code.md` (bleibt @importiert), und die Abschnitts-Verweise auf `git-workflow.md` in
`review.md`, `security-review.md` und `codify.md` bleiben gültig, weil die Datei bestehen bleibt –
nur ihre Einbindung ändert sich. Kein `tasks/patch-319.diff` nötig.

### Verweis-Sweep (AC8) – drei aktive Doku-Stellen nachgezogen

Nicht nur die ADR (Lesson #211), auch Prosa im Präsens (Lesson #176):

- `guidelines/token-efficiency.md` §5 behauptete, „die Guidelines" würden bei **jeder** Session
  geladen – gilt jetzt nur für drei von fünf; ergänzt um den Deckel-Check.
- `lessons/frontend-react.md` verwies für die Exhaustiveness-Guard-Regel auf
  `testing-standards.md` → jetzt `lessons/testing.md`.
- `ADR-033` §Tests verwies auf dieselbe verschobene Regel → Quellenangabe nachgezogen.
- `ADR-037` §Konsequenzen: der Satz „Guidelines-Dateien und ihre `@import`-Einbindung bleiben
  unverändert" ist durchgestrichen + auf ADR-047 verwiesen (kein `Superseded`, Lessons-Teil bleibt
  in Kraft).

Link-Check über alle geänderten Dateien: keine toten relativen Links.

### Bekannte Grenze des Deckel-Checks (bewusst, im Skript-Header dokumentiert)

Erkannt wird nur die Repo-Konvention „eine Zeile besteht ausschließlich aus `@<pfad>`". Ein
Import mitten in einer Prosa-Zeile würde nicht mitgezählt; diese Form existiert im Repo nicht,
und ein zusätzlicher Token-Scanner hätte gegen Prosa-Vorkommen wie `@serwist/next` oder
„@importiert" abgrenzen müssen (YAGNI, nicht von ADR-047 §4 gefordert).

### Nicht ausgeführt

`pnpm lint`/`pnpm typecheck`/`pnpm test` (Vitest) sind unberührt: die Änderung besteht aus
Markdown und zwei Bash-Skripten, kein TypeScript. Gelaufen ist die zuständige Suite
`scripts/checks/tests/run-tests.sh` (1358 grün, 0 rot) plus `bash -n` für beide Skripte. Keine
UI-Berührung → keine Oberflächentests.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- Granularität rollen-spezifischer Zuschnitte, falls Kandidat 2 gewählt wird → /architecture
- Grenze "geltende Regel" vs. "Vorfall-Narrativ", falls Kandidat 3 gewählt wird (Narrative sind teils die Regel-Begründung) → /architecture
- Governance-Mechanismus gegen erneutes Zurückwachsen → /architecture

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/319-adr-import-kontext-guidelines`
Erstellt: 2026-09-04 19:35
