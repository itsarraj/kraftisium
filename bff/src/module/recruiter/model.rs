use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Company {
    pub id: Uuid,
    pub name: String,
    pub logo_url: Option<String>,
    pub website: Option<String>,
    pub about: Option<String>,
    pub industry: Option<String>,
    pub employee_size: Option<String>,
    pub head_office: Option<String>,
    pub company_type: Option<String>,
    pub since: Option<i32>,
    pub specialization: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCompanyRequest {
    pub name: String,
    pub logo_url: Option<String>,
    pub website: Option<String>,
    pub about: Option<String>,
    pub industry: Option<String>,
    pub employee_size: Option<String>,
    pub head_office: Option<String>,
    pub company_type: Option<String>,
    pub since: Option<i32>,
    pub specialization: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateJobRequest {
    pub company_id: Uuid,
    pub position_title: String,
    pub location: String,
    pub employment_type: String,
    pub salary_min: Option<i32>,
    pub salary_max: Option<i32>,
    pub salary_currency: Option<String>,
    pub salary_period: Option<String>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub facilities: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompanyRequest {
    pub name: Option<String>,
    pub logo_url: Option<String>,
    pub website: Option<String>,
    pub about: Option<String>,
    pub industry: Option<String>,
    pub employee_size: Option<String>,
    pub head_office: Option<String>,
    pub company_type: Option<String>,
    pub since: Option<i32>,
    pub specialization: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateJobRequest {
    pub position_title: Option<String>,
    pub location: Option<String>,
    pub employment_type: Option<String>,
    pub salary_min: Option<i32>,
    pub salary_max: Option<i32>,
    pub salary_currency: Option<String>,
    pub salary_period: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub featured: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedCandidate {
    pub user_id: Uuid,
    pub candidate_name: String,
    pub candidate_email: String,
    pub resume_title: Option<String>,
    pub resume_file_name: Option<String>,
    pub match_score: f64,
    pub already_applied: bool,
    pub is_premium_candidate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecruiterLimitsInfo {
    pub is_premium: bool,
    pub active_jobs: i64,
    pub free_active_jobs_limit: u32,
    pub can_create_job: bool,
    pub can_feature_jobs: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum RecruiterError {
    #[error("Active job limit reached ({active}/{limit}). Upgrade to Premium for unlimited posts.")]
    JobLimitReached { active: i64, limit: u32 },
    #[error("Featured listings require Premium.")]
    FeaturedRequiresPremium,
    #[error("Job not found")]
    JobNotFound,
    #[error("Unauthorized access to company")]
    Unauthorized,
    #[error("Database error: {0}")]
    Database(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TalentPool {
    pub id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTalentPoolRequest {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TalentPoolCandidate {
    pub pool_id: Uuid,
    pub user_id: Uuid,
    pub resume_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PoolCandidateDetail {
    pub user_id: Uuid,
    pub resume_id: Uuid,
    pub candidate_name: String,
    pub candidate_email: String,
    pub resume_title: Option<String>,
    pub resume_file_name: Option<String>,
}
