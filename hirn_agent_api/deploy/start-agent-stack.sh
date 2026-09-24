#!/usr/bin/env bash
set -euo pipefail

agent_root="/nfs/turbo/umms-drjieliu/proj/hirn-literature-agent-api"
demo_root="/nfs/turbo/umms-drjieliu/proj/hirn-agent-public-demo"
agent_health="http://127.0.0.1:8102/health"
demo_health="http://127.0.0.1:8101/health"
agent_pid_file="${agent_root}/var/agent.pid"

mkdir -p "${agent_root}/var"
chmod 700 "${agent_root}/var"
exec 9>"${agent_root}/var/start.lock"
flock -n 9 || exit 0

is_healthy() {
  curl --silent --fail --max-time 3 "$1" >/dev/null 2>&1
}

if ! is_healthy "${demo_health}"; then
  nohup "${demo_root}/start-public-demo.sh" \
    >>"${demo_root}/var/hirn.log" 2>&1 &
  echo "$!" >"${demo_root}/var/hirn.pid"
  for _ in $(seq 1 60); do
    is_healthy "${demo_health}" && break
    sleep 2
  done
fi

if ! is_healthy "${demo_health}"; then
  echo "HIRN demo dependency did not become healthy" >&2
  exit 1
fi

if is_healthy "${agent_health}"; then
  exit 0
fi

if [[ -f "${agent_pid_file}" ]]; then
  previous_pid=$(tr -cd '0-9' <"${agent_pid_file}")
  if [[ -n "${previous_pid}" ]] && kill -0 "${previous_pid}" 2>/dev/null; then
    kill "${previous_pid}"
    for _ in $(seq 1 20); do
      kill -0 "${previous_pid}" 2>/dev/null || break
      sleep 0.25
    done
  fi
fi

cd "${agent_root}"
umask 077
nohup env \
  ANTHROPIC_API_KEY_FILE="${agent_root}/secrets/anthropic_api_key.txt" \
  HIRN_AGENT_HIRN_API_BASE="http://127.0.0.1:8101" \
  HIRN_AGENT_USAGE_DB="${agent_root}/var/usage.sqlite3" \
  HIRN_AGENT_WARNING_USD="100" \
  HIRN_AGENT_ALLOW_ORIGINS="https://dev.pankgraph.org,http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3001,http://127.0.0.1:3002" \
  "${agent_root}/.venv/bin/python" -m uvicorn hirn_agent_api.app:app \
    --host 127.0.0.1 --port 8102 --workers 1 \
    >>"${agent_root}/var/agent.log" 2>&1 &
echo "$!" >"${agent_pid_file}"

for _ in $(seq 1 60); do
  is_healthy "${agent_health}" && exit 0
  sleep 1
done

echo "HIRN agent API did not become healthy" >&2
exit 1
