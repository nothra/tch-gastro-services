#!/usr/bin/env bash
# factory-extract.sh – die Factory mit Historie aus TCH herauslösen (#427, ADR-063 D5 + Nachtrag 2026-10-23)
#
# Projekteigenes Einmal-Werkzeug: es kennt den TCH-Slug und wandert nicht mit ins Factory-Repo.
#
# Verwendung:
#   bash scripts/project/factory-extract.sh paths            # Pfadliste: --list factory + Altpfade (A1)
#   bash scripts/project/factory-extract.sh run <ziel>       # frischer Klon von main, dort filter-repo (X2)
#   bash scripts/project/factory-extract.sh verify <ziel>    # A2–A5 am umgeschriebenen Klon
#   bash scripts/project/factory-extract.sh scan <ziel>      # gitleaks + E-Mail-Muster, Bericht nach stdout (B1–B3)
#   bash scripts/project/factory-extract.sh qualify <ziel>   # TCH-Nummern im Arbeitsbaum ausschreiben (C3)
#
# `paths` liest den aktuellen Stand von FACTORY_DIR (Arbeitsbaum, ggf. ein Feature-Branch); `run`
# rechnet die Liste dagegen im frischen Klon von `main` neu – maßgeblich ist der gemergte Stand.
# `run` vergleicht `main` mit dem lokal bekannten `origin/main`; vorher `git fetch` ausführen.
#
# Exit: 0 = ok, 1 = eine Prüfung schlägt an (bei `scan` auch: gitleaks endet ≠ 0 – Fund oder
# Fehler, beides kein „sauber"), 2 = Aufruf-/Umgebungsfehler (fail-closed).
#
# Umgebung: FACTORY_DIR (TCH-Arbeitsklon, Default: Wurzel dieses Repos), FILTER_REPO_CMD
# (Default git-filter-repo), GITLEAKS_CMD (Default gitleaks), FACTORY_EXTRACT_ALLOW (Erlaubt-Liste
# E-Mail), FACTORY_EXTRACT_GITLEAKSIGNORE (begründete gitleaks-Falsch-Positive, Fingerprints).
# `run` legt seine Metadaten in <ziel>/.git/factory-extract/ ab (paths, files, source-commit);
# `verify` und `scan` lesen sie dort und dazu die commit-map, die filter-repo hinterlässt.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FACTORY_DIR="${FACTORY_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
RULES_FILE="$SCRIPT_DIR/factory-extract.rules"
# Nur für Commit-Messages (`run`): Co-authored-by-Trailer mit persönlicher Adresse fallen beim
# Herauslösen weg, noreply-Trailer bleiben (Entscheidung des Entwicklers 2026-10-23).
TRAILERS_FILE="$SCRIPT_DIR/factory-extract.trailers"
GITLEAKS_TOML="$SCRIPT_DIR/factory-extract.gitleaks.toml"
ALLOW_FILE="${FACTORY_EXTRACT_ALLOW:-$SCRIPT_DIR/factory-extract.allow}"
GITLEAKS_IGNORE="${FACTORY_EXTRACT_GITLEAKSIGNORE:-$SCRIPT_DIR/factory-extract.gitleaksignore}"
FILTER_REPO_CMD="${FILTER_REPO_CMD:-git-filter-repo}"
GITLEAKS_CMD="${GITLEAKS_CMD:-gitleaks}"
# Bereiche, die nie Factory waren – auch nicht als Altpfad (A2, FS2).
FORBIDDEN_ERE='^(app|db|lib|tasks|e2e|scripts/project|docs/specs|docs/project)/'
NULL_COMMIT=0000000000000000000000000000000000000000
A5_FORMAT='%an <%ae> %aI | %cI'
EMAIL_ERE='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
# Ein Muster der Erlaubt-Liste braucht eine feste Top-Level-Domain – `*`, `*@*` oder `*@example.*`
# würden beliebige Adressen durchlassen (Security-Review W3).
ALLOW_PATTERN_ERE='^[^@]+@[^@]*\.[A-Za-z]{2,}$'
# Ein Falsch-Positiv gilt nur für genau einen Commit; `<datei>:<regel>:<zeile>` ohne Commit würde
# gitleaks für alle Commits anwenden (Security-Review H1).
FINGERPRINT_ERE='^[0-9a-f]{40}:[^:]+:[^:]+:[0-9]+$'
EMAIL_RESIDUAL_RISK="Das E-Mail-Muster erkennt ASCII-Adressen der Form name@domain.tld; Umlaut-Domains, verschleierte Formen ((at), %40) und komprimierte Dateien prüft es nicht."

# Git gibt Pfade mit Nicht-ASCII-Zeichen sonst oktal-gequotet aus ("\303\234…") – filter-repo und
# die Vergleiche hier brauchen die echten Namen. Per Umgebung, damit es auch für den aufgerufenen
# ownership-check.sh gilt.
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.quotePath GIT_CONFIG_VALUE_0=false

die() { local code="$1"; shift; echo "factory-extract: $*" >&2; exit "$code"; }

usage() {
  die 2 "Verwendung: factory-extract.sh paths | run <ziel> | verify <ziel> | scan <ziel> | qualify <ziel>"
}

# require_tool <befehl> <installationshinweis>
require_tool() { command -v "$1" >/dev/null 2>&1 || die 2 "$1 nicht gefunden – $2"; }

# nonempty_sorted – stdin ohne Leerzeilen, LC_ALL=C sortiert und eindeutig.
nonempty_sorted() { grep -v '^$' | LC_ALL=C sort -u; }

# trim_lines – stdin zeilenweise ohne Rand-Leerzeichen; die gemeinsame Lesart beider Listen-Dateien.
trim_lines() { sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }

# list_entries <datei> – Einträge einer Listen-Datei; Leerzeilen und `#`-Kommentare (auch
# eingerückt) fallen weg.
list_entries() { trim_lines < "$1" | { grep -v '^\(#.*\)\{0,1\}$' || true; }; }

# Die Umschreibregel läuft in Python `re` auf Bytes – derselben Regex-Engine wie
# `git filter-repo --replace-message`. Der Parser hier ist bewusst strenger als der von
# filter-repo: nur `regex:…==>…`-Zeilen, alles andere (auch Kommentare) bricht mit Exit 2 ab.
#   find <regeln>            stdin → Zeilen mit Treffer auf stdout, Exit 1 bei Treffer
#   md|sh <regeln> <datei>   Datei umschreiben; sh nur in Kommentarzeilen (nicht `#!`), damit
#                            Fixtures wie "Closes #42" im Code unverändert bleiben. Symlinks werden
#                            übersprungen – sie könnten aus dem Ziel hinauszeigen.
read -r -d '' RULES_PY <<'PYEOF' || true
import os, re, sys

def fail(message):
    sys.stderr.write('factory-extract: %s\n' % message)
    sys.exit(2)

def load(path):
    rules = []
    for raw in open(path, 'rb').read().splitlines():
        if not raw:
            continue
        if not raw.startswith(b'regex:') or b'==>' not in raw:
            fail('ungueltige Regelzeile: %r' % raw)
        pattern, replacement = raw[len(b'regex:'):].rsplit(b'==>', 1)
        rules.append((re.compile(pattern), replacement))
    if not rules:
        fail('keine Regel in %s' % path)
    return rules

def rewrite(rules, text):
    for pattern, replacement in rules:
        text = pattern.sub(replacement, text)
    return text

def is_comment(line):
    stripped = line.lstrip()
    return stripped.startswith(b'#') and not stripped.startswith(b'#!')

mode, rules = sys.argv[1], load(sys.argv[2])
if mode == 'find':
    hits = [l for l in sys.stdin.buffer.read().splitlines() if any(p.search(l) for p, _ in rules)]
    for line in hits:
        sys.stdout.buffer.write(line + b'\n')
    sys.exit(1 if hits else 0)
if mode not in ('md', 'sh'):
    fail('unbekannter Modus: %s' % mode)
path = sys.argv[3]
if os.path.islink(path):
    sys.exit(0)
original = open(path, 'rb').read()
if mode == 'md':
    updated = rewrite(rules, original)
else:
    updated = b'\n'.join(rewrite(rules, l) if is_comment(l) else l for l in original.split(b'\n'))
if updated != original:
    open(path, 'wb').write(updated)
PYEOF

rules_py() { python3 -I -c "$RULES_PY" "$@"; }

# list_factory_files <repo> – Factory-Dateien laut der OWNERSHIP.md dieses Repo-Stands.
list_factory_files() { FACTORY_DIR="$1" bash "$1/scripts/checks/ownership-check.sh" --list factory; }

# follow_names <repo> <rev> <datei> – alle Namen der Datei laut `git log --follow`, sortiert.
follow_names() { git -C "$1" log --follow --name-only --format= "$2" -- "$3" | nonempty_sorted; }

# list_paths <repo> – Factory-Dateien plus ihre Altpfade, LC_ALL=C sortiert und eindeutig (A1).
list_paths() {
  local repo="$1" files
  files="$(list_factory_files "$repo")" || return 2
  [ -n "$files" ] || { echo "factory-extract: keine Factory-Dateien in $repo" >&2; return 2; }
  {
    printf '%s\n' "$files"
    printf '%s\n' "$files" | while IFS= read -r file; do
      follow_names "$repo" HEAD "$file" || exit 2
    done
  } | nonempty_sorted
}

# load_meta <ziel> – setzt META und SOURCE_COMMIT aus den Metadaten von `run`.
load_meta() {
  local target="$1" name
  [ -d "$target/.git" ] || die 2 "kein Git-Repo: $target"
  META="$target/.git/factory-extract"
  for name in paths files source-commit; do
    [ -s "$META/$name" ] || die 2 "Metadaten fehlen: $META/$name (zuerst 'run')"
  done
  SOURCE_COMMIT="$(cat "$META/source-commit")"
  git -C "$FACTORY_DIR" cat-file -e "$SOURCE_COMMIT^{commit}" 2>/dev/null \
    || die 2 "TCH-Commit $SOURCE_COMMIT fehlt in $FACTORY_DIR (git fetch?)"
}

# assert_main_current – herausgelöst wird nur der gemergte Stand: lokales main == origin/main.
assert_main_current() {
  local main origin
  main="$(git -C "$FACTORY_DIR" rev-parse --verify -q refs/heads/main)" || die 2 "kein lokaler Branch main in $FACTORY_DIR"
  if origin="$(git -C "$FACTORY_DIR" rev-parse --verify -q refs/remotes/origin/main)"; then
    [ "$main" = "$origin" ] || die 2 "lokales main ($main) ≠ origin/main ($origin) – zuerst main aktualisieren"
  fi
}

# check_a2 <ziel> – alle Pfade aller Commits ⊆ Liste, nichts aus den verbotenen Bereichen.
check_a2() {
  local target="$1" all problems
  all="$(git -C "$target" log --all --name-only --format= | nonempty_sorted)" \
    || die 2 "Pfade der Historie nicht lesbar: $target"
  problems="$(
    {
      LC_ALL=C comm -23 <(printf '%s\n' "$all") <(nonempty_sorted < "$META/paths")
      printf '%s\n' "$all" | grep -E "$FORBIDDEN_ERE" || true
    } | nonempty_sorted || true
  )"
  if [ -n "$problems" ]; then
    printf '%s\n' "$problems" | sed 's/^/A2: /'
    return 1
  fi
  echo "A2 ok: $(printf '%s\n' "$all" | grep -c .) Pfade in der Historie, alle in der Liste, keiner in einem verbotenen Bereich"
}

# check_a3 <ziel> – je Factory-Datei reicht `--follow` im Ziel über dieselben Namen wie in TCH.
check_a3() {
  local target="$1" file src_names dst_names checked=0 renamed=0 bad=0
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    checked=$((checked + 1))
    if ! git -C "$target" cat-file -e "HEAD:$file" 2>/dev/null; then
      echo "A3: $file fehlt im Ziel"
      bad=1
      continue
    fi
    src_names="$(follow_names "$FACTORY_DIR" "$SOURCE_COMMIT" "$file")" || die 2 "--follow in TCH fehlgeschlagen: $file"
    dst_names="$(follow_names "$target" HEAD "$file")" || die 2 "--follow im Ziel fehlgeschlagen: $file"
    if [ "$src_names" != "$dst_names" ]; then
      echo "A3: $file – --follow weicht ab (TCH: $(printf '%s\n' "$src_names" | tr '\n' ' ')/ Ziel: $(printf '%s\n' "$dst_names" | tr '\n' ' '))"
      bad=1
    elif [ "$(printf '%s\n' "$src_names" | grep -c .)" -gt 1 ]; then
      renamed=$((renamed + 1))
      echo "A3 Altpfad: $file ← $(printf '%s\n' "$src_names" | grep -vxF -- "$file" | tr '\n' ' ')"
    fi
  done < "$META/files"
  [ "$bad" -eq 0 ] || return 1
  echo "A3 ok: $checked Factory-Dateien, $renamed davon mit Altpfad – --follow reicht im Ziel genauso weit zurück"
}

# check_a4 <ziel> – keine Commit-Message enthält ein unqualifiziertes #<nr>. Geprüft wird mit
# derselben Regel, mit der `run` umschreibt: „A4 ok" belegt also, dass die Regel überall
# angewendet wurde – Formen, die die Regel bewusst auslässt (`issue#12`, Anker), meldet A4 nicht.
check_a4() {
  local target="$1" hits rc=0
  hits="$(git -C "$target" log --all --format=%B | rules_py find "$RULES_FILE")" || rc=$?
  [ "$rc" -le 1 ] || die 2 "Commit-Messages nicht prüfbar (Exit $rc)"
  if [ "$rc" -eq 1 ]; then
    printf '%s\n' "$hits" | sed 's/^/A4: /'
    return 1
  fi
  echo "A4 ok: keine Commit-Message mit unqualifiziertem #<nr>"
}

# check_a5 <ziel> – Autor und Datum jedes umgeschriebenen Commits wie in TCH (commit-map von filter-repo).
check_a5() {
  local target="$1" map="$1/.git/filter-repo/commit-map" old new before after compared=0 bad=0
  [ -r "$map" ] || die 2 "commit-map fehlt: $map (lief filter-repo?)"
  while read -r old new; do
    [ "$old" != old ] || continue
    [ "$new" != "$NULL_COMMIT" ] || continue
    before="$(git -C "$FACTORY_DIR" show -s --format="$A5_FORMAT" "$old")" || die 2 "Commit $old fehlt in $FACTORY_DIR"
    after="$(git -C "$target" show -s --format="$A5_FORMAT" "$new")" || die 2 "Commit $new fehlt im Ziel"
    compared=$((compared + 1))
    if [ "$before" != "$after" ]; then
      echo "A5: $old → $new: Autor/Datum weichen ab ($before / $after)"
      bad=1
    fi
  done < "$map"
  [ "$compared" -gt 0 ] || die 2 "commit-map ohne Einträge: $map (fail-closed)"
  [ "$bad" -eq 0 ] || return 1
  echo "A5 ok: $compared Commits mit unverändertem Autor und Datum"
}

# is_allowed <adresse> <muster-zeilen> – trifft eines der Muster (Glob, eins je Zeile)?
is_allowed() {
  local address="$1" pattern
  while IFS= read -r pattern; do
    [ -n "$pattern" ] || continue
    # shellcheck disable=SC2254 # das Muster ist bewusst ein Glob
    case "$address" in $pattern) return 0 ;; esac
  done <<< "$2"
  return 1
}

# extract_addresses – stdin → E-Mail-Adressen, kleingeschrieben, sortiert und eindeutig.
extract_addresses() {
  { LC_ALL=C grep -aoE "$EMAIL_ERE" || true; } | LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C sort -u
}

# disallowed_addresses <adressen> – die Adressen (eine je Zeile), die kein Muster der Erlaubt-Liste trifft.
disallowed_addresses() {
  local allowed address
  allowed="$(list_entries "$ALLOW_FILE")"
  while IFS= read -r address; do
    [ -n "$address" ] || continue
    is_allowed "$address" "$allowed" || printf '%s\n' "$address"
  done <<< "$1"
}

# all_messages <ziel> – alle Commit- und Tag-Messages (Autor-/Committer-Felder gehören nicht dazu).
all_messages() {
  git -C "$1" log --all --format=%B && git -C "$1" for-each-ref refs/tags --format='%(contents)'
}

# scan_emails <ziel> – E-Mail-Muster über alle Blobs aller Commits (B2); Funde mit Datei (FS1).
scan_emails() {
  local target="$1" addresses address files
  addresses="$(
    git -C "$target" rev-list --all --objects | awk '{ print $1 }' \
      | git -C "$target" cat-file --batch-check='%(objecttype) %(objectname)' \
      | awk '$1 == "blob" { print $2 }' \
      | git -C "$target" cat-file --batch \
      | extract_addresses
  )" || die 2 "Blobs nicht lesbar: $target"
  report_disallowed "$addresses" blob "$target"
}

# scan_message_emails <ziel> – E-Mail-Muster über alle Commit- und Tag-Messages (B2 Messages).
scan_message_emails() {
  local target="$1" addresses
  addresses="$(all_messages "$target" | extract_addresses)" || die 2 "Messages nicht lesbar: $target"
  report_disallowed "$addresses" message "$target"
}

# report_disallowed <adressen> <blob|message> <ziel> – je nicht erlaubter Adresse eine Zeile mit
# Fundort (Datei bzw. Message), Exit 1 bei Fund; sonst eine Zusammenfassung.
report_disallowed() {
  local addresses="$1" kind="$2" target="$3" disallowed address where
  disallowed="$(disallowed_addresses "$addresses")"
  if [ -z "$disallowed" ]; then
    echo "$(printf '%s' "$addresses" | grep -c . || true) Adressen, alle in der Erlaubt-Liste"
    return 0
  fi
  while IFS= read -r address; do
    if [ "$kind" = blob ]; then
      where="$(git -C "$target" log --all -i -S"$address" --format= --name-only | nonempty_sorted | tr '\n' ' ')"
      where="${where% }"
    else
      where="Commit-/Tag-Message"
    fi
    echo "$address ($where)"
  done <<< "$disallowed"
  return 1
}

# ignored_with_reasons – je Eintrag der Falsch-Positiv-Liste „<fingerprint>\t<begründung>"; die
# Begründung ist der Kommentarblock direkt darüber (eine Leerzeile beendet ihn). Ein Eintrag ohne
# Begründung bricht ab: Spec B1 verlangt jeden Falsch-Positiv einzeln begründet. Rand-Leerzeichen
# zählen nicht – dieselbe Lesart wie list_entries (trim_lines).
ignored_with_reasons() {
  local lines line reason=""
  lines="$(trim_lines < "$GITLEAKS_IGNORE")" || die 2 "Falsch-Positiv-Liste nicht lesbar: $GITLEAKS_IGNORE"
  while IFS= read -r line; do
    case "$line" in
      '') reason="" ;;
      '#') ;;
      '#'*) line="${line#\#}"; reason="${reason:+$reason }${line# }" ;;
      *)
        [ -n "$reason" ] || die 2 "Falsch-Positiv ohne Begründung: $line ($GITLEAKS_IGNORE)"
        printf '%s\n' "$line" | grep -Eq "$FINGERPRINT_ERE" \
          || die 2 "Falsch-Positiv ohne Commit-Bezug (<commit>:<datei>:<regel>:<zeile>): $line ($GITLEAKS_IGNORE)"
        printf '%s\t%s\n' "$line" "$reason"
        reason=""
        ;;
    esac
  done <<< "$lines"
}

cmd_paths() {
  local out
  out="$(list_paths "$FACTORY_DIR")" || exit 2
  printf '%s\n' "$out"
}

cmd_run() {
  local target="$1" source_git meta
  require_tool "$FILTER_REPO_CMD" "Installation z. B. per 'brew install git-filter-repo'"
  require_tool python3 "wird für die Umschreibregel gebraucht"
  [ ! -e "$target" ] || die 2 "Ziel existiert bereits: $target (frischen Pfad wählen)"
  source_git="$(git -C "$FACTORY_DIR" rev-parse --path-format=absolute --git-common-dir)" || die 2 "kein Git-Repo: $FACTORY_DIR"
  assert_main_current
  git clone -q --no-local --single-branch --branch main -- "$source_git" "$target" || die 2 "Klon fehlgeschlagen: $target"
  target="$(cd -- "$target" && pwd -P)"
  meta="$target/.git/factory-extract"
  mkdir -p "$meta"
  git -C "$target" rev-parse HEAD > "$meta/source-commit"
  list_factory_files "$target" > "$meta/files" || die 2 "Factory-Dateien nicht ermittelbar – halbes Ziel $target löschen"
  list_paths "$target" > "$meta/paths" || die 2 "Pfadliste nicht ermittelbar – halbes Ziel $target löschen"
  cat "$RULES_FILE" "$TRAILERS_FILE" > "$meta/message-rules" || die 2 "Message-Regeln nicht lesbar – halbes Ziel $target löschen"
  (cd "$target" && "$FILTER_REPO_CMD" --paths-from-file "$meta/paths" --replace-message "$meta/message-rules") \
    || die 2 "filter-repo fehlgeschlagen – halbes Ziel $target löschen"
  echo "factory-extract: herausgelöst nach $target (TCH-Commit $(cat "$meta/source-commit"), $(grep -c . "$meta/paths") Pfade)"
}

cmd_verify() {
  local target="$1" failed=0
  require_tool python3 "wird für die Umschreibregel gebraucht"
  load_meta "$target"
  check_a2 "$target" || failed=1
  check_a3 "$target" || failed=1
  check_a4 "$target" || failed=1
  check_a5 "$target" || failed=1
  exit "$failed"
}

# report_row <prüfung> <rc> <details> – eine Zeile der Ergebnistabelle.
report_row() {
  local mark="✓"
  [ "$2" -eq 0 ] || mark="✗"
  echo "| $1 | $mark | $(printf '%s\n' "$3" | grep -v '^$' | tr '\n' ';' | sed 's/;$//; s/;/; /g') |"
}

# override_note <variablen-wert> <variablen-name> – Hinweis, wenn eine Liste per Umgebung ersetzt ist.
override_note() { [ -z "$1" ] || printf ' (per %s überschrieben)' "$2"; }

# print_fenced <überschrift> <text> – redigierte Werkzeug-Ausgabe als Codeblock.
print_fenced() {
  echo ""
  echo "$1"
  echo ""
  echo '```'
  printf '%s\n' "$2"
  echo '```'
}

# print_scan_report <ziel> – Scan-Bericht (B3) aus den Ergebnissen, die cmd_scan gesammelt hat.
# Liest die Laufzeit-Ergebnisse SOURCE_COMMIT und META (load_meta); FALSE_POSITIVES
# (Fingerprint\tBegründung je Zeile); LEAKS_RC/LEAKS_OUT (gitleaks Historie), MSG_LEAKS_RC/
# MSG_LEAKS_OUT (gitleaks Messages), B2_RC/B2_OUT und B2_MSG_RC/B2_MSG_OUT (E-Mail-Scan),
# A2_RC/A2_OUT (Pfad-Prüfung) – dazu die Konfiguration ALLOW_FILE, GITLEAKS_IGNORE, GITLEAKS_CMD,
# FILTER_REPO_CMD und die Overrides FACTORY_EXTRACT_ALLOW/FACTORY_EXTRACT_GITLEAKSIGNORE.
print_scan_report() {
  local target="$1" fingerprint reason pattern ignored_count list_hint=""
  echo "## Scan-Bericht factory-extract"
  echo ""
  echo "| Kennzahl | Wert |"
  echo "|---|---|"
  echo "| TCH-Commit (Quelle) | \`$SOURCE_COMMIT\` |"
  echo "| Commits | $(git -C "$target" rev-list --all --count) |"
  echo "| Dateien im Ziel (HEAD) | $(git -C "$target" ls-tree -r --name-only HEAD | grep -c .) |"
  echo "| Pfade in der Liste (A1) | $(grep -c . "$META/paths") |"
  echo "| git | $(git --version | sed 's/^git version //') |"
  echo "| git-filter-repo | $("$FILTER_REPO_CMD" --version 2>/dev/null || echo 'nicht gefunden') |"
  echo "| gitleaks | $("$GITLEAKS_CMD" version 2>&1 | head -1) |"
  echo "| python3 | $(python3 --version 2>&1 | sed 's/^Python //') |"
  echo "| Erlaubt-Liste | \`$ALLOW_FILE\`$(override_note "${FACTORY_EXTRACT_ALLOW:-}" FACTORY_EXTRACT_ALLOW) |"
  echo "| Falsch-Positiv-Liste | \`$GITLEAKS_IGNORE\`$(override_note "${FACTORY_EXTRACT_GITLEAKSIGNORE:-}" FACTORY_EXTRACT_GITLEAKSIGNORE) |"
  echo ""
  echo "| Prüfung | Ergebnis | Details |"
  echo "|---|---|---|"
  report_row A2 "$A2_RC" "$A2_OUT"
  ignored_count="$(printf '%s' "$FALSE_POSITIVES" | grep -c . || true)"
  [ "$ignored_count" -eq 0 ] || list_hint=", Liste unten"
  if [ "$LEAKS_RC" -eq 0 ]; then
    report_row B1 0 "gitleaks über alle Commits: kein Fund ($ignored_count Falsch-Positive ausgenommen$list_hint)"
  else
    report_row B1 1 "gitleaks Exit $LEAKS_RC – Fund oder Fehler, Ausgabe unten"
  fi
  if [ "$MSG_LEAKS_RC" -eq 0 ]; then
    report_row "B1 Messages" 0 "gitleaks über alle Commit- und Tag-Messages: kein Fund"
  else
    report_row "B1 Messages" 1 "gitleaks Exit $MSG_LEAKS_RC – Fund oder Fehler, Ausgabe unten"
  fi
  report_row B2 "$B2_RC" "$B2_OUT"
  report_row "B2 Messages" "$B2_MSG_RC" "$B2_MSG_OUT"
  echo ""
  echo "Restrisiko B2: $EMAIL_RESIDUAL_RISK"
  echo ""
  echo "Erlaubt-Liste (B2, aus $ALLOW_FILE):"
  echo ""
  while IFS= read -r pattern; do
    echo "- \`$pattern\`"
  done <<< "$(list_entries "$ALLOW_FILE")"
  if [ -n "$FALSE_POSITIVES" ]; then
    echo ""
    echo "Ausgenommene Falsch-Positive (B1, aus $(basename "$GITLEAKS_IGNORE")):"
    echo ""
    while IFS="$(printf '\t')" read -r fingerprint reason; do
      echo "- \`$fingerprint\` – $reason"
    done <<< "$FALSE_POSITIVES"
  fi
  [ "$LEAKS_RC" -eq 0 ] || print_fenced "gitleaks-Ausgabe Historie (redigiert):" "$LEAKS_OUT"
  [ "$MSG_LEAKS_RC" -eq 0 ] || print_fenced "gitleaks-Ausgabe Messages (redigiert):" "$MSG_LEAKS_OUT"
}

# check_allow_patterns – jedes Muster der Erlaubt-Liste hat eine feste Top-Level-Domain.
check_allow_patterns() {
  local pattern
  while IFS= read -r pattern; do
    [ -n "$pattern" ] || continue
    printf '%s\n' "$pattern" | grep -Eq "$ALLOW_PATTERN_ERE" \
      || die 2 "Muster ohne feste Domain in der Erlaubt-Liste: '$pattern' ($ALLOW_FILE)"
  done <<< "$(list_entries "$ALLOW_FILE")"
}

# run_gitleaks <git|stdin> <weitere-argumente…> – gitleaks mit der gepinnten Konfiguration; eine
# GITLEAKS_CONFIG der Umgebung wird ausgeblendet (Security-Review W1).
run_gitleaks() {
  local mode="$1"
  shift
  env -u GITLEAKS_CONFIG "$GITLEAKS_CMD" "$mode" --no-banner --redact --config "$GITLEAKS_TOML" "$@"
}

# scan_history_secrets <ziel> – gitleaks über alle Commits, auf einem Klon ohne Arbeitsbaum: so
# liest gitleaks keine .gitleaks.toml/.gitleaksignore aus dem gescannten Repo (Security-Review W1).
# Setzt LEAKS_RC und LEAKS_OUT.
scan_history_secrets() {
  local target="$1"
  SCAN_BARE_DIR="$(mktemp -d)"
  trap 'rm -rf "$SCAN_BARE_DIR"' EXIT
  git clone -q --bare --no-local -- "$target" "$SCAN_BARE_DIR/repo.git" || die 2 "Klon ohne Arbeitsbaum fehlgeschlagen: $target"
  LEAKS_RC=0
  LEAKS_OUT="$(run_gitleaks git --log-opts=--all --gitleaks-ignore-path "$GITLEAKS_IGNORE" \
    "$SCAN_BARE_DIR/repo.git" 2>&1)" || LEAKS_RC=$?
}

cmd_scan() {
  local target="$1"
  require_tool "$GITLEAKS_CMD" "Installation z. B. per 'brew install gitleaks'"
  [ -r "$ALLOW_FILE" ] || die 2 "Erlaubt-Liste nicht lesbar: $ALLOW_FILE"
  [ -r "$GITLEAKS_IGNORE" ] || die 2 "Falsch-Positiv-Liste nicht lesbar: $GITLEAKS_IGNORE"
  [ -r "$GITLEAKS_TOML" ] || die 2 "gitleaks-Konfiguration nicht lesbar: $GITLEAKS_TOML"
  check_allow_patterns
  load_meta "$target"
  FALSE_POSITIVES="$(ignored_with_reasons)" || exit 2
  scan_history_secrets "$target"
  MSG_LEAKS_RC=0; MSG_LEAKS_OUT="$(all_messages "$target" | run_gitleaks stdin 2>&1)" || MSG_LEAKS_RC=$?
  B2_RC=0; B2_OUT="$(scan_emails "$target")" || B2_RC=$?
  B2_MSG_RC=0; B2_MSG_OUT="$(scan_message_emails "$target")" || B2_MSG_RC=$?
  A2_RC=0; A2_OUT="$(check_a2 "$target")" || A2_RC=$?
  [ "$B2_RC" -le 1 ] && [ "$B2_MSG_RC" -le 1 ] && [ "$A2_RC" -le 1 ] || exit 2
  print_scan_report "$target"
  [ "$LEAKS_RC" -eq 0 ] && [ "$MSG_LEAKS_RC" -eq 0 ] && [ "$B2_RC" -eq 0 ] && [ "$B2_MSG_RC" -eq 0 ] \
    && [ "$A2_RC" -eq 0 ] || exit 1
}

cmd_qualify() {
  local target="$1" file
  [ -d "$target" ] || die 2 "Verzeichnis fehlt: $target"
  require_tool python3 "wird für die Umschreibregel gebraucht"
  git -C "$target" rev-parse --git-dir >/dev/null 2>&1 || die 2 "kein Git-Repo: $target"
  # -z: auch Namen mit `"`, `\` oder Zeilenumbruch kommen ungequotet an. Die Liste geht über eine
  # Datei statt einer Prozess-Substitution, damit ein Fehler von ls-files nicht still „nichts zu
  # tun" bedeutet (bash 3.2 kann auf eine Prozess-Substitution nicht warten).
  QUALIFY_FILES="$(mktemp)"
  trap 'rm -f "$QUALIFY_FILES"' EXIT
  git -C "$target" ls-files -z > "$QUALIFY_FILES" || die 2 "git ls-files fehlgeschlagen: $target"
  while IFS= read -r -d '' file; do
    case "$file" in
      *.md) rules_py md "$RULES_FILE" "$target/$file" || exit 2 ;;
      *.sh) rules_py sh "$RULES_FILE" "$target/$file" || exit 2 ;;
    esac
  done < "$QUALIFY_FILES"
}

case "${1:-}" in
  paths) [ "$#" -eq 1 ] || usage; cmd_paths ;;
  run|verify|scan|qualify) [ "$#" -eq 2 ] || usage; "cmd_$1" "$2" ;;
  *) usage ;;
esac
