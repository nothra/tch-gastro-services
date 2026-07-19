# Task 173: deploy-freeze-bei-rotem-gate

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Struktureller Schutz gegen falsch-grüne Deploy-Gates: Sobald ein Gate-Lauf über
verifikationsrelevante Schritte rot wird, wird ein **Freeze** gesetzt. Der Promote-Schritt
verweigert **fail-closed** jeden weiteren Promote (inkl. PRD-DB-Migration), solange der Freeze
steht. `main` läuft normal weiter – nur **deployt** wird nichts, bis ein Maintainer den Freeze
nach Fix + Verifikation aufhebt. Verhindert, dass ein einmal rotes Gate durch einen späteren,
evtl. flaky-grünen Lauf still überholt wird (Vorfall 19.07.2026: #134-rot → #167-flaky-grün →
fehlerhafter Code auf Produktion).

Spec: [`docs/specs/spec-173-deploy-freeze-bei-rotem-gate.md`](../docs/specs/spec-173-deploy-freeze-bei-rotem-gate.md)

**Requirements-Entscheidungen:** (1) Trigger eingegrenzt – nur E2E/Migrations-Fehler frieren,
nicht Infra-Flakes. (2) Freeze-Check **vor** der PRD-Migration (kein Prod-DB-Seiteneffekt).
(3) Aktive Benachrichtigung zusätzlich zum Log.

## Akzeptanzkriterien
- [x] AC1 – Rotes Gate (E2E gegen INT / `db:migrate:int` / `db:migrate:prd`) setzt persistenten Freeze-Marker (Grund + blockierender SHA).
- [x] AC2 – Reine Infra-/Vorbereitungsfehler (Secret-Check, Install, INT-Deploy-Timeout, Neon-Reset, Anonymisierung) setzen **keinen** Freeze.
- [x] AC3 – Promote fail-closed: Marker gesetzt **oder** unlesbar → weder PRD-Migration+Seed noch Promote-Push.
- [x] AC4 – Freeze-Check läuft **vor** der PRD-DB-Migration (kein Seiteneffekt auf die Prod-DB).
- [x] AC5 – Wegen Freeze zurückgehaltener Promote endet **ohne Fehler** (nicht rot), mit klarer Meldung (SHA + Grund).
- [x] AC6 – Automatisierter Test simuliert #134-rot → #167-grün und belegt: grüner Folgelauf promotet **nicht**.
- [x] AC7 – Dokumentierter, manueller Freigabe-Weg (Maintainer); nach Freigabe promotet der nächste Lauf wieder.
- [x] AC8 – Aktive Benachrichtigung bei Freeze-Setzen **und** bei blockiertem Promote (SHA + Grund).
- [x] AC9 – ADR ergänzt (Marker-Variante, Trigger, Check-Position, Freigabe, Benachrichtigung, Zusammenspiel ADR-007/017/`concurrency`) + README/Runbook-Doku.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Architektur entschieden in [ADR-032](../docs/adr/032-deploy-freeze-bei-rotem-gate.md).

**Umsetzungs-Bausteine (TDD-Reihenfolge):**
1. **`scripts/deploy-freeze.sh`** (neu, testbar) – Subkommandos:
   - `set <sha> <grund>` → `git push origin <sha>:refs/factory/deploy-freeze` (fail-closed: Push-Fehler → non-zero).
   - `check` → Exit `0`=eingefroren, `10`=nicht eingefroren, sonst=unklar. Via `git ls-remote`.
   - `release` → `git push origin --delete refs/factory/deploy-freeze` (idempotent, „nicht vorhanden" = ok).
   - `status` → blockierenden SHA ausgeben.
   - Env-Overrides `FREEZE_REMOTE`, `FREEZE_REF` für Bare-Repo-Test.
2. **`scripts/checks/tests/run-tests.sh`** – Bare-Repo-Simulation (AC6): set→check(0)→check bleibt 0
   (grüner Folgelauf)→release→check(10); plus Nachweis, dass unlesbar (Exit≠10) fail-closed wirkt.
3. **`.github/workflows/deploy-gate.yml`**:
   - INT-Sammelstep splitten: `db:migrate:int` in eigenen Step `id: migrate_int` (Anonymize/Seed bleiben ohne Trigger).
   - `id: e2e` an „E2E gegen INT"; `id: migrate_prd` an „PRD-DB migrieren + Login seeden".
   - Neuer Step `id: check_freeze` **vor** der PRD-Migration → `frozen`-Output (fail-closed: unklar→true).
   - `if: steps.check_freeze.outputs.frozen != 'true'` an PRD-Migration+Seed, Promote-Push, Post-Deploy-Healthcheck.
   - Bei `frozen=true`: `::warning::` + Step-Summary (SHA+Grund) + Benachrichtigung, **kein** exit 1 (Lauf grün, AC5).
   - Neuer Step `set_freeze` mit `if: failure() && (e2e|migrate_int|migrate_prd outcome == 'failure')` → `set` + Benachrichtigung.
   - `permissions:` um `issues: write` erweitern.
4. **Benachrichtigung** (fail-open, `gh issue`): dediziertes „Deploy-Freeze"-Tracking-Issue kommentieren/öffnen
   beim Setzen+Blockieren, schließen bei Freigabe. Darf den fail-closed Marker nie blockieren.
5. **Freigabe-Job** `workflow_dispatch` (neuer/kleiner Workflow) → `deploy-freeze.sh release`.
6. **Doku:** Freigabe-Weg + Freeze-Konzept in README/Runbook.

**Live zu verifizieren (nicht annehmen):** `refs/factory/*`-Push mit `GITHUB_TOKEN` (`contents: write`).
Fällt das aus → Rückfall Option B (PAT + Repo-Variable), siehe ADR-032.

## Implementierungs-Notizen (aus /implement)

**Umgesetzt (TDD, run-tests.sh: 339 grün / 0 rot):**
- `scripts/deploy-freeze.sh` – Subkommandos `set`/`check`/`release`/`status`; dokumentierte
  Exit-Codes (`check`: 0=frozen, 10=frei, sonst=unklar→fail-closed). Env-Overrides
  `FREEZE_REMOTE`/`FREEZE_REF` für den Bare-Repo-Test. **Doppel-Freeze**: `set` überschreibt einen
  bestehenden Freeze **nicht** (ursprünglicher SHA bleibt nachvollziehbar, Spec-Fehlerszenario).
- `scripts/deploy-freeze-notify.sh` – fail-open Tracking-Issue-Benachrichtigung (`frozen`/
  `blocked`/`released`); endet **immer** exit 0, damit der fail-closed Marker nie blockiert wird.
- `.github/workflows/deploy-gate.yml` – Sammelschritt gesplittet (`db:migrate:int` → eigener
  `id: migrate_int`, Anonymisierung/Seed bleiben Infra); `id: e2e`/`id: migrate_prd` gesetzt;
  `.env.int` wird einmal angelegt + per `always()`-Step entfernt. Neuer `check_freeze`-Step **vor**
  der PRD-Migration (AC4); `if: steps.check_freeze.outputs.frozen != 'true'` an PRD-Migration,
  Promote-Push und Healthcheck (AC3/AC5). `set_freeze`-Step mit
  `if: failure() && (e2e|migrate_int|migrate_prd outcome == 'failure')` (AC1/AC2). `permissions:
  issues: write` ergänzt (AC8).
- `.github/workflows/deploy-freeze-release.yml` – `workflow_dispatch`-Freigabe (AC7), teilt
  `concurrency: deploy-gate` (kein Setzen/Freigeben-Race).
- Doku: README → „Deploy-Freeze bei rotem Gate (ADR-032)" (Konzept + Freigabe-Weg). ADR-032
  lag bereits vor (/architecture).
- Tests: neuer Abschnitt in `scripts/checks/tests/run-tests.sh` – Bare-Repo-Simulation der
  Vorfall-Sequenz #134-rot → #167-grün (AC6), Doppel-Freeze, fail-closed bei unlesbarem Marker,
  Aufruf-Fehler; notify fail-open (ohne gh) + Happy-Path (gh-Mock); YAML-Verdrahtungs-Guards.

**Hinweis Datei-Modus:** `chmod +x` war in dieser Session durch den Permission-Mode blockiert;
die neuen Skripte werden ausschließlich via `bash scripts/…` aufgerufen (Workflow, Tests, README) –
der Exec-Bit ist funktional nicht nötig. Beim Commit über `git update-index --chmod=+x` nachziehen,
falls Konsistenz gewünscht.

**Blocker [2026-07-19]: `refs/factory/*`-Push mit `GITHUB_TOKEN` live verifizieren** – ADR-032
verlangt (Projekt-Ethos, nicht annehmen), dass ein `git push origin <sha>:refs/factory/deploy-freeze`
aus GitHub Actions mit dem `contents: write`-`GITHUB_TOKEN` + `fetch-depth: 0` tatsächlich durchgeht.
Das ist erst **nach dem Merge** auf `main` (Deploy-Gate läuft nur auf `push:main`) prüfbar. Mensch:
nach Merge einen kontrollierten roten Verifikations-Lauf oder einen manuellen
`bash scripts/deploy-freeze.sh set <sha> test` aus dem Actions-Kontext beobachten; scheitert der
Ref-Push (Ruleset/Token-Scope), auf Option B (PAT + Repo-Variable, ADR-032) umstellen. Bis dahin
ist die Logik lokal (Bare-Repo) vollständig belegt, die reale Push-Berechtigung aber nicht.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Alle in ADR-032 entschieden: Marker = Git-Sentinel-Ref `refs/factory/deploy-freeze`;
Benachrichtigung = Tracking-Issue (fail-open); Freigabe = `workflow_dispatch`; Trigger = `e2e`/`migrate_int`/`migrate_prd`;
Testbarkeit via `scripts/deploy-freeze.sh` + Bare-Repo-Test. Keine offenen Fragen mehr.

## Review-Findings
<!-- Wird durch /review befüllt -->
Review-Runde 1 (`tasks/review-173.md`): NEEDS_REWORK – 1 kritisch (K1), 2 wichtig (W1/W2),
1 wichtig (W3) + Nitpicks. **Rework [2026-07-19] behoben:**
- **K1** (`deploy-freeze.sh`): Fail-open-Loch im `set`-`*)`-Zweig geschlossen – bei unklarer
  Marker-Lage wird der non-force Push jetzt **trotzdem versucht** (fehlt das Ref → angelegt;
  Freeze existiert → bleibt, FF re-pointet nur den SHA), statt still ohne Marker abzubrechen.
  Push-Fehler bleibt non-zero. Kommentar korrigiert.
- **W1/W2** (Testlücken): `run-tests.sh` deckt jetzt die fail-closed-„unklar"-Zweige
  (`set`/`status`/`release` gegen unlesbaren Remote) und den notify-Existing-Issue-Pfad
  (Kommentar + reopen/close für `frozen`/`blocked`/`released`) ab.
- **W3**: Maintainer-Workflow-Name in `notify.sh` + `deploy-gate.yml` auf den Anzeigenamen
  „Deploy-Freeze aufheben (Freigabe)" (konsistent mit README).
- Nitpicks bewusst offen (optional, kein Verhaltensrisiko). Rest-Blocker `refs/factory/*`-Live-Push
  unverändert (erst post-merge prüfbar).
- Tests: **352 grün / 0 rot** (vorher 339).

Review-Runde 2 (`tasks/review-173.md`): NEEDS_REWORK – 1 wichtig (W1), Nitpicks unverändert offen.
**Rework [2026-07-19] behoben:**
- **W1** (`deploy-freeze-release.yml`): Actions-Script-Injection – die freie `workflow_dispatch`-
  Eingabe `${{ inputs.grund }}` und `${{ github.actor }}` waren inline in beide `run:`-Shells
  interpoliert. Jetzt je Step über `env:` (`GRUND`/`ACTOR`) gelesen und nur gequotet als
  `"$GRUND"`/`"$ACTOR"` genutzt – 1:1 wie das `#66`-Härtungsmuster im Schwester-Workflow
  `deploy-gate.yml`. Neuer TDD-Guard in `run-tests.sh` (`userinput_in_run`, Block-Scalar-Tracking
  wie `secrets_in_run`, mit Positiv-/Negativ-Kontrolle) belegt: kein inline `${{ inputs.* }}`/
  `${{ github.actor }}` in `run:`-Blöcken, Werte über `env:`.
- Nitpicks bewusst offen (kein Verhaltensrisiko). Rest-Blocker `refs/factory/*`-Live-Push
  unverändert (erst post-merge prüfbar).
- Tests: **358 grün / 0 rot** (vorher 355 gesamt, davon 3 rot vor dem Fix).

Review-Runde 3 (`tasks/review-173.md`): **APPROVED** – 0 kritisch, 0 wichtig, nur Nitpicks
(bewusst offen, kein Verhaltens-/Sicherheitsrisiko). Frischer Drei-Perspektiven-Pass über den
reworkten Stand fand keine neuen Defekte; die drei Runden sind konvergiert (je distinkter,
behobener Fund – kein Circuit-Breaker-Deadlock). 358 grün / 0 rot lokal verifiziert. Rest-Blocker
`refs/factory/*`-Live-Push unverändert (erst post-merge prüfbar). Weiter zu `/test`.

## Test-Notizen (aus /test)

Kein Produktionscode geändert (nur Verifikation), da diese Task ausschließlich Shell-Skripte
und Workflow-YAML umfasst (`git diff main...HEAD` zeigt keine `.ts`/`.tsx`-Änderungen) – die
projektweite Vitest-Coverage ist daher eine unveränderte Baseline und für diese Task nicht
aussagekräftig; der maßgebliche Test-Harness ist `scripts/checks/tests/run-tests.sh`.

- `bash scripts/checks/tests/run-tests.sh` → **358 grün / 0 rot**.
- AC-für-AC gegen die vorhandenen Tests verifiziert (Zeilen in `run-tests.sh`, Abschnitt
  „#173 Deploy-Freeze (ADR-032)"): AC1 (set + Grund/SHA), AC3/AC4 (fail-closed vor PRD-Migration,
  Positions-Guard `check_freeze` vor `migrate_prd`), AC5 (Step endet immer exit 0, Log/Summary
  mit SHA+Grund), AC6 (Bare-Repo-Simulation #134-rot → #167-grün: Freeze bleibt bestehen, kein
  Promote), AC7 (release + Idempotenz + workflow_dispatch-Verdrahtung), AC8 (notify fail-open +
  Happy-Path inkl. Existing-Issue-Pfad), AC9 (README + ADR-032 vorhanden, per Grep bestätigt).
  AC2 (Infra-Fehler frieren nicht) ist strukturell durch die `if:`-Bedingung von `set_freeze`
  abgesichert (referenziert ausschließlich `e2e`/`migrate_int`/`migrate_prd`-Outcomes; ein davor
  gescheiterter Infra-Step lässt diese `skipped`, nie `failure`) – eine volle GH-Actions-Ausführung
  zur Laufzeit-Verifikation ist nicht Teil des Test-Ansatzes dieses Repos (Workflows werden
  durchgängig strukturell per Grep/Positions-Guard getestet, nicht via `act`).
- Keine Lücken gefunden – keine neuen Tests nötig, kein Produktionscode angefasst.
- Rest-Blocker unverändert: `refs/factory/*`-Live-Push aus GITHUB_TOKEN erst nach Merge auf
  `main` prüfbar (siehe Implementierungs-Notizen).

## Refactoring-Notizen (aus /refactor)

Kein neues Verhalten – drei der Review-Runde-3-Nitpicks behoben (interne Struktur/Robustheit):
- **`deploy-freeze.sh` (`freeze_release`)**: „Ref bestätigt weg" (Race, idempotent) und „Remote-
  Status nicht verifizierbar" (transient unlesbar) geben jetzt unterschiedliche, ehrliche
  Meldungen aus – vorher hieß beides „idempotent", was einen Maintainer im Notfall-Entblock
  fälschlich glauben lassen konnte, der Freeze sei sicher aufgehoben. Verhalten (fail-open,
  Exit 0) unverändert, nur die Meldung präzisiert.
- **`deploy-freeze-notify.sh` (`find_issue`)**: toter Feld-Selektor entfernt (`--json number,state`
  → `--json number`, `state` wurde nie gelesen).
- **`deploy-gate.yml` + `deploy-freeze-release.yml`**: `RUN_URL` (Server-URL + Repo + Run-ID) war
  an drei Stellen einzeln zusammengesetzt – jetzt einmal als Job-`env:` definiert, an allen drei
  Notify-Aufrufstellen wiederverwendet (DRY).
- Verbleibende Nitpicks (Emoji-Titel-Suche statt Label-Filter, generischer Grund auf Folgeläufen,
  toter INT-Refresh-Zweig außerhalb des Scopes) bewusst weiter offen: kein Verhaltensrisiko, und
  der Label-Filter-Vorschlag hätte einen echten Verhaltens-Trade-off (ein ohne Label angelegtes
  Fallback-Issue würde von einer reinen Label-Suche nie wiedergefunden) – das wäre keine reine
  Struktur-Verbesserung mehr, sondern eine funktionale Änderung, die eine eigene Review-Runde
  verdient.
- `bash scripts/checks/tests/run-tests.sh` → **358 grün / 0 rot** (unverändert, keine Test-Anpassung
  nötig – reines internes Refactoring, keine `.ts`/`.tsx`-Dateien betroffen).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/173-deploy-freeze-bei-rotem-gate`
Erstellt: 2026-07-19 17:51
