# Task 240: wirkungslose-write-permission-regeln-entfernen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Entferne alle wirkungslosen `Write(...)`-Permission-Regeln aus `permissions.allow` und
`permissions.deny` in `.claude/settings.json`. Laut #224-Verhaltensprobe (`claude --print`,
CLI 2.1.218) wertet die installierte Claude-Code-Version `Write(pfad)`-Regeln gar nicht aus –
nur `Edit(pfad)` deckt Edit- und Write-Tool-Aufrufe ab. Die separate `Write(...)`-Liste ist
komplett wirkungslos (dead config), erzeugt aber bei jedem Stage-3-Lauf unnötige
stderr-Warnungen. Details, Scope und Akzeptanzkriterien:
[`docs/specs/spec-240-wirkungslose-write-permission-regeln-entfernen.md`](../docs/specs/spec-240-wirkungslose-write-permission-regeln-entfernen.md).

Lieferung zwingend über den Patch-Workflow (`.claude/**` ist hard denied für den Agenten,
#88-Grenze): `tasks/patch-240.diff`, programmatisch erzeugt, `git apply --check` verifiziert.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 – `Write(...)` ist aus `permissions.allow` entfernt (alle 18 Einträge) – Patch
      angewendet, verifiziert; alle 18 (7 Extension- + 11 Verzeichnis-Glob-Einträge) jetzt
      einzeln per Assertion abgedeckt (`/test`-Ergänzung), plus Blanket-Check + Grep-Fallback
- [x] AK2 – `Write(...)` ist aus `permissions.deny` entfernt (alle 3 Einträge) – Patch
      angewendet, verifiziert
- [x] AK3 – Kein Funktionsverlust: jeder entfernte `Write(pfad)`-Eintrag hat ein
      `Edit(pfad)`-Pendant in derselben Liste – 1:1-Abgleich vor Patch-Erzeugung verifiziert
      (keine fehlenden Pendants, siehe Blocker-Abschnitt). Automatisierte Regressionsabsicherung
      für das Fortbestehen der zugehörigen (vorbestehenden #88-)`Edit(...)`-Einträge selbst als
      Out-of-Scope-Fund in Issue [#251](https://github.com/nothra/tch-gastro-services/issues/251)
      ausgelagert (`/review`)
- [x] AK4 – `settings.json` bleibt valides JSON mit unveränderter Grundstruktur
      (`hooks`/`permissions.allow`/`permissions.deny`) – nach Anwenden bestätigt
      (`jq -e '.hooks and .permissions.allow and .permissions.deny'`, Regressionstest #224 AK8
      läuft grün)
- [x] AK5 – Verhaltensprobe (`claude --print`, `FACTORY_STAGE=3`) bestätigt vor der Entfernung
      dieselbe „Write(<pfad>) is not matched"-Warnung wie in #224 (CLI jetzt 2.1.220,
      21 Warnzeilen, siehe Blocker-Abschnitt)
- [x] AK6 – Nach der Entfernung: kein neuer Permission-Prompt für zuvor per `Write(pfad)`
      "erlaubte" Pfade (Edit-Regel deckt weiterhin ab) – Positiv-Probe nach dem Patch
      durchgeführt: `docs/routes.md` per `Edit` geändert (kein Prompt), 0 Warnzeilen statt
      vorher 21
- [x] AK7 – Regressionstest in `scripts/checks/tests/run-tests.sh` geändert (nicht nur ergänzt):
      prüft Abwesenheit von `Write(...)` (jq-geparst + Grep-Fallback), alte
      "Vorhandensein"-Assertions aus #91/#224 entfernt/ersetzt. RED→GREEN belegt: 546 grün/13 rot
      vor dem Patch, 559 grün/0 rot nach dem Patch, **570 grün/0 rot** nach der `/test`-Ergänzung
      um 11 Einzelassertionen für die Verzeichnis-Glob-Einträge (siehe
      [`tasks/coverage-240.md`](coverage-240.md))
- [x] AK8 – Stale Prosa in `docs/factory/lessons/factory-workflow.md` (#224-Abschnitt)
      korrigiert: Präsens-Aussage zur "existierenden" Write-Liste + "Cleanup-Kandidat: Issue
      #240"-Verweis auf erledigt aktualisiert

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**Refactoring (`/refactor`):** Zwei echte Code-Duplikationen entfernt (kein neues Verhalten,
Tests vor/nach identisch 570 grün/0 rot):
- `run-tests.sh`: die 7 `#224`-Extension-Write-Assertions und die 11 in `/test` ergänzten
  Verzeichnis-Glob-Write-Assertions (identischer Rumpf, nur unterschiedliche Eintragslisten)
  zu einer Schleife über alle 18 `allow`-Einträge zusammengefasst.
- `run-tests.sh`: die 3 deny-seitigen Write-Absence-Checks (vorher 1 Einzelaufruf für
  `pnpm-lock.yaml` + 1 Zweier-Schleife für `.claude/**`/`.env*`) zu einer Dreier-Schleife
  zusammengefasst.
- `factory-workflow.md`: eine beim Review-Fix entstandene unformatierte Textwand-Zeile
  (108 Zeichen Absatz in einer Zeile) sauber auf die übliche Zeilenlänge umgebrochen –
  die testrelevante Phrase „ist seit #224 über eine generische" blieb dabei bewusst
  ungebrochen (zweiter Anlauf, der erste Umbruchversuch hatte die Assertion rot gefärbt).

## Blocker

Blocker [2026-08-01]: Die Fachänderung liegt in `.claude/settings.json`, das für den Agenten
hard denied ist (`Edit(.claude/**)`/`Write(.claude/**)`, #88-Grenze). Lieferung als
`tasks/patch-240.diff` – programmatisch per `jq` erzeugt (nicht von Hand getippt, aus #94),
Pfad-Header über `git diff --no-index --no-prefix` + Sed-Korrektur auf `a/.claude/settings.json`
/ `b/.claude/settings.json` gesetzt, read-only mit `git apply --check tasks/patch-240.diff`
verifiziert (Ergebnis: „APPLY-CHECK OK", zweimal geprüft – gegen die Scratch-Kopie und erneut
gegen die im Branch committete Patch-Datei).

**Erledigt [2026-08-01]:** Der Mensch hat `git apply tasks/patch-240.diff` im Worktree
ausgeführt. `tasks/patch-240.diff` wurde danach entfernt (aus #145/#212 – kein totes
Patch-Artefakt vor dem Merge), alle Checkboxen oben auf `[x]` gesetzt.

**1:1-Edit-Pendant-Abgleich (AK3), vor Patch-Erzeugung durchgeführt:** Für jeden der 18
`Write(...)`-Einträge in `allow` und der 3 in `deny` wurde per `jq` verifiziert, dass ein
identischer `Edit(pfad)`-Eintrag in derselben Liste existiert (`comm -23` gegen die erwartete
vs. tatsächliche Edit-Menge – beide Ausgaben leer). Kein Funktionsverlust.

**`claude --print`-Verhaltensprobe (AK5), durchgeführt 2026-08-01 vor der Entfernung:**
`FACTORY_STAGE=3 claude --print "Hänge in docs/routes.md die Zeile '<!-- probe-240 -->' an ..." --max-turns 3`
im Worktree gegen die **unveränderte** `.claude/settings.json`. Ergebnis: `docs/routes.md`
wurde tatsächlich geändert (MD5 vorher `8ac445a1…`, nachher `98566e47…`, danach mit
`git checkout -- docs/routes.md` zurückgesetzt) – kein Permission-Prompt für die `Edit`-Regel.
Das Log enthielt **21** Zeilen der Form „Write(<pfad>) is not matched by file permission checks
— only Edit(path) rules are …" (18 aus `allow` + 3 aus `deny`) – identisch zum #224-Befund auf
CLI 2.1.218, jetzt bestätigt auf CLI 2.1.220. Damit ist belegt: Die Entfernung der
`Write(...)`-Einträge verändert das reale Permission-Verhalten **nicht**.

**Regressionstest (AK7), RED→GREEN belegt:** Die angepassten Assertions in `run-tests.sh` liefen
(1) vor dem Patch gegen die unveränderte Datei → 546 grün, 13 rot – exakt die erwarteten neuen
„Write(...) darf nicht mehr vorkommen"-Assertions (kein unerwarteter Kollateralschaden an den
übrigen 546); (2) standalone gegen eine bereinigte Scratch-Kopie (Vorab-Beleg der GREEN-Logik)
und (3) **nach** dem `git apply` durch den Menschen gegen die tatsächliche Live-Datei → **559
grün, 0 rot** (voller Lauf, keine Regression).

**AK6-Verhaltensprobe nach dem Patch, durchgeführt 2026-08-01:** Dieselbe
`claude --print`-Probe wie bei AK5, jetzt gegen die **gepatchte** `.claude/settings.json`.
Ergebnis: `docs/routes.md` erneut per `Edit` geändert (MD5 vorher `8ac445a1…`, nachher
`2d6c1e67…`, danach zurückgesetzt) – weiterhin **kein** Permission-Prompt. Das Log enthielt
**0** „is not matched"-Warnzeilen (vorher 21) – die Entfernung hat sowohl die dead config
beseitigt als auch das reale Edit/Write-Verhalten unverändert gelassen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Reicht die schlanke Bestätigungsprobe (AK5) oder ist eine vollständige Neuaufnahme der
      `claude --print`-Verhaltensdokumentation wie in #224 erwartet? Geklärt: schlanke Probe
      durchgeführt (siehe Blocker-Abschnitt) und ausreichend – bestätigt exakt den #224-Befund
      auf CLI 2.1.220 (21 identische Warnzeilen), kein abweichendes Verhalten.

## Review-Findings
<!-- Wird durch /review befüllt -->

Siehe [`tasks/review-240.md`](review-240.md). Verdict: **APPROVED**. Ein Wichtiges Finding
(stale `Write(...)`-Prosa im `#91`-Patch-Workflow-Abschnitt von `factory-workflow.md`,
übereinstimmend in Runde 2 und 3 gefunden) wurde direkt während der Review-Runde behoben
(Commit `5445f0a`). Out-of-Scope-Fund (fehlender Regressionstest für die vorbestehenden
`#88`-`Edit(...)`-Allow-Einträge) als Issue [#251](https://github.com/nothra/tch-gastro-services/issues/251)
ausgelagert.

## Security-Review

Siehe [`tasks/security-240.md`](security-240.md). Ergebnis: **PASSED**, keine kritischen
Findings. Ein Wichtiges (nicht blockierendes) Finding: die entfernten `Write(...)`-Deny-Einträge
waren eine (selbst wirkungslose) Rückfallebene für den Fall eines künftigen
Claude-Code-Verhaltenswechsels – deren Absicherung ist jetzt rein prozedural (Lesson-Reminder,
kein technisches Gate). Kein eigenes Issue nötig: kein sinnvoll baubarer automatisierter Test
dafür, bestehender Lesson-Reminder ist die angemessene Mitigation. Adversarial-Review
(unabhängiger Agent) bestätigt: `Edit(...)`-Regeln (die tatsächliche Sicherheitsgrenze)
zeichengleich unverändert, kein Injection-Vektor in den Testskript-Änderungen.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Siehe [`tasks/codify-240.md`](codify-240.md). Drei neue Lessons: (1) neue
Regressions-Assertion-Schleife gegen bereits vorhandene mit identischem Rumpf abgleichen statt
eine parallele Schleife anzulegen (`testing.md`), (2) `grep -qF`-Fixed-String-Regressionstest
gegen Markdown-Prosa bricht lautlos bei einem Zeilenumbruch über die Testphrase (`testing.md`),
(3) Write-Tool-Zielpfad im Worktree explizit gegen den Worktree-Suffix prüfen, nicht dem
Bash-cwd vertrauen (`factory-workflow.md`).

---
Branch: `chore/240-wirkungslose-write-permission-regeln-entfernen`
Erstellt: 2026-08-01 14:55

PR-Shepherd [2026-08-01]: Branch auf `origin/main` rebased (Ein-Zeilen-Konflikt in
`docs/factory/PROJECT-CONTEXT.md` mit PR #247 – beide Index-Zeilen behalten, rein additiv),
alle Gates nach Rebase erneut grün (580 grün/0 rot Bash-Suite, `pnpm test`/`typecheck`/
`format:check`/Routen-Doku grün), Draft aufgelöst. Merge freigegeben – alle Gates grün.
