#!/usr/bin/env bash
# factory-extract-tests.sh – Tests zu scripts/project/factory-extract.sh (#427, ADR-063 Nachtrag)
#
# Wird von run-project-tests.sh gesourct (teilt PASS/FAIL und die Prüf-Helfer), nie direkt
# ausgeführt. `git filter-repo` und `gitleaks` laufen hier nie echt: beide kommen als Stub über
# FILTER_REPO_CMD/GITLEAKS_CMD, auch für die Fälle „Werkzeug fehlt" und „Werkzeug meldet Fund"
# (Messung brechen, nicht nur den Input – Lesson aus #319).

FX_SCRIPT="$SCRIPTS_DIR/project/factory-extract.sh"
FX_RULES="$SCRIPTS_DIR/project/factory-extract.rules"
FX_TRAILERS="$SCRIPTS_DIR/project/factory-extract.trailers"
FX_TMP="$(mktemp -d)"
NULL_COMMIT_427=0000000000000000000000000000000000000000
# Das Fixture-Repo im Kleinen: drei Factory-Dateien (eine mit Umlaut im Namen, gegen gequotete
# Git-Pfade) und eine Factory-ADR, die von docs/adr/ nach docs/factory/adr/ zog – ihr Altpfad ist
# der einzige Unterschied zwischen Dateiliste und Pfadliste. Beide LC_ALL=C sortiert.
FX_FILES="$(printf '%s\n' docs/factory/OWNERSHIP.md docs/factory/adr/seam.md docs/factory/Überblick.md \
  scripts/checks/ownership-check.sh)"
FX_PATHS="$(printf '%s\n' docs/adr/seam.md "$FX_FILES")"

# fx_git <repo> <git-argumente…> – Git mit fester Identität (Lesson #265: CI hat keinen Fallback).
fx_git() { local repo="$1"; shift; git -C "$repo" -c user.email=t@t.com -c user.name=t "$@"; }

# fx_ownership <repo> – Zuordnungstabelle + Parser, wie TCH sie trägt.
fx_ownership() {
  mkdir -p "$1/docs/factory" "$1/scripts/checks"
  cp "$CHECKS_DIR/ownership-check.sh" "$1/scripts/checks/ownership-check.sh"
  cat > "$1/docs/factory/OWNERSHIP.md" <<'OWNEOF'
| Seite | Muster | Begründung |
|---|---|---|
| factory | `docs/factory/**` | Factory-Doku |
| factory | `scripts/checks/ownership-check.sh` | Gate |
| project | `app/**` | App |
| project | `docs/adr/**` | App-ADRs |
| project | `tasks/**` | Tasks |
OWNEOF
}

# fx_source <repo> [tch|extracted] – zwei Commits: Start, dann die Factory-ADR verschieben.
#   tch (Default): wie TCH – dazu App-Code und eine App-ADR, Messages mit unqualifiziertem #<nr>
#   extracted:     wie nach filter-repo – nur Factory-Pfade, Messages qualifiziert
fx_source() {
  local repo="$1" ref="#"
  git init -q -b main "$repo"
  mkdir -p "$repo/docs/adr"
  printf 'Zeile %s der Factory-ADR\n' 1 2 3 4 5 6 7 8 > "$repo/docs/adr/seam.md"
  fx_ownership "$repo"
  echo 'Überblick' > "$repo/docs/factory/Überblick.md"
  if [ "${2:-tch}" = tch ]; then
    mkdir -p "$repo/app"
    echo 'export default function Page() {}' > "$repo/app/page.tsx"
    echo 'App-Entscheidung' > "$repo/docs/adr/app.md"
  else
    ref="nothra/tch-gastro-services#"
  fi
  fx_git "$repo" add -A
  fx_git "$repo" commit -qm "feat: start (${ref}1)"
  mkdir -p "$repo/docs/factory/adr"
  fx_git "$repo" mv docs/adr/seam.md docs/factory/adr/seam.md
  fx_git "$repo" commit -qm "docs: adr verschieben (${ref}2)"
}

echo ""
echo "#427 factory-extract.sh paths (A1):"

FX_SRC="$FX_TMP/src"
fx_source "$FX_SRC"
fx_paths_1="$(FACTORY_DIR="$FX_SRC" bash "$FX_SCRIPT" paths)"
assert_exit 0 "$?" "#427 A1: paths läuft auf dem Fixture-Repo durch"
assert_true "$([ "$fx_paths_1" = "$FX_PATHS" ]; echo $?)" \
  "#427 A1: Liste = --list factory + Altpfad, LC_ALL=C sortiert, Umlaut-Pfad ungequotet (war: $(printf '%s' "$fx_paths_1" | tr '\n' ' '))"
assert_absent "$fx_paths_1" "app/page.tsx" "#427 A1: App-Code steht nicht in der Liste"
assert_absent "$fx_paths_1" "docs/adr/app.md" "#427 A1: eine App-ADR ohne Factory-Bezug steht nicht in der Liste"
fx_paths_2="$(FACTORY_DIR="$FX_SRC" bash "$FX_SCRIPT" paths)"
assert_true "$([ "$fx_paths_1" = "$fx_paths_2" ]; echo $?)" "#427 A1: zweiter Lauf auf demselben Stand liefert dieselbe Liste"

# Fail-closed: kaputte Zuordnungstabelle → kein Teilergebnis, sondern Abbruch.
FX_BROKEN="$FX_TMP/broken"
fx_source "$FX_BROKEN"
: > "$FX_BROKEN/docs/factory/OWNERSHIP.md"
fx_out="$(FACTORY_DIR="$FX_BROKEN" bash "$FX_SCRIPT" paths 2>/dev/null)"
assert_exit 2 "$?" "#427 A1: leere Zuordnungstabelle → Exit 2 (fail-closed)"
assert_true "$([ -z "$fx_out" ]; echo $?)" "#427 A1: bei Abbruch keine Teil-Liste auf stdout"

# Zwei Umbenennungen hintereinander: beide früheren Namen sind Altpfade.
FX_CHAIN="$FX_TMP/chain"
fx_source "$FX_CHAIN"
fx_git "$FX_CHAIN" mv docs/factory/adr/seam.md docs/factory/adr/seam2.md
fx_git "$FX_CHAIN" commit -qm "docs: zweite umbenennung (#3)"
fx_chain_paths="$(FACTORY_DIR="$FX_CHAIN" bash "$FX_SCRIPT" paths)"
assert_contains_286 "$fx_chain_paths" "docs/adr/seam.md" "#427 A1: Umbenennungskette – ältester Name ist Altpfad"
assert_contains_286 "$fx_chain_paths" "docs/factory/adr/seam.md" "#427 A1: Umbenennungskette – mittlerer Name ist Altpfad"
assert_contains_286 "$fx_chain_paths" "docs/factory/adr/seam2.md" "#427 A1: Umbenennungskette – aktueller Name steht in der Liste"

for fx_args in "" "paths extra" "run" "verify a b" "unbekannt x"; do
  # shellcheck disable=SC2086 # Argumente sollen hier zerfallen
  bash "$FX_SCRIPT" $fx_args >/dev/null 2>&1
  assert_exit 2 "$?" "#427 Aufruf: falsche Argumente ('$fx_args') → Exit 2"
done

echo ""
echo "#427 factory-extract.sh qualify + Umschreibregel (A4/C3):"

FX_Q="$FX_TMP/qualify"
git init -q -b main "$FX_Q"
cat > "$FX_Q/doku.md" <<'MDEOF'
Siehe #42.
Liste (#431, #432) und Kompositum #36-Gate
bereits nothra/tch-gastro-services#7 und foo/bar#9
Farbe #1e40af, Wort issue#12, Pfad a-#5, Punkt x.#6, Mischform #12abc
Anker seite/#12
Inhalt [0. Setup](#0-einmal-setup) und [1.2](#12-automatik) und [Abschnitt](#12)
Entity &#8212; und Ziffern-Farbe #333333
## Überschrift
MDEOF
cat > "$FX_Q/skript.sh" <<'SHEOF'
#!/usr/bin/env bash
# Kommentar (#319)
  # eingerückt #5
echo "Closes #42"
x=1 # Rest-Kommentar #8 hinter Code
SHEOF
echo 'name: x #77' > "$FX_Q/ci.yml"
echo 'Sonderzeichen #9' > "$FX_Q/we\"ird.md"
echo 'Außen #5' > "$FX_TMP/aussen.md"
ln -s ../aussen.md "$FX_Q/link.md"
fx_git "$FX_Q" add -A
fx_git "$FX_Q" commit -qm init
FACTORY_DIR="$FX_SRC" bash "$FX_SCRIPT" qualify "$FX_Q"
assert_exit 0 "$?" "#427 qualify: läuft durch"
fx_md="$(cat "$FX_Q/doku.md")"
assert_contains_286 "$fx_md" "Siehe nothra/tch-gastro-services#42." "#427 Regel: #42 am Satzende wird qualifiziert"
assert_contains_286 "$fx_md" "(nothra/tch-gastro-services#431, nothra/tch-gastro-services#432)" "#427 Regel: Klammer- und Komma-Liste wird qualifiziert"
assert_contains_286 "$fx_md" "Kompositum nothra/tch-gastro-services#36-Gate" "#427 Regel: Kompositum mit Bindestrich (#36-Gate) wird qualifiziert"
assert_contains_286 "$fx_md" "bereits nothra/tch-gastro-services#7 und foo/bar#9" "#427 Regel: schon qualifizierte Verweise bleiben"
assert_contains_286 "$fx_md" "Farbe #1e40af, Wort issue#12, Pfad a-#5, Punkt x.#6, Mischform #12abc" \
  "#427 Regel: Farbcode, Wortzeichen/-/. davor und Ziffern+Buchstaben bleiben"
assert_contains_286 "$fx_md" "Anker seite/#12" "#427 Regel: / direkt davor (Pfad-Anker) bleibt"
assert_contains_286 "$fx_md" "Inhalt [0. Setup](#0-einmal-setup) und [1.2](#12-automatik) und [Abschnitt](#12)" \
  "#427 Regel: Markdown-Sprunganker ](#…) bleiben"
assert_contains_286 "$fx_md" "Entity &#8212; und Ziffern-Farbe #333333" "#427 Regel: HTML-Entity und sechsstelliger Ziffern-Farbcode bleiben"
assert_contains_286 "$fx_md" "## Überschrift" "#427 Regel: Markdown-Überschrift bleibt"
fx_sh="$(cat "$FX_Q/skript.sh")"
assert_contains_286 "$fx_sh" "#!/usr/bin/env bash" "#427 qualify .sh: Shebang bleibt"
assert_contains_286 "$fx_sh" "# Kommentar (nothra/tch-gastro-services#319)" "#427 qualify .sh: Kommentarzeile wird qualifiziert"
assert_contains_286 "$fx_sh" "  # eingerückt nothra/tch-gastro-services#5" "#427 qualify .sh: eingerückte Kommentarzeile wird qualifiziert"
assert_contains_286 "$fx_sh" 'echo "Closes #42"' "#427 qualify .sh: String-Fixture in Code bleibt"
assert_contains_286 "$fx_sh" "x=1 # Rest-Kommentar #8 hinter Code" "#427 qualify .sh: Code-Zeile mit Rest-Kommentar bleibt ganz"
assert_contains_286 "$(cat "$FX_Q/ci.yml")" "name: x #77" "#427 qualify: andere Dateitypen bleiben unangetastet"
assert_contains_286 "$(cat "$FX_Q/we\"ird.md")" "Sonderzeichen nothra/tch-gastro-services#9" \
  "#427 qualify: Dateiname, den Git quotet (\"), wird trotzdem umgeschrieben"
assert_contains_286 "$(cat "$FX_TMP/aussen.md")" "Außen #5" "#427 qualify: Symlink wird übersprungen, nichts außerhalb des Ziels geändert"
fx_before="$(cat "$FX_Q/doku.md" "$FX_Q/skript.sh")"
FACTORY_DIR="$FX_SRC" bash "$FX_SCRIPT" qualify "$FX_Q" >/dev/null 2>&1
assert_exit 0 "$?" "#427 qualify: zweiter Lauf läuft durch"
assert_true "$([ "$fx_before" = "$(cat "$FX_Q/doku.md" "$FX_Q/skript.sh")" ]; echo $?)" "#427 qualify: zweiter Lauf ändert nichts (idempotent)"
mkdir -p "$FX_TMP/kein-repo"
bash "$FX_SCRIPT" qualify "$FX_TMP/kein-repo" >/dev/null 2>&1
assert_exit 2 "$?" "#427 qualify: Ziel ohne Git-Repo → Exit 2"
bash "$FX_SCRIPT" qualify "$FX_TMP/gibt-es-nicht" >/dev/null 2>&1
assert_exit 2 "$?" "#427 qualify: fehlendes Verzeichnis → Exit 2"
# Kaputter Index: das Repo ist erkennbar, aber `git ls-files` scheitert – das darf nicht als
# „nichts umzuschreiben" (Exit 0) durchgehen.
FX_QBROKEN="$FX_TMP/qualify-kaputt"
git clone -q --no-local "$FX_Q" "$FX_QBROKEN"
printf 'kaputt' > "$FX_QBROKEN/.git/index"
bash "$FX_SCRIPT" qualify "$FX_QBROKEN" >/dev/null 2>&1
assert_exit 2 "$?" "#427 qualify: git ls-files scheitert (kaputter Index) → Exit 2, nicht still 0"

# Die Regeldatei hat genau eine Regel im filter-repo-Format (`regex:…==>…`) – dieselbe Datei
# liest `run` für die Commit-Messages, die Tests oben belegen also auch die Message-Regel.
assert_true "$([ "$(grep -c . "$FX_RULES")" -eq 1 ]; echo $?)" "#427 Regel: factory-extract.rules enthält genau eine Zeile"
grep -q '^regex:.*==>nothra/tch-gastro-services#' "$FX_RULES"
assert_true "$?" "#427 Regel: Zeile im filter-repo-Format regex:…==>nothra/tch-gastro-services#…"

echo ""
echo "#427 factory-extract.sh run (X2, mit filter-repo-Stub):"

FX_STUB_DIR="$FX_TMP/stubs"
mkdir -p "$FX_STUB_DIR"
cat > "$FX_STUB_DIR/git-filter-repo" <<'STUBEOF'
#!/usr/bin/env bash
printf 'pwd=%s\n' "$PWD" > "$FX_STUB_LOG"
printf 'arg=%s\n' "$@" >> "$FX_STUB_LOG"
STUBEOF
chmod +x "$FX_STUB_DIR/git-filter-repo"
FX_STUB_LOG="$FX_TMP/filter-repo.log"
fx_src_head="$(git -C "$FX_SRC" rev-parse HEAD)"
fx_src_refs="$(git -C "$FX_SRC" for-each-ref)"

FX_Z_MISSING="$FX_TMP/ziel-ohne-werkzeug"
FACTORY_DIR="$FX_SRC" FILTER_REPO_CMD="$FX_TMP/gibt-es-nicht" bash "$FX_SCRIPT" run "$FX_Z_MISSING" >/dev/null 2>&1
assert_exit 2 "$?" "#427 run: filter-repo fehlt → Exit 2 (fail-closed)"
assert_true "$([ ! -e "$FX_Z_MISSING" ]; echo $?)" "#427 run: filter-repo fehlt → kein Ziel angelegt"

FX_Z="$FX_TMP/ziel"
FACTORY_DIR="$FX_SRC" FILTER_REPO_CMD="$FX_STUB_DIR/git-filter-repo" FX_STUB_LOG="$FX_STUB_LOG" \
  bash "$FX_SCRIPT" run "$FX_Z" >/dev/null 2>&1
assert_exit 0 "$?" "#427 run: läuft mit Stub durch"
fx_log="$(cat "$FX_STUB_LOG" 2>/dev/null)"
fx_z_real="$(cd "$FX_Z" 2>/dev/null && pwd -P)"
assert_contains_286 "$fx_log" "pwd=$fx_z_real" "#427 X2: filter-repo läuft im frischen Klon, nicht im Arbeitsklon"
assert_contains_286 "$fx_log" "arg=--paths-from-file" "#427 run: filter-repo bekommt eine Pfadliste"
assert_contains_286 "$fx_log" "arg=$fx_z_real/.git/factory-extract/paths" "#427 run: die Pfadliste ist die Metadaten-Datei des Klons"
assert_contains_286 "$fx_log" "arg=--replace-message" "#427 run: filter-repo bekommt die Message-Regeln"
assert_contains_286 "$fx_log" "arg=$fx_z_real/.git/factory-extract/message-rules" "#427 run: Message-Regeln liegen in den Metadaten des Klons"
assert_true "$([ "$(cat "$FX_Z/.git/factory-extract/message-rules" 2>/dev/null)" = "$(cat "$FX_RULES" "$FX_TRAILERS")" ]; echo $?)" \
  "#427 run: Message-Regeln = Umschreibregel + Trailer-Regel (genau diese beiden Dateien)"

# Trailer-Regel (Entscheidung 2026-10-23): Co-authored-by-Zeilen mit persönlicher Adresse fallen
# beim Herauslösen weg, noreply-Trailer bleiben. Angewendet wie filter-repo: re.sub je Regel auf die
# ganze Message (Bytes).
fx_apply_message_rules() {
  python3 -I -c '
import re, sys
rules = [l[len(b"regex:"):].rsplit(b"==>", 1) for l in open(sys.argv[1], "rb").read().splitlines() if l]
msg = sys.stdin.buffer.read()
for pattern, replacement in rules:
    msg = re.compile(pattern).sub(replacement, msg)
sys.stdout.buffer.write(msg)' "$1"
}
fx_msg_in="$(printf 'feat: x (#12)\n\nCo-authored-by: D0001 <person@firma.de>\nCo-Authored-By: Jemand <jemand@privat.de>\nCo-authored-by: Vercel <1+vercel@users.noreply.github.com>\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n')"
fx_msg_out="$(printf '%s\n' "$fx_msg_in" | fx_apply_message_rules "$FX_Z/.git/factory-extract/message-rules")"
assert_absent "$fx_msg_out" "person@firma.de" "#427 Trailer: Co-authored-by mit persönlicher Adresse fällt weg"
assert_absent "$fx_msg_out" "jemand@privat.de" "#427 Trailer: auch in anderer Schreibweise (Co-Authored-By)"
assert_contains_286 "$fx_msg_out" "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" "#427 Trailer: noreply-Trailer bleibt"
assert_contains_286 "$fx_msg_out" "Co-authored-by: Vercel <1+vercel@users.noreply.github.com>" "#427 Trailer: GitHub-noreply-Trailer bleibt"
assert_contains_286 "$fx_msg_out" "feat: x (nothra/tch-gastro-services#12)" "#427 Trailer: die #<nr>-Regel wirkt in derselben Message weiter"

# Ein Ziel, das mit `-` beginnt, ist ein Pfad, keine git-Option.
(cd "$FX_TMP" && FACTORY_DIR="$FX_SRC" FILTER_REPO_CMD="$FX_STUB_DIR/git-filter-repo" FX_STUB_LOG="$FX_STUB_LOG" \
  bash "$FX_SCRIPT" run -strich >/dev/null 2>&1)
assert_exit 0 "$?" "#427 run: Ziel mit führendem - wird als Pfad geklont"
assert_true "$([ -d "$FX_TMP/-strich/.git" ]; echo $?)" "#427 run: Ziel -strich ist ein Repo"
assert_true "$([ "$(cat "$FX_Z/.git/factory-extract/paths" 2>/dev/null)" = "$fx_paths_1" ]; echo $?)" \
  "#427 run: die Metadaten-Pfadliste ist die paths-Ausgabe des geklonten Stands"
assert_true "$([ "$(cat "$FX_Z/.git/factory-extract/source-commit" 2>/dev/null)" = "$fx_src_head" ]; echo $?)" \
  "#427 run: Ziel-Commit von TCH ist festgehalten"
assert_true "$([ "$(git -C "$FX_SRC" rev-parse HEAD)" = "$fx_src_head" ] && [ "$(git -C "$FX_SRC" for-each-ref)" = "$fx_src_refs" ] && [ -z "$(git -C "$FX_SRC" status --porcelain)" ]; echo $?)" \
  "#427 X2: Arbeitsklon (HEAD, Refs, Arbeitsbaum) bleibt unberührt"
FACTORY_DIR="$FX_SRC" FILTER_REPO_CMD="$FX_STUB_DIR/git-filter-repo" FX_STUB_LOG="$FX_STUB_LOG" \
  bash "$FX_SCRIPT" run "$FX_Z" >/dev/null 2>&1
assert_exit 2 "$?" "#427 run: vorhandenes Ziel wird nicht überschrieben (Exit 2)"

# Lokales main hinter origin/main → nicht der gemergte Stand → Abbruch.
FX_BEHIND="$FX_TMP/behind"
git clone -q "$FX_SRC" "$FX_BEHIND"
fx_git "$FX_SRC" commit -q --allow-empty -m "chore: neuer Stand"
git -C "$FX_BEHIND" fetch -q origin
FACTORY_DIR="$FX_BEHIND" FILTER_REPO_CMD="$FX_STUB_DIR/git-filter-repo" FX_STUB_LOG="$FX_STUB_LOG" \
  bash "$FX_SCRIPT" run "$FX_TMP/ziel-behind" >/dev/null 2>&1
assert_exit 2 "$?" "#427 run: lokales main ≠ origin/main → Exit 2"

# Ohne lokalen Branch main gibt es keinen gemergten Stand.
FX_NOMAIN="$FX_TMP/ohne-main"
git init -q -b trunk "$FX_NOMAIN" && fx_git "$FX_NOMAIN" commit -q --allow-empty -m init
FACTORY_DIR="$FX_NOMAIN" FILTER_REPO_CMD="$FX_STUB_DIR/git-filter-repo" FX_STUB_LOG="$FX_STUB_LOG" \
  bash "$FX_SCRIPT" run "$FX_TMP/ziel-ohne-main" >/dev/null 2>&1
assert_exit 2 "$?" "#427 run: kein lokaler Branch main → Exit 2"

# filter-repo scheitert → Exit 2 und Hinweis auf das halbe Ziel.
printf '#!/usr/bin/env bash\nexit 1\n' > "$FX_STUB_DIR/filter-repo-kaputt"
chmod +x "$FX_STUB_DIR/filter-repo-kaputt"
fx_out="$(FACTORY_DIR="$FX_SRC" FILTER_REPO_CMD="$FX_STUB_DIR/filter-repo-kaputt" \
  bash "$FX_SCRIPT" run "$FX_TMP/ziel-kaputt" 2>&1)"
assert_exit 2 "$?" "#427 run: filter-repo scheitert → Exit 2"
assert_contains_286 "$fx_out" "halbes Ziel" "#427 run: Abbruchmeldung weist auf das halbe Ziel hin"

echo ""
echo "#427 factory-extract.sh verify (A2–A5):"

# fx_verify_pair <quelle> <ziel> – Quelle im Zustand „extracted", Ziel ein Klon davon mit den
# Metadaten, die `run` schreibt, und einer identischen commit-map, wie filter-repo sie hinterlässt.
fx_verify_pair() {
  fx_source "$1" extracted
  git clone -q --no-local "$1" "$2"
  mkdir -p "$2/.git/factory-extract" "$2/.git/filter-repo"
  git -C "$1" rev-parse HEAD > "$2/.git/factory-extract/source-commit"
  printf '%s\n' "$FX_FILES" > "$2/.git/factory-extract/files"
  printf '%s\n' "$FX_PATHS" > "$2/.git/factory-extract/paths"
  { echo "old new"; git -C "$1" rev-list --all | awk '{print $1 " " $1}'; } > "$2/.git/filter-repo/commit-map"
}
# fx_verify <quelle> <ziel> – Ausgabe von verify (stdout+stderr); Exit-Code in FX_RC.
fx_verify() { FX_OUT="$(FACTORY_DIR="$1" bash "$FX_SCRIPT" verify "$2" 2>&1)"; FX_RC=$?; }
# fx_assert_ok <label-präfix> <ak…> – jede genannte Prüfung meldet „ok".
fx_assert_ok() {
  local prefix="$1" check
  shift
  for check in "$@"; do
    assert_contains_286 "$FX_OUT" "$check ok" "#427 $prefix: $check bleibt grün"
  done
}
# fx_assert_only <geprüfte-ak> <übrige-ak…> – Negativtest isoliert: jede übrige Prüfung meldet „ok".
fx_assert_only() { local failing="$1"; shift; fx_assert_ok "$failing-Negativtest isoliert" "$@"; }

fx_verify_pair "$FX_TMP/v-src" "$FX_TMP/v-ziel"
fx_verify "$FX_TMP/v-src" "$FX_TMP/v-ziel"
assert_exit 0 "$FX_RC" "#427 verify: sauberes Ziel → Exit 0"
fx_assert_ok "verify sauberes Ziel" A2 A3 A4 A5

# A2: ein Pfad außerhalb der Liste, der in keinem verbotenen Bereich liegt – trifft nur die Teilmengen-Prüfung.
fx_verify_pair "$FX_TMP/a2-src" "$FX_TMP/a2-ziel"
echo x > "$FX_TMP/a2-ziel/docs/factory/fremd.md"
fx_git "$FX_TMP/a2-ziel" add -A && fx_git "$FX_TMP/a2-ziel" commit -qm "docs: fremd (nothra/tch-gastro-services#3)"
fx_verify "$FX_TMP/a2-src" "$FX_TMP/a2-ziel"
assert_exit 1 "$FX_RC" "#427 A2: Pfad außerhalb der Liste → Exit 1"
assert_contains_286 "$FX_OUT" "A2: docs/factory/fremd.md" "#427 A2: der fremde Pfad wird genannt"
fx_assert_only A2 A3 A4 A5

# A2/FS2: ein verbotener Bereich schlägt an, auch wenn der Pfad in der Liste steht.
fx_verify_pair "$FX_TMP/a2b-src" "$FX_TMP/a2b-ziel"
mkdir -p "$FX_TMP/a2b-ziel/tasks" && echo x > "$FX_TMP/a2b-ziel/tasks/t.md"
echo "tasks/t.md" >> "$FX_TMP/a2b-ziel/.git/factory-extract/paths"
fx_git "$FX_TMP/a2b-ziel" add -A && fx_git "$FX_TMP/a2b-ziel" commit -qm "docs: task (nothra/tch-gastro-services#3)"
fx_verify "$FX_TMP/a2b-src" "$FX_TMP/a2b-ziel"
assert_exit 1 "$FX_RC" "#427 A2/FS2: verbotener Bereich (tasks/) schlägt an, auch wenn er in der Liste steht"
assert_contains_286 "$FX_OUT" "A2: tasks/t.md" "#427 A2/FS2: der Pfad im verbotenen Bereich wird genannt"
fx_assert_only A2/FS2 A3 A4 A5

fx_verify_pair "$FX_TMP/a4-src" "$FX_TMP/a4-ziel"
fx_git "$FX_TMP/a4-ziel" commit -q --allow-empty -m "fix: etwas (#12)"
fx_verify "$FX_TMP/a4-src" "$FX_TMP/a4-ziel"
assert_exit 1 "$FX_RC" "#427 A4: unqualifiziertes #<nr> in einer Message → Exit 1"
assert_contains_286 "$FX_OUT" "A4: fix: etwas (#12)" "#427 A4: die betroffene Message-Zeile wird genannt"
fx_assert_only A4 A2 A3 A5

fx_verify_pair "$FX_TMP/a5-src" "$FX_TMP/a5-ziel"
fx_git "$FX_TMP/a5-ziel" commit -q --allow-empty --author="Jemand Anders <x@example.com>" \
  -m "docs: fremd (nothra/tch-gastro-services#4)"
fx_a5_old="$(git -C "$FX_TMP/a5-src" rev-parse HEAD)"
fx_a5_new="$(git -C "$FX_TMP/a5-ziel" rev-parse HEAD)"
{ echo "old new"; echo "$fx_a5_old $fx_a5_new"; } > "$FX_TMP/a5-ziel/.git/filter-repo/commit-map"
fx_verify "$FX_TMP/a5-src" "$FX_TMP/a5-ziel"
assert_exit 1 "$FX_RC" "#427 A5: abweichender Autor → Exit 1"
assert_contains_286 "$FX_OUT" "A5: $fx_a5_old" "#427 A5: der betroffene Commit wird genannt"
fx_assert_only A5 A2 A3 A4

# A3: die Quelle hat einen Stand weiter umbenannt, das Ziel kennt den neuen Namen nicht.
fx_verify_pair "$FX_TMP/a3-src" "$FX_TMP/a3-ziel"
fx_git "$FX_TMP/a3-src" mv docs/factory/adr/seam.md docs/factory/adr/neu.md
fx_git "$FX_TMP/a3-src" commit -qm "docs: umbenennen (nothra/tch-gastro-services#5)"
git -C "$FX_TMP/a3-src" rev-parse HEAD > "$FX_TMP/a3-ziel/.git/factory-extract/source-commit"
printf '%s\n' "$FX_FILES" | sed 's#adr/seam\.md#adr/neu.md#' > "$FX_TMP/a3-ziel/.git/factory-extract/files"
printf '%s\n' docs/factory/adr/neu.md >> "$FX_TMP/a3-ziel/.git/factory-extract/paths"
fx_verify "$FX_TMP/a3-src" "$FX_TMP/a3-ziel"
assert_exit 1 "$FX_RC" "#427 A3/FS3: Factory-Datei fehlt im Ziel → Exit 1"
assert_contains_286 "$FX_OUT" "A3: docs/factory/adr/neu.md" "#427 A3/FS3: die Datei wird genannt"
fx_assert_only A3 A2 A4 A5

# A3: die Datei ist im Ziel da, aber ohne ihren Altpfad – ein Ziel mit einem einzigen Commit, der
# Autor und Datum des letzten TCH-Commits trägt (A5 grün), der erste TCH-Commit gilt als entfernt.
fx_verify_pair "$FX_TMP/a3b-src" "$FX_TMP/a3b-ziel"
fx_a3b_head="$(git -C "$FX_TMP/a3b-src" rev-parse HEAD)"
fx_a3b_root="$(git -C "$FX_TMP/a3b-src" rev-list --max-parents=0 HEAD)"
fx_a3b_date="$(git -C "$FX_TMP/a3b-src" show -s --format=%aI HEAD)"
fx_a3b_cdate="$(git -C "$FX_TMP/a3b-src" show -s --format=%cI HEAD)"
fx_a3b_meta="$FX_TMP/a3b-meta"
mv "$FX_TMP/a3b-ziel/.git/factory-extract" "$fx_a3b_meta"
rm -rf "$FX_TMP/a3b-ziel/.git"
git init -q -b main "$FX_TMP/a3b-ziel"
fx_git "$FX_TMP/a3b-ziel" add -A
GIT_AUTHOR_DATE="$fx_a3b_date" GIT_COMMITTER_DATE="$fx_a3b_cdate" \
  fx_git "$FX_TMP/a3b-ziel" commit -qm "docs: alles auf einmal (nothra/tch-gastro-services#2)"
mv "$fx_a3b_meta" "$FX_TMP/a3b-ziel/.git/factory-extract"
mkdir -p "$FX_TMP/a3b-ziel/.git/filter-repo"
printf 'old new\n%s %s\n%s %s\n' "$fx_a3b_root" "$NULL_COMMIT_427" "$fx_a3b_head" "$(git -C "$FX_TMP/a3b-ziel" rev-parse HEAD)" \
  > "$FX_TMP/a3b-ziel/.git/filter-repo/commit-map"
fx_verify "$FX_TMP/a3b-src" "$FX_TMP/a3b-ziel"
assert_exit 1 "$FX_RC" "#427 A3/FS3: --follow reißt im Ziel am Altpfad ab → Exit 1"
assert_contains_286 "$FX_OUT" "A3: docs/factory/adr/seam.md – --follow weicht ab" "#427 A3/FS3: die abreißende Datei wird genannt"
fx_assert_only A3/FS3 A2 A4 A5

fx_verify_pair "$FX_TMP/nomap-src" "$FX_TMP/nomap-ziel"
rm -f "$FX_TMP/nomap-ziel/.git/filter-repo/commit-map"
fx_verify "$FX_TMP/nomap-src" "$FX_TMP/nomap-ziel"
assert_exit 2 "$FX_RC" "#427 verify: commit-map fehlt → Exit 2 (fail-closed)"
rm -rf "$FX_TMP/nomap-ziel/.git/factory-extract"
fx_verify "$FX_TMP/nomap-src" "$FX_TMP/nomap-ziel"
assert_exit 2 "$FX_RC" "#427 verify: Metadaten von run fehlen → Exit 2 (fail-closed)"

# commit-map, in der jeder Commit als entfernt gilt: A5 hätte nichts verglichen.
fx_verify_pair "$FX_TMP/nullmap-src" "$FX_TMP/nullmap-ziel"
{ echo "old new"; git -C "$FX_TMP/nullmap-src" rev-list --all | awk -v z="$NULL_COMMIT_427" '{print $1 " " z}'; } \
  > "$FX_TMP/nullmap-ziel/.git/filter-repo/commit-map"
fx_verify "$FX_TMP/nullmap-src" "$FX_TMP/nullmap-ziel"
assert_exit 2 "$FX_RC" "#427 A5: commit-map ohne verbleibende Commits → Exit 2 (fail-closed)"

# commit-map nennt einen Ziel-Commit, den es nicht gibt.
fx_verify_pair "$FX_TMP/ghost-src" "$FX_TMP/ghost-ziel"
{ echo "old new"; echo "$(git -C "$FX_TMP/ghost-src" rev-parse HEAD) 1111111111111111111111111111111111111111"; } \
  > "$FX_TMP/ghost-ziel/.git/filter-repo/commit-map"
fx_verify "$FX_TMP/ghost-src" "$FX_TMP/ghost-ziel"
assert_exit 2 "$FX_RC" "#427 A5: Commit aus der commit-map fehlt im Ziel → Exit 2"

# Der festgehaltene TCH-Commit ist im Arbeitsklon nicht vorhanden (nicht gefetcht).
fx_verify_pair "$FX_TMP/nosrc-src" "$FX_TMP/nosrc-ziel"
echo 2222222222222222222222222222222222222222 > "$FX_TMP/nosrc-ziel/.git/factory-extract/source-commit"
fx_verify "$FX_TMP/nosrc-src" "$FX_TMP/nosrc-ziel"
assert_exit 2 "$FX_RC" "#427 verify: TCH-Commit fehlt im Arbeitsklon → Exit 2"
assert_contains_286 "$FX_OUT" "git fetch" "#427 verify: Abbruchmeldung nennt git fetch"

echo ""
echo "#427 factory-extract.sh scan (B1/B2/B3, mit gitleaks-Stub):"

# gitleaks-Stub: protokolliert je Aufruf Unterbefehl, Argumente, ob GITLEAKS_CONFIG ankommt und – im
# git-Modus – ob das gescannte Repo einen Arbeitsbaum hat. Exit-Codes aus FX_LEAKS_RC (git) bzw.
# FX_LEAKS_STDIN_RC (stdin); was stdin bekommt, landet in FX_LEAKS_STDIN.
cat > "$FX_STUB_DIR/gitleaks" <<'STUBEOF'
#!/usr/bin/env bash
[ "$1" = version ] && { [ -n "${FX_LEAKS_NO_VERSION:-}" ] || echo "8.99.0-stub"; exit 0; }
for a in "$@"; do last="$a"; done
{
  printf 'call=%s\n' "$1"
  printf 'arg=%s\n' "$@"
  printf 'env-config=%s\n' "${GITLEAKS_CONFIG-unset}"
  if [ -z "$(ls -A)" ]; then echo "cwd-leer=ja"; else echo "cwd-leer=nein"; fi
  if [ "$1" = git ]; then
    printf 'bare=%s\n' "$(git -C "$last" rev-parse --is-bare-repository 2>/dev/null)"
    printf 'commits=%s\n' "$(git -C "$last" rev-list --all --count 2>/dev/null)"
  fi
} >> "$FX_LEAKS_LOG"
if [ "$1" = stdin ]; then cat > "$FX_LEAKS_STDIN"; exit "${FX_LEAKS_STDIN_RC:-0}"; fi
echo "stub-scan $*"
exit "${FX_LEAKS_RC:-0}"
STUBEOF
chmod +x "$FX_STUB_DIR/gitleaks"
FX_LEAKS_LOG="$FX_TMP/gitleaks.log"
FX_LEAKS_STDIN="$FX_TMP/gitleaks.stdin"
# fx_scan <quelle> <ziel> [leaks-rc] – Bericht (stdout+stderr) in FX_OUT, Exit-Code in FX_RC; das
# Stub-Protokoll dieses Laufs in FX_LEAKS_LOG. Weitere Umgebung als Präfix vor dem Aufruf:
# `FACTORY_EXTRACT_ALLOW=… fx_scan …`; ein anderes gitleaks über FX_GITLEAKS_CMD.
fx_scan() {
  rm -f "$FX_LEAKS_LOG" "$FX_LEAKS_STDIN"
  FX_OUT="$(FACTORY_DIR="$1" GITLEAKS_CMD="${FX_GITLEAKS_CMD:-$FX_STUB_DIR/gitleaks}" FX_LEAKS_RC="${3:-0}" \
    FX_LEAKS_LOG="$FX_LEAKS_LOG" FX_LEAKS_STDIN="$FX_LEAKS_STDIN" bash "$FX_SCRIPT" scan "$2" 2>&1)"
  FX_RC=$?
}
# fx_report_rows <prüfung> – die Berichtszeilen „| <prüfung> |" aus FX_OUT.
fx_report_rows() { printf '%s\n' "$FX_OUT" | grep -F -- "| $1 |" || true; }
FX_FP_A="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:datei:regel:1"
FX_FP_B="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb:datei:regel:2"
FX_FP_C="cccccccccccccccccccccccccccccccccccccccc:datei:regel:3"

fx_verify_pair "$FX_TMP/s-src" "$FX_TMP/s-ziel"
fx_allowed_427="noreply@anthropic.com demo@example.com t@t.com"
echo "Kontakt: ${fx_allowed_427// /, }" > "$FX_TMP/s-ziel/docs/factory/kontakt.md"
fx_git "$FX_TMP/s-ziel" add -A && fx_git "$FX_TMP/s-ziel" commit -qm "docs: kontakt (nothra/tch-gastro-services#6)"
printf '%s\n' docs/factory/kontakt.md >> "$FX_TMP/s-ziel/.git/factory-extract/paths"
GITLEAKS_CONFIG="$FX_TMP/fremde.toml" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 0 "$FX_RC" "#427 scan: kein Fund, nur erlaubte Adressen → Exit 0"
assert_contains_286 "$FX_OUT" "8.99.0-stub" "#427 B3: Bericht nennt die gitleaks-Version"
assert_contains_286 "$FX_OUT" "$(git -C "$FX_TMP/s-src" rev-parse HEAD)" "#427 B3: Bericht nennt den Ziel-Commit von TCH"
# 3 = die zwei Commits aus fx_verify_pair + der Kontakt-Commit.
assert_contains_286 "$FX_OUT" "| Commits | 3 |" "#427 B3: Bericht nennt die Anzahl Commits"
for fx_row in A2 B1 "B1 Messages" "B1 Inline-Ausnahmen" B2 "B2 Messages"; do
  assert_true "$([ -n "$(fx_report_rows "$fx_row")" ]; echo $?)" "#427 B3: Bericht hat eine Zeile $fx_row"
done
assert_contains_286 "$(fx_report_rows "B1 Inline-Ausnahmen")" "| ✓ |" "#427 B1: ohne Inline-Ausnahme ist die Zeile ✓"
fx_leaks_log="$(cat "$FX_LEAKS_LOG" 2>/dev/null)"
assert_contains_286 "$fx_leaks_log" "arg=--log-opts=--all" "#427 B1: gitleaks läuft über alle Commits"
assert_contains_286 "$fx_leaks_log" "arg=--gitleaks-ignore-path" "#427 B1: gitleaks bekommt die Falsch-Positiv-Liste"
assert_contains_286 "$fx_leaks_log" "arg=$SCRIPTS_DIR/project/factory-extract.gitleaksignore" \
  "#427 B1: Falsch-Positiv-Liste ist factory-extract.gitleaksignore"
# W1 (Security-Review): Konfiguration des gescannten Repos oder der Umgebung darf B1 nicht abschalten.
assert_contains_286 "$fx_leaks_log" "bare=true" "#427 B1: gitleaks scannt einen Klon ohne Arbeitsbaum (keine .gitleaks*-Dateien des Ziels)"
assert_absent "$fx_leaks_log" "arg=$FX_TMP/s-ziel" "#427 B1: gitleaks scannt nicht das Ziel selbst"
assert_contains_286 "$fx_leaks_log" "arg=$SCRIPTS_DIR/project/factory-extract.gitleaks.toml" "#427 B1: gitleaks läuft mit der gepinnten Konfiguration"
assert_absent "$fx_leaks_log" "env-config=$FX_TMP/fremde.toml" "#427 B1: GITLEAKS_CONFIG der Umgebung kommt bei gitleaks nicht an"
# W2 (Security-Review): Commit- und Tag-Messages gehen durch den Secret-Scan.
assert_contains_286 "$fx_leaks_log" "call=stdin" "#427 B1 Messages: gitleaks prüft die Messages über stdin"
assert_contains_286 "$(cat "$FX_LEAKS_STDIN" 2>/dev/null)" "docs: kontakt (nothra/tch-gastro-services#6)" \
  "#427 B1 Messages: gitleaks bekommt die Commit-Messages"
# W3 (Security-Review): die geltende Erlaubt-Liste steht im Bericht.
assert_contains_286 "$FX_OUT" "Erlaubt-Liste (B2, aus $SCRIPTS_DIR/project/factory-extract.allow)" "#427 B2/B3: Bericht nennt die Erlaubt-Liste mit Pfad"
assert_contains_286 "$FX_OUT" '- `t@t.com`' "#427 B2/B3: Bericht listet die Muster der Erlaubt-Liste"
assert_contains_286 "$FX_OUT" "Restrisiko" "#427 B2/B3: Bericht nennt das Restrisiko des E-Mail-Musters"
assert_absent "$FX_OUT" "FACTORY_EXTRACT_ALLOW" "#427 B3: ohne Override nennt der Bericht keine überschriebene Liste"
# N1 (Security-Re-Review): gitleaks liest eine .gitleaksignore aus dem Arbeitsverzeichnis – beide
# Aufrufe laufen deshalb in einem leeren Verzeichnis, egal von wo `scan` gestartet wird.
(cd "$FX_TMP/s-ziel" && FACTORY_DIR="$FX_TMP/s-src" GITLEAKS_CMD="$FX_STUB_DIR/gitleaks" FX_LEAKS_LOG="$FX_LEAKS_LOG" \
  FX_LEAKS_STDIN="$FX_LEAKS_STDIN" bash "$FX_SCRIPT" scan . >/dev/null 2>&1)
fx_leaks_log="$(cat "$FX_LEAKS_LOG" 2>/dev/null)"
assert_contains_286 "$fx_leaks_log" "cwd-leer=ja" "#427 B1: gitleaks läuft in einem leeren Arbeitsverzeichnis"
assert_absent "$fx_leaks_log" "cwd-leer=nein" "#427 B1/B1 Messages: kein gitleaks-Aufruf im Ziel oder Aufruferverzeichnis"
# N5: überschriebene Werkzeuge stehen im Bericht; ein gitleaks ohne Versionsangabe gilt nicht als gitleaks.
assert_contains_286 "$FX_OUT" "per GITLEAKS_CMD überschrieben" "#427 B3: Bericht nennt das per Umgebung ersetzte gitleaks"
FX_LEAKS_NO_VERSION=1 fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 2 "$FX_RC" "#427 B1: gitleaks ohne Versionsangabe → Exit 2 (fail-closed)"

# N2 (Security-Re-Review): auch Commits, die nur über andere Refs (remotes, notes) erreichbar sind,
# gehen durch gitleaks – der Scan-Klon übernimmt alle Refs.
fx_verify_pair "$FX_TMP/r-src" "$FX_TMP/r-ziel"
fx_git "$FX_TMP/r-ziel" commit -q --allow-empty -m "docs: nebenref (nothra/tch-gastro-services#10)"
git -C "$FX_TMP/r-ziel" update-ref refs/remotes/x/leak HEAD
git -C "$FX_TMP/r-ziel" reset -q --hard HEAD~1
fx_scan "$FX_TMP/r-src" "$FX_TMP/r-ziel"
assert_contains_286 "$(cat "$FX_LEAKS_LOG" 2>/dev/null)" "commits=$(git -C "$FX_TMP/r-ziel" rev-list --all --count)" \
  "#427 B1: gitleaks sieht so viele Commits wie das Ziel über alle Refs"

# N3 (Security-Re-Review): ein Inline-`gitleaks:allow` unterdrückt Funde ohne Begründung – jedes
# Vorkommen in Blobs oder Messages macht den Scan rot. (Marker zur Laufzeit zusammengesetzt, damit
# diese Testdatei ihn nicht selbst enthält.)
fx_inline_marker="gitleaks"":allow"
fx_verify_pair "$FX_TMP/i-src" "$FX_TMP/i-ziel"
echo "x = 1 # $fx_inline_marker" > "$FX_TMP/i-ziel/docs/factory/inline.md"
fx_git "$FX_TMP/i-ziel" add -A && fx_git "$FX_TMP/i-ziel" commit -qm "docs: inline (nothra/tch-gastro-services#11)"
printf '%s\n' docs/factory/inline.md >> "$FX_TMP/i-ziel/.git/factory-extract/paths"
fx_scan "$FX_TMP/i-src" "$FX_TMP/i-ziel"
assert_exit 1 "$FX_RC" "#427 B1: Inline-Ausnahme in einer Datei → Exit 1"
assert_contains_286 "$(fx_report_rows "B1 Inline-Ausnahmen")" "docs/factory/inline.md" "#427 B1: Bericht nennt die Datei mit der Inline-Ausnahme"
fx_verify_pair "$FX_TMP/im-src" "$FX_TMP/im-ziel"
fx_git "$FX_TMP/im-ziel" commit -q --allow-empty -m "docs: x (nothra/tch-gastro-services#12) $fx_inline_marker"
fx_scan "$FX_TMP/im-src" "$FX_TMP/im-ziel"
assert_exit 1 "$FX_RC" "#427 B1: Inline-Ausnahme in einer Commit-Message → Exit 1"
assert_contains_286 "$(fx_report_rows "B1 Inline-Ausnahmen")" "Commit-/Tag-Message" "#427 B1: Bericht nennt die Message als Fundort"

# Jeder ausgenommene Falsch-Positiv steht einzeln mit seiner Begründung im Bericht (Spec B1); der
# Kopfkommentar der Datei gehört zu keinem Eintrag (Leerzeile trennt).
printf '# Kopf der Datei\n\n# Grund A,\n# zweite Zeile\n%s\n\n# Grund B\n%s\n' "$FX_FP_A" "$FX_FP_B" > "$FX_TMP/ignore"
FACTORY_EXTRACT_GITLEAKSIGNORE="$FX_TMP/ignore" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 0 "$FX_RC" "#427 B1: begründete Falsch-Positive → Exit 0"
assert_contains_286 "$FX_OUT" "2 Falsch-Positive ausgenommen" "#427 B1/B3: Bericht nennt die Zahl der ausgenommenen Falsch-Positive"
assert_contains_286 "$FX_OUT" "- \`$FX_FP_A\` – Grund A, zweite Zeile" "#427 B1/B3: erster Falsch-Positiv mit mehrzeiliger Begründung"
assert_contains_286 "$FX_OUT" "- \`$FX_FP_B\` – Grund B" "#427 B1/B3: zweiter Falsch-Positiv mit Begründung"
assert_absent "$FX_OUT" "Kopf der Datei" "#427 B1/B3: der Dateikopf ist keine Begründung"
assert_contains_286 "$FX_OUT" "FACTORY_EXTRACT_GITLEAKSIGNORE" "#427 B3: Bericht nennt die per Umgebung überschriebene Falsch-Positiv-Liste"
# Eingerückte Kommentare und reine `#`-Zeilen gehören zur Begründung, eine Zeile nur aus Leerzeichen
# trennt wie eine Leerzeile.
printf '# Kopf\n  \n  # Grund C\n#\n# weiter\n%s\n' "$FX_FP_C" > "$FX_TMP/ignore-format"
FACTORY_EXTRACT_GITLEAKSIGNORE="$FX_TMP/ignore-format" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 0 "$FX_RC" "#427 B1: eingerückte Begründung und Leerzeichen-Zeile werden gelesen → Exit 0"
assert_contains_286 "$FX_OUT" "- \`$FX_FP_C\` – Grund C weiter" \
  "#427 B1/B3: Begründung ohne Kopf, ohne doppelte Leerzeichen aus reinen #-Zeilen"
# Ohne Falsch-Positive verspricht der Bericht keine Liste.
printf '# nur ein Kopf\n' > "$FX_TMP/ignore-leer"
FACTORY_EXTRACT_GITLEAKSIGNORE="$FX_TMP/ignore-leer" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_contains_286 "$FX_OUT" "kein Fund (0 Falsch-Positive ausgenommen)" "#427 B3: ohne Falsch-Positive steht die Zahl 0 im Bericht"
assert_absent "$FX_OUT" "Liste unten" "#427 B3: ohne Falsch-Positive verweist der Bericht auf keine Liste"
printf '# Kopf\n\n%s\n' "$FX_FP_A" > "$FX_TMP/ignore-ohne-grund"
FACTORY_EXTRACT_GITLEAKSIGNORE="$FX_TMP/ignore-ohne-grund" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 2 "$FX_RC" "#427 B1: Falsch-Positiv ohne Begründung → Exit 2 (fail-closed)"
# Ein Fingerprint ohne Commit gilt bei gitleaks für alle Commits – nicht zulässig.
printf '# Grund\ndatei:regel:1\n' > "$FX_TMP/ignore-global"
FACTORY_EXTRACT_GITLEAKSIGNORE="$FX_TMP/ignore-global" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 2 "$FX_RC" "#427 B1: Fingerprint ohne Commit (gilt global) → Exit 2"
FACTORY_EXTRACT_GITLEAKSIGNORE="$FX_TMP/gibt-es-nicht" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 2 "$FX_RC" "#427 B1: Falsch-Positiv-Liste nicht lesbar → Exit 2 (fail-closed)"

fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel" 1
assert_exit 1 "$FX_RC" "#427 B1: gitleaks meldet Fund → Exit 1"
assert_contains_286 "$FX_OUT" "| B1 | ✗" "#427 B1: Fund steht als ✗ im Bericht"

fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel" 3
assert_exit 1 "$FX_RC" "#427 B1: gitleaks-Fehler (Exit 3) gilt nicht als sauber → Exit 1"

FX_LEAKS_STDIN_RC=1 fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 1 "$FX_RC" "#427 B1 Messages: Secret in einer Message → Exit 1"
assert_contains_286 "$(fx_report_rows "B1 Messages")" "✗" "#427 B1 Messages: Fund steht als ✗ im Bericht"
assert_contains_286 "$(fx_report_rows B1)" "✓" "#427 B1 Messages: B1 der Historie bleibt ✓ (getrennte Zeilen)"

FX_GITLEAKS_CMD="$FX_TMP/gibt-es-nicht" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 2 "$FX_RC" "#427 B1: gitleaks fehlt → Exit 2 (fail-closed)"

# Ein Leerzeichen am Ende eines Musters der Erlaubt-Liste macht es nicht wirkungslos.
printf 't@t.com \nnoreply@anthropic.com\n*@example.com\n' > "$FX_TMP/allow-leerzeichen"
FACTORY_EXTRACT_ALLOW="$FX_TMP/allow-leerzeichen" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 0 "$FX_RC" "#427 B2: Muster mit Leerzeichen am Zeilenende greift trotzdem → Exit 0"
assert_contains_286 "$FX_OUT" "FACTORY_EXTRACT_ALLOW" "#427 B3: Bericht nennt die per Umgebung überschriebene Erlaubt-Liste"
# Muster ohne festen Domain-Teil würden jede Adresse erlauben.
for fx_pattern in '*' '*@*' '*@example.*' '*@*.de' '*@*.dm.de'; do
  printf '%s\n' "$fx_pattern" > "$FX_TMP/allow-breit"
  FACTORY_EXTRACT_ALLOW="$FX_TMP/allow-breit" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
  assert_exit 2 "$FX_RC" "#427 B2: Muster '$fx_pattern' ohne festen Domain-Teil → Exit 2"
done

# Adressen in Commit- und Tag-Messages (z. B. Co-authored-by) prüft B2 Messages.
fx_verify_pair "$FX_TMP/m-src" "$FX_TMP/m-ziel"
fx_git "$FX_TMP/m-ziel" commit -q --allow-empty \
  -m "docs: x (nothra/tch-gastro-services#9)" -m "Co-authored-by: Echte Person <echte.person@firma.de>"
fx_scan "$FX_TMP/m-src" "$FX_TMP/m-ziel"
assert_exit 1 "$FX_RC" "#427 B2 Messages: persönliche Adresse in einer Commit-Message → Exit 1"
assert_contains_286 "$(fx_report_rows "B2 Messages")" "echte.person@firma.de" "#427 B2 Messages: die Adresse steht in der Zeile B2 Messages"
assert_contains_286 "$(fx_report_rows B2)" "✓" "#427 B2 Messages: B2 der Blobs bleibt ✓ (getrennte Zeilen)"
fx_verify_pair "$FX_TMP/t-src" "$FX_TMP/t-ziel"
fx_git "$FX_TMP/t-ziel" tag -a v0 -m "Freigabe durch chef@firma.de"
fx_scan "$FX_TMP/t-src" "$FX_TMP/t-ziel"
assert_exit 1 "$FX_RC" "#427 B2 Messages: persönliche Adresse in einer Tag-Message → Exit 1"
assert_contains_286 "$(fx_report_rows "B2 Messages")" "chef@firma.de" "#427 B2 Messages: die Tag-Adresse wird genannt"

# Eine echte Adresse, die nur in einem alten Stand stand, wird trotzdem gefunden (alle Blobs).
echo "Ansprechpartner: max.muster@firma.de" > "$FX_TMP/s-ziel/docs/factory/alt.md"
fx_git "$FX_TMP/s-ziel" add -A && fx_git "$FX_TMP/s-ziel" commit -qm "docs: alt (nothra/tch-gastro-services#7)"
fx_git "$FX_TMP/s-ziel" rm -q docs/factory/alt.md && fx_git "$FX_TMP/s-ziel" commit -qm "docs: weg (nothra/tch-gastro-services#8)"
printf '%s\n' docs/factory/alt.md >> "$FX_TMP/s-ziel/.git/factory-extract/paths"
fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 1 "$FX_RC" "#427 B2: nicht erlaubte Adresse in einem alten Blob → Exit 1"
fx_b2_row="$(fx_report_rows B2)"
assert_contains_286 "$fx_b2_row" "max.muster@firma.de" "#427 B2/FS1: die Adresse wird genannt"
assert_contains_286 "$fx_b2_row" "docs/factory/alt.md" "#427 B2/FS1: die Datei der Adresse wird genannt"
for fx_address in $fx_allowed_427; do
  assert_absent "$fx_b2_row" "$fx_address" "#427 B2: erlaubte Adresse $fx_address ist kein Fund"
done

FACTORY_EXTRACT_ALLOW="$FX_TMP/gibt-es-nicht" fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 2 "$FX_RC" "#427 B2: Erlaubt-Liste nicht lesbar → Exit 2 (fail-closed)"

# A2 im Bericht: ein Pfad außerhalb der Liste macht den Scan rot, auch ohne gitleaks-/E-Mail-Fund.
fx_scan "$FX_TMP/a2-src" "$FX_TMP/a2-ziel"
assert_exit 1 "$FX_RC" "#427 B3/A2: Pfad außerhalb der Liste → scan Exit 1"
assert_contains_286 "$FX_OUT" "| A2 | ✗ | A2: docs/factory/fremd.md" "#427 B3/A2: Bericht zeigt A2 als ✗ mit dem Pfad"
assert_contains_286 "$FX_OUT" "| B1 | ✓" "#427 B3/A2: B1 bleibt im selben Bericht ✓"

rm -rf "$FX_TMP"
