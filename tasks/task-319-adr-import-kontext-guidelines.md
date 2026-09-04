# Task 319: adr-import-kontext-guidelines

## Status
- [ ] In Bearbeitung
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
- [ ] AC1 – @import-Umgang (Mechanismus und/oder Umfang) für alle 5 Guidelines entschieden (einer der 4 Issue-Kandidaten oder begründete Kombination)
- [ ] AC2 – Begründung ohne Kosten-Messwerte prüfbar, je Kandidat mit dessen eigener Argumentationsart; keine Option vorab ausgeschlossen
- [ ] AC3 – Risiko "Gate-Regel wird durch Nicht-Laden still verletzt" explizit adressiert
- [ ] AC4 – Zusatzbefund "Lessons-Index wächst zurück" (PROJECT-CONTEXT.md) in derselben ADR mitentschieden
- [ ] AC5 – Normativer Gehalt bleibt gültig; Prosa-/Narrativ-Kürzung (Kandidat 3) ausdrücklich erlaubt, Regelverlust nicht

Umsetzung (in diesem Task):
- [ ] AC6 – Gewählter Mechanismus im Repo tatsächlich angewandt, nicht nur beschrieben
- [ ] AC7 – Neuer @import-Zeilen-/Wortstand gegen Ausgangswert (1.376 / 9.812) im PR dokumentiert
- [ ] AC8 – Verweise konsistent, kanonische Quelle je Regel eindeutig, keine toten Links
- [ ] AC9 – `.claude/**`-Anteil (falls nötig) als `tasks/patch-319.diff`, `git apply --check` grün

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
