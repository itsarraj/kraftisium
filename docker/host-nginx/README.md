# Host nginx (when ports 80/443 are already taken)

Use this folder when the VPS already runs nginx on ports 80/443.

## Production VPS (185.139.7.99 / technetium)

This server uses static Docker container IPs because host iptables/DNS are broken. k3s also runs on the same host — host nginx must own 80/443 (not Traefik klipper-lb).

1. Deploy stack

   ```bash
   ./scripts/vps-deploy-production.sh
   ```

2. Pin host nginx as the public edge (sudo) — installs vhost, disables k3s ServiceLB, keeps Traefik ClusterIP

   ```bash
   sudo ./scripts/vps-pin-host-nginx-edge.sh
   ```

   First-time TLS only (if certs missing):

   ```bash
   sudo CERTBOT_EMAIL=your@email.com ./scripts/vps-fix-host-nginx.sh
   ```

3. If `https://api.kraftisium.xyz` SSL fails after certbot (cert under `kraftisium.xyz-0001`):

   ```bash
   sudo ./scripts/vps-fix-ssl-lineage.sh
   ```

Config template: `kraftisium-subdomain.conf.example`

- `kraftisium.xyz` → `172.28.0.21:80` (web SPA)
- `api.kraftisium.xyz` → `172.28.0.20:8000` (BFF)

On a new VPS with working loopback ports, use `127.0.0.1:14680` / `14682` instead — see Path B in `docs/new-vps-setup.md`.

## Other hosts — loopback bindings

Use when `compose.host-edge.yml` publishes to `127.0.0.1:14680` / `14682`:

1. `./scripts/vps-deploy-host-edge.sh`
2. Issue cert with webroot: `sudo certbot certonly --webroot -w /var/www/certbot -d ...`
3. Copy the matching example conf to `/etc/nginx/conf.d/`
4. `sudo nginx -t && sudo nginx -s reload`

## Which example to use

- `kraftisium-matchmyresume.xyz.conf.example`
  - same-origin setup (multiple apex+www names served by one SPA)
  - routes:
    - `/api/v1/` -> bff (127.0.0.1:14682) — auth, jobs, resumes, subscriptions, uploads
    - everything else -> kraftisium-web (127.0.0.1:14680) — SPA routes `/upgrade`, `/checkout`, `/ai-matches`, …

- `technetium.itsarraj.xyz.conf.example`
  - subdomain split (web + auth + api as separate hostnames)
  - routes:
    - `technetium...` -> web (14680)
    - `auth.technetium...` -> bff (14682)
    - `api.technetium...` -> bff (14682)

## Docker edge nginx alternative

If ports 80/443 are free on the VPS, use `compose.prod.yml` instead — see `docker/reverse-proxy/README.md` for `NGINX_SAME_ORIGIN` and automatic TLS after `./scripts/vps-issue-cert.sh`.

## Common failure: "conflicting server name ... ignored"

This means another file in `/etc/nginx/conf.d/` declares the same `server_name` values.

Fix by editing/removing the older conflicting file, then:

- `sudo nginx -t && sudo nginx -s reload`
