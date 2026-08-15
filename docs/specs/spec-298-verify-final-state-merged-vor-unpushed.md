# Spec: PR MERGED zählt in `evaluate_final_state()` vor der Unpushed-Prüfung als Erfolg

## Kontext

`scripts/lib/verify-final-state.sh` → `evaluate_final_state()` prüft den realen
Endzustand eines Pipeline-Laufs (ADR-040) in fester Reihenfolge:

1. Working Tree sauber?
2. Ungepushte Commits (`unpushed` numerisch, sonst fail-closed „nicht verifizierbar")
3. *(nur bei `pr_shepherd=true`)* PR-Zustand – `MERGED` zählt laut Kommentar „dann sind
   Draft/Auto-Merge irrelevant" bereits als Erfolg (AK6)

Schritt 2 läuft aber **immer vor** Schritt 3. Dieses Repo hat „Automatically delete
head branches" aktiv (`git-workflow.md`), d. h. nach jedem gemergten PR existiert
`origin/<branch>` nicht mehr. `verify_final_state()` liefert dafür
`unpushed="NO_UPSTREAM"`, und `evaluate_final_state()` bricht mit „Push-Zustand nicht
verifizierbar" ab – **bevor** der MERGED-Kurzschluss aus Schritt 3 je geprüft wird.
AK6 ist damit für den Normalfall (Squash-Merge + Branch-Auto-Delete) faktisch
unerreichbar; der bestehende Test dafür (`run-tests.sh` #212 AK6) verifiziert nur mit
weiterhin existierendem `origin/<branch>`.

Beobachtetes Symptom (Issue #298): `PR_SHEPHERD=true bash scripts/run-pipeline.sh 182`
führte Task #182 korrekt bis zum gemergten PR #296 durch (Issue #182 geschlossen, alle
Phasen grün), endete aber mit `exit 1` und einem `INTERRUPT-182.md`
(`INCOMPLETE_OUTCOME`, „Push-Zustand nicht verifizierbar"). Der reale Endzustand war
einwandfrei – ein Fehlalarm der Pipeline-eigenen Verifikation, der jeden künftigen
`PR_SHEPHERD=true`-Lauf bis zum Merge treffen wird und die Autonomie-/CI-Quote
(ADR-006) verzerrt.

## Scope

**Inbegriffen:**
- Reihenfolge in `evaluate_final_state()`: Ist `pr_shepherd=true` **und**
  `pr_state=MERGED`, gilt der Endzustand sofort als verifiziert (Erfolg) –
  unabhängig davon, ob `unpushed` numerisch, `NO_UPSTREAM` oder `ERROR` ist.
- Der Working-Tree-Sauber-Check (Schritt 1, F3) bleibt **vor** diesem Kurzschluss
  bestehen: ein dirty Working Tree blockiert weiterhin, auch bei `pr_state=MERGED`.
- Der MERGED-Kurzschluss gilt **ausschließlich** für `pr_state=MERGED`. Für alle
  anderen `pr_state`-Werte (`OPEN`, `CLOSED`, leer) bleibt die bisherige Reihenfolge
  (Unpushed-Prüfung zuerst, danach F1/AK3/AK4/AK5) unverändert bestehen –
  insbesondere bleibt ein geschlossener, nicht gemergter PR ohne Upstream weiterhin
  fail-closed.
- `verify_final_state()` (I/O-Wrapper) braucht **keine** Änderung an der
  Erhebungsreihenfolge – die Fakten (`unpushed` und ggf. `gh`-Daten) werden bereits
  heute vollständig erhoben, unabhängig von ihrem späteren Gebrauch. Nur die
  Entscheidungslogik in `evaluate_final_state()` ändert sich.
- Regressionstest auf beiden Ebenen (reine Entscheidungsfunktion **und**
  `verify_final_state()`-I/O-Ebene mit echtem `git`-Repo + gestubbtem `gh`), der genau
  das gemeldete Szenario abbildet: `pr_state=MERGED` **ohne** `origin/<branch>`
  (simulierter Branch-Auto-Delete nach Squash-Merge).
- ADR-040-Prosa-Abgleich: Punkt 1 der Entscheidung beschreibt aktuell unbedingt „Beide
  Modi: … keine ungepushten Commits" – wird um den MERGED-Kurzschluss präzisiert
  (Lesson `factory-workflow.md`: „PR ändert die von einer ADR namentlich beschriebene
  Mechanik → ADR-Beschreibung im selben PR mitpflegen").

**Nicht inbegriffen:**
- Verhalten bei `pr_shepherd=false` – unverändert (git-Invarianten genügen weiterhin,
  `pr_state` wird in diesem Modus ohnehin nie erhoben).
- Draft-/Auto-Merge-Logik (AK3/AK4/AK5) für alle Nicht-MERGED-PR-Zustände –
  unverändert.
- Die Agenten-Seite (`.claude/commands/pr-shepherd.md`, ADR-004) – unverändert,
  bleibt komplementäre, nicht-deterministische Schicht.
- Rückwirkende Korrektur bereits fälschlich als `failed` markierter Pipeline-Läufe
  (z. B. Task #182, PR #296) in den Autonomie-/CI-Quote-Metriken – reine
  Metrik-Korrektur, kein Teil dieser Task.
- Neuanlage einer eigenen ADR – siehe „Offene Fragen".

## Akzeptanzkriterien
- [ ] GIVEN `tree_status=clean`, `pr_shepherd=true`, `pr_state=MERGED`,
      `unpushed=NO_UPSTREAM` (nicht-numerisch, wie nach Branch-Auto-Delete),
      WHEN `evaluate_final_state()` läuft,
      THEN ist der Endzustand verifiziert (exit 0) – nicht mehr „Push-Zustand nicht
      verifizierbar".
- [ ] GIVEN dieselbe Konstellation, aber `unpushed=3` (numerisch, >0),
      WHEN `evaluate_final_state()` läuft,
      THEN ist der Endzustand ebenfalls verifiziert (exit 0) – `MERGED` zählt
      unabhängig vom `unpushed`-Wert als Erfolg.
- [ ] GIVEN `tree_status=dirty`, `pr_shepherd=true`, `pr_state=MERGED`,
      WHEN `evaluate_final_state()` läuft,
      THEN bleibt der Lauf nicht verifiziert und meldet weiterhin „Working Tree nicht
      sauber" (der MERGED-Kurzschluss umgeht NICHT den Tree-Check).
- [ ] GIVEN `pr_shepherd=true`, `pr_state≠MERGED` (z. B. `OPEN` oder `CLOSED`) UND
      `unpushed` nicht-numerisch (`NO_UPSTREAM`/`ERROR`),
      WHEN `evaluate_final_state()` läuft,
      THEN bleibt der Lauf fail-closed nicht verifiziert mit „Push-Zustand nicht
      verifizierbar" (Regressions-Guard: der Kurzschluss gilt NUR für `MERGED`, nicht
      generell für `pr_shepherd=true`).
- [ ] GIVEN `pr_shepherd=false`,
      WHEN `evaluate_final_state()` mit beliebigem `pr_state`/`is_draft`/`auto_merge`
      läuft,
      THEN bleibt das Verhalten unverändert (AK1/AK2/F2/F3 wie bisher).
- [ ] GIVEN die bestehenden Testfälle AK1–AK6 und F1–F4 in
      `scripts/checks/tests/run-tests.sh` (#212-Block),
      WHEN die Suite nach dem Fix läuft,
      THEN bleiben alle unverändert grün (keine Regression).
- [ ] GIVEN `verify_final_state()` auf I/O-Ebene: ein echtes `git`-Repo, dessen
      `origin/<branch>` nach einem simulierten Squash-Merge gelöscht wurde (analog
      „Automatically delete head branches"), plus gestubbtes `gh`, das `MERGED`
      liefert,
      WHEN `verify_final_state()` aufgerufen wird,
      THEN ist der Endzustand verifiziert (exit 0) – reproduziert das in Issue #298
      beschriebene Szenario auf I/O-Ebene, nicht nur auf der reinen
      Entscheidungsfunktion.
- [ ] GIVEN ADR-040 (`docs/adr/040-pipeline-endzustands-verifikation.md`), WHEN der
      Fix umgesetzt ist, THEN beschreibt Punkt 1 der Entscheidung den
      MERGED-Kurzschluss (keine unbedingte „keine ungepushten Commits"-Aussage mehr
      für den `pr_shepherd=true`-Fall).

## Fehlerszenarien
- [ ] `pr_state` leer/nicht verwertbar (gh-Fehler, F1) UND `unpushed` gleichzeitig
      nicht-numerisch → bleibt fail-closed. Da `pr_state` in diesem Fall nicht
      `MERGED` ist, greift die bestehende Reihenfolge (Unpushed-Check zuerst) – die
      Meldung bleibt „Push-Zustand nicht verifizierbar" (F2), unverändert zum
      heutigen Verhalten.
- [ ] `pr_state=CLOSED` (nicht gemergt) + `unpushed=NO_UPSTREAM` → bleibt fail-closed
      „Push-Zustand nicht verifizierbar" (kein stiller Erfolg für abgelehnte/
      geschlossene PRs, deren Branch dennoch server-seitig gelöscht wurde).

## Offene Fragen
- [ ] Reicht eine reine Prosa-Korrektur in ADR-040 (Präzisierung von Punkt 1, kein
      neuer Status/Abschnitt), oder soll `/architecture` einen eigenen ADR-Trigger
      auslösen? Empfehlung: Prosa-Korrektur im selben PR – es handelt sich um eine
      Präzisierung einer bereits getroffenen Entscheidung, keine neue
      Architektur-Entscheidung.
- [ ] Sollen die historisch fälschlich als `failed` markierten Pipeline-Läufe (z. B.
      Task #182 / PR #296) rückwirkend in den Autonomie-/CI-Quote-Metriken korrigiert
      werden? Vorschlag: separates Issue, falls gewünscht – nicht Teil dieser Task.
