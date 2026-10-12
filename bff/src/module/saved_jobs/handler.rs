use crate::configuration::Settings;
use crate::middleware::auth;
use crate::module::saved_jobs::service::SavedJobsService;
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use std::sync::Arc;
use uuid::Uuid;

pub async fn list_saved_jobs(
    service: web::Data<Arc<SavedJobsService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    match service.list(auth.user_id).await {
        Ok(jobs) => HttpResponse::Ok().json(jobs),
        Err(e) => {
            log::error!("Failed to list saved jobs: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn save_job(
    service: web::Data<Arc<SavedJobsService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    match service.save(auth.user_id, path.into_inner()).await {
        Ok(()) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Failed to save job: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn unsave_job(
    service: web::Data<Arc<SavedJobsService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    match service.unsave(auth.user_id, path.into_inner()).await {
        Ok(()) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Failed to unsave job: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
