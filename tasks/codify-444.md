## Codify-Report: Task 444

### Neue Regeln hinzugefügt
- `docs/project/lessons/build-tooling.md` (+ Index-Zeile in `PROJECT-CONTEXT.md`) – Peer-only-Dependency (`vite`): `pnpm update`/`overrides` wirken nicht; Weg `pnpm add -D` + `pnpm remove`; Lockfile-Streuung am Diff messen (Review-Nitpick `picomatch`).
- `docs/factory/lessons/build-tooling.md` (+ Index-Zeile erweitert) – sechstes Vorkommnis Wegwerf-Datei (`scripts/bump444.tmp.sh`), Regel aus #447 nicht angewandt.

### Keine Änderungen nötig
Review APPROVED (0 kritisch/wichtig), Security PASSED; keine Out-of-Scope-Funde, daher kein Issue und kein `kleinfunde.md`-Eintrag.

### Empfehlung für nächste Features
`scripts/bump444.tmp.sh` vor dem Merge von Hand löschen. Nach dem Merge Dependabot-Alerts #84–#86, #90–#93 auf „geschlossen" prüfen (Lesson #390).
