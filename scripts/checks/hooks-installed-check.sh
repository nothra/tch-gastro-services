#!/usr/bin/env bash
# hooks-installed-check.sh – prüft, dass die drei Factory-Git-Hooks installiert sind
# (pre-commit, pre-push, commit-msg).
#
# Fail-closed: fehlt einer der Hooks im gemeinsamen Git-Verzeichnis, ist er nicht
# ausführbar, ODER ist `core.hooksPath` gesetzt (siehe unten), schlägt der Check fehl
# (Exit 1) und nennt Ursache + Remediation-Hinweis. Reine Existenzprüfung reicht nicht –
# nicht ausführbare Hooks laufen bei Git ins Leere (Issue #265, ADR-042 §Consequences).
#
# Kein Inhaltsvergleich gegen install-hooks.sh (bewusst, siehe spec-265 „Nicht
# inbegriffen") – nur Präsenz + Ausführbarkeit + `core.hooksPath` (spec-268).
#
# core.hooksPath (z. B. durch husky) hat Vorrang vor der Präsenzprüfung: ist die Option
# gesetzt, führt Git ausschließlich Hooks aus diesem Verzeichnis aus – Datei-Reste im
# Standardpfad ($GIT_COMMON_DIR/hooks) liefen dort nie, auch wenn sie noch ausführbar
# vorhanden sind. Fail-closed statt Schein-Erfolg (spec-268, analog install-hooks.sh
# ADR-042). Anders als der einmalige Installer läuft dieser Check wiederholt im
# Push-Gate – es gibt keinen Zustand, in dem Reste im Standardpfad tatsächlich greifen,
# solange `core.hooksPath` gesetzt bleibt. Die Meldung bietet daher bewusst **keine**
# „Factory-Checks im konfigurierten Pfad einbinden"-Option an: das würde diesen Check
# nie grün machen, da er ausschließlich `$GIT_COMMON_DIR/hooks` liest (im Unterschied zu
# `install-hooks.sh`, dessen Meldung diese Option nennt, weil sie dort tatsächlich einen
# Ausweg beschreibt).
#
# Leerstring-Sonderfall (bewusste Abweichung von install-hooks.sh, empirisch mit
# git 2.51 verifiziert): `core.hooksPath=""` verhält sich NICHT wie „nicht gesetzt" –
# Git löst den Hook-Pfad dann auf das Arbeitsverzeichnis auf (`git rev-parse
# --git-path hooks` liefert `./` statt `$GIT_COMMON_DIR/hooks`) und ruft die Hooks im
# Standardpfad gar nicht mehr auf. Ein leerer Wert zählt hier deshalb ebenfalls als
# „gesetzt" (fail-closed) – `install-hooks.sh` hat denselben Blindspot, bleibt aber
# unverändert (außerhalb des Scopes von spec-268).
#
# Verwendet das GEMEINSAME Git-Verzeichnis (`git rev-parse --git-common-dir`), damit der
# Check aus jedem Worktree dieses Repos dasselbe Ergebnis liefert wie install-hooks.sh
# (ADR-042) – nicht ein worktree-lokales `.git`.
#
# Projektwurzel: FACTORY_DIR (Tests/Override) sonst zwei Ebenen über scripts/checks/.

set -uo pipefail

ROOT="${FACTORY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

cd "$ROOT" || {
  echo -e "${RED}✗${NC} Projektwurzel nicht erreichbar: $ROOT"
  exit 1
}

if ! GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null)"; then
  echo -e "${RED}✗${NC} hooks-installed-check: '$ROOT' ist kein git-Repository – Hooks können nicht geprüft werden (fail-closed)."
  exit 1
fi

# `--git-common-dir` liefert je nach Aufrufort einen relativen Pfad (typisch ".git") –
# relativ zur Projektwurzel (analog zu install-hooks.sh).
case "$GIT_COMMON_DIR" in
  /*) ;;
  *) GIT_COMMON_DIR="$ROOT/$GIT_COMMON_DIR" ;;
esac

# Ist core.hooksPath gesetzt (z. B. durch husky) – auch auf einen Leerstring, siehe
# Skript-Header –, führt Git Hooks nicht mehr aus $GIT_COMMON_DIR/hooks aus. Ausführbare
# Reste dort laufen dann nie und dürfen den Check nicht als Erfolg durchgehen lassen
# (spec-268, analog install-hooks.sh ADR-042). Kein `[ -n … ]`-Zusatzcheck: `git config
# --get` liefert exit 1 nur, wenn der Key völlig fehlt – ein gesetzter Leerstring liefert
# exit 0 (empirisch verifiziert) und muss denselben Fail-closed-Pfad nehmen.
if HOOKS_PATH_CONFIG="$(git config --get core.hooksPath 2>/dev/null)"; then
  # Scope mitnennen: `--get` liest auch global/system – ein blanker Hinweis auf
  # `git config --unset` würde sonst auf den falschen Scope zeigen.
  HOOKS_PATH_ORIGIN="$(git config --show-origin --get core.hooksPath 2>/dev/null | cut -f1 || true)"
  HOOKS_PATH_DISPLAY="${HOOKS_PATH_CONFIG:-<leer>}"
  echo -e "${RED}✗${NC} hooks-installed-check: 'core.hooksPath' ist auf '$HOOKS_PATH_DISPLAY' gesetzt (${HOOKS_PATH_ORIGIN:-Herkunft unbekannt}) – Git führt Hooks nicht aus '$GIT_COMMON_DIR/hooks' aus."
  echo "     Auch vorhandene Datei-Reste dort wären wirkungslos (fail-closed)."
  echo "     Dieser Check prüft ausschließlich '$GIT_COMMON_DIR/hooks' und kann bei gesetztem"
  echo "     core.hooksPath nicht grün werden – auch nicht durch Einbinden der Factory-Checks in"
  echo "     '$HOOKS_PATH_DISPLAY'. Beheben: git config --unset core.hooksPath (ggf. mit --global/--system)."
  exit 1
fi

HOOKS_DIR="$GIT_COMMON_DIR/hooks"

# Einzige Quelle für die drei Factory-Hook-Namen (Loop + Erfolgsmeldung teilen sich die
# Liste) – ein künftig vierter Hook müsste sonst an zwei Stellen synchron gepflegt werden.
FACTORY_HOOKS="pre-commit pre-push commit-msg"

MISSING=""
for hook in $FACTORY_HOOKS; do
  hook_file="$HOOKS_DIR/$hook"
  if [ ! -f "$hook_file" ] || [ ! -x "$hook_file" ]; then
    MISSING="$MISSING $hook"
  fi
done

if [ -n "$MISSING" ]; then
  echo -e "${RED}✗${NC} Fehlende oder nicht ausführbare Git-Hooks:$MISSING"
  echo "     Beheben mit: bash scripts/install-hooks.sh"
  exit 1
fi

echo -e "${GREEN}✓${NC} Alle Factory-Git-Hooks ($FACTORY_HOOKS) installiert und ausführbar"
exit 0
