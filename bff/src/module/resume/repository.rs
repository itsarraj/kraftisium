use crate::module::resume::model::{DigestMatchRow, Job, JobFilter};
use crate::module::resume::sql::{JOB_FROM_JOIN, JOB_SELECT};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct JobRepository {
    pool: PgPool,
}

impl JobRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_all(&self, filter: JobFilter) -> Result<(Vec<Job>, i64), sqlx::Error> {
        let limit = filter.limit.unwrap_or(10);
        let offset = (filter.page.unwrap_or(1) - 1) * limit;

        let jobs = sqlx::query_as::<_, Job>(&format!(
            "SELECT {JOB_SELECT} {JOB_FROM_JOIN}
            WHERE COALESCE(j.status, 'active') = 'active'
            ORDER BY j.featured DESC, j.posted_at DESC
            LIMIT $1 OFFSET $2"
        ))
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM jobs WHERE COALESCE(status, 'active') = 'active'",
        )
            .fetch_one(&self.pool)
            .await?;

        Ok((jobs, total_count.0))
    }

    pub async fn find_suggested_for_user(&self, user_id: Uuid) -> Result<Vec<Job>, sqlx::Error> {
        sqlx::query_as::<_, Job>(&format!(
            "SELECT {JOB_SELECT}, sj.match_score {JOB_FROM_JOIN}
             JOIN suggested_jobs sj ON j.id = sj.job_id
             WHERE sj.user_id = $1
               AND COALESCE(j.status, 'active') = 'active'
             ORDER BY sj.match_score DESC"
        ))
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .map(Ok)
        .collect()
    }

    /// One row per (user, matched job) where the job was posted since `since` —
    /// the source data for the weekly "new jobs matched your profile" digest.
    /// A plain join, not per-user queries: cheap even at a few thousand users.
    pub async fn find_recent_matches_for_digest(
        &self,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<Vec<DigestMatchRow>, sqlx::Error> {
        sqlx::query_as::<_, DigestMatchRow>(
            r#"
            SELECT sj.user_id, u.name AS user_name, u.email AS user_email,
                   j.position_title, j.company_name, sj.match_score
            FROM suggested_jobs sj
            JOIN jobs j ON j.id = sj.job_id
            JOIN users u ON u.id = sj.user_id
            WHERE j.posted_at >= $1
              AND COALESCE(j.status, 'active') = 'active'
              AND u.deleted_at IS NULL
            ORDER BY sj.user_id, sj.match_score DESC NULLS LAST
            "#,
        )
        .bind(since)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Job>, sqlx::Error> {
        sqlx::query_as::<_, Job>(&format!(
            "SELECT {JOB_SELECT} {JOB_FROM_JOIN} WHERE j.id = $1"
        ))
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn find_by_ids(&self, ids: &[Uuid]) -> Result<Vec<Job>, sqlx::Error> {
        if ids.is_empty() {
            return Ok(vec![]);
        }
        sqlx::query_as::<_, Job>(&format!(
            "SELECT {JOB_SELECT} {JOB_FROM_JOIN} WHERE j.id = ANY($1)"
        ))
            .bind(ids)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn find_recent_for_prefilter(
        &self,
        limit: i64,
        posted_within_days: i64,
    ) -> Result<Vec<Job>, sqlx::Error> {
        sqlx::query_as::<_, Job>(&format!(
            "SELECT {JOB_SELECT} {JOB_FROM_JOIN}
            WHERE j.posted_at >= NOW() - make_interval(days => $1)
              AND COALESCE(j.status, 'active') = 'active'
            ORDER BY j.posted_at DESC
            LIMIT $2"
        ))
        .bind(posted_within_days)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn replace_suggested_jobs(
        &self,
        user_id: Uuid,
        rows: &[(Uuid, f64)],
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        if rows.is_empty() {
            sqlx::query("DELETE FROM suggested_jobs WHERE user_id = $1")
                .bind(user_id)
                .execute(&mut *tx)
                .await?;
            tx.commit().await?;
            return Ok(());
        }

        for (job_id, score) in rows {
            sqlx::query(
                r#"
                INSERT INTO suggested_jobs (user_id, job_id, match_score, suggested_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id, job_id) DO UPDATE SET
                    match_score = EXCLUDED.match_score,
                    suggested_at = EXCLUDED.suggested_at
                "#,
            )
            .bind(user_id)
            .bind(job_id)
            .bind(score)
            .execute(&mut *tx)
            .await?;
        }

        let placeholders: Vec<String> = (2..=rows.len() + 1).map(|i| format!("${i}")).collect();
        let sql = format!(
            "DELETE FROM suggested_jobs WHERE user_id = $1 AND job_id NOT IN ({})",
            placeholders.join(", ")
        );
        let mut q = sqlx::query(&sql).bind(user_id);
        for (job_id, _) in rows {
            q = q.bind(job_id);
        }
        q.execute(&mut *tx).await?;

        tx.commit().await?;
        Ok(())
    }
}
