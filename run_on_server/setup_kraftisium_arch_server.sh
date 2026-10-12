#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PKGLIST="${SCRIPT_DIR}/pkglist_kraftisium_server.txt"

if [[ ! -f "${PKGLIST}" ]]; then
  echo "Package list not found: ${PKGLIST}" >&2
  exit 1
fi

if [[ "${EUID}" -eq 0 ]]; then
  echo "Run this script as your normal sudo user, not as root." >&2
  echo "Example: ./setup_kraftisium_arch_server.sh" >&2
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required." >&2
  exit 1
fi

echo "Updating system and installing Kraftisium server packages..."
sudo pacman -Syu --needed --noconfirm
sudo pacman -S --needed --noconfirm - < "${PKGLIST}"

echo "Configuring Rust stable toolchain (local bff dev / sqlx)..."
if command -v rustup >/dev/null 2>&1; then
  rustup default stable
fi

echo "Enabling core runtime services..."
sudo systemctl enable --now sshd
sudo systemctl enable --now docker
sudo systemctl enable --now nginx
# Optional native dev (Docker stack uses container Postgres/Redis instead):
# sudo systemctl enable --now postgresql valkey

echo "Enabling firewall with SSH, HTTP, and HTTPS allowed..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "Setup complete."
echo
echo "Next steps (recommended: Docker deploy):"
echo "Full guide: docs/vps-deployment.md"
echo "1. Clone the repo and cd into it."
echo "2. cp docker/vps.env.example .env — set POSTGRES_PASSWORD, JWT_SECRET, PUBLIC_* URLs."
echo "3. cp bff/.env.example bff/.env — set email, OAuth, Razorpay secrets with production URLs."
echo "4. Production (host nginx + static Docker IPs — technetium layout):"
echo "     sudo ./run_on_server/finish_vps_deploy.sh"
echo "   Or step by step:"
echo "     ./scripts/vps-deploy-production.sh"
echo "     sudo ./scripts/vps-fix-host-nginx.sh"
echo "5. Alternate: Docker owns 80/443 — sudo systemctl disable --now nginx; ./scripts/vps-deploy.sh"
echo "6. Optional hybrid AI matcher (CPU-heavy): set COMPOSE_ML=1 and BFF__MATCHER__BASE_URL in .env, redeploy."
echo "7. Mobile app: EXPO_PUBLIC_BFF_API_URL=https://api.kraftisium.xyz (see app/.env.example)."
echo
echo "Local dev without Docker: start Postgres/Redis/rustfs, cd bff && cargo run; cd ui && npm run dev;"
echo "see ai-tests/README-matcher.md for the embedding worker."
