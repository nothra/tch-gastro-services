#!/usr/bin/env bash
# import-context-limit-check.sh – Deckel für den @import-Dauerkontext (ADR-047 §4)
#
# Summiert die Zeilen von CLAUDE.md und – rekursiv – aller per `@pfad` eingebundenen Dateien
# und vergleicht die Summe gegen MAX_IMPORT_LINES. Dieser Kontext wird bei JEDER Session und
# JEDEM Pipeline-Schritt vollständig geladen; ohne Deckel wächst er unbemerkt zurück – genau
# das ist nach ADR-037 passiert (der Lessons-Index von ~80 auf 341 Zeilen, Befund aus #319).
# Eine Prosa-Konvention hat dort nicht gehalten, deshalb hier ein Gate.
#
# Fail-closed: eine referenzierte, aber nicht lesbare Datei macht den Check rot (nicht
# „überspringen") – sonst umgeht eine Umbenennung den Deckel lautlos.
#
# Erkannte Referenz-Form: eine Zeile, die ausschließlich aus `@<pfad>` besteht (optional von
# Leerzeichen umgeben) – die Konvention aller Imports in CLAUDE.md. Prosa-Vorkommen wie
# `@serwist/next` oder „@importiert" zählen dadurch nicht mit. Bekannte Grenze: ein Import,
# der mitten in einer Prosa-Zeile steht, wird nicht erfasst; das Repo kennt diese Form nicht.
#
# Projektwurzel: FACTORY_DIR (Tests/Override), sonst zwei Ebenen über scripts/checks/.

set -uo pipefail

ROOT="${FACTORY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Obergrenze in Zeilen für CLAUDE.md + rekursiv alle @-eingebundenen Dateien.
# Herleitung (ADR-047 §4 – keine Magic Number): Ist-Stand direkt nach der Umstellung aus #319
# = 849 Zeilen; + 25 % Puffer = 1.061; aufgerundet auf das nächste Vielfache von 50 = 1.100.
# Der Puffer trägt legitime Regel-Ergänzungen, ohne den nächsten Wildwuchs zu decken. Wer die
# Grenze anhebt, trifft eine bewusste Entscheidung – und pflegt diese Herleitung mit.
MAX_IMPORT_LINES=1100

ENTRY_FILE="CLAUDE.md"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
NL=$'\n'

# Worklist als newline-getrennter String statt Array: bash 3.2 (macOS) bricht unter `set -u`
# beim Expandieren leerer Arrays ab – der Check läuft lokal UND in CI.
pending="$ENTRY_FILE"
seen=""
total=0
failed=0
breakdown=""

while [ -n "$pending" ]; do
  rel="${pending%%$NL*}"
  case "$pending" in
    *"$NL"*) pending="${pending#*"$NL"}" ;;
    *) pending="" ;;
  esac

  # Zyklen und Doppelzählung abfangen (a.md → b.md → a.md).
  case "$NL$seen$NL" in
    *"$NL$rel$NL"*) continue ;;
  esac
  seen="$seen$NL$rel"

  abs="$ROOT/$rel"
  if [ ! -f "$abs" ] || [ ! -r "$abs" ]; then
    echo -e "${RED}✗${NC} import-context-limit-check: referenzierte Datei nicht lesbar: $rel (fail-closed)"
    failed=1
    continue
  fi

  lines="$(wc -l < "$abs" | tr -d ' ')"
  total=$((total + lines))
  breakdown="$breakdown$(printf '%6d  %s' "$lines" "$rel")$NL"

  nested="$(sed -n 's/^[[:space:]]*@\([^[:space:]][^[:space:]]*\)[[:space:]]*$/\1/p' "$abs")"
  if [ -n "$nested" ]; then
    pending="${pending:+$pending$NL}$nested"
  fi
done

if [ "$failed" -eq 1 ]; then
  echo "     Beheben: Referenz in CLAUDE.md (bzw. der importierenden Datei) korrigieren oder entfernen."
  exit 1
fi

if [ "$total" -gt "$MAX_IMPORT_LINES" ]; then
  echo -e "${RED}✗${NC} @import-Dauerkontext zu groß: $total Zeilen (Grenze: $MAX_IMPORT_LINES, ADR-047 §4)"
  printf '%s' "$breakdown" | sort -rn | sed 's/^/     /'
  echo "     Beheben: verdichten oder auslagern (Volltext → docs/factory/lessons/, Trigger in CLAUDE.md)."
  echo "     Grenze anheben ist eine bewusste Entscheidung: MAX_IMPORT_LINES in $0 samt Herleitung anpassen."
  exit 1
fi

echo -e "${GREEN}✓${NC} @import-Dauerkontext: $total von $MAX_IMPORT_LINES Zeilen"
exit 0
