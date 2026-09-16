# Security Review: Task 339

Diff-Scope: `git diff origin/main...HEAD` (`origin/main` = `7f5d5a5`, nicht divergiert – kein
Fremd-PR im Diff). Geänderte Dateien: `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
`scripts/checks/tests/run-tests.sh`, `docs/factory/lessons/build-tooling.md`,
`docs/factory/PROJECT-CONTEXT.md`, `docs/specs/spec-339-*.md`, `tasks/task-339-*.md`,
`tasks/review-339.md`. Kein `app/**`-Diff, keine Produktions-Business-Logik betroffen – die
Task **ist selbst** eine Security-Fix-Task (Dependency-Floor gegen zwei High-Advisories).

## Prüfkatalog

- **Input-Validierung/Injection, Auth/Autorisierung, Kryptographie, Error-Handling:** entfällt
  – kein Code-Pfad in dieser Task berührt Nutzereingaben, Auth oder Verschlüsselung. Der Diff
  ist auf Dependency-Overrides (`pnpm-workspace.yaml`), Lockfile und ein Bash-Test-Skript
  beschränkt.
- **Dependencies (Kernprüfung dieser Task):**
  - Unabhängig nachgemessen: `grep -n "brace-expansion@[0-9]" pnpm-lock.yaml` → ausschließlich
    `1.1.18`, `2.1.4`, `5.0.12` (zwei Snapshot-Kopien je Version). Alle drei liegen auf/über den
    zugehörigen Floors (`1.1.18`/`2.1.4`/`5.0.9`) – keine verwundbare Kopie mehr im Baum.
  - Advisory-Grundlage über die volle `vulnerabilities[]`-Liste (nicht nur `pnpm audit`s erste
    Range-Gruppe, Lesson `build-tooling.md` #231/#337) bereits in Runde 2 des Code-Reviews
    gegen die GitHub-Advisory-API gemessen: `GHSA-rgw5-rvv9-x895` (high, Floors 1.1.18 / 2.1.4 /
    3.0.6 / 5.0.9) und `GHSA-mh99-v99m-4gvg` (high, Vorläufer-Floors). Der neue Selektor
    `brace-expansion@>=4.0.0 <5.0.9` → `^5.0.9` deckt sich exakt mit der Advisory-Range.
  - Cross-Major-Ziel-Range (`^5.0.9` bei einem `>=4.0.0`-Selektor) ist eine dokumentierte,
    belegte Ausnahme (4er-Linie hat keinen eigenen Fix) – kein Fehlgriff, s. Review-Runde 2/W2.
  - Keine neue Dependency eingeführt; der dritte Override-Eintrag betrifft ausschließlich eine
    bereits vorhandene transitive Kopie (`brace-expansion`, dev-only via `minimatch@10.2.5` →
    `@typescript-eslint/typescript-estree`).
  - Guard-Erweiterung (`floor_cases_291` in `run-tests.sh`) ist selbst CI-bewacht: Bash-Suite
    unabhängig nachgelaufen (`LC_ALL=C bash scripts/checks/tests/run-tests.sh`) →
    **1560 grün / 0 rot**, darin die neuen Major-3/4/5-Fälle und ihre Mutationsbelege namentlich
    grün.
  - Lockfile-Konsistenz für `--frozen-lockfile` (CI-Voraussetzung) geprüft: `overrides:`-Block
    trägt den dritten Eintrag, aufgelöste Versionen stimmen mit den Snapshots überein.
- **Secrets:** kein Secret/Key im Diff (reine Dependency-/Test-/Doku-Änderung).

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

_Keine._ (Alle aus dem Code-Review verbliebenen Nitpicks sind Prosa-/Konsistenz-Feilen ohne
Sicherheitsrelevanz, bereits im Report `tasks/review-339.md` erfasst.)

## Ergebnis
PASSED
