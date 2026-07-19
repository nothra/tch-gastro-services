#!/usr/bin/env bash
# deploy-freeze-notify.sh – Aktive Mensch-Benachrichtigung zum Deploy-Freeze (ADR-032).
#
# Bewusst getrennt von deploy-freeze.sh: Das Ref (deploy-freeze.sh) ist die fail-closed
# Maschinen-Grenze; diese Benachrichtigung ist die fail-open Mensch-Signalisierung. Ein
# Ausfall hier (Rate-Limit, fehlendes issues:write) darf die Schutzwirkung NIE untergraben –
# das Skript endet daher IMMER mit Exit 0 und meldet Probleme nur als Warnung.
#
# Kanal (ADR-032 §5): ein langlebiges „Deploy-Freeze"-Tracking-Issue. GitHubs native
# Issue-Notifications erfüllen „aktiv". Beim Setzen/Blockieren wird kommentiert (bei Bedarf
# neu geöffnet); bei Freigabe kommentiert + geschlossen.
#
# Verwendung:
#   bash scripts/deploy-freeze-notify.sh <event> <sha> <grund> [run-url]
#     event: frozen   – ein neuer Freeze wurde gesetzt
#            blocked  – ein Promote wurde wegen aktivem Freeze zurückgehalten
#            released – der Freeze wurde aufgehoben
#
# Benötigt `gh` (authentifiziert) + `issues: write`. Fehlt eines → Warnung, Exit 0.

set -uo pipefail

TITLE="🚫 Deploy-Freeze aktiv"
LABEL="${FREEZE_ISSUE_LABEL:-deploy-freeze}"

EVENT="${1:-}"
SHA="${2:-unbekannt}"
GRUND="${3:-nicht angegeben}"
RUN_URL="${4:-}"

warn() { echo "::warning::deploy-freeze-notify: $*" >&2; }

if [ -z "$EVENT" ]; then
  warn "kein Event angegeben – Benachrichtigung übersprungen."
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  warn "gh nicht verfügbar – Benachrichtigung übersprungen (Marker bleibt maßgeblich)."
  exit 0
fi

# Bestehendes Tracking-Issue (offen oder geschlossen) über den exakten Titel finden.
find_issue() {
  gh issue list --state all --search "in:title \"${TITLE}\"" --limit 1 \
    --json number,state --jq '.[0].number // empty' 2>/dev/null || true
}

body_for_event() {
  local run_line=""
  [ -n "$RUN_URL" ] && run_line="Lauf: ${RUN_URL}"$'\n'
  case "$EVENT" in
    frozen)
      printf '### Deploy-Freeze gesetzt\n\nBlockierender Commit: `%s`\nGrund: %s\n%s\nDer Promote (inkl. PRD-DB-Migration) ist bis zur Freigabe angehalten. Nach Fix + Verifikation über den `deploy-freeze-release`-Workflow freigeben (siehe README → Deploy-Gate).' "$SHA" "$GRUND" "$run_line" ;;
    blocked)
      printf '### Promote wegen Freeze zurückgehalten\n\nBlockierender Commit: `%s`\nGrund: %s\n%s\nDer Lauf endete grün, aber ohne Promote (Freeze aktiv).' "$SHA" "$GRUND" "$run_line" ;;
    released)
      printf '### Deploy-Freeze aufgehoben\n\nZuletzt blockierender Commit: `%s`\n%s\nDer nächste grüne Gate-Lauf promotet wieder regulär.' "$SHA" "$run_line" ;;
    *)
      printf 'Deploy-Freeze-Ereignis: %s (SHA %s, Grund: %s)' "$EVENT" "$SHA" "$GRUND" ;;
  esac
}

issue_num="$(find_issue)"
body="$(body_for_event)"

if [ -z "$issue_num" ]; then
  # Kein Tracking-Issue → für frozen/blocked eines anlegen; released braucht keins.
  if [ "$EVENT" = "released" ]; then
    warn "kein Tracking-Issue gefunden – Freigabe braucht keins, übersprungen."
    exit 0
  fi
  if ! gh issue create --title "$TITLE" --body "$body" --label "$LABEL" >/dev/null 2>&1; then
    # Label fehlt evtl. im Repo → einmal ohne Label versuchen (Degradation, fail-open).
    gh issue create --title "$TITLE" --body "$body" >/dev/null 2>&1 \
      || warn "Tracking-Issue konnte nicht angelegt werden."
  fi
  exit 0
fi

# Bestehendes Issue kommentieren; bei frozen/blocked sicherstellen, dass es offen ist.
gh issue comment "$issue_num" --body "$body" >/dev/null 2>&1 \
  || warn "Kommentar auf Issue #${issue_num} fehlgeschlagen."

case "$EVENT" in
  frozen|blocked) gh issue reopen "$issue_num" >/dev/null 2>&1 || true ;;
  released)       gh issue close  "$issue_num" >/dev/null 2>&1 || true ;;
esac

exit 0
