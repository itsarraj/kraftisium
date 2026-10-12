use crate::configuration::Settings;
use crate::matcher_client;
use crate::middleware::auth;
use crate::module::profiles::model::{CreateCandidateProfileRequest, CreateEmployerProfileRequest};
use crate::module::profiles::service::ProfilesService;

use crate::search::JobSearchIndex;
use crate::DbPool;
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use std::sync::Arc;

pub async fn create_or_update_employer_profile(
    service: web::Data<Arc<ProfilesService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    data: web::Json<CreateEmployerProfileRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    match service
        .upsert_employer_profile(auth.user_id, data.into_inner())
        .await
    {
        Ok(profile) => HttpResponse::Ok().json(profile),
        Err(e) => {
            log::error!("Failed to upsert employer profile: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn get_employer_profile(
    service: web::Data<Arc<ProfilesService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    match service.get_employer_profile(auth.user_id).await {
        Ok(Some(profile)) => HttpResponse::Ok().json(profile),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to get employer profile: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}


pub async fn create_or_update_candidate_profile(
    service: web::Data<Arc<ProfilesService>>,
    config: web::Data<Settings>,
    pool: web::Data<DbPool>,
    search_index: web::Data<Arc<JobSearchIndex>>,
    req: HttpRequest,
    data: Option<web::Json<CreateCandidateProfileRequest>>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["user", "admin"]) {
        return e;
    }
    let body = data.map(|d| d.into_inner()).unwrap_or_default();
    match service.upsert_candidate_profile(auth.user_id, body).await {
        Ok(profile) => {
            matcher_client::spawn_refresh_suggestions(
                &config.matcher,
                pool.get_ref().clone(),
                Arc::clone(search_index.get_ref()),
                auth.user_id,
            );
            HttpResponse::Ok().json(profile)
        }
        Err(e) => {
            log::error!("Failed to upsert candidate profile: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn get_candidate_profile(
    service: web::Data<Arc<ProfilesService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["user", "admin"]) {
        return e;
    }
    match service.get_candidate_profile(auth.user_id).await {
        Ok(Some(profile)) => HttpResponse::Ok().json(profile),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to get candidate profile: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

/// `GET /employer-profiles/me/company`
///
/// Returns the first company linked to the authenticated recruiter via
/// `recruiter_companies`.  Returns 404 when the recruiter hasn't created a
/// company yet — the app uses this to determine whether to show the company
/// setup screen.
pub async fn get_employer_company(
    service: web::Data<Arc<ProfilesService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    match service.get_employer_company(auth.user_id).await {
        Ok(Some(company)) => HttpResponse::Ok().json(company),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to get employer company: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
