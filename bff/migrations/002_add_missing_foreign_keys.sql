-- Add cascading foreign keys for user child tables to maintain referential integrity
-- and eliminate orphaned records on user deletion, plus unique constraint for applications.

DO $$
BEGIN
    -- 1. candidate_profiles -> users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'candidate_profiles_user_id_fkey'
    ) THEN
        ALTER TABLE public.candidate_profiles
            ADD CONSTRAINT candidate_profiles_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 2. employer_profiles -> users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'employer_profiles_user_id_fkey'
    ) THEN
        ALTER TABLE public.employer_profiles
            ADD CONSTRAINT employer_profiles_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 3. resumes -> users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'resumes_user_id_fkey'
    ) THEN
        ALTER TABLE public.resumes
            ADD CONSTRAINT resumes_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 4. suggested_jobs -> users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'suggested_jobs_user_id_fkey'
    ) THEN
        ALTER TABLE public.suggested_jobs
            ADD CONSTRAINT suggested_jobs_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 5. user_resume_embeddings -> users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_resume_embeddings_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_resume_embeddings
            ADD CONSTRAINT user_resume_embeddings_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 6. applications unique index on (user_id, job_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'applications' AND indexname = 'idx_applications_user_job_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_applications_user_job_unique ON public.applications (user_id, job_id);
    END IF;
END $$;
