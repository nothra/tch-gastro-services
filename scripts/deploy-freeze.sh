#!/usr/bin/env bash
# deploy-freeze.sh – Fail-closed Deploy-Freeze über ein Git-Sentinel-Ref (ADR-032).
#
# Ein einmal rotes Deploy-Gate (E2E gegen INT / db:migrate:int / db:migrate:prd) setzt
# einen persistenten Freeze-Marker. Der Promote-Schritt verweigert danach jeden weiteren
# Promote (inkl. PRD-DB-Migration), bis ein Maintainer den Freeze nach Fix + Verifikation
# aufhebt. Verhindert, dass ein einmal rotes Gate durch einen späteren, evtl. flaky-grünen
# Lauf still überholt wird (Vorfall 19.07.2026: #134-rot → #167-flaky-grün → Prod-Defekt).
#
# Marker = dediziertes Ref `refs/factory/deploy-freeze` auf `origin`; das Ref zeigt auf den
# blockierenden Commit-SHA (selbstbeschreibend). Existenz des Refs = „eingefroren". Der
# menschenlesbare Grund wird beim Setzen über die aktive Benachrichtigung + Step-Summary
# festgehalten (deploy-freeze-notify.sh), nicht im Ref.
#
# Verwendung:
#   bash scripts/deploy-freeze.sh set <sha> <grund>   # Freeze setzen (nicht überschreiben)
#   bash scripts/deploy-freeze.sh check               # Exit 0=frozen, 10=frei, sonst=unklar
#   bash scripts/deploy-freeze.sh release             # Freeze aufheben (idempotent)
#   bash scripts/deploy-freeze.sh status              # blockierenden SHA ausgeben
#
# Exit-Codes (dokumentiert, ADR-032):
#   check → 0  = eingefroren
#         → 10 = nicht eingefroren
#         → *  = unklar / Marker nicht lesbar (fail-closed: der Aufrufer promotet NICHT)
#   set/release/status → 0 = ok, !=0 = Fehler (fail-closed sichtbar).
#
# Env-Overrides (für die Bare-Repo-Simulation in run-tests.sh, ohne echten Deploy):
#   FREEZE_REMOTE (Default: origin)
#   FREEZE_REF    (Default: refs/factory/deploy-freeze)

set -uo pipefail

FREEZE_REMOTE="${FREEZE_REMOTE:-origin}"
FREEZE_REF="${FREEZE_REF:-refs/factory/deploy-freeze}"

CMD="${1:-}"

usage() {
  echo "Verwendung: bash scripts/deploy-freeze.sh {set <sha> <grund>|check|release|status}" >&2
}

# Gibt die Ref-Zeile aus ls-remote zurück (stdout) und den ls-remote-Exit-Code (Rückgabe).
# Trennt sauber „Remote nicht erreichbar/unlesbar" (Exit != 0) von „Ref fehlt" (Exit 0, leer).
freeze_lsremote() {
  git ls-remote "$FREEZE_REMOTE" "$FREEZE_REF" 2>/dev/null
}

freeze_check() {
  local out rc
  out="$(freeze_lsremote)"
  rc=$?
  # Remote nicht erreichbar/unlesbar → unklar → fail-closed (weder 0 noch 10).
  if [ "$rc" -ne 0 ]; then
    echo "::warning::Deploy-Freeze-Marker nicht lesbar (ls-remote exit ${rc}) – Promote verweigert (fail-closed)." >&2
    return 2
  fi
  if [ -n "$out" ]; then
    return 0    # Ref vorhanden → eingefroren
  fi
  return 10     # Ref fehlt → nicht eingefroren
}

freeze_status() {
  local out rc
  out="$(freeze_lsremote)"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "Marker-Status unklar – Ref nicht lesbar." >&2
    return 2
  fi
  if [ -z "$out" ]; then
    echo "kein Freeze aktiv"
    return 0
  fi
  # ls-remote-Zeile: "<sha>\t<ref>" → nur den SHA ausgeben.
  printf '%s\n' "${out%%$'\t'*}"
}

freeze_set() {
  local sha="${1:-}" grund="${2:-}"
  if [ -z "$sha" ] || [ -z "$grund" ]; then
    echo "Verwendung: bash scripts/deploy-freeze.sh set <sha> <grund>" >&2
    return 1
  fi

  # Doppel-Freeze: einen bestehenden Freeze NICHT überschreiben – der ursprünglich
  # blockierende SHA muss nachvollziehbar bleiben (Freigabe-Voraussetzung, ADR-032).
  freeze_check
  case $? in
    0)
      local existing
      existing="$(freeze_status)"
      echo "Freeze bereits aktiv auf ${existing} – nicht überschrieben (Grund des neuen Fehlschlags: ${grund})."
      return 0
      ;;
    10) : ;;  # nicht eingefroren → jetzt setzen
    *)
      # Marker-Status unklar (Remote transient unlesbar). NICHT still ohne Marker abbrechen –
      # sonst bliebe das System nach einem echten Fehlschlag ungefroren, und ein späterer
      # (flaky-)grüner Lauf sähe „Ref fehlt" → promotet den kaputten Code (exakt der
      # #134→#167-Vorfall). Deshalb den (non-force) Push unten TROTZDEM versuchen: fehlt das
      # Ref, wird es angelegt (Schutz wiederhergestellt); existiert bereits ein Freeze, bleibt
      # er bestehen (Promote weiter blockiert) – ein Fast-Forward re-pointet ihn höchstens auf
      # den aktuellen SHA, hebt ihn aber nie auf. Schlägt der Push fehl (Remote wirklich
      # unerreichbar), endet set non-zero (sichtbar) und der Promote-Guard verweigert ohnehin
      # (check != 10). In keinem Fall endet das System ungefroren → fail-closed.
      echo "::warning::Marker-Status unklar – Freeze wird vorsorglich gesetzt (fail-closed)." >&2
      ;;
  esac

  # Ref auf den blockierenden Commit setzen. Fail-closed: Push-Fehler → non-zero (sichtbar).
  if git push "$FREEZE_REMOTE" "${sha}:${FREEZE_REF}"; then
    echo "Deploy-Freeze gesetzt: ${FREEZE_REF} → ${sha}"
    echo "  Grund: ${grund}"
    return 0
  fi
  echo "::error::Deploy-Freeze konnte nicht gesetzt werden (Push nach ${FREEZE_REF} fehlgeschlagen)." >&2
  return 1
}

freeze_release() {
  freeze_check
  case $? in
    10)
      echo "Kein Freeze aktiv – nichts freizugeben (idempotent)."
      return 0
      ;;
    0) : ;;   # eingefroren → löschen
    *)
      # Unklar: trotzdem einen Delete versuchen (Freigabe soll auch bei unklarer Lage greifen).
      : ;;
  esac
  if git push "$FREEZE_REMOTE" --delete "$FREEZE_REF"; then
    echo "Deploy-Freeze aufgehoben: ${FREEZE_REF} gelöscht."
    return 0
  fi
  # „remote ref does not exist" ist bei einem Race o. Ä. kein Fehler → idempotent.
  if ! git ls-remote "$FREEZE_REMOTE" "$FREEZE_REF" 2>/dev/null | grep -q .; then
    echo "Kein Freeze aktiv (Ref bereits weg) – idempotent."
    return 0
  fi
  echo "::error::Deploy-Freeze konnte nicht aufgehoben werden (Delete von ${FREEZE_REF} fehlgeschlagen)." >&2
  return 1
}

case "$CMD" in
  set)     freeze_set "${2:-}" "${3:-}"; exit $? ;;
  check)   freeze_check; exit $? ;;
  release) freeze_release; exit $? ;;
  status)  freeze_status; exit $? ;;
  *)       usage; exit 2 ;;
esac
