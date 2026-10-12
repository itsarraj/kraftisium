# BFF seeds (kraftisium)

Unified, connected demo data for local dev, UI pagination, recruiter dashboards, and AI matcher testing.

## Quick start

```bash
createdb kraftisium   # once
cd bff && sqlx migrate run

export DATABASE_URL=postgres://USER@localhost/kraftisium
./seeds/run_seed.sh
```

Password for all seeded accounts: `admin123`

## Profiles

| Command | What you get |
|---------|----------------|
| `./seeds/run_seed.sh` | Full graph: ~48 users, 60 companies, 162 jobs, resumes, applications, suggested_jobs, subscriptions, embeddings |
| `./seeds/run_seed.sh --bulk` | Above + 1050 more jobs (1200 total) and 90 more companies |
| `./seeds/run_seed.sh --bulk-only` | Bulk layer only (run after base seed) |

Job search is Postgres full-text search (a generated column kept in sync automatically), so no restart or reindex step is needed after seeding.

## What is connected

```
users
 ├── employer_profiles → companies
 ├── candidate_profiles
 ├── resumes
 ├── applications → jobs + resumes
 ├── suggested_jobs → jobs
 ├── subscriptions (first 10 candidates)
 └── user_resume_embeddings

companies → jobs → job_embeddings

Fixed matcher user: matcher-test@kraftisium.test (id bbbbbbbb-…)
Fixed matcher jobs: a1111111-…, a2222222-…, a3333333-…, a4444444-…
```

## Key accounts

| Email | Role |
|-------|------|
| admin@example.com | admin |
| user@example.com | candidate |
| recruiter@test.com | recruiter |
| animeshbusinessemail@gmail.com | recruiter (Animesh Recruiting Co) |
| candidate01@test.com … candidate33@test.com | candidates |
| matcher-test@kraftisium.test | AI matcher eval user |

## Scale tuning

Edit counts at the top of `seed.sql` (`seed_config` temp table):

- `company_count` (default 60)
- `job_count` (default 150)
- `generated_candidate_count` (default 33)
- `generated_recruiter_count` (default 11)

## AI matcher

Base seed includes the ai-tests fixture user, resume, jobs, and suggested_jobs.
Optional standalone overlay: `ai-tests/fixtures/mock_matcher_seed.sql` (idempotent).

Matcher refresh:

```bash
curl -s -X POST http://127.0.0.1:8095/v1/refresh/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
```

## Legacy files (removed)

Replaced by `seed.sql` + `seed_bulk_jobs.sql`:

- `mock_full_demo.sql`
- `mock_jobs_120.sql`
- `mock_jobs_1200.sql`
- `mock_recruiter_animesh.sql`
- `run_mock_jobs_1200.sh`
