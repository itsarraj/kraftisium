-- Consolidated initial schema for kraftisium (job-search-app BFF).
--
-- This replaces the former sequence of 17 incremental migrations (001-017)
-- with a single squashed snapshot generated via `pg_dump --schema-only`
-- against the fully-migrated local database, so it is byte-for-byte
-- equivalent to what those 17 files produced together.
--
-- NOTE: any environment that already has the old migration history applied
-- (its _sqlx_migrations table has rows for versions 1-17) will not accept
-- this file automatically -- sqlx expects previously-applied versions to
-- still exist with matching checksums. Only run this against a fresh
-- database, or one whose _sqlx_migrations tracking has been reset.

--
-- Name: cleanup_expired_tokens(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_tokens() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: jobs_search_array_to_text(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jobs_search_array_to_text(text[]) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $_$
    SELECT coalesce(array_to_string($1, ' '), '')
$_$;


--
-- Name: jobs_search_text_to_tsvector(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jobs_search_text_to_tsvector(text) RETURNS tsvector
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $_$
    SELECT to_tsvector('english', $1)
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;



--
-- Name: account_archives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_archives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    google_sub text,
    archived_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payload jsonb NOT NULL
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    user_id uuid NOT NULL,
    resume_id uuid,
    status text DEFAULT 'applied'::text NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    ip_address inet,
    user_agent text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: candidate_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_profiles (
    user_id uuid NOT NULL,
    bio text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo_url text,
    website text,
    about text,
    industry text,
    employee_size text,
    head_office text,
    company_type text,
    since integer,
    specialization text[],
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_transactions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    reason character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: employer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employer_profiles (
    user_id uuid NOT NULL,
    job_title text,
    mobile text,
    company_type text DEFAULT 'direct'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: job_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_embeddings (
    job_id uuid NOT NULL,
    model_id text NOT NULL,
    dim integer NOT NULL,
    embedding real[] NOT NULL,
    source_text_hash text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT job_embeddings_dim_check CHECK ((dim > 0))
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    company_name text NOT NULL,
    company_logo_url text,
    position_title text NOT NULL,
    location text NOT NULL,
    employment_type text NOT NULL,
    salary_min integer,
    salary_max integer,
    salary_currency text DEFAULT 'USD'::text,
    salary_period text DEFAULT 'Yearly'::text,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    posted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    featured boolean DEFAULT false NOT NULL,
    tags text[],
    requirements text,
    facilities text,
    external_id text,
    source character varying(100),
    url text,
    is_remote boolean DEFAULT false,
    search_vector tsvector GENERATED ALWAYS AS ((((setweight(public.jobs_search_text_to_tsvector(COALESCE(position_title, ''::text)), 'A'::"char") || setweight(public.jobs_search_text_to_tsvector(((COALESCE(company_name, ''::text) || ' '::text) || public.jobs_search_array_to_text(tags))), 'B'::"char")) || setweight(public.jobs_search_text_to_tsvector(COALESCE(location, ''::text)), 'B'::"char")) || setweight(public.jobs_search_text_to_tsvector(((COALESCE(description, ''::text) || ' '::text) || COALESCE(requirements, ''::text))), 'C'::"char"))) STORED,
    CONSTRAINT jobs_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text])))
);


--
-- Name: payment_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    razorpay_order_id character varying(255) NOT NULL,
    razorpay_payment_id character varying(255),
    amount_minor bigint NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(50) DEFAULT 'created'::character varying NOT NULL,
    plan_id character varying(100) DEFAULT 'yearly_premium'::character varying NOT NULL,
    signature_verified boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    paid_at timestamp without time zone,
    promo_code_id uuid,
    CONSTRAINT payment_orders_status_check CHECK (((status)::text = ANY ((ARRAY['created'::character varying, 'paid'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    discount_percentage integer NOT NULL,
    duration_months integer,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT promo_codes_code_uppercase CHECK (((code)::text = upper((code)::text))),
    CONSTRAINT promo_codes_discount_percentage_check CHECK (((discount_percentage >= 0) AND (discount_percentage <= 100)))
);


--
-- Name: recruiter_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recruiter_companies (
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: referral_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_settings (
    id boolean DEFAULT true NOT NULL,
    credits_per_referral integer DEFAULT 100 NOT NULL,
    credits_required_for_redemption integer DEFAULT 300 NOT NULL,
    redemption_premium_months integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referral_settings_id_check CHECK (id)
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: resumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resumes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    content jsonb,
    file_name text,
    file_type text,
    file_size integer,
    file_data bytea,
    storage_path text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: saved_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_jobs (
    user_id uuid NOT NULL,
    job_id uuid NOT NULL,
    saved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats (
    id integer DEFAULT 1 NOT NULL,
    live_jobs bigint DEFAULT 0 NOT NULL,
    companies bigint DEFAULT 0 NOT NULL,
    candidates bigint DEFAULT 0 NOT NULL,
    new_jobs bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT stats_id_check CHECK ((id = 1))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    user_id uuid NOT NULL,
    plan_id text DEFAULT 'yearly_premium'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    source text DEFAULT 'founding'::text NOT NULL,
    founding_slot integer,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_source_check CHECK ((source = ANY (ARRAY['founding'::text, 'dev_auto'::text, 'payment'::text, 'manual'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'canceled'::text])))
);


--
-- Name: suggested_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suggested_jobs (
    user_id uuid NOT NULL,
    job_id uuid NOT NULL,
    match_score double precision,
    suggested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: talent_pool_resumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.talent_pool_resumes (
    pool_id uuid NOT NULL,
    user_id uuid NOT NULL,
    resume_id uuid
);


--
-- Name: talent_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.talent_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: token_blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_blacklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_resume_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_resume_embeddings (
    user_id uuid NOT NULL,
    model_id text NOT NULL,
    resume_text_hash text NOT NULL,
    dim integer NOT NULL,
    embedding real[] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_resume_embeddings_dim_check CHECK ((dim > 0))
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_token character varying(255) NOT NULL,
    ip_address inet,
    user_agent text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    email_verified boolean DEFAULT false,
    google_sub character varying(255),
    email_verification_token character varying(255),
    email_verification_expires_at timestamp without time zone,
    password_reset_token character varying(255),
    password_reset_expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    referral_code character varying(20),
    referred_by uuid,
    is_premium_candidate boolean DEFAULT false,
    referral_credits integer DEFAULT 0 NOT NULL,
    deleted_at timestamp without time zone,
    terms_accepted_at timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'moderator'::character varying, 'recruiter'::character varying])::text[])))
);


--
-- Name: account_archives account_archives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_archives
    ADD CONSTRAINT account_archives_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: candidate_profiles candidate_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: employer_profiles employer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employer_profiles
    ADD CONSTRAINT employer_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: job_embeddings job_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_embeddings
    ADD CONSTRAINT job_embeddings_pkey PRIMARY KEY (job_id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: payment_orders payment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_pkey PRIMARY KEY (id);


--
-- Name: payment_orders payment_orders_razorpay_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_razorpay_order_id_key UNIQUE (razorpay_order_id);


--
-- Name: payment_orders payment_orders_razorpay_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_razorpay_payment_id_key UNIQUE (razorpay_payment_id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: recruiter_companies recruiter_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruiter_companies
    ADD CONSTRAINT recruiter_companies_pkey PRIMARY KEY (user_id, company_id);


--
-- Name: referral_settings referral_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_settings
    ADD CONSTRAINT referral_settings_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: resumes resumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);


--
-- Name: saved_jobs saved_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_pkey PRIMARY KEY (user_id, job_id);


--
-- Name: stats stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats
    ADD CONSTRAINT stats_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (user_id);


--
-- Name: suggested_jobs suggested_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suggested_jobs
    ADD CONSTRAINT suggested_jobs_pkey PRIMARY KEY (user_id, job_id);


--
-- Name: talent_pool_resumes talent_pool_resumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_pool_resumes
    ADD CONSTRAINT talent_pool_resumes_pkey PRIMARY KEY (pool_id, user_id);


--
-- Name: talent_pools talent_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_pools
    ADD CONSTRAINT talent_pools_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist token_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist token_blacklist_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_token_hash_key UNIQUE (token_hash);


--
-- Name: jobs unique_external_job; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT unique_external_job UNIQUE (external_id, source);


--
-- Name: user_resume_embeddings user_resume_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_resume_embeddings
    ADD CONSTRAINT user_resume_embeddings_pkey PRIMARY KEY (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_sub_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_sub_key UNIQUE (google_sub);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: idx_account_archives_archived_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_archives_archived_at ON public.account_archives USING btree (archived_at);


--
-- Name: idx_account_archives_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_archives_email ON public.account_archives USING btree (email);


--
-- Name: idx_account_archives_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_archives_user_id ON public.account_archives USING btree (user_id);


--
-- Name: idx_applications_applied_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_applied_at ON public.applications USING btree (applied_at DESC);


--
-- Name: idx_applications_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_job_id ON public.applications USING btree (job_id);


--
-- Name: idx_applications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_user_id ON public.applications USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_credit_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions USING btree (user_id);


--
-- Name: idx_job_embeddings_model_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_embeddings_model_id ON public.job_embeddings USING btree (model_id);


--
-- Name: idx_jobs_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_company_id ON public.jobs USING btree (company_id);


--
-- Name: idx_jobs_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_external_id ON public.jobs USING btree (external_id);


--
-- Name: idx_jobs_external_id_source_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_jobs_external_id_source_unique ON public.jobs USING btree (external_id, source) WHERE ((external_id IS NOT NULL) AND (source IS NOT NULL));


--
-- Name: idx_jobs_featured_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_featured_active ON public.jobs USING btree (featured DESC, posted_at DESC) WHERE (COALESCE(status, 'active'::text) = 'active'::text);


--
-- Name: idx_jobs_posted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_posted_at ON public.jobs USING btree (posted_at DESC);


--
-- Name: idx_jobs_search_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_search_vector ON public.jobs USING gin (search_vector);


--
-- Name: idx_jobs_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_source ON public.jobs USING btree (source);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);


--
-- Name: idx_payment_orders_razorpay_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_razorpay_payment_id ON public.payment_orders USING btree (razorpay_payment_id);


--
-- Name: idx_payment_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_status ON public.payment_orders USING btree (status);


--
-- Name: idx_payment_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_user_id ON public.payment_orders USING btree (user_id);


--
-- Name: idx_recruiter_companies_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recruiter_companies_company_id ON public.recruiter_companies USING btree (company_id);


--
-- Name: idx_recruiter_companies_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recruiter_companies_user_id ON public.recruiter_companies USING btree (user_id);


--
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_resumes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resumes_user_id ON public.resumes USING btree (user_id);


--
-- Name: idx_saved_jobs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_jobs_user_id ON public.saved_jobs USING btree (user_id);


--
-- Name: idx_subscriptions_founding_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_founding_slot ON public.subscriptions USING btree (founding_slot) WHERE (founding_slot IS NOT NULL);


--
-- Name: idx_subscriptions_founding_slot_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_subscriptions_founding_slot_unique ON public.subscriptions USING btree (founding_slot) WHERE (founding_slot IS NOT NULL);


--
-- Name: idx_subscriptions_period_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_period_end ON public.subscriptions USING btree (current_period_end);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_suggested_jobs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suggested_jobs_user_id ON public.suggested_jobs USING btree (user_id);


--
-- Name: idx_talent_pool_resumes_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_talent_pool_resumes_pool_id ON public.talent_pool_resumes USING btree (pool_id);


--
-- Name: idx_talent_pools_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_talent_pools_company_id ON public.talent_pools USING btree (company_id);


--
-- Name: idx_token_blacklist_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_blacklist_expires_at ON public.token_blacklist USING btree (expires_at);


--
-- Name: idx_token_blacklist_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_blacklist_token_hash ON public.token_blacklist USING btree (token_hash);


--
-- Name: idx_user_resume_embeddings_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_resume_embeddings_model ON public.user_resume_embeddings USING btree (model_id);


--
-- Name: idx_user_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_session_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_session_token ON public.user_sessions USING btree (session_token);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_verification_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_verification_expires_at ON public.users USING btree (email_verification_expires_at);


--
-- Name: idx_users_email_verification_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_verification_token ON public.users USING btree (email_verification_token);


--
-- Name: idx_users_google_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_google_sub ON public.users USING btree (google_sub);


--
-- Name: idx_users_is_premium_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_premium_candidate ON public.users USING btree (is_premium_candidate);


--
-- Name: idx_users_password_reset_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_password_reset_token ON public.users USING btree (password_reset_token);


--
-- Name: idx_users_referred_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_referred_by ON public.users USING btree (referred_by);


--
-- Name: talent_pools update_talent_pools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_talent_pools_updated_at BEFORE UPDATE ON public.talent_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: credit_transactions credit_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_embeddings job_embeddings_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_embeddings
    ADD CONSTRAINT job_embeddings_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: payment_orders payment_orders_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id);


--
-- Name: payment_orders payment_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recruiter_companies recruiter_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruiter_companies
    ADD CONSTRAINT recruiter_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: recruiter_companies recruiter_companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruiter_companies
    ADD CONSTRAINT recruiter_companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: saved_jobs saved_jobs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: saved_jobs saved_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: suggested_jobs suggested_jobs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suggested_jobs
    ADD CONSTRAINT suggested_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: talent_pool_resumes talent_pool_resumes_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_pool_resumes
    ADD CONSTRAINT talent_pool_resumes_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.talent_pools(id) ON DELETE CASCADE;


--
-- Name: talent_pool_resumes talent_pool_resumes_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_pool_resumes
    ADD CONSTRAINT talent_pool_resumes_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;


--
-- Name: talent_pool_resumes talent_pool_resumes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_pool_resumes
    ADD CONSTRAINT talent_pool_resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: talent_pools talent_pools_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_pools
    ADD CONSTRAINT talent_pools_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id) ON DELETE SET NULL;


-- Required seed data: referral_settings is a singleton config row (referral_settings_id_check
-- enforces id = TRUE). Unlike `stats`, nothing in the app bootstraps this row at runtime, so it
-- must exist from migration time or SubscriptionService::referral_settings()/redeem_credits()
-- will fail with "no rows returned".
INSERT INTO public.referral_settings (id) VALUES (TRUE);
