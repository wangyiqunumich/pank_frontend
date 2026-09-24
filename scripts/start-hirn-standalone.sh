#!/usr/bin/env bash
set -euo pipefail

ssh_host="${HIRN_SSH_HOST:-jieliulab3-codex}"
local_port="${HIRN_LOCAL_PORT:-18100}"
demo_port="${HIRN_DEMO_PORT:-3002}"

if ! curl --silent --fail --max-time 2 "http://127.0.0.1:${local_port}/health" >/dev/null; then
  ssh -f -N -S none -o ExitOnForwardFailure=yes \
    -L "${local_port}:127.0.0.1:8100" "${ssh_host}"
fi

exec python3 -m http.server "${demo_port}" --directory standalone-demo
