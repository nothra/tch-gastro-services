#!/usr/bin/env bash
# run-project-tests.sh – Projekt-Suite (TCH): Tests der projekteigenen Dateien (#432, Q9)
#
# Verwendung: bash scripts/project/tests/run-project-tests.sh
# Exit-Code 0 = alle Tests grün, 1 = mindestens ein Test rot.
#
# Hier liegt jeder Test, der eine Datei mit `project`-Besitzer (docs/factory/OWNERSHIP.md) prüft:
#   - routes-doc-check.sh (#145) und der Erweiterungspunkt pre-push.d am echten Projekt-Check
#   - Deploy-Freeze (#173, ADR-032): deploy-freeze.sh, deploy-freeze-notify.sh
#   - Workflow-Tests zu deploy-gate.yml und deploy-freeze-release.yml (#66, #173)
# Die Prüf-Helfer kommen aus der Factory-Lib (scripts/checks/tests/lib/assert-helpers.sh, Q10).
# Läuft in CI im Required Check `test` des projekteigenen ci.yml (AK-J3).

set -uo pipefail

PROJECT_TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FACTORY_ROOT="$(cd "$PROJECT_TESTS_DIR/../../.." && pwd)"
SCRIPTS_DIR="$FACTORY_ROOT/scripts"
CHECKS_DIR="$SCRIPTS_DIR/checks"

source "$CHECKS_DIR/tests/lib/assert-helpers.sh"

# ─── #66: Deploy-Gate liest Secrets über env:, nicht inline im run: ──────────
echo ""
echo "#66 Härtung – Secret-Prüfung im Deploy-Gate (env: statt inline \${{ secrets.* }}):"

DEPLOY_GATE="$FACTORY_ROOT/.github/workflows/deploy-gate.yml"

# secrets_in_run <yaml-datei>
# exit 1 (+ stdout-Fund), wenn irgendeine `${{ secrets.* }}`-Referenz INNERHALB eines
# `run:`-Shell-Ausdrucks steht (Script-Injection-Muster). `${{ secrets.* }}` in `env:`-
# Blöcken ist erlaubt (das Zielmuster). Verfolgt den Block-Scalar per Einrückung:
# ein `run:`-Key öffnet den Block; Zeilen tiefer eingerückt als der Key gehören dazu,
# ein Dedent auf/unter die Key-Einrückung schließt ihn (POSIX-awk, portabel).
secrets_in_run() {
  awk '
    function firstnonspace(s) { if (match(s, /[^ ]/)) return RSTART - 1; return -1 }
    /^[ ]*$/ { next }
    {
      ind = firstnonspace($0)
      if (in_run && ind <= run_ind) in_run = 0
      if (!in_run && $0 ~ /^[ ]*run:/) {
        run_ind = ind
        rest = $0; sub(/^[ ]*run:/, "", rest)
        if (rest ~ /\$\{\{[ ]*secrets\./) { print FILENAME ":" NR ": " $0; found = 1 }
        in_run = 1
        next
      }
      if (in_run && $0 ~ /\$\{\{[ ]*secrets\./) { print FILENAME ":" NR ": " $0; found = 1 }
    }
    END { exit(found ? 1 : 0) }
  ' "$1"
}

# Positiv-Kontrolle: der Detektor findet eine inline-Referenz in einem run:-Block,
# damit der Guard nicht versehentlich vacuously grün ist (clean-code.md, Gate-Regex-Test).
TMP_YAML_INLINE="$(mktemp)"
printf 'jobs:\n  x:\n    steps:\n      - name: bad\n        run: |\n          [ -n "${{ secrets.FOO }}" ] || exit 1\n' > "$TMP_YAML_INLINE"
secrets_in_run "$TMP_YAML_INLINE" >/dev/null 2>&1
assert_exit 1 "$?" "#66: Detektor erkennt inline \${{ secrets.* }} in einem run:-Block (Positiv-Kontrolle)"
rm -f "$TMP_YAML_INLINE"

# Negativ-Kontrolle: dieselbe Referenz in einem env:-Block ist erlaubt → kein Fund.
TMP_YAML_ENV="$(mktemp)"
printf 'jobs:\n  x:\n    steps:\n      - name: ok\n        env:\n          FOO: ${{ secrets.FOO }}\n        run: |\n          [ -n "$FOO" ] || exit 1\n' > "$TMP_YAML_ENV"
secrets_in_run "$TMP_YAML_ENV" >/dev/null 2>&1
assert_exit 0 "$?" "#66: Detektor akzeptiert \${{ secrets.* }} im env:-Block (Negativ-Kontrolle)"
rm -f "$TMP_YAML_ENV"

# Akzeptanzkriterium: das echte Deploy-Gate hat keine inline-Secret-Referenz in run:.
secrets_in_run "$DEPLOY_GATE" >/dev/null 2>&1
assert_exit 0 "$?" "#66: deploy-gate.yml testet in run:-Blöcken nur \$VAR, kein inline \${{ secrets.* }}"

# Verhalten unverändert: die fail-closed-/Skip-Meldungen bleiben wortgleich erhalten.
grep -q '::error::E2E_ADMIN_EMAIL fehlt' "$DEPLOY_GATE"
assert_true "$?" "#66: fail-closed \`::error::\`-Meldungen unverändert vorhanden"
grep -q '::warning::INT-Refresh übersprungen' "$DEPLOY_GATE"
assert_true "$?" "#66: INT-Refresh Skip-\`::warning::\` unverändert vorhanden"

# deploy-gate.yml bleibt valides YAML (nur wo yq vorhanden, ADR-009).
if [ "$HAS_YQ" = 1 ]; then
  yq '.' "$DEPLOY_GATE" >/dev/null 2>&1
  assert_true "$?" "#66: deploy-gate.yml bleibt valides YAML (yq-Parse)"
else
  skip_yq "#66: deploy-gate.yml bleibt valides YAML"
fi

# ─── #145: routes-doc-check.sh (Drift zwischen app/-Baum und docs/routes.md) ──
# Positiv- UND Negativfälle (beide Drift-Richtungen), damit ein stilles Nicht-Greifen
# des Musters auffällt (clean-code.md: Gate-Regex in beide Richtungen abgesichert).
echo ""
echo "#145 routes-doc-check.sh (Routen-Doku-Drift, fail-closed):"

ROUTES_CHECK="$SCRIPTS_DIR/project/checks/pre-push.d/routes-doc-check.sh"
assert_true "$([[ -f "$ROUTES_CHECK" ]]; echo $?)" "routes-doc-check.sh vorhanden"

# Fixture: app/-Baum + docs/routes.md; FACTORY_DIR steuert die Projektwurzel des Checks.
TMP_RT="$(mktemp -d)"
mkdir -p "$TMP_RT/app/login" "$TMP_RT/app/veranstaltung/[id]" \
         "$TMP_RT/app/api/health" "$TMP_RT/app/_private" \
         "$TMP_RT/app/(werbung)/info" "$TMP_RT/app/foo_bar" "$TMP_RT/docs"
: > "$TMP_RT/app/page.tsx"
: > "$TMP_RT/app/login/page.tsx"
: > "$TMP_RT/app/veranstaltung/[id]/page.tsx"   # dynamisches Segment
: > "$TMP_RT/app/api/health/route.ts"
: > "$TMP_RT/app/_private/page.tsx"              # privater Ordner → KEINE Route (ignorieren)
: > "$TMP_RT/app/(werbung)/info/page.tsx"        # Route Group (name) → /info (kein Segment)
: > "$TMP_RT/app/foo_bar/page.tsx"               # Unterstrich MITTEN im Segment → KEIN privater Ordner

write_routes_doc() {
  cat > "$TMP_RT/docs/routes.md" <<'DOCEOF'
# Routen-Übersicht
| Pfad | Typ | Funktion | Zugriff |
|------|-----|----------|---------|
| `/` | Seite | Home | angemeldet |
| `/login` | Seite | Login | öffentlich |
| `/foo_bar` | Seite | Foo | angemeldet |
| `/veranstaltung/[id]` | Seite | Detail | veranstalter |
| `/info` | Seite | Info | öffentlich |
| `/api/health` | API | Health | öffentlich |
DOCEOF
}
rc_routes() { FACTORY_DIR="$TMP_RT" bash "$ROUTES_CHECK" 2>&1; }

# 1. Doku deckt alle Routen exakt ab: dynamisches [id] + Route Group (werbung)→/info gemappt,
#    _private ignoriert → grün. (Fällt der Route-Group-Strip weg, mappt /info falsch → rot.)
write_routes_doc
rc_routes >/dev/null 2>&1; rc=$?
assert_exit 0 "$rc" "in sync ([id] + (werbung)-Group + foo_bar gemappt, _private ignoriert) → exit 0"

# 2. Neue Route-Datei ohne Doku-Eintrag → fail-closed exit 1 + benennt die Route
mkdir -p "$TMP_RT/app/neu"; : > "$TMP_RT/app/neu/page.tsx"
out=$(rc_routes); rc=$?
assert_exit 1 "$rc" "Route ohne Doku-Eintrag → exit 1 (fail-closed)"
printf '%s' "$out" | grep -qF '/neu'
assert_true "$?" "benennt die undokumentierte Route (/neu)"
rm -rf "$TMP_RT/app/neu"

# 3. Doku-Eintrag ohne zugehörige Route-Datei → fail-closed exit 1 + benennt den Eintrag
write_routes_doc
printf '| `/geist` | Seite | tot | angemeldet |\n' >> "$TMP_RT/docs/routes.md"
out=$(rc_routes); rc=$?
assert_exit 1 "$rc" "Doku-Eintrag ohne Route-Datei → exit 1 (fail-closed)"
printf '%s' "$out" | grep -qF '/geist'
assert_true "$?" "benennt den verwaisten Doku-Eintrag (/geist)"

# 4. Fehlende docs/routes.md → fail-closed exit 1
rm -f "$TMP_RT/docs/routes.md"
rc_routes >/dev/null 2>&1
assert_exit 1 "$?" "fehlende docs/routes.md → exit 1 (fail-closed)"

rm -rf "$TMP_RT"

# Struktur: der Drift-Check ist im Push-Gate (pre-push.sh) verdrahtet.
[ -x "$ROUTES_CHECK" ] && grep -q 'run_project_checks "$FACTORY_DIR/scripts/project/checks/pre-push.d"' "$CHECKS_DIR/pre-push.sh"
assert_true "$?" "#145/#431: Routen-Doku-Drift-Check liegt ausführbar in pre-push.d und läuft über den Erweiterungspunkt"

# ─── #173: Deploy-Freeze bei rotem Gate (ADR-032) ────────────────────────────
echo ""
echo "#173 Deploy-Freeze (ADR-032):"

DEPLOY_FREEZE="$SCRIPTS_DIR/project/deploy-freeze.sh"
NOTIFY="$SCRIPTS_DIR/project/deploy-freeze-notify.sh"
GATE_YML="$FACTORY_ROOT/.github/workflows/deploy-gate.yml"
RELEASE_YML="$FACTORY_ROOT/.github/workflows/deploy-freeze-release.yml"

assert_true "$([[ -f "$DEPLOY_FREEZE" ]]; echo $?)" "scripts/project/deploy-freeze.sh vorhanden"

# Bare-Repo-Simulation der Vorfall-Sequenz (AC6) – ohne echten Deploy, ohne GitHub-API.
TMP_DF="$(mktemp -d)"
git init -q --bare "$TMP_DF/origin.git"
git init -q "$TMP_DF/work"
git -C "$TMP_DF/work" -c user.email=t@t -c user.name=t commit -q --allow-empty -m "commit A (#134)"
SHA_A="$(git -C "$TMP_DF/work" rev-parse HEAD)"
git -C "$TMP_DF/work" -c user.email=t@t -c user.name=t commit -q --allow-empty -m "commit B (#167)"
SHA_B="$(git -C "$TMP_DF/work" rev-parse HEAD)"

# df <args…> – ruft deploy-freeze.sh aus dem Work-Repo gegen das Bare-Repo als Remote auf.
df() {
  ( cd "$TMP_DF/work" && FREEZE_REMOTE="$TMP_DF/origin.git" FREEZE_REF="refs/factory/deploy-freeze" \
      bash "$DEPLOY_FREEZE" "$@" )
}

# 1. Frischer Zustand: nicht eingefroren → check exit 10
df check >/dev/null 2>&1
assert_exit 10 "$?" "AC: frischer Zustand → check exit 10 (nicht eingefroren)"

# 2. #134 wird rot → Freeze auf SHA_A setzen (exit 0)
df set "$SHA_A" "E2E gegen INT rot (#134)" >/dev/null 2>&1
assert_exit 0 "$?" "AC1: rotes Gate setzt Freeze (set exit 0)"

# 3. check → eingefroren (exit 0)
df check >/dev/null 2>&1
assert_exit 0 "$?" "AC1: nach set → check exit 0 (eingefroren)"

# 4. status nennt den blockierenden SHA
out=$(df status 2>/dev/null)
assert_true "$([[ "$out" = "$SHA_A" ]]; echo $?)" "AC1: status gibt den blockierenden SHA (SHA_A) aus"

# 5. Simulierter grüner Folgelauf (#167): der Freeze bleibt stehen → check weiterhin 0.
#    Das ist die maschinelle Fassung von #134-rot → #167-grün: der grüne Lauf promotet NICHT.
df check >/dev/null 2>&1
assert_exit 0 "$?" "AC6: grüner Folgelauf sieht weiterhin Freeze (check exit 0 → kein Promote)"

# 6. Doppel-Freeze: zweiter roter Lauf überschreibt den ursprünglichen SHA NICHT
df set "$SHA_B" "andere Ursache" >/dev/null 2>&1
df_dbl_exit=$?
out=$(df status 2>/dev/null)
assert_exit 0 "$df_dbl_exit" "Doppel-Freeze: zweites set → exit 0"
assert_true "$([[ "$out" = "$SHA_A" ]]; echo $?)" "Doppel-Freeze: ursprünglicher SHA_A bleibt (nicht überschrieben)"

# 7. Freigabe (release) → Ref weg, check wieder 10
df release >/dev/null 2>&1
assert_exit 0 "$?" "AC7: release → exit 0"
df check >/dev/null 2>&1
assert_exit 10 "$?" "AC7: nach release → check exit 10 (nicht eingefroren)"

# 8. release ist idempotent (kein aktiver Freeze → trotzdem exit 0)
df release >/dev/null 2>&1
assert_exit 0 "$?" "AC7: release ohne aktiven Freeze → idempotent exit 0"

# 9. Fail-closed: Remote nicht lesbar → check WEDER 0 NOCH 10 (unklar), NIE 10
( cd "$TMP_DF/work" && FREEZE_REMOTE="$TMP_DF/does-not-exist.git" bash "$DEPLOY_FREEZE" check ) >/dev/null 2>&1
df_unreadable=$?
assert_true "$([[ "$df_unreadable" -ne 10 && "$df_unreadable" -ne 0 ]]; echo $?)" \
  "AC3: unlesbarer Marker → check weder 0 noch 10 (fail-closed, kein Promote)"

# 10. Aufruf-Fehler: unbekanntes Subkommando → exit 2
df bogus >/dev/null 2>&1
assert_exit 2 "$?" "unbekanntes Subkommando → exit 2 (Aufruf-Fehler)"

# 11. set ohne Argumente → exit 1
df set >/dev/null 2>&1
assert_exit 1 "$?" "set ohne <sha>/<grund> → exit 1"

# 12. Fail-closed set (K1): Remote unlesbar → set endet non-zero (kein stilles fail-open).
#     Deckt den freeze_set-*)-Zweig ab: bei unklarer Lage wird der Push VERSUCHT (nicht
#     still ohne Marker abgebrochen); scheitert er am unerreichbaren Remote, ist der
#     Fehlschlag sichtbar (non-zero) statt fälschlich exit 0.
( cd "$TMP_DF/work" && FREEZE_REMOTE="$TMP_DF/does-not-exist.git" bash "$DEPLOY_FREEZE" set "$SHA_A" "E2E rot" ) >/dev/null 2>&1
assert_true "$([[ "$?" -ne 0 ]]; echo $?)" "AC1/K1: set gegen unlesbaren Remote → non-zero (fail-closed, kein stilles fail-open)"

# 13. freeze_status-*)-Zweig: Remote unlesbar → status exit 2 (unklar, nicht 0).
( cd "$TMP_DF/work" && FREEZE_REMOTE="$TMP_DF/does-not-exist.git" bash "$DEPLOY_FREEZE" status ) >/dev/null 2>&1
assert_exit 2 "$?" "status gegen unlesbaren Remote → exit 2 (Marker-Status unklar)"

# 14. freeze_release-*)-Zweig: Remote unlesbar → release bleibt permissiv (exit 0, idempotent).
#     Freigabe ist die Entblock-Richtung; ein nicht durchführbarer Delete darf keinen roten
#     Lauf erzeugen (der Freeze bliebe ohnehin bestehen und der Promote-Guard verweigert).
( cd "$TMP_DF/work" && FREEZE_REMOTE="$TMP_DF/does-not-exist.git" bash "$DEPLOY_FREEZE" release ) >/dev/null 2>&1
assert_exit 0 "$?" "release gegen unlesbaren Remote → exit 0 (permissiv/idempotent, unklar-Zweig)"

rm -rf "$TMP_DF"

# ─── Benachrichtigung (fail-open, ADR-032 §5) ────────────────────────────────
assert_true "$([[ -f "$NOTIFY" ]]; echo $?)" "scripts/project/deploy-freeze-notify.sh vorhanden"

# Fail-open: kein gh im PATH → Skript endet trotzdem grün (Marker bleibt maßgeblich).
# PATH auf ein leeres Verzeichnis setzen (gh nicht auffindbar); bash über absoluten Pfad
# aufrufen, damit die Shell selbst trotz leerem PATH startet.
TMP_NOTIFY="$(mktemp -d)"; mkdir -p "$TMP_NOTIFY/emptybin"
BASH_BIN="$(command -v bash)"
PATH="$TMP_NOTIFY/emptybin" "$BASH_BIN" "$NOTIFY" frozen abc123 "E2E rot" >/dev/null 2>&1
assert_exit 0 "$?" "AC8: notify ohne gh → fail-open exit 0 (Schutz bleibt unberührt)"

# Happy Path: gh-Mock ohne bestehendes Issue → 'frozen' legt Tracking-Issue an.
mkdir -p "$TMP_NOTIFY/bin"
cat > "$TMP_NOTIFY/bin/gh" <<'GHEOF'
#!/bin/sh
case "$1 $2" in
  "issue list") echo "" ;;                       # kein bestehendes Tracking-Issue
  "issue create") echo "$*" >> "$GH_LOG"; echo "https://github.com/x/y/issues/1" ;;
  "issue comment") echo "$*" >> "$GH_LOG" ;;
  "issue reopen"|"issue close") echo "$*" >> "$GH_LOG" ;;
  *) : ;;
esac
GHEOF
chmod +x "$TMP_NOTIFY/bin/gh"
: > "$TMP_NOTIFY/gh.log"
PATH="$TMP_NOTIFY/bin:$PATH" GH_LOG="$TMP_NOTIFY/gh.log" \
  bash "$NOTIFY" frozen abc123 "E2E rot" "http://run" >/dev/null 2>&1
assert_exit 0 "$?" "AC8: notify 'frozen' (gh-Mock) → exit 0"
grep -q 'issue create' "$TMP_NOTIFY/gh.log"
assert_true "$?" "AC8: ohne bestehendes Issue legt 'frozen' ein Tracking-Issue an"

# 'released' ohne bestehendes Issue → keine Neuanlage, trotzdem exit 0
: > "$TMP_NOTIFY/gh.log"
PATH="$TMP_NOTIFY/bin:$PATH" GH_LOG="$TMP_NOTIFY/gh.log" \
  bash "$NOTIFY" released abc123 "" >/dev/null 2>&1
assert_exit 0 "$?" "AC8: notify 'released' ohne Issue → exit 0 (keine Neuanlage)"
assert_true "$(! grep -q 'issue create' "$TMP_NOTIFY/gh.log"; echo $?)" "AC8: 'released' legt kein neues Issue an"

# Existing-Issue-Pfad: gh-Mock mit einem bestehenden Tracking-Issue (issue list → Nummer).
# Deckt den Kommentar-+reopen/close-Zweig ab (die eigentliche Signalisierung), der beim
# Neuanlage-Mock (issue list → "") nie durchlaufen wird.
cat > "$TMP_NOTIFY/bin/gh" <<'GHEOF'
#!/bin/sh
case "$1 $2" in
  "issue list") echo "42" ;;                     # bestehendes Tracking-Issue #42
  "issue create") echo "$*" >> "$GH_LOG"; echo "https://github.com/x/y/issues/42" ;;
  "issue comment") echo "$*" >> "$GH_LOG" ;;
  "issue reopen"|"issue close") echo "$*" >> "$GH_LOG" ;;
  *) : ;;
esac
GHEOF
chmod +x "$TMP_NOTIFY/bin/gh"

# 'frozen' mit bestehendem Issue → kommentieren + wieder öffnen, KEINE Neuanlage.
: > "$TMP_NOTIFY/gh.log"
PATH="$TMP_NOTIFY/bin:$PATH" GH_LOG="$TMP_NOTIFY/gh.log" \
  bash "$NOTIFY" frozen abc123 "E2E rot" "http://run" >/dev/null 2>&1
assert_exit 0 "$?" "AC8: notify 'frozen' mit bestehendem Issue → exit 0"
assert_true "$(! grep -q 'issue create' "$TMP_NOTIFY/gh.log"; echo $?)" "AC8: 'frozen' legt bei bestehendem Issue KEIN neues an"
grep -q 'issue comment' "$TMP_NOTIFY/gh.log"; assert_true "$?" "AC8: 'frozen' kommentiert das bestehende Tracking-Issue"
grep -q 'issue reopen' "$TMP_NOTIFY/gh.log"; assert_true "$?" "AC8: 'frozen' öffnet das Tracking-Issue wieder"

# 'blocked' mit bestehendem Issue → kommentieren + wieder öffnen.
: > "$TMP_NOTIFY/gh.log"
PATH="$TMP_NOTIFY/bin:$PATH" GH_LOG="$TMP_NOTIFY/gh.log" \
  bash "$NOTIFY" blocked abc123 "Freeze aktiv" "http://run" >/dev/null 2>&1
assert_exit 0 "$?" "AC8: notify 'blocked' mit bestehendem Issue → exit 0"
grep -q 'issue comment' "$TMP_NOTIFY/gh.log"; assert_true "$?" "AC8: 'blocked' kommentiert das Tracking-Issue"
grep -q 'issue reopen' "$TMP_NOTIFY/gh.log"; assert_true "$?" "AC8: 'blocked' öffnet das Tracking-Issue wieder"

# 'released' mit bestehendem Issue → kommentieren + schließen.
: > "$TMP_NOTIFY/gh.log"
PATH="$TMP_NOTIFY/bin:$PATH" GH_LOG="$TMP_NOTIFY/gh.log" \
  bash "$NOTIFY" released abc123 "" "http://run" >/dev/null 2>&1
assert_exit 0 "$?" "AC8: notify 'released' mit bestehendem Issue → exit 0"
grep -q 'issue comment' "$TMP_NOTIFY/gh.log"; assert_true "$?" "AC8: 'released' kommentiert das Tracking-Issue"
grep -q 'issue close' "$TMP_NOTIFY/gh.log"; assert_true "$?" "AC8: 'released' schließt das Tracking-Issue"

rm -rf "$TMP_NOTIFY"

# ─── Deploy-Gate-Verdrahtung (deploy-gate.yml) ───────────────────────────────
assert_true "$([[ -f "$GATE_YML" ]]; echo $?)" "deploy-gate.yml vorhanden"

# Step-IDs für die scharfe Trigger-Abgrenzung (nur E2E/Migration frieren, ADR-032 §4)
grep -q 'id: e2e' "$GATE_YML";         assert_true "$?" "deploy-gate: E2E-Step hat id: e2e"
grep -q 'id: migrate_int' "$GATE_YML"; assert_true "$?" "deploy-gate: db:migrate:int hat eigene id: migrate_int"
grep -q 'id: migrate_prd' "$GATE_YML"; assert_true "$?" "deploy-gate: PRD-Migration hat id: migrate_prd"
grep -q 'id: check_freeze' "$GATE_YML"; assert_true "$?" "deploy-gate: Freeze-Check-Step (id: check_freeze) vorhanden"

# AC4: check_freeze steht VOR der PRD-Migration (kein Prod-DB-Seiteneffekt).
line_check=$(grep -n 'id: check_freeze' "$GATE_YML" | head -1 | cut -d: -f1)
line_migprd=$(grep -n 'id: migrate_prd' "$GATE_YML" | head -1 | cut -d: -f1)
assert_true "$([[ -n "$line_check" && -n "$line_migprd" && "$line_check" -lt "$line_migprd" ]]; echo $?)" \
  "AC4: check_freeze steht VOR der PRD-Migration (id: migrate_prd)"

# AC3/AC5: Promote-Pfad nur wenn NICHT frozen; Freeze-Check selbst ohne exit 1 (Lauf grün).
grep -q "steps.check_freeze.outputs.frozen != 'true'" "$GATE_YML"
assert_true "$?" "AC3: Prod-Schritte hinter if: check_freeze.frozen != 'true'"

# AC1/AC2: set_freeze nur bei Fehlschlag der verifikationsrelevanten Steps (nicht bei Infra).
grep -q 'id: set_freeze' "$GATE_YML"; assert_true "$?" "AC1: set_freeze-Step vorhanden"
grep -q 'steps.e2e.outcome' "$GATE_YML"
assert_true "$?" "AC1: set_freeze-Bedingung referenziert steps.e2e.outcome"
grep -q 'steps.migrate_int.outcome' "$GATE_YML"
assert_true "$?" "AC1: set_freeze-Bedingung referenziert steps.migrate_int.outcome"
grep -q 'steps.migrate_prd.outcome' "$GATE_YML"
assert_true "$?" "AC1: set_freeze-Bedingung referenziert steps.migrate_prd.outcome"

# AC8: Gate braucht issues: write für die Benachrichtigung
grep -q 'issues: write' "$GATE_YML"
assert_true "$?" "AC8: deploy-gate hat permissions issues: write"

# AC7: dokumentierter Freigabe-Weg = workflow_dispatch-Workflow
assert_true "$([[ -f "$RELEASE_YML" ]]; echo $?)" "AC7: deploy-freeze-release.yml vorhanden"
grep -q 'workflow_dispatch' "$RELEASE_YML"
assert_true "$?" "AC7: Freigabe läuft über workflow_dispatch"
grep -q 'deploy-freeze.sh release' "$RELEASE_YML"
assert_true "$?" "AC7: Freigabe-Workflow ruft deploy-freeze.sh release"

# ─── #173/#66: Freigabe-Workflow liest workflow_dispatch-Input/actor über env: ───
# Der Freigabe-Workflow ist der Notfall-Entblock-Pfad. `${{ inputs.grund }}` ist frei
# getippter Text und `${{ github.actor }}` nutzerbeeinflusst – beide dürfen NICHT inline
# in eine `run:`-Shell interpoliert werden (Actions-Script-Injection + funktionaler Bruch
# an Sonderzeichen), sondern nur über `env:` gequotet. Gleicher Maßstab wie #66 im
# Schwester-Workflow deploy-gate.yml. Detektor spiegelt secrets_in_run (Block-Scalar per
# Einrückung), Zielmuster = nutzerkontrollierte inputs.*/github.actor.
echo ""
echo "#173 Härtung – Freigabe-Workflow: inputs.*/github.actor über env: statt inline im run::"

userinput_in_run() {
  awk '
    function firstnonspace(s) { if (match(s, /[^ ]/)) return RSTART - 1; return -1 }
    /^[ ]*$/ { next }
    {
      ind = firstnonspace($0)
      if (in_run && ind <= run_ind) in_run = 0
      if (!in_run && $0 ~ /^[ ]*run:/) {
        run_ind = ind
        rest = $0; sub(/^[ ]*run:/, "", rest)
        if (rest ~ /\$\{\{[ ]*(inputs\.|github\.actor)/) { print FILENAME ":" NR ": " $0; found = 1 }
        in_run = 1
        next
      }
      if (in_run && $0 ~ /\$\{\{[ ]*(inputs\.|github\.actor)/) { print FILENAME ":" NR ": " $0; found = 1 }
    }
    END { exit(found ? 1 : 0) }
  ' "$1"
}

# Positiv-Kontrolle: inline inputs.* im run:-Block wird erkannt (Guard nicht vacuously grün).
TMP_YAML_INJ="$(mktemp)"
printf 'jobs:\n  x:\n    steps:\n      - name: bad\n        run: |\n          echo "Grund: ${{ inputs.grund }}"\n' > "$TMP_YAML_INJ"
userinput_in_run "$TMP_YAML_INJ" >/dev/null 2>&1
assert_exit 1 "$?" "#173: Detektor erkennt inline \${{ inputs.* }} in einem run:-Block (Positiv-Kontrolle)"
rm -f "$TMP_YAML_INJ"

# Negativ-Kontrolle: dieselbe Referenz im env:-Block ist erlaubt → kein Fund.
TMP_YAML_INJ_OK="$(mktemp)"
printf 'jobs:\n  x:\n    steps:\n      - name: ok\n        env:\n          GRUND: ${{ inputs.grund }}\n        run: |\n          echo "Grund: $GRUND"\n' > "$TMP_YAML_INJ_OK"
userinput_in_run "$TMP_YAML_INJ_OK" >/dev/null 2>&1
assert_exit 0 "$?" "#173: Detektor akzeptiert \${{ inputs.* }} im env:-Block (Negativ-Kontrolle)"
rm -f "$TMP_YAML_INJ_OK"

# Akzeptanzkriterium: der echte Freigabe-Workflow interpoliert inputs/actor nicht inline im run:.
userinput_in_run "$RELEASE_YML" >/dev/null 2>&1
assert_exit 0 "$?" "#173: deploy-freeze-release.yml nutzt \$GRUND/\$ACTOR (env:), kein inline \${{ inputs.* }}/\${{ github.actor }}"

# Beleg, dass die Werte tatsächlich über env: bereitgestellt werden (Fix-Muster, wie deploy-gate.yml).
grep -q 'GRUND: ${{ inputs.grund }}' "$RELEASE_YML"
assert_true "$?" "#173: inputs.grund wird über env: GRUND bereitgestellt"
grep -q 'ACTOR: ${{ github.actor }}' "$RELEASE_YML"
assert_true "$?" "#173: github.actor wird über env: ACTOR bereitgestellt"

# deploy-freeze-release.yml bleibt valides YAML (nur wo yq vorhanden, ADR-009).
if [ "$HAS_YQ" = 1 ]; then
  yq '.' "$RELEASE_YML" >/dev/null 2>&1
  assert_true "$?" "#173: deploy-freeze-release.yml bleibt valides YAML (yq-Parse)"
else
  skip_yq "#173: deploy-freeze-release.yml bleibt valides YAML"
fi

# ─── #426/#431 (nach #432 hierher): Prüfungen echter TCH-Dateien aus den Factory-Mechanik-Tests ───
echo ""
echo "#426/#431 echte Projekt-Dateien (Besitz, Erweiterungspunkt, Workflows):"

# AK-A3 (#426): die TCH-Dateien sind 'project' zugeordnet – gegen die ECHTE OWNERSHIP-Tabelle.
OWN_CHECK_426="$CHECKS_DIR/ownership-check.sh"
# Ausgabe erst einsammeln, dann per Here-String greppen (nie `printf | grep -q`, bash-gotchas #3).
own_side_426() { local l; l="$(bash "$OWN_CHECK_426" --list "$1" 2>/dev/null)"; grep -qxF -- "$2" <<< "$l"; }
for f_426 in scripts/project/neon-reset-int.sh scripts/project/deploy-freeze.sh scripts/project/deploy-freeze-notify.sh \
    .github/workflows/deploy-gate.yml .github/workflows/deploy-freeze-release.yml \
    scripts/project/checks/pre-push.d/routes-doc-check.sh docs/project/lessons/frontend-react.md \
    docs/project/lessons/db-drizzle.md docs/project/lessons/next-auth.md; do
  own_side_426 project "$f_426"
  assert_exit 0 $? "#426 AK-A3: $f_426 ist 'project' zugeordnet"
done

# AK-F4 (#431): die Projekt-Workflows sind in OWNERSHIP.md als 'project' geführt.
own_f_431="$FACTORY_ROOT/docs/factory/OWNERSHIP.md"
for wf_431 in ".github/workflows/deploy-gate.yml" ".github/workflows/deploy-freeze-release.yml"; do
  grep -qF "| project | \`${wf_431}\`" "$own_f_431"
  assert_exit 0 "$?" "#431 AK-F4: ${wf_431} ist als project in OWNERSHIP.md geführt"
done

# mk_gate_root_431 <dir> – Wegwerf-Projektwurzel mit Kopie von pre-push.sh + Lib + Defaults auf einem Feature-Branch.
mk_gate_root_431() {
  mkdir -p "$1/scripts/checks" "$1/scripts/lib"
  cp "$CHECKS_DIR/pre-push.sh" "$1/scripts/checks/"
  cp "$SCRIPTS_DIR/lib/gate-config.sh" "$1/scripts/lib/"
  cp "$FACTORY_ROOT/factory.defaults.yml" "$1/"
  mk_feature_repo "$1" feature/431-gate-test
}
run_gate_431() {
  GATE_OUT_431="$( cd "$1" && env FACTORY_LINT_COMMAND=true FACTORY_TEST_COMMAND=true \
      FACTORY_TYPECHECK_COMMAND=true FACTORY_FORMAT_COMMAND=true \
      bash "scripts/checks/pre-push.sh" 2>&1 )"
  RC_431=$?
}

# AK-G4: routes-doc-check liegt im Erweiterungspunkt, pre-push.sh nennt ihn nicht mehr; Drift blockiert weiter.
ROUTES_431="scripts/project/checks/pre-push.d/routes-doc-check.sh"
assert_true "$([ -x "$FACTORY_ROOT/$ROUTES_431" ]; echo $?)" "#431 AK-G4: routes-doc-check.sh liegt ausführbar in pre-push.d"
assert_true "$([ ! -e "$CHECKS_DIR/routes-doc-check.sh" ]; echo $?)" "#431 AK-G4: scripts/checks/routes-doc-check.sh ist weg"
grep -q 'routes-doc-check' "$CHECKS_DIR/pre-push.sh"
assert_exit 1 "$?" "#431 AK-G4: pre-push.sh nennt routes-doc-check nicht mehr"
TMP_G4_431="$(mktemp -d)"
mk_gate_root_431 "$TMP_G4_431"
mkdir -p "$TMP_G4_431/scripts/project/checks/pre-push.d" "$TMP_G4_431/app/login" "$TMP_G4_431/docs"
cp "$FACTORY_ROOT/$ROUTES_431" "$TMP_G4_431/scripts/project/checks/pre-push.d/"
: > "$TMP_G4_431/app/page.tsx"; : > "$TMP_G4_431/app/login/page.tsx"
printf '| Pfad | Typ | Funktion | Zugriff |\n|---|---|---|---|\n| `/` | Seite | Home | angemeldet |\n| `/login` | Seite | Login | öffentlich |\n' > "$TMP_G4_431/docs/routes.md"
run_gate_431 "$TMP_G4_431" pre-push
assert_exit 0 "$RC_431" "#431 AK-G4: Routen-Doku synchron → pre-push exit 0"
mkdir -p "$TMP_G4_431/app/neu"; : > "$TMP_G4_431/app/neu/page.tsx"
run_gate_431 "$TMP_G4_431" pre-push
assert_exit 1 "$RC_431" "#431 AK-G4: Routen-Doku-Drift blockiert den Push weiter (Verhaltenstest)"
assert_contains_286 "$GATE_OUT_431" 'routes-doc-check.sh' "#431 AK-G4: die Meldung nennt den Projekt-Check"
rm -rf "$TMP_G4_431"


FACTORY_MD_431="$FACTORY_ROOT/docs/factory/FACTORY.md"
CLAUDE_MD_431="$FACTORY_ROOT/CLAUDE.md"
BASELINE_COMMIT_431="bcba043"  # main vor T1a-2 – Referenz für AK-D3 (Rekonstruktion der alten CLAUDE.md)

# AK-D3: Rekonstruktion – jede nicht-leere Zeile der alten CLAUDE.md steht in genau einer der beiden
# Dateien (außer den bewusst entfernten Import-/Überschriftszeilen). Historienlesender Test:
# im flachen CI-Klon fehlt der Commit → sichtbarer Skip, kein Falsch-Rot (Lesson #426).
if git -C "$FACTORY_ROOT" cat-file -e "$BASELINE_COMMIT_431:CLAUDE.md" 2>/dev/null; then
  old_431="$(mktemp)"; git -C "$FACTORY_ROOT" show "$BASELINE_COMMIT_431:CLAUDE.md" > "$old_431"
  missing_431=""; dup_431=""
  while IFS= read -r line_431; do
    [ -n "${line_431//[[:space:]]/}" ] || continue
    case "$line_431" in '# dm Development Factory'*|'## Projekt-Kontext'|'@docs/factory/PROJECT-CONTEXT.md'|'---') continue ;; esac
    in_fac_431=0; in_cl_431=0
    # Erste gewollte Textänderung: Links in FACTORY.md sind relativ zu docs/factory/ (AK-B3).
    fac_line_431="${line_431//\](docs\/factory\//](}"
    grep -qxF -- "$fac_line_431" "$FACTORY_MD_431" && in_fac_431=1
    # Zweite gewollte Textänderung (Etappe G): routes-doc-check.sh zog in den Erweiterungspunkt pre-push.d um.
    cl_line_431="${line_431//scripts\/checks\/routes-doc-check.sh/scripts/project/checks/pre-push.d/routes-doc-check.sh}"
    grep -qxF -- "$cl_line_431" "$CLAUDE_MD_431" && in_cl_431=1
    [ $((in_fac_431 + in_cl_431)) -ge 1 ] || missing_431="$missing_431|$line_431"
    [ $((in_fac_431 + in_cl_431)) -le 1 ] || dup_431="$dup_431|$line_431"
  done < "$old_431"
  rm -f "$old_431"
  assert_true "$([ -z "$missing_431" ]; echo $?)" "#431 AK-D3: jede Zeile der alten CLAUDE.md ist wiederzufinden (fehlt:${missing_431:- nichts})"
  assert_true "$([ -z "$dup_431" ]; echo $?)" "#431 AK-D3: keine Zeile steht in beiden Dateien (doppelt:${dup_431:- nichts})"
else
  echo "  ⏭  #431 AK-D3: Baseline-Commit $BASELINE_COMMIT_431 nicht verfügbar (flacher Klon) – übersprungen"
fi


# ─── #432 AK-J3: die Projekt-Suite läuft im Required Check `test` des projekteigenen ci.yml ───
echo ""
echo "#432 AK-J3 Projekt-Suite in ci.yml (Job test):"
test_job_432="$(ci_job_block test "$FACTORY_ROOT/.github/workflows/ci.yml")"
assert_contains_286 "$test_job_432" 'run: bash scripts/project/tests/run-project-tests.sh' \
  "#432 AK-J3: der Job test ruft die Projekt-Suite auf (ohne Fehler-Unterdrückung)"
assert_absent "$test_job_432" 'run-project-tests.sh ||' "#432 AK-J3: der Aufruf unterdrückt den Exit-Code nicht"
assert_absent "$test_job_432" 'continue-on-error' "#432 AK-J3: der Job test hat kein continue-on-error"

# ─── Ergebnis ────────────────────────────────────────────────────────────────
echo ""
echo -e "Ergebnis: ${GREEN}${PASS} grün${NC}, ${RED}${FAIL} rot${NC}"
[[ "$FAIL" -eq 0 ]]
