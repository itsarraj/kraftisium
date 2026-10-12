use sqlx::PgPool;

#[derive(Debug, Clone)]
pub struct StatsRow {
    pub live_jobs: i64,
    pub companies: i64,
    pub candidates: i64,
    pub new_jobs: i64,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Live mode only. `candidates` = resumes uploaded, the app's original
/// definition of an engaged candidate (raw signup counts are a different,
/// much larger, less meaningful number).
pub async fn refresh_stats(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE stats SET
            live_jobs = (SELECT COUNT(*) FROM jobs WHERE COALESCE(status, 'active') = 'active'),
            companies = (SELECT COUNT(*) FROM companies),
            candidates = (SELECT COUNT(*) FROM resumes),
            new_jobs = (SELECT COUNT(*) FROM jobs
                WHERE COALESCE(status, 'active') = 'active'
                  AND posted_at > CURRENT_TIMESTAMP - INTERVAL '7 days'),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_stats(pool: &PgPool) -> Result<Option<StatsRow>, sqlx::Error> {
    let row = sqlx::query_as::<_, (i64, i64, i64, i64, chrono::DateTime<chrono::Utc>)>(
        "SELECT live_jobs, companies, candidates, new_jobs, updated_at FROM stats WHERE id = 1",
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(
        |(live_jobs, companies, candidates, new_jobs, updated_at)| StatsRow {
            live_jobs,
            companies,
            candidates,
            new_jobs,
            updated_at,
        },
    ))
}

/// Seeds the row with the configured hardcoded values on first creation, so
/// live mode doesn't briefly show zeros before the first refresh completes.
pub async fn ensure_stats_row(
    pool: &PgPool,
    initial: (i64, i64, i64, i64),
) -> Result<(), sqlx::Error> {
    let exists: (bool,) = sqlx::query_as("SELECT EXISTS(SELECT 1 FROM stats WHERE id = 1)")
        .fetch_one(pool)
        .await?;
    if !exists.0 {
        sqlx::query(
            "INSERT INTO stats (id, live_jobs, companies, candidates, new_jobs, updated_at) VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)",
        )
        .bind(initial.0)
        .bind(initial.1)
        .bind(initial.2)
        .bind(initial.3)
        .execute(pool)
        .await?;
    }
    Ok(())
}
