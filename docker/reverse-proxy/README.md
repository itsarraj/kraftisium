# Edge reverse proxy (dedicated VPS, ports 80/443)

The container picks HTTP or HTTPS config at startup:

- No cert yet → HTTP only (ACME webroot + proxy to backends)
- Cert at `/etc/letsencrypt/live/$CERT_PRIMARY_DOMAIN/` → HTTP redirects to HTTPS + TLS vhosts

## Modes (`NGINX_SAME_ORIGIN`)

| Value | Layout | Best for |
|-------|--------|----------|
| `0` (Kraftisium prod) | `WEB_HOST` → SPA, `API_HOST` → merged BFF | Web + mobile on separate API subdomain |
| `1` | Same-origin: `WEB_HOST` serves SPA; `/api/v1/*` → BFF | Single domain, no CORS |

Kraftisium production (VPS `45.154.197.90`):

```env
NGINX_SAME_ORIGIN=0
WEB_HOST=kraftisium.xyz
API_HOST=api.kraftisium.xyz
CERT_PRIMARY_DOMAIN=kraftisium.xyz
PUBLIC_WEB_URL=https://kraftisium.xyz
PUBLIC_BFF_URL=https://api.kraftisium.xyz
```

DNS: A records for `kraftisium.xyz` and `api.kraftisium.xyz` → `45.154.197.90`.

Mobile / web clients call `https://api.kraftisium.xyz/api/v1/...`. Web SPA on `kraftisium.xyz` needs BFF CORS to allow that origin (set via `PUBLIC_WEB_URL` → `BFF__EMAIL__FRONTEND_BASE_URL`).

## TLS workflow

1. `sudo systemctl disable --now nginx` if system nginx is installed (compose owns 80/443)
2. `./scripts/vps-deploy.sh` — stack up on HTTP
3. `./scripts/vps-issue-cert.sh` — certbot webroot via port 80 (both hostnames)
4. `docker compose -f compose.base.yml -f compose.prod.yml up -d --force-recreate reverse-proxy`

The entrypoint detects the new cert and enables HTTPS automatically.

## Host nginx alternative

If the machine already runs nginx on 80/443, use `compose.host-edge.yml` and `docker/host-nginx/*.conf.example` instead of this container.
