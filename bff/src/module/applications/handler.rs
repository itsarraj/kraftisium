use crate::configuration::Settings;
use crate::middleware::auth;
use crate::module::applications::model::{CreateApplicationRequest, UpdateApplicationRequest};
use crate::module::applications::service::{ApplicationError, ApplicationService};
use crate::module::recruiter::handler::CompanyQuery;
use crate::module::resumes::service::ResumeService;
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use std::sync::Arc;
use uuid::Uuid;

pub async fn list_my_applications(
    service: web::Data<Arc<ApplicationService>>,
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
    let user_id = auth.user_id;
    match service.get_applications_by_user(user_id).await {
        Ok(apps) => HttpResponse::Ok().json(apps),
        Err(e) => {
            log::error!("Failed to list applications: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn list_job_applications(
    service: web::Data<Arc<ApplicationService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    let job_id = path.into_inner();
    match service
        .get_applications_by_job(auth.user_id, &auth.role, job_id)
        .await
    {
        Ok(apps) => HttpResponse::Ok().json(apps),
        Err(e) => application_error_response(e, "Failed to list job applications"),
    }
}

pub async fn list_job_applications_detailed(
    service: web::Data<Arc<ApplicationService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    let job_id = path.into_inner();
    match service
        .get_applications_by_job_detailed(auth.user_id, &auth.role, job_id)
        .await
    {
        Ok(apps) => HttpResponse::Ok().json(apps),
        Err(e) => application_error_response(e, "Failed to list job applications"),
    }
}

pub async fn get_recruiter_overview(
    service: web::Data<Arc<ApplicationService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    query: web::Query<CompanyQuery>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    match service
        .get_recruiter_overview(auth.user_id, &auth.role, query.company_id)
        .await
    {
        Ok(overview) => HttpResponse::Ok().json(overview),
        Err(e) => application_error_response(e, "Failed to load recruiter overview"),
    }
}

#[derive(serde::Deserialize)]
pub struct InboxQuery {
    pub company_id: Option<Uuid>,
    pub limit: Option<i64>,
}

pub async fn get_recruiter_inbox(
    service: web::Data<Arc<ApplicationService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    query: web::Query<InboxQuery>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    let limit = query.limit.unwrap_or(50).min(200);
    match service
        .get_recruiter_inbox(auth.user_id, query.company_id, limit)
        .await
    {
        Ok(items) => HttpResponse::Ok().json(items),
        Err(e) => {
            log::error!("Failed to load recruiter inbox: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn get_job_application_counts(
    service: web::Data<Arc<ApplicationService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    query: web::Query<CompanyQuery>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    match service
        .get_job_application_counts(auth.user_id, &auth.role, query.company_id)
        .await
    {
        Ok(counts) => HttpResponse::Ok().json(counts),
        Err(e) => application_error_response(e, "Failed to load job application counts"),
    }
}

pub async fn download_application_resume(
    app_service: web::Data<Arc<ApplicationService>>,
    resume_service: web::Data<Arc<ResumeService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    query: web::Query<CompanyQuery>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }

    let application_id = path.into_inner();
    let resume_id = match app_service
        .application_belongs_to_company(auth.user_id, &auth.role, application_id, query.company_id)
        .await
    {
        Ok(Some(resume_id)) => resume_id,
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to verify application access: {}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };

    let Some(resume_id) = resume_id else {
        return HttpResponse::NotFound().json(serde_json::json!({
            "error": "NotFound",
            "message": "No resume attached to this application"
        }));
    };

    match resume_service.get_resume_file_bytes(resume_id).await {
        Ok(Some((name, content_type, data))) => HttpResponse::Ok()
            .content_type(content_type)
            .insert_header(("Content-Disposition", format!("attachment; filename=\"{}\"", name)))
            .body(data),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to download resume: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn create_application(
    service: web::Data<Arc<ApplicationService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    data: web::Json<CreateApplicationRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["user", "admin"]) {
        return e;
    }
    let user_id = auth.user_id;
    match service
        .create_application(user_id, data.into_inner())
        .await
    {
        Ok(app) => HttpResponse::Created().json(app),
        Err(ApplicationError::ResumeRequired) => HttpResponse::BadRequest().json(serde_json::json!({
            "error": "ResumeRequired",
            "message": "Upload a resume before applying to jobs."
        })),
        Err(ApplicationError::AlreadyApplied) => HttpResponse::Conflict().json(serde_json::json!({
            "error": "AlreadyApplied",
            "message": "You have already applied to this job."
        })),
        Err(ApplicationError::JobNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "JobNotFound",
            "message": "Job not found."
        })),
        Err(e) => {
            log::error!("Failed to create application: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn update_application(
    service: web::Data<Arc<ApplicationService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Json<UpdateApplicationRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    let id = path.into_inner();
    match service
        .update_application(auth.user_id, &auth.role, id, data.into_inner())
        .await
    {
        Ok(Some(app)) => HttpResponse::Ok().json(app),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => application_error_response(e, "Failed to update application"),
    }
}

fn application_error_response(e: ApplicationError, log_context: &str) -> HttpResponse {
    match e {
        ApplicationError::Forbidden => HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Forbidden",
            "message": "You do not have access to this company's data"
        })),
        ApplicationError::JobNotFound => HttpResponse::NotFound().json(serde_json::json!({
            "error": "NotFound",
            "message": "Job not found"
        })),
        other => {
            log::error!("{}: {}", log_context, other);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "InternalServerError",
                "message": log_context
            }))
        }
    }
}
