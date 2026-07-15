# Spec: pr-shepherd Schritt 2 – Review-Fix-Commits über den factory-commit.sh-Seam

## Kontext

Der Commit/Push-Seam `scripts/factory-commit.sh` (ADR-019 §1) kapselt „commit + push des
aktuellen Feature-Branches" an einer auditierbaren, fail-closed Stelle (verweigert
main/master, kein `--force`, push inklusive). Für non-interaktive Stage-3-Sub-Agenten ist er
der **mandatierte** Weg – rohes `git commit`/`git push` matcht keine Allow-List-Erlaubnis und
löst einen Interrupt aus.

Die Skills `implement`, `test`, `refactor` und `pr-shepherd` **Schritt 6** (letzterer seit #114)
nennen den Seam bereits explizit. **`pr-shepherd.md` Schritt 2** („Review-Kommentare auflösen")
blieb inkonsistent: Punkt 2 sagt generisch „Code ändern, Test anpassen, **committen**" mit einer
rohen Commit-Message-Vorlage, ohne den Seam zu nennen. Ein Stage-3-Sub-Agent, der einen
Review-Fix committen will, hat damit keine deterministische, fail-closed Anweisung – der
Review-Fix-Commit soll wie alle anderen Schreib-Commits über den Seam laufen.

Verifiziert (Grep über `.claude/commands/*.md`): `pr-shepherd.md:36` ist die **einzige**
verbliebene Roh-`committen`-Stelle ohne Seam-Verweis.

## Scope

**Inbegriffen:**
- `.claude/commands/pr-shepherd.md` **Schritt 2**, Punkt 2: den Commit-Schritt auf
  `bash scripts/factory-commit.sh "<message>"` umstellen (analog Schritt 6), inkl. kurzer
  fail-closed-Begründung mit ADR-019-Verweis. Die bestehende Conventional-Commit-Message-
  Konvention (`fix: address review comment – [Kurzbeschreibung] (task-$ARGUMENTS)`) bleibt als
  **Seam-Argument** erhalten.
- Konsistenz-Test in `scripts/checks/tests/run-tests.sh`, der belegt, dass **Schritt 2** den
  Seam nennt (distinkt vom bereits getesteten Schritt-6-Treffer).

**Nicht inbegriffen:**
- Verhaltensänderung an `factory-commit.sh` selbst (nur Doku/Skill-Anweisung + Guard-Test).
- Andere Skills (bereits konsistent) oder andere `pr-shepherd`-Schritte.
- Neue git-/gh-Permissions in `.claude/settings.json` (der Seam läuft über die bestehende
  `Bash(bash scripts/*)`-Erlaubnis).
- Kein laufender-Saldo-/Backlog-Thema; rein Skill-Doku-Konsistenz (tech-debt).

## Akzeptanzkriterien

- [ ] **AC1 – Seam in Schritt 2:** GIVEN `pr-shepherd.md` Schritt 2, Punkt 2 (eindeutig
  umsetzbarer Review-Kommentar) WHEN der Fix committet wird THEN weist die Anweisung
  `bash scripts/factory-commit.sh "fix: address review comment – [Kurzbeschreibung] (task-$ARGUMENTS)"`
  an – nicht das rohe „committen"/`git commit`.
- [ ] **AC2 – fail-closed-Begründung:** GIVEN dieselbe Stelle WHEN sie gelesen wird THEN
  verweist sie kurz auf den Grund (nicht über rohes `git commit`/`git push`; fail-closed gegen
  main/master & `--force`, ADR-019) – konsistent zur Formulierung in `implement`/`test`/`refactor`.
- [ ] **AC3 – Konsistenz-Guard (Schritt 2):** GIVEN `scripts/checks/tests/run-tests.sh` WHEN es
  läuft THEN prüft eine Assertion, dass der **Schritt-2-Abschnitt** von `pr-shepherd.md` den Seam
  `factory-commit.sh` nennt – gegen die distinktive Kommandoform, nicht gegen einen Prosa-Treffer
  (Lehre aus #114 „Kommando ≠ Prosa-Erwähnung"), und ohne mit dem bestehenden Schritt-6-Test zu
  kollidieren.
- [ ] **AC4 – Patch-Workflow für `.claude/**`:** GIVEN `.claude/commands/pr-shepherd.md` ist für
  Agenten hard-denied WHEN die Änderung geliefert wird THEN als `tasks/patch-117.diff`
  (programmatisch erzeugt, **nicht** von Hand getippt), `git apply --check tasks/patch-117.diff`
  grün; die Test-Datei unter `scripts/*` wird direkt editiert. Blocker in der Task-Datei notiert
  (Datum + Grund + erforderliche Aktion des Menschen).
- [ ] **AC5 – Gates grün (belegt):** GIVEN der Patch auf eine Temp-Kopie angewandt WHEN
  `bash scripts/checks/tests/run-tests.sh` läuft THEN grün; der neue Guard ist zusätzlich **rot
  gegen die ungepatchte** und **grün gegen die gepatchte** Fassung verifiziert (nicht nur „rot
  gegen Ist").

## Fehlerszenarien

- [ ] **Fehl-Match des Guards:** Ein `grep` auf `factory-commit.sh` greift den Schritt-6-Treffer
  statt Schritt 2 → Guard grün, obwohl Schritt 2 nicht geändert wurde. Gegenmaßnahme: den
  Schritt-2-Abschnitt gezielt eingrenzen (z. B. Zeilenbereich zwischen „Schritt 2" und „Schritt 3"
  bzw. distinkte Zeile) und positiv **und** negativ testen.
- [ ] **Korrupter Patch:** Handgeschriebener Unified-Diff (falsche Hunk-Header, fehlende
  Kontext-Leerzeichen) → `git apply` bricht ab. Gegenmaßnahme: Diff programmatisch via
  `git diff --no-index` / `difflib.unified_diff` aus einer Temp-Kopie erzeugen (Pfad-Header
  `a/.claude/… b/.claude/…`).
- [ ] **Nachweis nur „rot gegen Ist":** Ein Fehl-Match kann zufällig trotzdem rot sein →
  zusätzlich grün gegen die gepatchte Temp-Kopie verifizieren (#114-Lehre).

## Offene Fragen

- keine – Scope, Muster (#114) und Seam-Vertrag (ADR-019) sind eindeutig.
