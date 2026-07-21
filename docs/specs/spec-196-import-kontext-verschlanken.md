# Spec: Immer geladenen @import-Kontext verschlanken (Stolpersteine auslagern)

## Kontext

Der bei **jeder** Session und **jedem** Pipeline-Agenten per `@import` geladene Kontext
umfasst aktuell **2.068 Zeilen** (gemessen im Worktree):

| Datei | Zeilen | @import |
|-------|-------:|:-------:|
| `CLAUDE.md` | 176 | (Wurzel) |
| `docs/factory/PROJECT-CONTEXT.md` | 1.148 | ✓ |
| `docs/factory/guidelines/clean-code.md` | 131 | ✓ |
| `docs/factory/guidelines/tdd-principles.md` | 84 | ✓ |
| `docs/factory/guidelines/testing-standards.md` | 163 | ✓ |
| `docs/factory/guidelines/architecture-principles.md` | 79 | ✓ |
| `docs/factory/guidelines/git-workflow.md` | 287 | ✓ |

Dominanter Anteil: der Abschnitt **„Bekannte Stolpersteine" in `PROJECT-CONTEXT.md`
(Zeilen 160–1138 ≈ 978 Zeilen, 45 Einträge)** — ~85 % dieser Datei und ~47 % des
gesamten @import-Kontexts. Das meiste ist für eine gegebene Task irrelevant (z. B.
Turbopack/pdfkit #193, pnpm@11 #167, aria-modal-Fokus-Trap #134), wird aber von jedem
der ~7 sequenziellen Stage-3-Agenten komplett neu mitgeladen und -bezahlt.

**Ursache:** Governance-Lücke im Self-Improvement-Loop. `/codify` hängt bei jedem Feature
eine Regel an `PROJECT-CONTEXT.md` (@import-Pfad) an; keine wird je ausgelagert. Die eigene
`token-efficiency.md` §5 fordert das Gegenteil („Kontext-Dateien schlank halten … jede Zeile
wird dauerhaft mitbezahlt"). Das Muster „nicht importiert, gezielt bei Bedarf gelesen"
existiert bereits (`token-efficiency.md`, `bash-gotchas.md`) und wird hier auf die
Stolpersteine übertragen.

## Scope

**Inbegriffen:**
- Auslagern des Stolperstein-**Volltexts** aus dem @import-Pfad in neue, **nicht importierte**,
  thematisch getrennte Dateien unter `docs/factory/lessons/`.
- Ein **schlanker Index** (eine Zeile pro Lesson: Titel + Herkunfts-Issue + „wann reinschauen")
  bleibt in `PROJECT-CONTEXT.md` (@import) — plus ein Verweis auf `lessons/`.
- **~3–5 wirklich taskübergreifende Kern-Kurzregeln** bleiben als Einzeiler inline
  (Kandidaten: Drizzle `.returning()` → `T | undefined`; IDOR-Parent-Key im WHERE;
  Zod-Obergrenzen für `int4`/`text`). Finale Auswahl in `/architecture`.
- **Alle 45 bestehenden Learnings** bleiben verlustfrei erhalten (Volltext in `lessons/`,
  Kurzform im Index).
- Anpassung des **`/codify`-Skills** (`.claude/commands/codify.md`), sodass künftige Learnings
  in `lessons/<thema>.md` + Index geschrieben werden statt in den @import-Pfad.
  → **Patch-Workflow** (Datei ist agent-hard-denied, `.claude/**`): Diff als
  `tasks/patch-196.diff` liefern, Mensch wendet an.
- Konsistenz der Querverweise / kanonischen Quellen (Regel „Kanonische Quellen immer
  referenzieren").

**Nicht inbegriffen:**
- **Kein inhaltliches Löschen** von Learnings (AC verbietet Verlust; „Prunen" bedeutet hier:
  aus dem @import-Volltext raus → in `lessons/`, nicht aus dem Repo).
- Keine Änderung der 5 Guidelines-Dateien selbst (bleiben @import, unverändert).
- Keine Änderung an bestehendem Produktverhalten (reine Kontext-/Doku-Umschichtung).
- Split-**Granularität** der `lessons/`-Dateien wird nicht hier, sondern in `/architecture`
  festgelegt (Requirements hält nur fest: ausgelagert **und** thematisch getrennt).

## Akzeptanzkriterien

- [ ] **AC1 – Volltext raus aus @import:** Der Stolperstein-**Volltext** steht nicht mehr im
  @import-Pfad (`CLAUDE.md`/`PROJECT-CONTEXT.md`), sondern in nicht-importierten Dateien
  unter `docs/factory/lessons/`. GIVEN eine frische Session WHEN der @import-Kontext geladen
  wird THEN enthält er keinen Stolperstein-Volltext mehr, sondern nur Index + Kern-Kurzregeln.
- [ ] **AC2 – Reduktion messbar & dokumentiert:** Die neue @import-Zeilenzahl ist im PR
  dokumentiert (vorher 2.068 Zeilen; Zielrichtwert: `PROJECT-CONTEXT.md` von 1.148 auf einen
  Bruchteil, da die ~978 Stolperstein-Zeilen bis auf Index+Kernregeln entfallen).
- [ ] **AC3 – Kein Verlust:** Alle 45 bestehenden Learnings sind weiterhin auffindbar —
  Volltext in `lessons/` + Kurzform im Index. GIVEN ein beliebiges der 45 Learnings WHEN im
  Repo gesucht wird THEN ist der vollständige Text (inkl. Herkunfts-Issue) genau einmal in
  `lessons/` vorhanden und im Index verlinkt.
- [ ] **AC4 – Kern-Kurzregeln inline:** ~3–5 taskübergreifende Regeln bleiben als Einzeiler im
  @import-Pfad (in `/architecture` final ausgewählt); jede verweist auf ihre Lesson-Datei als
  kanonische Quelle.
- [ ] **AC5 – `/codify` schreibt künftig in `lessons/` + Index:** Der `/codify`-Skill instruiert
  neue Learnings nach `lessons/<thema>.md` + Index-Zeile, **nicht** nach `PROJECT-CONTEXT.md`
  „Bekannte Stolpersteine". GIVEN der aktualisierte codify-Skill WHEN er ein neues Learning
  ableitet THEN landet der Volltext in `lessons/` und nur eine Index-Zeile im @import-Pfad.
  Geliefert als `tasks/patch-196.diff` (Human-Apply, `.claude/**` hard-denied).
- [ ] **AC6 – Verweise konsistent:** Querverweise zwischen Index, `lessons/`-Dateien,
  `CLAUDE.md`, Guidelines und ADRs sind konsistent; keine toten Verweise, kanonische Quelle je
  Regel eindeutig (Regel „Kanonische Quellen immer referenzieren").

## Fehlerszenarien

- [ ] **Doppelte Wahrheit:** Ein Learning steht nach der Migration sowohl inline (Volltext) als
  auch in `lessons/` → verstößt gegen „Kanonische Quellen". Prüfung: Volltext genau einmal
  (in `lessons/`), inline nur Index-Zeile bzw. Kern-Kurzregel mit Verweis.
- [ ] **Toter Verweis:** Ein bestehender Cross-Link (z. B. `[[…]]`, „siehe #NN", ADR-Verweis)
  zeigt nach dem Verschieben ins Leere. Prüfung: alle Verweise gegen Zielanker auflösen.
- [ ] **Verlorenes Learning:** Ein Eintrag geht beim Verschieben verloren (45 rein → <45 raus).
  Prüfung: Count-Assertion vor/nach (45 Einträge → 45 Lessons).
- [ ] **`/codify`-Patch bricht:** Der gelieferte Diff lässt sich nicht anwenden. Prüfung:
  `git apply --check tasks/patch-196.diff` grün, plus Grep-Assertion gegen eine Temp-Kopie
  (codify verweist auf `lessons/`, nicht mehr auf „Bekannte Stolpersteine").

## Offene Fragen

- [ ] Finale Split-Granularität der `lessons/`-Dateien → in `/architecture` (Kandidat: ~6
  thematische Dateien vs. 4 grobe Buckets).
- [ ] Finale Auswahl der ~3–5 inline verbleibenden Kern-Kurzregeln → in `/architecture`.
- [ ] Braucht die Auslagerung ein ADR (neue Konvention „Learnings in `lessons/`, nicht im
  @import-Pfad")? → in `/architecture` entscheiden; wahrscheinlich ja, da es die
  `/codify`-Governance dauerhaft ändert.
