# Kraftisium

Job search platform: merged Rust BFF, React web UI, Expo mobile app, optional hybrid AI matcher.

## Deploy

Full Docker/VPS guide: [docker/README.md](docker/README.md)

```bash
cp docker/vps.env.example .env
# edit secrets + PUBLIC_* URLs
./scripts/vps-deploy-host-edge.sh   # host nginx on 80/443
# or
./scripts/vps-deploy.sh             # dedicated VPS with compose edge nginx
```

Fresh Arch server packages: [run_on_server/setup_kraftisium_arch_server.sh](run_on_server/setup_kraftisium_arch_server.sh)

## Local development

```bash
# BFF (Postgres + Redis + rustfs running locally)
cd bff && sqlx migrate run && cargo run

# Web UI
cd ui && npm install && npm run dev

# Mobile
cd app && npm install && npm run dev:android-tunnel-adb

# Optional AI matcher — ai-tests/README-matcher.md
```

Docker all-in-one:

```bash
docker compose -f compose.base.yml -f compose.dev.yml up -d --build
```

## Repo layout

| Path | Role |
|------|------|
| `bff/` | API: auth, jobs, resumes, subscriptions, search |
| `ui/` | React SPA (Premium $199/yr, founding offer, AI matches) |
| `app/` | Expo app (same BFF APIs) |
| `ai-tests/` | Hybrid matcher service (Postgres full-text prefilter + embeddings) |
| `docker/` | VPS env template, nginx examples, deploy docs |
| `scripts/` | `vps-deploy*.sh`, `vps-migrate.sh`, certs |
