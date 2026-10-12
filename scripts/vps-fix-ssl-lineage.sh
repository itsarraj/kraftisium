#!/usr/bin/env bash
# Point host nginx at the Let's Encrypt lineage that includes api.kraftisium.xyz.
# Run with sudo after certbot (certbot may create kraftisium.xyz-0001).
set -euo pipefail

CONF="${1:-/etc/nginx/conf.d/kraftisium.conf}"
[ -f "$CONF" ] || { echo "Missing $CONF" >&2; exit 1; }

lineage=""
for dir in /etc/letsencrypt/live/*; do
  [ -f "$dir/fullchain.pem" ] || continue
  if openssl x509 -in "$dir/fullchain.pem" -noout -text 2>/dev/null | grep -q 'api.kraftisium.xyz'; then
    lineage="$(basename "$dir")"
    break
  fi
done

if [ -z "$lineage" ]; then
  echo "No certificate found covering api.kraftisium.xyz under /etc/letsencrypt/live/" >&2
  certbot certificates 2>/dev/null || true
  exit 1
fi

echo "Using certificate lineage: $lineage"
sed -i "s|/etc/letsencrypt/live/[^/]*/|/etc/letsencrypt/live/${lineage}/|g" "$CONF"
nginx -t
nginx -s reload
echo "OK — test: curl https://api.kraftisium.xyz/api/v1/health"
