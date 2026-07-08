# Task 2: GitHub-Kompatibilität der Factory

## Status
- [ ] In Bearbeitung
- [ ] Fertig / PR erstellt

## Beschreibung
Die dm-Factory (ursprünglich GitLab) vollständig auf GitHub umstellen.
Entscheidung des Auftraggebers: GitHub ERSETZT GitLab (Single-Platform),
inkl. Portierung des automatischen Issue-Triggers (factory-poll) auf
GitHub Actions.

## Umfang
- CI: .gitlab-ci.yml → .github/workflows/ (factory-ci.yml + factory-poll.yml)
- Skripte: factory-poll.sh, start-work.sh, metrics.sh (glab → gh)
- Gate-Wording: pre-push.sh, run-pipeline.sh (MR → PR)
- Skills: pr-shepherd, daily-metrics, post-merge-verify, setup-project
- Self-Tests: run-tests.sh an GitHub-Artefakte + gh-Mocks anpassen
- Docs: README, CLAUDE.md, CONTRIBUTING, git-workflow, tasks/README
- ADR-012: Plattform-Migration GitLab → GitHub dokumentieren

## Akzeptanzkriterien
- [ ] Keine funktionalen glab-/GitLab-CI-Abhängigkeiten mehr im Code
- [ ] scripts/checks/tests/run-tests.sh läuft vollständig grün
- [ ] GitHub-Actions-Workflows bilden alle bisherigen CI-Gates ab
- [ ] factory-poll.sh nutzt gh + GitHub-Labels, Guards unverändert

---
Branch: `feature/2-github-kompatibilitaet`
