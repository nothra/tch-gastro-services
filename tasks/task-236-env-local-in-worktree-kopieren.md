# Task 236: env-local-in-worktree-kopieren

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

`start-work.sh` legt jede Task in einem eigenen Worktree an; die gitignorete `.env.local`
wandert dabei nicht mit. Da alle DEV-Skripte (`test:e2e`, `db:migrate`, `db:seed`, `db:studio`)
ihre Konfiguration per `dotenv -e .env.local` laden, scheitert der erste E2E-Lauf im frischen
Worktree mit einem irreführenden `CredentialsSignin` – in #228 zunächst fälschlich als echte
Regression gedeutet. Diese Task ist der dort ausgelagerte Root-Cause-Fix: `start-work.sh`
kopiert `.env.local` beim Anlegen des Worktrees automatisch mit und weist auf einen ggf.
nötigen `pnpm db:seed`-Lauf hin.

Spec: [`docs/specs/spec-236-env-local-in-worktree-kopieren.md`](../docs/specs/spec-236-env-local-in-worktree-kopieren.md)

**Zuschnitt-Entscheidungen (in /requirements getroffen):** nur `.env.local` kopieren (nicht
`.env.int`/`.env.prd` – Least Privilege); `db:seed` nur als Hinweis, nicht automatisch
ausführen (keine Seiteneffekte auf die geteilte DEV-DB).

## Akzeptanzkriterien

- [ ] AK1 · GIVEN Haupt-Baum hat `.env.local` WHEN `start-work.sh` einen Worktree anlegt THEN
      liegt dort eine byte-identische `.env.local`, und der Output nennt das Kopieren
- [ ] AK2 · GIVEN Haupt-Baum hat keine `.env.local` WHEN `start-work.sh` läuft THEN exit 0,
      keine `.env.local` im Worktree, kein Fehler
- [ ] AK3 · GIVEN Ziel-Worktree hat bereits eine abweichende `.env.local` WHEN `start-work.sh`
      erneut läuft THEN bleibt sie unverändert (nie überschreiben) und der Output nennt das
      Überspringen
- [ ] AK4 · GIVEN `FACTORY_WT_SKIP_ENV=1` WHEN `start-work.sh` einen Worktree anlegt THEN wird
      nicht kopiert
- [ ] AK5 · GIVEN Quelle hat Modus `600` WHEN kopiert wird THEN hat die Kopie ebenfalls `600`
- [ ] AK6 · GIVEN `.env.local` wurde kopiert WHEN der Abschluss-Output entsteht THEN enthält er
      einen `pnpm db:seed`-Hinweis
- [ ] AK7 · GIVEN nichts wurde kopiert WHEN der Abschluss-Output entsteht THEN enthält er
      **keinen** `pnpm db:seed`-Hinweis (Spiegel zu AK6)
- [ ] AK8 · GIVEN `FACTORY_NO_WORKTREE=1` WHEN `start-work.sh` läuft THEN keine Kopieraktion,
      Verhalten unverändert
- [ ] AK9 · Doku-Drift im selben PR nachgezogen: Lesson (`factory-workflow.md`),
      Index-Zeile (`PROJECT-CONTEXT.md`), Env-Schalter-Liste (`git-workflow.md`),
      Kopf-Kommentar (`start-work.sh`)

## Fehlerszenarien

- [ ] Kopieren schlägt fehl → Warnung, kein Abbruch (analog `pnpm install`, `start-work.sh:219`;
      `set -euo pipefail` beachten)
- [ ] Wiederverwendeter Worktree → Kopier-Schritt läuft, greift aber nur bei fehlender Zieldatei
- [ ] Quelle ist Verzeichnis/Symlink → wird wie „Quelle fehlt" (AK2) behandelt

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Kein ADR-Trigger (lokale Tooling-Ergonomie, reversibel, keine Architektur-Entscheidung) →
nach diesem Schritt direkt `/implement 236`.

- Einbau im Worktree-Zweig von `scripts/start-work.sh` nach `worktree add` (`:200-211`),
  **vor** dem `pnpm install`-Block (`:214-221`)
- Rechte-Erhalt via `cp -p` (portabel macOS/BSD + GNU)
- Tests in den bestehenden Block `scripts/checks/tests/run-tests.sh:1799+` einhängen
  (vorhandene Fixtures wiederverwenden, keine parallele Fixture-Landschaft)

## Offene Fragen

_Keine offenen Fragen._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/236-env-local-in-worktree-kopieren`
Erstellt: 2026-08-14 19:44
