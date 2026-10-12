use crate::module::applications::model::{
    Application, ApplicationDetailed, CreateApplicationRequest, JobApplicationCount,
    RecruiterInboxApplication,
};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct ApplicationRepository {
    pool: PgPool,
}

impl ApplicationRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_user(&self, user_id: Uuid) -> Result<Vec<Application>, sqlx::Error> {
        sqlx::query_as::<_, Application>(
            "SELECT * FROM applications WHERE user_id = $1 ORDER BY applied_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_by_user_and_job(
        &self,
        user_id: Uuid,
        job_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let exists: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM applications WHERE user_id = $1 AND job_id = $2)",
        )
        .bind(user_id)
        .bind(job_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(exists.0)
    }

    pub async fn find_by_job(&self, job_id: Uuid) -> Result<Vec<Application>, sqlx::Error> {
        sqlx::query_as::<_, Application>(
            "SELECT * FROM applications WHERE job_id = $1 ORDER BY applied_at DESC",
        )
        .bind(job_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_by_job_detailed(
        &self,
        job_id: Uuid,
    ) -> Result<Vec<ApplicationDetailed>, sqlx::Error> {
        sqlx::query_as::<_, ApplicationDetailed>(
            r#"
            SELECT
                a.id,
                a.job_id,
                a.user_id,
                a.resume_id,
                a.status,
                a.applied_at,
                a.created_at,
                a.updated_at,
                u.name AS candidate_name,
                u.email AS candidate_email,
                cp.bio AS candidate_bio,
                r.title AS resume_title,
                r.file_name AS resume_file_name,
                sj.match_score,
                j.position_title
            FROM applications a
            JOIN users u ON u.id = a.user_id
            JOIN jobs j ON j.id = a.job_id
            LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
            LEFT JOIN resumes r ON r.id = a.resume_id
            LEFT JOIN suggested_jobs sj ON sj.user_id = a.user_id AND sj.job_id = a.job_id
            WHERE a.job_id = $1
            ORDER BY COALESCE(sj.match_score, 0) DESC, a.applied_at DESC
            "#,
        )
        .bind(job_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_inbox_by_company(
        &self,
        company_id: Uuid,
        limit: i64,
    ) -> Result<Vec<RecruiterInboxApplication>, sqlx::Error> {
        sqlx::query_as::<_, RecruiterInboxApplication>(
            r#"
            SELECT
                a.id,
                a.job_id,
                a.user_id,
                a.resume_id,
                a.status,
                a.applied_at,
                u.name AS candidate_name,
                u.email AS candidate_email,
                r.file_name AS resume_file_name,
                sj.match_score,
                j.position_title,
                COALESCE(c.name, j.company_name) AS company_name
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            LEFT JOIN companies c ON c.id = j.company_id
            JOIN users u ON u.id = a.user_id
            LEFT JOIN resumes r ON r.id = a.resume_id
            LEFT JOIN suggested_jobs sj ON sj.user_id = a.user_id AND sj.job_id = a.job_id
            WHERE j.company_id = $1
            ORDER BY a.applied_at DESC
            LIMIT $2
            "#,
        )
        .bind(company_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_unified_inbox_by_recruiter(
        &self,
        recruiter_id: Uuid,
        limit: i64,
    ) -> Result<Vec<RecruiterInboxApplication>, sqlx::Error> {
        sqlx::query_as::<_, RecruiterInboxApplication>(
            r#"
            SELECT
                a.id,
                a.job_id,
                a.user_id,
                a.resume_id,
                a.status,
                a.applied_at,
                u.name AS candidate_name,
                u.email AS candidate_email,
                r.file_name AS resume_file_name,
                sj.match_score,
                j.position_title,
                COALESCE(c.name, j.company_name) AS company_name
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            JOIN recruiter_companies rc ON rc.company_id = j.company_id
            LEFT JOIN companies c ON c.id = j.company_id
            JOIN users u ON u.id = a.user_id
            LEFT JOIN resumes r ON r.id = a.resume_id
            LEFT JOIN suggested_jobs sj ON sj.user_id = a.user_id AND sj.job_id = a.job_id
            WHERE rc.user_id = $1
            ORDER BY a.applied_at DESC
            LIMIT $2
            "#,
        )
        .bind(recruiter_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn count_overview_stats(
        &self,
        company_id: Uuid,
    ) -> Result<(i64, i64, i64, i64), sqlx::Error> {
        let row: (i64, i64, i64, i64) = sqlx::query_as(
            r#"
            SELECT
                COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'active') AS active_jobs,
                COUNT(a.id) AS total_applications,
                COUNT(a.id) FILTER (WHERE a.applied_at >= NOW() - INTERVAL '7 days') AS new_7d,
                COUNT(a.id) FILTER (WHERE a.status = 'applied') AS pending_review
            FROM jobs j
            LEFT JOIN applications a ON a.job_id = j.id
            WHERE j.company_id = $1
            "#,
        )
        .bind(company_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn job_application_counts(
        &self,
        company_id: Uuid,
    ) -> Result<Vec<JobApplicationCount>, sqlx::Error> {
        sqlx::query_as::<_, JobApplicationCount>(
            r#"
            SELECT
                j.id AS job_id,
                j.position_title,
                COALESCE(j.status, 'active') AS status,
                COUNT(a.id) AS application_count,
                COUNT(a.id) FILTER (WHERE a.applied_at >= NOW() - INTERVAL '7 days') AS new_count_7d
            FROM jobs j
            LEFT JOIN applications a ON a.job_id = j.id
            WHERE j.company_id = $1
            GROUP BY j.id, j.position_title, j.status
            ORDER BY MAX(a.applied_at) DESC NULLS LAST, j.posted_at DESC
            "#,
        )
        .bind(company_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Application>, sqlx::Error> {
        sqlx::query_as::<_, Application>("SELECT * FROM applications WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn find_user_display_name(&self, user_id: Uuid) -> Result<String, sqlx::Error> {
        let row: Option<(String, String)> = sqlx::query_as(
            "SELECT name, email FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row
            .map(|(name, email)| {
                if name.trim().is_empty() {
                    email
                } else {
                    name
                }
            })
            .unwrap_or_else(|| "A candidate".to_string()))
    }

    pub async fn find_user_contact(
        &self,
        user_id: Uuid,
    ) -> Result<Option<(String, String)>, sqlx::Error> {
        sqlx::query_as::<_, (String, String)>("SELECT name, email FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn create(
        &self,
        user_id: Uuid,
        resume_id: Option<Uuid>,
        data: CreateApplicationRequest,
    ) -> Result<Application, sqlx::Error> {
        sqlx::query_as::<_, Application>(
            r#"
            INSERT INTO applications (job_id, user_id, resume_id, status)
            VALUES ($1, $2, $3, 'applied')
            RETURNING *
            "#,
        )
        .bind(data.job_id)
        .bind(user_id)
        .bind(resume_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_status(
        &self,
        id: Uuid,
        status: &str,
    ) -> Result<Option<Application>, sqlx::Error> {
        sqlx::query_as::<_, Application>(
            "UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *"
        )
        .bind(status)
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }
}
