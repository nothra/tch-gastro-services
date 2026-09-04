# Task 322: session-empfehlung-worktree-requirements

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`start-work.sh` wird fast immer bereits in einer frischen, task-freien Claude-Session
ausgeführt. Die Abschluss-Ausgabe empfiehlt aktuell trotzdem pauschal, zusätzlich eine neue
Claude-Session zu öffnen, bevor überhaupt `/requirements` läuft – das widerspricht der bereits in
`docs/factory/guidelines/git-workflow.md` dokumentierten Ausnahme (start-work.sh + `/requirements`
dürfen in derselben Session laufen) und dem realen Normalfall.

Diese Task richtet die Empfehlung auf den Normalfall aus: direkt im Worktree mit
`/requirements` (ggf. `/architecture`) in derselben Session fortfahren; die
Neue-Session-Empfehlung wandert an den Phasenübergang zur Implementierung (`/implement`).
Betroffen: `scripts/start-work.sh`, `docs/factory/guidelines/git-workflow.md`, `CLAUDE.md`,
`docs/factory/OPERATING.md` sowie die zugehörigen #267-Guards in
`scripts/checks/tests/run-tests.sh`. Details siehe
[`docs/specs/spec-322-session-empfehlung-worktree-requirements.md`](../docs/specs/spec-322-session-empfehlung-worktree-requirements.md).

Die Worktree-Pflicht selbst ist **nicht** betroffen – nur die Session-Empfehlung.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN `start-work.sh` ist im Worktree-Modus fertig gelaufen WHEN die Abschluss-Ausgabe
      angezeigt wird THEN wird der Wechsel in den Worktree gefolgt von `/requirements <id>` in
      derselben Session als der zu erwartende nächste Schritt dargestellt, ohne dass zuvor eine
      neue Claude-Session empfohlen wird.
- [x] GIVEN dieselbe Abschluss-Ausgabe WHEN sie den Implementierungsschritt (`/implement <id>`)
      nennt THEN steht dort die Empfehlung, für den Implementierungsschritt eine neue
      Claude-Session zu öffnen – weiterhin klar als Empfehlung, nicht als Pflicht.
- [x] GIVEN der bisherige Worktree-Fakt („kein geteilter HEAD", #267 AK5) WHEN die Ausgabe geprüft
      wird THEN ist dieser Fakt weiterhin enthalten, aber nicht mehr mit einer
      Sofort-Session-Empfehlung verknüpft.
- [x] GIVEN `docs/factory/guidelines/git-workflow.md` → „Eine Task = Eine Session" WHEN der
      Abschnitt gelesen wird THEN ist der Ablauf start-work.sh + `/requirements` (ggf.
      `/architecture`) in derselben, noch task-freien Session als dokumentierter Regelfall
      formuliert; Grenze und Worktree-Pflicht bleiben unverändert und klar getrennt.
- [x] GIVEN `CLAUDE.md` (Guardrails) WHEN die Session-Empfehlungszeile gelesen wird THEN ist sie
      konsistent mit der aktualisierten Guideline und verweist weiterhin auf `git-workflow.md` als
      kanonische Quelle.
- [x] GIVEN `docs/factory/OPERATING.md` → „Die zwei Phasen der Factory" WHEN die Beschreibung des
      Ablaufs gelesen wird THEN gibt es keinen Widerspruch zur aktualisierten Formulierung.
- [x] GIVEN die bestehenden #267-Guards in `scripts/checks/tests/run-tests.sh` WHEN die
      Wortlaut-Änderung umgesetzt ist THEN sind diese Guards auf den neuen Wortlaut angepasst und
      bestehen weiterhin (inkl. Mutationskontrolle gegen die alte Formulierung).
- [x] GIVEN die Worktree-Pflicht WHEN die gesamte Änderung umgesetzt ist THEN bleibt dieser
      Abschnitt inhaltlich unverändert (keine Aufweichung).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger erkennbar (reine Doku-/Ausgabe-Umformulierung, keine Technologie-/Architektur-
Entscheidung) – `/architecture` kann übersprungen werden, direkt mit `/implement 322` fortfahren.

**Umsetzung (/implement):**
- `scripts/start-work.sh`: Schritt 2 (`/implement`) trägt jetzt die Session-Empfehlung direkt
  unter sich; Schritt 0/1 bleiben unqualifiziert. Die Worktree-Fakt-Zeile („kein geteilter HEAD")
  steht jetzt als letzte Zeile, entkoppelt von der Empfehlung.
- `docs/factory/OPERATING.md` (§1.1, §2) war bereits widerspruchsfrei zur neuen Formulierung
  (§1.1 bindet die „frische Claude-Session" bereits an den Implement-Schritt) – keine Änderung
  nötig, nur gegengeprüft.
- `scripts/checks/tests/run-tests.sh`: die #267-Guards (AK3/AK7) prüften bisher, dass die *alte*
  Formulierung – wo sie vorkommt – als Empfehlung qualifiziert ist. Diese Formulierung existiert
  nach der Umformulierung in keiner der vier Dateien mehr; AK7 prüft jetzt stattdessen ihre
  vollständige Abwesenheit (mit einer frischen Wegwerf-Fixture als Positivkontrolle). Zusätzlich
  ein neuer #322-Block direkt nach AK5: prüft die Reihenfolge/Bindung der Empfehlung an Schritt 2
  im Abschluss-Output von `start-work.sh`, inkl. Mutationskontrolle gegen die alte Reihenfolge.
- Alle Gates grün: `scripts/checks/tests/run-tests.sh` (1319/1319), `pre-commit.sh`, `pre-push.sh`
  (Unit-Tests, Typecheck, Format, Routen-Doku-Drift, Hooks).

**Review-Findings behoben (siehe unten) + Umsetzung (/test):**
- Alle 8 Akzeptanzkriterien haben dedizierte automatisierte Guards in
  `scripts/checks/tests/run-tests.sh` (AK1–AK7/F3, #322-Ordnungsblock).
- Lücke gefunden: Fehlerszenario 1 aus der Spec (`FACTORY_NO_WORKTREE=1`) war nicht durch einen
  Test abgedeckt – die bestehende NO_WORKTREE-Fixture prüfte nur den Branch-Wechsel, nicht die
  Abschluss-Ausgabe. Ergänzt: neuer Test-Block nutzt denselben In-Place-Klon für einen zweiten
  `start-work.sh`-Lauf und prüft, dass kein Worktree-Wechsel-Hinweis erscheint und die
  Session-Empfehlung weiterhin unmittelbar an Schritt 2 gebunden ist.
- Keine app-Code-Änderung in diesem Task (nur `scripts/`/`docs/`/`CLAUDE.md`) – die
  Vitest-Coverage-Schwelle ist unberührt, da kein `app/`/`lib/`/`db/`-Code betroffen ist.
- Suite nach Review-Fixes + Test-Ergänzung: 1322/1322 grün (`run-tests.sh`), `pre-commit.sh` grün.

**Umsetzung (/refactor):**
- Diff erneut gegen die Clean-Code-Checkliste geprüft (Naming, Länge, Duplikation, Magic
  Numbers, Kommentar-WHY): keine neuen Verstöße gefunden – die einzige echte Magic-Number
  wurde bereits im Review-Schritt behoben (`-eq 1` statt Toleranzbereich).
- Die beiden verbliebenen Nitpicks aus dem Review (fehlendes `rm -f` für die Wegwerf-Fixture,
  gebündelte 4-Bedingungen-Assertion) entsprechen nachweislich dem bestehenden Stil derselben
  Datei (mehrere andere `mktemp`-Aufrufe ohne Aufräumen, mehrere andere Blöcke mit gebündelten
  Bedingungen, z. B. #314) – keine Abweichung einführen, die inkonsistent zum Rest der Datei
  wäre. Keine Code-Änderung in diesem Schritt nötig.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Keine offenen Fragen – Scope ist durch Issue #322 präzise vorgegeben.

## Review-Findings
<!-- Wird durch /review befüllt -->
Siehe [`tasks/review-322.md`](review-322.md). Empfehlung: APPROVED. Zwei Wichtig-Findings
(Magic-Number-Toleranz im #322-Gap-Check; „je Task"-Widerspruch in git-workflow.md/CLAUDE.md)
wurden noch in derselben Runde behoben, keine Kritischen Findings.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Siehe [`tasks/codify-322.md`](codify-322.md). Zwei neue Lessons ergänzt (Zeilen-Gap-Toleranz in
`testing.md`, TL;DR-Merksatz-Drift in `code-style.md`), jeweils mit Index-Zeile in
`docs/factory/PROJECT-CONTEXT.md`.

---
Branch: `feature/322-session-empfehlung-worktree-requirements`
Erstellt: 2026-09-04 18:25
