#!/usr/bin/env bash
# commit-msg-check.sh – Flag-Guard für Commit-Messages (#262)
#
# Wird ausgeführt: git commit (über .git/hooks/commit-msg), aufgerufen mit dem Pfad zur
# Commit-Message-Datei als $1 – genau so, wie Git den Hook aufruft.
#
# Blockiert genau einen Fehlgriff: eine Message, die in Wahrheit ein CLI-Flag ist.
# `git commit -m --help` zeigt keine Hilfe an, sondern nimmt `--help` wörtlich als
# Commit-Message (so entstand Commit 2a27728 auf chore/252). Alles andere passiert
# unverändert – insbesondere Messages, die nur mit `-` beginnen (`-x`) oder ein Flag im
# Fließtext erwähnen. Eine allgemeine Formatprüfung (Conventional Commits) und die
# Leer-Prüfung sind bewusst NICHT Teil dieses Hooks (Scope: spec-262).
#
# Fail-closed: fehlendes Argument oder nicht lesbare Message-Datei → Abbruch (exit ≠ 0),
# kein stilles Durchwinken.

set -euo pipefail

RED='\033[0;31m'
NC='\033[0m'

MESSAGE_FILE="${1:-}"

if [ -z "$MESSAGE_FILE" ]; then
  echo -e "${RED}✗${NC} commit-msg-check: kein Pfad zur Commit-Message-Datei übergeben (fail-closed)." >&2
  exit 2
fi

if [ ! -r "$MESSAGE_FILE" ]; then
  echo -e "${RED}✗${NC} commit-msg-check: Commit-Message-Datei '$MESSAGE_FILE' nicht lesbar (fail-closed)." >&2
  exit 2
fi

MESSAGE="$(cat -- "$MESSAGE_FILE")"

# Umgebenden Whitespace (inkl. Zeilenumbrüche) entfernen: `git commit -m` hängt ein \n an,
# und ein versehentliches Leerzeichen soll den Guard nicht aushebeln. Verglichen wird
# danach exakt – kein Regex, damit es keine BSD/GNU-Portabilitätsfalle gibt.
TRIMMED="${MESSAGE#"${MESSAGE%%[![:space:]]*}"}"
TRIMMED="${TRIMMED%"${TRIMMED##*[![:space:]]}"}"

if [ "$TRIMMED" = "--help" ] || [ "$TRIMMED" = "-h" ]; then
  echo -e "${RED}✗${NC} commit-msg-check: Die Commit-Message sieht aus wie ein CLI-Flag ('$TRIMMED') – Commit blockiert." >&2
  echo "     Vermutlich war eine Hilfe-Ausgabe gemeint; git nimmt das Flag wörtlich als Message." >&2
  echo '     Bitte eine echte Commit-Message angeben, z. B.: git commit -m "feat: ..."' >&2
  exit 1
fi

exit 0
