# Review: Task 173 – Deploy-Freeze bei rotem Gate (ADR-032)

Multi-Persona-Review, **Runde 2** (nach Rework von Runde 1). Alle 352 Tests grün.
Runde 1 (K1/W1/W2/W3) ist im Code nachweisbar behoben: der `freeze_set`-`*)`-Zweig versucht den
Push jetzt trotzdem (kein Fail-open-Loch), die fail-closed-„unklar"-Zweige und der
notify-Existing-Issue-Pfad sind getestet, der Maintainer-Workflow-Name ist auf den Anzeigenamen
gezogen. Gesamteindruck weiterhin: sauber am ADR-032 orientiert, konsequent fail-closed.

Beim frischen Blick auf den **reworkten** Stand fällt jedoch ein Fund auf, den Runde 1 nicht
hatte: der **neue** Freigabe-Workflow interpoliert die freie `workflow_dispatch`-Eingabe direkt
in `run:`-Shell – genau das Script-Injection-Muster, gegen das der Schwester-Workflow
`deploy-gate.yml` in **demselben PR** bewusst härtet (#66). → NEEDS_REWORK (ein Punkt, klein).

## Kritische Findings (müssen behoben werden)
- _keine._

## Wichtige Findings (sollten behoben werden)
- [x] **`.github/workflows/deploy-freeze-release.yml:44,55,59,60` (auch `:43`) – freie
      `workflow_dispatch`-Eingabe `${{ inputs.grund }}` (und `${{ github.actor }}`) inline in
      `run:`-Shell interpoliert (Actions-Script-Injection + funktionaler Bruch).** GitHub ersetzt
      `${{ … }}` **textuell vor** der Shell; `inputs.grund` ist frei getippter Text. Ein Grund mit
      Backtick/`$(…)` führt Code als Workflow-Token aus, einer mit `"`/`;` bricht das Kommando bzw.
      die Argument-Zerlegung (Zeile 55 gibt `grund` positionsbasiert an `notify` weiter → falsche
      Args). Genau der Fall, den #66 schließt – der Schwester-Workflow `deploy-gate.yml` liest **alle**
      `${{ }}`-Werte über `env:` und testet nur gequotet (`$BYPASS` …) und begründet sogar explizit,
      *warum* nur GitHub-kontrollierte `outcome`-Werte inline sicher sind (Z.296). `inputs.grund` ist
      das Gegenteil (User-Input) und gehört nach demselben Maßstab **nicht** inline. Deckt sich mit
      der Projekt-Regel „nutzerkontrollierte Werte als Daten behandeln, nie als Code"
      (`clean-code.md`). Besonders heikel, weil dies der **Notfall-Entblock-Pfad** ist: bricht die
      Freigabe an einem Sonderzeichen, bleibt die Produktion eingefroren.
      *Fix:* `inputs.grund`/`github.actor` je als Step-`env:` (`GRUND: ${{ inputs.grund }}`,
      `ACTOR: ${{ github.actor }}`) setzen und in `run:` nur gequotet als `"$GRUND"`/`"$ACTOR"`
      nutzen – 1:1 wie in `deploy-gate.yml`. Threat-Surface ist auf Schreibrechte begrenzt (kein
      Privilege-Escalation), daher „wichtig" statt „kritisch" – aber ein dokumentiert nicht-
      verhandelbares Härtungsmuster im selben PR einseitig zu verletzen sollte nicht durchrutschen.

## Nitpicks (optional)
Unverändert aus Runde 1 bewusst offen gelassen (kein Verhaltensrisiko):
- [ ] **`deploy-gate.yml:100-120` – toter „INT-Refresh übersprungen"-Zweig.** Der Pflicht-Secret-Check
      macht die Neon-Secrets verpflichtend → `steps.refresh.outputs.enabled` ist im scharfen Gate immer
      `'true'`; die `enabled == 'true'`-Guards + Warnung beschreiben einen unerreichbaren Zustand.
- [ ] **`deploy-freeze-notify.sh:45` – Tracking-Issue-Suche über Emoji-Titel + Substring.**
      `--search 'in:title "🚫 Deploy-Freeze aktiv"'` – Emoji-Tokenisierung nicht garantiert
      deterministisch → im Fehlfall Issue-Duplikate (rein fail-open). Besser ohne Emoji / per Label.
- [ ] **`deploy-freeze-notify.sh:45` – toter Feld-Selektor.** `--json number,state`, `--jq` nutzt nur
      `number`. `--json number` genügt.
- [ ] **Run-URL dreifach dupliziert** (`deploy-gate.yml:227,304` + `deploy-freeze-release.yml:54`) –
      per job-level `env: RUN_URL` DRY-fähig.
- [ ] **`set_freeze` bei Push-Fehler ohne Notify/Summary** (`deploy-gate.yml:295-314`): default
      `bash -eo pipefail` bricht bei non-zero `deploy-freeze.sh set` ab → `notify frozen` + Summary
      laufen nicht mehr. Vertretbar (Step wird rot/sichtbar), aber erwähnenswert.
- [ ] **Generischer „Grund" auf `blocked`-Folgeläufen** (`deploy-gate.yml:216`): das Ref trägt nur den
      SHA (ADR §1), der Ursprungsgrund lebt im Tracking-Issue-Verlauf – fällt die `frozen`-Notify aus
      (fail-open), überlebt der echte Grund nur in Summary/Log des roten Laufs. Ein Satz in ADR/README.

## Positives
- **Runde-1-Rework sauber:** `freeze_set` `*)`-Zweig pusht jetzt trotzdem (non-FF-Semantik schützt einen
  bestehenden Freeze; fehlt das Ref, wird es angelegt) → das Fail-open-Loch (K1) ist geschlossen,
  Kommentar korrigiert; Push-Fehler bleibt non-zero sichtbar.
- **Fail-closed durchgezogen:** `check_freeze` setzt `frozen=false` **ausschließlich** bei Exit 10;
  Exit 0 **und** jeder andere Exit (unklar/unlesbar) → `frozen=true`. `set +e; …; set -e` sauber
  gekapselt; alle drei Prod-Schritte (PRD-Migration, Promote, Healthcheck) hinter
  `if: …frozen != 'true'`.
- **AC4** robust getestet (`check_freeze` vor `migrate_prd` via Zeilenvergleich, `id:`-Präfix je 1×).
  **AC5** (frozen-Zweig endet grün, kein `exit 1`). **AC2** (Trigger scharf auf
  `e2e|migrate_int|migrate_prd`, skipped ≠ failure). **AC6** über Bare-Repo-Simulation der
  Vorfall-Sequenz #134-rot → #167-grün.
- **Testabdeckung erweitert (352, +13):** fail-closed-„unklar"-Zweige von `set`/`status`/`release`
  gegen unlesbaren Remote; notify Existing-Issue-Pfad (Kommentar + reopen/close) für
  `frozen`/`blocked`/`released` **und** Neuanlage-/kein-Issue-Fälle; Aufruf-/Argument-Fehler.
- **Concurrency:** Gate + Release teilen `group: deploy-gate`, `cancel-in-progress: false` → kein
  Setzen/Check/Freigabe-Race. **`fetch-depth: 0`** in beiden Workflows (FF-Regel). Least-Privilege
  `permissions` (`contents`+`issues: write`). Erste `refs/factory/*`-Nutzung korrekt außerhalb
  `protect-main` (ADR-029).
- **Trennung Maschine/Mensch** (Ref = fail-closed / Tracking-Issue = fail-open) konsequent; `notify.sh`
  endet immer exit 0. **Kein required-Check-Risiko (#155):** beide Workflows `push:main`- bzw.
  `workflow_dispatch`-only. **Routen-Doku (#145):** kein `page.tsx`/`route.ts` im Diff → zu Recht
  unangetastet. **README (AC9)** vollständig mit korrektem Anzeigenamen.

## Offener Rest-Blocker (kein Rework-Punkt, kein Merge-Stopper)
- **`refs/factory/*`-Push mit `GITHUB_TOKEN` live verifizieren** (Task-Blocker 2026-07-19). Erst
  post-merge prüfbar (Gate läuft nur auf `push:main`); Option-B-Fallback (PAT + Repo-Variable) im
  ADR-032 dokumentiert. Empfehlung: als eigenes Post-Merge-Todo/Issue führen, damit die Verifikation
  nicht in der (nach Merge auf `main` liegenden) Task-Datei untergeht.

## Empfehlung
NEEDS_REWORK

Einziger Blocker: der inline-interpolierte `inputs.grund`/`github.actor` im Freigabe-Workflow
(`deploy-freeze-release.yml`) – über Step-`env:` + Quoting entschärfen (1:1 wie `deploy-gate.yml`,
#66). Kleiner, klar umrissener Fix. Nitpicks nach Ermessen; Rest-Blocker unverändert (post-merge).

**Rework [2026-07-19] behoben (Runde 2):** `inputs.grund`/`github.actor` in beiden `run:`-Steps
von `deploy-freeze-release.yml` über Step-`env:` (`GRUND`/`ACTOR`) gelesen und nur gequotet als
`"$GRUND"`/`"$ACTOR"` genutzt – kein inline `${{ … }}` mehr in der Shell (1:1 wie `deploy-gate.yml`,
#66). Neuer Test-Guard in `run-tests.sh` (Detektor `userinput_in_run`, Block-Scalar per Einrückung
wie `secrets_in_run`) mit Positiv-/Negativ-Kontrolle belegt: kein inline `${{ inputs.* }}`/
`${{ github.actor }}` in `run:`-Blöcken des Freigabe-Workflows, Werte kommen über `env:`. Nitpicks
bewusst offen (kein Verhaltensrisiko). Tests: **358 grün / 0 rot** (vorher 355 gesamt, 3 rot).
