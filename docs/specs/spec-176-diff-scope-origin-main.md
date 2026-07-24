# Spec: Diff-/Log-Scope der Skills gegen `origin/main` bestimmen

## Kontext

Die Skills `/review`, `/security-review`, `/refactor` und `/pr-shepherd` laden ihren
Diff-/Log-Kontext per `git diff main...HEAD` bzw. `git log main...HEAD` (in
`.claude/commands/{review,security-review,refactor,pr-shepherd}.md`).

`start-work.sh` legt den Feature-Branch in einem Worktree an, der auf **`origin/main`**
basiert; das **lokale** `main`-Ref bleibt dabei stehen. Der Drei-Punkt-Operator difft
gegen die Merge-Basis von `main` und `HEAD`. Liegt lokales `main` hinter `origin/main`
(Normalfall direkt nach `start-work.sh`, wenn zwischenzeitlich fremde PRs gemergt wurden),
ist die Merge-Basis ein alter Commit und der Scope enthält **fremde, bereits gemergte PRs**
zusätzlich zur eigenen Task.

Beobachtet in #161: Dort tauchten die Dateien des fremden PR #170 im Review-/Security-/
Refactor-Scope auf. Ursache dokumentiert in `docs/factory/lessons/factory-workflow.md`
(„Review-Diff-Scope: `git diff main...HEAD` zeigt Fremd-PRs …", aus #161).

**Fix-Richtung:** Den Scope gegen `origin/main` bestimmen und `origin/main` vorher
aktualisieren (`git fetch origin`), damit der Diff verlässlich nur die Task-Änderung zeigt.
Die Ursache (`start-work.sh` zieht lokales `main` nicht nach) wird bewusst **nicht** in dieser
Task angefasst – wir härten die Konsumenten.

## Scope

**Inbegriffen:**
- Umstellung aller **fünf Fundstellen** in **vier** Skill-Dateien auf `origin/main` mit
  vorangestelltem `git fetch origin`:
  - `.claude/commands/review.md:12` — `git diff main...HEAD`
  - `.claude/commands/security-review.md:9` — `git diff main...HEAD`
  - `.claude/commands/refactor.md:11` — `git diff main...HEAD`
  - `.claude/commands/pr-shepherd.md:12` — `git log main...HEAD --oneline`
  - `.claude/commands/pr-shepherd.md:21` — `git log main...HEAD --oneline`
- Lieferung als **Patch-Workflow** (`tasks/patch-176.diff`), da `.claude/**` agent-hard-denied ist.

**Nicht inbegriffen:**
- Kein neues Check-Skript / Gate, das ein Rückfallen auf `main...HEAD` verhindert
  (bewusste Entscheidung, YAGNI – reine Doku-Umstellung).
- Keine Änderung an `start-work.sh` (die Ursache; lokales `main` wird weiterhin nicht nachgezogen).
- Keine Änderung der **Prosa** in `docs/factory/lessons/factory-workflow.md` (beschreibt das
  Problem historisch, kein auszuführender Befehl) → siehe Offene Fragen.
- Keine funktionale Änderung an Runtime-Code der App (nur Agenten-Instruktions-Markdown).

## Akzeptanzkriterien

- [ ] GIVEN lokales `main` liegt hinter `origin/main` (fremde PRs zwischenzeitlich gemergt)
      WHEN `/review` seinen Diff-Scope-Befehl ausführt
      THEN zeigt der Diff ausschließlich die Änderungen des aktuellen Feature-Branches
      (`git diff origin/main...HEAD`), nicht die fremden bereits gemergten PRs.
- [ ] GIVEN derselbe Zustand
      WHEN `/security-review` seinen Diff-Scope-Befehl ausführt
      THEN gilt dasselbe (`git diff origin/main...HEAD`).
- [ ] GIVEN derselbe Zustand
      WHEN `/refactor` seinen Diff-Scope-Befehl ausführt
      THEN gilt dasselbe (`git diff origin/main...HEAD`).
- [ ] GIVEN derselbe Zustand
      WHEN `/pr-shepherd` den Branch-Status erfasst (beide `git log`-Stellen)
      THEN listet `git log origin/main...HEAD --oneline` nur die Commits des eigenen Branches.
- [ ] GIVEN jede der vier Skill-Dateien
      WHEN sie ihren Git-Scope-Befehl nennt
      THEN steht davor ein `git fetch origin` (Aktualisierung des `origin/main`-Refs)
      und der Scope-Befehl verwendet `origin/main...HEAD`.
- [ ] GIVEN die vier committeten Skill-Dateien nach der Änderung
      WHEN in `.claude/commands/{review,security-review,refactor,pr-shepherd}.md` nach
      `main...HEAD` **ohne** vorangestelltes `origin/` gesucht wird
      THEN gibt es keinen Treffer mehr.

## Fehlerszenarien

- [ ] GIVEN keine Netzwerkverbindung / `git fetch origin` schlägt fehl
      WHEN ein Skill den Scope bestimmt
      THEN ist `fetch` best-effort formuliert (der Skill bricht nicht hart ab, sondern
      arbeitet mit dem vorhandenen `origin/main`-Ref weiter) – analog zur best-effort-Semantik
      in `start-work.sh` („Aktualisiere main (fetch, best-effort)").

## Verifikation (kein automatisiertes Gate)

Da nur Agenten-Instruktions-Markdown geändert wird (kein Runtime-Code), erfolgt die Prüfung
durch Inspektion der **committeten Live-Dateien** (nicht des transienten Patch-Artefakts,
vgl. Lesson aus #212):

```bash
# Muss leer sein:
grep -rnE "main\.\.\.HEAD" .claude/commands/{review,security-review,refactor,pr-shepherd}.md \
  | grep -v "origin/main"
# Muss 5 Treffer zeigen (origin/main-Scope):
grep -rnE "origin/main\.\.\.HEAD" .claude/commands/{review,security-review,refactor,pr-shepherd}.md
```

## Offene Fragen

- [ ] Soll die **Prosa** in `docs/factory/lessons/factory-workflow.md:308` (die die Skills mit
      `git diff main...HEAD` beschreibt) auf den umgesetzten Fix hin nachgezogen werden?
      → Vorschlag: im `/codify`-Schritt dieser Task erledigen, nicht hier.
