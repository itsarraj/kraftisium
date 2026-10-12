use crate::module::profiles::model::{
    CandidateProfile, CreateCandidateProfileRequest, CreateEmployerProfileRequest, EmployerProfile,
};
use crate::module::recruiter::model::Company;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct ProfilesRepository {
    pool: PgPool,
}

impl ProfilesRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn upsert_employer_profile(
        &self,
        user_id: Uuid,
        data: CreateEmployerProfileRequest,
    ) -> Result<EmployerProfile, sqlx::Error> {
        let profile = sqlx::query_as::<_, EmployerProfile>(
            r#"
            INSERT INTO employer_profiles (user_id, job_title, mobile, company_type)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE SET
                job_title = EXCLUDED.job_title,
                mobile = EXCLUDED.mobile,
                company_type = EXCLUDED.company_type,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
            "#
        )
        .bind(user_id)
        .bind(data.job_title)
        .bind(data.mobile)
        .bind(data.company_type)
        .fetch_one(&self.pool)
        .await?;

        Ok(profile)
    }

    pub async fn find_employer_profile(
        &self,
        user_id: Uuid,
    ) -> Result<Option<EmployerProfile>, sqlx::Error> {
        sqlx::query_as::<_, EmployerProfile>(
            r#"
            SELECT
                user_id,
                job_title,
                mobile,
                company_type,
                created_at,
                updated_at
            FROM employer_profiles
            WHERE user_id = $1
            "#,
        )
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn upsert_candidate_profile(
        &self,
        user_id: Uuid,
        data: CreateCandidateProfileRequest,
    ) -> Result<CandidateProfile, sqlx::Error> {
        let profile = sqlx::query_as::<_, CandidateProfile>(
            r#"
            INSERT INTO candidate_profiles (user_id, bio)
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET
                bio = CASE
                    WHEN $2 IS NULL THEN candidate_profiles.bio
                    WHEN TRIM($2) = '' THEN NULL
                    ELSE TRIM($2)
                END,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(data.bio.as_deref())
        .fetch_one(&self.pool)
        .await?;

        Ok(profile)
    }

    pub async fn find_candidate_profile(
        &self,
        user_id: Uuid,
    ) -> Result<Option<CandidateProfile>, sqlx::Error> {
        sqlx::query_as::<_, CandidateProfile>("SELECT * FROM candidate_profiles WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
    }

    /// Returns the first company linked to `user_id` via `recruiter_companies`.
    /// Recruiters who have created a company will get it back; those who
    /// haven't yet return `None` (caller should 404).
    pub async fn find_employer_company(
        &self,
        user_id: Uuid,
    ) -> Result<Option<Company>, sqlx::Error> {
        sqlx::query_as::<_, Company>(
            r#"
            SELECT c.*
            FROM companies c
            JOIN recruiter_companies rc ON rc.company_id = c.id
            WHERE rc.user_id = $1
            ORDER BY rc.created_at ASC
            LIMIT 1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
    }
}
