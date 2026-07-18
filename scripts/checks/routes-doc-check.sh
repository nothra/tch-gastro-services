#!/usr/bin/env bash
# routes-doc-check.sh – Drift-Check zwischen den tatsächlichen Route-Dateien
# (app/**/page.tsx + app/api/**/route.ts) und der kuratierten Übersicht docs/routes.md.
#
# Fail-closed: jede Abweichung (Route ohne Doku-Eintrag ODER Doku-Eintrag ohne Route)
# → Exit 1 mit Benennung der abweichenden Route(n). Übereinstimmung → Exit 0.
#
# Portabel: nur POSIX-`grep -E`/`sed -E` (kein \s/\d/\w, kein PCRE-Lookahead) – läuft
# lokal (macOS/BSD) und in CI (GNU/Alpine). Verdrahtet in scripts/checks/pre-push.sh.
#
# Projektwurzel: FACTORY_DIR (Tests/Override) sonst zwei Ebenen über scripts/checks/.

set -uo pipefail

ROOT="${FACTORY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DOC="docs/routes.md"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$ROOT" || {
  echo -e "${RED}✗${NC} Projektwurzel nicht erreichbar: $ROOT"
  exit 1
}

if [ ! -f "$DOC" ]; then
  echo -e "${RED}✗${NC} Routen-Doku fehlt: $DOC"
  exit 1
fi
if [ ! -d app ]; then
  echo -e "${RED}✗${NC} app/-Verzeichnis fehlt unter $ROOT"
  exit 1
fi

# ── 1. Tatsächliche Routen aus dem Dateibaum ableiten ────────────────────────
# page.tsx → Seite, route.ts → API-Handler. Private Ordner (Segment /_name) sind in
# Next.js vom Routing ausgenommen → überspringen. Route Groups /(name) erzeugen kein
# URL-Segment → entfernen. app/page.tsx → "/".
actual_routes() {
  find app -type f \( -name 'page.tsx' -o -name 'route.ts' \) \
    | grep -v '/_' \
    | while IFS= read -r f; do
        r=$(printf '%s' "$f" \
          | sed -e 's#^app##' -e 's#/page\.tsx$##' -e 's#/route\.ts$##' \
          | sed -E 's#/\([^)]*\)##g')
        [ -z "$r" ] && r='/'
        printf '%s\n' "$r"
      done \
    | sort -u
}

# ── 2. Dokumentierte Routen aus docs/routes.md extrahieren ───────────────────
# Konvention: jede Route steht als erste Tabellenspalte, backtick-umschlossen und mit
# / beginnend:  | `/pfad` | … |  – Prosa/Notizen (kein solcher Zeilenanfang) zählen nicht.
documented_routes() {
  grep -E '^\| *`/' "$DOC" \
    | sed -E 's/^\| *`([^`]*)`.*/\1/' \
    | sort -u
}

ACTUAL="$(actual_routes)"
DOCUMENTED="$(documented_routes)"

# comm braucht sortierte Eingaben (beide bereits sort -u).
MISSING_IN_DOC="$(comm -23 <(printf '%s\n' "$ACTUAL") <(printf '%s\n' "$DOCUMENTED"))"
MISSING_IN_TREE="$(comm -13 <(printf '%s\n' "$ACTUAL") <(printf '%s\n' "$DOCUMENTED"))"

FAILED=0

if [ -n "$MISSING_IN_DOC" ]; then
  echo -e "${RED}✗${NC} Route(n) ohne Eintrag in $DOC:"
  printf '%s\n' "$MISSING_IN_DOC" | sed 's/^/    /'
  FAILED=1
fi

if [ -n "$MISSING_IN_TREE" ]; then
  echo -e "${RED}✗${NC} Eintrag/-Einträge in $DOC ohne zugehörige Route-Datei:"
  printf '%s\n' "$MISSING_IN_TREE" | sed 's/^/    /'
  FAILED=1
fi

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Routen-Doku ($DOC) ist synchron mit dem app/-Baum"
  exit 0
fi

echo ""
echo -e "${YELLOW}→${NC} $DOC bei jeder Routen-Änderung mitpflegen (CLAUDE.md-Guardrail)."
exit 1
