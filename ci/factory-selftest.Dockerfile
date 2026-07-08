# Runtime-Image für den `factory-self-test`-CI-Job.
#
# Enthält genau die drei Tools, die die Self-Test-Suite
# (scripts/checks/tests/run-tests.sh) braucht:
#   - bash : die Check-Skripte sind Bash, nicht POSIX-sh
#   - git  : Preflight-/Interrupt-Tests legen echte Repos via `git init` an
#   - jq   : check.sh parst den Hook-Input (stdin-JSON) mit jq
#   - yq   : run-pipeline.sh liest factory.defaults.yml (ADR-009, Phase 1b)
#
# Warum ein eigenes Image statt `apk add` im before_script?
#   Vorher installierte jeder Lauf `bash git jq` neu auf `alpine:latest`
#   (Netzwerk-Roundtrip + Install bei JEDER Pipeline). Dieses Image bäckt die
#   Tools einmalig ein (~26 MB) und wird nur neu gebaut, wenn dieses Dockerfile
#   sich ändert (siehe build-selftest-image in .gitlab-ci.yml).
#
# Kein passendes kleines Public-Image: alpine/git hat nur git, bitnami/git kein
# jq; die einzigen Public-Images mit allen dreien sind k8s-Toolboxen
# (179–769 MB) – deren Pull wäre langsamer als das ersetzte `apk add`.
#
# alpine ist auf major.minor gepinnt für reproduzierbare Builds.
FROM alpine:3.21

RUN apk add --no-cache bash git jq yq

# Dokumentiert die Tool-Versionen im Build-Log (rein informativ).
RUN bash --version | head -1 && git --version && jq --version && yq --version
