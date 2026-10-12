use std::collections::HashMap;

use sqlx::PgPool;
use uuid::Uuid;

use crate::configuration::MatcherSettings;
use crate::matcher_client;
use crate::module::applications::model::{ApplicationDetailed, RecruiterInboxApplication};
use crate::module::resume::model::Job;
use crate::module::resume::sql::{JOB_FROM_JOIN, JOB_SELECT};
use crate::suggestions::skills;

fn job_plain_text(job: &Job) -> String {
    let mut parts = vec![
        job.position_title.clone(),
        job.company_name.clone(),
        job.location.clone(),
        job.employment_type.clone(),
    ];
    if let Some(ref desc) = job.description {
        let d = desc.trim();
        if !d.is_empty() {
            parts.push(d.to_string());
        }
    }
    parts.join("\n")
}

async fn load_job(pool: &PgPool, job_id: Uuid) -> Result<Option<Job>, sqlx::Error> {
    sqlx::query_as::<_, Job>(&format!(
        "SELECT {JOB_SELECT} {JOB_FROM_JOIN} WHERE j.id = $1"
    ))
    .bind(job_id)
    .fetch_optional(pool)
    .await
}

async fn load_resume_texts(
    pool: &PgPool,
    user_ids: &[Uuid],
) -> Result<HashMap<Uuid, String>, sqlx::Error> {
    if user_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows: Vec<(Uuid, Option<String>, Option<serde_json::Value>)> = sqlx::query_as(
        r#"
        SELECT DISTINCT ON (user_id) user_id, title, content
        FROM resumes
        WHERE user_id = ANY($1)
        ORDER BY user_id, updated_at DESC
        "#,
    )
    .bind(user_ids)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(user_id, title, content)| {
            (
                user_id,
                skills::resume_plain_text(title.as_deref(), content.as_ref()),
            )
        })
        .filter(|(_, text)| text.len() >= 8)
        .collect())
}

async fn keyword_scores_for_job(
    pool: &PgPool,
    job_id: Uuid,
    user_ids: &[Uuid],
) -> HashMap<Uuid, f64> {
    let Some(job) = load_job(pool, job_id).await.ok().flatten() else {
        return HashMap::new();
    };
    let job_text = job_plain_text(&job);

    let resume_texts = load_resume_texts(pool, user_ids).await.unwrap_or_default();
    resume_texts
        .into_iter()
        .map(|(user_id, resume_text)| {
            (
                user_id,
                skills::keyword_match_score(&resume_text, &job_text),
            )
        })
        .collect()
}

pub async fn resolve_scores_for_job(
    pool: &PgPool,
    matcher: &MatcherSettings,
    job_id: Uuid,
    user_ids: &[Uuid],
) -> HashMap<Uuid, f64> {
    if user_ids.is_empty() {
        return HashMap::new();
    }

    let mut scores = matcher_client::score_applicants_for_job(matcher, job_id, user_ids).await;

    let still_missing: Vec<Uuid> = user_ids
        .iter()
        .copied()
        .filter(|uid| !scores.contains_key(uid))
        .collect();

    if !still_missing.is_empty() {
        let fallback = keyword_scores_for_job(pool, job_id, &still_missing).await;
        for (uid, score) in fallback {
            scores.entry(uid).or_insert(score);
        }
    }

    scores
}

pub async fn enrich_detailed_scores(
    pool: &PgPool,
    matcher: &MatcherSettings,
    job_id: Uuid,
    apps: &mut [ApplicationDetailed],
) {
    if apps.is_empty() {
        return;
    }

    let user_ids: Vec<Uuid> = apps.iter().map(|a| a.user_id).collect();
    let scores = resolve_scores_for_job(pool, matcher, job_id, &user_ids).await;
    for app in apps.iter_mut() {
        if let Some(score) = scores.get(&app.user_id) {
            app.match_score = Some(*score);
        }
    }

    apps.sort_by(|a, b| {
        b.match_score
            .partial_cmp(&a.match_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.applied_at.cmp(&b.applied_at))
    });
}

pub async fn enrich_inbox_scores(
    pool: &PgPool,
    matcher: &MatcherSettings,
    apps: &mut [RecruiterInboxApplication],
) {
    let mut by_job: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
    for app in apps.iter() {
        by_job.entry(app.job_id).or_default().push(app.user_id);
    }

    let mut all_scores: HashMap<(Uuid, Uuid), f64> = HashMap::new();
    for (job_id, user_ids) in by_job {
        let unique: Vec<Uuid> = user_ids
            .into_iter()
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        let scores = resolve_scores_for_job(pool, matcher, job_id, &unique).await;
        for (user_id, score) in scores {
            all_scores.insert((job_id, user_id), score);
        }
    }

    for app in apps.iter_mut() {
        if let Some(score) = all_scores.get(&(app.job_id, app.user_id)) {
            app.match_score = Some(*score);
        }
    }

    sort_inbox_by_match(apps);
}

pub fn sort_inbox_by_match(apps: &mut [RecruiterInboxApplication]) {
    apps.sort_by(|a, b| {
        b.match_score
            .partial_cmp(&a.match_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.applied_at.cmp(&a.applied_at))
    });
}
