use std::collections::HashMap;
use std::sync::Arc;

use uuid::Uuid;

use crate::configuration::MatcherSettings;
use crate::search::JobSearchIndex;
use sqlx::PgPool;

pub fn matcher_is_configured(matcher: &MatcherSettings) -> bool {
    matcher
        .base_url
        .as_ref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
}

/// Score resume–job pairs for applicants missing suggested_jobs rows.
pub async fn score_applicants_for_job(
    matcher: &MatcherSettings,
    job_id: Uuid,
    user_ids: &[Uuid],
) -> HashMap<Uuid, f64> {
    if user_ids.is_empty() || !matcher_is_configured(matcher) {
        return HashMap::new();
    }

    let Some(ref base_raw) = matcher.base_url else {
        return HashMap::new();
    };
    let base = base_raw.trim().trim_end_matches('/');
    if base.is_empty() {
        return HashMap::new();
    }

    let url = format!("{}/v1/score-applicants/{}", base, job_id);
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            log::warn!("matcher score HTTP client build failed: {}", e);
            return HashMap::new();
        }
    };

    let body = serde_json::json!({ "user_ids": user_ids });
    let mut req = client.post(&url).json(&body);
    if let Some(ref s) = matcher.internal_secret {
        if !s.is_empty() {
            req = req.header("X-Matcher-Secret", s);
        }
    }

    let resp = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            log::warn!("matcher score-applicants failed for job {}: {}", job_id, e);
            return HashMap::new();
        }
    };

    if !resp.status().is_success() {
        log::warn!(
            "matcher score-applicants HTTP {} for job {}",
            resp.status(),
            job_id
        );
        return HashMap::new();
    }

    #[derive(serde::Deserialize)]
    struct ScoreResponse {
        scores: HashMap<String, f64>,
    }

    let parsed: ScoreResponse = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            log::warn!("matcher score-applicants parse failed for job {}: {}", job_id, e);
            return HashMap::new();
        }
    };

    parsed
        .scores
        .into_iter()
        .filter_map(|(uid, score)| Uuid::parse_str(&uid).ok().map(|u| (u, score)))
        .collect()
}

/// Hybrid refresh: Python matcher (Postgres full-text prefilter + embeddings) when
/// configured, otherwise in-process Postgres keyword ranking on the BFF.
pub fn spawn_refresh_suggestions(
    matcher: &MatcherSettings,
    pool: PgPool,
    search_index: Arc<JobSearchIndex>,
    user_id: Uuid,
) {
    if matcher_is_configured(matcher) {
        spawn_matcher_http_refresh(matcher, user_id);
    } else {
        crate::suggestions::spawn_keyword_refresh(pool, search_index, user_id);
    }
}

fn spawn_matcher_http_refresh(matcher: &MatcherSettings, user_id: Uuid) {
    let Some(ref base_raw) = matcher.base_url else {
        return;
    };
    let base = base_raw.trim().trim_end_matches('/');
    if base.is_empty() {
        return;
    }

    let url = format!("{}/v1/refresh/{}", base, user_id);
    let secret = matcher.internal_secret.clone();

    tokio::spawn(async move {
        let client = match reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                log::warn!("matcher HTTP client build failed: {}", e);
                return;
            }
        };

        let mut req = client.post(&url);
        if let Some(ref s) = secret {
            if !s.is_empty() {
                req = req.header("X-Matcher-Secret", s);
            }
        }

        match req.send().await {
            Ok(resp) if resp.status().is_success() => {
                log::info!("matcher refresh OK for user {}", user_id);
            }
            Ok(resp) => {
                log::warn!(
                    "matcher refresh HTTP {} for user {}",
                    resp.status(),
                    user_id
                );
            }
            Err(e) => log::warn!("matcher refresh failed for user {}: {}", user_id, e),
        }
    });
}
