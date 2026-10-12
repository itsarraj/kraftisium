#!/usr/bin/env bash
# Full VPS deploy: migrate DB, build SPA with PUBLIC_* from .env, start stack (HTTP nginx until certs exist).
# TLS: after DNS points here and stack is up, run ./scripts/vps-issue-cert.sh then recreate reverse-proxy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILES=( -f compose.base.yml -f compose.prod.yml )

if [ ! -f .env ]; then
  echo "Missing .env — copy docker/vps.env.example to .env and set secrets, PUBLIC_*, CERTBOT_EMAIL." >&2
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

"$ROOT/scripts/vps-migrate.sh"

docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" build bff
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" build kraftisium-web reverse-proxy
if [ "$COMPOSE_ML" = "1" ]; then
  docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" build resume-matcher
fi
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" up -d

echo "Stack is up:"
sleep 5
docker compose "${COMPOSE_PROFILE[@]}" "${COMPOSE_FILES[@]}" ps

echo ""
echo "TLS: when A records for WEB_HOST (and API_HOST if subdomain split) reach this host, run ./scripts/vps-issue-cert.sh"
echo "then: docker compose -f compose.base.yml -f compose.prod.yml up -d --force-recreate reverse-proxy"
if [ "$COMPOSE_ML" = "1" ]; then
  echo "ML matcher: resume-matcher profile enabled (BFF__MATCHER__BASE_URL=${BFF__MATCHER__BASE_URL})"
else
  echo "AI matches: keyword-only in BFF (set COMPOSE_ML=1 + BFF__MATCHER__BASE_URL for embeddings worker)"
fi
