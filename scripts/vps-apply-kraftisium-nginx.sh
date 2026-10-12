#!/usr/bin/env bash
# Install Kraftisium nginx (same-origin /api split). Run on the VPS with sudo.
# Prerequisites: DNS A records for kraftisium.xyz and api.kraftisium.xyz; certbot certs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
sudo cp "$ROOT/docker/host-nginx/kraftisium-matchmyresume.xyz.conf.example" \
  /etc/nginx/conf.d/kraftisium.xyz.conf
sudo nginx -t
sudo nginx -s reload
echo "Installed /etc/nginx/conf.d/kraftisium.xyz.conf and reloaded nginx."
