use crate::configuration::Settings;
use crate::matcher_client;
use crate::middleware::auth;
use crate::module::resumes::model::{CreateResumeRequest, UpdateResumeRequest};
use crate::module::resumes::service::ResumeService;
use crate::search::JobSearchIndex;
use crate::DbPool;
use actix_multipart::form::{MultipartForm, tempfile::TempFile};
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use std::fs;
use std::sync::Arc;
use uuid::Uuid;

fn spawn_suggestions_refresh(
    config: &Settings,
    pool: &DbPool,
    search_index: &Arc<JobSearchIndex>,
    user_id: Uuid,
) {
    matcher_client::spawn_refresh_suggestions(
        &config.matcher,
        pool.clone(),
        Arc::clone(search_index),
        user_id,
    );
}

const MAX_FILE_SIZE: usize = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: [&str; 2] = ["application/pdf", "text/plain"];

pub async fn list_resumes(
    service: web::Data<Arc<ResumeService>>,
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
    match service.get_resumes(user_id).await {
        Ok(resumes) => HttpResponse::Ok().json(resumes),
        Err(e) => {
            log::error!("Failed to list resumes: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn get_resume(
    service: web::Data<Arc<ResumeService>>,
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
    let user_id = auth.user_id;
    let id = path.into_inner();
    match service.get_resume(id, user_id).await {
        Ok(Some(resume)) => HttpResponse::Ok().json(resume),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to get resume: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn create_resume(
    service: web::Data<Arc<ResumeService>>,
    config: web::Data<Settings>,
    pool: web::Data<DbPool>,
    search_index: web::Data<Arc<JobSearchIndex>>,
    req: HttpRequest,
    data: web::Json<CreateResumeRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["user", "admin"]) {
        return e;
    }
    let user_id = auth.user_id;
    match service.create_resume(user_id, data.into_inner()).await {
        Ok(resume) => {
            spawn_suggestions_refresh(&config, pool.get_ref(), search_index.get_ref(), resume.user_id);
            HttpResponse::Created().json(resume)
        }
        Err(e) => {
            log::error!("Failed to create resume: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn update_resume(
    service: web::Data<Arc<ResumeService>>,
    config: web::Data<Settings>,
    pool: web::Data<DbPool>,
    search_index: web::Data<Arc<JobSearchIndex>>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Json<UpdateResumeRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["user", "admin"]) {
        return e;
    }
    let user_id = auth.user_id;
    let id = path.into_inner();
    match service.update_resume(id, user_id, data.into_inner()).await {
        Ok(Some(resume)) => {
            spawn_suggestions_refresh(&config, pool.get_ref(), search_index.get_ref(), resume.user_id);
            HttpResponse::Ok().json(resume)
        }
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to update resume: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(MultipartForm)]
pub struct ResumeUploadForm {
    #[multipart(limit = "5 MiB")]
    file: TempFile,
}

pub async fn create_resume_upload(
    service: web::Data<Arc<ResumeService>>,
    config: web::Data<Settings>,
    pool: web::Data<DbPool>,
    search_index: web::Data<Arc<JobSearchIndex>>,
    req: HttpRequest,
    form: MultipartForm<ResumeUploadForm>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["user", "admin"]) {
        return e;
    }
    let user_id = auth.user_id;

    let file = &form.file;
    let file_name = file
        .file_name
        .as_ref()
        .map(|s| s.clone())
        .unwrap_or_else(|| "resume.pdf".to_string());

    let content_type = file
        .content_type
        .as_ref()
        .map(|ct| ct.to_string())
        .unwrap_or_default();

    let ct_lower = content_type.to_lowercase();
    let allowed = ALLOWED_TYPES
        .iter()
        .any(|t| ct_lower.contains(t) || ct_lower == *t);
    if !allowed {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid file type",
            "message": "Only PDF and text files are allowed"
        }));
    }

    if file.size > MAX_FILE_SIZE {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "File too large",
            "message": "Maximum file size is 5MB"
        }));
    }

    let data = match fs::read(file.file.path()) {
        Ok(d) => d,
        Err(e) => {
            log::error!("Failed to read upload file: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Failed to read file"}));
        }
    };

    let title = file_name
        .rsplit_once('.')
        .map(|(name, _)| name.to_string())
        .unwrap_or_else(|| file_name.clone());
    let title = if title.is_empty() {
        file_name.clone()
    } else {
        title
    };

    match service
        .create_resume_with_file(
            user_id,
            title,
            file_name,
            content_type,
            data.len() as i32,
            data,
        )
        .await
    {
        Ok(resume) => {
            spawn_suggestions_refresh(&config, pool.get_ref(), search_index.get_ref(), resume.user_id);
            HttpResponse::Created().json(resume)
        }
        Err(e) => {
            log::error!("Failed to create resume: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to save resume",
                "message": e.to_string()
            }))
        }
    }
}

pub async fn delete_resume(
    service: web::Data<Arc<ResumeService>>,
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
    let user_id = auth.user_id;
    let id = path.into_inner();
    match service.delete_resume(id, user_id).await {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({"message": "Resume deleted"})),
        Ok(false) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to delete resume: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
