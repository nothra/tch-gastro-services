# Task 74: start-work.sh – neue Tasks per Default im eigenen git-Worktree isolieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden — Selbst-Review (Shell): `git -C "$WORKDIR"` konsequent, kein `checkout` im geteilten Baum, fail-safe Reuse, Werte gequotet; bash -n clean
- [x] Tests vollständig — 6 neue Self-Tests (Kern-Invariante + In-Place-Fallback), Suite 154 grün; lint/format/unit (25) grün im Worktree
- [x] Security-Review bestanden — keine Secrets; gh nur mit stub/owner-Repo; Pfade mit Leerzeichen gequotet; kein `--force`, kein eval auf Fremdinput
- [x] Refactoring abgeschlossen — WORKDIR-Abstraktion vereinheitlicht Worktree-/In-Place-Pfad, kein Duplikat
- [x] Codify ausgeführt — Learning ist die Regel selbst (Worktree-Isolation) in git-workflow.md/CLAUDE.md verankert; kein weiterer Regel-Bedarf
- [x] Fertig / PR erstellt

## Beschreibung
Kernursache eines Session-Kollisionsvorfalls (#71): Alle Claude-Sessions arbeiten im **selben**
Arbeitsbaum – ein geteiltes `HEAD`, ein Index, ein Working Tree. Ein paralleles `git checkout`
/`commit` verschiebt `HEAD` unter anderen Sessions; dadurch landete ein Commit auf dem falschen
Branch und der pre-push-Hook las fälschlich „auf main".

**Fix:** `start-work.sh` legt jede neue Task **per Default in einem eigenen git-Worktree** an
(physische Isolation), statt im geteilten Baum zu branchen. Kein `checkout` im Haupt-Baum → kein
HEAD-Hijack. Escape-Hatch `FACTORY_NO_WORKTREE=1` behält das alte In-Place-Verhalten.

## Akzeptanzkriterien
- [ ] GIVEN ein sauberer Haupt-Arbeitsbaum auf `main` WHEN `start-work.sh <desc>` läuft (Worktree-Default) THEN entsteht ein neuer Worktree mit dem Feature-Branch UND der Haupt-Baum-HEAD bleibt unverändert auf `main`.
- [ ] GIVEN Worktree-Modus WHEN start-work durchläuft THEN liegen Task-Datei und Task-Commit im **Worktree**, nicht im Haupt-Baum.
- [ ] GIVEN `FACTORY_NO_WORKTREE=1` WHEN start-work läuft THEN gilt das bisherige In-Place-Verhalten (branch im aktuellen Baum).
- [ ] GIVEN ein Worktree-Pfad, der bereits existiert WHEN start-work erneut läuft THEN wird er wiederverwendet (kein harter Abbruch), fail-safe.
- [ ] GIVEN die Doku WHEN ein Entwickler parallel arbeiten will THEN beschreiben git-workflow.md/CLAUDE.md/OPERATING.md die Worktree-Konvention inkl. Aufräumen (`git worktree remove`).

## Technische Notizen
- Worktree-Basisverzeichnis konfigurierbar via `FACTORY_WORKTREE_BASE` (Default: Geschwister-Ordner
  `<repo-parent>/<repo-name>.worktrees`). Branch-Slashes im Pfad zu `-` geflacht.
- Basis-Ref: `origin/<default>` wenn vorhanden (fetch best-effort), sonst lokaler `<default>` – offline lauffähig.
- Deps: `pnpm install` im neuen Worktree (überspringbar via `FACTORY_WT_SKIP_INSTALL=1`), damit die
  Gates (lint/test) dort laufen.
- Test (self-test, shell): belegt die Kern-Invariante „Haupt-Baum-HEAD unverändert" gegen ein
  Wegwerf-Repo, mit `gh`-PATH-Stub (etabliertes Muster aus factory-poll-Tests) und ohne Remote.

## Offene Fragen
Keine.

## Review-Findings
Selbst-Review (keine offenen Findings):
- `bash -n` sauber; alle git-Aufrufe im Worktree-Modus über `git -C "$FACTORY_DIR"`/`git -C "$WORKDIR"`,
  nie bare `git` (cwd-unabhängig, kein versehentlicher Zugriff auf den geteilten Baum).
- Offline lauffähig: `fetch` best-effort (`|| true`), Basis-Ref-Fallback origin→lokal→HEAD.
- Reuse fail-safe: bestehender Worktree/Pfad/Branch → Wiederverwendung statt Abbruch.
- Pfade mit Leerzeichen (Repo-Name „TCH Gastro Services") durchgängig gequotet.

## Codify-Notizen
Kein neuer „Stolperstein"-Eintrag nötig: Die Erkenntnis (geteilter Arbeitsbaum = geteilter HEAD →
Kollision; Fix = physische Isolation via git worktree) ist als **Regel** in
`git-workflow.md` („Parallele Sessions: eigener Worktree") und `CLAUDE.md` (Guardrails) verankert
und technisch im Startskript erzwungen. Nebenbefund: pnpm `verify-deps-before-run` will bei einem
**symlinkten** `node_modules` den Ordner purgen (No-TTY-Abbruch) → Worktrees brauchen eine echte
Installation, kein Symlink (deshalb `pnpm install` im Startskript, nicht Symlink).

---
Branch: `feature/74-start-work-worktree-isolation`
Erstellt: 2026-07-12
</content>
