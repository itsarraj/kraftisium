use crate::module::resume::model::Job;
use crate::module::resume::sql::{JOB_FROM_JOIN, JOB_SELECT};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct SavedJobsRepository {
    pool: PgPool,
}

impl SavedJobsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Idempotent — saving an already-saved job is a no-op, not an error.
    pub async fn save(&self, user_id: Uuid, job_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO saved_jobs (user_id, job_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, job_id) DO NOTHING
            "#,
        )
        .bind(user_id)
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn unsave(&self, user_id: Uuid, job_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2")
            .bind(user_id)
            .bind(job_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn list(&self, user_id: Uuid) -> Result<Vec<Job>, sqlx::Error> {
        sqlx::query_as::<_, Job>(&format!(
            r#"
            SELECT {JOB_SELECT}
            {JOB_FROM_JOIN}
            JOIN saved_jobs sj ON sj.job_id = j.id
            WHERE sj.user_id = $1
            ORDER BY sj.saved_at DESC
            "#
        ))
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    /// Job ids from `job_ids` that `user_id` has already saved — used to render
    /// bookmark state on a list of jobs without an N+1 query per card.
    pub async fn saved_job_ids(
        &self,
        user_id: Uuid,
        job_ids: &[Uuid],
    ) -> Result<Vec<Uuid>, sqlx::Error> {
        if job_ids.is_empty() {
            return Ok(Vec::new());
        }
        sqlx::query_scalar::<_, Uuid>(
            "SELECT job_id FROM saved_jobs WHERE user_id = $1 AND job_id = ANY($2)",
        )
        .bind(user_id)
        .bind(job_ids)
        .fetch_all(&self.pool)
        .await
    }
}
