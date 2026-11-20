#!/usr/bin/env bash
# Projekt-Anteile der Erst-Einbindung per factory.lock (#428, T2a-4) – von run-project-tests.sh gesourct.
# Sichert, was nach dem Sync auf Factory v0.8.0 projekteigen weiterlebt, ohne dass die Factory es kennt:
# AK2.17a (OWNERSHIP.md weg, Deckel), AK2.17b (copy_files), AK2.17d/e (Projekt-Regeln in CLAUDE.md),
# AK2.17f (Oberflächentest-Details), AK2.17g (Ignore-Muster). Nutzt Helfer und Variablen der aufrufenden Suite.

echo ""
echo "#428 Erst-Einbindung (Projekt-Anteile nach factory.lock):"

CLAUDE_428="$FACTORY_ROOT/CLAUDE.md"
CONTEXT_428="$FACTORY_ROOT/docs/factory/PROJECT-CONTEXT.md"

# assert_file_has_428 <datei> <fester-text> <erwartet-exit> <label> – Fixed-String-Treffer direkt auf der Datei (kein Pipe, Lesson SIGPIPE).
assert_file_has_428() {
  grep -qF -- "$2" "$1"
  assert_exit "$3" "$?" "$4"
}

# AK2.17a: OWNERSHIP.md ist durch factory.lock ersetzt; Factory-Lessons-Gruppe raus, Projekt-Lessons bleiben, Deckel grün.
assert_true "$([ ! -e "$FACTORY_ROOT/docs/factory/OWNERSHIP.md" ]; echo $?)" "#428 AK2.17a: docs/factory/OWNERSHIP.md ist entfernt"
assert_file_has_428 "$CONTEXT_428" '#### Factory-Lessons' 1 "#428 AK2.17a: PROJECT-CONTEXT.md führt keine Gruppe „Factory-Lessons“ mehr"
assert_file_has_428 "$CONTEXT_428" 'docs/project/lessons/INDEX.md' 0 "#428 AK2.17a: Projekt-Lessons bleiben, verlinkt auf die Einzelliste"
assert_true "$([ -r "$FACTORY_ROOT/docs/project/lessons/INDEX.md" ]; echo $?)" "#428 AK2.17a: docs/project/lessons/INDEX.md existiert"
bash "$CHECKS_DIR/import-context-limit-check.sh" > /dev/null 2>&1
assert_exit 0 "$?" "#428 AK2.17a: @import-Dauerkontext liegt unter dem Deckel aus v0.8.0"

# AK2.17b: .env.local wird weiter in jeden Worktree kopiert (v0.8.0 kopiert von sich aus nichts mehr).
assert_file_has_428 "$FACTORY_ROOT/factory.config.yml" 'copy_files: [".env.local"]' 0 "#428 AK2.17b: factory.config.yml setzt start_work.copy_files: [.env.local]"

# AK2.17d/e: Projekt-Regeln stehen dauerhaft geladen in CLAUDE.md.
assert_file_has_428 "$CLAUDE_428" 'in `/implement` als Schritt, in `/review` als Prüfpunkt' 0 "#428 AK2.17d: Routen-Doku-Regel gilt erkennbar für /implement und /review"
assert_file_has_428 "$CLAUDE_428" '`runAtomic` (`db/atomic.ts`), nie `db.transaction()`' 0 "#428 AK2.17e: runAtomic-Regel steht dauerhaft geladen in CLAUDE.md"

# AK2.17f: Oberflächentest-Details, die die Skilltexte nur noch generisch nennen.
for needle_428 in 'e2e/*.spec.ts' 'webServer' 'reuseExistingServer' 'Preview-Config `dev`' '.env.local'; do
  assert_file_has_428 "$CONTEXT_428" "$needle_428" 0 "#428 AK2.17f: PROJECT-CONTEXT.md nennt „${needle_428}“"
done

# AK2.17g: Wegwerf-E2E-Specs bleiben ignoriert (Muster stehen in .gitignore.project, nicht mehr in gitignore.factory).
for name_428 in e2e/x.tmp.spec.ts e2e/x.tmp.spec.tsx; do
  git -C "$FACTORY_ROOT" check-ignore -q "$name_428"
  assert_exit 0 "$?" "#428 AK2.17g: ${name_428} ist ignoriert"
done
git -C "$FACTORY_ROOT" check-ignore -q e2e/x.spec.ts
assert_exit 1 "$?" "#428 AK2.17g: Gegenprobe – e2e/x.spec.ts ist nicht ignoriert"
