#!/usr/bin/env bash
# Production deploy for VPS 185.139.7.99 — host nginx + Docker (static IPs).
# Does NOT use compose prod reverse-proxy (system nginx owns 80/443).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=( -f compose.base.yml -f compose.host-edge.yml -f compose.vps-fix.yml )

if [ ! -f .env ]; then
  echo "Missing .env — copy docker/vps.env.example to .env (see docs/vps-deployment.md)" >&2
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
  : "${BFF__MATCHER__BASE_URL:?Set BFF__MATCHER__BASE_URL when COMPOSE_ML=1 (use http://172.28.0.22:8095 with vps-fix)}"
fi

"$ROOT/scripts/vps-migrate.sh" production

# Build one image at a time — 2-core / 4GB VPS OOMs if we build in parallel.
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE[@]}" build bff
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE[@]}" build kraftisium-web
if [ "$COMPOSE_ML" = "1" ]; then
  if [ "${SKIP_MATCHER_BUILD:-0}" = "1" ] && docker image inspect kraftisium-resume-matcher:latest >/dev/null 2>&1; then
    echo "Using preloaded kraftisium-resume-matcher:latest (SKIP_MATCHER_BUILD=1)"
  else
    docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE[@]}" build resume-matcher
  fi
fi
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE[@]}" up -d --remove-orphans

echo ""
echo "Stack up. Internal checks:"
sleep 8
curl -sf "http://172.28.0.20:8000/api/v1/health" | head -c 120 && echo
curl -sfI "http://172.28.0.21/" | head -3
if [ "$COMPOSE_ML" = "1" ]; then
  echo "Matcher:"
  curl -sf "http://172.28.0.22:8095/health" | head -c 200 && echo
fi
echo ""
echo "Public URLs need host nginx + TLS:"
echo "  sudo ./scripts/vps-fix-ssl-lineage.sh   # if api SSL fails after certbot"
echo "  curl https://api.kraftisium.xyz/api/v1/health"
