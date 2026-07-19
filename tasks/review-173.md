# Review: Task 173 – Deploy-Freeze bei rotem Gate (ADR-032)

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur). Alle 339 Tests grün.
Gesamteindruck: sauber am ADR-032 orientierte, konsequent fail-closed konstruierte Umsetzung.
AC1–AC9 sind im Happy-Path erfüllt und getestet; die Trennung fail-closed-Marker (Ref) vs.
fail-open-Benachrichtigung (Issue) ist sauber durchgezogen. **Ein Logik-Fund defeatet jedoch in
einem realen Edge-Case genau die Schutzwirkung** (K1) und zwei Testlücken verstoßen gegen die
100 %-Neu-Code-Regel – daher NEEDS_REWORK.

## Kritische Findings (müssen behoben werden)
- [x] **`scripts/deploy-freeze.sh:97-102` – Fail-open-Loch im `set`-Pfad bei „unklar" (Exit 2).**
      Schlägt `git ls-remote` transient fehl, während `set_freeze` bei einem **echten**
      E2E-/Migrations-Fehler `freeze_set` aufruft, landet der Code im `*)`-Zweig → `return 1`,
      **kein Ref-Push, kein persistenter Marker**. `main` schreitet planmäßig weiter; ein späterer
      (flaky-)grüner Lauf sieht bei dann wieder lesbarem Remote „Ref fehlt" → Exit 10 →
      `frozen=false` → **Promote des weiterhin kaputten Codes**. Das ist exakt der #134→#167-Vorfall,
      den #173 verhindern soll – hier unter „Remote transient unlesbar während `set`". Verletzt AC1
      („persistenter Marker wird gesetzt") in diesem Edge.
      *Begründung + Fix:* Die Code-Kommentare Z.98/99 rechtfertigen das Nicht-Pushen falsch: ein
      **einfacher** (non-force) `git push origin <sha>:refs/factory/deploy-freeze` kann einen
      bestehenden Freeze **nicht** verdecken – zeigt das Ref bereits woanders hin, wird der Push als
      non-fast-forward **abgelehnt** (bestehender Freeze bleibt); fehlt es, wird es angelegt (genau
      gewollt). Daher im `*)`-Zweig den Push **trotzdem versuchen** (sicher durch non-FF-Semantik),
      und den irreführenden Kommentar korrigieren. Alternativ mind. als bewussten, dokumentierten
      Trade-off in ADR/Task festhalten – aber ein Fail-open-Loch mit falscher Begründung in einem
      Fail-closed-Feature sollte nicht ungefixt bleiben.

## Wichtige Findings (sollten behoben werden)
- [x] **`scripts/deploy-freeze.sh:67-70,97-102,123-125` – Fail-closed-„unklar"-Zweige ungetestet.**
      Der `unklar`-Fall ist nur für `check` getestet (run-tests.sh Test 9). Drei sicherheitsrelevante
      Branches bleiben ohne Test: `freeze_set` `*)` (verweigert Setzen), `freeze_status` `rc!=0`
      (`return 2`), `freeze_release` `*)`-Fallthrough. Verstößt gegen `testing-standards.md`
      (100 % Neu-Code) + die Guard-Clause-Test-Regel (CLAUDE.md #51). Smell: „Entferne ich `return 1`
      im `set`-`*)`-Zweig – schlägt ein Test fehl?" → nein. Ein `set`-gegen-unlesbaren-Remote-Test
      (analog Test 9) deckt genau K1 mit ab.
- [x] **`scripts/deploy-freeze-notify.sh:81-88` – Existing-Issue-Pfad wird nie ausgeführt.** Der
      gh-Mock gibt bei `issue list` immer `""` → getestet wird nur die **Neuanlage**. Der
      Kommentar-+`reopen`/`close`-Pfad (die Kern-Signalisierung) sowie die Events `blocked` und
      `released`-mit-Issue laufen in keinem Test. Ein zweiter Mock-Lauf mit `issue list` →
      Issue-Nummer deckt den Zweig ab.
- [x] **`scripts/deploy-freeze-notify.sh:54` + `.github/workflows/deploy-gate.yml:225` –
      Maintainer-facing Workflow-Name inkonsistent.** Beide Texte (Tracking-Issue-Kommentar +
      Step-Summary) verweisen auf „den `deploy-freeze-release`-Workflow" (Datei-Slug). In der
      Actions-UI heißt er aber **`Deploy-Freeze aufheben (Freigabe)`** (`deploy-freeze-release.yml:11`).
      Genau das liest ein Maintainer während eines aktiven Prod-Freezes → er sucht in Actions nach
      dem Slug und findet ihn nicht. Beide Stellen auf den Anzeigenamen ziehen (die README nutzt ihn
      bereits korrekt).

## Nitpicks (optional)
- [ ] **`.github/workflows/deploy-gate.yml:14,85-89,119` – Toter/irreführender „INT-Refresh
      übersprungen"-Zweig.** Der Pflicht-Secret-Check macht **alle** Neon-Secrets + `INT_DATABASE_URL`
      verpflichtend (`missing=1 → exit 1`), daher ist `steps.refresh.outputs.enabled` im scharfen Gate
      immer `'true'`; die `enabled == 'true'`-Guards und die „Refresh übersprungen"-Warnung beschreiben
      einen nicht erreichbaren Zustand. (Positiver Nebeneffekt: die vom Parent vermutete AC2-Lücke über
      `migrate_int.outcome == 'skipped'` kann real nicht auftreten.) Kein Bug, aber tote Verzweigung.
- [ ] **Generischer „Grund" auf Folge-Läufen (AC8-Randfall).** `deploy-gate.yml:216` / `notify.sh:56`:
      Auf einem `blocked`-Lauf kennt das Gate den Ursprungsgrund nicht mehr (Ref trägt nur den SHA,
      ADR §1 bewusst) → generischer Text „Deploy-Freeze aktiv (Exit …)". Funktional gedeckt, weil
      dasselbe Tracking-Issue den ursprünglichen `frozen`-Kommentar mit echtem Grund als Historie hält.
      Fällt aber die Notify beim Setzen aus (fail-open), überlebt der echte Grund nur in
      Step-Summary/Log des roten Laufs (Actions-Retention). Einen Satz in ADR/README explizit machen.
- [ ] **Tracking-Issue-Suche über Emoji-Titel fragil.** `notify.sh:45`
      `--search 'in:title "🚫 Deploy-Freeze aktiv"'` – Emoji-Tokenisierung in der GitHub-Suche ist
      nicht garantiert deterministisch; matcht sie nicht, entsteht bei jedem Freeze ein **neues**
      Issue statt Wiederverwendung (rein fail-open, aber Issue-Duplikate). Zusätzlich Substring-Match
      (auch „…aktiv gewesen"). Besser ohne Emoji (`in:title "Deploy-Freeze aktiv"`) oder über das
      Label `deploy-freeze` filtern.
- [ ] **`scripts/deploy-freeze-notify.sh:45` – toter Feld-Selektor.** `--json number,state` holt
      `state`, `--jq '.[0].number // empty'` nutzt nur `number`. `--json number` genügt.
- [ ] **Run-URL dreifach dupliziert.** `deploy-gate.yml:227,304` + `deploy-freeze-release.yml:54`:
      `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` identisch. In
      deploy-gate.yml als job-level `env: RUN_URL` einmalig definierbar (DRY, kein Bug).
- [ ] **`set_freeze` bei Push-Fehler ohne Notify/Summary.** `deploy-gate.yml:295-314`: Default-Shell
      `bash -eo pipefail` → bricht bei non-zero `deploy-freeze.sh set` sofort ab, `notify frozen` +
      Step-Summary laufen nicht mehr. Verwandt mit K1: der Ausfall des Marker-Setzens erzeugt keine
      aktive Benachrichtigung (nur „Step rot"). Vertretbar, aber erwähnenswert.

## Positives
- **Fail-closed-Check (AC3) exakt richtig:** `check_freeze` setzt `frozen=false` **ausschließlich**
  bei Exit 10; Exit 0 **und** jeder andere Exit (unklar/unlesbar) → `frozen=true`. `set +e; …; set -e`
  sauber gekapselt; alle drei Prod-Schritte hinter `if: …frozen != 'true'`.
- **AC4** verifiziert: `check_freeze` steht vor `migrate_prd` (Test prüft Zeilen-Reihenfolge robust –
  `id:`-Präfix kommt je genau 1× vor, kein Prosa-Fehlmatch). **AC5:** frozen-Zweig endet grün (kein
  `exit 1`) → kein Fehlalarm-Folgelauf. **AC2:** Trigger scharf auf `e2e|migrate_int|migrate_prd`.
- **Doppel-Freeze** überschreibt bestehenden Freeze nicht (ursprünglicher SHA bleibt, getestet);
  **release** permissiv bei „unklar" + idempotent (für Freigabe genau richtig).
- **Concurrency:** Gate + Release teilen `group: deploy-gate`, `cancel-in-progress: false` → deckt
  „zwei Läufe zeitgleich" und „Freigabe während Lauf aktiv" (kein Setzen/Check/Freigabe-Race).
- **Shell-Qualität:** `set -uo pipefail` ohne `-e` ist bewusst (Exit-Codes via `rc=$?`/`case $?`);
  `freeze_check` bare + direkt `case $?` (kein `if` dazwischen → bash-gotcha vermieden);
  `freeze_lsremote` trennt „unlesbar" von „Ref fehlt" sauber; `printf`-Bodies injektionssicher (%s).
- **ADR-Konsistenz 1–7** vollständig umgesetzt (Sentinel-Ref, testbares Skript, Trigger-Split
  `db:migrate:int`, Tracking-Issue fail-open, workflow_dispatch mit `github.actor`-Protokoll,
  Bare-Repo-Simulation). Erste `refs/factory/*`-Nutzung, korrekt außerhalb `protect-main` (ADR-029);
  `fetch-depth: 0` in beiden Workflows (CLAUDE.md FF-Regel). Least-Privilege-`permissions`.
- **Kein required-Check-Risiko (#155):** beide Workflows sind `push:main`- bzw.
  `workflow_dispatch`-only, keiner triggert auf `pull_request`. **Routen-Doku (#145):** kein
  `page.tsx`/`route.ts` im Diff → `docs/routes.md` zu Recht unangetastet.
- **README (AC9)** vollständig (Setzen/Blockieren/Benachrichtigung/Freigabe) mit korrektem
  Anzeigenamen + CLI-Fallback.
- **AC6** über Bare-Repo-Simulation der Vorfall-Sequenz (`set→check→check bleibt frozen→release→check`)
  + statische Verdrahtungs-Greps belegt.

## Offener Rest-Blocker (kein Rework-Punkt, kein Merge-Stopper)
- **`refs/factory/*`-Push mit `GITHUB_TOKEN` live verifizieren** (Task-Datei Blocker 2026-07-19).
  Erst post-merge prüfbar (Gate läuft nur auf `push:main`); Option-B-Fallback (PAT + Repo-Variable)
  im ADR-032 dokumentiert. **Empfehlung:** als eigenes Post-Merge-Todo/Issue führen, damit die
  zwingende Verifikation nicht in der (nach Merge auf `main` liegenden) Task-Datei untergeht.

## Rework [2026-07-19]
Behoben (Runde 1 → /implement):
- **K1** – `deploy-freeze.sh` `freeze_set` `*)`-Zweig: kein `return 1` ohne Push mehr. Bei
  unklarer Lage wird der (non-force) Push **trotzdem versucht** → fehlt das Ref, wird es angelegt
  (Schutz wiederhergestellt); existiert bereits ein Freeze, bleibt er bestehen (Promote weiter
  blockiert, FF re-pointet höchstens den SHA). Push-Fehler → non-zero sichtbar. Irreführender
  Kommentar korrigiert.
- **W1** – Tests 12–14 in `run-tests.sh`: `set`/`status`/`release` gegen unlesbaren Remote
  (fail-closed-„unklar"-Zweige) belegt (set→non-zero, status→exit 2, release→exit 0 permissiv).
- **W2** – zweiter gh-Mock (`issue list` → Nummer): Existing-Issue-Pfad (Kommentar + reopen/close)
  für `frozen`/`blocked`/`released` getestet.
- **W3** – Maintainer-facing Name auf Anzeigenamen „Deploy-Freeze aufheben (Freigabe)" gezogen
  (`deploy-freeze-notify.sh` + `deploy-gate.yml`), konsistent mit README.

Bewusst offen (Nitpicks, optional laut Review): toter „INT-Refresh übersprungen"-Zweig,
generischer Grund auf Folge-Läufen, Emoji-Titel-Suche, toter Feld-Selektor, Run-URL-Dup,
set_freeze-Push-Fehler ohne Notify. Kein Verhaltensrisiko; nicht rework-blockierend.
Offener Rest-Blocker (`refs/factory/*`-Live-Push) unverändert – erst post-merge prüfbar.

Alle Tests grün: 352 (vorher 339 + 13 neue), 0 rot.

## Empfehlung
NEEDS_REWORK

Blockierend: K1 (Fail-open-Loch im `set`-Pfad – Push trotzdem versuchen + Kommentar korrigieren).
Vor Merge mitnehmen: die zwei Testlücken (fail-closed-Branches + notify Existing-Issue-Pfad) und der
Maintainer-facing Workflow-Name. Nitpicks nach Ermessen.
