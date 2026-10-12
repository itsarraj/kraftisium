#!/bin/sh
set -e

CERT="/etc/letsencrypt/live/${CERT_PRIMARY_DOMAIN}/fullchain.pem"
SAME_ORIGIN="${NGINX_SAME_ORIGIN:-0}"
SRC=/etc/nginx/template-src
TEMPLATES=/etc/nginx/templates

rm -rf "$TEMPLATES"/*
mkdir -p "$TEMPLATES"

if [ -f "$CERT" ]; then
  cp "$SRC/default-redirect.conf.template" "$TEMPLATES/default.conf.template"
  if [ "$SAME_ORIGIN" = "1" ]; then
    cp "$SRC/ssl-same-origin.conf.template" "$TEMPLATES/ssl.conf.template"
  else
    cp "$SRC/ssl-subdomain.conf.template" "$TEMPLATES/ssl.conf.template"
  fi
else
  if [ "$SAME_ORIGIN" = "1" ]; then
    cp "$SRC/default-same-origin.conf.template" "$TEMPLATES/default.conf.template"
  else
    cp "$SRC/default-subdomain.conf.template" "$TEMPLATES/default.conf.template"
  fi
fi

exec /docker-entrypoint.sh "$@"
