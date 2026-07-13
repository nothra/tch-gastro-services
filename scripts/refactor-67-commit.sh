#!/usr/bin/env bash
# Einmal-Skript: Temp-Dateien (Task 67) entfernen und Refactoring committen.
# Wird nach dem Commit entfernt (liegt selbst im Commit, schadet nicht – ist nur ein Hilfsskript).
set -euo pipefail

PROJ="/Users/Ralf.Notheis/ws/TCH Gastro Services.worktrees/feature-67-health-rate-limit"
cd "$PROJ"

# Temp-Dateien aus dem Working-Tree entfernen (Review-Auflage Task 67).
# Beide sind untracked (??), werden ohne diese Löschung von git add -A mitgestuft.
rm -f "lint-out.tmp.txt"
rm -f "scripts/lint-debug.tmp.sh"

bash scripts/factory-commit.sh "refactor: clean-code pass fuer task-67 health-rate-limit"
