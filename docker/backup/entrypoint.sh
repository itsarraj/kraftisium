#!/usr/bin/env bash
# Runs backup.sh on a loop instead of via a cron daemon — simpler to reason
# about in a single container, same pattern as everything else in this repo.
set -euo pipefail

INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"

echo "[backup] starting, interval=${INTERVAL_SECONDS}s"

while true; do
  if ! /usr/local/bin/backup.sh; then
    echo "[backup] run failed at $(date -u '+%Y-%m-%dT%H:%M:%SZ')" >&2
  fi
  sleep "$INTERVAL_SECONDS"
done
