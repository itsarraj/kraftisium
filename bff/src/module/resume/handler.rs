use crate::configuration::Settings;
use crate::matcher_client;
use crate::middleware::auth;
use crate::module::resume::model::{JobFilter, JobSearchQuery};
use crate::module::resume::service::JobService;
use crate::module::subscription::service::SubscriptionService;
use crate::search::JobSearchIndex;
use crate::DbPool;
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use std::sync::Arc;
use uuid::Uuid;

pub async fn list_jobs(
    service: web::Data<Arc<JobService>>,
    filter: web::Query<JobFilter>,
) -> impl Responder {
    match service.get_jobs(filter.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Failed to list jobs: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn search_jobs(
    service: web::Data<Arc<JobService>>,
    query: web::Query<JobSearchQuery>,
) -> impl Responder {
    match service.search_jobs(query.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Failed to search jobs: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "search_failed",
                "message": e.to_string()
            }))
        }
    }
}

pub async fn get_suggested_jobs(
    service: web::Data<Arc<JobService>>,
    subscription: web::Data<Arc<SubscriptionService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["user", "admin"]) {
        return e;
    }
    let path_user_id = path.into_inner();
    if auth.user_id != path_user_id {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Forbidden",
            "message": "Cannot access another user's suggested jobs"
        }));
    }
    match service.get_suggested_jobs(path_user_id).await {
        Ok(mut jobs) => {
            let premium = subscription.is_premium(path_user_id).await.unwrap_or(false);
            if !premium {
                let cap = subscription.settings().free_ai_matches_limit as usize;
                jobs.truncate(cap);
            }
            HttpResponse::Ok().json(jobs)
        }
        Err(e) => {
            log::error!("Failed to get suggested jobs: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn post_refresh_suggested_jobs(
    config: web::Data<Settings>,
    pool: web::Data<DbPool>,
    search_index: web::Data<Arc<JobSearchIndex>>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["user", "admin"]) {
        return e;
    }
    let path_user_id = path.into_inner();
    if auth.user_id != path_user_id {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Forbidden",
            "message": "Cannot refresh another user's suggested jobs"
        }));
    }

    let mode = if matcher_client::matcher_is_configured(&config.matcher) {
        "hybrid_embeddings"
    } else {
        "keyword_postgres"
    };

    matcher_client::spawn_refresh_suggestions(
        &config.matcher,
        pool.get_ref().clone(),
        Arc::clone(search_index.get_ref()),
        path_user_id,
    );
    HttpResponse::Accepted().json(serde_json::json!({
        "status": "refresh_started",
        "user_id": path_user_id,
        "mode": mode
    }))
}

pub async fn get_job(service: web::Data<Arc<JobService>>, path: web::Path<Uuid>) -> impl Responder {
    let id = path.into_inner();
    match service.get_job_by_id(id).await {
        Ok(Some(job)) => HttpResponse::Ok().json(job),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to get job: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
