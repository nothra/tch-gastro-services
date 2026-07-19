# Review: Task 173 – Deploy-Freeze bei rotem Gate (ADR-032)

Multi-Persona-Review, **Runde 3** (nach Rework von Runde 1 + Runde 2). Alle **358 Tests grün / 0 rot**
(lokal verifiziert). Dies ist die dritte Review-Iteration – der Circuit Breaker (max. 3) ist erreicht.
Die beiden Vorrunden fanden je einen **eigenständigen, realen** Fund (R1: Fail-open-Loch im `set`-`*)`-
Zweig + Testlücken; R2: Actions-Script-Injection im Freigabe-Workflow) – beide sind im Code nachweisbar
behoben. Kein wiederkehrender/ungelöster Konflikt → keine Eskalation nötig, sondern **Konvergenz**.

Frischer Blick auf den reworkten Stand über alle drei Perspektiven (Logik/Korrektheit, Code-Qualität,
Architektur): konsequent fail-closed an ADR-032 orientiert, sauber getestet, Doku vollständig. **Keine
neuen kritischen oder wichtigen Findings.** Die verbleibenden Punkte sind Nitpicks ohne Verhaltens-/
Sicherheitsrisiko (teils schon aus R1/R2 bewusst offen gehalten).

## Kritische Findings (müssen behoben werden)
- _keine._

## Wichtige Findings (sollten behoben werden)
- _keine._

## Nitpicks (optional)
- [ ] **`deploy-freeze.sh:138-140` – irreführende Erfolgsmeldung von `release` bei *unerreichbarem*
      Remote.** Der `*)`-„unklar"-Zweig von `freeze_release` ist bewusst fail-open (Test 14: Entblock-
      Richtung, ein nicht durchführbarer Delete soll keinen roten Lauf erzeugen) – das ist korrekt und
      **sicher** (der Freeze bleibt bestehen, der Promote-Guard verweigert weiter, der nächste Gate-Lauf
      re-öffnet via `notify blocked` das Tracking-Issue → selbstheilend). Aber die Meldung „Kein Freeze
      aktiv (Ref bereits weg) – idempotent." ist bei *transient nicht erreichbarem* Remote **faktisch
      falsch** (verwechselt „Ref bestätigt weg" mit „Delete nicht verifizierbar"). Im Notfall-Entblock-
      Kontext könnte ein Maintainer den Freeze fälschlich für aufgehoben halten. Keine Verhaltens-
      änderung nötig – nur die Meldung im `! ls-remote`-Zweig ehrlicher fassen (z. B. „Ref-Status nicht
      verifizierbar – Freigabe fail-open behandelt; nächsten Gate-Lauf/Tracking-Issue prüfen").
- [ ] **`deploy-freeze-notify.sh:45` – toter Feld-Selektor** (aus R1/R2): `--json number,state`, `--jq`
      nutzt nur `.number`. `--json number` genügt.
- [ ] **`deploy-freeze-notify.sh:45` – Tracking-Issue-Suche über Emoji-Titel + Substring** (aus R1/R2):
      `--search 'in:title "🚫 Deploy-Freeze aktiv"'` – Emoji-Tokenisierung nicht garantiert
      deterministisch → im Fehlfall Issue-Duplikate (rein fail-open). Besser per Label filtern.
- [ ] **Generischer „Grund" auf `blocked`-Folgeläufen** (aus R1/R2, `deploy-gate.yml:216`): das Ref trägt
      nur den SHA (ADR §1); fällt die `frozen`-Notify aus (fail-open), überlebt der Ursprungsgrund nur in
      Summary/Log des roten Laufs. Ein Satz in ADR/README würde das explizit machen.
- [ ] **Run-URL dreifach dupliziert** (aus R1/R2, `deploy-gate.yml:227,304` + `deploy-freeze-release.yml:65`)
      – per job-level `env: RUN_URL` DRY-fähig.
- [ ] **`set_freeze` bei Push-Fehler ohne Notify/Summary** (aus R1/R2, `deploy-gate.yml:295-314`):
      default `bash -eo pipefail` bricht bei non-zero `deploy-freeze.sh set` ab → `notify frozen` +
      Summary laufen dann nicht. Vertretbar (Step wird rot/sichtbar), aber erwähnenswert.
- [ ] **Toter „INT-Refresh übersprungen"-Zweig** (aus R1/R2, `deploy-gate.yml:100-120`): der Pflicht-
      Secret-Check macht die Neon-Secrets verpflichtend → `steps.refresh.outputs.enabled` ist im scharfen
      Gate immer `'true'`; die `enabled == 'true'`-Guards + Warnung beschreiben einen unerreichbaren
      Zustand. (Vorbestehend, außerhalb des #173-Scopes.)

## Positives
- **Konvergenz über drei Runden:** Jede Runde fand einen *distinkten* realen Fund; alle behoben, kein
  Zurückdrehen. R1-Fix (`freeze_set`-`*)`-Zweig pusht jetzt trotzdem → kein Fail-open-Loch) und R2-Fix
  (`inputs.grund`/`github.actor` über `env:` gequotet, 1:1 wie #66) sind im Diff **und** durch neue
  TDD-Guards (`userinput_in_run` mit Positiv-/Negativ-Kontrolle) belegt.
- **Fail-closed durchgezogen:** `check_freeze` setzt `frozen=false` **ausschließlich** bei Exit 10;
  Exit 0 **und** jeder andere Exit (unklar/unlesbar) → `frozen=true`. `set +e; …; set -e` sauber
  gekapselt; alle drei Prod-Schritte (PRD-Migration, Promote, Healthcheck) hinter `if: …frozen != 'true'`.
- **Trennung Maschine/Mensch** konsequent: Ref = fail-closed Maschinen-Grenze, Tracking-Issue = fail-open
  Mensch-Signal (`notify.sh` endet immer exit 0). Kein Benachrichtigungs-Ausfall kann die Schutzwirkung
  untergraben.
- **Trigger scharf (AC1/AC2):** `set_freeze` nur bei `failure()` **und** `e2e|migrate_int|migrate_prd`
  outcome `failure`; ein fehlschlagender Step bricht den Job ab → höchstens ein outcome `failure`,
  Infra-Fehler lassen alle drei leer/skipped → kein Freeze. `db:migrate:int` sauber aus dem Sammelstep
  herausgelöst.
- **AC4** robust getestet (`check_freeze` vor `migrate_prd` via Zeilenvergleich, `id:`-Präfix je 1×).
  **AC5** (frozen-Zweig endet grün, kein `exit 1`). **AC6** über Bare-Repo-Simulation der Vorfall-
  Sequenz #134-rot → #167-grün, inkl. Doppel-Freeze (SHA_A bleibt) + fail-closed „unklar"-Zweige.
- **Concurrency:** Gate + Release teilen `group: deploy-gate`, `cancel-in-progress: false` → kein
  Setzen/Check/Freigabe-Race. **`fetch-depth: 0`** in beiden Workflows (FF-Regel). Least-Privilege
  `permissions` (`contents`+`issues: write`). `refs/factory/*` korrekt außerhalb `protect-main` (ADR-029).
- **Kein required-Check-Risiko (#155):** beide Workflows `push:main`- bzw. `workflow_dispatch`-only.
  **Routen-Doku (#145):** kein `page.tsx`/`route.ts` im Diff → zu Recht unangetastet.
- **Doku vollständig (AC9):** ADR-032 deckt Marker-Variante + Alternativen, Trigger, Check-Position,
  Freigabe, Benachrichtigung und Zusammenspiel `concurrency`/ADR-007/017 ab; README beschreibt Setzen/
  Blockieren/Benachrichtigung/Freigabe inkl. korrektem Workflow-Anzeigenamen + CLI-Fallback.

## Offener Rest-Blocker (kein Rework-Punkt, kein Merge-Stopper)
- **`refs/factory/*`-Push mit `GITHUB_TOKEN` live verifizieren** (Task-Blocker 2026-07-19). Erst
  post-merge prüfbar (Gate läuft nur auf `push:main`); Option-B-Fallback (PAT + Repo-Variable) im
  ADR-032 dokumentiert. Empfehlung: als eigenes Post-Merge-Todo/Issue führen, damit die Verifikation
  nicht in der (nach Merge auf `main` liegenden) Task-Datei untergeht.

## Empfehlung
APPROVED

Keine kritischen oder wichtigen Findings; die drei Runden sind konvergiert (jeweils distinkte, behobene
Funde – kein Circuit-Breaker-Deadlock). Verbleibende Nitpicks sind optional und ohne Verhaltens-/
Sicherheitsrisiko; der oben markierte `release`-Meldungs-Nitpick betrifft nur Text, nicht die (sichere,
getestete) Semantik. Weiter zu `/test` bzw. `/security-review`. Rest-Blocker (Live-Push) unverändert
post-merge.
