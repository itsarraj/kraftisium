#!/usr/bin/env bash
# Deploy behind existing host nginx (loopback ports 14680 and 14682). See compose.host-edge.yml
# and docker/host-nginx/*.conf.example for TLS on the host.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILES=( -f compose.base.yml -f compose.host-edge.yml )

if [ ! -f .env ]; then
  echo "Missing .env — copy docker/vps.env.example to .env and set secrets and PUBLIC_* URLs." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a
: "${POSTGRES_PASSWORD:?}"
: "${JWT_SECRET:?}"
: "${PUBLIC_WEB_URL:?}"
: "${PUBLIC_BFF_URL:?}"

COMPOSE_ML="${COMPOSE_ML:-0}"
COMPOSE_PROFILE=()
if [ "$COMPOSE_ML" = "1" ]; then
  COMPOSE_PROFILE=( --profile ml )
  : "${BFF__MATCHER__BASE_URL:?Set BFF__MATCHER__BASE_URL when COMPOSE_ML=1}"
fi

"$ROOT/scripts/vps-migrate.sh" host

# Build one image at a time to limit peak RAM on small VPS hosts.
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" build bff
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" build kraftisium-web
if [ "$COMPOSE_ML" = "1" ]; then
  docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" build resume-matcher
fi
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" up -d

echo "Services bound on loopback (host nginx should proxy here):"
echo "  web       http://127.0.0.1:14680"
echo "  bff       http://127.0.0.1:14682"
if [ "$COMPOSE_ML" = "1" ]; then
  echo "  matcher   http://127.0.0.1:14685 (internal; BFF uses docker network)"
fi
sleep 5
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" ps

echo ""
echo "Install nginx: ./scripts/vps-apply-kraftisium-nginx.sh (same-origin) or copy technetium example."
