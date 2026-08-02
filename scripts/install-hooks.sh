#!/usr/bin/env bash
# install-hooks.sh – installiert bzw. aktualisiert die Git-Hooks dieses Repos (ADR-042)
#
# Verwendung: bash scripts/install-hooks.sh
#
# Einzige Quelle für den Inhalt der Hooks (pre-commit, pre-push, commit-msg). Für neue
# Projekte ruft `init-factory.sh` dieses Skript auf; für bereits initialisierte Repos ist
# es der Retrofit-Weg – `init-factory.sh` läuft dort nie ein zweites Mal (ADR-042).
#
# Idempotent: jeder Lauf schreibt denselben kanonischen Inhalt und setzt das
# Ausführbar-Bit. Beliebig oft aufrufbar, auch über einen veralteten Hook-Stand hinweg.
#
# Die Hooks landen im gemeinsamen Git-Verzeichnis (`git rev-parse --git-common-dir`) und
# gelten damit sofort für alle Worktrees dieses Repos – keine Pro-Worktree-Installation.
#
# Fail-closed: kein git-Repository → Abbruch (exit ≠ 0), damit ein fehlgeschlagenes
# Retrofit nicht als „Hooks aktiv" durchgeht.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

if ! GIT_COMMON_DIR="$(git -C "$REPO_DIR" rev-parse --git-common-dir 2>/dev/null)"; then
  echo -e "${RED}✗${NC} install-hooks: '$REPO_DIR' ist kein git-Repository – keine Hooks installiert (fail-closed)." >&2
  exit 1
fi

# `--git-common-dir` liefert je nach Aufrufort einen relativen Pfad (typisch ".git") –
# relativ zu dem per `-C` gesetzten Verzeichnis, hier also zum Repo-Wurzelverzeichnis.
case "$GIT_COMMON_DIR" in
  /*) ;;
  *) GIT_COMMON_DIR="$REPO_DIR/$GIT_COMMON_DIR" ;;
esac

HOOKS_DIR="$GIT_COMMON_DIR/hooks"
mkdir -p "$HOOKS_DIR"

# install_hook <hook-name> <auszuführende-zeile>
install_hook() {
  local hook_name="$1" hook_command="$2" hook_file="$HOOKS_DIR/$1"
  printf '#!/usr/bin/env bash\n%s\n' "$hook_command" > "$hook_file"
  chmod +x "$hook_file"
  echo -e "  ${GREEN}✓${NC} $hook_name Hook installiert"
}

# Die Hooks laufen mit dem Repo-Wurzelverzeichnis als Arbeitsverzeichnis (Git-Kontrakt),
# deshalb genügen relative Pfade auf die Check-Skripte.
install_hook pre-commit 'bash scripts/checks/pre-commit.sh'
install_hook pre-push 'bash scripts/checks/pre-push.sh'
install_hook commit-msg 'bash scripts/checks/commit-msg-check.sh "$1"'

echo -e "${GREEN}Git-Hooks aktuell${NC} – $HOOKS_DIR"
