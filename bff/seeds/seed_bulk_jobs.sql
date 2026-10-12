-- Adds a large batch of varied, realistic-ish jobs for search performance
-- testing at scale. Not tied to real companies (company_id left NULL,
-- which the schema allows) — this is purely to get row-count and text
-- variety high enough that full-text search selectivity numbers mean
-- something, unlike naively duplicating a handful of rows.
--
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f seeds/seed_bulk_jobs.sql
-- Idempotent-ish: uses a deterministic seed_uuid() per index, so re-running
-- with the same JOB_COUNT upserts the same rows rather than duplicating.

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

WITH pools AS (
    SELECT
        ARRAY['Software','Backend','Frontend','Full Stack','DevOps','Data','Machine Learning','Platform','Mobile','QA','Security','Cloud Infrastructure','Site Reliability','Embedded','Product','Engineering','Solutions','Systems','Network','Database'] AS domain,
        ARRAY['Engineer','Developer','Architect','Analyst','Specialist','Consultant','Lead','Manager','Administrator','Technician'] AS role_kind,
        ARRAY['Junior','','Mid-Level','Senior','Staff','Principal','Lead'] AS seniority,
        ARRAY['Northbeam Technologies','Cedarline Systems','BrightPath Software','Meridian Labs','Novaworks Digital','Fieldstone Analytics','Clearwater Cloud','Ironwood Platforms','Sundial Networks','Harborlight Data','Greenridge Solutions','Pinecrest Software','Silverline Robotics','Westgate Fintech','Blueharbor Trading','Redstone Industries','Amberfield Systems','Coppergate Technologies','Lakeshore Digital','Brightside Analytics','Stonebridge Cloud','Maplewood Software','Riverside Networks','Summit Data Systems','Oakridge Platforms','Highfield Technologies','Cobalt Systems Group','Willowbrook Digital','Granite Peak Software','Fairwind Solutions'] AS company,
        ARRAY['Remote','Bengaluru, India','Hyderabad, India','Pune, India','Mumbai, India','Delhi, India','San Francisco, CA','New York, NY','Austin, TX','Seattle, WA','Berlin, Germany','London, UK','Amsterdam, Netherlands','Toronto, Canada','Singapore','Dublin, Ireland','Remote - US','Remote - EU','Remote - India','Chicago, IL'] AS location,
        ARRAY['Full-time','Part-time','Contract','Hybrid','Remote'] AS employment_type,
        ARRAY['Rust','Python','TypeScript','React','Kubernetes','PostgreSQL','AWS','GraphQL','Docker','Go','Java','Kafka','Terraform','Redis','Node.js','Vue','Swift','Kotlin','CI/CD','microservices'] AS skill
),
generated AS (
    SELECT
        idx,
        (pools.domain)[1 + (idx * 7) % array_length(pools.domain, 1)] AS domain,
        (pools.role_kind)[1 + (idx * 3) % array_length(pools.role_kind, 1)] AS role_kind,
        (pools.seniority)[1 + (idx * 11) % array_length(pools.seniority, 1)] AS seniority,
        (pools.company)[1 + (idx * 13) % array_length(pools.company, 1)] AS company,
        (pools.location)[1 + (idx * 5) % array_length(pools.location, 1)] AS location,
        (pools.employment_type)[1 + idx % array_length(pools.employment_type, 1)] AS employment_type,
        ARRAY[
            (pools.skill)[1 + (idx * 2) % array_length(pools.skill, 1)],
            (pools.skill)[1 + (idx * 9) % array_length(pools.skill, 1)],
            (pools.skill)[1 + (idx * 17) % array_length(pools.skill, 1)]
        ] AS tags
    FROM generate_series(1, :'JOB_COUNT'::int) AS idx, pools
)
INSERT INTO jobs (
    id, company_id, company_name, position_title, location,
    employment_type, salary_min, salary_max, salary_currency, salary_period,
    description, requirements, tags, status, featured, is_remote,
    posted_at, created_at, updated_at
)
SELECT
    seed_uuid('bulk-job-' || idx::TEXT),
    NULL,
    company,
    trim(seniority || ' ' || domain || ' ' || role_kind),
    location,
    employment_type,
    600000 + (idx % 12) * 150000,
    1200000 + (idx % 12) * 200000,
    'USD', 'Yearly',
    'Join ' || company || ' as a ' || trim(seniority || ' ' || domain || ' ' || role_kind) ||
        ' working on ' || domain || ' systems. We value strong ' || tags[1] || ' and ' || tags[2] || ' experience.',
    'Hands-on experience with ' || tags[1] || ', ' || tags[2] || ', and ' || tags[3] ||
        '. Comfortable working in a ' || employment_type || ' setup based in ' || location || '.',
    tags,
    CASE WHEN idx % 9 = 0 THEN 'closed' ELSE 'active' END,
    idx % 50 = 0,
    location LIKE 'Remote%',
    CURRENT_TIMESTAMP - ((idx % 365) || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - ((idx % 365) || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - ((idx % 365) || ' days')::INTERVAL
FROM generated
ON CONFLICT (id) DO NOTHING;

DROP FUNCTION seed_uuid(TEXT);

COMMIT;

ANALYZE jobs;
