# Task 196: import-kontext-verschlanken

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Immer geladener `@import`-Kontext (2.068 Zeilen) verschlanken: Der Stolperstein-Volltext
(45 Einträge, ~978 Zeilen in `PROJECT-CONTEXT.md`) wandert in nicht-importierte, thematisch
getrennte Dateien unter `docs/factory/lessons/`. Im @import-Pfad bleiben nur ein schlanker
Index + ~3–5 taskübergreifende Kern-Kurzregeln. `/codify` wird angepasst, damit künftige
Learnings in `lessons/` + Index geschrieben werden (kein erneutes Zuwachsen).

Spec: `docs/specs/spec-196-import-kontext-verschlanken.md`

Entscheidungen (aus /requirements):
- Inline-Rest: Index **plus** kleine Kern-Kurzregeln (Lösungsidee #3).
- Index-Ort: in `PROJECT-CONTEXT.md` (bleibt @import).
- lessons/-Split-Granularität: wird in `/architecture` festgelegt.

## Akzeptanzkriterien
- [x] AC1 – Stolperstein-Volltext nicht mehr im @import-Pfad, sondern in `docs/factory/lessons/`
- [x] AC2 – @import-Reduktion messbar & im PR dokumentiert (vorher 2.068 Zeilen)
- [x] AC3 – Alle 45 Learnings verlustfrei erhalten (Volltext in lessons/ + Index-Zeile), Count 45→45
- [x] AC4 – 4 Kern-Kurzregeln inline, je mit Verweis auf ihre Lesson-Datei
- [x] AC5 – `/codify` schreibt künftig in lessons/ + Index (Patch angewendet, s. Blocker erledigt)
- [x] AC6 – Querverweise/kanonische Quellen konsistent, keine toten Verweise

## Technische Notizen

**ADR:** `docs/adr/037-lessons-auslagern-aus-import-kontext.md` (Accepted)

**Lessons-Split (7 Dateien unter `docs/factory/lessons/`, NICHT @import):**
`frontend-react.md`, `next-auth.md`, `db-drizzle.md`, `testing.md`, `build-tooling.md`,
`code-style.md`, `factory-workflow.md`. Zuordnungstabelle je Learning in ADR-037.

**Inline verbleibend in `PROJECT-CONTEXT.md` (@import):**
- Einleitung + Verweis auf `docs/factory/lessons/`
- Schlanker Index: 1 Zeile pro Learning (Titel + #Issue + Ziel-Datei), gruppiert nach 7 Dateien
- 4 Kern-Kurzregeln (Einzeiler, je mit Verweis auf Lesson): Drizzle `.returning()`→`T|undefined`;
  IDOR Parent-Key im WHERE; Soft-Delete `active`-Prüfung nach Laden by ID; Zod-Obergrenze int4/text

**Vorgehen /implement:**
1. `docs/factory/lessons/`-Dateien anlegen, Volltext der 45 Einträge **verlustfrei** verschieben
   (inhaltlich unverändert; `[[…]]`- und ADR-/#NN-Verweise nachziehen).
2. „Bekannte Stolpersteine"-Volltext in `PROJECT-CONTEXT.md` durch Index + 4 Kernregeln ersetzen.
3. Count-Assertion: 45 Einträge rein → 45 Lessons + 45 Index-Zeilen raus.
4. Reduktion messen (`wc -l` @import vorher/nachher) und im PR dokumentieren.
5. `/codify`-Anpassung als **Patch** `tasks/patch-196.diff` (`.claude/commands/codify.md` hard-denied,
   programmatisch via difflib erzeugen, UTF-8, `git apply --check` + Grep-Assertion gegen Temp-Kopie).

**Verweis-Konsistenz:** `token-efficiency.md`-Note in CLAUDE.md und der `/codify`-Text müssen nach
`lessons/` + ADR-037 zeigen, nicht mehr auf „Bekannte Stolpersteine".

## Umsetzungs-Notizen (/implement)

**@import-Reduktion (AC2):**
- `PROJECT-CONTEXT.md`: **1.148 → 262 Zeilen** (−886; Stolperstein-Volltext ~978 Z. → Index + 4 Kernregeln).
- CLAUDE.md: 176 → 180 (+4, Verweis-Note auf `lessons/`).
- @import-Gesamt: **2.068 → 1.186 Zeilen (−882, −42,7 %)**; die 5 Guidelines (744 Z.) unverändert.
- Ausgelagert (nicht @import): `docs/factory/lessons/*.md` = 1.020 Zeilen Volltext.

**Verlustfreiheit (AC3):** Split skript-basiert; Reconstruction aus den 7 Lessons == Original-Sektion
(Byte-genau, nur die 2 relativen ADR-Links `../adr/` → `../../adr/` für die tiefere Ablage angepasst).
Count 45 Einträge → 45 Lessons + 45 Index-Zeilen (verifiziert).

**Split (AC1) – 7 Dateien, Eintragszahl je Datei:** frontend-react 8, next-auth 4, db-drizzle 7,
testing 4, build-tooling 4, code-style 2, factory-workflow 16 (= 45).

**Kern-Kurzregeln inline (AC4):** Drizzle `.returning()`→`T|undefined`; IDOR Parent-Key im WHERE;
Soft-Delete `active`-Prüfung nach Laden by ID; Zod-Obergrenze `int4`/`text` – je verlinkt auf
`lessons/db-drizzle.md`.

**Verweis-Konsistenz (AC6):** `token-efficiency.md` §"Was hier (noch) nicht steht", `OPERATING.md`
§5.1 und der CLAUDE.md-Kontext-Hinweis zeigen jetzt auf `lessons/` + ADR-037 statt „Bekannte
Stolpersteine". Historische Task-/Codify-Records (task-44/144/145/161, codify-127/155) bleiben
unverändert (dokumentieren den damaligen Zustand). Prettier `format:check` grün.

## Nachtrag – „wann reinschauen"-Trigger (bedarfsgesteuertes Laden, 2026-07-21)

Spec Zeile 36 verlangte pro Index-Zeile „Titel + Herkunfts-Issue + **wann reinschauen**"; ADR-037
hatte das „wann reinschauen" versehentlich durch „Ziel-Lesson-Datei" ersetzt, die erste Umsetzung
folgte dem ADR → der Index routete nur nach Domänen-Datei, nicht danach, **welcher Skill** eine
Lesson braucht. Nachgezogen (Ziel: Lessons wirklich nur bei Bedarf laden):

- **Index mit „Laden bei"-Trigger (Skill + Situation):** homogene Domänen-Dateien am Gruppen-Header
  (z. B. `db-drizzle` → „/implement, /review, /test bei Data-Layer"), `factory-workflow.md`
  (gemischte Auslöser) je Zeile als `→ <Trigger>` (z. B. `→ /pr-shepherd – Merge-Freigabe`).
- **Mechanismus** in der Sektions-Einleitung von `PROJECT-CONTEXT.md` beschrieben: beim Skill-Start
  nur die Lessons öffnen, deren Trigger zu laufendem Skill **und** Task-Domäne passt.
- **ADR-037** angeglichen (Index-Format = Titel + Issue + „Laden bei"-Trigger; Trigger = Auswahl-
  kriterium fürs bedarfsgesteuerte Laden).
- **`/codify`** muss den Trigger künftig mitschreiben → **neuer Patch** `tasks/patch-196.diff`
  (s. Blocker unten). Byte-Losslessness der 45 Original-Learnings weiterhin verifiziert (True).

## PR-Shepherd

PR-Shepherd [2026-07-22]: Merge freigegeben – alle Gates grün. PR #199, Branch nicht hinter
`origin/main` (kein Rebase nötig), keine offenen Review-Threads (lokales Review APPROVED),
required Checks grün (`lint`/`test`/`issue-sync`/`factory-self-test`/`pr-closes-issue`),
0 Approvals required (ADR-029). Draft aufgelöst, Squash-Auto-Merge aktiviert.

## Blocker / Patch

- **Blocker [2026-07-21] – erledigt [2026-07-21]: AC5 – `/codify`-Skill liegt in
  `.claude/commands/codify.md` (agent-hard-denied).** Änderung als Patch `tasks/patch-196.diff`
  geliefert (difflib/UTF-8 erzeugt); vom Menschen mit `git apply` angewendet. Der applizierte Diff
  verweist auf `lessons/<thema>.md` + Index + ADR-037, kein alter „Bekannte Stolpersteine"-Ziel-
  Verweis mehr. Cleanup vollzogen (#145): AC5 auf `[x]`, stale `tasks/patch-196.diff` entfernt.

- **Blocker [2026-07-21] – erledigt [2026-07-22]: Trigger-Refinement für `/codify`
  (`.claude/commands/codify.md`, agent-hard-denied).** Der Skill schreibt beim Anlegen der
  Index-Zeile künftig einen „Laden bei"-Trigger (Skill + Situation) mit. Als **neuer** Patch
  `tasks/patch-196.diff` geliefert (difflib/UTF-8), vom Menschen mit `git apply` angewendet. Der
  applizierte Diff nennt den Trigger in „Regeln ableiten" **und** in „Änderungen vornehmen"; Drift
  zwischen `codify.md` und `PROJECT-CONTEXT.md`/ADR-037 damit aufgelöst. Cleanup vollzogen (#145):
  stale `tasks/patch-196.diff` entfernt.

## Refactor-Notizen (/refactor)

Kein Produktionscode im Scope → keine Code-Refactorings (Naming/SRP/Magic-Numbers n/a). Einzige
in-scope Clean-up: Review-Nitpick behoben – Intro-Blockquote der 7 `lessons/`-Dateien umgestellt,
sodass `@import`-geladen nicht mehr am Zeilenende getrennt wird. Kein neues Verhalten; Entry-Bodies
byte-lossless unverändert (45 Einträge), Prettier + Suite (609) grün.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen

Siehe [codify-196.md](codify-196.md). Ein Learning → `lessons/factory-workflow.md` (Volltext) +
Index-Zeile in `PROJECT-CONTEXT.md`: „Verlustfreie Doku-Migration/Split: skriptbasiert +
Byte-Reconstruction-Assertion". Erster `/codify`-Lauf unter der neuen ADR-037-Konvention (Volltext
nach `lessons/`, nicht in den @import-Pfad) – validiert AC5 end-to-end.

---
Branch: `improvement/196-import-kontext-verschlanken`
Erstellt: 2026-07-21 07:22
