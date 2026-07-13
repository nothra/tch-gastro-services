#!/usr/bin/env bash
set -euo pipefail
PROJ="/Users/Ralf.Notheis/ws/TCH Gastro Services.worktrees/feature-67-health-rate-limit"
cd "$PROJ"
node_modules/.bin/vitest run lib/rate-limit.test.ts "app/api/health/route.test.ts" --reporter=verbose 2>&1
