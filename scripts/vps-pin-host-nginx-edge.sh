#!/usr/bin/env bash
# Pin host nginx as the public edge (80/443) for Kraftisium on a k3s VPS.
# - Traefik stays ClusterIP (no klipper-lb hostPort hijack)
# - nginx proxies kraftisium.xyz + api.kraftisium.xyz to Docker static IPs
#
# Run on the VPS with sudo from repo root:
#   sudo ./scripts/vps-pin-host-nginx-edge.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo from the job-search-app repo root." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== k3s: disable ServiceLB (klipper) — host nginx owns 80/443 ==="
mkdir -p /etc/rancher/k3s
if [[ -f /etc/rancher/k3s/config.yaml ]]; then
  if ! grep -q 'servicelb' /etc/rancher/k3s/config.yaml; then
    printf '\ndisable:\n  - servicelb\n' >> /etc/rancher/k3s/config.yaml
    echo "Appended disable: servicelb to /etc/rancher/k3s/config.yaml (restart k3s to apply)"
  fi
else
  cat > /etc/rancher/k3s/config.yaml <<'K3S'
# Host nginx is the public edge for Kraftisium; do not bind LB services on 80/443.
disable:
  - servicelb
K3S
  echo "Wrote /etc/rancher/k3s/config.yaml (restart k3s to apply servicelb disable)"
fi

echo "=== k3s: Traefik ClusterIP (in-cluster only) ==="
mkdir -p /var/lib/rancher/k3s/server/manifests
cp "$ROOT/run_on_server/k3s-traefik-clusterip.yaml" \
  /var/lib/rancher/k3s/server/manifests/k3s-traefik-clusterip.yaml

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
if command -v kubectl >/dev/null && kubectl get svc -n kube-system traefik >/dev/null 2>&1; then
  kubectl -n kube-system patch svc traefik -p '{"spec":{"type":"ClusterIP"}}' || true
  kubectl -n kube-system delete daemonset -l app=svclb-traefik --ignore-not-found
  for _ in $(seq 1 30); do
    typ="$(kubectl -n kube-system get svc traefik -o jsonpath='{.spec.type}' 2>/dev/null || true)"
    [[ "$typ" == "ClusterIP" ]] && break
    sleep 2
  done
  kubectl -n kube-system get svc traefik
  if kubectl get pods -A 2>/dev/null | grep -q svclb-traefik; then
    echo "WARNING: svclb-traefik still running — run: systemctl restart k3s" >&2
  else
    echo "No svclb-traefik pods (good)."
  fi
fi

echo "=== nginx: Kraftisium vhost + TLS paths ==="
mkdir -p /etc/nginx/conf.d /var/www/certbot
chmod 755 /var/www/certbot
grep -q 'conf.d' /etc/nginx/nginx.conf || \
  sed -i '/include.*mime.types/a\    include /etc/nginx/conf.d/*.conf;' /etc/nginx/nginx.conf

cp "$ROOT/docker/host-nginx/kraftisium-subdomain.conf.example" /etc/nginx/conf.d/kraftisium.conf
"$ROOT/scripts/vps-fix-ssl-lineage.sh" /etc/nginx/conf.d/kraftisium.conf

# Drop the stock localhost vhost from nginx.conf (conf.d already has Kraftisium).
if grep -q 'server_name  localhost;' /etc/nginx/nginx.conf; then
  cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak."$(date +%Y%m%d%H%M%S)"
  python3 - <<'PY'
from pathlib import Path
p = Path("/etc/nginx/nginx.conf")
text = p.read_text()
start = text.find("    server {\n        listen       80;\n        server_name  localhost;")
if start != -1:
    depth = 0
    i = start
    while i < len(text):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
        i += 1
    else:
        raise SystemExit("could not find end of localhost server block")
    text = text[:start] + text[end:]
    p.write_text(text)
    print("Removed default localhost server block from nginx.conf")
else:
    print("No localhost server block in nginx.conf (already removed)")
PY
fi

systemctl enable nginx
nginx -t
systemctl reload nginx

echo "=== listeners (nginx should own 80/443) ==="
ss -tlnp | grep -E ':80|:443' || true

echo "=== verify ==="
sleep 2
curl -sfI --resolve kraftisium.xyz:443:127.0.0.1 https://kraftisium.xyz/ | head -5
curl -sf --resolve api.kraftisium.xyz:443:127.0.0.1 https://api.kraftisium.xyz/api/v1/health
echo
echo "Host nginx edge pinned. Public: https://kraftisium.xyz  https://api.kraftisium.xyz"
