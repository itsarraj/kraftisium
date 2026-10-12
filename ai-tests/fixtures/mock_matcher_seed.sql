-- Optional idempotent overlay for AI matcher smoke tests.
-- Prefer the unified base seed: bff/seeds/run_seed.sh (includes this data).
--
--   export DATABASE_URL=postgres://USER@localhost/kraftisium
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ai-tests/fixtures/mock_matcher_seed.sql
--
-- Test user_id: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
-- Refresh: curl -s -X POST http://127.0.0.1:8095/v1/refresh/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

BEGIN;

CREATE OR REPLACE FUNCTION seed_uuid(seed TEXT)
RETURNS UUID AS $$
    SELECT (
        SUBSTRING(MD5(seed), 1, 8) || '-' ||
        SUBSTRING(MD5(seed), 9, 4) || '-' ||
        SUBSTRING(MD5(seed), 13, 4) || '-' ||
        SUBSTRING(MD5(seed), 17, 4) || '-' ||
        SUBSTRING(MD5(seed), 21, 12)
    )::UUID;
$$ LANGUAGE SQL IMMUTABLE;

INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'matcher-test@kraftisium.test',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO',
    'Matcher Test Candidate',
    'user',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP;

INSERT INTO companies (id, name, industry, head_office, employee_size, company_type, created_at, updated_at)
VALUES
    (seed_uuid('seed-matcher-company-1'), 'Kraftisium Labs', 'Software', 'Remote', '11-50', 'startup', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (seed_uuid('seed-matcher-company-2'), 'Widget Inc', 'Cloud', 'Austin, TX', '51-200', 'direct', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (seed_uuid('seed-matcher-company-3'), 'DataCo', 'Data', 'Chicago, IL', '201-500', 'direct', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (seed_uuid('seed-matcher-company-4'), 'Downtown Bistro', 'Hospitality', 'Portland, OR', '11-50', 'direct', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP;

INSERT INTO jobs (id, company_id, company_name, position_title, location, employment_type, description)
VALUES
    ('a1111111-1111-4111-8111-111111111111', seed_uuid('seed-matcher-company-1'), 'Kraftisium Labs', 'Backend Engineer — Python & Postgres', 'Remote', 'Full-time',
     'Build REST APIs with FastAPI or Django. Strong PostgreSQL, Redis, Docker.'),
    ('a2222222-2222-4222-8222-222222222222', seed_uuid('seed-matcher-company-2'), 'Widget Inc', 'Platform Engineer — Kubernetes', 'Austin, TX', 'Full-time',
     'Kubernetes, Terraform, Go microservices.'),
    ('a3333333-3333-4333-8333-333333333333', seed_uuid('seed-matcher-company-3'), 'DataCo', 'Data Analyst', 'Chicago, IL', 'Full-time',
     'SQL dashboards, stakeholder reporting, Excel and Looker.'),
    ('a4444444-4444-4444-8444-444444444444', seed_uuid('seed-matcher-company-4'), 'Downtown Bistro', 'Line Cook', 'Portland, OR', 'Part-time',
     'Fast-paced kitchen. Knife skills, prep, weekends required.')
ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    company_name = EXCLUDED.company_name,
    position_title = EXCLUDED.position_title,
    location = EXCLUDED.location,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO resumes (id, user_id, title, content)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Senior Backend Engineer',
    '{"role": "backend", "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "REST APIs"], "summary": "Shipping reliable APIs."}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();

INSERT INTO suggested_jobs (user_id, job_id, match_score, suggested_at)
VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a1111111-1111-4111-8111-111111111111', 0.91, CURRENT_TIMESTAMP),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a2222222-2222-4222-8222-222222222222', 0.78, CURRENT_TIMESTAMP),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a3333333-3333-4333-8333-333333333333', 0.42, CURRENT_TIMESTAMP)
ON CONFLICT (user_id, job_id) DO UPDATE SET match_score = EXCLUDED.match_score, suggested_at = EXCLUDED.suggested_at;

COMMIT;
