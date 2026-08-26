#!/usr/bin/env bash
set -euo pipefail

ssh_host="${HIRN_SSH_HOST:-jieliulab3-codex}"
local_port="${HIRN_LOCAL_PORT:-18100}"
frontend_port="${PORT:-3001}"

if ! curl --silent --fail --max-time 2 "http://127.0.0.1:${local_port}/health" >/dev/null; then
  ssh -f -N -S none -o ExitOnForwardFailure=yes \
    -L "${local_port}:127.0.0.1:8100" "${ssh_host}"
fi

curl --silent --fail --max-time 5 "http://127.0.0.1:${local_port}/health" >/dev/null

export BROWSER=none
export DISABLE_ESLINT_PLUGIN=true
export PORT="${frontend_port}"
exec node scripts/start-hirn-webpack.js
