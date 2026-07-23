#!/usr/bin/env bash
# report-verdict.sh – sourcebare Bibliothek: kanonische Verdict-Erkennung für die
# report-erzeugenden Skills (ADR-019 §4).
#
#   report_verdict <skill> <task_id> [tasks_dir]
#     → druckt den gültigen Verdict-String auf stdout, sonst nichts:
#         review          → APPROVED | NEEDS_REWORK   (aus tasks/review-<id>.md)
#         security-review → PASSED   | NEEDS_FIXES    (aus tasks/security-<id>.md)
#       Bei fehlender Datei, fehlendem Verdict oder jedem anderen Skill: leerer stdout.
#     → Exit immer 0; der Aufrufer entscheidet am (nicht-)leeren stdout.
#
# EINE Quelle für zwei Nutzer in scripts/run-pipeline.sh, damit sie nicht
# auseinanderdriften (ADR-019 §4 „ein Ort"):
#   - run_skill()-Report-Guard: ein non-zero Exit (inkl. „Reached max turns") gilt als
#     ERFOLG, wenn report_verdict für dieses Skill etwas liefert – der Report war fertig,
#     bevor das Turn-Limit riss. Nur für review/security-review; sonst Fehlversuch.
#   - pipeline_summary(): zeigt denselben Verdict an.
#
# Der Verdict wird AUSSCHLIESSLICH aus der ersten nicht-leeren Zeile unter der
# verbindlichen Anker-Überschrift gelesen (review → '## Empfehlung',
# security-review → '## Ergebnis'; .claude/commands/review.md / security-review.md).
# Eine Fließtext-Erwähnung eines Verdict-Wortes an anderer Stelle im Report darf das
# Ergebnis nicht mehr verfälschen (#211: ein Volltext-Grep wertete bei #206 ein
# NEEDS_REWORK-Review wegen einer späteren APPROVED-Erwähnung fälschlich als bestanden).
# Fail-closed: fehlender Anker, kein oder mehrdeutiges Token → leeres Verdict, kein Raten.
# Case-sensitiv wie im Report; nur POSIX-Regex / portables awk, macOS/BSD + GNU/Alpine
# (clean-code.md „Portabilität in Gate-Skripten").

report_verdict() {
  local skill="$1" task_id="$2" tasks_dir="${3:-${FACTORY_DIR:-.}/tasks}"
  local file header token_a token_b
  case "$skill" in
    review)          file="$tasks_dir/review-${task_id}.md";   header='## Empfehlung'; token_a='APPROVED'; token_b='NEEDS_REWORK' ;;
    security-review) file="$tasks_dir/security-${task_id}.md"; header='## Ergebnis';   token_a='PASSED';   token_b='NEEDS_FIXES' ;;
    *) return 0 ;;
  esac
  [ -f "$file" ] || return 0
  awk -v header="$header" -v a="$token_a" -v b="$token_b" '
    # Anker-Überschrift exakt (umgebender Whitespace erlaubt); erstes Vorkommen zählt.
    !found && $0 ~ ("^[[:space:]]*" header "[[:space:]]*$") { found = 1; next }
    found {
      if ($0 ~ /^[[:space:]]*$/) next            # Leerzeilen bis zum Verdict überspringen
      hasA = index($0, a) > 0
      hasB = index($0, b) > 0
      if (hasA && !hasB) print a                 # genau ein gültiges Token → Verdict
      else if (hasB && !hasA) print b
      exit                                       # nur die erste nicht-leere Zeile zählt
    }
  ' "$file" 2>/dev/null || true
}
