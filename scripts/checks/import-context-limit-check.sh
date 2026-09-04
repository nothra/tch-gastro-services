#!/usr/bin/env bash
# import-context-limit-check.sh – Deckel für den @import-Dauerkontext (ADR-047 §4)
#
# Summiert die Zeilen von CLAUDE.md und – rekursiv – aller per `@pfad` eingebundenen Dateien
# und vergleicht die Summe gegen MAX_IMPORT_LINES. Dieser Kontext wird bei JEDER Session und
# JEDEM Pipeline-Schritt vollständig geladen; ohne Deckel wächst er unbemerkt zurück – genau
# das ist nach ADR-037 passiert (der Lessons-Index von ~80 auf 341 Zeilen, Befund aus #319).
# Eine Prosa-Konvention hat dort nicht gehalten, deshalb hier ein Gate.
#
# Erkannte Referenz-Formen – zwei, bewusst unterschiedlich behandelt:
#
#   1. Alleinstehende Import-Zeile: die Zeile besteht (bis auf Leerzeichen) aus `@<pfad>` und
#      enthält kein weiteres `@`. Dann IST der Rest der Zeile der Pfad – er darf Leerzeichen
#      enthalten. Diese Form wird immer gezählt, auch wenn sie nicht auflöst: nur so ist der
#      Check fail-closed, sonst umgeht eine Umbenennung den Deckel lautlos.
#
#   2. Inline-`@pfad` mitten in Prosa. Claude Code lädt auch diese Form – empirisch belegt im
#      Review zu #319 (Fixture-CLAUDE.md „Siehe @docs/geheim.md …" gab den Marker zurück,
#      dieselbe Zeile ohne `@` nicht). Sie muss deshalb mitzählen, sonst ist der Deckel per
#      Prosa-Zeile umgehbar. Ein Prosa-Token lässt sich von einem echten Import aber nur daran
#      unterscheiden, ob es auf eine lesbare Datei zeigt: `@serwist/next`,
#      `@neondatabase/serverless`, `@types/node` (alle real in PROJECT-CONTEXT.md) und
#      „@importiert" tun das nicht. Diese Form ist daher resolve-gefiltert und damit NICHT
#      fail-closed – ein Inline-Import auf eine gelöschte Datei fällt still weg. Das ist die
#      bekannte Restgrenze; sie ist die Kehrseite davon, Prosa nicht als Import zu zählen.
#      Angehängte Satzzeichen (`…@docs/x.md.`) werden abgeschnitten.
#
# Nicht erkannt: eine `@pfad`-Zeile in einem Code-Fence zählt wie ein echter Import (Form 1) und
# macht den Check bei nicht existierendem Pfad rot – fail-closed, aber ein Doku-Beispiel muss
# deshalb einen existierenden Pfad nennen. Geschachtelte Pfade werden gegen die Projektwurzel
# aufgelöst, nicht gegen die importierende Datei (heute ohne Fall im Repo).
#
# `wc -l` zählt Newlines: eine Datei ohne Schluss-Newline wird um 1 unterzählt. Für die
# @import-Dateien irrelevant, weil Prettier/`format:check` sie mit Schluss-Newline erzwingt.
#
# Projektwurzel: FACTORY_DIR (Tests/Override), sonst zwei Ebenen über scripts/checks/.

set -uo pipefail

ROOT="${FACTORY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Obergrenze in Zeilen für CLAUDE.md + rekursiv alle @-eingebundenen Dateien.
# Herleitung (ADR-047 §4 – keine Magic Number): Ist-Stand direkt nach der Umstellung aus #319
# = 860 Zeilen; + 25 % Puffer = 1.075; aufgerundet auf das nächste Vielfache von 50 = 1.100.
# Der Puffer trägt legitime Regel-Ergänzungen, ohne den nächsten Wildwuchs zu decken. Wer die
# Grenze anhebt, trifft eine bewusste Entscheidung – und pflegt diese Herleitung mit.
MAX_IMPORT_LINES=1100

ENTRY_FILE="CLAUDE.md"
SELF_PATH="scripts/checks/import-context-limit-check.sh"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
NL=$'\n'

cd "$ROOT" 2>/dev/null || {
  echo -e "${RED}✗${NC} import-context-limit-check: Projektwurzel nicht erreichbar: $ROOT"
  exit 1
}

if [ ! -f "$ENTRY_FILE" ] || [ ! -r "$ENTRY_FILE" ]; then
  echo -e "${RED}✗${NC} import-context-limit-check: Einstiegsdatei fehlt oder ist nicht lesbar: $ENTRY_FILE"
  echo "     Erwartet in der Projektwurzel '$ROOT' (fail-closed)."
  exit 1
fi

# refs_of <datei> – gibt die referenzierten Pfade aus, einen je Zeile (siehe Header: Form 1
# unbedingt, Form 2 nur wenn sie auf eine lesbare Datei auflöst).
refs_of() {
  local file="$1" line trimmed rest token candidate stripped
  while IFS= read -r line || [ -n "$line" ]; do
    trimmed="${line#"${line%%[![:space:]]*}"}"
    trimmed="${trimmed%"${trimmed##*[![:space:]]}"}"
    case "$trimmed" in
      @?*)
        rest="${trimmed#@}"
        case "$rest" in
          *@*) ;;  # mehrere @ in der Zeile → nur Token-Scan, sonst wäre der „Pfad" der ganze Satz
          *) printf '%s\n' "$rest"; continue ;;
        esac
        ;;
    esac
    for token in $(printf '%s\n' "$line" | tr -s '[:space:]' '\n' | grep '^@.'); do
      candidate="${token#@}"
      if [ -f "$candidate" ] && [ -r "$candidate" ]; then
        printf '%s\n' "$candidate"
        continue
      fi
      stripped="$(printf '%s' "$candidate" | sed 's/[.,;:!?)]*$//')"
      if [ "$stripped" != "$candidate" ] && [ -f "$stripped" ] && [ -r "$stripped" ]; then
        printf '%s\n' "$stripped"
      fi
    done
  done < "$file"
}

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

  if [ ! -f "$rel" ] || [ ! -r "$rel" ]; then
    echo -e "${RED}✗${NC} import-context-limit-check: referenzierte Datei nicht lesbar: $rel (fail-closed)"
    failed=1
    continue
  fi

  lines="$(wc -l < "$rel" | tr -d ' ')"
  total=$((total + lines))
  breakdown="$breakdown$(printf '%6d  %s' "$lines" "$rel")$NL"

  nested="$(refs_of "$rel")"
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
  echo "     Grenze anheben ist eine bewusste Entscheidung: MAX_IMPORT_LINES in $SELF_PATH samt Herleitung anpassen."
  exit 1
fi

echo -e "${GREEN}✓${NC} @import-Dauerkontext: $total von $MAX_IMPORT_LINES Zeilen"
exit 0
