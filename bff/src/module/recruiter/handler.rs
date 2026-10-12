use crate::configuration::Settings;
use crate::middleware::auth;
use crate::module::recruiter::model::{
    CreateCompanyRequest, CreateJobRequest, RecruiterError, UpdateCompanyRequest, UpdateJobRequest,
};
use crate::module::recruiter::service::RecruiterService;
use actix_web::{HttpRequest, HttpResponse, Responder, web};
use std::sync::Arc;
use uuid::Uuid;

fn recruiter_error_response(err: RecruiterError) -> HttpResponse {
    match err {
        RecruiterError::JobLimitReached { active, limit } => HttpResponse::Conflict().json(
            serde_json::json!({
                "error": "JobLimitReached",
                "message": err.to_string(),
                "active_jobs": active,
                "limit": limit,
            }),
        ),
        RecruiterError::FeaturedRequiresPremium => HttpResponse::Forbidden().json(
            serde_json::json!({
                "error": "FeaturedRequiresPremium",
                "message": err.to_string(),
            }),
        ),
        RecruiterError::Unauthorized => HttpResponse::Forbidden().json(
            serde_json::json!({
                "error": "Unauthorized",
                "message": err.to_string(),
            }),
        ),
        RecruiterError::JobNotFound => HttpResponse::NotFound().json(serde_json::json!({
            "error": "JobNotFound",
            "message": err.to_string(),
        })),
        RecruiterError::Database(msg) => {
            log::error!("recruiter database error: {msg}");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "DatabaseError",
                "message": "Failed to process recruiter request",
            }))
        }
    }
}

pub async fn create_company(
    service: web::Data<Arc<RecruiterService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    data: web::Json<CreateCompanyRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    match service.create_company(auth.user_id, data.into_inner()).await {
        Ok(company) => HttpResponse::Ok().json(company),
        Err(e) => {
            log::error!("Failed to create company: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn update_company(
    service: web::Data<Arc<RecruiterService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Json<UpdateCompanyRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    let id = path.into_inner();
    match service.update_company(auth.user_id, id, data.into_inner()).await {
        Ok(Some(company)) => HttpResponse::Ok().json(company),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to update company: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn get_company(
    service: web::Data<Arc<RecruiterService>>,
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
    let id = path.into_inner();
    match service.get_company(auth.user_id, id).await {
        Ok(Some(company)) => HttpResponse::Ok().json(company),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => {
            log::error!("Failed to get company: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(serde::Deserialize)]
pub struct CompanyQuery {
    pub company_id: Uuid,
}

pub async fn get_recruiter_limits(
    service: web::Data<Arc<RecruiterService>>,
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
    match service.get_limits(auth.user_id, query.company_id).await {
        Ok(limits) => HttpResponse::Ok().json(limits),
        Err(e) => recruiter_error_response(e),
    }
}

pub async fn list_jobs(
    service: web::Data<Arc<RecruiterService>>,
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
    match service.list_jobs(auth.user_id, query.company_id).await {
        Ok(jobs) => HttpResponse::Ok().json(jobs),
        Err(e) => {
            log::error!("Failed to list recruiter jobs: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn list_my_companies(
    service: web::Data<Arc<RecruiterService>>,
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
    match service.list_my_companies(auth.user_id).await {
        Ok(companies) => HttpResponse::Ok().json(companies),
        Err(e) => {
            log::error!("Failed to list managed companies: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn create_job(
    service: web::Data<Arc<RecruiterService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    data: web::Json<CreateJobRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    match service.create_job(auth.user_id, data.into_inner()).await {
        Ok(job) => HttpResponse::Ok().json(job),
        Err(e) => recruiter_error_response(e),
    }
}

pub async fn update_job(
    service: web::Data<Arc<RecruiterService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    query: web::Query<CompanyQuery>,
    data: web::Json<UpdateJobRequest>,
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
        .update_job(auth.user_id, id, query.company_id, data.into_inner())
        .await
    {
        Ok(Some(job)) => HttpResponse::Ok().json(job),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => recruiter_error_response(e),
    }
}

pub async fn duplicate_job(
    service: web::Data<Arc<RecruiterService>>,
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
    let id = path.into_inner();
    match service
        .duplicate_job(auth.user_id, id, query.company_id)
        .await
    {
        Ok(Some(job)) => HttpResponse::Ok().json(job),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => recruiter_error_response(e),
    }
}

pub async fn suggested_candidates(
    service: web::Data<Arc<RecruiterService>>,
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
    let job_id = path.into_inner();
    match service
        .suggested_candidates_for_job(auth.user_id, job_id, query.company_id)
        .await
    {
        Ok(candidates) => HttpResponse::Ok().json(candidates),
        Err(e) => recruiter_error_response(e),
    }
}

#[derive(serde::Deserialize)]
pub struct RequestIntroBody {
    #[serde(default)]
    pub note: Option<String>,
}

pub async fn request_intro(
    service: web::Data<Arc<RecruiterService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    path: web::Path<(Uuid, Uuid)>,
    query: web::Query<CompanyQuery>,
    body: Option<web::Json<RequestIntroBody>>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    let (job_id, candidate_user_id) = path.into_inner();
    let note = body.and_then(|b| b.into_inner().note);
    match service
        .request_intro(auth.user_id, query.company_id, job_id, candidate_user_id, note)
        .await
    {
        Ok(()) => HttpResponse::NoContent().finish(),
        Err(e) => recruiter_error_response(e),
    }
}

use actix_multipart::form::{MultipartForm, tempfile::TempFile};
use crate::DbPool;
use crate::storage::RustFsStorage;
use crate::matcher_client;
use crate::search::JobSearchIndex;
use std::fs;

#[derive(MultipartForm)]
pub struct BulkResumeUploadForm {
    #[multipart(limit = "5 MiB")]
    pub file: TempFile,
    pub content: Option<actix_multipart::form::text::Text<String>>,
    pub candidate_name: Option<actix_multipart::form::text::Text<String>>,
}

pub async fn upload_bulk_resume(
    service: web::Data<Arc<RecruiterService>>,
    config: web::Data<Settings>,
    pool: web::Data<DbPool>,
    storage: web::Data<Arc<RustFsStorage>>,
    search_index: web::Data<Arc<JobSearchIndex>>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    query: web::Query<CompanyQuery>,
    form: MultipartForm<BulkResumeUploadForm>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    
    let job_id = path.into_inner();
    let company_id = query.company_id;

    if let Err(_) = service.ensure_company_access(auth.user_id, company_id).await {
        return HttpResponse::Forbidden().json(serde_json::json!({"error": "Unauthorized"}));
    }

    let file = &form.file;
    let file_name = file.file_name.clone().unwrap_or_else(|| "resume.pdf".to_string());
    let content_type = file.content_type.as_ref().map(|ct| ct.to_string()).unwrap_or_else(|| "application/pdf".to_string());
    
    if file.size > 5 * 1024 * 1024 {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "File too large"}));
    }

    let data = match fs::read(file.file.path()) {
        Ok(d) => d,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to read file", "detail": e.to_string()})),
    };

    let title = form.candidate_name.as_ref().map(|t| t.0.clone()).unwrap_or_else(|| "Candidate".to_string());
    let extracted_content = form.content.as_ref().map(|c| c.0.clone());
    let content_json: Option<serde_json::Value> = extracted_content.and_then(|c| serde_json::from_str(&c).ok());

    let shadow_user_id = Uuid::new_v4();
    let shadow_email = format!("shadow-{}@kraftisium.xyz", shadow_user_id);
    let shadow_name = title.clone();

    // 1. Create Shadow User
    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({"error": "DB error", "detail": e.to_string()})),
    };

    if let Err(e) = sqlx::query(
        "INSERT INTO users (id, email, password_hash, name, role, email_verified, is_premium_candidate)
         VALUES ($1, $2, NULL, $3, 'user', true, false)"
    )
    .bind(shadow_user_id)
    .bind(&shadow_email)
    .bind(&shadow_name)
    .execute(&mut *tx)
    .await {
        return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to create shadow user", "detail": e.to_string()}));
    }

    // 2. Store Resume File
    let resume_id = Uuid::new_v4();
    let storage_path = match storage.store(shadow_user_id, resume_id, &file_name, &data, &content_type).await {
        Ok(p) => Some(p),
        Err(e) => {
            log::warn!("Storage error: {}", e);
            None
        }
    };

    // 3. Insert Resume
    let query_str = if storage_path.is_some() {
        "INSERT INTO resumes (id, user_id, title, content, file_name, file_type, file_size, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    } else {
        "INSERT INTO resumes (id, user_id, title, content, file_name, file_type, file_size, file_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    };

    let mut q = sqlx::query(query_str)
        .bind(resume_id)
        .bind(shadow_user_id)
        .bind(&title)
        .bind(content_json)
        .bind(&file_name)
        .bind(&content_type)
        .bind(data.len() as i32);

    if let Some(path) = storage_path {
        q = q.bind(path);
    } else {
        q = q.bind(data);
    }

    if let Err(e) = q.execute(&mut *tx).await {
        return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to create resume", "detail": e.to_string()}));
    }

    // 4. Create Application Link
    let application_id = Uuid::new_v4();
    if let Err(e) = sqlx::query(
        "INSERT INTO applications (id, user_id, job_id, resume_id, status)
         VALUES ($1, $2, $3, $4, 'recruiter_uploaded')"
    )
    .bind(application_id)
    .bind(shadow_user_id)
    .bind(job_id)
    .bind(resume_id)
    .execute(&mut *tx)
    .await {
        return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to link application", "detail": e.to_string()}));
    }

    if let Err(e) = tx.commit().await {
        return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to commit tx", "detail": e.to_string()}));
    }

    // Trigger AI Matcher
    matcher_client::spawn_refresh_suggestions(
        &config.matcher,
        pool.get_ref().clone(),
        Arc::clone(search_index.get_ref()),
        shadow_user_id,
    );

    HttpResponse::Created().json(serde_json::json!({
        "message": "Resume uploaded and processing started",
        "shadow_user_id": shadow_user_id,
        "resume_id": resume_id
    }))
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct QuickMatchRequest {
    pub job_text: String,
    pub resume_texts: Vec<String>,
}

pub async fn quick_match_resumes(
    config: web::Data<Settings>,
    req: HttpRequest,
    data: web::Json<QuickMatchRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }

    let matcher = &config.matcher;
    let base_raw = matcher.base_url.as_deref().unwrap_or("");
    let base = base_raw.trim().trim_end_matches('/');
    if base.is_empty() {
        return HttpResponse::ServiceUnavailable().json(serde_json::json!({"error": "Matcher offline"}));
    }

    let url = format!("{}/v1/quick-match", base);
    let client = reqwest::Client::new();
    let mut request = client.post(&url).json(&data.into_inner());
    
    if let Some(ref s) = matcher.internal_secret {
        if !s.is_empty() {
            request = request.header("X-Matcher-Secret", s);
        }
    }

    match request.send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(json) => HttpResponse::Ok().json(json),
                    Err(_) => HttpResponse::InternalServerError().finish()
                }
            } else {
                HttpResponse::InternalServerError().finish()
            }
        }
        Err(_) => HttpResponse::InternalServerError().finish()
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct ScorePoolCustomRequest {
    pub job_text: String,
    pub user_ids: Vec<Uuid>,
}

pub async fn score_pool_candidates_custom(
    config: web::Data<Settings>,
    req: HttpRequest,
    data: web::Json<ScorePoolCustomRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }

    let matcher = &config.matcher;
    let base_raw = matcher.base_url.as_deref().unwrap_or("");
    let base = base_raw.trim().trim_end_matches('/');
    if base.is_empty() {
        return HttpResponse::ServiceUnavailable().json(serde_json::json!({"error": "Matcher offline"}));
    }

    let url = format!("{}/v1/score-pool-candidates-custom", base);
    let client = reqwest::Client::new();
    let mut request = client.post(&url).json(&data.into_inner());
    
    if let Some(ref s) = matcher.internal_secret {
        if !s.is_empty() {
            request = request.header("X-Matcher-Secret", s);
        }
    }

    match request.send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(json) => HttpResponse::Ok().json(json),
                    Err(_) => HttpResponse::InternalServerError().finish()
                }
            } else {
                HttpResponse::InternalServerError().finish()
            }
        }
        Err(_) => HttpResponse::InternalServerError().finish()
    }
}

use crate::module::recruiter::model::CreateTalentPoolRequest;

pub async fn create_talent_pool(
    service: web::Data<Arc<RecruiterService>>,
    config: web::Data<Settings>,
    req: HttpRequest,
    query: web::Query<CompanyQuery>,
    data: web::Json<CreateTalentPoolRequest>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    match service.create_talent_pool(auth.user_id, query.company_id, &data.name).await {
        Ok(pool) => HttpResponse::Created().json(pool),
        Err(e) => recruiter_error_response(e),
    }
}

pub async fn list_talent_pools(
    service: web::Data<Arc<RecruiterService>>,
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
    match service.list_talent_pools(auth.user_id, query.company_id).await {
        Ok(pools) => HttpResponse::Ok().json(pools),
        Err(e) => recruiter_error_response(e),
    }
}

pub async fn get_talent_pool(
    service: web::Data<Arc<RecruiterService>>,
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
    match service.get_talent_pool(auth.user_id, query.company_id, path.into_inner()).await {
        Ok(Some(pool)) => HttpResponse::Ok().json(pool),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => recruiter_error_response(e),
    }
}

pub async fn upload_talent_pool_resume(
    service: web::Data<Arc<RecruiterService>>,
    config: web::Data<Settings>,
    pool: web::Data<DbPool>,
    storage: web::Data<Arc<RustFsStorage>>,
    search_index: web::Data<Arc<JobSearchIndex>>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    query: web::Query<CompanyQuery>,
    form: MultipartForm<BulkResumeUploadForm>,
) -> impl Responder {
    let auth = match auth::extract_auth_user(&req, &config.jwt.secret) {
        Ok(a) => a,
        Err(e) => return e,
    };
    if let Err(e) = auth::require_role(&auth, &["recruiter", "admin"]) {
        return e;
    }
    
    let pool_id = path.into_inner();
    let company_id = query.company_id;

    if let Err(_) = service.ensure_company_access(auth.user_id, company_id).await {
        return HttpResponse::Forbidden().json(serde_json::json!({"error": "Unauthorized"}));
    }

    let file = &form.file;
    let file_name = file.file_name.clone().unwrap_or_else(|| "resume.pdf".to_string());
    let content_type = file.content_type.as_ref().map(|ct| ct.to_string()).unwrap_or_else(|| "application/pdf".to_string());
    
    if file.size > 5 * 1024 * 1024 {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "File too large"}));
    }

    let data = match fs::read(file.file.path()) {
        Ok(d) => d,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to read file", "detail": e.to_string()})),
    };

    let title = form.candidate_name.as_ref().map(|t| t.0.clone()).unwrap_or_else(|| "Candidate".to_string());
    let extracted_content = form.content.as_ref().map(|c| c.0.clone());
    let content_json: Option<serde_json::Value> = extracted_content.and_then(|c| serde_json::from_str(&c).ok());

    let shadow_user_id = Uuid::new_v4();
    let shadow_email = format!("shadow-pool-{}@kraftisium.xyz", shadow_user_id);
    let shadow_name = title.clone();

    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({"error": "DB error", "detail": e.to_string()})),
    };

    if let Err(e) = sqlx::query(
        "INSERT INTO users (id, email, password_hash, name, role, email_verified, is_premium_candidate)
         VALUES ($1, $2, NULL, $3, 'user', true, false)"
    )
    .bind(shadow_user_id)
    .bind(&shadow_email)
    .bind(&shadow_name)
    .execute(&mut *tx)
    .await {
        return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to create shadow user", "detail": e.to_string()}));
    }

    let resume_id = Uuid::new_v4();
    let storage_path = match storage.store(shadow_user_id, resume_id, &file_name, &data, &content_type).await {
        Ok(p) => Some(p),
        Err(e) => {
            log::warn!("Storage error: {}", e);
            None
        }
    };

    let query_str = if storage_path.is_some() {
        "INSERT INTO resumes (id, user_id, title, content, file_name, file_type, file_size, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    } else {
        "INSERT INTO resumes (id, user_id, title, content, file_name, file_type, file_size, file_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    };

    let mut q = sqlx::query(query_str)
        .bind(resume_id)
        .bind(shadow_user_id)
        .bind(&title)
        .bind(content_json)
        .bind(&file_name)
        .bind(&content_type)
        .bind(data.len() as i32);

    if let Some(path) = storage_path {
        q = q.bind(path);
    } else {
        q = q.bind(data);
    }

    if let Err(e) = q.execute(&mut *tx).await {
        return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to create resume", "detail": e.to_string()}));
    }

    if let Err(e) = sqlx::query(
        "INSERT INTO talent_pool_resumes (pool_id, user_id, resume_id)
         VALUES ($1, $2, $3)"
    )
    .bind(pool_id)
    .bind(shadow_user_id)
    .bind(resume_id)
    .execute(&mut *tx)
    .await {
        return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to link resume to pool", "detail": e.to_string()}));
    }

    if let Err(e) = tx.commit().await {
        return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to commit tx", "detail": e.to_string()}));
    }

    matcher_client::spawn_refresh_suggestions(
        &config.matcher,
        pool.get_ref().clone(),
        Arc::clone(search_index.get_ref()),
        shadow_user_id,
    );

    HttpResponse::Created().json(serde_json::json!({
        "message": "Resume uploaded to pool and processing started",
        "shadow_user_id": shadow_user_id,
        "resume_id": resume_id
    }))
}

pub async fn list_pool_candidates(
    service: web::Data<Arc<RecruiterService>>,
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
    match service.list_pool_candidates(auth.user_id, query.company_id, path.into_inner()).await {
        Ok(candidates) => HttpResponse::Ok().json(candidates),
        Err(e) => recruiter_error_response(e),
    }
}

pub async fn delete_talent_pool(
    service: web::Data<Arc<RecruiterService>>,
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
    match service.delete_talent_pool(auth.user_id, query.company_id, path.into_inner()).await {
        Ok(deleted) => {
            if deleted {
                HttpResponse::NoContent().finish()
            } else {
                HttpResponse::NotFound().finish()
            }
        },
        Err(e) => recruiter_error_response(e),
    }
}
