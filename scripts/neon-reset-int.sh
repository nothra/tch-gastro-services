#!/usr/bin/env bash
# Setzt den Neon-INT-Branch auf den aktuellen Stand des PRD-Branches zurück ("Reset from
# parent" via Restore-API). Behält Branch-ID und Endpoint (→ DATABASE_URL bleibt gültig),
# ersetzt aber Schema+Daten komplett durch die von PRD.
#
# ACHTUNG: Nach diesem Reset enthält der INT-Branch ECHTE personenbezogene Prod-Daten.
# Der Aufrufer MUSS unmittelbar danach anonymisieren (pnpm db:anonymize:int). Siehe ADR-015.
#
# Benötigte Env-Variablen (in CI als GitHub-Secrets, lokal via .env.int + Export):
#   NEON_API_KEY         Neon-API-Token (Bearer)
#   NEON_PROJECT_ID      Neon-Projekt-ID
#   NEON_INT_BRANCH_ID   Branch-ID des INT-Branches (wird zurückgesetzt)
#   NEON_PRD_BRANCH_ID   Branch-ID des PRD-Branches (Quelle des Resets)
#
# Exit-Codes: 0 = Reset abgeschlossen; !=0 = fehlgeschlagen (fail-closed).
set -euo pipefail

API="https://console.neon.tech/api/v2"
POLL_TIMEOUT_SECONDS=180
POLL_INTERVAL_SECONDS=5

require() {
  local name="$1" value="${2:-}"
  if [ -z "$value" ]; then
    echo "::error::Env-Variable $name fehlt – Neon-Reset abgebrochen (fail-closed)." >&2
    exit 1
  fi
}

require NEON_API_KEY "${NEON_API_KEY:-}"
require NEON_PROJECT_ID "${NEON_PROJECT_ID:-}"
require NEON_INT_BRANCH_ID "${NEON_INT_BRANCH_ID:-}"
require NEON_PRD_BRANCH_ID "${NEON_PRD_BRANCH_ID:-}"

command -v jq >/dev/null 2>&1 || { echo "::error::jq wird benötigt." >&2; exit 1; }

auth_header="Authorization: Bearer ${NEON_API_KEY}"

echo "Reset INT-Branch ${NEON_INT_BRANCH_ID} auf PRD-Branch ${NEON_PRD_BRANCH_ID} …"

# Restore-API: INT-Branch auf den Head des PRD-Branches zurücksetzen.
response="$(curl -sS -X POST \
  "${API}/projects/${NEON_PROJECT_ID}/branches/${NEON_INT_BRANCH_ID}/restore" \
  -H "${auth_header}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"source_branch_id\":\"${NEON_PRD_BRANCH_ID}\"}")"

# Fehler-Objekt der Neon-API abfangen (kein operations-Feld → Fehler).
if echo "$response" | jq -e '.operations' >/dev/null 2>&1; then
  :
else
  echo "::error::Neon-Restore fehlgeschlagen. Antwort: ${response}" >&2
  exit 1
fi

# Portabel (macOS-Bash 3.2 kennt kein `mapfile`): Operation-IDs zeilenweise einlesen.
op_ids=()
while IFS= read -r line; do
  [ -n "$line" ] && op_ids+=("$line")
done < <(echo "$response" | jq -r '.operations[].id')
if [ "${#op_ids[@]}" -eq 0 ]; then
  echo "Keine Operationen zurückgegeben – Branch war bereits synchron."
  exit 0
fi

echo "Warte auf ${#op_ids[@]} Neon-Operation(en) …"
deadline=$((SECONDS + POLL_TIMEOUT_SECONDS))
for op_id in "${op_ids[@]}"; do
  while true; do
    status="$(curl -sS \
      "${API}/projects/${NEON_PROJECT_ID}/operations/${op_id}" \
      -H "${auth_header}" -H "Accept: application/json" \
      | jq -r '.operation.status // "unknown"')"
    case "$status" in
      finished)
        echo "  ✓ Operation ${op_id}: finished"
        break
        ;;
      failed | error | cancelled)
        echo "::error::Neon-Operation ${op_id} endete mit Status '${status}'." >&2
        exit 1
        ;;
      *)
        if [ "$SECONDS" -ge "$deadline" ]; then
          echo "::error::Timeout beim Warten auf Neon-Operation ${op_id} (Status '${status}')." >&2
          exit 1
        fi
        sleep "$POLL_INTERVAL_SECONDS"
        ;;
    esac
  done
done

echo "INT-Branch erfolgreich von PRD zurückgesetzt."
