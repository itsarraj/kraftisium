#!/usr/bin/env bash
# First production deploy on Arch VPS (host nginx + Docker static IPs).
# Run from repo root AFTER setup_kraftisium_arch_server.sh:
#   cd ~/kraftisium && sudo ./run_on_server/finish_vps_deploy.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo from ~/kraftisium:" >&2
  echo "  cd ~/kraftisium && sudo ./run_on_server/finish_vps_deploy.sh" >&2
  exit 1
fi

REAL_USER="${SUDO_USER:-prod}"
REPO="/home/${REAL_USER}/kraftisium"
cd "$REPO"

echo "=== Docker + nginx ==="
usermod -aG docker "$REAL_USER" 2>/dev/null || true
systemctl enable --now docker
systemctl enable --now nginx

if [[ ! -f .env ]]; then
  echo "Missing $REPO/.env — create from docker/vps.env.example first." >&2
  exit 1
fi
if [[ ! -f bff/.env ]]; then
  echo "Missing $REPO/bff/.env — copy production secrets from local bff/.env." >&2
  exit 1
fi

chown "${REAL_USER}:${REAL_USER}" .env bff/.env
chmod 600 .env bff/.env

set -a
# shellcheck disable=SC1091
source .env
set +a
: "${POSTGRES_PASSWORD:?}"
: "${JWT_SECRET:?}"
: "${PUBLIC_WEB_URL:?}"
: "${PUBLIC_BFF_URL:?}"

echo "=== Fix migrate DB name if needed ==="
sed -i 's/run_migrate bff bff/run_migrate bff kraftisium/' scripts/vps-migrate.sh

echo "=== Deploy stack (production / host-edge / vps-fix) ==="
# Run as root so docker works before ${REAL_USER} re-login picks up docker group.
./scripts/vps-deploy-production.sh

echo "=== Host nginx + TLS ==="
export CERTBOT_EMAIL="${CERTBOT_EMAIL:-animesh080808@gmail.com}"
./scripts/vps-fix-host-nginx.sh

echo ""
echo "=== Verify ==="
sleep 3
curl -sf "https://api.kraftisium.xyz/api/v1/health" && echo
curl -sfI "https://kraftisium.xyz" | head -3

echo ""
echo "Deploy complete."
echo "  Web:  ${PUBLIC_WEB_URL}"
echo "  API:  ${PUBLIC_BFF_URL}"
echo "Add Google OAuth redirect: ${PUBLIC_BFF_URL}/api/v1/auth/google/callback"
echo "Razorpay webhook: ${PUBLIC_BFF_URL}/api/v1/payments/webhook"
echo "Log out and back in (or new SSH session) so user ${REAL_USER} has docker group access."
