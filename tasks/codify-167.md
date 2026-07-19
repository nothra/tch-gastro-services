## Codify-Report: Task 167

### Neue Regeln hinzugefügt
- **`docs/factory/PROJECT-CONTEXT.md` → Bekannte Stolpersteine** – neue Regel
  „pnpm@11: `overrides`/Settings gehören in `pnpm-workspace.yaml`, nicht ins
  `package.json`-`pnpm`-Feld (aus #167)".
  Wegen Fehler-Muster: Der erste Implementierungsversuch legte die `pnpm.overrides` wie in
  pnpm ≤10 in ein `pnpm`-Feld der `package.json`. pnpm@11 **liest dieses Feld nicht mehr** und
  ignoriert die Overrides mit bloßer `[WARN]` – ein **stilles No-op**, das den Lockfile
  verwundbar lässt, obwohl der Commit „vollständig" aussieht. Die Regel verlangt: Overrides in
  `pnpm-workspace.yaml` (Top-Level `overrides:`), konditionale Selektor-Form, und **Nachweis per
  `pnpm audit` + `pnpm why`** statt Vertrauen auf die Abwesenheit einer Fehlermeldung.

### Folge-Arbeit als Issue angelegt
- **#169** (`enhancement` + `tech-debt`): pnpm-Overrides für postcss/esbuild entfernen, sobald
  `next`/`drizzle-kit` die Patches selbst mitbringen (Overrides sind sticky → sonst tote Config).
  In der neuen PROJECT-CONTEXT-Regel referenziert.

### Keine Änderungen an CLAUDE.md / Guidelines / neuen Checks
- Kein universelles (projektübergreifendes) Learning: Die Fehlplatzierung ist an pnpm@11 +
  die konkrete Repo-Struktur (vorhandene `pnpm-workspace.yaml`) gebunden → projektspezifisch,
  gehört in PROJECT-CONTEXT, nicht in die generischen Guidelines.
- Kein automatisierbarer Check sinnvoll: Ein `package.json`-`pnpm`-Feld ist nicht per se falsch
  (nur `overrides`/Settings darin), und pnpm warnt bereits selbst zur Install-Zeit. Der
  Nachweis-Reflex (`pnpm audit`) ist die wirksamere Absicherung als ein Gate-Regex.

### Review/Security
- `/review` wurde für diese reine Dependency-Config-Änderung nicht separat gefahren.
- `/security-review` → **PASSED**, keine Blocker/Findings (`tasks/security-167.md`): verwundbare
  Versionen aus dem Baum entfernt, `pnpm audit` sauber, Supply-Chain sauber, Override-Form eng.

### Empfehlung für nächste Features
- Bei jeder Dependency-Override-/pnpm-Settings-Änderung sofort `pnpm audit` + `pnpm why <paket>`
  als Nachweis laufen lassen – Fehlplatzierungen in pnpm@11 gehen still durch.
- #169 im Blick behalten und beim nächsten größeren `next`/`drizzle-kit`-Bump gegenprüfen, ob
  die Overrides entfallen können.
