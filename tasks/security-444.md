# Security Review: Task 444

Scope: `git diff origin/main...HEAD` – `package.json` (zwei Specifier), `pnpm-lock.yaml`
(vitest/vite-Teilbaum), `scripts/checks/tests/run-tests.sh` (Floor-Fälle + Mutationsbelege),
Spec, Task- und Review-Datei. Kein Produktionscode, keine Route, keine Server Action, kein
DB-Zugriff berührt.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] [Dependencies] **Advisory-Lage unabhängig nachgeprüft (AK6).** npm-Bulk-Advisory-API über
  alle `packages:`-Einträge des Lockfiles (706 Pakete, 789 Versionen) → **0 Treffer**.
  Gegenprobe mit `vite@8.1.3`, `@vitest/mocker@4.1.11`, `vitest@4.1.11` sowie den neu
  hinzugekommenen `lightningcss@1.33.0`, `rolldown@1.2.15`, `postcss@8.5.32`, `nanoid@3.3.20` →
  genau die sieben Alert-Advisories (GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp,
  GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw,
  GHSA-587h-7wmj-h5pm) an den Altversionen, an den neuen Versionen nichts. `pnpm audit` bewusst
  nicht genutzt (Lesson #228).
- [ ] [Dependencies / Supply Chain] **Lockfile-Streuung plausibel und eng.** Neue bzw. gehobene
  Einträge stammen ausschließlich aus dem vitest/vite-Teilbaum (`rolldown` + Bindings 1.2.15,
  `@oxc-project/types`, `lightningcss@1.33.0` + Plattform-Binaries, `@babel/parser|types`
  7.29.11 via `magicast`, zusätzliche Kopien `postcss@8.5.32`/`nanoid@3.3.20` unter vite – beide
  über ihren Floors). Alle Einträge lösen über die Standard-Registry mit `integrity`-Hash auf;
  keine Git-/Tarball-URL, keine neue Quelle. Entfernt wurden u. a. `@rolldown/binding-wasm32-wasi`
  und die `@emnapi/*`-Kette (kleinere Angriffsfläche). `lightningcss@1.32.0` bleibt für die
  Tailwind-Kette unverändert. `pnpm-workspace.yaml` (Build-Script-Freigaben) ist unverändert.
- [ ] [Dependencies] **Keine Produktions-Exposition.** `vitest`, `@vitest/coverage-v8` und der
  `vite`-Peer sind reine Dev-/Test-Toolchain; der Next-Build (Turbopack) bündelt sie nicht. Die
  geschlossenen Advisories betrafen den vite-Dev-Server bzw. den vitest-Mocker – lokal/CI, nicht
  die deployte App.
- [ ] [Command Injection] **Testcode in `run-tests.sh` unkritisch.** Die neuen Fälle arbeiten auf
  `mktemp`-Fixtures mit festen Literalen und lesen `package.json` über den bestehenden
  `pkg_pin_291`-Helfer; keine Fremdeingabe fließt in eine Shell-Auswertung.
- [ ] [Hygiene] Gitignoriertes Wegwerf-Skript `scripts/bump444.tmp.sh` liegt noch im Worktree
  (bereits in der Task-Datei vermerkt). Inhalt geprüft: keine Secrets, nur pnpm-/Advisory-Aufrufe;
  der `db`-Zweig liest `.env.local` nur zur Laufzeit. Nicht im Diff, kein Sicherheitsrisiko –
  bitte von Hand löschen.

Prüfkatalog: Input-Validierung/Injection, AuthN/AuthZ/IDOR, Secrets, Kryptographie und
Error-Handling sind von diesem Diff nicht berührt (kein Anwendungscode). Keine Out-of-Scope-Funde,
daher kein Issue und kein `kleinfunde.md`-Eintrag.

## Ergebnis
PASSED
