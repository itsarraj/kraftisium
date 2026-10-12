-- Adds a large batch of bare candidate users and standalone companies, purely
-- to get stats.candidates / stats.companies (and general list/pagination
-- testing) to non-trivial numbers. Deliberately shallow: no candidate_profiles,
-- resumes, or recruiter_companies links -- just rows in `users` and
-- `companies`, same spirit as seed_bulk_jobs.sql's "row-count and variety,
-- not a full connected graph" approach.
--
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v USER_COUNT=20000 -v COMPANY_COUNT=500 -f seeds/seed_bulk_users_companies.sql
-- Idempotent: deterministic seed_uuid() per index + ON CONFLICT DO NOTHING,
-- so re-running with the same counts is a safe no-op rather than duplicating.
--
-- All seeded users share the same password as the rest of this seed suite:
-- admin123 (bcrypt hash below, same constant seed.sql uses).

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

-- ===== Companies =====

WITH pools AS (
    SELECT
        ARRAY['Northbeam','Cedarline','Brightpath','Meridian','Novaworks','Fieldstone','Clearwater','Ironwood','Sundial','Harborlight','Greenridge','Pinecrest','Silverline','Westgate','Blueharbor','Redstone','Amberfield','Coppergate','Lakeshore','Brightside','Stonebridge','Maplewood','Riverside','Summit','Oakridge','Highfield','Cobalt','Willowbrook','Granite Peak','Fairwind','Duskfall','Emberlight','Frostpine','Goldleaf','Hollowmere','Ivywood','Jasperfield','Kestrel','Larkspur','Moonvale'] AS prefix,
        ARRAY['Technologies','Systems','Software','Labs','Digital','Analytics','Cloud','Platforms','Networks','Data','Solutions','Robotics','Fintech','Trading','Industries','Group','Ventures','Dynamics','Innovations','Partners'] AS suffix,
        ARRAY['Software','Fintech','Healthtech','E-commerce','Cloud Infrastructure','Cybersecurity','AI/ML','EdTech','Gaming','Logistics','Biotech','AdTech','Media','Telecom','Manufacturing'] AS industry,
        ARRAY['1-10','11-50','51-200','201-500','501-1000','1000+'] AS employee_size,
        ARRAY['Remote','Bengaluru, India','Hyderabad, India','Pune, India','Mumbai, India','San Francisco, CA','New York, NY','Austin, TX','Seattle, WA','Berlin, Germany','London, UK','Amsterdam, Netherlands','Toronto, Canada','Singapore','Dublin, Ireland'] AS head_office,
        ARRAY['direct','startup','agency'] AS company_type
),
generated AS (
    SELECT
        idx,
        (pools.prefix)[1 + (idx * 7) % array_length(pools.prefix, 1)] || ' ' ||
            (pools.suffix)[1 + (idx * 13) % array_length(pools.suffix, 1)] AS name,
        (pools.industry)[1 + (idx * 3) % array_length(pools.industry, 1)] AS industry,
        (pools.employee_size)[1 + (idx * 5) % array_length(pools.employee_size, 1)] AS employee_size,
        (pools.head_office)[1 + (idx * 11) % array_length(pools.head_office, 1)] AS head_office,
        (pools.company_type)[1 + idx % array_length(pools.company_type, 1)] AS company_type,
        2005 + (idx % 20) AS since
    FROM generate_series(1, :'COMPANY_COUNT'::int) AS idx, pools
)
INSERT INTO companies (
    id, name, about, industry, employee_size, head_office, company_type, since, specialization, created_at, updated_at
)
SELECT
    seed_uuid('bulk-company-' || idx::TEXT),
    name,
    'A ' || industry || ' company based in ' || head_office || '.',
    industry,
    employee_size,
    head_office,
    company_type,
    since,
    ARRAY[industry],
    CURRENT_TIMESTAMP - ((idx % 1000) || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - ((idx % 1000) || ' days')::INTERVAL
FROM generated
ON CONFLICT (id) DO NOTHING;

-- ===== Users (bare candidates -- no profiles, resumes, or company links) =====

WITH pools AS (
    SELECT
        ARRAY['Aarav','Vivaan','Aditya','Ishaan','Arjun','Reyansh','Krishna','Sai','Rohan','Kabir','Anaya','Diya','Ira','Myra','Sara','Zoya','Pari','Anika','Navya','Riya','James','Liam','Noah','Oliver','Elijah','Lucas','Mason','Ethan','Ava','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Wei','Jing','Li','Hana','Yuki','Min-jun','Carlos','Diego','Mateo','Sofia','Valentina','Camila','Fatima','Omar','Yusuf'] AS first_name,
        ARRAY['Sharma','Patel','Kumar','Singh','Gupta','Reddy','Rao','Nair','Iyer','Mehta','Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Anderson','Chen','Wang','Zhang','Liu','Kim','Park','Lee','Yamamoto','Suzuki','Tanaka','Silva','Santos','Costa','Ferreira','Rossi','Bianchi','Muller','Schmidt','Fischer','Weber'] AS last_name
),
generated AS (
    SELECT
        idx,
        (pools.first_name)[1 + (idx * 7) % array_length(pools.first_name, 1)] AS first_name,
        (pools.last_name)[1 + (idx * 13) % array_length(pools.last_name, 1)] AS last_name
    FROM generate_series(1, :'USER_COUNT'::int) AS idx, pools
)
INSERT INTO users (
    id, email, password_hash, name, role, email_verified, referral_code, created_at, updated_at
)
SELECT
    seed_uuid('bulk-user-' || idx::TEXT),
    lower(first_name) || '.' || lower(last_name) || idx::TEXT || '@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO',
    first_name || ' ' || last_name,
    'user',
    true,
    'BULK' || idx::TEXT,
    CURRENT_TIMESTAMP - ((idx % 730) || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - ((idx % 730) || ' days')::INTERVAL
FROM generated
ON CONFLICT (id) DO NOTHING;

UPDATE stats SET
    live_jobs = (SELECT COUNT(*) FROM jobs WHERE status = 'active'),
    companies = (SELECT COUNT(*) FROM companies),
    candidates = (SELECT COUNT(*) FROM users WHERE role = 'user'),
    new_jobs = (SELECT COUNT(*) FROM jobs WHERE posted_at > CURRENT_TIMESTAMP - INTERVAL '7 days'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

DROP FUNCTION seed_uuid(TEXT);

COMMIT;

ANALYZE companies;
ANALYZE users;
