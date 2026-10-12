-- ==============================================================================
-- KRAFTISIUM FULLY-CONNECTED LOGICAL SEED DATA
-- ==============================================================================
-- This script creates a complete, coherent relational graph across all tables:
--   1-to-1 : users <-> candidate_profiles, users <-> employer_profiles,
--            users <-> subscriptions
--   1-to-all: companies -> jobs, users -> resumes, users -> applications,
--            jobs -> applications, companies -> talent_pools,
--            users (referrer) -> users (referred)
--   all-to-all: users <-> companies via recruiter_companies
--               users <-> jobs via saved_jobs
--               users <-> jobs via suggested_jobs (AI matches)
--               talent_pools <-> resumes via talent_pool_resumes
--               users <-> jobs via applications (full pipeline lifecycle)
--
-- Password for all accounts: admin123
-- ==============================================================================

BEGIN;

-- Deterministic UUID generator from text seed
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

-- 1. CLEANUP PREVIOUS SEED DATA
DELETE FROM talent_pool_resumes;
DELETE FROM talent_pools;
DELETE FROM suggested_jobs;
DELETE FROM saved_jobs;
DELETE FROM applications;
DELETE FROM resumes;
DELETE FROM job_embeddings;
DELETE FROM user_resume_embeddings;
DELETE FROM jobs;
DELETE FROM recruiter_companies;
DELETE FROM employer_profiles;
DELETE FROM candidate_profiles;
DELETE FROM companies;
DELETE FROM credit_transactions;
DELETE FROM payment_orders;
DELETE FROM promo_codes;
DELETE FROM subscriptions;
DELETE FROM user_sessions;
DELETE FROM refresh_tokens;
DELETE FROM token_blacklist;
DELETE FROM audit_logs;
DELETE FROM users;

-- 2. USERS (Admin, Recruiters, Candidates with Referrals)
-- Password bcrypt: admin123
INSERT INTO users (
    id, email, password_hash, name, role, email_verified,
    referral_code, referred_by, is_premium_candidate, referral_credits,
    terms_accepted_at, created_at, updated_at
)
VALUES
    -- Admin
    (seed_uuid('user-admin'), 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Platform Admin', 'admin', true, 'ADMIN00', NULL, false, 0, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP),

    -- Recruiters
    (seed_uuid('user-recruiter-animesh'), 'animeshbusinessemail@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Animesh Recruiter', 'recruiter', true, 'RECRUIT1', NULL, false, 0, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP),
    (seed_uuid('user-recruiter-sarah'), 'sarah.recruiter@apexcloud.io', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Sarah Jenkins', 'recruiter', true, 'APEXREC', NULL, false, 0, CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP),

    -- Primary Candidate (Top referrer, premium)
    (seed_uuid('user-seeker-animesh'), 'animesh080808@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Animesh Seeker', 'user', true, 'ANIMESH1', NULL, true, 200, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP),

    -- Candidate 2 (Referred by animesh-seeker)
    (seed_uuid('user-seeker-sarah'), 'sarah.chen@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Sarah Chen', 'user', true, 'SCHEN01', seed_uuid('user-seeker-animesh'), true, 100, CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP),

    -- Candidate 3 (Referred by animesh-seeker)
    (seed_uuid('user-seeker-marcus'), 'marcus.dev@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Marcus Vance', 'user', true, 'MDEV02', seed_uuid('user-seeker-animesh'), false, 0, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP),

    -- Candidate 4 (Referred by animesh-seeker)
    (seed_uuid('user-seeker-priya'), 'priya.patel@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Priya Patel', 'user', true, 'PPATEL03', seed_uuid('user-seeker-animesh'), false, 0, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP),

    -- Candidate 5 (Organic)
    (seed_uuid('user-seeker-alex'), 'alex.kim@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Alex Kim', 'user', true, 'AKIM04', NULL, false, 0, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP),

    -- Candidate 6 (Organic)
    (seed_uuid('user-seeker-elena'), 'elena.rostova@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/7LpMh7UeO8QKdJcO', 'Elena Rostova', 'user', true, 'EROST05', NULL, false, 0, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP);

-- 3. CANDIDATE PROFILES (1-to-1 with Candidates)
INSERT INTO candidate_profiles (user_id, bio, created_at, updated_at)
VALUES
    (seed_uuid('user-seeker-animesh'), 'Senior Full-Stack & Distributed Systems Engineer with 7+ years building high-throughput Rust and TypeScript web applications.', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP),
    (seed_uuid('user-seeker-sarah'), 'Staff Backend Engineer specializing in cloud-native microservices, Golang, Rust, and PostgreSQL high availability.', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP),
    (seed_uuid('user-seeker-marcus'), 'Lead Site Reliability & Platform Engineer. Kubernetes CKA, Terraform, multi-region AWS architectures.', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP),
    (seed_uuid('user-seeker-priya'), 'Frontend Lead passionate about Design Systems, React 19, Tailwind CSS, performance profiling, and accessible UX.', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP),
    (seed_uuid('user-seeker-alex'), 'Machine Learning Engineer with focus on NLP embeddings, vector search, semantic ranking, and Python inference pipelines.', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP),
    (seed_uuid('user-seeker-elena'), 'Product-minded Full Stack Developer with strong experience in Next.js, Node.js, and product analytics.', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP);

-- 4. COMPANIES (1-to-all with Jobs, all-to-all with Recruiters)
INSERT INTO companies (
    id, name, logo_url, website, about, industry, employee_size, head_office, company_type, since, specialization, created_at, updated_at
)
VALUES
    (
        seed_uuid('company-animesh'),
        'Animesh Tech Innovations',
        'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128&h=128&fit=crop',
        'https://animesh-tech.com',
        'High-scale engineering firm building enterprise workflow engines and intelligent job-matching platforms.',
        'Software',
        '51-200',
        'Bengaluru, India',
        'direct',
        2020,
        ARRAY['Software', 'Cloud Infrastructure', 'AI / ML', 'Distributed Systems'],
        CURRENT_TIMESTAMP - INTERVAL '45 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('company-apex'),
        'Apex Cloud Systems',
        'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=128&h=128&fit=crop',
        'https://apexcloud.io',
        'Next-generation cloud optimization and observability platform for hyperscale container deployments.',
        'Cloud Infrastructure',
        '201-500',
        'San Francisco, CA',
        'startup',
        2019,
        ARRAY['Cloud', 'Kubernetes', 'DevOps', 'Observability', 'Security'],
        CURRENT_TIMESTAMP - INTERVAL '40 days',
        CURRENT_TIMESTAMP
    );

-- 5. EMPLOYER PROFILES & RECRUITER_COMPANIES (1-to-1 User <-> Profile, All-to-All User <-> Company)
INSERT INTO employer_profiles (user_id, job_title, mobile, company_type, created_at, updated_at)
VALUES
    (seed_uuid('user-recruiter-animesh'), 'Head of Technical Recruiting', '+91-9876543210', 'direct', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP),
    (seed_uuid('user-recruiter-sarah'), 'VP of People & Talent', '+1-415-555-0199', 'direct', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP);

INSERT INTO recruiter_companies (user_id, company_id, role, created_at)
VALUES
    (seed_uuid('user-recruiter-animesh'), seed_uuid('company-animesh'), 'admin', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    (seed_uuid('user-recruiter-sarah'), seed_uuid('company-apex'), 'admin', CURRENT_TIMESTAMP - INTERVAL '40 days');

-- 6. RESUMES (1-to-all User <-> Resumes)
INSERT INTO resumes (
    id, user_id, title, content, file_name, file_type, file_size, storage_path, created_at, updated_at
)
VALUES
    (
        seed_uuid('resume-animesh'),
        seed_uuid('user-seeker-animesh'),
        'Principal Full Stack & Distributed Systems',
        '{"role": "Full Stack", "skills": ["Rust", "TypeScript", "React", "PostgreSQL", "Actix", "Docker"], "experience_years": 8}'::jsonb,
        'animesh_fullstack_lead.pdf',
        'application/pdf',
        245000,
        'resumes/animesh_fullstack_lead.pdf',
        CURRENT_TIMESTAMP - INTERVAL '30 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('resume-sarah'),
        seed_uuid('user-seeker-sarah'),
        'Staff Backend & Platform Engineer',
        '{"role": "Backend", "skills": ["Rust", "Go", "Kubernetes", "PostgreSQL", "Kafka", "gRPC"], "experience_years": 9}'::jsonb,
        'sarah_chen_staff_backend.pdf',
        'application/pdf',
        185000,
        'resumes/sarah_chen_staff_backend.pdf',
        CURRENT_TIMESTAMP - INTERVAL '25 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('resume-marcus'),
        seed_uuid('user-seeker-marcus'),
        'Lead DevOps & Cloud Architect',
        '{"role": "DevOps", "skills": ["Kubernetes", "AWS", "Terraform", "CI/CD", "Prometheus", "Linux"], "experience_years": 7}'::jsonb,
        'marcus_vance_devops.pdf',
        'application/pdf',
        210000,
        'resumes/marcus_vance_devops.pdf',
        CURRENT_TIMESTAMP - INTERVAL '20 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('resume-priya'),
        seed_uuid('user-seeker-priya'),
        'Senior Frontend & Design Systems Engineer',
        '{"role": "Frontend", "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS", "Storybook", "Jest"], "experience_years": 6}'::jsonb,
        'priya_patel_frontend.pdf',
        'application/pdf',
        160000,
        'resumes/priya_patel_frontend.pdf',
        CURRENT_TIMESTAMP - INTERVAL '15 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('resume-alex'),
        seed_uuid('user-seeker-alex'),
        'Senior Machine Learning Engineer',
        '{"role": "ML Engineer", "skills": ["Python", "PyTorch", "HuggingFace", "Vector DBs", "FastAPI", "Ray"], "experience_years": 5}'::jsonb,
        'alex_kim_ml_engineer.pdf',
        'application/pdf',
        195000,
        'resumes/alex_kim_ml_engineer.pdf',
        CURRENT_TIMESTAMP - INTERVAL '10 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('resume-elena'),
        seed_uuid('user-seeker-elena'),
        'Full Stack Product Developer',
        '{"role": "Product Engineer", "skills": ["Node.js", "React", "PostgreSQL", "GraphQL", "TypeScript"], "experience_years": 4}'::jsonb,
        'elena_rostova_fullstack.pdf',
        'application/pdf',
        140000,
        'resumes/elena_rostova_fullstack.pdf',
        CURRENT_TIMESTAMP - INTERVAL '5 days',
        CURRENT_TIMESTAMP
    );

-- 7. JOBS (1-to-all Company <-> Jobs)
INSERT INTO jobs (
    id, company_id, company_name, company_logo_url, position_title, location,
    employment_type, salary_min, salary_max, salary_currency, salary_period,
    description, requirements, facilities, tags, status, featured, is_remote,
    posted_at, created_at, updated_at
)
VALUES
    -- Jobs for Animesh Tech Innovations
    (
        seed_uuid('job-animesh-1'),
        seed_uuid('company-animesh'),
        'Animesh Tech Innovations',
        'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128&h=128&fit=crop',
        'Principal Rust Backend Architect',
        'Bengaluru, India (Remote Eligible)',
        'Full-time',
        160000, 210000, 'USD', 'Yearly',
        'Design and scale ultra-fast asynchronous microservices handling millions of events daily. Lead architectural reviews, define database patterns, and mentor engineers.',
        '8+ years backend systems experience; 3+ years production Rust; deep knowledge of PostgreSQL connection pooling and concurrency control.',
        'Flexible hours, comprehensive medical, equity, annual equipment budget, annual learning stipend.',
        ARRAY['Rust', 'PostgreSQL', 'Microservices', 'Docker', 'Redis', 'High Concurrency'],
        'active', true, true,
        CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('job-animesh-2'),
        seed_uuid('company-animesh'),
        'Animesh Tech Innovations',
        'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128&h=128&fit=crop',
        'Staff Frontend Engineer (React & TypeScript)',
        'Remote - India',
        'Full-time',
        130000, 175000, 'USD', 'Yearly',
        'Lead our frontend web client development. Own web vitals, build responsive component architectures, and integrate real-time collaboration widgets.',
        '6+ years frontend engineering; mastery of React 18/19, TypeScript, and modern CSS/Tailwind; performance optimization track record.',
        '100% remote, wellness allowance, premium workspace setup, unlimited PTO.',
        ARRAY['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'State Management', 'Web Vitals'],
        'active', true, true,
        CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('job-animesh-3'),
        seed_uuid('company-animesh'),
        'Animesh Tech Innovations',
        'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128&h=128&fit=crop',
        'DevOps & Platform Reliability Specialist',
        'Hyderabad, India',
        'Full-time',
        110000, 150000, 'USD', 'Yearly',
        'Maintain rock-solid Kubernetes infrastructure, streamline automated GitHub Actions CI/CD pipelines, and monitor cluster performance with Grafana.',
        '5+ years DevOps/SRE; deep Terraform and Helm skills; certified Kubernetes Administrator (CKA) preferred.',
        'Hybrid office perks, catered lunch, health insurance, commute subsidy.',
        ARRAY['Kubernetes', 'Terraform', 'CI/CD', 'AWS', 'Prometheus', 'Grafana'],
        'active', false, false,
        CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('job-animesh-4'),
        seed_uuid('company-animesh'),
        'Animesh Tech Innovations',
        'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128&h=128&fit=crop',
        'Full Stack Product Engineer',
        'Remote',
        'Full-time',
        95000, 135000, 'USD', 'Yearly',
        'Rapidly prototype and iterate customer-facing features across our recruitment portal and candidate dashboard.',
        '3+ years full stack experience with TypeScript, React, and REST/PostgreSQL APIs.',
        'Remote stipend, flexible schedule, generous holiday calendar.',
        ARRAY['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'REST APIs'],
        'active', false, true,
        CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP
    ),

    -- Jobs for Apex Cloud Systems
    (
        seed_uuid('job-apex-1'),
        seed_uuid('company-apex'),
        'Apex Cloud Systems',
        'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=128&h=128&fit=crop',
        'Lead Distributed Systems & Kubernetes Architect',
        'San Francisco, CA (Hybrid / Remote)',
        'Full-time',
        185000, 240000, 'USD', 'Yearly',
        'Architect core scheduling and observability agents running directly in customer container fleets. Low latency and strict memory safety are paramount.',
        '7+ years distributed systems; Go or Rust expertise; deep Linux kernel and cgroups understanding.',
        'Top-tier 401(k) match, comprehensive medical/dental/vision, stock options, catered office dinners.',
        ARRAY['Go', 'Rust', 'Kubernetes', 'Linux', 'eBPF', 'Distributed Systems'],
        'active', true, true,
        CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('job-apex-2'),
        seed_uuid('company-apex'),
        'Apex Cloud Systems',
        'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=128&h=128&fit=crop',
        'Senior Machine Learning / NLP Engineer',
        'Austin, TX',
        'Full-time',
        150000, 195000, 'USD', 'Yearly',
        'Build automated resume parsing, candidate semantic matching, and real-time query recommendation engines.',
        '4+ years applied ML; proficiency in PyTorch, transformers, sentence embeddings, and vector databases.',
        'Relocation assistance, generous equity grant, pet-friendly office.',
        ARRAY['Python', 'Machine Learning', 'NLP', 'Vector Search', 'PyTorch'],
        'active', true, false,
        CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('job-apex-3'),
        seed_uuid('company-apex'),
        'Apex Cloud Systems',
        'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=128&h=128&fit=crop',
        'Cloud Security & Compliance Specialist',
        'Remote - US',
        'Full-time',
        140000, 180000, 'USD', 'Yearly',
        'Ensure SOC2, ISO27001, and GDPR compliance across our distributed multi-tenant cloud offering.',
        '5+ years cloud security engineering; experience with IAM, SIEM, vulnerability scanning, and pen-testing.',
        'Home office setup allowance, learning & certification bonuses.',
        ARRAY['Cloud Security', 'Compliance', 'AWS', 'SOC2', 'Penetration Testing'],
        'active', false, true,
        CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP
    );

-- 8. APPLICATIONS (All-to-all User <-> Job, linking Resume; All Kanban Pipeline States)
INSERT INTO applications (
    id, job_id, user_id, resume_id, status, applied_at, created_at, updated_at
)
VALUES
    -- Pipeline for Animesh Tech: Job 1 (Principal Rust Backend Architect)
    (
        seed_uuid('app-1'),
        seed_uuid('job-animesh-1'),
        seed_uuid('user-seeker-sarah'),
        seed_uuid('resume-sarah'),
        'applied',
        CURRENT_TIMESTAMP - INTERVAL '10 days',
        CURRENT_TIMESTAMP - INTERVAL '10 days',
        CURRENT_TIMESTAMP - INTERVAL '10 days'
    ),
    (
        seed_uuid('app-2'),
        seed_uuid('job-animesh-1'),
        seed_uuid('user-seeker-marcus'),
        seed_uuid('resume-marcus'),
        'shortlisted',
        CURRENT_TIMESTAMP - INTERVAL '8 days',
        CURRENT_TIMESTAMP - INTERVAL '8 days',
        CURRENT_TIMESTAMP - INTERVAL '5 days'
    ),
    (
        seed_uuid('app-3'),
        seed_uuid('job-animesh-1'),
        seed_uuid('user-seeker-animesh'),
        seed_uuid('resume-animesh'),
        'interview',
        CURRENT_TIMESTAMP - INTERVAL '7 days',
        CURRENT_TIMESTAMP - INTERVAL '7 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        seed_uuid('app-4'),
        seed_uuid('job-animesh-1'),
        seed_uuid('user-seeker-alex'),
        seed_uuid('resume-alex'),
        'hired',
        CURRENT_TIMESTAMP - INTERVAL '11 days',
        CURRENT_TIMESTAMP - INTERVAL '11 days',
        CURRENT_TIMESTAMP - INTERVAL '1 days'
    ),
    (
        seed_uuid('app-5'),
        seed_uuid('job-animesh-1'),
        seed_uuid('user-seeker-elena'),
        seed_uuid('resume-elena'),
        'rejected',
        CURRENT_TIMESTAMP - INTERVAL '9 days',
        CURRENT_TIMESTAMP - INTERVAL '9 days',
        CURRENT_TIMESTAMP - INTERVAL '3 days'
    ),

    -- Pipeline for Animesh Tech: Job 2 (Staff Frontend Engineer)
    (
        seed_uuid('app-6'),
        seed_uuid('job-animesh-2'),
        seed_uuid('user-seeker-priya'),
        seed_uuid('resume-priya'),
        'interview',
        CURRENT_TIMESTAMP - INTERVAL '6 days',
        CURRENT_TIMESTAMP - INTERVAL '6 days',
        CURRENT_TIMESTAMP - INTERVAL '1 days'
    ),
    (
        seed_uuid('app-7'),
        seed_uuid('job-animesh-2'),
        seed_uuid('user-seeker-elena'),
        seed_uuid('resume-elena'),
        'shortlisted',
        CURRENT_TIMESTAMP - INTERVAL '4 days',
        CURRENT_TIMESTAMP - INTERVAL '4 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),

    -- Pipeline for Apex Cloud: Job 5 (Lead Distributed Systems)
    (
        seed_uuid('app-8'),
        seed_uuid('job-apex-1'),
        seed_uuid('user-seeker-sarah'),
        seed_uuid('resume-sarah'),
        'interview',
        CURRENT_TIMESTAMP - INTERVAL '12 days',
        CURRENT_TIMESTAMP - INTERVAL '12 days',
        CURRENT_TIMESTAMP - INTERVAL '3 days'
    ),
    (
        seed_uuid('app-9'),
        seed_uuid('job-apex-1'),
        seed_uuid('user-seeker-marcus'),
        seed_uuid('resume-marcus'),
        'shortlisted',
        CURRENT_TIMESTAMP - INTERVAL '7 days',
        CURRENT_TIMESTAMP - INTERVAL '7 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        seed_uuid('app-10'),
        seed_uuid('job-apex-2'),
        seed_uuid('user-seeker-alex'),
        seed_uuid('resume-alex'),
        'applied',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    );

-- 9. SAVED JOBS (All-to-All Candidate <-> Jobs Bookmarks)
INSERT INTO saved_jobs (user_id, job_id, saved_at)
VALUES
    (seed_uuid('user-seeker-animesh'), seed_uuid('job-animesh-1'), CURRENT_TIMESTAMP - INTERVAL '10 days'),
    (seed_uuid('user-seeker-animesh'), seed_uuid('job-apex-1'), CURRENT_TIMESTAMP - INTERVAL '8 days'),
    (seed_uuid('user-seeker-animesh'), seed_uuid('job-apex-2'), CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (seed_uuid('user-seeker-sarah'), seed_uuid('job-animesh-1'), CURRENT_TIMESTAMP - INTERVAL '9 days'),
    (seed_uuid('user-seeker-sarah'), seed_uuid('job-apex-1'), CURRENT_TIMESTAMP - INTERVAL '11 days'),
    (seed_uuid('user-seeker-marcus'), seed_uuid('job-animesh-3'), CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (seed_uuid('user-seeker-priya'), seed_uuid('job-animesh-2'), CURRENT_TIMESTAMP - INTERVAL '7 days'),
    (seed_uuid('user-seeker-alex'), seed_uuid('job-apex-2'), CURRENT_TIMESTAMP - INTERVAL '5 days');

-- 10. SUGGESTED JOBS (AI Matches: All-to-All Candidate <-> Job with Match Scores)
INSERT INTO suggested_jobs (user_id, job_id, match_score, suggested_at)
VALUES
    (seed_uuid('user-seeker-animesh'), seed_uuid('job-animesh-1'), 0.96, CURRENT_TIMESTAMP - INTERVAL '1 days'),
    (seed_uuid('user-seeker-animesh'), seed_uuid('job-animesh-2'), 0.88, CURRENT_TIMESTAMP - INTERVAL '1 days'),
    (seed_uuid('user-seeker-animesh'), seed_uuid('job-apex-1'), 0.92, CURRENT_TIMESTAMP - INTERVAL '1 days'),
    (seed_uuid('user-seeker-animesh'), seed_uuid('job-apex-2'), 0.75, CURRENT_TIMESTAMP - INTERVAL '1 days'),

    (seed_uuid('user-seeker-sarah'), seed_uuid('job-animesh-1'), 0.98, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (seed_uuid('user-seeker-sarah'), seed_uuid('job-apex-1'), 0.94, CURRENT_TIMESTAMP - INTERVAL '2 days'),

    (seed_uuid('user-seeker-marcus'), seed_uuid('job-animesh-3'), 0.95, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (seed_uuid('user-seeker-marcus'), seed_uuid('job-apex-1'), 0.87, CURRENT_TIMESTAMP - INTERVAL '2 days'),

    (seed_uuid('user-seeker-priya'), seed_uuid('job-animesh-2'), 0.97, CURRENT_TIMESTAMP - INTERVAL '1 days'),
    (seed_uuid('user-seeker-priya'), seed_uuid('job-animesh-4'), 0.84, CURRENT_TIMESTAMP - INTERVAL '1 days'),

    (seed_uuid('user-seeker-alex'), seed_uuid('job-apex-2'), 0.99, CURRENT_TIMESTAMP - INTERVAL '1 days'),
    (seed_uuid('user-seeker-alex'), seed_uuid('job-animesh-1'), 0.81, CURRENT_TIMESTAMP - INTERVAL '1 days');

-- 11. TALENT POOLS & CANDIDATES (1-to-All Company -> TalentPool, All-to-All Pool <-> Candidates)
INSERT INTO talent_pools (id, company_id, name, created_at, updated_at)
VALUES
    (seed_uuid('pool-backend'), seed_uuid('company-animesh'), 'Elite Systems & Backend Engineers', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP),
    (seed_uuid('pool-frontend'), seed_uuid('company-animesh'), 'Design Systems & Frontend Specialists', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP),
    (seed_uuid('pool-apex-infra'), seed_uuid('company-apex'), 'High-Scale Cloud & DevOps Pool', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP);

INSERT INTO talent_pool_resumes (pool_id, user_id, resume_id)
VALUES
    (seed_uuid('pool-backend'), seed_uuid('user-seeker-sarah'), seed_uuid('resume-sarah')),
    (seed_uuid('pool-backend'), seed_uuid('user-seeker-animesh'), seed_uuid('resume-animesh')),
    (seed_uuid('pool-backend'), seed_uuid('user-seeker-alex'), seed_uuid('resume-alex')),

    (seed_uuid('pool-frontend'), seed_uuid('user-seeker-priya'), seed_uuid('resume-priya')),
    (seed_uuid('pool-frontend'), seed_uuid('user-seeker-elena'), seed_uuid('resume-elena')),

    (seed_uuid('pool-apex-infra'), seed_uuid('user-seeker-marcus'), seed_uuid('resume-marcus')),
    (seed_uuid('pool-apex-infra'), seed_uuid('user-seeker-sarah'), seed_uuid('resume-sarah'));

-- 12. PROMO CODES (Discounts for Checkout & Redemptions)
INSERT INTO promo_codes (
    id, code, discount_percentage, duration_months, valid_from, valid_until, max_uses, used_count, is_active, created_at
)
VALUES
    (seed_uuid('promo-kraft100'), 'KRAFT100', 100, 12, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP + INTERVAL '300 days', 500, 2, true, CURRENT_TIMESTAMP - INTERVAL '60 days'),
    (seed_uuid('promo-launch50'), 'LAUNCH50', 50, 12, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP + INTERVAL '180 days', 1000, 15, true, CURRENT_TIMESTAMP - INTERVAL '60 days'),
    (seed_uuid('promo-vipfree'), 'VIPFREE', 100, 1, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP + INTERVAL '365 days', 100, 1, true, CURRENT_TIMESTAMP - INTERVAL '30 days');

-- 13. SUBSCRIPTIONS (1-to-1 User <-> Subscription)
INSERT INTO subscriptions (
    user_id, plan_id, status, source, founding_slot, current_period_start, current_period_end, created_at, updated_at
)
VALUES
    (
        seed_uuid('user-seeker-animesh'),
        'yearly_premium',
        'active',
        'founding',
        1,
        CURRENT_TIMESTAMP - INTERVAL '30 days',
        CURRENT_TIMESTAMP + INTERVAL '335 days',
        CURRENT_TIMESTAMP - INTERVAL '30 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('user-seeker-sarah'),
        'yearly_premium',
        'active',
        'founding',
        2,
        CURRENT_TIMESTAMP - INTERVAL '25 days',
        CURRENT_TIMESTAMP + INTERVAL '340 days',
        CURRENT_TIMESTAMP - INTERVAL '25 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('user-recruiter-animesh'),
        'yearly_premium',
        'active',
        'payment',
        NULL,
        CURRENT_TIMESTAMP - INTERVAL '45 days',
        CURRENT_TIMESTAMP + INTERVAL '320 days',
        CURRENT_TIMESTAMP - INTERVAL '45 days',
        CURRENT_TIMESTAMP
    ),
    (
        seed_uuid('user-recruiter-sarah'),
        'yearly_premium',
        'active',
        'founding',
        3,
        CURRENT_TIMESTAMP - INTERVAL '40 days',
        CURRENT_TIMESTAMP + INTERVAL '325 days',
        CURRENT_TIMESTAMP - INTERVAL '40 days',
        CURRENT_TIMESTAMP
    );

-- 14. CREDIT TRANSACTIONS (Referral ledger)
INSERT INTO credit_transactions (id, user_id, amount, reason, created_at)
VALUES
    (seed_uuid('tx-1'), seed_uuid('user-seeker-animesh'), 100, 'Successful referral of sarah.chen@example.com', CURRENT_TIMESTAMP - INTERVAL '25 days'),
    (seed_uuid('tx-2'), seed_uuid('user-seeker-animesh'), 100, 'Successful referral of marcus.dev@example.com', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    (seed_uuid('tx-3'), seed_uuid('user-seeker-animesh'), 100, 'Successful referral of priya.patel@example.com', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    (seed_uuid('tx-4'), seed_uuid('user-seeker-animesh'), -100, 'Redemption for 1-month Premium extension', CURRENT_TIMESTAMP - INTERVAL '10 days');

-- 15. PAYMENT ORDERS (Paid & Created transactions)
INSERT INTO payment_orders (
    id, user_id, razorpay_order_id, razorpay_payment_id, amount_minor, currency, status,
    plan_id, signature_verified, promo_code_id, created_at, paid_at
)
VALUES
    (
        seed_uuid('order-1'),
        seed_uuid('user-recruiter-animesh'),
        'order_DEMO_RECRUIT_001',
        'pay_DEMO_RECRUIT_001',
        9900,
        'USD',
        'paid',
        'yearly_premium',
        true,
        seed_uuid('promo-launch50'),
        CURRENT_TIMESTAMP - INTERVAL '45 days',
        CURRENT_TIMESTAMP - INTERVAL '45 days'
    );

-- 16. PLATFORM STATS REFRESH
INSERT INTO stats (id, live_jobs, companies, candidates, new_jobs, updated_at)
VALUES (1, 0, 0, 0, 0, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

UPDATE stats SET
    live_jobs = (SELECT COUNT(*) FROM jobs WHERE status = 'active'),
    companies = (SELECT COUNT(*) FROM companies),
    candidates = (SELECT COUNT(*) FROM users WHERE role = 'user'),
    new_jobs = (SELECT COUNT(*) FROM jobs WHERE posted_at > CURRENT_TIMESTAMP - INTERVAL '7 days'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- 7b. ADDITIONAL BULK JOBS FOR SEARCH & PAGINATION (All linked to companies)
INSERT INTO jobs (
    id, company_id, company_name, position_title, location,
    employment_type, salary_min, salary_max, salary_currency, salary_period,
    description, status, posted_at, created_at, updated_at
)
SELECT
    seed_uuid('bulk-active-job-' || idx::TEXT),
    CASE WHEN idx % 2 = 0 THEN seed_uuid('company-animesh') ELSE seed_uuid('company-apex') END,
    CASE WHEN idx % 2 = 0 THEN 'Animesh Tech Innovations' ELSE 'Apex Cloud Systems' END,
    (ARRAY['Senior Backend Engineer', 'Frontend Specialist', 'DevOps Architect', 'Data Platform Engineer', 'Security Engineer', 'Solutions Architect', 'Full Stack Developer', 'Site Reliability Engineer', 'Cloud Infrastructure Engineer', 'Mobile Developer (React Native)'])[((idx - 1) % 10) + 1] || ' ' || idx::TEXT,
    (ARRAY['Remote', 'Bengaluru, India', 'Hyderabad, India', 'Pune, India', 'San Francisco, CA', 'Austin, TX', 'Remote - US', 'Remote - India'])[((idx - 1) % 8) + 1],
    (ARRAY['Full-time', 'Hybrid', 'Remote'])[((idx - 1) % 3) + 1],
    90000 + (((idx - 1) % 10) * 10000),
    150000 + (((idx - 1) % 10) * 12000),
    'USD', 'Yearly',
    'Join our fast-growing engineering team to build scalable, resilient platforms. Listing #' || idx::TEXT || ' with competitive benefits and stock options.',
    'active',
    CURRENT_TIMESTAMP - ((idx % 30) || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - ((idx % 30) || ' days')::INTERVAL,
    CURRENT_TIMESTAMP - ((idx % 30) || ' days')::INTERVAL
FROM generate_series(1, 100) AS idx;

-- Update stats again
UPDATE stats SET
    live_jobs = (SELECT COUNT(*) FROM jobs WHERE status = 'active'),
    companies = (SELECT COUNT(*) FROM companies),
    candidates = (SELECT COUNT(*) FROM users WHERE role = 'user'),
    new_jobs = (SELECT COUNT(*) FROM jobs WHERE posted_at > CURRENT_TIMESTAMP - INTERVAL '7 days'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

DROP FUNCTION seed_uuid(TEXT);

COMMIT;
