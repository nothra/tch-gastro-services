# ADR 032: Deploy-Freeze bei rotem Gate (Sentinel-Ref + fail-closed Promote-Guard)

## Status
Accepted

## Date
2026-07-19

## Context

Das Deploy-Gate (`.github/workflows/deploy-gate.yml`, ADR-015/017) promotet bei grünem Lauf den
**gesamten `main`-HEAD** nach `production` (`git push origin HEAD:production`). Der akkumulierende
Promote ist selbst-korrigierend – **solange das Gate verlässlich ist**.

**Vorfall (19.07.2026):** Das Gate wurde für #134 am Schritt „E2E gegen INT" rot (Logout-Race),
der Promote übersprungen – der Defekt blieb aber auf `main`. ~2,5 h später wurde das Gate für
#167 **flaky-grün** über denselben Defekt, und dieser Lauf promotete den `main`-HEAD **inklusive
#134** nach Produktion. Root cause: **ein Gate wurde falsch-grün über kaputten Code.**

#170 macht den konkreten Logout-Fall deterministisch (Hebel 1). Diese Entscheidung ist der
**strukturelle Schutz** (Hebel 2, unabhängig davon *welche* Flakiness künftig durchrutscht):
Ein einmal rotes Gate darf nicht durch einen späteren, evtl. flaky-grünen Lauf still überholt
werden. Spec: `docs/specs/spec-173-deploy-freeze-bei-rotem-gate.md`.

Requirements-Rahmen (mit dem Menschen geklärt, Session 19.07.2026):
1. **Trigger eingegrenzt:** Nur verifikations-/migrationsrelevante Fehlschläge (E2E gegen INT,
   `db:migrate:int`, `db:migrate:prd`) frieren ein – reine Infra-/Vorbereitungsfehler (Secret-Check,
   Install, INT-Deploy-Timeout, Neon-Reset, Anonymisierung) nicht.
2. **Check vor der PRD-Migration:** Bei aktivem Freeze wird auch die PRD-DB-Migration+Seed
   übersprungen – das Prod-Schema eilt dem Code während eines Freezes nicht voraus.
3. **Aktive Benachrichtigung** zusätzlich zum Log, wenn ein Freeze gesetzt wird oder einen Promote
   zurückhält.

Der akkumulierende Promote bleibt **unverändert** (Nicht-Ziel: kein per-Commit-Promote, kein Revert).

## Decision

**1 – Freeze-Marker = dediziertes Git-Sentinel-Ref `refs/factory/deploy-freeze` auf `origin`.**
Das Ref **zeigt auf den blockierenden Commit-SHA** (selbstbeschreibend: welcher Commit die
Produktion einfror). Der menschenlesbare **Grund** wird atomar zum Setzen in die aktive
Benachrichtigung + Step-Summary geschrieben (siehe Punkt 4). Existenz des Refs = „eingefroren".
Der Marker lebt auf dem Remote (ephemere Runner teilen ihn so lauf­übergreifend) und ist mit dem
vorhandenen `contents: write`-`GITHUB_TOKEN` + `fetch-depth: 0` setz-, les- und löschbar. `main`
bleibt vom Ruleset `protect-main` (ADR-029) geschützt; `refs/factory/*` liegt außerhalb dessen
Geltungsbereichs.

**2 – Freeze-Logik in ein testbares Skript `scripts/deploy-freeze.sh` extrahieren** (Subkommandos
`set <sha> <grund>`, `check`, `release`, `status`). Klare, dokumentierte Exit-Codes:
`check` → `0` = eingefroren, `10` = nicht eingefroren, alles andere = **unklar/nicht lesbar**.
Remote/Ref über Env überschreibbar (`FREEZE_REMOTE`, `FREEZE_REF`), damit die Vorfall-Simulation
(AC6) gegen ein lokales Bare-Repo läuft – ohne echten Deploy, ohne GitHub-API.

**3 – Fail-closed Promote-Guard im Gate, VOR der PRD-Migration.** Ein neuer Schritt `check_freeze`
läuft unmittelbar vor „PRD-DB migrieren + Login seeden". Er ruft `deploy-freeze.sh check`:
- Exit `10` (nicht eingefroren) → `frozen=false`, das Gate fährt regulär fort.
- Exit `0` (eingefroren) **oder** jeder andere Exit (unklar/nicht lesbar) → `frozen=true`
  (fail-closed: im Zweifel **nicht** promoten).

PRD-Migration+Seed, Promote-Push und Post-Deploy-Healthcheck erhalten je
`if: steps.check_freeze.outputs.frozen != 'true'`. Bei `frozen=true` **endet der Lauf grün** mit
lauter `::warning::`-Annotation, Step-Summary (blockierender SHA + Grund) und Benachrichtigung –
kein `exit 1` (sonst erschiene jeder legitim zurückgehaltene Folgelauf fälschlich als neuer roter
Gate-Lauf, und der `check_freeze`-Fehlschlag würde die „rotes Gate = Freeze"-Semantik verwirren).

**4 – Freeze setzen, scharf eingegrenzt.** Die verifikations-/migrationsrelevanten Schritte
bekommen `id`s (`e2e`, `migrate_int`, `migrate_prd`). Der `db:migrate:int`-Aufruf wird dafür aus
dem heutigen Sammelschritt „INT anonymisieren, migrieren, Admin seeden" **herausgelöst**
(Anonymisierung/Seed bleiben Infra/Safety, kein Freeze-Trigger). Ein Schritt `set_freeze` läuft mit
```yaml
if: failure() && ( steps.e2e.outcome == 'failure'
               || steps.migrate_int.outcome == 'failure'
               || steps.migrate_prd.outcome == 'failure' )
```
Da ein fehlschlagender Step den Job abbricht, hat höchstens einer dieser `outcome`s den Wert
`failure`; ein vorher fehlgeschlagener Infra-Step lässt alle drei leer → **kein** Freeze. `set_freeze`
ruft `deploy-freeze.sh set "$SHA" "<grund>"` (Push des Refs, fail-closed: Push-Fehler → non-zero,
sichtbar) und feuert die Benachrichtigung. Der ursprüngliche Fehlschlag bleibt rot (Code ist kaputt).

**5 – Aktive Benachrichtigung = dediziertes Tracking-Issue, fail-open.** Beim Setzen/Blockieren wird
ein langlebiges „Deploy-Freeze"-Tracking-Issue kommentiert (SHA + Grund + Run-Link), bei Bedarf
wieder geöffnet; bei Freigabe kommentiert + geschlossen. GitHubs native Issue-Notifications erfüllen
„aktiv". Die Benachrichtigung ist **fail-open** – schlägt sie fehl (Rate-Limit, `issues:write`
fehlt), bleibt der fail-closed Marker (Ref) unberührt. Damit ist die **Maschinen-Grenze** (Ref,
fail-closed) sauber von der **Mensch-Signalisierung** (Issue, fail-open) getrennt. Das Gate erhält
dafür `permissions: issues: write` (zusätzlich zu `contents: write`).

**6 – Freigabe = `workflow_dispatch`-Job**, der `deploy-freeze.sh release` ausführt (Ref löschen,
idempotent + Tracking-Issue schließen). Nur Personen mit Repo-Schreibrecht können ihn auslösen; der
Actions-Lauf protokolliert **wer** freigegeben hat. Voraussetzung (dokumentiert in README/Runbook):
Fix gemergt **und** verifiziert. Nach Freigabe promotet der nächste grüne Gate-Lauf wieder regulär.

**7 – Konsistenz/Simulations-Test** in `scripts/checks/tests/run-tests.sh` (Stil der #114/#117/#164-
Guards): gegen ein temporäres Bare-Repo `set → check(frozen) → check bleibt frozen (simulierter
grüner Folgelauf) → release → check(not-frozen)`, plus Nachweis, dass `frozen=true` den Promote-Pfad
überspringt. Das ist die maschinelle Fassung der Vorfall-Sequenz #134-rot → #167-grün.

## Alternatives

### Option A: Git-Sentinel-Ref `refs/factory/deploy-freeze` (gewählt)
**Pros:**
- Git-nativ; mit vorhandenem `contents: write`-Token setz-/les-/löschbar, kein neuer PAT/Scope.
- Persistent auf `origin`, lauf­übergreifend geteilt trotz ephemerer Runner.
- **Lokal unit-testbar** gegen ein Bare-Repo (kein GitHub-API-Mock) – trägt AC6 direkt; spiegelt das
  bewährte Sentinel-Muster (`INTERRUPT-*.md`, ADR-004) auf Remote-Ebene.
- Fail-closed trivial: `ls-remote`-Fehler → als eingefroren behandeln.

**Cons:**
- Custom-Ref ist in der GitHub-UI nicht prominent sichtbar → deshalb die aktive Benachrichtigung
  (Punkt 5) als Mensch-Kanal.
- `refs/factory/*`-Push mit `GITHUB_TOKEN` muss beim Implementieren einmal **live verifiziert**
  werden (empirisch, nicht angenommen – Projekt-Ethos).

### Option B: Repo-Variable (`actions/variables` API)
**Pros:** In den Repo-Settings sichtbar; strukturierter Wert (SHA + Grund) speicherbar.
**Cons:** `GITHUB_TOKEN` kann Repo-Variablen standardmäßig **nicht schreiben** → zusätzlicher
Admin-scoped PAT als Secret (neue Angriffsfläche, Rotationslast). Lokal nur über API-Mock testbar →
AC6 schwerer. Mehr Mechanik für denselben booleschen Effekt.

### Option C: Label auf einem Tracking-Issue als Marker
**Pros:** Sichtbar; vereint Marker und Mensch-Signal in einem Objekt.
**Cons:** Vermischt fail-closed-Gate mit fail-open-Signal (ein API-Ausfall beim Label-Lesen ist
mehrdeutig). Braucht `issues`-API auch für die **Maschinen-Grenze** → schlechter fail-closed als ein
Ref. Test nur über API-Mock. Verletzt die saubere Trennung „Ref = Maschine, Issue = Mensch".

### Nebenentscheidung – Check-Position (vor vs. nur-vor-Promote)
Der Check läuft **vor der PRD-Migration** (Requirements-Entscheidung 2) statt nur unmittelbar vor
`git push origin HEAD:production`. Damit entsteht während eines Freezes **kein** Prod-DB-Seiteneffekt
(kein Schema-vor-Code). Minimaler Mehraufwand (ein `if:` mehr), aber strengere Kopplung.

## Rationale

Option A adressiert das Problem mit dem **einfachsten, fail-closed und lokal testbaren** Mittel: ein
Boolean-Marker, den das Gate mit vorhandenen Rechten setzt und liest. Die Testbarkeit ist hier das
ausschlaggebende Kriterium – AC6 verlangt einen automatisierten Nachweis der Vorfall-Sequenz, und nur
das Ref lässt sich ohne GitHub-API gegen ein Bare-Repo simulieren (konsistent mit dem bestehenden
Sentinel-/Interrupt-Muster). Die Trennung „Ref = fail-closed Maschinen-Grenze, Tracking-Issue =
fail-open Mensch-Signal" folgt Separation-of-Concerns und verhindert, dass ein Benachrichtigungs-
Ausfall die Schutzwirkung untergräbt. Die Trigger-Eingrenzung (nur E2E/Migration) hält den Schutz
scharf, ohne bei transienter Infra-Flakiness Fehlalarm-Freezes zu erzeugen; die Check-vor-Migration-
Position stärkt die ADR-017-Kopplung (nie Schema ohne Code).

## Consequences

**Positive:**
- Ein rotes Gate über echten Code-/Migrationsdefekt friert die Produktion ein; ein späterer
  (evtl. flaky-) grüner Lauf promotet nicht, bis ein Mensch nach Fix+Verifikation freigibt.
- `main`-Fortschritt (Merges, Gate-Läufe) bleibt unberührt – nur der Promote pausiert.
- Die Schutzlogik ist über `scripts/deploy-freeze.sh` + Bare-Repo-Test **verankert** und gegen
  versehentliches Zurückdrehen abgesichert.
- Kein Prod-DB-Schema-Drift während eines Freezes (Check vor PRD-Migration).

**Negative / Trade-offs:**
- Neuer Zustand „eingefroren", der **manuell** aufgelöst werden muss – bei berechtigtem Freeze
  gewollt, bei einem seltenen falsch-positiven E2E-Fehlschlag entsteht manuelle Freigabe-Last.
  Bewusst akzeptiert (Sicherheit > Bequemlichkeit); die aktive Benachrichtigung macht den Zustand
  sofort sichtbar.
- Zusätzliche Workflow-Permission (`issues: write`) und ein `workflow_dispatch`-Freigabe-Job.
- Das heutige Sammel-INT-Step wird gesplittet (`db:migrate:int` bekommt eine eigene Step-`id`) –
  minimaler Umbau, nötig für die scharfe Trigger-Abgrenzung.
- `refs/factory/deploy-freeze`-Push mit `GITHUB_TOKEN` ist beim Implementieren einmal live zu
  bestätigen; fällt das gegen Erwarten aus, ist Option B (PAT + Variable) der Rückfall.
- Zusammenspiel: `concurrency: deploy-gate` (seriell, `cancel-in-progress:false`) stellt sicher, dass
  „Setzen" vor dem „Check" des nächsten Laufs greift (kein Race). ADR-007 (`post-merge-verify`) und
  ADR-017 (PRD-Auto-Migration) bleiben inhaltlich unverändert; der Freeze schiebt sich nur als
  fail-closed Vorbedingung vor Migration+Promote.
