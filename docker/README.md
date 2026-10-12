# Docker — complete reference

Kraftisium runs entirely in Docker Compose. Project name: `kraftisium` (from `compose.base.yml`).

For a step-by-step new VPS guide see [docs/new-vps-setup.md](../docs/new-vps-setup.md).  
Live production snapshot: [docs/vps-production-state.md](../docs/vps-production-state.md).

## Compose file matrix

| File | Purpose | When to use |
|------|---------|-------------|
| `compose.base.yml` | Always required — postgres, redis, rustfs, bff, web, optional matcher | Every environment |
| `compose.dev.yml` | Published ports, dev nginx proxy in web container | Local laptop |
| `compose.prod.yml` | Docker edge nginx + certbot on 80/443 | Fresh VPS, no system nginx |
| `compose.host-edge.yml` | Loopback port publish (14680/14682) | VPS with host nginx on 80/443 |
| `compose.vps-fix.yml` | Static container IPs, no port publish, IP-based service discovery | Broken Docker DNS/iptables on host |

### Compose commands by scenario

Local dev:

```bash
docker compose -f compose.base.yml -f compose.dev.yml up -d --build
./scripts/vps-migrate.sh dev
```

Dedicated VPS (Docker owns 80/443):

```bash
docker compose -f compose.base.yml -f compose.prod.yml up -d --build
./scripts/vps-migrate.sh vps
```

Host nginx + loopback (healthy Docker):

```bash
docker compose -f compose.base.yml -f compose.host-edge.yml up -d --build
./scripts/vps-migrate.sh host
```

Host nginx + static IPs (production 45.154.197.90):

```bash
docker compose -f compose.base.yml -f compose.host-edge.yml -f compose.vps-fix.yml up -d --build
./scripts/vps-migrate.sh production
```

Or use `./scripts/vps-deploy-production.sh` (runs migrate + build + up).

## Services

### postgres

| | |
|---|---|
| Image | `postgres:16-bookworm` |
| User / DB | `seekers` / `bff` |
| Password | `POSTGRES_PASSWORD` from root `.env` |
| Volume | `postgres_data` → `/var/lib/postgresql/data` |
| Init mount | `./docker/postgres/init` (optional one-off SQL only; schema via sqlx) |
| Health | `pg_isready -U seekers -d kraftisium` |
| Static IP (vps-fix) | `172.28.0.10` |

### redis

| | |
|---|---|
| Image | `redis:7-alpine` |
| Command | AOF persistence |
| Volume | `redis_data` |
| Health | `redis-cli ping` |
| Static IP (vps-fix) | `172.28.0.11` |

### rustfs (S3-compatible object storage)

| | |
|---|---|
| Image | `rustfs/rustfs:latest` |
| Endpoint (inside compose) | `http://rustfs:9000` |
| Default creds | `rustfsadmin` / `rustfsadmin` (via `RUSTFS_ALLOW_INSECURE_DEFAULT_CREDENTIALS`) |
| Bucket | `resumes` (BFF creates/uses via config) |
| Volumes | `rustfs_data`, `rustfs_logs` |
| Dev ports | `9000` API, `9001` console |
| Static IP (vps-fix) | `172.28.0.12` |

### bff (merged Rust API)

| | |
|---|---|
| Build | `./bff/Dockerfile` |
| Binary | `/app/bff` on port `8000` |
| Config baked in | `bff/configuration.docker.yaml` → `/app/configuration.yaml` |
| Migrations in image | `./bff/migrations/` |
| Env file | `./bff/.env` (Resend key, etc.) |
| Compose overrides | DB/redis/rustfs hosts, JWT, email URLs, matcher |
| Health | `GET /api/v1/health` |
| Static IP (vps-fix) | `172.28.0.20` |

Build notes:

- No committed `Cargo.lock` — Dockerfile runs `cargo generate-lockfile` then `cargo build --release`
- First build on VPS ~10 min (single job: `CARGO_BUILD_JOBS=1`)

Key runtime env (set by compose):

```
BFF__APPLICATION_HOST=0.0.0.0
BFF__DATABASE__HOST=postgres          # or 172.28.0.10 with vps-fix
BFF__REDIS__HOST=redis                # or 172.28.0.11 with vps-fix
BFF__OBJECT_STORAGE__ENDPOINT=http://rustfs:9000
BFF__JWT__SECRET=${JWT_SECRET}
BFF__EMAIL__FRONTEND_BASE_URL=${PUBLIC_WEB_URL}
BFF__EMAIL__BASE_URL=${PUBLIC_BFF_URL}   # prod overlays only
DATABASE_URL=postgres://seekers:...@postgres:5432/bff
```

### kraftisium-web (React SPA)

| | |
|---|---|
| Build | `./ui/Dockerfile` (Node build → nginx alpine) |
| Port | `80` inside container |
| Build args | `VITE_BFF_API_URL`, `VITE_BFF_API_VERSION`, `NGINX_CONF` |
| Prod API URL | From `PUBLIC_BFF_URL` (subdomain) or `__RELATIVE__` (same-origin) |
| Dev nginx | `nginx.dev.conf` proxies `/api/v1` → BFF |
| Prod nginx | `nginx.conf` — static SPA only, browser calls API subdomain |
| Static IP (vps-fix) | `172.28.0.21` |

Rebuild required when `PUBLIC_BFF_URL` or `PUBLIC_WEB_URL` changes (baked at build time).

### reverse-proxy (compose.prod only)

| | |
|---|---|
| Build | `./docker/reverse-proxy/Dockerfile` |
| Ports | `80:80`, `443:443` |
| Templates | subdomain / same-origin / redirect / ssl variants |
| Certs volume | `certbot_conf` → `/etc/letsencrypt` |
| Webroot volume | `certbot_www` → `/var/www/certbot` |
| Mode | `NGINX_SAME_ORIGIN=0` (subdomain) or `1` (same-origin) |

Entrypoint picks HTTP-only until cert exists at `/etc/letsencrypt/live/$CERT_PRIMARY_DOMAIN/`, then enables HTTPS. See [reverse-proxy/README.md](reverse-proxy/README.md).

### certbot (compose.prod, profile `cert`)

| | |
|---|---|
| Image | `certbot/certbot:v2.11.0` |
| Usage | `./scripts/vps-issue-cert.sh` |

### backup (compose.prod only)

| | |
|---|---|
| Build | `./docker/backup/Dockerfile` |
| Schedule | Every `BACKUP_INTERVAL_SECONDS` (default 24h), looped inside the container |
| What | `pg_dump` + a mirror of the RustFS bucket, pushed to an S3-compatible target off the VPS |
| Config | `BACKUP_S3_ENDPOINT` / `BACKUP_S3_BUCKET` / `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` (required — container refuses to start without them) |

postgres and rustfs both live on the same VPS disk with no other redundancy — see [docker/backup/README.md](backup/README.md) for setup and restore steps.

### resume-matcher (optional, profile `ml`)

| | |
|---|---|
| Build | `./ai-tests/Dockerfile.matcher` |
| Port | `8095` |
| Enable | `COMPOSE_ML=1` + `BFF__MATCHER__BASE_URL=http://resume-matcher:8095` |
| Host-edge loopback | `127.0.0.1:14685` |

Heavy CPU/RAM (sentence-transformers). Off by default in production.

## Volumes

| Volume | Service | Data |
|--------|---------|------|
| `postgres_data` | postgres | All app data |
| `redis_data` | redis | Sessions/cache |
| `rustfs_data` | rustfs | Uploaded resumes |
| `rustfs_logs` | rustfs | RustFS logs |
| `certbot_conf` | reverse-proxy, certbot | TLS certs (prod path only) |
| `certbot_www` | reverse-proxy, certbot | ACME webroot (prod path only) |

Backup before migration: `postgres_data` and `rustfs_data` are the critical volumes.

```bash
docker volume ls | grep kraftisium
```

## Networks

Default bridge network: `kraftisium_default`.

With `compose.vps-fix.yml`:

- Subnet: `172.28.0.0/24`
- Static IPs assigned (see services table above)
- BFF uses IP literals instead of Docker DNS hostnames
- No `ports:` published on bff/web (host nginx reaches containers by IP)

## Port map

### compose.dev.yml (local)

| Host | Container | Service |
|------|-----------|---------|
| 80 | 80 | web |
| 8000 | 8000 | bff |
| 9000 | 9000 | rustfs API |
| 9001 | 9001 | rustfs console |
| 8095 | 8095 | matcher (profile ml) |

Override via `.env`: `WEB_HOST_PORT`, `BFF_HOST_PORT`, etc.

### compose.host-edge.yml (loopback)

| Host | Container | Service |
|------|-----------|---------|
| 127.0.0.1:14680 | 80 | web |
| 127.0.0.1:14682 | 8000 | bff |
| 127.0.0.1:14685 | 8095 | matcher (profile ml) |

Override: `WEB_HOST_EDGE_PORT`, `BFF_HOST_EDGE_PORT`, `MATCHER_HOST_EDGE_PORT`.

### compose.prod.yml

| Host | Container | Service |
|------|-----------|---------|
| 80 | 80 | reverse-proxy |
| 443 | 443 | reverse-proxy |

### compose.vps-fix.yml

No host ports. Host nginx proxies to container IPs directly.

## Environment files

| File | Role |
|------|------|
| Root `.env` | Compose substitution, deploy scripts — copy from `docker/vps.env.example` or `docs/env/vps.prod.env` |
| `bff/.env` | Resend, subscription tuning — copy from `docs/env/bff.prod.env` |
| `ui/.env` | Local Vite only (ignored in Docker prod build) |
| `app/.env` | Expo bundle time |

Full variable list: [docs/env-reference.md](../docs/env-reference.md).

Production subdomain split (Kraftisium):

```env
PUBLIC_WEB_URL=https://kraftisium.xyz
PUBLIC_BFF_URL=https://api.kraftisium.xyz
WEB_HOST=kraftisium.xyz
API_HOST=api.kraftisium.xyz
CERT_PRIMARY_DOMAIN=kraftisium.xyz
NGINX_SAME_ORIGIN=0
CERTBOT_EMAIL=you@example.com
COMPOSE_ML=0
POSTGRES_PASSWORD=...
JWT_SECRET=...
```

## Deploy scripts

| Script | Compose stack | Edge TLS |
|--------|---------------|----------|
| `./scripts/vps-deploy.sh` | base + prod | Docker reverse-proxy + `vps-issue-cert.sh` |
| `./scripts/vps-deploy-host-edge.sh` | base + host-edge | Host nginx (loopback) |
| `./scripts/vps-deploy-production.sh` | base + host-edge + vps-fix | Host nginx (static IPs) |
| `./scripts/vps-migrate.sh [dev\|vps\|host\|production]` | matches overlay | — |
| `./scripts/vps-issue-cert.sh` | certbot via prod stack | Docker certbot |
| `./scripts/vps-fix-host-nginx.sh` | — | Host certbot + nginx install (sudo) |
| `./scripts/vps-fix-ssl-lineage.sh` | — | Fix cert path after certbot `-0001` lineage (sudo) |

## Migrations

Schema: single file `bff/migrations/001_initial_schema.sql`.

Runner: `nxyt/sqlx-cli:v0.70` in ephemeral container, connects to postgres by container IP (works when Docker DNS is broken).

```bash
./scripts/vps-migrate.sh dev          # local
./scripts/vps-migrate.sh vps          # compose.prod
./scripts/vps-migrate.sh host         # host-edge loopback
./scripts/vps-migrate.sh production   # host-edge + vps-fix (45.154.197.90)
```

## Host nginx (when not using compose reverse-proxy)

Templates: `docker/host-nginx/`

| File | Layout |
|------|--------|
| `kraftisium-subdomain.conf.example` | Web apex + `api.` subdomain → static IPs or loopback |
| `kraftisium-matchmyresume.xyz.conf.example` | Same-origin kraftisium.xyz (SPA + /api split) |
| `technetium.itsarraj.xyz.conf.example` | Subdomain split on loopback ports |

Production VPS uses `kraftisium-subdomain.conf.example` with static IPs `172.28.0.20` / `172.28.0.21`.

TLS on host:

```bash
sudo mkdir -p /var/www/certbot && sudo chmod 755 /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot -d ... 
sudo ./scripts/vps-fix-ssl-lineage.sh   # if certbot creates *-0001 lineage
```

Details: [host-nginx/README.md](host-nginx/README.md).

## Dockerfiles

| Path | Output |
|------|--------|
| `bff/Dockerfile` | Rust multi-stage → `bff` binary |
| `ui/Dockerfile` | Vite build → nginx static |
| `docker/reverse-proxy/Dockerfile` | nginx + templated vhosts |
| `ai-tests/Dockerfile.matcher` | Python uvicorn matcher |
| `app/Dockerfile` | Not used in VPS stack (EAS builds) |

## Choosing a deployment path (new VPS)

```
Does system nginx already use 80/443?
├── NO  → compose.prod.yml
│         ./scripts/vps-deploy.sh
│         ./scripts/vps-issue-cert.sh
│         docker compose ... up -d --force-recreate reverse-proxy
│
└── YES → compose.host-edge.yml
          Can Docker publish loopback ports (14680/14682)?
          ├── YES → ./scripts/vps-deploy-host-edge.sh
          │         host nginx → 127.0.0.1:14680 / 14682
          │
          └── NO (DNS/iptables broken) → add compose.vps-fix.yml
                    ./scripts/vps-deploy-production.sh
                    host nginx → 172.28.0.21 / 172.28.0.20
                    sudo ./scripts/vps-fix-host-nginx.sh
```

Test loopback publishing on a new VPS:

```bash
docker compose -f compose.base.yml -f compose.host-edge.yml up -d bff
curl -sf http://127.0.0.1:14682/api/v1/health && echo OK || echo NEED_VPS_FIX
```

## Operations

### Status

```bash
# production stack
docker compose -f compose.base.yml -f compose.host-edge.yml -f compose.vps-fix.yml ps

# logs
docker compose -f compose.base.yml -f compose.host-edge.yml -f compose.vps-fix.yml logs -f bff kraftisium-web
```

### Redeploy after git pull

```bash
./scripts/vps-deploy-production.sh    # current prod VPS
# or
./scripts/vps-deploy.sh               # compose.prod VPS
```

### Enable AI matcher

```env
COMPOSE_ML=1
BFF__MATCHER__BASE_URL=http://resume-matcher:8095
BFF__MATCHER__INTERNAL_SECRET=shared-secret
MATCHER_INTERNAL_SECRET=shared-secret
```

Then redeploy with `--profile ml`.

### Remove stack (destructive)

```bash
docker compose -f compose.base.yml -f compose.host-edge.yml -f compose.vps-fix.yml down
# add -v only if you intend to wipe postgres/rustfs data
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Cargo.lock does not exist` | Old Dockerfile | Use current `bff/Dockerfile` (generates lockfile) |
| `failed to lookup postgres` | Docker DNS broken | Use `compose.vps-fix.yml` |
| `Unable to enable DNAT rule` | iptables broken | Use vps-fix (no port publish) |
| BFF unhealthy but curl works | wget healthcheck timing | Ignore or wait; API may still respond |
| Web crash `upstream bff` | Wrong nginx.conf in image | Prod uses static-only `nginx.conf` |
| API SSL hostname mismatch | Old cert lineage in nginx | `sudo ./scripts/vps-fix-ssl-lineage.sh` |
| CORS errors | Wrong `PUBLIC_WEB_URL` | Fix `.env`, rebuild bff + web |
| Migration DNS failure | postgres hostname | `vps-migrate.sh` uses container IP |

## Related docs

- [docs/new-vps-setup.md](../docs/new-vps-setup.md) — recreate from scratch
- [docs/deploy-production.md](../docs/deploy-production.md) — live VPS runbook
- [docs/vps-fix-2026-05-31.md](../docs/vps-fix-2026-05-31.md) — incident log
- [reverse-proxy/README.md](reverse-proxy/README.md) — Docker edge nginx
- [host-nginx/README.md](host-nginx/README.md) — system nginx
- [postgres/init/README.md](postgres/init/README.md) — init dir (migrations via sqlx)
