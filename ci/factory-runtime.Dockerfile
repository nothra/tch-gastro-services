# Runtime-Image für den async Factory-Lauf (ADR-008, Spur A / Issue #10).
#
# Anders als das factory-selftest-Image (nur bash/git/jq für die Check-Suite)
# braucht der async-Lauf die **claude-CLI** plus glab (Issue-/Label-API) und
# curl. lint/test laufen weiter auf nacktem alpine – dieses Image ist NUR für
# den Scheduled-Poll-/Pipeline-Job.
#
# Wird analog zum selftest-Image via kaniko gebaut und nur neu gebaut, wenn sich
# dieses Dockerfile ändert (siehe build-runtime-image in .gitlab-ci.yml).
#
# ⚠️ Spur B (GitLab-Setup, nicht in diesem MR verifizierbar):
#   - Image muss in die Project Registry gebaut sein, bevor factory-poll läuft.
#   - Versionen unten bei Bedarf pinnen (Reproduzierbarkeit).

FROM node:22-alpine

# Basis-Tools: bash (Skripte), git (Branch/Commit), jq (JSON), curl (Healthcheck/Install)
RUN apk add --no-cache bash git jq yq curl

# glab (GitLab CLI) – Issue-Abfrage + Label-Transitionen im Poll-Skript
ARG GLAB_VERSION=1.64.0
RUN curl -sSL "https://gitlab.com/gitlab-org/cli/-/releases/v${GLAB_VERSION}/downloads/glab_${GLAB_VERSION}_linux_amd64.tar.gz" \
      | tar -xz -C /usr/local bin/glab \
    && glab --version

# claude-CLI – führt die eigentlichen Pipeline-Schritte aus (run-pipeline.sh)
# Version über ARG pinnbar (N-1): für reproduzierbare Builds in Spur B auf eine
# konkrete Version setzen (--build-arg CLAUDE_CODE_VERSION=x.y.z), nicht "latest".
ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
    && claude --version

# Auth + Modelle kommen zur Laufzeit aus CI/CD-Variablen (V-0):
#   ANTHROPIC_API_KEY  (masked)  – oder ANTHROPIC_BASE_URL für ein Gateway (#17)
#   GITLAB_TOKEN       (masked)  – write_repository für glab-Mutationen (V-1)
