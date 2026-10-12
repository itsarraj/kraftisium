//! Hybrid job suggestions when the Python matcher service is not configured.
//! Stage 1: Tantivy keyword search from resume text. Stage 2: rank by search score (no embeddings).

pub mod skills;

use crate::module::resume::repository::JobRepository;
use crate::search::JobSearchIndex;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

const PREFILTER_LIMIT: i64 = 200;
const TOP_K: usize = 25;

pub fn spawn_keyword_refresh(
    pool: PgPool,
    search_index: Arc<JobSearchIndex>,
    user_id: Uuid,
) {
    tokio::spawn(async move {
        match refresh_keyword_suggestions(&pool, &search_index, user_id).await {
            Ok(n) => log::info!("keyword suggestions refreshed for user {} ({} jobs)", user_id, n),
            Err(e) => log::warn!("keyword suggestions refresh failed for user {}: {}", user_id, e),
        }
    });
}

pub async fn refresh_keyword_suggestions(
    pool: &PgPool,
    search_index: &JobSearchIndex,
    user_id: Uuid,
) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
    let (title, content) = load_latest_resume(pool, user_id).await?;
    let text = skills::resume_plain_text(title.as_deref(), content.as_ref());
    if text.len() < 8 {
        return Err("resume text too short".into());
    }

    let query = skills::build_search_query(&text);
    let page = search_index
        .search(
            if query.is_empty() { None } else { Some(query.as_str()) },
            None,
            1,
            PREFILTER_LIMIT,
        )
        .await?;

    let mut pairs: Vec<(Uuid, f64)> = page
        .hits
        .iter()
        .map(|h| {
            // ts_rank(..., 32) already yields a score in [0, 1); just clamp it
            // away from the extremes for suggested_jobs.match_score.
            let score = (h.score as f64).clamp(0.05, 0.99);
            (h.job_id, score)
        })
        .collect();

    if pairs.is_empty() {
        let repo = JobRepository::new(pool.clone());
        let recent = repo.find_recent_for_prefilter(PREFILTER_LIMIT, 365).await?;
        pairs = recent
            .into_iter()
            .enumerate()
            .map(|(i, job)| {
                let score = (0.95 - (i as f64 * 0.01)).max(0.1);
                (job.id, score)
            })
            .collect();
    }

    pairs.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    pairs.truncate(TOP_K);

    let repo = JobRepository::new(pool.clone());
    repo.replace_suggested_jobs(user_id, &pairs).await?;
    Ok(pairs.len())
}

async fn load_latest_resume(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<(Option<String>, Option<serde_json::Value>), sqlx::Error> {
    let row: Option<(Option<String>, Option<serde_json::Value>)> = sqlx::query_as(
        r#"
        SELECT title, content
        FROM resumes
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    row.ok_or(sqlx::Error::RowNotFound)
}
