#!/usr/bin/env bash
# factory-extract-tests.sh – Tests zu scripts/project/factory-extract.sh (#427, ADR-063 Nachtrag)
#
# Wird von run-project-tests.sh gesourct (teilt PASS/FAIL und die Prüf-Helfer), nie direkt
# ausgeführt. `git filter-repo` und `gitleaks` laufen hier nie echt: beide kommen als Stub über
# FILTER_REPO_CMD/GITLEAKS_CMD, auch für die Fälle „Werkzeug fehlt" und „Werkzeug meldet Fund"
# (Messung brechen, nicht nur den Input – Lesson aus #319).

FX_SCRIPT="$SCRIPTS_DIR/project/factory-extract.sh"
FX_RULES="$SCRIPTS_DIR/project/factory-extract.rules"
FX_TMP="$(mktemp -d)"
NULL_COMMIT_427=0000000000000000000000000000000000000000

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

# fx_source <repo> – TCH im Kleinen: eine Factory-ADR zog von docs/adr/ nach docs/factory/adr/,
# daneben App-Code und eine App-ADR, die nie Factory waren.
fx_source() {
  git init -q -b main "$1"
  mkdir -p "$1/docs/adr" "$1/app"
  printf 'Zeile %s der Factory-ADR\n' 1 2 3 4 5 6 7 8 > "$1/docs/adr/seam.md"
  echo 'export default function Page() {}' > "$1/app/page.tsx"
  echo 'App-Entscheidung' > "$1/docs/adr/app.md"
  fx_ownership "$1"
  fx_git "$1" add -A
  fx_git "$1" commit -qm "feat: start (#1)"
  mkdir -p "$1/docs/factory/adr"
  fx_git "$1" mv docs/adr/seam.md docs/factory/adr/seam.md
  fx_git "$1" commit -qm "docs: adr verschieben (#2)"
}

echo ""
echo "#427 factory-extract.sh paths (A1):"

FX_SRC="$FX_TMP/src"
fx_source "$FX_SRC"
fx_paths_1="$(FACTORY_DIR="$FX_SRC" bash "$FX_SCRIPT" paths)"
assert_exit 0 "$?" "#427 A1: paths läuft auf dem Fixture-Repo durch"
fx_expected="$(printf '%s\n' docs/adr/seam.md docs/factory/OWNERSHIP.md docs/factory/adr/seam.md scripts/checks/ownership-check.sh)"
assert_true "$([ "$fx_paths_1" = "$fx_expected" ]; echo $?)" \
  "#427 A1: Liste = --list factory + Altpfad, LC_ALL=C sortiert (war: $(printf '%s' "$fx_paths_1" | tr '\n' ' '))"
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

echo ""
echo "#427 factory-extract.sh qualify + Umschreibregel (A4/C3):"

FX_Q="$FX_TMP/qualify"
git init -q -b main "$FX_Q"
cat > "$FX_Q/doku.md" <<'MDEOF'
Siehe #42.
Liste (#431, #432)
bereits nothra/tch-gastro-services#7 und foo/bar#9
Farbe #1e40af, Wort issue#12, Pfad a-#5, Punkt x.#6, Mischform #12abc
Anker seite/#12
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
fx_git "$FX_Q" add -A
fx_git "$FX_Q" commit -qm init
FACTORY_DIR="$FX_SRC" bash "$FX_SCRIPT" qualify "$FX_Q"
assert_exit 0 "$?" "#427 qualify: läuft durch"
fx_md="$(cat "$FX_Q/doku.md")"
assert_contains_286 "$fx_md" "Siehe nothra/tch-gastro-services#42." "#427 Regel: #42 am Satzende wird qualifiziert"
assert_contains_286 "$fx_md" "(nothra/tch-gastro-services#431, nothra/tch-gastro-services#432)" "#427 Regel: Klammer- und Komma-Liste wird qualifiziert"
assert_contains_286 "$fx_md" "bereits nothra/tch-gastro-services#7 und foo/bar#9" "#427 Regel: schon qualifizierte Verweise bleiben"
assert_contains_286 "$fx_md" "Farbe #1e40af, Wort issue#12, Pfad a-#5, Punkt x.#6, Mischform #12abc" \
  "#427 Regel: Farbcode, Wortzeichen/-/. davor und Ziffern+Buchstaben bleiben"
assert_contains_286 "$fx_md" "Anker seite/#12" "#427 Regel: / direkt davor (Pfad-Anker) bleibt"
assert_contains_286 "$fx_md" "## Überschrift" "#427 Regel: Markdown-Überschrift bleibt"
fx_sh="$(cat "$FX_Q/skript.sh")"
assert_contains_286 "$fx_sh" "#!/usr/bin/env bash" "#427 qualify .sh: Shebang bleibt"
assert_contains_286 "$fx_sh" "# Kommentar (nothra/tch-gastro-services#319)" "#427 qualify .sh: Kommentarzeile wird qualifiziert"
assert_contains_286 "$fx_sh" "  # eingerückt nothra/tch-gastro-services#5" "#427 qualify .sh: eingerückte Kommentarzeile wird qualifiziert"
assert_contains_286 "$fx_sh" 'echo "Closes #42"' "#427 qualify .sh: String-Fixture in Code bleibt"
assert_contains_286 "$fx_sh" "x=1 # Rest-Kommentar #8 hinter Code" "#427 qualify .sh: Code-Zeile mit Rest-Kommentar bleibt ganz"
assert_contains_286 "$(cat "$FX_Q/ci.yml")" "name: x #77" "#427 qualify: andere Dateitypen bleiben unangetastet"
fx_before="$(cat "$FX_Q/doku.md" "$FX_Q/skript.sh")"
FACTORY_DIR="$FX_SRC" bash "$FX_SCRIPT" qualify "$FX_Q"
assert_true "$([ "$fx_before" = "$(cat "$FX_Q/doku.md" "$FX_Q/skript.sh")" ]; echo $?)" "#427 qualify: zweiter Lauf ändert nichts (idempotent)"

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
assert_contains_286 "$fx_log" "arg=--paths-from-file" "#427 run: filter-repo bekommt die Pfadliste"
assert_contains_286 "$fx_log" "arg=--replace-message" "#427 run: filter-repo bekommt die Message-Regel"
assert_contains_286 "$fx_log" "arg=$FX_RULES" "#427 run: Message-Regel ist factory-extract.rules"
assert_true "$([ "$(cat "$FX_Z/.git/factory-extract/paths" 2>/dev/null)" = "$fx_paths_1" ]; echo $?)" \
  "#427 run: die übergebene Pfadliste ist die paths-Ausgabe des geklonten Stands"
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

echo ""
echo "#427 factory-extract.sh verify (A2–A5):"

# fx_verify_pair <quelle> <ziel> – Quelle nur aus Factory-Pfaden, Ziel ein Klon davon, dazu die
# Metadaten, die `run` schreibt, und eine identische commit-map, wie filter-repo sie hinterlässt.
fx_verify_pair() {
  git init -q -b main "$1"
  mkdir -p "$1/docs/adr"
  printf 'Zeile %s der Factory-ADR\n' 1 2 3 4 5 6 7 8 > "$1/docs/adr/seam.md"
  fx_ownership "$1"
  fx_git "$1" add -A
  fx_git "$1" commit -qm "feat: start (nothra/tch-gastro-services#1)"
  mkdir -p "$1/docs/factory/adr"
  fx_git "$1" mv docs/adr/seam.md docs/factory/adr/seam.md
  fx_git "$1" commit -qm "docs: adr verschieben (nothra/tch-gastro-services#2)"
  git clone -q --no-local "$1" "$2"
  mkdir -p "$2/.git/factory-extract" "$2/.git/filter-repo"
  git -C "$1" rev-parse HEAD > "$2/.git/factory-extract/source-commit"
  printf '%s\n' docs/factory/OWNERSHIP.md docs/factory/adr/seam.md scripts/checks/ownership-check.sh \
    > "$2/.git/factory-extract/files"
  printf '%s\n' docs/adr/seam.md docs/factory/OWNERSHIP.md docs/factory/adr/seam.md \
    scripts/checks/ownership-check.sh > "$2/.git/factory-extract/paths"
  { echo "old new"; git -C "$1" rev-list --all | awk '{print $1 " " $1}'; } > "$2/.git/filter-repo/commit-map"
}
# fx_verify <quelle> <ziel> – Ausgabe von verify (stdout+stderr); Exit-Code in FX_RC.
fx_verify() { FX_OUT="$(FACTORY_DIR="$1" bash "$FX_SCRIPT" verify "$2" 2>&1)"; FX_RC=$?; }

fx_verify_pair "$FX_TMP/v-src" "$FX_TMP/v-ziel"
fx_verify "$FX_TMP/v-src" "$FX_TMP/v-ziel"
assert_exit 0 "$FX_RC" "#427 verify: sauberes Ziel → Exit 0"
assert_contains_286 "$FX_OUT" "A3 ok" "#427 verify: A3 (--follow über den Altpfad) ist grün"

fx_verify_pair "$FX_TMP/a2-src" "$FX_TMP/a2-ziel"
mkdir -p "$FX_TMP/a2-ziel/app" && echo x > "$FX_TMP/a2-ziel/app/x.tsx"
fx_git "$FX_TMP/a2-ziel" add -A && fx_git "$FX_TMP/a2-ziel" commit -qm "feat: app (nothra/tch-gastro-services#3)"
fx_verify "$FX_TMP/a2-src" "$FX_TMP/a2-ziel"
assert_exit 1 "$FX_RC" "#427 A2: Pfad außerhalb der Liste → Exit 1"
assert_contains_286 "$FX_OUT" "A2: app/x.tsx" "#427 A2: der fremde Pfad wird genannt"
assert_absent "$FX_OUT" "A3:" "#427 A2: nur A2 schlägt an (Negativtest isoliert)"

fx_verify_pair "$FX_TMP/a2b-src" "$FX_TMP/a2b-ziel"
mkdir -p "$FX_TMP/a2b-ziel/tasks" && echo x > "$FX_TMP/a2b-ziel/tasks/t.md"
echo "tasks/t.md" >> "$FX_TMP/a2b-ziel/.git/factory-extract/paths"
fx_git "$FX_TMP/a2b-ziel" add -A && fx_git "$FX_TMP/a2b-ziel" commit -qm "docs: task (nothra/tch-gastro-services#3)"
fx_verify "$FX_TMP/a2b-src" "$FX_TMP/a2b-ziel"
assert_exit 1 "$FX_RC" "#427 A2/FS2: verbotener Bereich (tasks/) schlägt an, auch wenn er in der Liste steht"
assert_contains_286 "$FX_OUT" "A2: tasks/t.md" "#427 A2/FS2: der Pfad im verbotenen Bereich wird genannt"

fx_verify_pair "$FX_TMP/a4-src" "$FX_TMP/a4-ziel"
fx_git "$FX_TMP/a4-ziel" commit -q --allow-empty -m "fix: etwas (#12)"
fx_verify "$FX_TMP/a4-src" "$FX_TMP/a4-ziel"
assert_exit 1 "$FX_RC" "#427 A4: unqualifiziertes #<nr> in einer Message → Exit 1"
assert_contains_286 "$FX_OUT" "A4: fix: etwas (#12)" "#427 A4: die betroffene Message-Zeile wird genannt"
assert_absent "$FX_OUT" "A2:" "#427 A4: nur A4 schlägt an (Negativtest isoliert)"

fx_verify_pair "$FX_TMP/a5-src" "$FX_TMP/a5-ziel"
git -C "$FX_TMP/a5-ziel" -c user.email=t@t.com -c user.name=t commit -q --allow-empty \
  --author="Jemand Anders <x@example.com>" -m "docs: fremd (nothra/tch-gastro-services#4)"
fx_a5_old="$(git -C "$FX_TMP/a5-src" rev-parse HEAD)"
fx_a5_new="$(git -C "$FX_TMP/a5-ziel" rev-parse HEAD)"
{ echo "old new"; echo "$fx_a5_old $fx_a5_new"; } > "$FX_TMP/a5-ziel/.git/filter-repo/commit-map"
fx_verify "$FX_TMP/a5-src" "$FX_TMP/a5-ziel"
assert_exit 1 "$FX_RC" "#427 A5: abweichender Autor → Exit 1"
assert_contains_286 "$FX_OUT" "A5: $fx_a5_old" "#427 A5: der betroffene Commit wird genannt"
assert_absent "$FX_OUT" "A4:" "#427 A5: nur A5 schlägt an (Negativtest isoliert)"

# A3: die Quelle hat einen Stand weiter umbenannt, das Ziel kennt den neuen Namen nicht.
fx_verify_pair "$FX_TMP/a3-src" "$FX_TMP/a3-ziel"
fx_git "$FX_TMP/a3-src" mv docs/factory/adr/seam.md docs/factory/adr/neu.md
fx_git "$FX_TMP/a3-src" commit -qm "docs: umbenennen (nothra/tch-gastro-services#5)"
git -C "$FX_TMP/a3-src" rev-parse HEAD > "$FX_TMP/a3-ziel/.git/factory-extract/source-commit"
printf '%s\n' docs/factory/OWNERSHIP.md docs/factory/adr/neu.md scripts/checks/ownership-check.sh \
  > "$FX_TMP/a3-ziel/.git/factory-extract/files"
printf '%s\n' docs/factory/adr/neu.md >> "$FX_TMP/a3-ziel/.git/factory-extract/paths"
fx_verify "$FX_TMP/a3-src" "$FX_TMP/a3-ziel"
assert_exit 1 "$FX_RC" "#427 A3/FS3: Factory-Datei fehlt im Ziel → Exit 1"
assert_contains_286 "$FX_OUT" "A3: docs/factory/adr/neu.md" "#427 A3/FS3: die Datei wird genannt"
assert_absent "$FX_OUT" "A5:" "#427 A3: nur A3 schlägt an (Negativtest isoliert)"

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
assert_contains_286 "$FX_OUT" "A5 ok" "#427 A3: A5 bleibt grün (Negativtest isoliert)"
assert_contains_286 "$FX_OUT" "A2 ok" "#427 A3: A2 bleibt grün (Negativtest isoliert)"

fx_verify_pair "$FX_TMP/nomap-src" "$FX_TMP/nomap-ziel"
rm -f "$FX_TMP/nomap-ziel/.git/filter-repo/commit-map"
fx_verify "$FX_TMP/nomap-src" "$FX_TMP/nomap-ziel"
assert_exit 2 "$FX_RC" "#427 verify: commit-map fehlt → Exit 2 (fail-closed)"
rm -rf "$FX_TMP/nomap-ziel/.git/factory-extract"
fx_verify "$FX_TMP/nomap-src" "$FX_TMP/nomap-ziel"
assert_exit 2 "$FX_RC" "#427 verify: Metadaten von run fehlen → Exit 2 (fail-closed)"

echo ""
echo "#427 factory-extract.sh scan (B1/B2/B3, mit gitleaks-Stub):"

# gitleaks-Stub: Exit-Code aus FX_LEAKS_RC, Version fest, Argumente je Zeile nach FX_LEAKS_LOG.
cat > "$FX_STUB_DIR/gitleaks" <<'STUBEOF'
#!/usr/bin/env bash
[ "$1" = version ] && { echo "8.99.0-stub"; exit 0; }
printf 'arg=%s\n' "$@" > "$FX_LEAKS_LOG"
echo "stub-scan $*"
exit "${FX_LEAKS_RC:-0}"
STUBEOF
chmod +x "$FX_STUB_DIR/gitleaks"
FX_LEAKS_LOG="$FX_TMP/gitleaks.log"
# fx_scan <quelle> <ziel> [leaks-rc] – Bericht (stdout+stderr) in FX_OUT, Exit-Code in FX_RC.
fx_scan() {
  FX_OUT="$(FACTORY_DIR="$1" GITLEAKS_CMD="$FX_STUB_DIR/gitleaks" FX_LEAKS_RC="${3:-0}" FX_LEAKS_LOG="$FX_LEAKS_LOG" \
    bash "$FX_SCRIPT" scan "$2" 2>&1)"
  FX_RC=$?
}

fx_verify_pair "$FX_TMP/s-src" "$FX_TMP/s-ziel"
echo "Kontakt: noreply@anthropic.com, demo@example.com, t@t.com" > "$FX_TMP/s-ziel/docs/factory/kontakt.md"
fx_git "$FX_TMP/s-ziel" add -A && fx_git "$FX_TMP/s-ziel" commit -qm "docs: kontakt (nothra/tch-gastro-services#6)"
printf '%s\n' docs/factory/kontakt.md >> "$FX_TMP/s-ziel/.git/factory-extract/paths"
fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 0 "$FX_RC" "#427 scan: kein Fund, nur erlaubte Adressen → Exit 0"
assert_contains_286 "$FX_OUT" "8.99.0-stub" "#427 B3: Bericht nennt die gitleaks-Version"
assert_contains_286 "$FX_OUT" "$(git -C "$FX_TMP/s-src" rev-parse HEAD)" "#427 B3: Bericht nennt den Ziel-Commit von TCH"
assert_contains_286 "$FX_OUT" "| Commits | 3 |" "#427 B3: Bericht nennt die Anzahl Commits"
assert_contains_286 "$FX_OUT" "| B1" "#427 B3: Bericht hat eine Zeile B1"
assert_contains_286 "$FX_OUT" "| B2" "#427 B3: Bericht hat eine Zeile B2"
assert_contains_286 "$FX_OUT" "| A2" "#427 B3: Bericht hat eine Zeile A2"
fx_leaks_args="$(cat "$FX_LEAKS_LOG" 2>/dev/null)"
assert_contains_286 "$fx_leaks_args" "arg=--log-opts=--all" "#427 B1: gitleaks läuft über alle Commits"
assert_contains_286 "$fx_leaks_args" "arg=--gitleaks-ignore-path" "#427 B1: gitleaks bekommt die Falsch-Positiv-Liste"
assert_contains_286 "$fx_leaks_args" "arg=$SCRIPTS_DIR/project/factory-extract.gitleaksignore" \
  "#427 B1: Falsch-Positiv-Liste ist factory-extract.gitleaksignore"

# Die Zahl der ausgenommenen Falsch-Positive steht im Bericht (Kommentar- und Leerzeilen zählen nicht).
printf '# Grund A\nabc:datei:regel:1\n\n# Grund B\ndef:datei:regel:2\n' > "$FX_TMP/ignore"
FX_OUT="$(FACTORY_DIR="$FX_TMP/s-src" GITLEAKS_CMD="$FX_STUB_DIR/gitleaks" FX_LEAKS_LOG="$FX_LEAKS_LOG" \
  FACTORY_EXTRACT_GITLEAKSIGNORE="$FX_TMP/ignore" bash "$FX_SCRIPT" scan "$FX_TMP/s-ziel" 2>&1)"
assert_contains_286 "$FX_OUT" "2 Falsch-Positive ausgenommen" "#427 B1/B3: Bericht nennt die Zahl der ausgenommenen Falsch-Positive"
FX_OUT="$(FACTORY_DIR="$FX_TMP/s-src" GITLEAKS_CMD="$FX_STUB_DIR/gitleaks" FX_LEAKS_LOG="$FX_LEAKS_LOG" \
  FACTORY_EXTRACT_GITLEAKSIGNORE="$FX_TMP/gibt-es-nicht" bash "$FX_SCRIPT" scan "$FX_TMP/s-ziel" 2>&1)"
assert_exit 2 "$?" "#427 B1: Falsch-Positiv-Liste nicht lesbar → Exit 2 (fail-closed)"

fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel" 1
assert_exit 1 "$FX_RC" "#427 B1: gitleaks meldet Fund → Exit 1"
assert_contains_286 "$FX_OUT" "| B1 | ✗" "#427 B1: Fund steht als ✗ im Bericht"

fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel" 3
assert_exit 1 "$FX_RC" "#427 B1: gitleaks-Fehler (Exit 3) gilt nicht als sauber → Exit 1"

FX_OUT="$(FACTORY_DIR="$FX_TMP/s-src" GITLEAKS_CMD="$FX_TMP/gibt-es-nicht" bash "$FX_SCRIPT" scan "$FX_TMP/s-ziel" 2>&1)"
assert_exit 2 "$?" "#427 B1: gitleaks fehlt → Exit 2 (fail-closed)"

# Eine echte Adresse, die nur in einem alten Stand stand, wird trotzdem gefunden (alle Blobs).
echo "Ansprechpartner: max.muster@firma.de" > "$FX_TMP/s-ziel/docs/factory/alt.md"
fx_git "$FX_TMP/s-ziel" add -A && fx_git "$FX_TMP/s-ziel" commit -qm "docs: alt (nothra/tch-gastro-services#7)"
fx_git "$FX_TMP/s-ziel" rm -q docs/factory/alt.md && fx_git "$FX_TMP/s-ziel" commit -qm "docs: weg (nothra/tch-gastro-services#8)"
printf '%s\n' docs/factory/alt.md >> "$FX_TMP/s-ziel/.git/factory-extract/paths"
fx_scan "$FX_TMP/s-src" "$FX_TMP/s-ziel"
assert_exit 1 "$FX_RC" "#427 B2: nicht erlaubte Adresse in einem alten Blob → Exit 1"
assert_contains_286 "$FX_OUT" "max.muster@firma.de" "#427 B2/FS1: die Adresse wird genannt"
assert_contains_286 "$FX_OUT" "docs/factory/alt.md" "#427 B2/FS1: die Datei der Adresse wird genannt"
assert_absent "$FX_OUT" "| B2 | ✗ | demo@example.com" "#427 B2: erlaubte Adressen sind kein Fund"

FX_OUT="$(FACTORY_DIR="$FX_TMP/s-src" GITLEAKS_CMD="$FX_STUB_DIR/gitleaks" FACTORY_EXTRACT_ALLOW="$FX_TMP/gibt-es-nicht" \
  bash "$FX_SCRIPT" scan "$FX_TMP/s-ziel" 2>&1)"
assert_exit 2 "$?" "#427 B2: Erlaubt-Liste nicht lesbar → Exit 2 (fail-closed)"

rm -rf "$FX_TMP"
