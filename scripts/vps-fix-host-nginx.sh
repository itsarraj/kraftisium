#!/usr/bin/env bash
# One-time VPS fixes requiring root. Run on 185.139.7.99 after docker deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Docker DNS (optional — skip restart if already configured) ==="
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
  echo '{"dns":["8.8.8.8","1.1.1.1"]}' > /etc/docker/daemon.json
  systemctl restart docker
  sleep 5
  echo "Docker restarted — re-run: ./scripts/vps-deploy-production.sh"
else
  echo "Keeping existing /etc/docker/daemon.json"
fi

echo "=== Host nginx — Arch uses conf.d (create if missing) ==="
mkdir -p /etc/nginx/conf.d /var/www/certbot
chmod 755 /var/www/certbot
grep -q 'conf.d' /etc/nginx/nginx.conf || \
  sed -i '/include.*mime.types/a\    include /etc/nginx/conf.d/*.conf;' /etc/nginx/nginx.conf

if [ ! -f /etc/letsencrypt/live/kraftisium.xyz/fullchain.pem ]; then
  echo "=== HTTP-only vhost for ACME ==="
  cat > /etc/nginx/conf.d/kraftisium.conf << 'NGINX'
server {
    listen 80;
    server_name kraftisium.xyz www.kraftisium.xyz api.kraftisium.xyz;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'ok'; add_header Content-Type text/plain; }
}
NGINX
  nginx -t
  systemctl reload nginx
fi

echo "=== ACME webroot + TLS cert ==="
certbot certonly --webroot -w /var/www/certbot \
  -d kraftisium.xyz -d www.kraftisium.xyz \
  -d api.kraftisium.xyz \
  --expand --non-interactive --agree-tos -m "${CERTBOT_EMAIL:-animesh080808@gmail.com}" \
  || certbot certonly --webroot -w /var/www/certbot \
  -d kraftisium.xyz -d www.kraftisium.xyz -d api.kraftisium.xyz \
  --non-interactive --agree-tos -m "${CERTBOT_EMAIL:-animesh080808@gmail.com}"

if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o /etc/letsencrypt/options-ssl-nginx.conf
  curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    -o /etc/letsencrypt/ssl-dhparams.pem
fi

echo "=== Full subdomain vhost (web + api) ==="
cp "$ROOT/docker/host-nginx/kraftisium-subdomain.conf.example" \
  /etc/nginx/conf.d/kraftisium.conf

echo "=== Point nginx at cert lineage that includes api.kraftisium.xyz ==="
"$ROOT/scripts/vps-fix-ssl-lineage.sh" /etc/nginx/conf.d/kraftisium.conf

echo "Done. Verify:"
echo "  curl https://api.kraftisium.xyz/api/v1/health"
echo "  curl -I https://kraftisium.xyz"
