#!/usr/bin/env bash
# Issue or expand a SAN certificate using the certbot service from compose.prod.yml.
# Requires: .env with WEB_HOST, CERTBOT_EMAIL; stack up so reverse-proxy serves /.well-known/.
# Subdomain split (NGINX_SAME_ORIGIN=0): also set API_HOST.
# Same-origin (NGINX_SAME_ORIGIN=1): WEB_HOST only; API_HOST may equal WEB_HOST.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a
# shellcheck disable=SC1091
[ -f .env ] && . ./.env
set +a
: "${WEB_HOST:?Set WEB_HOST in .env}"
: "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in .env}"

DOMAINS=( -d "$WEB_HOST" )
if [ "${NGINX_SAME_ORIGIN:-0}" != "1" ]; then
  : "${API_HOST:?Set API_HOST in .env (or NGINX_SAME_ORIGIN=1 for same-origin)}"
  DOMAINS+=( -d "$API_HOST" )
elif [ -n "${API_HOST:-}" ] && [ "$API_HOST" != "$WEB_HOST" ]; then
  DOMAINS+=( -d "$API_HOST" )
fi

docker compose --profile cert -f compose.base.yml -f compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  "${DOMAINS[@]}" \
  --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email
