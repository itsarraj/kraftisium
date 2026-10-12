# Resume–job matcher (hybrid, no LLM)

Two-stage pipeline used by `matcher_service.py`:

1. Prefilter (~200 jobs): skills extracted from resume → BFF `GET /api/v1/jobs/search` (Postgres full-text search), or SQL fallback.
2. Rank: `sentence-transformers/all-MiniLM-L6-v2` embeddings, cosine similarity → `suggested_jobs` in Postgres.

## Run locally

```bash
# Postgres (once): createdb kraftisium && cd bff && sqlx migrate run
# Demo data: cd bff && ./seeds/run_seed.sh

# Terminal 1 — BFF
cd bff && cargo run

# Terminal 2 — matcher (copy ai-tests/.env.example → ai-tests/.env)
# export DATABASE_URL=postgres://USER:PASS@127.0.0.1:5432/kraftisium
conda activate ai
export DATABASE_URL=postgres://cesium@localhost/kraftisium
export MATCHER_BFF_URL=http://127.0.0.1:8000
python -m uvicorn matcher_service:app --host 0.0.0.0 --port 8095

pip install -r ai-tests/requirements-matcher.txt
cd ai-tests && python -m uvicorn matcher_service:app --host 0.0.0.0 --port 8095
```

Set in `bff/configuration.yaml`:

```yaml
matcher:
  base_url: "http://127.0.0.1:8095"
```

## Docker

```bash
# Build (CPU torch + MiniLM baked into the image)
docker build -t kraftisium-resume-matcher:latest -f ai-tests/Dockerfile.matcher ai-tests

# Against local host Postgres + BFF (port 8095)
docker run --rm --network host \
  -e DATABASE_URL=postgres://cesium@127.0.0.1:5432/kraftisium \
  -e MATCHER_BFF_URL=http://127.0.0.1:8000 \
  -e MATCHER_DEVICE=cpu \
  kraftisium-resume-matcher:latest

# Full compose stack
COMPOSE_ML=1 BFF__MATCHER__BASE_URL=http://resume-matcher:8095 \
  docker compose --profile ml -f compose.base.yml -f compose.dev.yml up -d --build
```

On the production VPS (`compose.vps-fix.yml`), set
`BFF__MATCHER__BASE_URL=http://172.28.0.22:8095` — Docker DNS is broken there.

## Refresh triggers

- Resume upload / update (BFF)
- Candidate profile save (BFF)
- `POST /api/v1/jobs/suggested/{user_id}/refresh` (web/mobile UI)

Without `matcher.base_url`, the BFF runs keyword-only ranking via Postgres full-text search (no embeddings).
